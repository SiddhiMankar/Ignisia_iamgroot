import re
from utils.logger import get_logger

logger = get_logger(__name__)

def normalize_text(raw_text: str, preserve_formulas: bool = True) -> str:
    """
    Applies lightweight, non-destructive normalization to OCR-extracted text.
    
    Rules:
    - Collapse multiple blank lines into one
    - Strip trailing whitespace from lines
    - Do NOT lowercase (breaks formula variables like V, F, Ma)
    - Do NOT strip punctuation (breaks formulas like F=ma)
    - Do NOT remove Devanagari or special characters
    
    Args:
        raw_text: The raw OCR string output
        preserve_formulas: If True, skips any cleanup that might destroy math
    
    Returns:
        Lightly cleaned string suitable for downstream parsing
    """
    if not raw_text:
        return ""

    # 1. Normalize CRLF to LF
    text = raw_text.replace('\r\n', '\n').replace('\r', '\n')

    # 2. Remove null bytes and non-printable control chars (except newline, tab)
    text = re.sub(r'[^\S\n\t]+', ' ', text)  # collapse horizontal whitespace
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)  # strip trailing spaces per line

    # 3. Collapse 3+ consecutive blank lines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    if not preserve_formulas:
        # Light cleanup: remove stray single characters that are OCR junk
        text = re.sub(r'(?<!\w)[|l1I](?!\w)', '', text)

    logger.info(f"Text normalized. Original: {len(raw_text)} chars -> Cleaned: {len(text)} chars")

    return text.strip()


def remove_ocr_noise(text: str) -> str:
    """
    More aggressive cleanup for clearly junk OCR artifacts.
    Use ONLY on non-formula text blocks.
    """
    # Remove lines that are just symbols or single characters (common OCR noise)
    lines = text.split('\n')
    filtered = [line for line in lines if len(line.strip()) > 2 or line.strip().isalpha()]
    return '\n'.join(filtered)
