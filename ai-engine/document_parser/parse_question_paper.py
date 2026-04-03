import re

def parse_question_paper(raw_text: str) -> dict:
    """
    Parses OCR text of a Question Paper into structured JSON.
    Expected to find boundaries like "Q1.", "1)", or "Question 1" 
    and optionally parses marks if present like "[5]" or "(5 Marks)".
    
    Returns:
    { "Q1": {"question_text": "...", "marks": 5} }     
    """
    structured_data = {}
    
    # 1. Regex to split the text into question blocks based on standard numerical prefixes
    # Matches patterns like: "1.", "Q1", "Question 1:" 
    # capturing the number in group(1)
    split_pattern = r"(?im)^\s*(?:Q|Question)?\s*(\d+)(?:[\.\):\-])\s+"
    parts = re.split(split_pattern, raw_text)
    
    if len(parts) <= 1:
        # Heavily degraded OCR or paragraph style paper: Default grouping
        return {"Q1": {"question_text": raw_text.strip(), "marks": 0}}
        
    for i in range(1, len(parts), 2):
        q_num = f"Q{parts[i]}"
        q_raw_text = parts[i+1].strip() if i+1 < len(parts) else ""
        
        # 2. Extract potential marks attached to the question (e.g. [5], (10 marks))
        marks_match = re.search(r"[\(\[]\s*(\d+)\s*(?:marks?|pts?)?\s*[\)\]]", q_raw_text, re.IGNORECASE)
        marks = 0
        clean_question = q_raw_text
        
        if marks_match:
            marks = int(marks_match.group(1))
            # Optional: Strip the marks text from the actual question string
            clean_question = q_raw_text.replace(marks_match.group(0), "").strip()
            
        structured_data[q_num] = {
            "question_text": clean_question,
            "marks": marks
        }
        
    return structured_data
