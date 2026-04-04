"""
tests/test_embedding_match.py
-----------------------------
Local test suite simulating the full Part B Semantic Matching Engine pipeline.
"""

import sys
import os
import json

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from evaluation_engine.embeddings.semantic_matcher import evaluate_rules_against_answer
from evaluation_engine.scoring.score_answer import calculate_score
from evaluation_engine.explainability.explain_match import generate_explanation

# ── 1. MOCK RUBRIC DATA ──────────────────────────────────────────

Q1_RUBRIC = [
    {"type": "Concept Match", "description": "Plants use sunlight to make food", "weight": 2},
    {"type": "Concept Match", "description": "Releases oxygen", "weight": 1}
]
Q1_MARKS = 3

Q2_RUBRIC = [
    {"type": "Formula Match", "description": "F = ma", "weight": 2},
    {"type": "Concept Match", "description": "Newton's Second Law", "weight": 1}
]
Q2_MARKS = 3

# ── 2. MOCK ALIGNED ANSWERS ──────────────────────────────────────

ALIGNED_PAYLOADS = [
    {
        "questionId": "Q1",
        "studentAnswer": "Plants prepare their own food using light from the sun. Oxygen is given off as a byproduct.",
        "answerStatus": "answered",
        "marks": Q1_MARKS,
        "rubric": {"rules": Q1_RUBRIC}
    },
    {
        "questionId": "Q1",
        "studentAnswer": "Plants use sunlight but I forgot the rest.",
        "answerStatus": "answered",
        "marks": Q1_MARKS,
        "rubric": {"rules": Q1_RUBRIC}
    },
    {
        "questionId": "Q2",
        "studentAnswer": "F=m*a because of the second law of newton.",
        "answerStatus": "answered",
        "marks": Q2_MARKS,
        "rubric": {"rules": Q2_RUBRIC}
    },
    {
        "questionId": "Q2",
        "studentAnswer": "It is related to gravity holding things down.",
        "answerStatus": "answered",
        "marks": Q2_MARKS,
        "rubric": {"rules": Q2_RUBRIC}
    }
]

def run_pipeline():
    print("======================================================")
    print("  SEMANTIC MATCHING ENGINE - TEST SUITE")
    print("======================================================")
    print("Initializing embedding models... (this takes a moment)\n")
    
    for i, payload in enumerate(ALIGNED_PAYLOADS, 1):
        print(f"[TEST {i}] QID: {payload['questionId']}")
        print(f"  Student:  \"{payload['studentAnswer']}\"")
        
        # 1. Semantic Matcher
        rules = payload['rubric']['rules']
        payload["ruleEvaluations"] = evaluate_rules_against_answer(payload['studentAnswer'], rules)
        
        # Print Rule Match Debug
        print("  [Matches]:")
        for r in payload["ruleEvaluations"]:
            status = "MATCH" if r['matched'] else ("PARTIAL" if r['partial'] else "FAIL")
            print(f"    - {status:<7} (Sim: {r['similarity']:.2f}) -> {r['rule']}")
        
        # 2. Scorer
        scored_payload = calculate_score(payload)
        flags = ", ".join(scored_payload["flags"]) if scored_payload["flags"] else "NONE"
        print(f"  [Scorer]:  {scored_payload['suggestedScore']} / {scored_payload['marks']}  |  Flags: [{flags}]")
        
        # 3. LLM Explainer
        final_payload = generate_explanation(scored_payload)
        print(f"  [Explain]: {final_payload['explainability']}")
        print("-" * 65)

if __name__ == "__main__":
    run_pipeline()
