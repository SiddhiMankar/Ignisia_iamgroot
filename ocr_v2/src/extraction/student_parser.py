import re
from typing import List, Dict, Any

def normalize_student_line(line: str) -> str:
    """Light normalization mapping applied to student lines."""
    line = line.strip()

    # Normalize spaces
    line = re.sub(r'\s+', ' ', line)

    # Remove over-repeated punctuation (e.g. "!!!!!" to "!")
    line = re.sub(r'([.,!?])\1+', r'\1', line)

    return line.strip()

def is_student_answer_start(line: str) -> bool:
    """Detects starting boundaries of a student question response."""
    line = line.strip().lower()

    patterns = [
        r'^q\d+',
        r'^\d+[\.\)]',
        r'^ans',
        r'^answer',
        r'^उत्तर'
    ]

    for pattern in patterns:
        if re.match(pattern, line):
            return True

    return False

def split_student_answer_blocks(lines: List[str]) -> List[List[str]]:
    """Groups answer lines into discrete blocks based on question boundaries."""
    blocks = []
    current_block = []

    for line in lines:
        if is_student_answer_start(line) and current_block:
            blocks.append(current_block)
            current_block = [line]
        else:
            current_block.append(line)

    if current_block:
        blocks.append(current_block)

    return blocks

def parse_student_answer_block(block: List[str]) -> Dict[str, Any]:
    """Extracts question number (if available) and formatted text."""
    if not block:
        return None

    first_line = block[0]
    question_number = None

    # Search for Q1 style
    q_match = re.search(r'Q(\d+)', first_line, re.IGNORECASE)
    if q_match:
        question_number = int(q_match.group(1))
    else:
        # Search for 1. or 1) style
        q_match = re.search(r'^(\d+)[\.\)]', first_line)
        if q_match:
            question_number = int(q_match.group(1))

    # Strip Q1 to isolate pure answer context if present on the first line
    # Sometimes students write "Q1 OS is..." so we preserve the rest of the line
    if question_number is not None:
         # Remove the question marker
         clean_first_line = re.sub(r'^(?:Q|q)?\d+[\.\)]?\s*(?:ans|answer|उत्तर)?\s*', '', first_line, flags=re.IGNORECASE).strip()
    else:
         # They just wrote "Ans:" or "Answer"
         clean_first_line = re.sub(r'^(?:ans|answer|उत्तर)\s*:?\s*', '', first_line, flags=re.IGNORECASE).strip()

    answer_parts = []
    if clean_first_line:
        answer_parts.append(clean_first_line)
    
    # Append the rest of the block
    answer_parts.extend(block[1:])
    answer_text = "\n".join(answer_parts).strip()

    return {
        "question_number": question_number,
        "answer_text": answer_text,
        "raw_blocks": block
    }

def structure_student_document(line_texts: List[str]) -> Dict[str, Any]:
    """Public wrapper handling the structuring of student docs."""
    normalized_lines = [normalize_student_line(line) for line in line_texts]
    blocks = split_student_answer_blocks(normalized_lines)

    student_answers = []

    for block in blocks:
        parsed = parse_student_answer_block(block)
        if parsed and parsed.get("answer_text"):
            student_answers.append(parsed)

    return {
        "document_type": "answer_sheet",
        "student_answers": student_answers
    }
