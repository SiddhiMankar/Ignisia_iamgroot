"""
evaluation_engine/explainability/explain_match.py
-------------------------------------------------
Generates human-readable reasoning for the engine's score.
Because the engine has done all the heavy lifting deterministically (rule tracking, weights, math),
we only need the LLM to format the output nicely — making it incredibly fast and cheap,
and completely eliminating LLM math hallucinations.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict
from utils.logger import get_logger

logger = get_logger(__name__)
load_dotenv()

_llm_model = None

def _get_model():
    global _llm_model
    if _llm_model is None:
        key = os.getenv("GEMINI_API_KEY", "")
        if key and key != "your_gemini_api_key_here":
            genai.configure(api_key=key)
            _llm_model = genai.GenerativeModel('gemini-1.5-flash')
    return _llm_model

def generate_explanation(scored_payload: Dict) -> Dict:
    """
    Takes a fully scored question payload (must have 'ruleEvaluations' and 'suggestedScore')
    and appends an 'explainability' string.
    """
    if scored_payload.get("answerStatus") != "answered":
        scored_payload["explainability"] = f"No score. Answer status: {scored_payload.get('answerStatus')}."
        return scored_payload

    model = _get_model()
    if not model:
        logger.warning("No Gemini key — generating fallback explanation.")
        scored_payload["explainability"] = _generate_fallback_explanation(scored_payload)
        return scored_payload

    # Construct strict prompt
    prompt = f"""
You are returning a short 1-line reason for a student's grade.
The grading engine has already done the math. You do NOT calculate the score. You only explain it based on the facts below.

[FACTS]
Student Answer: "{scored_payload.get('studentAnswer', '')}"
Final Score: {scored_payload.get('suggestedScore')} / {scored_payload.get('marks')}

[RULE MATCH STATUS]
"""
    for r in scored_payload.get("ruleEvaluations", []):
        status = "MATCHED (Full Credit)" if r["matched"] else ("PARTIAL MATCH (Partial Credit)" if r["partial"] else "MISSED (No Credit)")
        prompt += f"- Rule: '{r['rule']}' -> {status}\n"

    prompt += """
[TASK]
Provide a single, clear, supportive sentence explaining the score to a faculty member. Do not use formatting. Do not restate the score numbers.
Example 1: "The student correctly identified the core concept of evaporation but missed the keyword 'heat'."
Example 2: "Perfect adherence to the rubric rules and formula."
"""

    try:
        response = model.generate_content(prompt)
        scored_payload["explainability"] = response.text.strip().replace("\n", " ")
    except Exception as e:
        logger.error(f"Explanation generation failed: {e}")
        scored_payload["explainability"] = _generate_fallback_explanation(scored_payload)

    return scored_payload

def _generate_fallback_explanation(payload: Dict) -> str:
    """Fallback logic if LLM is offline."""
    rules = payload.get("ruleEvaluations", [])
    total = len(rules)
    matched = sum(1 for r in rules if r["matched"])
    partial = sum(1 for r in rules if r["partial"])
    
    if total == 0:
        return "No rules provided in rubric."
    if matched == total:
        return "Standard system fallback: PERFECT match on all rules."
    if matched == 0 and partial == 0:
        return "Standard system fallback: MISSED all expected rubric rules."
        
    return f"Standard system fallback: Matched {matched}/{total} rules perfectly, and {partial} partially."
