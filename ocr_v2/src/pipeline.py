import os
from enum import Enum
from typing import Dict, Any

from preprocessing.stabilize import stabilize_document
import json
import extraction.ocr_engine as ocr_engine
import extraction.teacher_parser as teacher_parser
import extraction.student_parser as student_parser

class DocumentType(Enum):
    QUESTION_PAPER = "question_paper"
    RUBRIC = "rubric"
    MARKING_SCHEME = "marking_scheme"
    MODEL_ANSWER = "model_answer"
    ANSWER_SHEET = "answer_sheet"

def process_document(file_path: str, tags: Dict[str, Any]):
    """
    Entrypoint for OCR processing.
    Forces manual document categorization to bypass AI classifications.
    
    Args:
        file_path: Path to the uploaded document.
        tags: Dictionary containing at least a 'document_type' key.
    """
    if "document_type" not in tags:
        raise ValueError("Missing 'document_type' in tags. Phase 0 requires explicit document tagging.")
        
    try:
        # Validate that the provided type is one of the supported models
        doc_type = DocumentType(tags["document_type"])
    except ValueError:
        valid_types = [e.value for e in DocumentType]
        raise ValueError(f"Invalid 'document_type': {tags['document_type']}. Must be one of {valid_types}.")

    print(f"[INFO] Initializing OCR pipeline for: {file_path}")
    print(f"[INFO] Document manually tagged as: {doc_type.value}")

    # Establish debug directory parallel to src
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    debug_dir = os.path.join(base_dir, "debug")

    # Phase 1: Stabilize inputs and generate debug output images
    print("[INFO] Starting Phase 1: Shared Input Stabilization...")
    preprocessed_pages = stabilize_document(file_path, debug_dir=debug_dir)
    print(f"[INFO] Stabilized {len(preprocessed_pages)} pages. Debug artifacts saved to: {debug_dir}")
    # Phase 2: Dual OCR Routing
    print("[INFO] Starting Phase 2: OCR Extraction...")
    final_output = []
    
    # Determine Teacher vs Student Lane
    is_student_lane = doc_type == DocumentType.ANSWER_SHEET
    
    for idx, page_img in enumerate(preprocessed_pages):
        print(f"[INFO] Running OCR for Page {idx+1}/{len(preprocessed_pages)}...")
        if is_student_lane:
            page_data = ocr_engine.run_student_ocr(page_img)
            # Apply Structured Pass Phase 2B
            structured_data = student_parser.structure_student_document(page_data["line_texts"])
        else:
            page_data = ocr_engine.run_teacher_ocr(page_img)
            # Apply Structured Pass Phase 2A
            structured_data = teacher_parser.structure_teacher_document(page_data["line_texts"])
            
        merged_output = {**page_data, **structured_data}
        final_output.append(merged_output)
        
    print("[INFO] OCR Processing Complete!")
    return final_output

if __name__ == "__main__":
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="OCR Pipeline Entrypoint (Phase 0, 1, 2)")
    parser.add_argument("--file", required=True, help="Path to input PDF or Image")
    parser.add_argument("--type", required=True, help="Document Type: question_paper, rubric, marking_scheme, model_answer, answer_sheet")
    parser.add_argument("--out", required=False, help="Path to save structured output JSON")
    args = parser.parse_args()
    
    results = process_document(args.file, tags={"document_type": args.type})
    
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"[INFO] Successfully exported results to {args.out}")
    else:
        # Just print summary of the first page
        if results:
            print(json.dumps(results[0], indent=2, ensure_ascii=False))
