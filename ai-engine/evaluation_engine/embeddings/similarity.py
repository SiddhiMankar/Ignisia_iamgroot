"""
evaluation_engine/embeddings/similarity.py
-------------------------------------------
Mathematical helpers to compute similarity scores between embeddings.
"""

import numpy as np

def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Computes the cosine similarity between two 1D numeric arrays.
    Returns a float between -1.0 (opposite) and 1.0 (identical).
    For most text semantic use-cases, scores range from 0.0 to 1.0.
    """
    # Defensive check against ZeroDivisionError for zero-vectors
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    return float(np.dot(vec1, vec2) / (norm1 * norm2))

def is_semantic_match(vec1: np.ndarray, vec2: np.ndarray, threshold: float = 0.85) -> bool:
    """Returns True if the cosine similarity meets or exceeds the threshold."""
    return cosine_similarity(vec1, vec2) >= threshold
