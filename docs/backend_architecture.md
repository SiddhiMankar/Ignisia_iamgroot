# Backend Architecture Blueprint (v2 — Session Driven)

## Core Principle
The backend is purely a **data routing and orchestration layer**. It does not perform AI evaluation. It stores Evaluation Sessions, triggers the Python pipeline, and persists AI results.

---

## 1. Full Backend Folder Structure

```
/backend
│── /src
│   │── /config
│   │   └── db.js                    # MongoDB Atlas connection
│   │── /controllers
│   │   │── sessionController.js     # Create sessions, fetch clusters, AI callback webhook
│   │   └── submissionController.js  # Handle file uploads, trigger orchestrationService
│   │── /middlewares
│   │   └── uploadMiddleware.js      # Multer disk storage (PDF/JPG/PNG, 10MB limit)
│   │── /models
│   │   │── EvaluationSession.js     # Central session entity (title, status)
│   │   │── Question.js              # Question + embedded Rubric rules per session
│   │   │── Submission.js            # Tracks uploaded PDF file path + status
│   │   └── Cluster.js              # Stores AI cluster results + human decisions
│   │── /routes
│   │   │── sessionRoutes.js         # POST /create, POST /trigger, GET /:id/clusters
│   │   └── submissionRoutes.js      # POST /upload
│   │── /services
│   │   └── orchestrationService.js  # Packages rubric payload and POSTs to Python
│   └── server.js                    # Express bootstrap + routes
│── .env                             # MONGO_URI, JWT_SECRET, AI_ENGINE_URL
└── package.json
```

---

## 2. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/create` | Create a new Evaluation Session with Questions and Rubrics |
| `POST` | `/api/submissions/upload` | Upload PDF/Image answer sheets, auto-triggers AI |
| `GET` | `/api/sessions/:sessionId/clusters` | Fetch AI-processed clusters for faculty review |
| `POST` | `/api/sessions/internal/ai-callback` | Python webhook endpoint to persist AI results |

---

## 3. MongoDB Collections

| Collection | Purpose |
|---|---|
| `EvaluationSession` | Top-level session with title and status lifecycle |
| `Question` | Question text, marks, and nested rubric rules per session |
| `Submission` | Physical file reference linked to a session |
| `Cluster` | AI groupings with suggestedScore, flags, and human approval state |

---

## 4. Orchestration Flow

```
submissionController
  → Saves file to /uploads/
  → Creates Submission in MongoDB
  → Fires orchestrationService.triggerAIEvaluation()

orchestrationService
  → Builds rubric JSON payload from DB
  → POST to Python FastAPI (AI_ENGINE_URL)
  → Updates Submission status → "SEGMENTING_OCR"

aiCallbackWebhook (sessionController)
  → Parses Python cluster results
  → Creates Cluster documents in MongoDB
  → Updates EvaluationSession status → "READY_FOR_REVIEW"
```

---

## 5. Environment Variables (`.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ignisia_iamgroot
JWT_SECRET=super_secret_hackathon_key_99
AI_ENGINE_URL=http://localhost:8000/api/evaluate
```
