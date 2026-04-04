"""
evaluation_engine/clustering/cluster.py
---------------------------------------
Groups evaluated student answers using DBSCAN based on semantic embeddings.
"""

from typing import List, Dict
import numpy as np
from sklearn.cluster import DBSCAN
import google.generativeai as genai
import os
from collections import defaultdict
from collections import Counter

from utils.logger import get_logger
from evaluation_engine.embeddings.embed_text import embed_text

logger = get_logger(__name__)

# DBSCAN settings
# eps = distance threshold for points to be considered neighbors
# Metric is 'cosine'. Distance = 1 - cosine_similarity.
# An EPS of 0.25 means strings with a semantic similarity >= 0.75 will group together.
EPS_THRESHOLD = 0.25
MIN_SAMPLES = 2

def _generate_llm_summary(samples: List[str]) -> Dict:
    """Uses LLM to name the cluster and explain what the students had in common."""
    fallback = {
        "clusterName": "Generic Cluster",
        "summary": "Standard system fallback: Auto-generated cluster due to high semantic overlap."
    }

    key = os.getenv("GEMINI_API_KEY", "")
    if not key or key == "your_gemini_api_key_here":
        return fallback

    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = "You are analyzing a group of student answers that are semantically identical or very similar. Return a strict JSON response with two keys: 'clusterName' (a 2-3 word title of the mistake or concept) and 'summary' (a 1-sentence description of what these answers have in common).\n\nAnswers:\n"
        for idx, s in enumerate(samples[:5]):  # limit to top 5 to save tokens
            prompt += f"{idx+1}. {s}\n"

        response = model.generate_content(
            prompt, 
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        import json
        output = json.loads(response.text)
        return output
    except Exception as e:
        logger.error(f"Cluster LLM error: {e}")
        return fallback

def cluster_answers(evaluated_payloads: List[Dict]) -> List[Dict]:
    """
    Takes a list of evaluated payloads FOR A SPECIFIC QUESTION.
    Groups them using DBSCAN.
    Returns the array of ClusterSummary objects for the frontend.
    """
    if not evaluated_payloads:
        return []

    # 1. Embed all answers
    texts = [p.get("studentAnswer", "NO_ANSWER_PROVIDED") for p in evaluated_payloads]
    embeddings = embed_text(texts)

    # 2. Run DBSCAN using Cosine distance
    clustering = DBSCAN(eps=EPS_THRESHOLD, min_samples=MIN_SAMPLES, metric='cosine').fit(embeddings)
    
    labels = clustering.labels_  # -1 means outlier/noise

    # 3. Group the payloads by label
    grouped = defaultdict(list)
    for idx, label in enumerate(labels):
        grouped[label].append(evaluated_payloads[idx])

    final_clusters = []
    outliers = []

    # 4. Process each cluster
    for label, payloads in grouped.items():
        
        # Collect raw answers and suggested scores
        answers = [p.get("studentAnswer", "NO_ANSWER_PROVIDED") for p in payloads]
        scores = [p.get("suggestedScore", 0) for p in payloads]
        
        # Calculate the mathematical mode of the scores in this cluster
        mode_score = Counter(scores).most_common(1)[0][0]
        max_marks = payloads[0].get("marks", 0)
        expected_score_str = f"{mode_score}/{max_marks}"

        # If it's the DBSCAN noise group
        if label == -1:
            outliers = {
                "clusterName": "Outliers / Manual Review",
                "studentCount": len(payloads),
                "expectedScore": "Mixed",
                "summary": "Answers that did not mathematically group with other cohorts. Review manually.",
                "students": answers
            }
            continue
            
        # Get LLM Summary for standard clusters
        llm_meta = _generate_llm_summary(answers)

        final_clusters.append({
            "clusterName": llm_meta.get("clusterName", f"Cluster {label+1}"),
            "studentCount": len(payloads),
            "expectedScore": expected_score_str,
            "summary": llm_meta.get("summary", "Grouped student answers."),
            "students": answers
        })

    # Sort final clusters by size (largest first)
    final_clusters.sort(key=lambda x: x["studentCount"], reverse=True)

    # Always put outliers at the very bottom
    if outliers:
        final_clusters.append(outliers)

    return final_clusters
