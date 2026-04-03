# Complete System Integration Blueprint

## 1. End-to-End System Flow & Data Architecture

The system operates across three primary nodes: **React** (State/UI), **Node.js** (Persistence/Routing), and **Python** (Compute/ML).

```text
[ React Frontend ]  <-- (REST / JSON) -->  [ Node.js Backend ]  <-- (REST / Files) -->  [ Python AI Engine ]
        |                                           |                                           |
  (User Actions)                              (MongoDB Atlas)                             (ML Pipelines)
  - UI State                                  - Persist Rules                             - Heavy Compute
  - Polling for updates                       - Auth / Validation                         - Output JSON
```

**How Files Move:**
1. React uses `FormData` to POST a `.zip` or `.pdf` to Node.js.
2. Node.js `multer` saves it to a local disk or S3 bucket, creating a `Submission` document.
3. Node.js sends the *FilePath* or *S3 URL* to Python. (Avoid sending binary blobs via HTTP JSON).
4. Python reads the file directly from disk/bucket, processes it, and returns the JSON result.

---

## 2. Request / Response Lifecycles

### A. Login, Exam & Rubric Setup
*   **React:** `POST /api/auth/login` -> Node generates JWT -> React saves to Context/LocalStorage.
*   **React:** `POST /api/exams` (`{ name: 'Midsem', subject: 'CS101' }`) -> Node persists to DB -> returns `{ examId: "ex_123" }`.
*   **React:** `POST /api/rubrics/ex_123` (`{ Q1: { marks: 5, expected: ["gravity"] } }`) -> Node saves rubric -> returns `201 Created`.

### B. Upload & Evaluation Trigger (The Core Handoff)
*   **React:** User uploads sheets via Drag-and-Drop. UI shows "Uploading..."
*   **React:** `POST /api/submissions/ex_123` (multipart/form-data).
*   **Node.js:** Receives file, saves to disk. Marks DB as `PENDING`. Responds to React `202 Accepted` immediately so the UI doesn't hang.
*   **Node.js (Async):** Triggers `orchestrationService.js`, calling `POST /ai/process` to Python.
*   **React (Polling):** While Node/Python work, React polls `GET /api/submissions/ex_123/status` every 3 seconds. UI shows "Processing OCR...", "Clustering...".

### C. Evaluation & AI Communication Strategy (Node ↔ Python)
Python is slow. Node is fast. We separate them via an HTTP callback wrapper.

**Node.js to Python Payload:**
```json
// POST http://localhost:8000/api/evaluate
{
  "examId": "ex_123",
  "filePath": "/mounted/volume/uploads/sheet1.pdf",
  "rubric": { "Q1": { "keywords": ["gravity"], "maxMarks": 5 } },
  "webhookUrl": "http://node-backend:5000/api/internal/ai-callback"
}
```
**Python back to Node.js Payload (The Webhook):**
```json
// POST http://node-backend:5000/api/internal/ai-callback
{
  "examId": "ex_123",
  "status": "COMPLETED",
  "results": {
    "clusters": [
      {
        "clusterId": "cluster_99",
        "questionId": "Q1",
        "answerTexts": ["It accelerates via gravity", "Gravity acceleration"],
        "suggestedScore": 5,
        "flags": [],
        "explanation": "Matched 'gravity' perfectly."
      }
    ]
  }
}
// Node.js then saves this to MongoDB and updates Submission status to 'READY_FOR_REVIEW'.
```

### D. Faculty Review & Analytics
*   **React:** Faculty opens Review UI. Calls `GET /api/reviews/ex_123/clusters`.
*   **React:** Renders the AI's clusters. Faculty overrides Score from 5 to 4.
*   **React:** `POST /api/reviews/approve` (`{ clusterId: "cluster_99", finalScore: 4 }`).
*   **Node.js:** Updates the DB. Applies `finalScore = 4` to ALL answers tied to `cluster_99`.

---

## 3. Execution Order (What to Build 1st, 2nd, 3rd)

Follow this exact **Hackathon Execution Mode** sequence to guarantee a working MVP.

### Phase 1: The Scaffolding & API Contracts (Hours 1-3)
1. **Empty Repos:** Initialize Frontend, Backend, AI Engine directories.
2. **Mocking Data:** Node.js engineer hardcodes a fake `clusters` JSON payload and returns it via `GET /api/reviews/mock`.
3. **Frontend Unblocking:** React engineer takes the mock JSON and starts building the massive `FacultyReviewDashboard.jsx` (The Wow Factor). They do not need a working backend/AI for this.

### Phase 2: The Core Python AI Engine (Hours 4-12)
1. **Isolated ML Script:** The AI engineer builds `pipeline.py` as a raw terminal script. Run images through it. Prove OCR -> Embeddings -> Clustering works.
2. **FastAPI Wrapper:** Wrap the script in `/api/evaluate`. Expose it.

### Phase 3: The Backend Orchestrator (Hours 13-18)
1. **DB Setup:** Build the Mongoose Schemas (`Exam`, `Rubric`, `Cluster`).
2. **Multer Upload:** Build the `POST /api/submissions` route that saves PDFs.
3. **The Bridge:** Build the exact Axios call from Node to Python, and the Webhook from Python back to Node. Test the vertical slice.

### Phase 4: Frontend Assembly (Hours 19-22)
1. Replace frontend API endpoints from `/mock` to reality.
2. Build the secondary screens: `Login.jsx`, `SubjectSetup.jsx`, `RubricBuilder.jsx`.

### Phase 5: Polish & Edge Cases (Final Hours)
1. Implement polling animations in the UI.
2. Add Analytics Dashboard.
3. Handle failure states (What if OCR fails?).

---

## 4. Common Integration Mistakes to Avoid

*   **Mistake #1: Pushing massive base64 image strings through JSON.** 
    *   *Fix:* Node.js should save the file locally or to S3, and just send the URL/Path string to Python. 
*   **Mistake #2: Waiting synchronously for AI.** 
    *   *Fix:* If Node.js uses `await axios.post('python-engine')`, the request will timeout after 30 seconds for large PDFs. Node must return `202 Accepted` to React immediately, while Python runs in the background. React must poll for completion.
*   **Mistake #3: Hardcoding UI to reality too early.**
    *   *Fix:* React devs should use hardcoded JSON from Mockaroo for the first 12 hours so they don't get blocked by the ML engineer tuning the clustering algorithm.
*   **Mistake #4: MongoDB mapping confusion.**
    *   *Fix:* Relate everything downwards. Subject -> hasMany(Exams) -> hasMany(Submissions) -> hasMany(Answers) -> belongsTo(Clusters).

---

## 5. Clean Main-Branch Setup Strategy

1. **Root `package.json`**: Use tools like `concurrently` so a single command (`npm run dev:all`) spins up React, Node, and Python simultaneously for local testing.
2. **The "Judge Demo" Branch Constraint**:
    *   Never commit broken / intermediate code to `main`.
    *   At hour 12, merge an end-to-end "Happy Path" into `main` (even if it's janky). 
    *   If you introduce a breaking bug at hour 23, you check-out the stable `main` code you had at hour 12 and present that. A working minimal demo beats a broken advanced demo every time.
