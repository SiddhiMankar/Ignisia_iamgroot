"""
evaluation_engine/scoring/llm_evaluator.py
--------------------------------------------
LLM-as-a-Judge evaluator using Gemini 1.5 Flash.

This module is called ONCE per cluster (not per student) to reduce cost.
The structured rubric rules (from rule_utils.rubric_to_rules()) are passed
directly into the prompt for more precise, rubric-driven grading.
"""

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from utils.logger import get_logger

logger = get_logger(__name__)
load_dotenv()

_llm_model = None


def _get_model():
    global _llm_model
    if _llm_model is None:
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or key == "your_gemini_api_key_here":
            logger.warning("GEMINI_API_KEY not set. LLM evaluation will return mock.")
            return None
        genai.configure(api_key=key)
        _llm_model = genai.GenerativeModel('gemini-1.5-flash')
        logger.info("Gemini 1.5 Flash initialized.")
    return _llm_model


def _build_rubric_section(rubric: dict) -> str:
    """
    Formats the rubric rules dict into a clean LLM prompt section.

    Handles both formats:
    - New format: {"max_marks": N, "rules": [{"type": ..., "description": ..., "weight": ...}]}
    - Legacy format: {"keywords": [], "expected_concepts": [], "max_marks": N}
    """
    lines = []
    max_marks = rubric.get("max_marks", rubric.get("maxMarks", 5))
    lines.append(f"Max Marks: {max_marks}")

    rules = rubric.get("rules", [])

    if rules:
        # New structured format from rule_utils.rubric_to_rules()
        lines.append("\nGrading Rules (check each one):")
        for i, rule in enumerate(rules, 1):
            rtype = rule.get("type", "Concept Match")
            desc = rule.get("description", "")
            weight = rule.get("weight", 1)
            lines.append(f"  Rule {i} [{rtype}] (worth {weight} mark{'s' if weight != 1 else ''}): {desc}")
    else:
        # Legacy fallback
        keywords = rubric.get("keywords", [])
        concepts = rubric.get("expected_concepts", rubric.get("expectedConcepts", []))
        partial = rubric.get("partial_credit_rules", [])
        if keywords:
            lines.append(f"Required keywords: {', '.join(keywords)}")
        if concepts:
            lines.append("Expected concepts:")
            for c in concepts:
                lines.append(f"  - {c}")
        if partial:
            lines.append("Partial credit rules:")
            for p in partial:
                lines.append(f"  - {p}")

    return "\n".join(lines)


def evaluate_with_llm(answer_text: str, rubric: dict) -> dict:
    """
    LLM-as-a-Judge: Grades a student answer against structured rubric rules.

    Called ONCE per cluster representative to save API cost.

    Args:
        answer_text: The student's answer (plain text, formulas preserved)
        rubric:      Dict with "max_marks" and "rules" (or legacy keys)

    Returns:
    {
      "score": 4,
      "confidence": 0.87,
      "flags": ["missing formula"],
      "explanation": "Mentioned gravity but missed F=ma derivation.",
      "rule_matches": [
        {"rule": "F = ma", "matched": true, "partial": false},
        ...
      ]
    }
    """
    model = _get_model()

    if not model:
        # Return a deterministic mock for testing without API key
        max_marks = rubric.get("max_marks", rubric.get("maxMarks", 5))
        logger.info("No API key — returning mock evaluation.")
        return {
            "score": max_marks // 2,
            "confidence": 0.0,
            "flags": ["NO_API_KEY"],
            "explanation": "Mock evaluation — Gemini API key not configured.",
            "rule_matches": []
        }

    rubric_text = _build_rubric_section(rubric)
    max_marks = rubric.get("max_marks", rubric.get("maxMarks", 5))
    rules = rubric.get("rules", [])

    # Build rule-match output schema dynamically
    rule_match_schema = ""
    if rules:
        rule_match_schema = (
            '\n    "rule_matches": [\n'
            + '\n'.join(
                f'        {{"rule": "{r.get("description","")[:60]}", "matched": <true/false>, "partial": <true/false>}}'
                for r in rules
            )
            + '\n    ],'
        )

    prompt = f"""You are an expert academic evaluator. Grade the student answer strictly against the rubric below.

[RUBRIC]
{rubric_text}

[STUDENT ANSWER]
{answer_text if answer_text.strip() else "(No answer provided)"}

Instructions:
- Check each grading rule explicitly.
- Award marks based on rule weights (each rule states how many marks it is worth).
- Do NOT award more than {max_marks} total marks.
- For Formula Match / Step Match rules: the student must show the correct expression or working.
- For Exact Match rules: the answer must match precisely (allow minor spelling variation).
- For Concept Match rules: the answer must clearly convey the expected idea.
- For Acceptable Variation rules: award mark if student gives any listed variant.
- For Partial Credit rules: apply the partial credit as described.

Return ONLY a raw JSON object (no markdown, no backticks, no explanation outside JSON):
{{
    "score": <integer between 0 and {max_marks}>,
    "confidence": <float between 0.0 and 1.0>,
    "flags": ["list of edge case notes, e.g. 'missing formula', 'partially correct', 'correct but incomplete'"],
    "explanation": "<short rationale referencing specific rules>",{rule_match_schema}
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        # Clamp score to valid range
        max_m = rubric.get("max_marks", rubric.get("maxMarks", 5))
        result["score"] = max(0, min(int(result.get("score", 0)), max_m))
        logger.info(
            f"LLM eval: score={result.get('score')}/{max_m} "
            f"confidence={result.get('confidence'):.2f}"
        )
        return result
    except json.JSONDecodeError as e:
        logger.error(f"LLM response was not valid JSON: {e}")
        return {"score": 0, "confidence": 0, "flags": ["PARSE_ERROR"], "explanation": str(e), "rule_matches": []}
    except Exception as e:
        logger.error(f"LLM evaluation failed: {e}")
        return {"score": 0, "confidence": 0, "flags": ["LLM_ERROR"], "explanation": str(e), "rule_matches": []}
