# System Integration Blueprint: Rubric-Driven Pipeline (v3)

## 1. End-to-End System Flow

```
[ React (Vite) ]   <---JSON--->   [ Node.js (Express) ]   <---HTTP/Webhook--->   [ Python (FastAPI) ]
  Dashboard UI                       MongoDB + Routing                              ML Pipeline
```

**Step-by-Step Flow:**

1. **Session Setup** → Faculty creates an `EvaluationSession` + defines `Questions` + `Rubric` rules via React.
2. **File Upload** → Faculty uploads PDF answer sheets. Node.js saves files and creates a `Submission` document in MongoDB.
3. **Pipeline Trigger** → `orchestrationService.js` immediately fires an HTTP POST to Python FastAPI with the file path + rubric JSON.
4. **Stage 1 — Document Intelligence** → Python extracts text from PDFs (native or OCR fallback). Parsers structure the raw text into clean question/rubric/answer dictionaries. `align_question_answer.py` merges them into an `evaluation_items` array.
5. **Stage 2 — Semantic Clustering** → `clustering.py` embeds all student answers into vector space using `SentenceTransformers`, then runs DBSCAN to group semantically similar answers.
6. **Stage 3 — LLM Evaluation** → Gemini 1.5 Flash evaluates only the representative answer from each cluster against the rubric. Returns structured JSON: `score`, `confidence`, `flags`, `explanation`.
7. **Webhook Callback** → Python POSTs results to `Node /api/internal/ai-callback`.
8. **Persistence** → Node.js stores clusters + scores to MongoDB. Updates session status to `READY_FOR_REVIEW`.
9. **Faculty Dashboard** → React fetches clusters from `GET /api/sessions/:id/clusters` and renders the approval UI.

---

## 2. API Contracts

### Node.js → Python (Trigger Payload)
```json
{
  "examId": "eval_8899",
  "files": ["/uploads/scan_abc.pdf"],
  "rubric": {
    "question_1": {
      "max_marks": 5,
      "keywords": ["gravity", "force"],
      "expectedConcepts": ["acceleration caused by gravity"],
      "partialCreditRules": ["award 2 marks if concept mentioned without formula"]
    }
  }
}
```

### Python → Node.js (Webhook Callback)
```json
{
  "sessionId": "eval_8899",
  "status": "SUCCESS",
  "results": {
    "question_1": {
      "clusters": [
        {
          "clusterId": "cluster_0",
          "answers": [
            {"studentId": "sub_1", "rawText": "Gravity causes acceleration..."},
            {"studentId": "sub_4", "rawText": "Earth's gravitational pull..."}
          ],
          "evaluation": {
            "suggestedScore": 5,
            "confidence": 0.94,
            "flags": ["NONE"],
            "explainability": "Matched 'gravity' and 'force'. Concepts fully met."
          }
        }
      ]
    }
  }
}
```

---

## 3. Implementation Rules

| Rule | Rationale |
|---|---|
| No `subject` or `exam` abstraction | System is rubric-first, not academic-structure-first |
| AI evaluates cluster representatives only | Dramatically reduces Gemini API costs |
| Frontend never calls Python directly | Maintains clean decoupling and security |
| Node responds `202 Accepted` immediately | Prevents browser timeout while OCR runs |
| Gemini output is always forced to strict JSON | Prevents hallucination and ensures explainability |
