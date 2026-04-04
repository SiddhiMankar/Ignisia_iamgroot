"""
document_parser/text_cleaner.py
---------------------------------
Safe, non-destructive OCR text cleanup for faculty PDFs.

Rules this module ALWAYS follows:
- NEVER lowercase (breaks formulas: V, F, m, a)
- NEVER strip punctuation (breaks F=ma, H₂O, V=IR)
- NEVER destroy Hindi/Devanagari characters
- NEVER strip question numbers or bullet markers
"""

import re
import unicodedata


def clean_ocr_text(raw_text: str) -> str:
    """
    Master cleanup function. Safe to run on any OCR output before parsing.
    Applies all fixes in order.
    """
    if not raw_text:
        return ""

    text = raw_text

    # 1. Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # 2. Remove zero-width spaces and invisible Unicode formatting characters
    text = re.sub(r'[\u200b\u200c\u200d\ufeff\u00ad]', '', text)

    # 3. Normalize Unicode: NFC to compose precomposed characters (fixes broken Hindi)
    text = unicodedata.normalize('NFC', text)

    # 4. Replace common OCR misreads for bullet points → standard bullet
    text = re.sub(r'[\u25cf\u25ce\u25cb\u25cf\u2022\u00b7\u25aa\u25b8\u27a4\u25ba]\s*', '• ', text)

    # 5. Collapse runs of 3+ blank lines → max 2 blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # 6. Strip trailing horizontal whitespace per line
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

    # 7. Collapse multiple spaces/tabs into one (but NOT newlines)
    text = re.sub(r'[ \t]{2,}', ' ', text)

    # 8. Fix broken OCR spacing after question numbers
    text = re.sub(r'\bQ\s+(\d+)', r'Q\1', text)
    text = re.sub(r'^(\d+)\s+\.\s*', r'\1. ', text, flags=re.MULTILINE)

    # 9. Fix TRUNCATED section label prefixes caused by PyMuPDF character splitting
    # e.g. "inal Answer:" → "Final Answer:", "iven:" → "Given:"
    _truncated_labels = [
        (r'(?m)^[ \t]*[Ii]deal\s+Answer', 'Ideal Answer'),
        (r'(?m)^[ \t]*inal\s+Answer', 'Final Answer'),
        (r'(?m)^[ \t]*iven[:：]', 'Given:'),
        (r'(?m)^[ \t]*ubstitution[:：]', 'Substitution:'),
        (r'(?m)^[ \t]*ormula[:：]', 'Formula:'),
        (r'(?m)^[ \t]*cceptable\s+Variations?', 'Acceptable Variations'),
        (r'(?m)^[ \t]*odel\s+Answer', 'Model Answer'),
    ]
    for pat, replacement in _truncated_labels:
        text = re.sub(pat, replacement, text)

    # 10. Remove lone single non-word characters on their own line (OCR junk)
    text = re.sub(r'(?m)^[^\w\d\u0900-\u097F\n]{1}$', '', text)
    
    # 11. Handwritten specific: stray commas, backticks, pipes that EasyOCR hallucinates
    # Only remove them if they are completely floating (surrounded by spaces)
    text = re.sub(r'(?m)[ \t]+[,\`\|\~\_][ \t]+', ' ', text)

    # 12. Final strip
    return text.strip()


def extract_bullet_items(block: str) -> list:
    """
    Extracts lines that start with a bullet marker (●, •, -, *) from a text block.
    Returns a clean list of strings without the bullet character.
    
    Used by parse_rubric.py to pull out rubric rules from bullet-format PDFs.
    """
    lines = block.split('\n')
    items = []
    for line in lines:
        stripped = line.strip()
        # Match bullet markers: •, ●, -, *, or numbered like "1.", "a)"
        if re.match(r'^[•●\-\*]\s+', stripped):
            item = re.sub(r'^[•●\-\*]\s+', '', stripped).strip()
            if item:
                items.append(item)
        elif re.match(r'^\w+[\.\)]\s+', stripped) and len(stripped) > 3:
            item = re.sub(r'^\w+[\.\)]\s+', '', stripped).strip()
            if item:
                items.append(item)
    return items


def extract_marks_from_line(line: str) -> int:
    """
    Finds a trailing mark value in a rubric line.
    e.g. "Uses sunlight (1)" → 1,  "Explains process – 2 marks" → 2
    """
    # Pattern 1: trailing (N) or [N]
    m = re.search(r'[\(\[]\s*(\d+)\s*[\)\]]$', line.strip())
    if m:
        return int(m.group(1))
    # Pattern 2: "N marks" at end
    m = re.search(r'(\d+)\s*marks?\s*$', line.strip(), re.IGNORECASE)
    if m:
        return int(m.group(1))
    return 0


def suppress_easyocr_logs():
    """
    Suppresses EasyOCR's TQDM progress bars and internal logging so they
    don't collide with our structured logger output in the terminal.

    Call this ONCE before importing easyocr or loading the OCR reader.
    """
    import logging
    import os
    # Suppress TQDM output globally
    os.environ["TQDM_DISABLE"] = "1"
    # Suppress easyocr internal loggers
    for name in ["easyocr", "PIL", "torch", "torchvision"]:
        logging.getLogger(name).setLevel(logging.ERROR)
