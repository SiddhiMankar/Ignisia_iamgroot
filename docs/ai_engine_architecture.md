# AI Pipeline Architecture Blueprint (Python)

## 1. Complete AI Engine Folder Architecture

```text
/ai-engine
│── /app
│   │── /api                # FastAPI definitions. Wrapper around ML pipelines.
│   │   └── routes.py       
│   │── /core               # Environment settings & API keys
│   │   └── config.py
│   │── /modules            # The Isolated ML/AI Engines. 
│   │   │── ocr.py          # Ingestion: Extractor of text from images
│   │   │── segmentation.py # Splitter: Divides raw text into per-question chunks
│   │   │── nlp.py          # Cleaner & Translator: Normalizes OCR noise & Hinglish
│   │   │── embedding.py    # Vectorizer: Converts answers into semantic shapes
│   │   │── clustering.py   # Grouper: Groups embeddings using unsupervised ML
│   │   │── matching.py     # Rubric Engine: Cosine-sim + exact matching
│   │   │── evaluator.py    # Grader & Edge-cases: Makes smart score suggestions
│   │   └── explain.py      # Justifier: Formats the readable reasoning output
│   │── /schemas            # Input/Output Contracts (Pydantic Models)
│   │   │── request.py
│   │   └── response.py
│   │── /utils              # Helper scripts
│   │   │── prompts.py      # ⭐ Centralized LLM prompt templates
│   │   └── image_prep.py   # Crop, deskew, binarize before OCR
│   └── pipeline.py         # ⭐ The Master Orchestrator
│── main.py                 # Application bootstrapper (FastAPI entry point)
│── .env.example            
└── requirements.txt        # Dependency tracking
```

---

## 2. Responsibilities & Library Suggestions

### A. Ingestion & Pre-Processing Modules
*   **`ocr.py`**:
    *   **Responsibility**: Return raw text from images.
    *   **Library (MVP)**: Use `Tesseract OCR` (via `pytesseract`) + `OpenCV` for cleaning. High ROI hack: use an LLM with vision capabilities to interpret bad handwriting directly.
*   **`segmentation.py`**:
    *   **Responsibility**: Strip metadata ("Name: ...") and isolate "Q1:", "Ans1:".
    *   **Library (MVP)**: Regular Expressions (`re module`). *Hackathon tip: mandate a standard template (e.g., drawing boxes) or use a basic bounding-box rule.*
*   **`nlp.py`**:
    *   **Responsibility**: Fast text cleaning. Translating Hinglish -> English.
    *   **Library (MVP)**: `TextBlob` or an inexpensive LLM API call (`langchain`) focused *only* on translation.

### B. Core Intelligence Modules
*   **`embedding.py`**:
    *   **Responsibility**: Converts clean text into semantic arrays.
    *   **Library (MVP)**: `sentence-transformers` (e.g., `all-MiniLM-L6-v2` runs locally and fast), or OpenAI's `text-embedding-3-small`.
*   **`clustering.py`**:
    *   **Responsibility**: Group identical/very-similar answers.
    *   **Library (MVP)**: `scikit-learn` (`AgglomerativeClustering` or `DBSCAN`). DBSCAN is great here because it natively identifies outliers (unique answers).

### C. Human-In-The-Loop Grading Modules
*   **`matching.py`**:
    *   **Responsibility**: Vector similarity checks against rubric keywords.
*   **`evaluator.py`**:
    *   **Responsibility**: Compiles evaluation data, flags missing logic, and emits a suggested numerical score. Detects edge-cases (e.g., keyword packing).
    *   **Library (MVP)**: `OpenAI/Anthropic APIs` via `LangChain`. *Use Structured Outputs to guarantee an integer score.*
*   **`explain.py`**:
    *   **Responsibility**: Creates the "Reasoning string" for the faculty UI (e.g., *"Matched concepts: X, Y. Missing formula logic: Z."*)

---

## 3. The `pipeline.py` Architecture (Function Level)

This is the central nervous system. It strictly delegates tasks to the `/modules` directory.

```python
# app/pipeline.py
from app.modules.ocr import extract_text
from app.modules.segmentation import segment_answers
from app.modules.nlp import standardize_language
from app.modules.embedding import generate_embeddings
from app.modules.clustering import cluster_embeddings
from app.modules.evaluator import suggest_scores, check_edge_cases
from app.modules.explain import generate_explainability

def run_grading_pipeline(image_path: str, rubric: dict) -> dict:
    # 1. Ingestion
    raw_text = extract_text(image_path)
    
    # 2. Segmentation
    question_answers = segment_answers(raw_text) # Ex: { "Q1": "The force is...", "Q2": "..." }
    
    pipeline_results = {}

    for q_num, ans_text in question_answers.items():
        # 3. NLP Normalization
        clean_text = standardize_language(ans_text)
        
        # 4. Semantic Embedding
        vector = generate_embeddings(clean_text)
        
        # NOTE: Clustering usually runs across a BATCH of answers, 
        # so you'd aggregate vectors across 50 students here before step 5.
        
        # 5. Grading & Edge-Cases
        q_rubric = rubric.get(q_num)
        edge_flags = check_edge_cases(clean_text, q_rubric)
        score_data = suggest_scores(clean_text, q_rubric, edge_flags)
        
        # 6. Explainability
        explanation = generate_explainability(clean_text, q_rubric, score_data)
        
        pipeline_results[q_num] = {
            "clean_text": clean_text,
            "vector": vector.tolist(), # Convert numpy to list for JSON
            "suggested_score": score_data['score'],
            "confidence": score_data['confidence'],
            "flags": edge_flags,
            "explanation": explanation
        }
        
    return pipeline_results
```

---

## 4. Input / Output Contracts (Data flowing through Python)

The API wrapper must use strictly defined `Pydantic` schemas for Node vs Python communication.

**INPUT from Node.js (Backend) -> Python (AI Engine)**
```json
{
  "submissionId": "sub_9992",
  "files": ["/tmp/sheet1_p1.jpg", "/tmp/sheet1_p2.jpg"],
  "examRubric": {
    "Q1": { "keywords": ["gravity", "acceleration"], "max_marks": 5 }
  }
}
```

**OUTPUT from Python (AI Engine) -> Node.js (Backend)**
```json
{
  "submissionId": "sub_9992",
  "pipelineTimeMs": 2400,
  "results": {
    "Q1": {
      "cleanText": "It accelerates due to gravity.",
      "suggestedScore": 5,
      "confidence": 0.95,
      "flags": ["NONE"],
      "explanation": "Matched 'gravity' and 'acceleration'. Correct usage."
    }
    // Embeddings and cluster grouping IDs usually returned in a batch endpoint
  }
}
```

---

## 5. Backend to AI Engine Communication Protocol

*   **Asynchronous HTTP (Recommended for MVP)**:
    Node.js saves the image to a shared local volume/bucket. It sends a `POST /api/v1/process` to FastAPI with the file location. Python computes, then Python makes a `POST` request callback back to Node.js' webhook (`/api/v1/internal/callback`) with the results.
*   **Why not WebSockets or gRPC?** Overkill for a hackathon. HTTP callbacks or basic polling (`GET /api/v1/status/:jobId`) are incredibly predictable and easy to debug in Postman.

---

## 6. MVP vs Advanced Strategy (Hackathon Feasibility)

| Module | Hackathon MVP Strategy (Do this) | Advanced Version (Ignore for now) |
| :--- | :--- | :--- |
| **OCR** | Assume single column, English handwriting. Ask judges to write legibly. | Complex CV layout parsing (DetectoRS), mathematical equation OCR (MathPix). |
| **Segmentation** | Ask students to write "Q1:", "Q2:" explicitly. Use regex to split. | Object detection to find answer boxes or Yolov8 bounding box logic. |
| **Clustering** | Run locally via `scikit-learn` in memory. | Vector databases (Milvus/Pinecone) handling thousands of students concurrently. |
| **Evaluation** | Use OpenAI `gpt-4o-mini` with a heavily engineered Prompt Template acting as the grader. | Training a custom fine-tuned DistilBERT classification model. |

## 7. Golden Rules for the Hackathon Demo
1. **Mock Endpoints First**: Build the FastAPI server with dummy outputs for `pipeline.py` immediately. This unblocks the Backend.
2. **Deterministic Fallbacks**: Sometimes the LLM will hallucinate. Always trap exceptions and return `{ "suggestedScore": "MANUAL_REVIEW" }`. It proves your Human-In-The-Loop statement!
3. **Save Your Artifacts**: In `pipeline.py`, save the intermediate steps to `.txt` files (e.g. `ocr_result.txt`). When pitching, showing the raw OCR text vs standard text proves the engine is actually working under the hood.
