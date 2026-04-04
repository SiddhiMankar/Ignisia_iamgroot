# System Architecture: AI-Assisted Answer Clustering & Grading Acceleration Engine

## What This System Is

A **Rubric-Driven AI Evaluation Workflow System** that helps faculty grade subjective handwritten answer sheets faster.

**This is NOT:** an LMS, subject manager, exam scheduler, or student portal.
**This IS:** a document intelligence + AI grading assistance pipeline.

---

## 6-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1. PRESENTATION LAYER (React + Vite + Tailwind)        │
│     - Faculty dashboard                                  │
│     - Rule Builder form                                  │
│     - Upload UI (faculty + student)                      │
│     - Review dashboard + analytics                       │
├─────────────────────────────────────────────────────────┤
│  2. APPLICATION LAYER (Node.js + Express)               │
│     - Session CRUD                                       │
│     - File upload endpoints                              │
│     - Pipeline orchestration triggers                    │
│     - Result persistence + review routes                 │
├─────────────────────────────────────────────────────────┤
│  3. DOCUMENT INTELLIGENCE LAYER (Python)                │
│     - Two separate OCR flows:                            │
│       A) Faculty Config Flow → Rule Builder JSON         │
│       B) Student Evaluation Flow → aligned answers       │
├─────────────────────────────────────────────────────────┤
│  4. AI EVALUATION LAYER (Python)                        │
│     - Semantic embeddings (sentence-transformers)        │
│     - DBSCAN clustering                                  │
│     - Gemini LLM rubric matching                         │
│     - Edge case detection                                │
│     - Score + explainability generation                  │
├─────────────────────────────────────────────────────────┤
│  5. DATA / STORAGE LAYER (MongoDB)                      │
│     - EvaluationSession, Question, Submission            │
│     - Cluster, Score, Review, Analytics                  │
├─────────────────────────────────────────────────────────┤
│  6. DOCUMENTATION LAYER (docs/)                         │
│     - Architecture, flow diagrams, API notes             │
└─────────────────────────────────────────────────────────┘
```

---

## The Two OCR Flows

### A) Faculty Configuration Flow
```
Faculty PDF → extract_text.py → parse_question_paper.py
                              → parse_rubric.py
                              → build_rule_builder_json()
                              → React EvaluationSessionBuilder (autofill)
```

### B) Student Evaluation Flow
```
Student PDF → extract_text.py → parse_answer_sheet.py
                              → align_question_answer.py
                              → cluster_answers.py
                              → llm_evaluator.py (Gemini)
                              → generate_score.py
                              → MongoDB Cluster document
                              → React Review Dashboard
```

---

## AI Engine Folder Structure

```
ai-engine/
├── document_intelligence/
│   ├── extraction/      extract_text.py, detect_document_type.py
│   ├── faculty/         parse_faculty_config.py, parse_question_paper.py, parse_rubric.py
│   ├── student/         parse_answer_sheet.py, align_question_answer.py
│   └── language/        detect_language.py, normalize_text.py
│
├── evaluation_engine/
│   ├── embeddings/      generate_embeddings.py
│   ├── clustering/      cluster_answers.py
│   ├── scoring/         llm_evaluator.py, generate_score.py
│   ├── edge_cases/      detect_edge_cases.py
│   └── explainability/  explain_score.py
│
├── pipelines/
│   ├── faculty_pipeline.py
│   ├── student_pipeline.py
│   └── full_evaluation_pipeline.py
│
├── utils/               logger.py
├── tests/               test_extract.py, test_faculty_pipeline.py, test_student_pipeline.py
├── document_parser/     __init__.py (backwards compat shim only)
├── main.py              FastAPI bootstrap
└── requirements.txt
```
