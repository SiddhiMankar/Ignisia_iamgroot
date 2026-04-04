const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const submissionController = require('../controllers/submissionController');

// Single upload — { sessionId, answerSheet: (File) }
router.post('/upload', uploadMiddleware.single('answerSheet'), submissionController.uploadSubmission);

// Batch upload — { sessionId, answerSheets: (File[]) } — up to 30 PDFs at once
router.post('/upload-batch', uploadMiddleware.array('answerSheets', 30), submissionController.uploadBatchSubmissions);

module.exports = router;
