const Submission = require('../models/Submission');
const orchestrationService = require('../services/orchestrationService');

exports.uploadSubmission = async (req, res) => {
  try {
    const { sessionId, documentType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No answer sheet file provided' });
    if (!sessionId) return res.status(400).json({ error: 'Evaluation sessionId is required' });

    const submission = await Submission.create({ sessionId, filePath: file.path, status: 'UPLOADED' });
    console.log(`[Submission] File uploaded: ${file.path}`);
    orchestrationService.triggerAIEvaluation(submission._id, sessionId, documentType || 'answer_sheet');

    res.status(202).json({ message: 'File uploaded and AI evaluation queued.', submissionId: submission._id });
  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({ error: 'Server failed to process upload' });
  }
};

/**
 * BATCH UPLOAD — accepts multiple student PDFs in one multipart request.
 * Creates a DB Submission record for each file and fires the AI pipeline in parallel.
 */
exports.uploadBatchSubmissions = async (req, res) => {
  try {
    const { sessionId, documentType } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No answer sheet files provided' });
    }

    const sid = sessionId || 'DEMO_SESSION_ID';

    const submissions = await Promise.all(
      files.map(async (file) => {
        const submission = await Submission.create({
          sessionId: sid,
          filePath: file.path,
          originalName: file.originalname,
          status: 'UPLOADED'
        });
        // Non-blocking AI pipeline trigger per file
        orchestrationService.triggerAIEvaluation(submission._id, sid, documentType || 'answer_sheet');
        console.log(`[Batch] Queued ${file.originalname} → ${submission._id}`);
        return { submissionId: submission._id, filename: file.originalname };
      })
    );

    res.status(202).json({ message: `${files.length} file(s) queued for evaluation.`, submissions });
  } catch (error) {
    console.error('[Batch Upload Error]', error);
    res.status(500).json({ error: 'Server failed to process batch upload' });
  }
};
