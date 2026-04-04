from pipelines.student_pipeline import run_student_pipeline
from evaluation_engine.clustering.cluster_answers import cluster_answers
from evaluation_engine.scoring.generate_score import generate_score
from utils.logger import get_logger
import requests
import os

logger = get_logger(__name__)


def run_full_evaluation_pipeline(
    session_id: str,
    file_path: str,
    rubric: dict,
    qa_paper: dict,
    student_id: str = "STUDENT_001",
    document_type: str = "answer_sheet"
) -> dict:
    """
    The central master orchestrator for the entire AI grading workflow.
    
    This is called by FastAPI (main.py) after Node.js triggers the evaluation.
    
    Steps:
    1. Extract and align student answers (Student Pipeline)
    2. Cluster all aligned answers semantically (DBSCAN)
    3. Score each cluster representative via LLM (Gemini)
    4. Package results and optionally fire webhook callback to Node.js
    
    Returns webhook payload in MongoDB-ready Cluster format.
    """
    logger.info(f"[FullPipeline] START — sessionId={session_id}")

    # Stage 1: Student document intelligence
    aligned = run_student_pipeline(file_path, student_id, rubric, qa_paper, document_type)

    results_by_question = {}

    # Stage 2+3: Per question — cluster → score
    for item in aligned.get("evaluation_items", []):
        q_num = item["question_number"]
        q_rubric = item["rubric"]
        answer_text = item["student_answer"]

        # Build batch list (MVP: single student, multiple calls later)
        raw_batch = [{"id": student_id, "text": answer_text}]

        # Cluster
        vector_clusters = cluster_answers(raw_batch)

        # Score per cluster
        final_clusters = []
        for c_id, grouped_answers in vector_clusters.items():
            representative = grouped_answers[0]["text"]
            cluster_result = generate_score(representative, q_rubric, grouped_answers, c_id)
            final_clusters.append(cluster_result)

        results_by_question[q_num] = {"clusters": final_clusters}

    # Build final webhook payload
    payload = {
        "sessionId": session_id,
        "status": "SUCCESS",
        "results": results_by_question
    }

    # Fire callback to Node.js if configured
    callback_url = os.getenv("NODE_BACKEND_URL", "")
    if callback_url:
        try:
            requests.post(callback_url, json=payload, timeout=10)
            logger.info(f"[FullPipeline] Callback fired to: {callback_url}")
        except Exception as e:
            logger.error(f"[FullPipeline] Callback failed: {e}")
    else:
        logger.warning("[FullPipeline] NODE_BACKEND_URL not set. Skipping callback.")

    logger.info(f"[FullPipeline] DONE — sessionId={session_id}")
    return payload
