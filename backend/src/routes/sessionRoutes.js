const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Standard user-facing routes
router.post('/create', sessionController.createSessionWithRubrics);
router.post('/trigger-pipeline', sessionController.triggerPipeline);
router.get('/:sessionId/clusters', sessionController.getClusters);

// Internal protected webhook route just for Python
router.post('/internal/ai-callback', sessionController.aiCallbackWebhook);

module.exports = router;
