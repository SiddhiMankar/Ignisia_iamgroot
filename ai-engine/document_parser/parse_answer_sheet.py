import re

def parse_answer_sheet(student_id: str, raw_text: str) -> dict:
    """
    Parses messy OCR text of a Student's specific submission into mapping blocks.
    
    Returns:
    { "student_id": "S123", "answers": {"Q1": "...", "Q2": "..."} }
    """
    answers = {}
    
    # Similar aggressive splitting strategy tuned for student handwriting 
    # Hand-written OCR frequently drops periods, so we look for 'Ans 1', 'A.1.', '1)' etc
    split_pattern = r"(?im)^\s*(?:Q|Question|Ans|Answer|A)?\s*(\d+)[\.\):\-]?\s*\n?"
    parts = re.split(split_pattern, raw_text)
    
    if len(parts) <= 1:
        # If student completely ignored numbers, dump everything as Q1 to be safe
        answers["Q1"] = raw_text.strip()
    else:
        for i in range(1, len(parts), 2):
            q_num = f"Q{parts[i]}"
            
            # Answer text is everything up until the subsequent split. 
            # We preserve internal linebreaks \n so equations don't get squashed.
            answer_text = parts[i+1].strip() if i+1 < len(parts) else ""
            answers[q_num] = answer_text
            
    return {
        "student_id": student_id,
        "answers": answers
    }
