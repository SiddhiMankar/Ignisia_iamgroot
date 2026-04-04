"""
tests/test_student_ocr.py
-------------------------
Local test runner to validate student answer sheet parsing and alignment.
"""

import sys
import json
import os

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from document_parser.parse_answer_sheet import parse_answer_sheet
from document_parser.align_answers import align_answers, summarize_alignment

# ── 1. MOCK FACULTY PAYLOADS ──────────────────────────────────────
# Equivalent to the output of `parse_rubric()` 
MOCK_RUBRIC_PARSED = {
    "Q1": {"max_marks": 2, "expected_concepts": ["Process by which plants make food", "Uses sunlight"]},
    "Q2": {"max_marks": 2, "expected_concepts": ["Liquid changes into gas"]},
    "Q3": {"max_marks": 3, "formula_rules": ["F = ma"]},
}

# Equivalent to the output of `rule_utils.rubric_to_rules()` / frontend json
MOCK_FRONTEND_QUESTIONS = [
    {
        "questionId": "Q1",
        "questionPrompt": "What is photosynthesis?",
        "marks": 2,
        "rules": [
            {"type": "Concept Match", "description": "Process by which plants make food", "weight": 1},
            {"type": "Concept Match", "description": "Uses sunlight", "weight": 1}
        ]
    },
    {
        "questionId": "Q2",
        "questionPrompt": "What is evaporation?",
        "marks": 2,
        "rules": [
            {"type": "Concept Match", "description": "Liquid changes into gas", "weight": 2}
        ]
    },
    {
        "questionId": "Q3",
        "questionPrompt": "Define Newton's Second Law",
        "marks": 3,
        "rules": [
            {"type": "Formula Match", "description": "F = ma", "weight": 3}
        ]
    }
]

# ── 2. MOCK STUDENT OCR TEXTS ─────────────────────────────────────
# We test messy numbering, missing brackets, mathematical equations, and multiline text.
STUDENT_MOCKS = {
    "S001_Clean": """
Q1. Photosynthesis is the process by which plants make food using sunlight.
Q2. Evaporation is when liquid turns to gas.
Q3. Force equals mass times acceleration:
F = ma
    """,
    
    "S002_Messy_Numbering": """
Ans 1: I think it is how plants make food.
2) It turns into vapour due to heat.
Answer to Q3: 
F = m * a
    """,

    "S003_Missing_Ans": """
1: Plants make food.
3. F = ma
    """
}

def run_tests():
    print("======================================================")
    print("  STUDENT OCR & ALIGNMENT TEST SUITE")
    print("======================================================")
    
    for student_id, raw_text in STUDENT_MOCKS.items():
        print(f"\n[TESTING: {student_id}]")
        
        # 1. Parse the answer sheet
        parsed = parse_answer_sheet(student_id, raw_text)
        print(f"  [Parse] Detected {parsed['meta']['answered']} answers. Boundaries found: {parsed['meta']['boundaries_found']}")
        
        # 2. Align answers to rubric
        aligned = align_answers(parsed, MOCK_RUBRIC_PARSED, MOCK_FRONTEND_QUESTIONS)
        summary = summarize_alignment(aligned, student_id)
        
        print(f"  [Align] {summary['answered']} answered, {summary['missing']} missing, {summary['blank']} blank.")
        
        # 3. Print the aligned output
        print("\n  [Aligned Output]:")
        for ans in aligned:
            status = f"[{ans['answerStatus'].upper()}]"
            short_ans = ans['studentAnswer'].replace('\n', ' ')
            if len(short_ans) > 60:
                short_ans = short_ans[:57] + "..."
                
            print(f"    {ans['questionId']:<4} {status:<10} | {short_ans}")
        print("-" * 50)

if __name__ == "__main__":
    run_tests()
