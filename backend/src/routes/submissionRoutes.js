const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const submissionController = require('../controllers/submissionController');

// Expects form-data with { sessionId: "...", answerSheet: (File) }
router.post('/upload', uploadMiddleware.single('answerSheet'), submissionController.uploadSubmission);

module.exports = router;
