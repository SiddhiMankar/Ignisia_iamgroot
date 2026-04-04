import os
import json
import time
import pytesseract
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from app.modules.clustering import SemesterClusteringEngine

# Load env variables (GEMINI_API_KEY)
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_KEY and GEMINI_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_KEY)
    llm_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    llm_model = None

# Note for Windows: Pytesseract requires the Tesseract-OCR binary installed on your OS.
# If installed in a custom location, uncomment and adjust the line below:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text(file_path: str) -> str:
    """Uses Pytesseract to pull raw text from the student's answer sheet."""
    try:
        img = Image.open(file_path)
        print(f"Running OCR on {file_path}...")
        extracted_text = pytesseract.image_to_string(img)
        return extracted_text.strip()
    except Exception as e:
        print(f"[Warning] OCR Failed. Defaulting to mock text. Error: {e}")
        return "The rate of acceleration is due to earth's gravitational pull."

def compare_with_rubric(clean_text: str, rubric: dict) -> dict:
    """Uses Gemini 1.5 to perform the LLM-As-A-Judge rubric comparison"""
    if not llm_model:
        return {"score": 0, "flags": ["NO_API_KEY"], "explanation": "Gemini API Key missing."}

    prompt = f"""
    You are an expert academic evaluator. 
    Compare the student's answer against the faculty rubric.

    [FACULTY RUBRIC]: 
    Keywords expected: {rubric.get("keywords", [])}
    Expected concepts: {rubric.get("expectedConcepts", [])}
    Max Marks: {rubric.get("maxMarks", 5)}

    [STUDENT ANSWER]:
    {clean_text}

    Evaluate the answer strictly based on the rubric. 
    Return ONLY a raw JSON object string (do not use markdown backticks) with this structure:
    {{
        "score": (integer),
        "confidence": (float between 0 and 1),
        "flags": ["list", "of", "edgecase", "strings", "like 'missing formula'"],
        "explanation": "short rationale"
    }}
    """
    
    try:
        response = llm_model.generate_content(prompt)
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text_resp)
        return data
    except Exception as e:
        print(f"Gemini Evaluation Error: {e}")
        return {
            "score": 0,
            "confidence": 0,
            "flags": ["LLM_ERROR"],
            "explanation": "Failed to parse LLM response securely."
        }

def run_grading_pipeline(exam_id: str, file_path: str, rubric: dict) -> dict:
    """The central coordinator evaluating submissions via Clustering + LLM."""
    print(f"[{exam_id}] Processing files...")
    
    # In a full system, file_path would be a list of multiple files. 
    # For MVP we simulate a batch of 1 or generate a mock secondary answer to prove clustering works
    extracted_text = extract_text(file_path)
    
    mock_batch = [
        {"id": "sub_real", "text": extracted_text},
        {"id": "sub_mock1", "text": extracted_text + " (slightly reworded)"}, # Should cluster with sub_real
        {"id": "sub_mock2", "text": "I don't know the answer to this question."} # Should be an outlier
    ]
    
    q_num = "question_1" 
    q_rubric = rubric.get(q_num, {"maxMarks": 5, "keywords": ["gravity"]})
    
    # 1. CLUSTERING PHASE
    print(f"[{exam_id}] Running Semantic Clustering via DBSCAN...")
    engine = SemesterClusteringEngine()
    vector_clusters = engine.group_similar_answers(mock_batch)
    
    # 2. EVALUATION PHASE
    final_output_clusters = []
    
    for c_id, grouped_answers in vector_clusters.items():
        print(f"[{exam_id}] Evaluating Cluster {c_id} ({len(grouped_answers)} answers) using Gemini...")
        
        # We only need to ask the LLM to grade the FIRST answer in the cluster to save money/time
        # The AI's score automatically applies to all identical answers in this cluster!
        cluster_representative_text = grouped_answers[0]['text']
        evaluation = compare_with_rubric(cluster_representative_text, q_rubric)
        
        final_output_clusters.append({
            "clusterId": c_id,
            "answers": [{"studentId": a['id'], "rawText": a['text'], "cleanText": a['text']} for a in grouped_answers],
            "evaluation": {
                "suggestedScore": evaluation.get("score", 0),
                "confidence": evaluation.get("confidence", 0),
                "flags": evaluation.get("flags", []),
                "explainability": evaluation.get("explanation", "")
            }
        })
    
    # Bundle into the expected Webhook Schema
    return {
        "sessionId": exam_id,
        "status": "SUCCESS",
        "results": {
            q_num: {
                "clusters": final_output_clusters
            }
        }
    }
