import os
import re
import string
import easyocr
import google.generativeai as genai
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load ENV
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_KEY and GEMINI_KEY != "YOUR_GEMINI_API_KEY_HERE":
    genai.configure(api_key=GEMINI_KEY)
    llm_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    llm_model = None

# Global EasyOCR initialization (loads both simultaneously per user approval)
print("[INFO] Initializing EasyOCR ['en'] and fallback ['hi'] ...")
english_reader = easyocr.Reader(['en'], gpu=False)
hindi_reader = easyocr.Reader(['hi'], gpu=False)

HINGLISH_MAP = {
    "uttar": "answer",
    "likho": "write",
    "samjhao": "explain",
    "samjhaiye": "explain",
    "vyakhya": "explanation",
    "paribhasha": "definition",
    "udaharan": "example",
    "bhed": "difference",
    "varnan": "description",
    "samikaran": "equation",
    "sutra": "formula",
    "ank": "marks",
    "prashn": "question"
}

def clean_token_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r'[^\w\s\.\,\:\;\-\+\=\(\)\/\?\!ऀ-ॿ]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_hinglish(text: str) -> str:
    words = text.split()
    normalized = []
    for word in words:
        stripped = word.strip(string.punctuation)
        lower = stripped.lower()
        mapped = HINGLISH_MAP.get(lower, stripped)
        prefix_len = len(word) - len(word.lstrip(string.punctuation))
        suffix_len = len(word) - len(word.rstrip(string.punctuation))
        prefix = word[:prefix_len] if prefix_len > 0 else ""
        suffix = word[len(word)-suffix_len:] if suffix_len > 0 else ""
        normalized.append(prefix + mapped + suffix)
    return " ".join(normalized)

def get_top_left(bbox: List[List[int]]) -> tuple:
    xs = [int(point[0]) for point in bbox]
    ys = [int(point[1]) for point in bbox]
    return min(xs), min(ys)

def process_tokens_into_lines(tokens: List[Dict[str, Any]], y_threshold: int = 20) -> List[str]:
    sorted_tokens = sorted(tokens, key=lambda t: (t["y"], t["x"]))
    lines = []
    current_line = []
    current_y = None
    for token in sorted_tokens:
        if current_y is None:
            current_y = token["y"]
            current_line.append(token["clean_text"])
            continue
        if abs(token["y"] - current_y) <= y_threshold:
            current_line.append(token["clean_text"])
        else:
            lines.append(" ".join(current_line))
            current_y = token["y"]
            current_line = [token["clean_text"]]
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def should_run_hindi_fallback(clean_text: str, uncertain_tokens: list, total_tokens: int) -> bool:
    if len(clean_text.strip()) < 20: 
        return True
    if total_tokens == 0:
        return True
    if total_tokens > 0 and (len(uncertain_tokens) / total_tokens) > 0.45:
        return True
    return False

def should_translate(clean_text: str) -> bool:
    MIN_TRANSLATION_LENGTH = 30
    if not clean_text:
        return False
    if len(clean_text.strip()) < MIN_TRANSLATION_LENGTH:
        return False
    return True

def compute_confidence_score(tokens: list, uncertain_tokens: list) -> float:
    total = len(tokens) + len(uncertain_tokens)
    if total == 0: return 0.0
    return round(len(tokens) / total, 3)

def compute_uncertainty_ratio(tokens: list, uncertain_tokens: list) -> float:
    total = len(tokens) + len(uncertain_tokens)
    if total == 0: return 1.0
    return round(len(uncertain_tokens) / total, 3)

def run_llm_translation(text: str, prompt: str) -> str:
    if not should_translate(text):
        return "[Translation Skipped: Low OCR confidence or too little text]"
    if not llm_model:
        return "[Translation Skipped: GEMINI_API_KEY inside ocr_v2/.env is missing or invalid]"
    full_prompt = f"{prompt}\n\nTEXT:\n{text}\n"
    try:
        response = llm_model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return f"[Translation Error: {e}]"

def _run_ocr_pass(image_array, reader, threshold: float):
    raw_results = reader.readtext(image_array)
    tokens = []
    uncertain_tokens = []
    raw_text_parts = []
    for (bbox, text, conf) in raw_results:
        raw_text_parts.append(text)
        if conf >= threshold:
            x, y = get_top_left(bbox)
            tokens.append({
                "bbox": [[int(pt[0]), int(pt[1])] for pt in bbox],
                "raw_text": text,
                "clean_text": clean_token_text(text),
                "confidence": float(conf),
                "x": x,
                "y": y
            })
        else:
            uncertain_tokens.append({"text": text, "confidence": float(conf)})
    return tokens, uncertain_tokens, " ".join(raw_text_parts)

def run_teacher_ocr(image_array) -> Dict[str, Any]:
    tokens, uncertain_tokens, raw_text = _run_ocr_pass(image_array, english_reader, 0.45)
    line_texts = process_tokens_into_lines(tokens)
    clean_text = "\n".join(line_texts)
    
    teacher_prompt = """You are cleaning OCR text from a teacher's academic rubric or question paper.
Task:
1. Correct obvious OCR mistakes
2. Translate Hindi or Hinglish into English if present
3. Preserve marks, steps, keywords, and question structure
4. Do NOT add missing content
5. Keep uncertain text if unclear

Return only clean structured English text."""
    
    translated_text = run_llm_translation(clean_text, teacher_prompt)
    
    return {
        "document_type": "teacher",
        "raw_text": raw_text,
        "clean_text": clean_text,
        "normalized_text": clean_text,
        "translated_text": translated_text,
        "line_texts": line_texts,
        "tokens": tokens,
        "uncertain_tokens": uncertain_tokens,
        "confidence_score": compute_confidence_score(tokens, uncertain_tokens),
        "uncertainty_ratio": compute_uncertainty_ratio(tokens, uncertain_tokens)
    }

def run_student_ocr(image_array) -> Dict[str, Any]:
    tokens_en, uncertain_en, raw_text_en = _run_ocr_pass(image_array, english_reader, 0.30)
    line_texts_en = process_tokens_into_lines(tokens_en)
    clean_text_en = "\n".join(line_texts_en)
    
    used_hindi_fallback = False
    final_tokens = tokens_en
    final_uncertain = uncertain_en
    final_raw = raw_text_en
    
    # 1. Hindi Fallback OCR Processing
    if should_run_hindi_fallback(clean_text_en, uncertain_en, len(tokens_en)):
        used_hindi_fallback = True
        tokens_hi, uncertain_hi, raw_text_hi = _run_ocr_pass(image_array, hindi_reader, 0.25)
        # Merge safely
        final_raw += "\n" + raw_text_hi
        final_tokens.extend(tokens_hi)
        final_uncertain.extend(uncertain_hi)
    
    final_line_texts = process_tokens_into_lines(final_tokens)
    final_clean_text = "\n".join(final_line_texts)
    
    # 4. Improved Hinglish Normalization
    normalized_lines = [normalize_hinglish(line) for line in final_line_texts]
    normalized_text = "\n".join(normalized_lines)
    
    student_prompt = """You are cleaning OCR text from a student's handwritten answer sheet.
Task:
1. Correct obvious OCR mistakes
2. Translate Hindi or Hinglish into English if possible
3. Preserve technical meaning
4. Preserve line/step structure
5. Do NOT invent missing content
6. Keep incomplete text if uncertain

Return only cleaned English text."""
    
    # 2. Translation Safety Check
    translated_text = run_llm_translation(normalized_text, student_prompt)
    
    # 3. Confidence Score Generation
    conf_score = compute_confidence_score(final_tokens, final_uncertain)
    uncert_ratio = compute_uncertainty_ratio(final_tokens, final_uncertain)
    
    return {
        "document_type": "student",
        "raw_text": final_raw,
        "clean_text": final_clean_text,
        "normalized_text": normalized_text,
        "translated_text": translated_text,
        "line_texts": normalized_lines,
        "tokens": final_tokens,
        "uncertain_tokens": final_uncertain,
        "confidence_score": conf_score,
        "uncertainty_ratio": uncert_ratio,
        "used_hindi_fallback": used_hindi_fallback
    }
