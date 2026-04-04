import re
from utils.logger import get_logger

logger = get_logger(__name__)


def parse_answer_sheet(student_id: str, raw_text: str) -> dict:
    """
    Student Evaluation Flow — parses a student's handwritten answer sheet.

    Detects question boundaries using flexible regex (Q1, Ans 1, A.1, 1), etc.)
    Preserves internal newlines so formulas and equations are not squashed.

    Returns:
    {
      "student_id": "S001",
      "answers": {
        "Q1": "Photosynthesis is the process...",
        "Q2": "Ohm's law states that..."
      }
    }
    """
    answers = {}
    split_pattern = r"(?im)^\s*(?:Ans(?:wer)?(?:\s*to)?|Q(?:uestion)?)?\s*(\d+)[\.\):\-]?\s*\n?"
    parts = re.split(split_pattern, raw_text.strip())

    if len(parts) <= 1:
        logger.warning(f"[{student_id}] No answer boundaries. Treating entire text as Q1.")
        answers["Q1"] = raw_text.strip()
    else:
        for i in range(1, len(parts), 2):
            q_num = f"Q{parts[i].strip()}"
            answer_text = parts[i + 1].strip() if i + 1 < len(parts) else ""
            if not answer_text:
                logger.warning(f"[{student_id}] Empty answer for {q_num}.")
                answers[q_num] = "NO_ANSWER_PROVIDED"
            else:
                answers[q_num] = answer_text
                logger.info(f"[{student_id}] {q_num}: {len(answer_text)} chars")

    return {"student_id": student_id, "answers": answers}
