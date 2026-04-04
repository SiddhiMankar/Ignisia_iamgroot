const Submission = require('../models/Submission');
const orchestrationService = require('../services/orchestrationService');

exports.uploadSubmission = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No answer sheet file provided' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Evaluation sessionId is required' });
    }

    // 1. Create a DB record for this specific upload
    const submission = await Submission.create({
      sessionId,
      filePath: file.path,
      status: 'UPLOADED'
    });

    console.log(`[Submission] File uploaded successfully: ${file.path}`);

    // 2. Immediately fire the AI pipeline trigger!
    // We don't await this so the user isn't holding the connection
    orchestrationService.triggerAIEvaluation(submission._id, sessionId);

    // 3. Respond back to React instantly
    res.status(202).json({
      message: 'File uploaded and AI evaluation has been queued.',
      submissionId: submission._id
    });

  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({ error: 'Server failed to process upload' });
  }
};
