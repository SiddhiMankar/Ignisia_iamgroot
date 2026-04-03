const express = require('express');
const router = express.Router();
const Rubric = require('../models/Rubric');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── POST /api/rubric ──────────────────────────────────────────────────────────
// Protected route: Only logged in faculty can upload a rubric PDF.
// Uses Multer middleware to accept the 'rubricFile' payload.
router.post('/', protect, authorize('faculty', 'admin'), upload.single('rubricFile'), async (req, res) => {
    try {
        const { title, question, maxScore } = req.body;

        if (!title || !question || maxScore === undefined) {
            return res.status(400).json({ success: false, error: 'title, question, and maxScore are required text fields' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'A PDF rubricFile is strictly required' });
        }

        const rubric = await Rubric.create({
            title: title.trim(),
            question: question.trim(),
            pdfPath: req.file.path, // Store the local path so ML team can access it
            maxScore: Number(maxScore),
        });

        return res.status(201).json({ 
            success: true, 
            id: rubric._id, 
            title: rubric.title, 
            pdfPath: rubric.pdfPath,
            message: `Rubric PDF saved successfully` 
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
});


// ── GET /api/rubric ───────────────────────────────────────────────────────────
// Protected route: Only logged in faculty can view the rubric list.
router.get('/', protect, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const rubrics = await Rubric.find(
            {},
            { title: 1, question: 1, maxScore: 1, pdfPath: 1, createdAt: 1 }
        ).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: rubrics.length,
            rubrics: rubrics.map((r) => ({
                id: r._id,
                title: r.title,
                question: r.question,
                maxScore: r.maxScore,
                pdfPath: r.pdfPath, // Provides the path for the frontend/ML to reference
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
                pdfPath: rubric.pdfPath, // Provides the path for the ML team to access the PDF
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
