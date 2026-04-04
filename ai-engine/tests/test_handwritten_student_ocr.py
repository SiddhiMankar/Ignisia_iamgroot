import sys
import os
import json

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Ensure the root dir is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from document_parser.extract_text import extract_document_text
from document_parser.detect_document_type import detect_document_type
from document_parser.parse_question_paper import parse_question_paper
from evaluation_engine.embeddings.embed_text import embed_text
from evaluation_engine.embeddings.similarity import cosine_similarity

def extract_expected_topic(filename: str) -> str:
    """Infers expected topic from filename (e.g. photosynthesis_handwritten.pdf -> photosynthesis)"""
    base = os.path.basename(filename)
    name_no_ext = os.path.splitext(base)[0]
    
    # Strip common suffixes/prefixes
    clean = name_no_ext.lower().replace("_handwritten", "").replace(" question sheet", "").replace(" answer sheet", "")
    segments = clean.split()
    if segments:
        return segments[0]
    return clean

def run_test_harness():
    sample_dir = r"C:\Projects\Ignisia_iamgroot\ai-engine\tests\sample_docs\student handwritting test"
    debug_dir = r"C:\Projects\Ignisia_iamgroot\ai-engine\tests\debug_outputs\handwritten"
    
    os.makedirs(debug_dir, exist_ok=True)

    # Gather test files
    if not os.path.exists(sample_dir):
        print(f"Error: Sample directory not found at {sample_dir}")
        return

    files = [os.path.join(sample_dir, f) for f in os.listdir(sample_dir) if f.endswith(('.pdf', '.jpg', '.png'))]
    
    if not files:
        print("No handwritten test files found.")
        return

    for idx, f in enumerate(files):
        filename = os.path.basename(f)
        student_id = f"sample_{idx+1:02d}"
        
        # Determine unique debug folder for this file
        file_debug_dir = os.path.join(debug_dir, os.path.splitext(filename)[0])
        os.makedirs(file_debug_dir, exist_ok=True)
        
        print("\n" + "="*60)
        print(f"TESTING: {filename}")
        print("="*60)
        
        # [1] OCR Extraction
        print("\n[1] OCR Extraction")
        extracted = extract_document_text(f, preprocess=True, max_pages=1)
        method = extracted.get("method", "unknown")
        raw_text = extracted.get("raw_text", "")
        print(f"- method used: {method}")
        print(f"- chars extracted: {len(raw_text)}")
        
        with open(os.path.join(file_debug_dir, "raw_text.txt"), "w", encoding="utf-8") as dump:
            dump.write(raw_text)

        # [2] Detect Document Type & Setup
        # Note: clean_ocr_text is handled internally by parse_question_paper
        is_scanned = "ocr" in method
        doc_type_info = detect_document_type(raw_text, is_scanned)
        print(f"- detected type: {doc_type_info['type']}")
        
        # Document cleaned preview (we manually call clean_ocr_text just for the log output preview)
        from document_parser.text_cleaner import clean_ocr_text
        cleaned_text = clean_ocr_text(raw_text)
        print("\n[2] Cleaned Text Preview")
        preview = cleaned_text[:300].replace("\n", "  ")
        print(f"{preview}..." if len(preview) == 300 else preview)
        
        with open(os.path.join(file_debug_dir, "cleaned_text.txt"), "w", encoding="utf-8") as dump:
            dump.write(cleaned_text)

        # [3] Parsed Answer
        print("\n[3] Parsed Answer")
        parsed = parse_question_paper(raw_text)
        
        questions = parsed.get("questions", [])
        parsed_dict = {}
        
        print(f"- detected answer blocks: {len(questions)}")
        for q in questions:
            q_id = q.get("question_id", "Unknown")
            q_text = q.get("question_text", "")
            parsed_dict[q_id] = q_text
            print(f"- {q_id} length: {len(q_text)} chars")
            
        with open(os.path.join(file_debug_dir, "parsed_answers.json"), "w", encoding="utf-8") as dump:
            json.dump(parsed, dump, indent=2)

        # [4] Expected Topic
        expected_topic = extract_expected_topic(filename)
        print("\n[4] Expected Topic")
        print(f"- {expected_topic}")
        
        # [5] Similarity Check
        print("\n[5] Similarity Check")
        # Combine all extracted answers to check if the concept is present anywhere
        full_parsed_text = " ".join([q_text for q_text in parsed_dict.values()])
        
        expected_emb = embed_text(expected_topic)
        actual_emb = embed_text(full_parsed_text)
        
        score = round(cosine_similarity(expected_emb, actual_emb), 3)
        likely_match = score >= 0.35 # Mild threshold since topic is just one word
        
        print(f"- OCR text vs expected topic")
        print(f"- score: {score}")
        print(f"- likely semantic match: {'YES' if likely_match else 'NO'}")
        
        # [6] FINAL OUTPUT
        print("\n[6] FINAL OUTPUT")
        final_output = {
            "student_id": student_id,
            "file_name": filename,
            "expected_topic": expected_topic,
            "ocr_text_preview": raw_text[:200] + "...",
            "parsed_answers": parsed_dict,
            "similarity_score": score,
            "likely_match": likely_match
        }
        
        print(json.dumps(final_output, indent=2))
        
        with open(os.path.join(file_debug_dir, "final_output.json"), "w", encoding="utf-8") as dump:
            json.dump(final_output, dump, indent=2)

if __name__ == "__main__":
    run_test_harness()
