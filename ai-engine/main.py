from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.pipeline import run_grading_pipeline

app = FastAPI(title="AI Grading Engine API")

class EvaluationRequest(BaseModel):
    examId: str
    filePath: str
    rubric: Dict[str, Any]

def process_and_callback(request: EvaluationRequest):
    """
    Background worker that runs the ML pipeline and then 
    would normally send an HTTP POST back to Node.js
    """
    results = run_grading_pipeline(request.examId, request.filePath, request.rubric)
    
    # In full production, you would do:
    # requests.post("http://nodejs:5000/api/internal/ai-callback", json=results)
    print(f"PIPELINE FINISHED for {request.examId}. Results:\n{results}")

@app.get("/")
def read_root():
    return {"message": "AI Engine is up and running!"}

@app.post("/api/evaluate")
def evaluate_exam(request: EvaluationRequest, background_tasks: BackgroundTasks):
    # This immediately returns 202 Accepted, and processes AI in the background!
    background_tasks.add_task(process_and_callback, request)
    return {"status": "Processing started", "examId": request.examId}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
