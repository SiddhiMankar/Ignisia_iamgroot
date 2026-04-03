import re

def parse_rubric(raw_text: str) -> dict:
    """
    Parses messy OCR text of a Faculty Rubric into rigid JSON nodes.
    
    Returns:
    { "Q1": {"max_marks": 5, "keywords": [...], "expected_concepts": [...], "partial_credit_rules": []} }
    """
    structured_rubric = {}
    
    # Split text into questions
    split_pattern = r"(?im)^\s*(?:Q|Question|Rubric for Q)?\s*(\d+)(?:[\.\):\-])\s+"
    parts = re.split(split_pattern, raw_text)
    
    if len(parts) <= 1:
        return {"Q1": _extract_rubric_payload(raw_text)}
        
    for i in range(1, len(parts), 2):
        q_num = f"Q{parts[i]}"
        q_raw_text = parts[i+1].strip() if i+1 < len(parts) else ""
        
        structured_rubric[q_num] = _extract_rubric_payload(q_raw_text)
        
    return structured_rubric


def _extract_rubric_payload(block_text: str) -> dict:
    """
    Scans a block of text targeting a specific question, extracting academic grading hooks.
    This uses heuristic regex targeting common rubric buzzwords.
    """
    payload = {
        "max_marks": 0,
        "keywords": [],
        "expected_concepts": [],
        "formula_rules": [],
        "partial_credit_rules": []
    }
    
    # Extract marks if defined (e.g., "Max Marks: 5", "Total: 10")
    marks_match = re.search(r"(?:max|total)?\s*marks?\s*[:=]?\s*(\d+)", block_text, re.IGNORECASE)
    if marks_match:
        payload["max_marks"] = int(marks_match.group(1))
        
    # Extract comma separated Keywords
    kw_match = re.search(r"(?:keywords|must include)\s*[:=]\s*(.*?)(?:\n|$)", block_text, re.IGNORECASE)
    if kw_match:
        raw_kws = kw_match.group(1).split(",")
        payload["keywords"] = [k.strip() for k in raw_kws if k.strip()]
        
    # Extract comma separated Concepts
    c_match = re.search(r"(?:concepts|ideas)\s*[:=]\s*(.*?)(?:\n|$)", block_text, re.IGNORECASE)
    if c_match:
        raw_c = c_match.group(1).split(",")
        payload["expected_concepts"] = [c.strip() for c in raw_c if c.strip()]
        
    # Extract Partial Credit logic
    pc_match = re.search(r"(?:partial credit|award)\s*[:=]\s*(.*?)(?:\n|$)", block_text, re.IGNORECASE)
    if pc_match:
         payload["partial_credit_rules"].append(pc_match.group(1).strip())
         
    # Fallback: If nothing triggered explicitly via colons, dump the block into concepts broadly
    if not payload["keywords"] and not payload["expected_concepts"]:
        payload["expected_concepts"].append(block_text.strip().replace('\n', ' '))
        
    return payload
