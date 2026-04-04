# AI Engine Architecture (v3 — Document Intelligence)

## Core Principle
This is a **Rubric-First AI Evaluation Engine**. It is completely unaware of subjects, syllabuses, or exam types. It cares only about one question:

> _"Does the student's answer meet the rubric expectations for this question?"_

---

## 1. Complete Module Map

```
/ai-engine
│
│── /document_parser                 # ⭐ Stage 1: Document Intelligence Layer
│   │── extract_text.py              # Smart PDF ingestion (Digital or OCR fallback)
│   │── parse_rubric.py              # Extracts grading rules from Rubric PDFs
│   │── parse_question_paper.py      # Extracts question text and marks from QP PDFs
│   │── parse_answer_sheet.py        # Segments student answers question-wise
│   └── align_question_answer.py     # Bridges all 3 parsers into evaluation_items
│
│── /app
│   │── /modules
│   │   └── clustering.py            # ⭐ Stage 2: Semantic Embedding + DBSCAN Clustering
│   └── pipeline.py                  # ⭐ Stage 3: Master Orchestrator
│
│── main.py                          # FastAPI Bootstrap (Background Task dispatcher)
└── requirements.txt                 # Core ML + OCR dependencies
```

---

## 2. The 4-Stage Processing Pipeline

### Stage 1: Document Intelligence (document_parser/)

All raw academic files are parsed **before** any AI evaluation begins.

| File | Input | Output |
|---|---|---|
| `extract_text.py` | PDF file path | `{method, pages[], raw_text}` |
| `parse_rubric.py` | raw OCR text | `{"Q1": {max_marks, keywords[], expected_concepts[]}...}` |
| `parse_question_paper.py` | raw OCR text | `{"Q1": {question_text, marks}...}` |
| `parse_answer_sheet.py` | raw OCR text | `{student_id, answers: {Q1: "...", Q2: "..."}}` |
| `align_question_answer.py` | All 3 parsed dicts | `{student_id, evaluation_items[]}` |

**Smart Fallback Logic in `extract_text.py`:**
- If `PyMuPDF` finds `> 50 chars/page` → uses direct text extraction (`method: "pdf_text"`)
- If `< 50 chars/page` (scanned image PDF) → converts to images via `pdf2image`, uses `EasyOCR` (`method: "ocr"`)
- EasyOCR natively supports `['en', 'hi']` for English/Hindi mixed handwriting

### Stage 2: Semantic Clustering (app/modules/clustering.py)

After answers are aligned per question, they are grouped semantically **before** calling any LLM.

- Loads `all-MiniLM-L6-v2` sentence embedding model from `sentence-transformers`
- Generates high-dimensional vectors for every student answer
- Runs **DBSCAN clustering** to group semantically similar answers
- Outliers (e.g., blank/completely wrong answers) are isolated into `cluster_outlier_N`

**Key Benefit:** The LLM only evaluates 1 representative answer per cluster, not 1 answer per student. 50 identical papers = 1 Gemini API call.

### Stage 3: Gemini LLM Evaluation (app/pipeline.py)

The representative answer from each cluster is evaluated against the faculty rubric by Gemini 1.5 Flash using a strict prompt.

**Prompt Contract:**
```
You are an expert academic evaluator.
[FACULTY RUBRIC]: {keywords, expected_concepts, max_marks}
[STUDENT ANSWER]: {cluster_representative_text}

Return ONLY a raw JSON object:
{ "score": int, "confidence": float, "flags": [], "explanation": "..." }
```

### Stage 4: Node.js Persistence (Backend Webhook)

After evaluation completes, Python fires an HTTP POST to `Node.js /api/internal/ai-callback`. Node.js:
1. Parses all clusters and their evaluations
2. Stores them into MongoDB `Cluster` documents
3. Updates the `EvaluationSession` status to `READY_FOR_REVIEW`

---

## 3. Libraries & Dependencies

| Library | Purpose |
|---|---|
| `PyMuPDF (fitz)` | Fast native text extraction for digital PDFs |
| `pdf2image` | Rasterizes scanned PDFs into images |
| `easyocr` | Deep learning OCR supporting English + Hindi |
| `sentence-transformers` | Semantic vector embeddings |
| `scikit-learn` | DBSCAN clustering algorithm |
| `google-generativeai` | Gemini 1.5 Flash for LLM-as-a-Judge evaluation |
| `fastapi + uvicorn` | Non-blocking async HTTP API server |
| `python-dotenv` | Environment variable management |

---

## 4. System Deployment Notes
- All heavy models (`EasyOCR`, `SentenceTransformer`) are initialized **once** at server startup, not per request
- For Tesseract on Windows: install from `https://github.com/UB-Mannheim/tesseract/wiki`
- For `pdf2image` on Windows: install Poppler via `winget install poppler` or add to PATH manually
