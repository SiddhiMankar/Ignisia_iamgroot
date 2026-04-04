import sys
import os
from dotenv import load_dotenv

# Load ai-engine/.env globally for all AI components
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Ensure ocr_v2 is accessible BEFORE importing local modules
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ocr_v2", "src"))

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any
from pipelines.full_evaluation_pipeline import run_full_evaluation_pipeline

app = FastAPI(
    title="AI Grading Engine",
    description="Rubric-driven answer clustering and grading acceleration engine",
    version="2.0.0"
)


class EvaluationRequest(BaseModel):
    examId: str
    filePath: str
    rubric: Dict[str, Any]
    documentType: str = "answer_sheet"


def _background_task(request: EvaluationRequest):
    """Runs the full ML pipeline asynchronously."""
    run_full_evaluation_pipeline(
        session_id=request.examId,
        file_path=request.filePath,
        rubric=request.rubric,
        qa_paper={},  # In production, pass parsed QP from DB
        document_type=request.documentType
    )


@app.get("/")
def health_check():
    return {"status": "ok", "engine": "AI Grading Engine v2.0"}


@app.post("/api/evaluate", status_code=202)
def trigger_evaluation(request: EvaluationRequest, background_tasks: BackgroundTasks):
    """
    Accepts an evaluation request and immediately returns 202.
    The heavy ML work (OCR → Cluster → LLM → Callback) runs in the background.
    """
    background_tasks.add_task(_background_task, request)
    return {"status": "Queued", "sessionId": request.examId}


class FacultyParseRequest(BaseModel):
    filePath: str
    documentType: str = "rubric"
    sessionTitle: str = "Imported Session"


@app.post("/api/faculty/parse", status_code=200)
def parse_faculty_document(request: FacultyParseRequest):
    """
    Faculty Configuration Flow.
    Parses an uploaded faculty PDF and returns Rule Builder JSON for the React form.
    """
    import traceback
    from extraction.teacher_parser import structure_teacher_document
    from preprocessing.stabilize import stabilize_document
    from extraction.ocr_engine import run_teacher_ocr

    file_path = request.filePath
    doc_type = request.documentType

    print(f"[FacultyParse] Received request for: {file_path}, type: {doc_type}")

    if not os.path.exists(file_path):
        print(f"[FacultyParse] ERROR: File not found at path: {file_path}")
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    try:
        # Phase 1: Stabilize
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        debug_dir = os.path.join(base_dir, "ocr_v2", "debug")
        preprocessed_pages = stabilize_document(file_path, debug_dir=debug_dir)
        print(f"[FacultyParse] Preprocessed {len(preprocessed_pages)} pages")

        # Phase 2: OCR each page
        all_lines = []
        for i, page_img in enumerate(preprocessed_pages):
            print(f"[FacultyParse] Running OCR on page {i+1}/{len(preprocessed_pages)}")
            page_data = run_teacher_ocr(page_img)
            all_lines.extend(page_data.get("line_texts", []))

        print(f"[FacultyParse] Total lines extracted: {len(all_lines)}")
        print("[FacultyParse] === RAW OCR LINES ===")
        for i, l in enumerate(all_lines):
            print(f"  [{i:02d}] {repr(l)}")
        print("[FacultyParse] ===================")

        # Phase 2: Structure
        structured = structure_teacher_document(all_lines)

        print(f"[FacultyParse] Structured {len(structured.get('questions', []))} questions successfully")

        # Map to frontend Rule Builder format
        questions = []
        for q in structured.get("questions", []):
            rules = []
            for rp in q.get("rubric_points", []):
                rules.append({
                    "type": rp.get("type", "concept_point"),
                    "description": rp.get("point", ""),
                    "weight": rp.get("marks", 1),
                    "keywords": rp.get("keywords", []),
                    "alternate_phrases": rp.get("alternate_phrases", []),
                    "concept_meaning": rp.get("concept_meaning", "")
                })
            
            # Extract a clean numeric ID for the frontend tag
            q_id = q.get("question_number")
            question_id_str = f"Q{q_id}" if q_id else "Q?"

            questions.append({
                "questionId": question_id_str,
                "questionPrompt": q.get("question_text", ""),
                "questionType": q.get("question_type", "short_concept"),
                "marks": q.get("max_marks"),
                "rules": rules,
                # Store full structured data blob for database persistence
                "structured": q
            })

        return {
            "sessionTitle": request.sessionTitle,
            "questions": questions,
            "meta": {
                "method": "ocr_v2",
                "doc_type": doc_type,
                "page_count": len(preprocessed_pages)
            }
        }

    except Exception as e:
        print(f"[FacultyParse] EXCEPTION: {e}")
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

class EmbedRequest(BaseModel):
    rubricDocumentId: str

@app.post("/api/faculty/embed", status_code=202)
def trigger_rubric_embedding(request: EmbedRequest, background_tasks: BackgroundTasks):
    """
    Called by Node.js after saving a Rubric JSON to MongoDB.
    Triggers the generation of Gemini vectors and persists them to ChromaDB.
    """
    from pipelines.embedding_pipeline import embed_and_store_rubric
    from dotenv import load_dotenv
    import os
    
    # Load env from backend folder safely
    backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env')
    load_dotenv(backend_env)
    
    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not mongo_uri:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="MONGO_URI not found in environment.")

    background_tasks.add_task(embed_and_store_rubric, request.rubricDocumentId, mongo_uri)
    return {"status": "Embedding queued", "rubricDocumentId": request.rubricDocumentId}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
