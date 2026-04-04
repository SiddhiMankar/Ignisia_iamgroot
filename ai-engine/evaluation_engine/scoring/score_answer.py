"""
evaluation_engine/scoring/score_answer.py
-----------------------------------------
Calculates the final score for a question based on rule evaluations.
Ensures we do not exceed the Max Marks defined for the entire question.
"""

from typing import Dict, List
import math
from utils.logger import get_logger

logger = get_logger(__name__)

def calculate_score(evaluated_payload: Dict) -> Dict:
    """
    Takes a question payload that has been processed by the semantic_matcher,
    tallies the matched rule weights, handles partial credit, and enforces max marks.
    
    Returns the payload with 'suggestedScore' and 'flags' appended.
    """
    rules = evaluated_payload.get("ruleEvaluations", [])
    max_marks = evaluated_payload.get("marks", 0)
    
    # Fast-fail for missing/blank answers
    if evaluated_payload.get("answerStatus") != "answered":
        evaluated_payload["suggestedScore"] = 0
        evaluated_payload["flags"] = [evaluated_payload.get("answerStatus", "missing").upper()]
        return evaluated_payload
        
    score_tally = 0.0
    flags = set()
    
    for match in rules:
        if match["matched"]:
            score_tally += match["weight"]
        elif match["partial"]:
            # MVP partial credit logic: give 50% of the weight if semantic similarity is high but not perfect.
            # Round up to nearest 0.5 step so a 1-mark rule gives 0.5.
            partial_val = math.ceil((match["weight"] * 0.5) * 2) / 2
            score_tally += partial_val
            flags.add("PARTIAL_MATCH")
            
    # Calculate what went wrong for flag generation
    unmatched = [r for r in rules if not r["matched"] and not r["partial"]]
    if unmatched:
        if len(unmatched) == len(rules):
            flags.add("NO_RULES_MATCHED")
        else:
            flags.add(f"MISSED_{len(unmatched)}_RULES")
            
    # Ensure we don't exceed max marks if the rubric weights sum to more than the question total
    final_score = min(score_tally, max_marks)
    
    if final_score == max_marks and max_marks > 0:
        flags.add("PERFECT_SCORE")
        
    # Standardize types and attach
    evaluated_payload["suggestedScore"] = float(final_score)
    evaluated_payload["flags"] = list(flags)
    
    return evaluated_payload
