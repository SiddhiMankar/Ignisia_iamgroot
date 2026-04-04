const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// Standard user-facing routes
router.post('/create', sessionController.createSessionWithRubrics);
router.post('/trigger-pipeline', sessionController.triggerPipeline);
router.get('/:sessionId/clusters', sessionController.getClusters);
router.post('/faculty/parse', uploadMiddleware.single('file'), sessionController.parseFacultyDocument);

// Internal protected webhook route just for Python
router.post('/internal/ai-callback', sessionController.aiCallbackWebhook);

module.exports = router;
