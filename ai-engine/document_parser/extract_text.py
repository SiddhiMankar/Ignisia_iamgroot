import os
import fitz  # PyMuPDF
from pdf2image import convert_from_path
import easyocr
import numpy as np

# Initialize EasyOCR once globally to prevent model reloading latency
# Supports English and Hindi. gpu=True will heavily accelerate it if available.
reader = easyocr.Reader(['en', 'hi'], gpu=False)

def extract_document_text(file_path: str) -> dict:
    """
    Intelligent extraction pipeline parsing academic PDFs.
    Prioritizes raw string extraction, falling back to EasyOCR.
    """
    if not os.path.exists(file_path):
         raise FileNotFoundError(f"Cannot find document at {file_path}")

    # Step 1: Attempt native PyMuPDF Text Extraction
    doc = fitz.open(file_path)
    total_chars = 0
    pages_output = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        total_chars += len(text.strip())
        pages_output.append({
            "page_number": page_num + 1,
            "text": text.strip()
        })
        
    # Heuristic: If across all pages we found extremely little text, it's a scan.
    is_scan = (total_chars / len(doc)) < 50

    if not is_scan:
        return _build_response(file_path, "pdf_text", pages_output)
    
    # Step 2: Fallback to Vision/OCR for Scanned documents
    return _run_ocr_fallback(file_path)

def _run_ocr_fallback(file_path: str) -> dict:
    """Uses pdf2image and EasyOCR to parse handwritten scanned imagery"""
    print(f"[OCR] Converting {file_path} to images...")
    
    # Note: Requires poppler-utils installed on system
    images = convert_from_path(file_path, dpi=300)
    
    pages_output = []
    
    for idx, image in enumerate(images):
        print(f"[OCR] Scanning Page {idx+1} mathematically...")
        # EasyOCR requires numpy array format
        img_np = np.array(image)
        
        # 'detail=0' returns a simple list of text strings found
        # paragraph=True attempts to group lines into logical blocks
        results = reader.readtext(img_np, detail=0, paragraph=True)
        
        page_text = "\n".join(results)
        pages_output.append({
            "page_number": idx + 1,
            "text": page_text
        })
        
    return _build_response(file_path, "ocr", pages_output)

def _build_response(file_path: str, method: str, pages: list) -> dict:
    """Standardizes the final JSON representation as requested"""
    full_text = "\n\n".join([p["text"] for p in pages])
    return {
        "file_path": file_path,
        "method": method,
        "pages": pages,
        "raw_text": full_text
    }
