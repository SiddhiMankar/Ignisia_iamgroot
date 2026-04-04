from langdetect import detect, DetectorFactory, lang_detect_exception
from utils.logger import get_logger

logger = get_logger(__name__)
DetectorFactory.seed = 42

SUPPORTED_LANGUAGES = {"en": "English", "hi": "Hindi"}

def detect_language(text: str) -> dict:
    if not text or len(text.strip()) < 20:
        return {"code": "en", "name": "English", "is_mixed": False}
    try:
        code = detect(text)
        name = SUPPORTED_LANGUAGES.get(code, f"Other ({code})")
        devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
        is_mixed = (code == "en" and devanagari_count > 5)
        logger.info(f"Language: {name} [{code}] mixed={is_mixed}")
        return {"code": code, "name": name, "is_mixed": is_mixed}
    except lang_detect_exception.LangDetectException:
        return {"code": "en", "name": "English", "is_mixed": False}

def is_hindi_or_mixed(text: str) -> bool:
    result = detect_language(text)
    return result["code"] == "hi" or result["is_mixed"]
