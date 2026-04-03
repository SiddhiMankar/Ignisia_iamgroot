from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
import numpy as np

class SemesterClusteringEngine:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """
        Loads the embedding model used to map student answers into vector space.
        'all-MiniLM-L6-v2' is incredibly fast, small, and accurate enough for high-level semantic matching.
        """
        print(f"[SemanticEngine] Loading {model_name}...")
        self.model = SentenceTransformer(model_name)
    
    def group_similar_answers(self, student_answers: list, eps: float = 0.4, min_samples: int = 1) -> dict:
        """
        Takes a list of student answers, converts them to embeddings, 
        and clusters them into logical groups using DBSCAN.
        
        Args:
            student_answers (list): List of dictionaries: [{'id': 'sub_1', 'text': 'Gravity pulls mass'}, ...]
            eps (float): Maximum distance between two vectors to be considered in the same cluster. 
                         (0.4 is a good starting threshold for sentence-transformers).
            min_samples (int): Minimum answers required to form a cluster (1 means unique answers get their own cluster).
                     
        Returns:
            dict: Grouped clusters mapping cluster_id to a list of answers.
        """
        if not student_answers:
            return {}

        # 1. Extract raw texts for embedding
        texts = [ans['text'] for ans in student_answers]
        
        # 2. Generate high-dimensional vector embeddings
        print(f"[SemanticEngine] Generating vectors for {len(texts)} answers...")
        embeddings = self.model.encode(texts)
        
        # 3. Perform DBSCAN Clustering (groups closely matched vectors natively without needing 'K')
        clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine').fit(embeddings)
        
        # 4. Map the labels back to the original dictionary
        clusters_output = {}
        
        for idx, label in enumerate(clustering.labels_):
            # DBSCAN assigns -1 for absolute outliers. We can just give them unique cluster IDs.
            cluster_name = f"cluster_outlier_{idx}" if label == -1 else f"cluster_{label}"
            
            if cluster_name not in clusters_output:
                clusters_output[cluster_name] = []
                
            clusters_output[cluster_name].append(student_answers[idx])
            
        print(f"[SemanticEngine] Successfully formed {len(clusters_output)} semantic clusters.")
        return clusters_output

# Instantiate a global instance to avoid reloading the heavyweight model per request
# clustering_engine = SemesterClusteringEngine() 
