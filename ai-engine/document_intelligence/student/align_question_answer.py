from utils.logger import get_logger

logger = get_logger(__name__)


def align_evaluation_data(
    parsed_rubric: dict,
    parsed_qa_paper: dict,
    parsed_answer_sheet: dict
) -> dict:
    """
    Student Evaluation Flow — Final alignment step.

    Bridges parsed outputs from all 3 parsers into an LLM-ready evaluation object.
    This module ONLY aligns data. It does NOT call LLMs or assign marks.

    Returns:
    {
      "student_id": "S001",
      "evaluation_items": [
        {
          "question_number": "Q1",
          "question_text": "Explain photosynthesis.",
          "rubric": { "max_marks": 5, "keywords": [...], ... },
          "student_answer": "Photosynthesis is..."
        }
      ]
    }
    """
    student_id = parsed_answer_sheet.get("student_id", "UNKNOWN")
    student_answers = parsed_answer_sheet.get("answers", {})
    evaluation_items = []

    if not parsed_qa_paper:
        logger.warning("No question paper provided. Cannot align.")
        return {"student_id": student_id, "evaluation_items": []}

    for q_key, q_details in parsed_qa_paper.items():
        q_rubric = parsed_rubric.get(q_key, {
            "max_marks": q_details.get("marks", 0),
            "keywords": [], "expected_concepts": [],
            "formula_rules": [], "partial_credit_rules": []
        })
        if q_key not in parsed_rubric:
            logger.warning(f"No rubric for {q_key}. Using empty default.")

        s_answer = student_answers.get(q_key, "NO_ANSWER_PROVIDED")
        if s_answer == "NO_ANSWER_PROVIDED":
            logger.warning(f"No answer for {q_key} from student {student_id}.")

        evaluation_items.append({
            "question_number": q_key,
            "question_text": q_details.get("question_text", "N/A"),
            "rubric": q_rubric,
            "student_answer": s_answer
        })
        logger.info(f"Aligned {q_key} | ans_len={len(s_answer)} | kw={len(q_rubric.get('keywords',[]))}")

    logger.info(f"Alignment done for '{student_id}'. Items: {len(evaluation_items)}")
    return {"student_id": student_id, "evaluation_items": evaluation_items}
