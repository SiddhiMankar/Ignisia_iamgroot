# Testing Plan

## Running Tests

All tests run from the `ai-engine/` root directory:

```bash
# Faculty OCR test (runs against Faculty test/ folder)
python -m tests.test_extract

# Faculty pipeline smoke test
python -m tests.test_faculty_pipeline

# Student pipeline smoke test
python -m tests.test_student_pipeline
```

---

## Test Structure

### `tests/test_extract.py` — Faculty OCR + Autofill
Tests the faculty configuration flow end-to-end.

Place PDFs in: `tests/sample_docs/Faculty test/`

For each PDF, the test:
1. Extracts text (records method, time, char count)
2. Detects document type
3. Parses as question paper
4. Parses as rubric
5. Builds Rule Builder JSON → saves to `tests/debug_outputs/`

### `tests/test_faculty_pipeline.py` — Faculty Pipeline
Runs `pipelines/faculty_pipeline.py` against sample docs.  
Verifies the Rule Builder JSON structure matches the expected shape.

### `tests/test_student_pipeline.py` — Student Pipeline
Runs `pipelines/student_pipeline.py` against a sample answer sheet.  
Verifies evaluation_items[] are populated and aligned.

---

## Debug Outputs

All test outputs are saved to `tests/debug_outputs/`:

| File | Contents |
|---|---|
| `{filename}_raw.txt` | Raw OCR extracted text |
| `{filename}_extract.json` | Full extraction output |
| `{filename}_parsed_qp.json` | Parsed question paper |
| `{filename}_parsed_rubric.json` | Parsed rubric |
| `{filename}_frontend_form.json` | Rule Builder JSON |

---

## Adding Sample Files

```
tests/
└── sample_docs/
    ├── Faculty test/          ← place faculty PDFs here
    │   ├── question_paper.pdf
    │   └── rubric.pdf
    └── student_answers/       ← place answer sheets here
        └── sample_sheet.pdf
```

---

## What to Check

| Checkpoint | Pass Condition |
|---|---|
| OCR extraction | `raw_text` is non-empty, `method` is correct |
| Doc type detection | Type matches expected (rubric/question_paper) |
| QP parsing | Q1, Q2 keys present with question_text and marks |
| Rubric parsing | keywords[] and expected_concepts[] populated |
| Rule Builder JSON | questions[] array with rules[] populated |
| Alignment | evaluation_items[] maps rubric to student answers |
