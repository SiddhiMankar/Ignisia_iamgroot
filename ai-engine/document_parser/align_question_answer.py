import re

def align_evaluation_data(parsed_rubric: dict, parsed_qa_paper: dict, parsed_answer_sheet: dict) -> dict:
    """
    Marries the structured academic outputs from the 3 document parsers 
    into a rigid, LLM-ready evaluation object.
    """
    evaluation_items = []
    
    # 1. Retrieve the segmented student answers
    student_id = parsed_answer_sheet.get('student_id', 'UNKNOWN')
    student_answers = parsed_answer_sheet.get('answers', {})
    
    # 2. Iterate over all questions defined in the Question Paper
    for q_key, q_details in parsed_qa_paper.items():
        # Get the corresponding rubric if it exists safely
        q_rubric = parsed_rubric.get(q_key, {
            "max_marks": q_details.get("marks", 0), 
            "keywords": [], 
            "expected_concepts": [],
            "formula_rules": [],
            "partial_credit_rules": []
        })
        
        # Get the corresponding answer, gracefully defaulting if student skipped it
        s_answer = student_answers.get(q_key, "NO_ANSWER_PROVIDED")
        
        # Build the heavily structured evaluation object for this specific question
        evaluation_items.append({
            "question_number": q_key,
            "question_text": q_details.get('question_text', 'N/A'),
            "rubric": q_rubric,
            "student_answer": s_answer
        })

    return {
        "student_id": student_id,
        "evaluation_items": evaluation_items
    }
