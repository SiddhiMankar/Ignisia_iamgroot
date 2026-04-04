import os
import fitz
import numpy as np
import easyocr
from PIL import Image
from pdf2image import convert_from_path
from utils.logger import get_logger
from document_intelligence.language.normalize_text import normalize_text

logger = get_logger(__name__)

_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        logger.info("Loading EasyOCR model (first-time load may take 10-30s)...")
        _ocr_reader = easyocr.Reader(['en', 'hi'], gpu=False)
    return _ocr_reader


def extract_document_text(file_path: str) -> dict:
    """
    Primary entry point for document extraction.
    Supports: digital PDFs, scanned PDFs, and standalone images.

    Returns:
    {
        "file_path": "...",
        "method": "pdf_text" | "ocr" | "image_ocr",
        "pages": [{"page_number": 1, "text": "..."}],
        "raw_text": "..."
    }
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    logger.info(f"Processing: {file_path} [{ext}]")

    if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
        return _extract_from_image(file_path)
    elif ext == '.pdf':
        return _extract_from_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_from_pdf(file_path: str) -> dict:
    doc = fitz.open(file_path)
    pages_output = []
    total_chars = 0

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        total_chars += len(text.strip())
        pages_output.append({"page_number": page_num + 1, "text": normalize_text(text)})

    avg = total_chars / max(len(doc), 1)
    logger.info(f"PDF avg chars/page: {avg:.0f}")

    if avg < 50:
        logger.info("Scanned/image PDF detected. Using OCR fallback...")
        return _pdf_ocr_fallback(file_path)

    return _build_response(file_path, "pdf_text", pages_output)


def _pdf_ocr_fallback(file_path: str) -> dict:
    reader = _get_ocr_reader()
    logger.info("Converting PDF pages to images at 300 DPI...")
    images = convert_from_path(file_path, dpi=300)
    pages_output = []
    for idx, pil_image in enumerate(images):
        logger.info(f"  OCR scanning page {idx + 1}/{len(images)}...")
        img_array = np.array(pil_image)
        results = reader.readtext(img_array, detail=0, paragraph=True)
        pages_output.append({"page_number": idx + 1, "text": normalize_text("\n".join(results))})
    return _build_response(file_path, "ocr", pages_output)


def _extract_from_image(file_path: str) -> dict:
    reader = _get_ocr_reader()
    pil_image = Image.open(file_path).convert("RGB")
    results = reader.readtext(np.array(pil_image), detail=0, paragraph=True)
    pages_output = [{"page_number": 1, "text": normalize_text("\n".join(results))}]
    return _build_response(file_path, "image_ocr", pages_output)


def _build_response(file_path: str, method: str, pages: list) -> dict:
    raw_text = "\n\n".join([p["text"] for p in pages])
    logger.info(f"Extraction done. method={method} pages={len(pages)} chars={len(raw_text)}")
    return {"file_path": file_path, "method": method, "pages": pages, "raw_text": raw_text}
