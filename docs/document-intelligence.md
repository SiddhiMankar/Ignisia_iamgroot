# Document Intelligence Layer

## Overview

The Document Intelligence layer is responsible for converting raw academic PDF/image files into clean, structured JSON before any AI evaluation happens.

It handles TWO distinct workflows:

---

## A) Faculty Configuration Flow

**Purpose:** Auto-fill the React Rule Builder form from faculty-uploaded PDFs.

**Input:** Question paper PDF, rubric document, answer key.

**Pipeline:**
```
Faculty PDF
  → extract_text.py          (PyMuPDF or EasyOCR fallback)
  → detect_document_type.py  (classify: rubric? question paper?)
  → parse_question_paper.py  (extract Q text + marks)
  → parse_rubric.py          (extract keywords, concepts, rules)
  → parse_faculty_config.py  (merge into Rule Builder JSON)
  → return to React frontend
```

**Output JSON:**
```json
{
  "sessionTitle": "Midterm 2026",
  "questions": [
    {
      "questionId": "Q1",
      "questionPrompt": "Explain photosynthesis.",
      "marks": 5,
      "rules": [
        { "type": "Keyword Match", "description": "Must mention 'chlorophyll'", "weight": 1 }
      ]
    }
  ]
}
```

---

## B) Student Evaluation Flow

**Purpose:** Extract student answers question-wise for AI grading.

**Input:** Scanned handwritten answer sheet (PDF or image).

**Pipeline:**
```
Student PDF
  → extract_text.py          (EasyOCR for handwritten)
  → parse_answer_sheet.py    (segment answers by question number)
  → align_question_answer.py (match to QP + rubric)
  → return evaluation_items[]
```

**Output JSON:**
```json
{
  "student_id": "S001",
  "evaluation_items": [
    {
      "question_number": "Q1",
      "question_text": "Explain photosynthesis.",
      "rubric": { "max_marks": 5, "keywords": ["chlorophyll"] },
      "student_answer": "Photosynthesis is the process..."
    }
  ]
}
```

---

## Key Design Rules

- `extract_text.py` is shared between BOTH flows
- Faculty files go through `faculty/` parsers only
- Student files go through `student/` parsers only
- `normalize_text.py` is applied after OCR, NEVER lowercases (protects formulas)
- `detect_language.py` flags Hindi/mixed content for EasyOCR to handle properly

---

## Supported File Types
| Type | Method |
|---|---|
| Digital PDF | PyMuPDF (fast, text extraction) |
| Scanned PDF | pdf2image → EasyOCR |
| JPG / PNG | PIL → EasyOCR |

---

## Dependencies
- `PyMuPDF` — digital PDF extraction
- `pdf2image` — PDF to image (requires Poppler on Windows)
- `easyocr` — deep learning OCR (English + Hindi)
- `langdetect` — language detection
- `Pillow`, `numpy` — image utilities
