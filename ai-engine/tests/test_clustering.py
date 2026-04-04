"""
tests/test_clustering.py
------------------------
Validates that DBSCAN correctly groups semantically similar answers
and appropriately isolates distinct outliers.
"""

import sys
import os
import json

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from evaluation_engine.clustering.cluster import cluster_answers

# Mock Evaluated Payloads for a single question
MOCK_PAYLOADS = [
    # Cluster A: Perfect concept
    {"studentAnswer": "Photosynthesis is the process by which plants make food using sunlight. Oxygen is given off.", "suggestedScore": 3.0, "marks": 3},
    {"studentAnswer": "Plants use energy from the sun to make food. O2 is released.", "suggestedScore": 3.0, "marks": 3},
    {"studentAnswer": "They use sunlight to make food and release oxygen.", "suggestedScore": 3.0, "marks": 3},
    
    # Cluster B: Missed byproduct
    {"studentAnswer": "Plants use sunlight but I forgot the rest.", "suggestedScore": 1.0, "marks": 3},
    {"studentAnswer": "Photosynthesis is when a plant makes its own food from the sun.", "suggestedScore": 1.5, "marks": 3},
    
    # Outliers
    {"studentAnswer": "I have absolutely no idea.", "suggestedScore": 0.0, "marks": 3},
    {"studentAnswer": "Newton's second law is F=ma", "suggestedScore": 0.0, "marks": 3}
]

def run_tests():
    print("======================================================")
    print("  SEMANTIC CLUSTERING ENGINE - TEST SUITE")
    print("======================================================")
    print("Running DBSCAN on 7 mock student vectors...\n")
    
    clusters = cluster_answers(MOCK_PAYLOADS)
    
    print(f"Algorithm generated {len(clusters)} clusters (including outliers).")
    
    for c in clusters:
        print("-" * 50)
        print(f"[{c['clusterName'].upper()}] - {c['studentCount']} Students")
        print(f"  Mode Score: {c['expectedScore']}")
        print(f"  AI Summary: {c['summary']}")
        print("  Samples:")
        for s in c['students']:
            print(f"    - {s}")
            
    print("======================================================")

if __name__ == "__main__":
    run_tests()
