const axios = require('axios');
const EvaluationSession = require('../models/EvaluationSession');
const Submission = require('../models/Submission');

class OrchestrationService {
  /**
   * Triggers the Python AI Engine natively when a new submission arrives
   */
  async triggerAIEvaluation(submissionId, sessionId, documentType = 'answer_sheet') {
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
        },
        documentType: documentType
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

  /**
   * Proxies a faculty document (rubric/QP) to the AI engine for structuring
   */
  async parseFacultyDocument(filePath, documentType, sessionTitle) {
    try {
      const engineUrl = (process.env.AI_ENGINE_URL || 'http://localhost:8000/api/evaluate').replace('/evaluate', '/faculty/parse');
      
      const response = await axios.post(engineUrl, {
        filePath,
        documentType,
        sessionTitle
      });
      
      return response.data;
    } catch (error) {
      console.error('[Orchestration] Failed to parse faculty document:', error.message);
      throw error;
    }
  }

  /**
   * Prompts the AI Engine to generate embeddings for a saved RubricDocument
   */
  async triggerRubricEmbedding(rubricDocumentId) {
    try {
      const engineUrl = (process.env.AI_ENGINE_URL || 'http://localhost:8000/api/evaluate').replace('/evaluate', '/faculty/embed');
      
      const response = await axios.post(engineUrl, {
        rubricDocumentId: rubricDocumentId.toString()
      });
      console.log('[Orchestration] Rubric embedding triggered:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Orchestration] Failed to trigger rubric embedding:', error.message);
      // We don't throw an error here because it runs entirely in the background after the user hits upload.
      return null;
    }
  }
}

module.exports = new OrchestrationService();
