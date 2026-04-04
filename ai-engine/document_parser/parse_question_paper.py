import re
from utils.logger import get_logger
from document_parser.text_cleaner import clean_ocr_text

logger = get_logger(__name__)

# Very permissive pattern for handwritten OCR
# Handles 'Q1', 'Q 1', 'q.1', '1.', '1)', 'Question 1', 'Q-1'
# Handles merged text like "Q1.What is..."
_BOUNDARY_PATTERN = re.compile(
    r"""
    (?mx)                       
    ^[ \t]*                     
    (?:
        (?:Q|q|Question)[\.\-\s\,]*(\d+)[A-Za-z]?[\.\)\:\-\s\,]*
        |
        (\d+)[\.\)\,][ \t]*
    )
    """,
    re.VERBOSE | re.MULTILINE
)

# Detect subquestions like a), b), (a), (i), (ii)
_SUBQUESTION_PATTERN = re.compile(
    r"""
    (?mx)
    ^[ \t]*
    (?:
        \(([a-z_ivx]+)\)[ \t]*
        |
        ([a-z_ivx]+)\)[ \t]*
    )
    """,
    re.VERBOSE | re.MULTILINE
)

def parse_question_paper(raw_text: str, document_meta: dict = None) -> dict:
    """
    Parses noisy OCR text from handwritten question papers.
    Returns structured JSON-compliant dictionary matching the requested schema.
    """
    if document_meta is None:
        document_meta = {"type": "unknown", "source": "unknown"}

    text = clean_ocr_text(raw_text)
    boundaries = _find_question_boundaries(text)

    # Fallback if entirely unstructured
    if len(boundaries) == 0:
        logger.warning("No questions detected, treating entire doc as Q1.")
        boundaries = [("Q1", "1", 0)]

    questions = []
    
    for idx, (q_id, q_num, start) in enumerate(boundaries):
        end = boundaries[idx + 1][2] if idx + 1 < len(boundaries) else len(text)
        block = text[start:end].strip()
        
        # Clean header and extract sub-components
        block = _strip_question_header(block)
        
        q_text, subquestions = _extract_subquestions(block)
        marks = _extract_marks(block)

        questions.append({
            "question_id": q_id,
            "question_number": q_num,
            "question_text": q_text,
            "marks": marks,
            "subquestions": subquestions,
            "raw_block": block,
            "page_refs": [] # Page refs placeholder - implemented upstream if needed
        })
        
        logger.info(f"Parsed {q_id}: marks={marks} | subs={len(subquestions)} | '{q_text[:40].strip()}'")

    return {
        "document_type": document_meta.get("type", "handwritten_question_paper"),
        "source_file": document_meta.get("source", "unknown"),
        "questions": questions,
        "metadata": {
            "parser_notes": ["Parsed using handwritten heuristics"],
            "warnings": [] if len(boundaries) > 0 else ["No structure found"]
        }
    }


def _find_question_boundaries(text: str) -> list:
    """Returns list of (q_id, q_num, char_offset) tuples."""
    boundaries = []
    seen = set()
    for match in _BOUNDARY_PATTERN.finditer(text):
        num = match.group(1) or match.group(2)
        if num:
            q_id = f"Q{num}"
            if q_id not in seen:
                seen.add(q_id)
                boundaries.append((q_id, num, match.start()))
    return boundaries


def _strip_question_header(block: str) -> str:
    lines = block.split('\n')
    if not lines:
        return block
    # Remove the boundary match from the very first line
    first_line = re.sub(
        r'^[ \t]*(?:(?:Q|q|Question)[\.\-\s\,]*\d+[\.\)\:\-\s\,]*|\d+[\.\)\,][ \t]*)',
        '', lines[0], flags=re.IGNORECASE
    ).strip()
    
    lines[0] = first_line
    return '\n'.join(lines).strip()


def _extract_subquestions(block: str) -> tuple:
    """
    Finds (a), (b), etc within the question block.
    Returns (main_question_text, [{"label": "a", "text": "..."}])
    """
    boundaries = []
    for match in _SUBQUESTION_PATTERN.finditer(block):
        label = match.group(1) or match.group(2)
        if label:
            boundaries.append((label, match.start(), match.end()))

    if not boundaries:
        return block, []

    # Text before the first subquestion is the main prompt
    main_text = block[:boundaries[0][1]].strip()
    subquestions = []

    for idx, (label, start, content_start) in enumerate(boundaries):
        end = boundaries[idx + 1][1] if idx + 1 < len(boundaries) else len(block)
        sub_text = block[content_start:end].strip()
        subquestions.append({
            "label": label,
            "text": sub_text
        })

    return main_text, subquestions


def _extract_marks(block: str) -> int:
    """Aggressive heuristic extraction of marks typical in handwriting: [5], 5M, 5 Marks"""
    # Ex: [ 5 ], (5), [5marks], 5 M
    patterns = [
        r'[\(\[]\s*(\d+)\s*(?:marks?|m|pts?)?\s*[\)\]]',
        r'(\d+)\s*(?:marks?|pts?)'
    ]
    for pat in patterns:
        m = re.search(pat, block, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return 0
