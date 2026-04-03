const express = require('express');
const router = express.Router();
const Rubric = require('../models/Rubric');
const { protect, authorize } = require('../middleware/auth');
const { uploadRubric } = require('../middleware/upload');

// ── POST /api/rubric/upload ───────────────────────────────────────────────────
// Protected route: Only logged in faculty can create rubrics.
// Expects: form-data with `title`, `question`, `keywords` (stringified array or comma-separated), `maxScore`, and `rubricFile` (PDF).
router.post('/upload', protect, authorize('faculty', 'admin'), uploadRubric.single('rubricFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'A Rubric PDF file is required' });
        }

        const { title, question, maxScore } = req.body;
        let { keywords } = req.body;

        if (!title || !question || !keywords || maxScore === undefined) {
            return res.status(400).json({ success: false, error: 'title, question, keywords, and maxScore are required' });
        }

        // Handle stringified arrays from form-data
        if (typeof keywords === 'string') {
            try {
                keywords = JSON.parse(keywords);
            } catch (e) {
                // assume comma separated
                keywords = keywords.split(',');
            }
        }

        if (!Array.isArray(keywords) || keywords.length === 0) {
            return res.status(400).json({ success: false, error: 'keywords must be a non-empty array of strings' });
        }

        const rubric = await Rubric.create({
            title: title.trim(),
            question: question.trim(),
            keywords: keywords.map((k) => k.trim()).filter(Boolean),
            pdfPath: req.file.path,
            maxScore: Number(maxScore),
        });

        return res.status(201).json({ success: true, id: rubric._id, title: rubric.title, message: `Rubric saved successfully` });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


// ── GET /api/rubric ───────────────────────────────────────────────────────────
// Protected route: Only logged in faculty can view the rubric list.
router.get('/', protect, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const rubrics = await Rubric.find(
            {},
            { title: 1, question: 1, maxScore: 1, createdAt: 1 }
        ).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: rubrics.length,
            rubrics: rubrics.map((r) => ({
                id: r._id,
                title: r.title,
                question: r.question,
                maxScore: r.maxScore,
                createdAt: r.createdAt,
            })),
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


// ── GET /api/rubric/:id ───────────────────────────────────────────────────────
// "Build assessment selection backend" — FETCH FULL RUBRIC
// Returns the complete rubric including keywords and expectedAnswer.
// The grader engine fetches this to populate Phase 4 + Phase 5 inputs.
//
// Response 200:
//   { success: true, rubric: { id, title, question, keywords, expectedAnswer, maxScore, createdAt } }
//
// Response 404:
//   { success: false, error: 'Rubric not found' }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const rubric = await Rubric.findById(req.params.id);

        if (!rubric) {
            return res.status(404).json({ success: false, error: 'Rubric not found' });
        }

        return res.status(200).json({
            success: true,
            rubric: {
                id: rubric._id,
                title: rubric.title,
                question: rubric.question,
                keywords: rubric.keywords,
                pdfPath: rubric.pdfPath,
                maxScore: rubric.maxScore,
                createdAt: rubric.createdAt,
            },
        });
    } catch (err) {
        // Invalid ObjectId format
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, error: 'Rubric not found' });
        }
        console.error('[GET /api/rubric/:id]', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


module.exports = router;
