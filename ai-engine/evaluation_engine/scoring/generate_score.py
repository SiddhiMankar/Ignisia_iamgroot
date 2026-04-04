from evaluation_engine.scoring.llm_evaluator import evaluate_with_llm
from evaluation_engine.edge_cases.detect_edge_cases import detect_edge_cases
from utils.logger import get_logger

logger = get_logger(__name__)


def generate_score(answer_text: str, rubric: dict, student_answers: list, cluster_id: str) -> dict:
    """
    Generates the final scored cluster object by:
    1. Calling the LLM evaluator on the cluster representative
    2. Running edge-case detection
    3. Wrapping into the final MongoDB Cluster schema

    Returns the full cluster evaluation object.
    """
    logger.info(f"Scoring cluster '{cluster_id}' ({len(student_answers)} answers)...")

    llm_result = evaluate_with_llm(answer_text, rubric)
    flags = detect_edge_cases(answer_text, rubric, llm_result)

    return {
        "clusterId": cluster_id,
        "answers": [
            {"studentId": a.get("id", "unknown"), "rawText": a["text"], "cleanText": a["text"]}
            for a in student_answers
        ],
        "evaluation": {
            "suggestedScore": llm_result.get("score", 0),
            "confidence": llm_result.get("confidence", 0),
            "flags": flags,
            "explainability": llm_result.get("explanation", "")
        }
    }
