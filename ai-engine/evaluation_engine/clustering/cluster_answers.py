from sklearn.cluster import DBSCAN
from evaluation_engine.embeddings.generate_embeddings import generate_embeddings
from utils.logger import get_logger

logger = get_logger(__name__)


def cluster_answers(student_answers: list, eps: float = 0.4, min_samples: int = 1) -> dict:
    """
    Groups student answers into semantic clusters using DBSCAN.
    
    Args:
        student_answers: [{"id": "sub_1", "text": "Gravity pulls mass..."}, ...]
        eps: DBSCAN max cosine distance threshold (0.4 works well for sentence-transformers)
        min_samples: minimum answers to form a cluster
    
    Returns:
        { "cluster_0": [answer_dicts], "cluster_outlier_0": [answer_dicts] }
    """
    if not student_answers:
        logger.warning("No answers provided for clustering.")
        return {}

    texts = [a["text"] for a in student_answers]
    embeddings = generate_embeddings(texts)

    logger.info(f"Running DBSCAN clustering on {len(texts)} answers...")
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine').fit(embeddings)

    clusters = {}
    for idx, label in enumerate(clustering.labels_):
        cluster_name = f"cluster_outlier_{idx}" if label == -1 else f"cluster_{label}"
        clusters.setdefault(cluster_name, []).append(student_answers[idx])

    logger.info(f"Formed {len(clusters)} clusters from {len(student_answers)} answers")
    return clusters
