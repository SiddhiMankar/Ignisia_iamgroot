from document_intelligence.student.parse_answer_sheet import parse_answer_sheet
from document_intelligence.student.align_question_answer import align_evaluation_data
from utils.logger import get_logger
from preprocessing.stabilize import stabilize_document
from extraction.ocr_engine import run_student_ocr
from extraction.student_parser import structure_student_document
import os

logger = get_logger(__name__)


def run_student_pipeline(
    file_path: str,
    student_id: str,
    parsed_rubric: dict,
    parsed_qa_paper: dict,
    document_type: str = "answer_sheet"
) -> dict:
    """
    Student Evaluation Flow — Full Pipeline.
    
    Given a scanned student answer sheet, extracts OCR text,
    parses answers question-wise, and aligns them with the faculty rubric/QP.
    
    The output is evaluation-ready and should be passed to the evaluation engine.
    
    Returns:
    {
      "student_id": "S001",
      "evaluation_items": [
        {
          "question_number": "Q1",
          "question_text": "Explain photosynthesis.",
          "rubric": { "max_marks": 5, "keywords": [...] },
          "student_answer": "Photosynthesis is..."
        }
      ],
      "meta": { "method": "ocr", "page_count": 4 }
    }
    """
    logger.info(f"[StudentPipeline] Processing: {file_path} for student: {student_id}")

    # Stage 1: OCR v2 Extraction
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    debug_dir = os.path.join(base_dir, "ocr_v2", "debug")
    
    preprocessed_pages = stabilize_document(file_path, debug_dir=debug_dir)
    
    all_page_results = []
    for page_img in preprocessed_pages:
        page_data = run_student_ocr(page_img)
        all_page_results.append(page_data)
        
    # Aggregate text for legacy aligner (for now)
    # In full ocr_v2 integration, we'd use the structured answer blocks
    all_lines = []
    for p in all_page_results:
        all_lines.extend(p["line_texts"])
    
    raw_text = "\n".join(all_lines)

    # Stage 2: Parse answers question-wise (Phase 2B Finalization)
    structured = structure_student_document(all_lines)
    # Map structured format back to what align_evaluation_data expects if needed,
    # or just use raw_text if parse_answer_sheet still works.
    # For MVP, let's use the new structured answer blocks.
    
    # Simple mapping: convert student_answers to the format parse_answer_sheet would return
    parsed_answers = {
        "student_id": student_id,
        "answers": []
    }
    for ans in structured.get("student_answers", []):
        parsed_answers["answers"].append({
            "questionNumber": f"Q{ans['question_number']}" if ans['question_number'] else "Unknown",
            "extractedText": ans["answer_text"]
        })

    # Stage 3: Align with question paper and rubric
    aligned = align_evaluation_data(parsed_rubric, parsed_qa_paper, parsed_answers)

    # Attach metadata
    aligned["meta"] = {
        "method": "ocr_v2",
        "page_count": len(preprocessed_pages)
    }

    logger.info(f"[StudentPipeline] Done. {len(aligned['evaluation_items'])} items aligned.")
    return aligned
