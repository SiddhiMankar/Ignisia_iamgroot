"""
evaluation_engine/embeddings/embed_text.py
-------------------------------------------
Converts text strings into fixed-length numeric vectors (embeddings).
Uses the sentence-transformers library.
"""

from typing import List, Union
import numpy as np
from utils.logger import get_logger

logger = get_logger(__name__)

# Global model instance so it only loads into memory once
_embedder = None

def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
            # all-MiniLM-L6-v2 is an excellent, fast MVP model for semantic similarity
            _embedder = SentenceTransformer('all-MiniLM-L6-v2')
        except ImportError:
            logger.warning("sentence-transformers not installed! Falling back to mock embeddings.")
            _embedder = "MOCK"
    return _embedder

def embed_text(text: Union[str, List[str]]) -> np.ndarray:
    """
    Computes text embeddings.
    
    Args:
        text: A single string or list of strings.
        
    Returns:
        A NumPy array of shape (embedding_dim,) for strings
        or (N, embedding_dim) for lists.
    """
    if not text:
        return np.zeros(384) # fallback for empty strings 
        
    model = _get_embedder()
    
    if model == "MOCK":
        # Return a dummy vector if the library isn't installed
        if isinstance(text, str):
            return np.random.rand(384)
        return np.random.rand(len(text), 384)
        
    # Model encode handles caching and batching automatically
    embeddings = model.encode(text, convert_to_numpy=True)
    return embeddings
