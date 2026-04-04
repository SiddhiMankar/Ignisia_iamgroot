const axios = require('axios');
const EvaluationSession = require('../models/EvaluationSession');
const Submission = require('../models/Submission');

class OrchestrationService {
  /**
   * Triggers the Python AI Engine natively when a new submission arrives
   */
  async triggerAIEvaluation(submissionId, sessionId) {
    try {
      console.log(`[Orchestration] Preparing to send Submission ${submissionId} to AI Engine...`);
      
      // In a real scenario, you would fetch real rubric data from DB here:
      // const questions = await Question.find({ sessionId });
      
      const aiPayload = {
        examId: sessionId.toString(),
        filePath: `uploads/${submissionId}.pdf`, // Replace with actual path in prod
        rubric: {
          "question_1": {
            "maxMarks": 5,
            "keywords": ["gravity", "force"],
            "expectedConcepts": ["Acceleration is caused by gravity"]
          }
        }
      };

      // Ensure your .env defines AI_ENGINE_URL=http://localhost:8000/api/evaluate
      const engineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/api/evaluate';
      
      // Non-blocking asynchronous POST to Python (FastAPI Background Tasks handle the wait)
      const response = await axios.post(engineUrl, aiPayload);
      
      console.log('[Orchestration] AI Trigger Acknowledged:', response.data);
      
      // Update Submission status to reflect processing
      await Submission.findByIdAndUpdate(submissionId, { status: 'SEGMENTING_OCR' });
      
      return true;
    } catch (error) {
      console.error('[Orchestration] Failed to trigger AI Engine:', error.message);
      await Submission.findByIdAndUpdate(submissionId, { status: 'ERROR' });
      return false;
    }
  }
}

module.exports = new OrchestrationService();
