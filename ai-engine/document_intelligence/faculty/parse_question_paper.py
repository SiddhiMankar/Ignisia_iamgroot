import re
from utils.logger import get_logger

logger = get_logger(__name__)


def parse_question_paper(raw_text: str) -> dict:
    """
    Faculty Flow — parses a question paper into structured question objects.

    Handles: Q1., 1), Question 1:, and mark notations like [5] or (5 Marks).

    Returns:
    { "Q1": { "question_text": "Explain photosynthesis.", "marks": 5 }, ... }
    """
    structured = {}
    split_pattern = r"(?im)^\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\)\:]?\s"
    parts = re.split(split_pattern, raw_text.strip())

    if len(parts) <= 1:
        logger.warning("No question boundaries found. Treating full text as Q1.")
        return {"Q1": {"question_text": raw_text.strip(), "marks": _extract_marks(raw_text)}}

    for i in range(1, len(parts), 2):
        q_num = f"Q{parts[i].strip()}"
        q_raw = parts[i + 1].strip() if i + 1 < len(parts) else ""
        marks = _extract_marks(q_raw)
        clean_text = re.sub(
            r"[\(\[]\s*\d+\s*(?:marks?|pts?)?\s*[\)\]]", "", q_raw, flags=re.IGNORECASE
        ).strip()
        if len(clean_text) > 300:
            clean_text = clean_text.split('\n')[0].strip()
        structured[q_num] = {"question_text": clean_text, "marks": marks}
        logger.info(f"Parsed {q_num}: marks={marks} text='{clean_text[:60]}'")

    return structured


def _extract_marks(text: str) -> int:
    match = re.search(r"[\(\[]\s*(\d+)\s*(?:marks?|pts?)?\s*[\)\]]", text, re.IGNORECASE)
    return int(match.group(1)) if match else 0
