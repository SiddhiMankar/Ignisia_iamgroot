import re
from utils.logger import get_logger

logger = get_logger(__name__)


def detect_edge_cases(answer_text: str, rubric: dict, llm_eval: dict) -> list:
    """
    Detects specific edge cases that need faculty attention.
    Runs AFTER LLM evaluation to supplement with deterministic pattern checks.
    
    Returns list of human-readable flag strings.
    """
    flags = list(llm_eval.get("flags", []))
    confidence = llm_eval.get("confidence", 1.0)
    score = llm_eval.get("score", 0)
    max_marks = rubric.get("max_marks", rubric.get("maxMarks", 5))

    # Low confidence → needs human review
    if confidence < 0.6:
        flags.append("LOW_CONFIDENCE_REVIEW")
        logger.warning(f"Low confidence score ({confidence:.2f}). Flagging for review.")

    # High score but no keywords matched (possible hallucination)
    keywords = rubric.get("keywords", [])
    matched_kw = sum(1 for kw in keywords if kw.lower() in answer_text.lower())
    if score >= max_marks * 0.8 and matched_kw == 0 and keywords:
        flags.append("HIGH_SCORE_NO_KEYWORDS")

    # Answer is very short (< 20 words) but got partial/full marks
    word_count = len(answer_text.split())
    if word_count < 20 and score > 0:
        flags.append("VERY_SHORT_ANSWER")

    # Formula pattern present but LLM gave 0
    if re.search(r'[a-zA-Z]\s*=\s*[\w\s\+\-\*/\^]+', answer_text) and score == 0:
        flags.append("FORMULA_PRESENT_BUT_ZERO_SCORE")

    # Deduplicate
    flags = list(dict.fromkeys(flags))
    if not flags:
        flags = ["NONE"]

    logger.info(f"Edge case detection complete: {flags}")
    return flags
