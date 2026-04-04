"""
document_parser/parse_answer_sheet.py
--------------------------------------
Parses raw OCR text from a student's handwritten answer sheet into
a structured per-question answer dict.

Design principles:
- Preserves formulas, equations, and multilingual text
- NEVER lowercases or strips math operators
- Handles multiple common answer-boundary formats
- Falls back gracefully when no structure is found
"""

import re
import unicodedata
from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────────────────────────
# BOUNDARY PATTERNS
# Matches the most common handwritten/typed answer header formats:
#   Q1.   Q1:   Q1)
#   1.    1)    1:
#   Ans 1   Answer 1   Ans. 1   A1
#   Question 1
# Must be anchored to the start of a line.
# ──────────────────────────────────────────────────────────────
_BOUNDARY_PATTERN = re.compile(
    r'(?im)'
    r'^[ \t]*'
    r'(?:'
    r'(?:Q(?:uestion)?|Ans(?:wer)?(?:\s*to(?:\s*Q(?:uestion)?)?)?|A)\.?\s*(\d+)'   # Q1, Ans 1, Answer to Q3, A1
    r'|(\d{1,2})[\.\)\:][ \t]'                                   # 1. / 1) / 1: + space
    r')'
    r'[\.\)\:\-]*[ \t]*\n?' # Consume trailing punctuation and newline
)


def _clean_student_answer(text: str) -> str:
    """
    Lightweight, formula-safe cleanup for student answer text.

    Student answers are messier than faculty PDFs — but we still can't
    lowercase or strip math operators.

    Applies:
    - Unicode NFC normalization (fixes broken Hindi, subscripts)
    - Zero-width character removal
    - Collapse excessive blank lines (max 1)
    - Strip trailing whitespace per line
    - Normalize horizontal whitespace runs (preserve single spaces)
    - Do NOT: lowercase, strip '=', '/', '×', subscripts, Devanagari
    """
    if not text:
        return ""

    # Remove zero-width chars
    text = re.sub(r'[\u200b\u200c\u200d\ufeff\u00ad]', '', text)
    # NFC normalize
    text = unicodedata.normalize('NFC', text)
    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Strip trailing whitespace per line
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
    # Collapse 2+ consecutive blank lines into 1 (students write spaced answers)
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Collapse multiple horizontal spaces into one
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()


def _normalize_q_key(raw_num: str) -> str:
    """Converts a raw question number string to canonical format: '1' → 'Q1'."""
    return f"Q{raw_num.strip()}"


def parse_answer_sheet(student_id: str, raw_text: str) -> dict:
    """
    Parses raw OCR text of a student answer sheet into structured answers.

    Strategy:
    1. Apply student-safe text cleanup
    2. Find answer boundaries using multi-format regex
    3. Split text at boundaries → map to Q1, Q2, Q3...
    4. Fallback: treat entire text as Q1 if no boundaries found
    5. Tag blank answers as NO_ANSWER_PROVIDED

    Returns:
    {
      "student_id": "S001",
      "answers": {
        "Q1": "Photosynthesis is the process by which plants make food...",
        "Q2": "F = ma, where F is force, m is mass, a is acceleration.",
        "Q3": "NO_ANSWER_PROVIDED"
      },
      "meta": {
        "total_questions": 3,
        "answered": 2,
        "blank": 1,
        "char_count": 312,
        "boundaries_found": true
      }
    }
    """
    cleaned = _clean_student_answer(raw_text)

    if not cleaned:
        logger.warning(f"[{student_id}] Empty answer sheet — nothing to parse.")
        return {
            "student_id": student_id,
            "answers": {},
            "meta": {
                "total_questions": 0, "answered": 0, "blank": 0,
                "char_count": 0, "boundaries_found": False
            }
        }

    # ── Find all boundary positions ────────────────────────────
    matches = list(_BOUNDARY_PATTERN.finditer(cleaned))

    answers = {}
    if not matches:
        # No structure detected — treat entire text as Q1
        logger.warning(
            f"[{student_id}] No answer boundaries detected. "
            f"Treating full text ({len(cleaned)} chars) as Q1."
        )
        answers["Q1"] = cleaned
        boundaries_found = False
    else:
        boundaries_found = True
        for i, match in enumerate(matches):
            # One of the two capture groups will have the number
            raw_num = match.group(1) or match.group(2)
            q_key = _normalize_q_key(raw_num)

            # Content: from end of this match to start of next (or end of text)
            content_start = match.end()
            content_end = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned)
            answer_text = cleaned[content_start:content_end].strip()

            if not answer_text:
                logger.warning(f"[{student_id}] {q_key}: blank answer.")
                answers[q_key] = "NO_ANSWER_PROVIDED"
            else:
                answers[q_key] = answer_text
                logger.info(
                    f"[{student_id}] {q_key}: {len(answer_text)} chars | "
                    f"'{answer_text[:60].replace(chr(10), ' ')}...'"
                )

    # ── Compute metadata ───────────────────────────────────────
    answered = sum(1 for v in answers.values() if v != "NO_ANSWER_PROVIDED")
    blank = len(answers) - answered

    return {
        "student_id": student_id,
        "answers": answers,
        "meta": {
            "total_questions": len(answers),
            "answered": answered,
            "blank": blank,
            "char_count": len(cleaned),
            "boundaries_found": boundaries_found
        }
    }
