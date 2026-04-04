"""
test_extract.py
---------------
Local test runner for faculty-side OCR + parsing pipeline.

Run from ai-engine/ root:
    python -m tests.test_extract

Debug stages visible:
  [1]  Raw OCR text
  [1c] Cleaned OCR text
  [2]  Document type detection
  [2b] Detected question blocks (boundary debug)
  [3]  Parsed as Question Paper
  [4]  Parsed as Rubric
  [5]  Frontend Rule Builder JSON
"""

import os
import sys
import json
import time
import re

# Force UTF-8 output on Windows (avoids CP1252 UnicodeEncodeError for →, ─, etc.)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Ensure ai-engine/ is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from document_parser.extract_text import extract_document_text
from document_parser.detect_document_type import detect_document_type
from document_parser.parse_rubric import parse_rubric
from document_parser.parse_question_paper import parse_question_paper
from document_parser.text_cleaner import clean_ocr_text
from document_parser.parse_question_paper import _find_question_boundaries

# -------------------------------
# PATHS
# -------------------------------
BASE_DIR = os.path.dirname(__file__)
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_docs")
FACULTY_DIR = os.path.join(SAMPLE_DIR, "Faculty test")
DEBUG_DIR = os.path.join(BASE_DIR, "debug_outputs")

os.makedirs(DEBUG_DIR, exist_ok=True)

# -------------------------------
# HELPERS
# -------------------------------
def _print_section(title: str):
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print('=' * 70)

def save_json(data, filename):
    path = os.path.join(DEBUG_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[DEBUG] Saved JSON → {path}")

def save_text(text, filename):
    path = os.path.join(DEBUG_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"[DEBUG] Saved text → {path}")

# Import rule utilities for smart classification + dedup
from document_parser.rule_utils import rubric_to_rules, summarize_rules


# -------------------------------
# FRONTEND FORM JSON BUILDER
# -------------------------------
def build_rule_builder_json(parsed_qp, parsed_rubric, session_title="OCR Imported Session"):
    """
    Converts parsed QP + rubric into frontend Rule Builder JSON.

    Now uses rule_utils.rubric_to_rules() for:
    - smart rule type classification (Exact Match, Formula Match, etc.)
    - deduplication (removes H₂O / • H₂O duplicates)
    - weight assignment from inline marks or type defaults
    """
    questions = []
    all_q_keys = sorted(set(parsed_qp.keys()) | set(parsed_rubric.keys()))

    for qid in all_q_keys:
        qp_data = parsed_qp.get(qid, {})
        rb_data = parsed_rubric.get(qid, {})

        question_prompt = qp_data.get("question_text", "").strip()
        # Marks: prefer explicit → rubric max → 0
        marks = qp_data.get("marks") or rb_data.get("max_marks") or 0

        # Pass question_prompt so rule_utils can filter out title-matching concepts
        rules = rubric_to_rules(rb_data, question_prompt=question_prompt)

        questions.append({
            "questionId": qid,
            "questionPrompt": question_prompt,
            "marks": marks,
            "rules": rules
        })


    return {
        "sessionTitle": session_title,
        "questions": questions
    }

# -------------------------------
# TEST SINGLE FILE
# -------------------------------
def test_single_file(file_path: str):
    if not os.path.exists(file_path):
        print(f"[SKIP] File not found: {file_path}")
        return None

    file_name = os.path.basename(file_path)
    _print_section(f"TESTING: {file_name}")

    # ── Stage 1: Extract ──────────────────────────────────────────────
    print("\n[1] Extracting text...")
    start = time.time()
    result = extract_document_text(file_path)
    elapsed = time.time() - start
    print(f"    Method   : {result['method']}")
    print(f"    Pages    : {len(result['pages'])}")
    print(f"    Chars    : {len(result['raw_text'])}")
    print(f"    Time     : {elapsed:.2f}s")

    print("\n[1.1] Raw OCR sample (first 1200 chars):")
    print("─" * 60)
    print(result["raw_text"][:1200])
    print("─" * 60)

    save_json(result, f"{file_name}_extract.json")
    save_text(result["raw_text"], f"{file_name}_1_raw.txt")

    # ── Stage 1c: Clean ───────────────────────────────────────────────
    print("\n[1c] Cleaning OCR text...")
    cleaned_text = clean_ocr_text(result["raw_text"])
    diff_chars = len(result["raw_text"]) - len(cleaned_text)
    print(f"    Chars removed by cleanup: {diff_chars}")
    print("\n[1c.1] Cleaned text sample (first 1200 chars):")
    print("─" * 60)
    print(cleaned_text[:1200])
    print("─" * 60)
    save_text(cleaned_text, f"{file_name}_1c_cleaned.txt")

    # ── Stage 2: Detect document type ────────────────────────────────
    print("\n[2] Detecting document type...")
    doc_type = detect_document_type(cleaned_text)
    print(f"    Detected : {doc_type['type']}  (confidence: {doc_type['confidence']})")
    print(f"    Scores   : {doc_type['scores']}")

    # ── Stage 2b: Question boundary debug ────────────────────────────
    print("\n[2b] Detecting question boundaries...")
    boundaries = _find_question_boundaries(cleaned_text)
    if boundaries:
        print(f"    Found {len(boundaries)} question(s):")
        for q_label, offset in boundaries:
            snippet = cleaned_text[offset:offset + 80].replace('\n', ' ')
            print(f"      {q_label} @ char {offset}: '{snippet.strip()[:70]}'")
    else:
        print("    ⚠ No question boundaries detected (will fall back to Q1)")
    save_text(
        "\n".join([f"{q} @ char {off}" for q, off in boundaries]),
        f"{file_name}_2b_boundaries.txt"
    )

    # ── Stage 3: Parse as Question Paper ─────────────────────────────
    print("\n[3] Parsing as Question Paper...")
    try:
        parsed_qp = parse_question_paper(cleaned_text)
        print(f"    Extracted {len(parsed_qp)} question(s)")
        for qid, qdata in parsed_qp.items():
            prompt_preview = qdata.get("question_text", "")[:80].replace('\n', ' ')
            print(f"      {qid}: marks={qdata.get('marks', 0)} | '{prompt_preview}'")
        save_json(parsed_qp, f"{file_name}_3_parsed_qp.json")
    except Exception as e:
        print(f"    [ERROR] parse_question_paper failed: {e}")
        import traceback; traceback.print_exc()
        parsed_qp = {}

    # ── Stage 4: Parse as Rubric ─────────────────────────────────────
    print("\n[4] Parsing as Rubric...")
    try:
        parsed_rubric = parse_rubric(cleaned_text)
        print(f"    Extracted {len(parsed_rubric)} question block(s)")
        for qid, rdata in parsed_rubric.items():
            print(f"      {qid}: max_marks={rdata.get('max_marks')} | "
                  f"keywords={len(rdata.get('keywords',[]))} | "
                  f"concepts={len(rdata.get('expected_concepts',[]))} | "
                  f"formulas={len(rdata.get('formula_rules',[]))}")
        save_json(parsed_rubric, f"{file_name}_4_parsed_rubric.json")
    except Exception as e:
        print(f"    [ERROR] parse_rubric failed: {e}")
        import traceback; traceback.print_exc()
        parsed_rubric = {}

    # ── Stage 5: Build frontend Rule Builder JSON ─────────────────────
    print("\n[5] Building frontend Rule Builder JSON...")
    frontend_json = build_rule_builder_json(
        parsed_qp,
        parsed_rubric,
        session_title=os.path.splitext(file_name)[0]
    )
    total_rules = sum(len(q.get("rules", [])) for q in frontend_json.get("questions", []))
    print(f"    Questions : {len(frontend_json.get('questions', []))}")
    print(f"    Total rules extracted: {total_rules}")
    print(json.dumps(frontend_json, indent=2, ensure_ascii=False))
    save_json(frontend_json, f"{file_name}_5_frontend_form.json")

    # ── Stats Summary ─────────────────────────────────────────
    print("\n[SUMMARY] Rule extraction stats:")
    stats = summarize_rules(frontend_json.get("questions", []))
    print(f"  Questions : {stats['total_questions']}")
    print(f"  Total rules: {stats['total_rules']}")
    print("  Rule type breakdown:")
    for rtype, count in stats["rule_type_counts"].items():
        bar = "█" * count
        print(f"    {rtype:<25} {count:>3}  {bar}")

    return {
        "extract": result,
        "cleaned_text": cleaned_text,
        "doc_type": doc_type,
        "boundaries": boundaries,
        "parsed_qp": parsed_qp,
        "parsed_rubric": parsed_rubric,
        "frontend_json": frontend_json,
        "stats": stats
    }


# -------------------------------
# TEST ALL FACULTY FILES
# -------------------------------
def test_faculty_docs():
    _print_section("FACULTY DOCUMENT OCR TEST")

    if not os.path.exists(FACULTY_DIR):
        print(f"[SKIP] Faculty folder not found: {FACULTY_DIR}")
        return

    pdf_files = [f for f in os.listdir(FACULTY_DIR) if f.lower().endswith(".pdf")]

    if not pdf_files:
        print("[SKIP] No faculty PDFs found.")
        return

    print(f"\nFound {len(pdf_files)} PDF(s) in Faculty test folder.")

    for pdf in sorted(pdf_files):
        file_path = os.path.join(FACULTY_DIR, pdf)
        test_single_file(file_path)

# -------------------------------
# MAIN
# -------------------------------
if __name__ == "__main__":
    print("\n[START] OCR Faculty Document Test Suite")
    test_faculty_docs()
    print("\n[DONE] Faculty OCR test suite complete.")