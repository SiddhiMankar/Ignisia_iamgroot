from sentence_transformers import SentenceTransformer
from utils.logger import get_logger
import numpy as np

logger = get_logger(__name__)

_model = None

def _get_model(model_name: str = 'all-MiniLM-L6-v2'):
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {model_name}...")
        _model = SentenceTransformer(model_name)
    return _model


def generate_embeddings(texts: list[str]) -> np.ndarray:
    """
    Converts a list of student answer strings into semantic vectors.
    
    Args:
        texts: list of clean answer strings
    Returns:
        numpy array of shape (n_texts, embedding_dim)
    """
    model = _get_model()
    logger.info(f"Generating embeddings for {len(texts)} answers...")
    embeddings = model.encode(texts)
    logger.info(f"Embeddings generated. Shape: {embeddings.shape}")
    return embeddings
