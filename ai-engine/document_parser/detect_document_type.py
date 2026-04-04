import re
from utils.logger import get_logger

logger = get_logger(__name__)

# Heuristic keyword fingerprints for each document type
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

def detect_document_type(raw_text: str, is_scanned: bool = False) -> dict:
    """
    Heuristically classifies a document.
    
    Returns:
        {
            "type": "handwritten_question_paper" | "printed_question_paper" | "rubric" | ...,
            "confidence": "high" | "medium" | "low",
            "scores": {...}
        }
    """
    if not raw_text:
        return {"type": "unknown", "confidence": "low", "scores": {}}

    sample = raw_text[:3000].lower()

    scores = {
        "rubric": _score_signals(sample, RUBRIC_SIGNALS),
        "question_paper": _score_signals(sample, QUESTION_PAPER_SIGNALS),
        "answer_sheet": _score_signals(sample, ANSWER_SHEET_SIGNALS),
    }

    # Structural clues
    if re.search(r'q\d+.*?keywords', sample, re.DOTALL):
        scores["rubric"] += 2

    # Question paper patterns: Q1, Q.2, 1)
    q_matches = len(re.findall(r'(?:^|\b)(?:Q\.?\s*\d+|\d+[\.\)])\s+', sample, re.MULTILINE))
    if q_matches >= 2:
        scores["question_paper"] += (q_matches // 2)  # Add weight mostly if lots of questions

    avg_line_len = _average_line_length(raw_text[:2000])
    if avg_line_len > 60:
        scores["answer_sheet"] += 2

    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]
    
    if best_score == 0:
        best_type = "unknown"
        
    confidence = "high" if best_score >= 4 else "medium" if best_score >= 2 else "low"
    
    # Prepend scanned/printed routing
    if best_type in ["question_paper", "answer_sheet"]:
        # If it was forced through preprocessing/OCR fallback, assume handwritten for now
        prefix = "handwritten_" if is_scanned else "printed_"
        best_type = f"{prefix}{best_type}"
    
    logger.info(f"Document type detected: '{best_type}' (confidence: {confidence}) | scores: {scores}")
    
    return {
        "type": best_type,
        "confidence": confidence,
        "scores": scores
    }


def _score_signals(text: str, signals: list) -> int:
    return sum(1 for signal in signals if signal in text)


def _average_line_length(text: str) -> float:
    lines = [l for l in text.split('\n') if l.strip()]
    if not lines:
        return 0
    return sum(len(l) for l in lines) / len(lines)
