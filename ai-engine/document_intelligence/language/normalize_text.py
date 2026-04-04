import re
from utils.logger import get_logger

logger = get_logger(__name__)

def normalize_text(raw_text: str, preserve_formulas: bool = True) -> str:
    """
    Light, non-destructive cleanup of OCR-extracted text.
    NEVER lowercases - breaks formula variables (V, F, Ma).
    NEVER strips punctuation - breaks formulas (F=ma, V=IR).
    """
    if not raw_text:
        return ""
    text = raw_text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'[^\S\n\t]+', ' ', text)
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    logger.info(f"Normalized: {len(raw_text)} → {len(text)} chars")
    return text.strip()

def remove_ocr_noise(text: str) -> str:
    """More aggressive cleanup for clearly junk OCR artifacts. Use only on non-formula blocks."""
    lines = text.split('\n')
    return '\n'.join(line for line in lines if len(line.strip()) > 2 or line.strip().isalpha())
