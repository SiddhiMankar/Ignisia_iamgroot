from langdetect import detect, DetectorFactory, lang_detect_exception
from utils.logger import get_logger

logger = get_logger(__name__)

# Seed for reproducible results
DetectorFactory.seed = 42

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
}

def detect_language(text: str) -> dict:
    """
    Detects the primary language of the provided text.
    Returns a structured dict with language code and name.
    
    Returns:
        { "code": "en", "name": "English", "is_mixed": False }
    """
    if not text or len(text.strip()) < 20:
        logger.warning("Text too short for reliable language detection. Defaulting to 'en'.")
        return {"code": "en", "name": "English", "is_mixed": False}

    try:
        code = detect(text)
        name = SUPPORTED_LANGUAGES.get(code, f"Other ({code})")
        logger.info(f"Detected language: {name} [{code}]")
        
        # Heuristic: Check for Devanagari characters to flag Hindi/mixed content
        devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
        is_mixed = (code == "en" and devanagari_count > 5)
        
        return {"code": code, "name": name, "is_mixed": is_mixed}
    
    except lang_detect_exception.LangDetectException:
        logger.warning("Language detection failed. Defaulting to English.")
        return {"code": "en", "name": "English", "is_mixed": False}


def is_hindi_or_mixed(text: str) -> bool:
    """Quick helper: returns True if text contains Hindi content."""
    result = detect_language(text)
    return result["code"] == "hi" or result["is_mixed"]
