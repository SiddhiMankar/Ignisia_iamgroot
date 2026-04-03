# Backend Architecture Blueprint (Node.js + Express)

## 1. Full Backend Folder Architecture

```text
/backend
│── /src
│   │── /config               # Environment variables, DB connection
│   │   │── db.js             # Mongoose connection logic
│   │   └── env.js            # Validation for process.env
│   │── /controllers          # Express request/response logic ONLY
│   │   │── authController.js
│   │   │── examController.js
│   │   │── rubricController.js
│   │   │── submissionController.js
│   │   │── reviewController.js
│   │   └── analyticsController.js
│   │── /middlewares          # Express middlewares
│   │   │── authMiddleware.js # JWT verification
│   │   │── uploadMiddleware.js # Multer config (PDF/Image)
│   │   └── errorMiddleware.js  # Global error handler
│   │── /models               # Mongoose schemas (Data shapes)
│   │   │── User.js           # Faculty / Admins
│   │   │── Subject.js        # e.g., "CS101"
│   │   │── Exam.js           # e.g., "Midsem Spring 2026"
│   │   │── Rubric.js         # Question-wise keywords/rules
│   │   │── Submission.js     # Top-level Answer Sheet (The PDF)
│   │   │── Answer.js         # Extracted Answer (per question)
│   │   │── Cluster.js        # Grouping of similar Answers
│   │   └── Analytics.js      # Usage & Time metadata
│   │── /routes               # Endpoint definitions mapping to controllers
│   │   │── index.js          # Main router merging all below
│   │   │── authRoutes.js
│   │   │── examRoutes.js
│   │   │── rubricRoutes.js
│   │   │── submissionRoutes.js
│   │   └── reviewRoutes.js
│   │── /services             # 🧠 Heavy Business Logic & AI Coordination
│   │   │── orchestrationService.js # ⭐ Central pipeline coordinator
│   │   │── aiClientService.js      # Axios client for Python AI Engine
│   │   │── rubricService.js
│   │   └── examService.js
│   │── /utils                # Helpers
│   │   │── logger.js         # Pino or Winston
│   │   └── response.js       # Standardized JSON response formatter
│   └── server.js             # Entry point (Express app setup)
│── .env.example
│── package.json
└── README.md                 # Backend specific setup instructions
```

---

## 2. Component Responsibilities

*   **Routes**: Strictly define `HTTP METHOD`, `URL`, `Middleware`, and the `Controller` function. No logic here.
*   **Controllers**: Extract data from `req.body` or `req.params`, pass it to a **Service**, and return the service's output via `res.status(200).json()`. They handle HTTP layer concerns.
*   **Services**: The brain of the backend. They hold pure business logic. If you need to switch from Express to a CLI tool, you only rewrite Controllers; Services remain identical.
*   **Models**: Mongoose schemas defining defaults, indexes (e.g., indexing on `examId`), and virtuals.
*   **Middlewares**: Interceptors. E.g., `authMiddleware` intercepts routes checking for `Bearer token`. `uploadMiddleware` intercepts `multipart/form-data`.

---

## 3. List of Key API Endpoints

### Auth & Setup
| Method | Endpoint | Protected? | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | No | Authenticate faculty -> Returns JWT |
| `POST` | `/api/v1/subjects` | Yes | Create a new Subject |
| `POST` | `/api/v1/exams` | Yes | Create an Exam under a Subject |

### Rubric & Ingestion
| Method | Endpoint | Protected? | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/rubrics/:examId` | Yes | Upload question-by-question Rubric |
| `POST` | `/api/v1/submissions/:examId`| Yes | Upload raw PDF answer sheets (Multer) |

### Review & Analytics
| Method | Endpoint | Protected? | Description |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/v1/reviews/:examId/clusters` | Yes | Get UI data for clustered answers |
| `POST` | `/api/v1/reviews/approve` | Yes | Override/Approve AI cluster score |
| `GET`  | `/api/v1/analytics/:examId` | Yes | Fetch processing time vs manual time |

---

## 4. The Request Flows (Step-by-Step)

### A. Exam & Rubric Creation
1. Fontend sends Subject Info -> `examController` creates DB record -> Returns `examId`.
2. Frontend sends Rubric JSON -> `rubricController` validates JSON via Joi/Zod -> Stores in `Rubric` collection linked to `examId`.

### B. Upload & Evaluation (The ⭐ `orchestrationService.js` Flow)
This is the most critical pipeline in your project.

1. **Upload Phase**: Faculty uploads a ZIP or PDF of Answer Sheets to `/api/v1/submissions/:examId`.
2. **Init**: `submissionController` writes file to local `/uploads` (or S3), creates a `Submission` document marked `STATUS: PENDING`, and triggers `orchestrationService.processSubmission(submissionId)`. Controller *immediately responds 202 Accepted* (async processing).
3. **Orchestration Pipeline (`orchestrationService.js`)**:
    *   **Step 1:** Calls `aiClientService.processOCR(filePath)`. Python extracts and segments answers. Node.js saves these as `Answer` docs.
    *   **Step 2:** Calls `aiClientService.generateEmbeddings(answerIds)`. Python embeds them, Node.js updates the DB.
    *   **Step 3:** Calls `aiClientService.clusterAnswers(examId)`. Python groups answers. Node.js creates `Cluster` docs.
    *   **Step 4:** Node.js triggers Python to evaluate: `aiClientService.generateScoreSuggestions(clusterId, rubricId)`.
    *   **Step 5:** Pipeline finishes. `Submission` document marked `STATUS: READY_FOR_REVIEW`.
4. *(Hackathon Tip: To save time, you can implement this synchronously to avoid WebSocket setups, but async is safer).*

### C. Review Workflow
1. Faculty visits Dashboard -> Frontend polls `GET /api/v1/reviews/:examId/clusters`.
2. UI displays Cluster #1 (e.g., 5 identical answers) and the AI's suggested score.
3. Faculty edits score -> `POST /api/v1/reviews/approve` -> Updates the `Score` model for all 5 mapped `Answer` documents simultaneously. Massive time save!

---

## 5. File Setup Priority (Clean Main Branch Strategy)

To ensure your hackathon MVP actually finishes, create files in this precise order:

*   **Priority 1: Core Skeleton (Hour 1)**
    *   `server.js`, `utils/logger.js`, `middlewares/errorMiddleware.js`. Get the server listening on Port 5000 gracefully.
*   **Priority 2: The Data Layer (Hour 1-2)**
    *   `config/db.js` + `models/Exam.js`, `models/Submission.js`, `models/Cluster.js`.
*   **Priority 3: The API Contracts (Hour 2)**
    *   Setup the `/routes` with empty mock `controllers`. E.g., `res.json({ message: "Mocked Clusters" })`. This allows frontend to start building the UI immediately.
*   **Priority 4: Integration (Hour 3+)**
    *   Build out `orchestrationService.js` and `aiClientService.js`. Only focus on this once the Python AI API begins returning valid JSON strings.

*This structure ensures that the Frontend, Backend, and ML engineers can work in complete isolation during the hackathon based on agreed-upon mock JSON contracts.*
