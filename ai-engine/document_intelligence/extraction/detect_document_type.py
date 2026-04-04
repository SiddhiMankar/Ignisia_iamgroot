import re
from utils.logger import get_logger

logger = get_logger(__name__)

RUBRIC_SIGNALS = [
    "marking scheme", "rubric", "keywords:", "expected concepts",
    "partial credit", "must include", "award marks", "max marks",
    "key points", "keywords expected"
]
QUESTION_PAPER_SIGNALS = [
    "answer any", "attempt", "section a", "section b",
    "all questions", "maximum marks", "time allowed",
    "instructions", "total marks"
]
ANSWER_SHEET_SIGNALS = [
    "student name", "roll number", "enrollment", "reg no",
    "answer:", "ans:", "answer to", "solved by"
]


def detect_document_type(raw_text: str) -> dict:
    """
    Heuristically classifies an uploaded document as:
    'rubric', 'question_paper', 'answer_sheet', or 'unknown'.
    """
    if not raw_text:
        return {"type": "unknown", "confidence": "low", "scores": {}}

    sample = raw_text[:2000].lower()

    scores = {
        "rubric": _score_signals(sample, RUBRIC_SIGNALS),
        "question_paper": _score_signals(sample, QUESTION_PAPER_SIGNALS),
        "answer_sheet": _score_signals(sample, ANSWER_SHEET_SIGNALS),
    }

    if re.search(r'q\d+.*?keywords', sample, re.DOTALL):
        scores["rubric"] += 2

    q_matches = len(re.findall(r'\bq\.?\s*\d+\b', sample))
    if q_matches >= 2:
        scores["question_paper"] += q_matches

    avg_line_len = _average_line_length(raw_text[:2000])
    if avg_line_len > 60:
        scores["answer_sheet"] += 2

    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]
    confidence = "high" if best_score >= 3 else "medium" if best_score >= 1 else "low"

    logger.info(f"Doc type: '{best_type}' confidence={confidence} scores={scores}")
    return {
        "type": best_type if best_score > 0 else "unknown",
        "confidence": confidence,
        "scores": scores
    }


def _score_signals(text: str, signals: list) -> int:
    return sum(1 for s in signals if s in text)


def _average_line_length(text: str) -> float:
    lines = [l for l in text.split('\n') if l.strip()]
    return sum(len(l) for l in lines) / len(lines) if lines else 0
