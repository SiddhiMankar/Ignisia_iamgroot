import os
import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from utils.logger import get_logger
from language.normalize_text import normalize_text
from document_parser.text_cleaner import suppress_easyocr_logs
from document_parser.handwriting_preprocess import preprocess_image_array

# Suppress EasyOCR TQDM bars before importing easyocr
suppress_easyocr_logs()
import easyocr  # noqa: E402

logger = get_logger(__name__)

_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        logger.info("Loading EasyOCR model (English only for handwriting stability)...")
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader


def extract_document_text(file_path: str, force_ocr: bool = False, preprocess: bool = True, max_pages: int = None) -> dict:
    """
    Primary entry point for the document extraction layer.
    
    Supports:
    - Digital text-based PDFs  → fast PyMuPDF extraction
    - Scanned/image PDFs       → PyMuPDF render + Preprocess + EasyOCR
    - Image files (JPG/PNG)    → Preprocess + EasyOCR
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"[extract_text] File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    logger.info(f"Processing file: {file_path} (type: {ext})")

    if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
        return _extract_from_image(file_path, preprocess)
    elif ext == '.pdf':
        return _extract_from_pdf(file_path, force_ocr, preprocess, max_pages)
    else:
        raise ValueError(f"[extract_text] Unsupported file type: {ext}")


def _extract_from_pdf(file_path: str, force_ocr: bool, preprocess: bool, max_pages: int = None) -> dict:
    """Tries native PyMuPDF first. Falls back to OCR if the PDF is scanned."""
    doc = fitz.open(file_path)
    
    if not force_ocr:
        pages_output = []
        total_chars = 0
        limit = min(max_pages, len(doc)) if max_pages else len(doc)

        for page_num in range(limit):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            total_chars += len(text.strip())
            pages_output.append({
                "page_number": page_num + 1,
                "text": normalize_text(text)
            })

        avg_chars_per_page = total_chars / max(len(doc), 1)
        logger.info(f"PDF avg chars/page: {avg_chars_per_page:.0f}")

        # Heuristic: if less than 50 avg chars → it's a scanned image PDF
        if avg_chars_per_page >= 50:
            logger.info(f"Digital PDF extracted successfully. Pages: {len(doc)}")
            return _build_response(file_path, "pdf_text", pages_output)
            
        logger.info("Detected scanned/image-based PDF. Switching to OCR fallback...")

    return _pdf_ocr_fallback_fitz(doc, file_path, preprocess, max_pages)


def _pdf_ocr_fallback_fitz(doc: fitz.Document, file_path: str, preprocess: bool, max_pages: int = None) -> dict:
    """Converts each PDF page to an image internally using PyMuPDF and runs EasyOCR."""
    reader = _get_ocr_reader()
    pages_output = []
    
    # 200 DPI is usually the sweet spot for OCR speed vs accuracy
    zoom_matrix = fitz.Matrix(200 / 72, 200 / 72)
    
    limit = min(max_pages, len(doc)) if max_pages else len(doc)
    
    for page_num in range(limit):
        logger.info(f"  → OpenCV + OCR scanning page {page_num + 1} of {limit}...")
        page = doc.load_page(page_num)
        
        # Render page to RGB image array
        pix = page.get_pixmap(matrix=zoom_matrix, colorspace=fitz.csRGB)
        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)

        # Preprocess if requested (highly recommended for handwriting)
        if preprocess:
            img_array = preprocess_image_array(img_array)

        # EasyOCR: detail=0 gets text only, paragraph=True groups nearby lines globally
        results = reader.readtext(img_array, detail=0, paragraph=True)
        page_text = "\n".join(results)
        normalized = normalize_text(page_text)

        pages_output.append({
            "page_number": page_num + 1,
            "text": normalized
        })

    return _build_response(file_path, "ocr_preprocessed" if preprocess else "ocr", pages_output)


def _extract_from_image(file_path: str, preprocess: bool) -> dict:
    """Directly OCRs a standalone image file, optionally applying preprocessing."""
    reader = _get_ocr_reader()
    logger.info(f"Extracting text from image: {file_path}")

    pil_image = Image.open(file_path).convert("RGB")
    img_array = np.array(pil_image)
    
    if preprocess:
        img_array = preprocess_image_array(img_array)

    results = reader.readtext(img_array, detail=0, paragraph=True)
    page_text = "\n".join(results)
    normalized = normalize_text(page_text)

    pages_output = [{"page_number": 1, "text": normalized}]
    return _build_response(file_path, "image_ocr_preprocessed" if preprocess else "image_ocr", pages_output)


def _build_response(file_path: str, method: str, pages: list) -> dict:
    raw_text = "\n\n".join([p["text"] for p in pages])
    logger.info(f"Extraction complete. Method: {method} | Pages: {len(pages)} | Total chars: {len(raw_text)}")
    return {
        "file_path": file_path,
        "method": method,
        "pages": pages,
        "raw_text": raw_text
    }
