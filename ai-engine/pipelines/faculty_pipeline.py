from document_intelligence.extraction.extract_text import extract_document_text
from document_intelligence.extraction.detect_document_type import detect_document_type
from document_intelligence.faculty.parse_question_paper import parse_question_paper
from document_intelligence.faculty.parse_rubric import parse_rubric
from document_intelligence.faculty.parse_faculty_config import build_rule_builder_json
from utils.logger import get_logger

logger = get_logger(__name__)


def run_faculty_pipeline(file_path: str, session_title: str = "Imported Session") -> dict:
    """
    Faculty Configuration Flow — Full Pipeline.
    
    Given a faculty PDF (question paper or rubric), extracts text,
    parses it structurally, and returns a frontend-ready Rule Builder JSON.
    
    This output should be sent directly to the React EvaluationSessionBuilder form.
    
    Returns:
    {
      "sessionTitle": "...",
      "questions": [{ "questionId": "Q1", "questionPrompt": "...", "marks": 5, "rules": [...] }],
      "meta": { "method": "pdf_text", "doc_type": "question_paper", "page_count": 3 }
    }
    """
    logger.info(f"[FacultyPipeline] Starting for: {file_path}")

    # Stage 1: Extract
    extracted = extract_document_text(file_path)
    raw_text = extracted["raw_text"]

    # Stage 2: Classify
    doc_type_info = detect_document_type(raw_text)
    logger.info(f"[FacultyPipeline] Detected type: {doc_type_info['type']}")

    # Stage 3: Parse both QP and Rubric (document may contain both)
    parsed_qp = parse_question_paper(raw_text)
    parsed_rubric = parse_rubric(raw_text)

    # Stage 4: Build Rule Builder JSON
    rule_builder_json = build_rule_builder_json(parsed_qp, parsed_rubric, session_title)

    # Attach metadata for debugging / UI status display
    rule_builder_json["meta"] = {
        "method": extracted["method"],
        "doc_type": doc_type_info["type"],
        "page_count": len(extracted["pages"])
    }

    logger.info(f"[FacultyPipeline] Done. {len(rule_builder_json['questions'])} questions extracted.")
    return rule_builder_json
