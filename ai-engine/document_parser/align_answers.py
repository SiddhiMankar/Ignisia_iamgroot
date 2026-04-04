"""
document_parser/align_answers.py
----------------------------------
Alignment Layer — joins student answers to faculty rubric rules.

This is the module that connects:
  ① Faculty rubric (from parse_rubric.py → rule_utils.rubric_to_rules())
  ② Student answers (from parse_answer_sheet.py)

Output: a list of per-question evaluation payloads ready for LLM scoring.

Design:
- Handles mismatched question numbering (Q1 vs 1 vs Ans 1)
- Preserves answer text exactly (no modification to student content)
- Includes rubric rules + marks for LLM context
- Gracefully handles missing answers and missing rubric entries
"""

import re
from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────────────────────────
# KEY NORMALIZER
# ──────────────────────────────────────────────────────────────

def _normalize_key(key: str) -> str:
    """
    Converts any question key variant to canonical 'Q{N}' form.

    Examples:
        'Q1'  → 'Q1'
        'q2'  → 'Q2'
        '3'   → 'Q3'
        'Ans 4' → 'Q4'
        'Question 5' → 'Q5'
        'A2'  → 'Q2'
    """
    key = key.strip()
    # Already canonical
    if re.match(r'^Q\d+$', key):
        return key
    # Extract leading digit(s) from any format
    m = re.search(r'\d+', key)
    if m:
        return f"Q{m.group(0)}"
    return key  # can't normalize — return as-is


# ──────────────────────────────────────────────────────────────
# MAIN ALIGNMENT FUNCTION
# ──────────────────────────────────────────────────────────────

def align_answers(
    student_parsed: dict,
    rubric_parsed: dict,
    frontend_questions: list
) -> list:
    """
    Aligns a student's parsed answers to the faculty rubric.

    Args:
        student_parsed:     Output of parse_answer_sheet()
                            {"student_id": ..., "answers": {"Q1": "...", ...}}

        rubric_parsed:      Output of parse_rubric()
                            {"Q1": {"max_marks": 5, "expected_concepts": [...], ...}, ...}

        frontend_questions: Output of build_rule_builder_json()['questions']
                            [{"questionId": "Q1", "questionPrompt": "...", "marks": 5,
                              "rules": [{"type": ..., "description": ..., "weight": ...}]}, ...]

    Returns:
        List of aligned evaluation payloads:
        [
          {
            "questionId": "Q1",
            "questionPrompt": "What is photosynthesis?",
            "marks": 5,
            "studentAnswer": "Photosynthesis is the process...",
            "answerStatus": "answered",   # "answered" | "blank" | "missing"
            "rubric": {
              "max_marks": 5,
              "rules": [
                {"type": "Concept Match", "description": "...", "weight": 2},
                ...
              ]
            }
          },
          ...
        ]
    """
    student_id = student_parsed.get("student_id", "unknown")
    raw_answers = student_parsed.get("answers", {})

    # Normalize all student answer keys to Q{N}
    normalized_answers = {
        _normalize_key(k): v for k, v in raw_answers.items()
    }

    # Build a lookup from the frontend questions list (already canonical Q{N})
    question_lookup = {q["questionId"]: q for q in frontend_questions}

    # Build rubric lookup (normalize keys)
    rubric_lookup = {
        _normalize_key(k): v for k, v in rubric_parsed.items()
    }

    # Union of all question IDs across rubric + student answers
    all_q_ids = sorted(
        set(question_lookup.keys()) | set(rubric_lookup.keys()),
        key=lambda x: int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 999
    )

    aligned = []

    for qid in all_q_ids:
        q_info = question_lookup.get(qid, {})
        rubric_block = rubric_lookup.get(qid, {})

        # Student answer
        student_answer = normalized_answers.get(qid, None)
        if student_answer is None:
            status = "missing"
            student_answer = ""
            logger.warning(f"[{student_id}] {qid}: No student answer found (missing).")
        elif student_answer == "NO_ANSWER_PROVIDED":
            status = "blank"
            student_answer = ""
            logger.warning(f"[{student_id}] {qid}: Student left answer blank.")
        else:
            status = "answered"

        # Rubric rules (already built by rubric_to_rules in the frontend questions)
        rules = q_info.get("rules", [])

        # If no frontend rules (rubric only), fall back to raw rubric concepts
        if not rules and rubric_block:
            concepts = rubric_block.get("expected_concepts", [])
            formulas = rubric_block.get("formula_rules", [])
            rules = (
                [{"type": "Concept Match", "description": c, "weight": 1} for c in concepts] +
                [{"type": "Formula Match", "description": f, "weight": 2} for f in formulas]
            )

        marks = q_info.get("marks") or rubric_block.get("max_marks") or 0
        prompt = q_info.get("questionPrompt", "")

        payload = {
            "questionId": qid,
            "questionPrompt": prompt,
            "marks": marks,
            "studentAnswer": student_answer,
            "answerStatus": status,
            "rubric": {
                "max_marks": marks,
                "rules": rules
            }
        }

        aligned.append(payload)
        logger.info(
            f"[{student_id}] Aligned {qid}: status={status} | "
            f"marks={marks} | rules={len(rules)} | "
            f"answer_chars={len(student_answer)}"
        )

    return aligned


# ──────────────────────────────────────────────────────────────
# ALIGNMENT SUMMARY (for debug/logging)
# ──────────────────────────────────────────────────────────────

def summarize_alignment(aligned: list, student_id: str = "") -> dict:
    """Returns a compact summary of an aligned answer set."""
    total = len(aligned)
    answered = sum(1 for a in aligned if a["answerStatus"] == "answered")
    blank = sum(1 for a in aligned if a["answerStatus"] == "blank")
    missing = sum(1 for a in aligned if a["answerStatus"] == "missing")
    total_marks = sum(a["marks"] for a in aligned)

    return {
        "student_id": student_id,
        "total_questions": total,
        "answered": answered,
        "blank": blank,
        "missing": missing,
        "total_possible_marks": total_marks
    }
