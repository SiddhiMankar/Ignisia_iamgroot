# Agent Handoff Summary: Ignisia AI Grading Engine

**Context for the Incoming Agent:** 
You are taking over the ongoing development of the **Ignisia Document Intelligence & Grading Pipeline**. The core goal is to take a Faculty Rubric PDF and heavily structured Student Answer Sheet PDFs, convert them into rich JSON using OCR/LLMs, and perform semantic similarity grading via Vector Embeddings.

---

## 🏗️ Architecture Setup
The workspace is a monorepo booted from root via a concurrently script: \`npm run dev\`
- **Frontend (`/frontend`)**: React + Vite (Port 5173). Calls \`VITE_API_BASE_URL\` (Port 5001).
- **Backend (`/backend`)**: Node.js + Express (Port 5001). Handles \`multipart/form-data\` uploads (Multer) saved to \`/uploads\` with absolute pathing, connects to MongoDB Atlas, and proxies ML work to FastAPI.
- **AI Engine (`/ai-engine` & `/ocr_v2`)**: Python FastAPI (Port 8000). Runs PyMuPDF conversion, OpenCV image stabilization, EasyOCR extraction, Gemini API text-cleaning/enrichment, and ChromaDB vector operations.

---

## ✅ What is COMPLETED (The "Faculty Path")
We have successfully built and verified the complete end-to-end flow for the **Teacher Rubric**:
1. **Frontend Upload**: User uploads a Faculty outline/rubric via \`FacultySetup.jsx\`.
2. **Structuring (`teacher_parser.py`)**: The raw OCR text is heavily processed into an academic JSON schema containing: `question_type`, `marks`, `keywords`, `alternate_phrases`, and AI-enriched `concept_meaning`.
3. **MongoDB Storage (`sessionController.js`)**: The backend successfully saves this rich JSON to MongoDB Atlas as a `RubricDocument`.
4. **Vector Embedding (`embedding_pipeline.py`)**: A background process is triggered via `/api/faculty/embed`. Python loads the JSON from MongoDB, uses **Google Gemini** to embed the points, and stores the vectors inside a local `ai-engine/chroma_db/` instance under the collection `rubrics`.

*(Note: If you need to view the vectors in the terminal to verify, run `python view_chroma.py` in the `ai-engine` folder).*

---

## 🚧 What is PENDING (The "Student Path" & Grading)
The next immediate priority is completing the exact same flow for the actual Student answers to perform the grading:
1. **Student OCR to DB**: The `StudentExtraction.jsx` UI successfully sends a student answer sheet to the backend, and Python OCR extracts it, but **it is not yet being saved to MongoDB**. We need a `StudentSubmission` schema in MongoDB.
2. **Student Embeddings**: We must embed the structured student answers using the same Gemini embedding pipeline.
3. **Semantic Querying**: Using the student embeddings, query ChromaDB's `rubrics` collection to match the student's answer against the stored Faculty rubric criteria.
4. **Scoring Logic**: Return a calculated grade/score based on vector similarity and required keywords, and persist that final score to MongoDB.

---

## ⚠️ CRITICAL GOTCHAS (Read Before Coding!)
- **Gemini Model 404 Bug**: When using `genai.embed_content()`, the API string MUST be exactly `"models/gemini-embedding-001"`. Using the standard `"models/text-embedding-004"` or `"models/embedding-001"` on this specific user's Google Cloud account throws a 404 Model Not Found error. I already fixed this in `embedding_pipeline.py`. Don't revert it!
- **Environment Variables**:
  - `backend/.env` holds the `MONGODB_URI` (Currently maps to Atlas).
  - `ai-engine/.env` holds the `GEMINI_API_KEY`. 
  - `ai-engine/main.py` explicitly forces a `load_dotenv()` on line 1. Do not remove this, or background pipelines will crash with "Missing API Key" errors.
- **File Paths**: All API endpoints proxying files from Node.js to Python must use **absolute paths** across the file system to avoid `File not found` errors.

Good luck agent! The foundation is rock solid, you just need to wire up the student similarities!
