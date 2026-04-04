"""
evaluation_engine/embeddings/semantic_matcher.py
------------------------------------------------
The Semantic Engine.
Compares a student's answer text against the rubric's Rule structures
to generate rule-level matches.
"""

from typing import List, Dict
import re
from utils.logger import get_logger
from evaluation_engine.embeddings.embed_text import embed_text
from evaluation_engine.embeddings.similarity import cosine_similarity

logger = get_logger(__name__)

# Heuristic thresholds for semantic match
THRESHOLD_EXCELLENT = 0.82
THRESHOLD_PARTIAL = 0.60

def _normalize_math(text: str) -> str:
    """Strips all whitespace and common multiplication symbols for robust math operator comparisons."""
    text = re.sub(r'\s+', '', text).lower()
    text = re.sub(r'[\*x×]', '', text)
    return text

def evaluate_rules_against_answer(student_answer: str, rules: List[Dict]) -> List[Dict]:
    """
    Evaluates a single student answer against a list of rubric rules.
    
    Returns a list of Match Result objects:
    [
      {
        "rule": "Uses sunlight",
        "weight": 1,
        "type": "Concept Match",
        "matched": True,
        "partial": False,
        "similarity": 0.89
      }, ...
    ]
    """
    results = []
    
    # Pre-embed the student answer so we only do it once
    # Handles empty answer gracefully (embed_text returns 0-vector)
    ans_embedding = embed_text(student_answer) if student_answer else None
    
    norm_ans = _normalize_math(student_answer)

    for rule in rules:
        r_desc = rule.get("description", "")
        r_type = rule.get("type", "Concept Match")
        r_weight = rule.get("weight", 1)
        
        match_payload = {
            "rule": r_desc,
            "weight": r_weight,
            "type": r_type,
            "matched": False,
            "partial": False,
            "similarity": 0.0
        }
        
        # If student answer is completely missing/blank, everything fails
        if not student_answer or student_answer == "NO_ANSWER_PROVIDED":
            results.append(match_payload)
            continue
            
        # ── ROUTING BY RULE TYPE ──
        
        # 1. Exact/Math Types (Formula, Final Answer)
        if r_type in ["Formula Match", "Final Answer Match", "Exact Match"]:
            # Strict string inclusion (ignoring spaces) is safest for math
            if _normalize_math(r_desc) in norm_ans:
                match_payload["matched"] = True
                match_payload["similarity"] = 1.0
            else:
                # Math often fails vector similarity, but we can do a fallback check
                # just in case it's a worded math answer like "one hundred and fifty"
                rule_emb = embed_text(r_desc)
                sim = cosine_similarity(ans_embedding, rule_emb)
                match_payload["similarity"] = round(sim, 3)
                if sim >= THRESHOLD_EXCELLENT:
                    match_payload["matched"] = True
                    
        # 2. Semantic Types (Concepts, Steps, Keywords)
        else:
            rule_emb = embed_text(r_desc)
            sim = cosine_similarity(ans_embedding, rule_emb)
            match_payload["similarity"] = round(sim, 3)
            
            if sim >= THRESHOLD_EXCELLENT:
                match_payload["matched"] = True
            elif sim >= THRESHOLD_PARTIAL:
                # Hits the partial credit window (e.g., student said "uses light" instead of "uses sunlight")
                match_payload["matched"] = False
                match_payload["partial"] = True
                
        results.append(match_payload)
        
    return results

def batch_evaluate_student(aligned_payloads: List[Dict]) -> List[Dict]:
    """
    Takes the output of align_answers() and evaluates every question.
    """
    for q_payload in aligned_payloads:
        student_ans = q_payload.get("studentAnswer", "")
        rules = q_payload.get("rubric", {}).get("rules", [])
        
        matches = evaluate_rules_against_answer(student_ans, rules)
        
        # Inject results back into payload
        q_payload["ruleEvaluations"] = matches
        
    return aligned_payloads
