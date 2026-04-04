# AI-Assisted Answer Clustering & Grading Acceleration Engine

A **rubric-driven AI evaluation workflow system** designed to help faculty grade subjective handwritten answer sheets faster, without replacing human judgment.

---

## What Problem Does This Solve?

Faculty grading 100+ handwritten answer sheets is slow, inconsistent, and exhausting.

This system:
- **Extracts** structured academic content from any PDF (typed or handwritten)
- **Clusters** similar student answers together semantically
- **Suggests** rubric-based scores using an LLM evaluator
- **Shows** faculty exactly why each score was suggested (explainability)
- **Keeps faculty in full control** — no autonomous grading

---

## How OCR Is Used in Two Ways

### 1. Faculty Configuration Flow
Faculty uploads a question paper or rubric PDF → The system parses it and **auto-fills** the Rule Builder form in the React dashboard.

```
Faculty PDF → OCR → Parse → React Rule Builder (auto-filled)
```

### 2. Student Evaluation Flow
Faculty uploads scanned student answer sheets → The system extracts, segments, and aligns student answers question-wise before scoring.

```
Student PDF → OCR → Segment Answers → Align with Rubric → Cluster → LLM Score
```

---

## Layered Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Presentation | React + Vite + Tailwind | Faculty dashboard, Rule Builder, Review UI |
| Application | Node.js + Express | Session CRUD, file uploads, pipeline triggers |
| Document Intelligence | Python | OCR, parsing, document classification, alignment |
| AI Evaluation | Python | Embeddings, DBSCAN clustering, LLM scoring |
| Storage | MongoDB | Sessions, clusters, scores, reviews |

---

## Why Rubric-Driven?

The system has **no concept of subjects, syllabuses, or exam types**. It only cares about:
- What are the rules for this question?
- Does the student's answer meet those rules?

This makes it universally applicable across any academic domain.

---

## Project Structure

```
/
├── frontend/          React + Vite + Tailwind UI
├── backend/           Node.js + Express + MongoDB
├── ai-engine/         Python AI + OCR + Document Intelligence
│   ├── document_intelligence/   OCR, parsing, alignment
│   ├── evaluation_engine/       Embeddings, clustering, scoring
│   ├── pipelines/               Faculty + Student + Full pipelines
│   └── tests/                   Local test suite + sample docs
└── docs/              Architecture + flow + testing docs
```

---

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && node server.js

# AI Engine
cd ai-engine
pip install -r requirements.txt
uvicorn main:app --reload

# Run OCR Tests
cd ai-engine
python -m tests.test_extract
```

---

## Key Dependencies

- `PyMuPDF`, `pdf2image`, `easyocr` — Document Intelligence
- `sentence-transformers`, `scikit-learn` — Semantic Clustering
- `google-generativeai` — LLM grading via Gemini 1.5 Flash
- `FastAPI`, `uvicorn` — AI Engine API server
- `Express`, `Mongoose`, `Multer` — Backend API