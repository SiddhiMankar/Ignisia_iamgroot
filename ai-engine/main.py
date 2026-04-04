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


# ── Cluster Results Endpoint ───────────────────────────────────────────────────
@app.get("/api/cluster/results", status_code=200)
def get_cluster_results(question_number: int = None):
    """
    Reads rubric embeddings from ChromaDB, clusters student answer embeddings
    (from MongoDB Submissions), reduces to 2D via PCA, and maps each node to
    one of 4 semantic cluster archetypes for the frontend scatter graph.

    Returns JSON in the same schema as mock_data/clustering_results.json.
    """
    import chromadb
    import numpy as np
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import normalize
    from fastapi import HTTPException

    try:
        # ── 1. Connect to ChromaDB ─────────────────────────────────────────────
        chroma_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")
        if not os.path.exists(chroma_dir):
            raise HTTPException(status_code=404, detail="ChromaDB not initialised. Upload a rubric first.")

        chroma_client = chromadb.PersistentClient(path=chroma_dir)

        try:
            collection = chroma_client.get_collection("rubrics")
        except Exception:
            raise HTTPException(status_code=404, detail="'rubrics' collection empty. Upload and parse a rubric first.")

        total = collection.count()
        if total == 0:
            raise HTTPException(status_code=404, detail="No rubric vectors in ChromaDB yet.")

        # ── 2. Fetch all rubric vectors ────────────────────────────────────────
        filter_where = {"question_number": question_number} if question_number is not None else None
        rubric_data = collection.get(
            limit=500,
            include=["embeddings", "metadatas", "documents"],
            where=filter_where if filter_where else None
        )

        rubric_embeddings = np.array(rubric_data["embeddings"])   # (n_rubric_pts, dim)
        rubric_metas = rubric_data["metadatas"]

        # Build a single rubric centroid for the master star node
        rubric_centroid = normalize(rubric_embeddings.mean(axis=0, keepdims=True))[0]

        # ── 3. Build mock student answers from Submission OCR text ────────────
        # In production these come from MongoDB Submissions.
        # For hackathon MVP we generate synthetic students based on rubric docs.
        # Each rubric point spawns several answer variants at different quality levels.
        from evaluation_engine.embeddings.generate_embeddings import generate_embeddings

        QUALITY_VARIANTS = [
            # (template_fn, cluster_arcetype, score_frac)
            (lambda t: t,                                               "c1", 1.0),   # Correct
            (lambda t: t.split(".")[0] if "." in t else t[:len(t)//2], "c2", 0.6),   # Partial
            (lambda t: "I think " + t[::-1][:60],                      "c3", 0.0),   # Conceptual error (reversed)
            (lambda t: f"array[{t[:20]}]->ptr",                         "c4", 0.0),   # Edge case (code-like)
        ]

        student_texts = []
        student_meta  = []
        student_idx   = 0

        for i, meta in enumerate(rubric_metas[:6]):   # cap at 6 rubric points
            base_text = rubric_data["documents"][i]
            q_num = meta.get("question_number", 1)
            if question_number is not None and q_num != question_number:
                continue
            for template_fn, archetype, score_frac in QUALITY_VARIANTS:
                try:
                    text = template_fn(base_text)
                except Exception:
                    text = base_text
                student_texts.append(text)
                student_meta.append({
                    "studentId": f"Student {100 + student_idx}",
                    "archetype": archetype,
                    "score_frac": score_frac,
                    "question_number": q_num,
                    "text": text[:200]
                })
                student_idx += 1

        if not student_texts:
            raise HTTPException(status_code=404, detail="No student data to cluster.")

        # ── 4. Generate student embeddings ─────────────────────────────────────
        student_embs = generate_embeddings(student_texts)          # (n_students, dim)
        student_embs_norm = normalize(student_embs)

        # ── 5. Compute cosine similarity to rubric centroid ────────────────────
        similarities = student_embs_norm @ rubric_centroid          # (n_students,)

        # ── 6. Run DBSCAN ──────────────────────────────────────────────────────
        clustering = DBSCAN(eps=0.35, min_samples=1, metric="cosine").fit(student_embs_norm)
        labels = clustering.labels_

        # ── 7. Map DBSCAN labels → 4 archetype clusters ───────────────────────
        # We assign archetype based on pre-tagged meta (quality variant)
        CLUSTER_COLORS = {
            "c1": "#22c55e",
            "c2": "#eab308",
            "c3": "#f97316",
            "c4": "#ef4444",
        }

        # ── 8. PCA → 2D positions ──────────────────────────────────────────────
        from sklearn.decomposition import PCA
        all_embs = np.vstack([rubric_centroid[np.newaxis, :], student_embs_norm])
        pca = PCA(n_components=2)
        coords_2d = pca.fit_transform(all_embs) * 300   # scale to ±300 domain

        master_x, master_y = float(coords_2d[0, 0]), float(coords_2d[0, 1])

        # ── 9. Build semantic nodes ────────────────────────────────────────────
        semantic_nodes = [{
            "id": "0",
            "studentId": "MASTER RUBRIC",
            "cluster": "master",
            "x": round(master_x, 2),
            "y": round(master_y, 2),
            "text": "✅ RUBRIC REFERENCE VECTOR: " + (rubric_data["documents"][0][:120] if rubric_data["documents"] else ""),
            "suggestedScore": 10,
            "confidence": 1.0,
            "keywordsFound": [m.get("type", "") for m in rubric_metas[:4]],
            "missingConcepts": [],
            "feedbackSummary": "Absolute Ground Truth reference vector from ChromaDB."
        }]

        for i, meta in enumerate(student_meta):
            coord_idx = i + 1   # offset because index 0 = master
            px, py = float(coords_2d[coord_idx, 0]), float(coords_2d[coord_idx, 1])
            sim = float(similarities[i])
            archetype = meta["archetype"]
            score_frac = meta["score_frac"]

            # Override archetype by similarity band regardless of synthetic tag
            if sim >= 0.85:
                archetype = "c1"
            elif sim >= 0.60:
                archetype = "c2"
            elif sim >= 0.30:
                archetype = "c3"
            else:
                archetype = "c4"

            label_map = {
                "c1": "Correct Explanation",
                "c2": "Partial Understanding",
                "c3": "Conceptual Error",
                "c4": "Edge Case",
            }
            archetype_labels = {
                "c1": ("AI grading: Strong alignment to rubric concepts.", [], []),
                "c2": ("AI grading: Partial understanding detected.", ["Some key concepts"], []),
                "c3": ("AI grading: Conceptual mismatch detected.", ["Core definition"], ["Correct concept association"]),
                "c4": ("AI grading: Unusual answer pattern — edge case.", [], ["Textual definition", "Core concept"]),
            }
            summary, kw_found, missing = archetype_labels[archetype]

            semantic_nodes.append({
                "id": str(i + 1),
                "studentId": meta["studentId"],
                "cluster": archetype,
                "x": round(px, 2),
                "y": round(py, 2),
                "text": meta["text"],
                "suggestedScore": round(score_frac * 10),
                "confidence": round(sim, 3),
                "keywordsFound": kw_found,
                "missingConcepts": missing,
                "feedbackSummary": summary,
            })

        clusters = [
            {"id": "c1", "name": "Correct Explanation",   "color": CLUSTER_COLORS["c1"]},
            {"id": "c2", "name": "Partial Understanding", "color": CLUSTER_COLORS["c2"]},
            {"id": "c3", "name": "Conceptual Error",      "color": CLUSTER_COLORS["c3"]},
            {"id": "c4", "name": "Edge Case",             "color": CLUSTER_COLORS["c4"]},
        ]

        # Extract unique question numbers from rubric metadata for tabs
        questions = sorted(set(
            m.get("question_number") for m in rubric_metas if m.get("question_number") is not None
        ))

        return {
            "source": "chromadb",
            "rubricTitle": rubric_metas[0].get("question_text", "Rubric") if rubric_metas else "Rubric",
            "questions": [{"id": f"Q{q}", "label": f"Q{q} — {next((m.get('question_text','') for m in rubric_metas if m.get('question_number') == q), '')}"} for q in questions],
            "semanticNodes": semantic_nodes,
            "clusters": clusters,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

