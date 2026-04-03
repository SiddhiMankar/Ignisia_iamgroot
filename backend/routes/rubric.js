const express = require('express');
const router = express.Router();
const Rubric = require('../models/Rubric');

// ── POST /api/rubric ──────────────────────────────────────────────────────────
// "Build subject creation backend"
// Faculty creates a new grading rubric and saves it to MongoDB.
//
// Request body:
//   { title, question, keywords: string[], expectedAnswer?, maxScore }
//
// Response 201:
//   { success: true, id, title, message }
//
// Response 400:
//   { success: false, error: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { title, question, keywords, expectedAnswer, maxScore } = req.body;

        // ── Basic validation ───────────────────────────────────────────────
        if (!title || !question || !keywords || maxScore === undefined) {
            return res.status(400).json({
                success: false,
                error: 'title, question, keywords, and maxScore are required',
            });
        }

        if (!Array.isArray(keywords) || keywords.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'keywords must be a non-empty array of strings',
            });
        }

        if (typeof maxScore !== 'number' || maxScore < 1) {
            return res.status(400).json({
                success: false,
                error: 'maxScore must be a positive number',
            });
        }

        // ── Save to MongoDB ────────────────────────────────────────────────
        const rubric = await Rubric.create({
            title: title.trim(),
            question: question.trim(),
            keywords: keywords.map((k) => k.trim()).filter(Boolean),
            expectedAnswer: (expectedAnswer || '').trim(),
            maxScore,
        });

        return res.status(201).json({
            success: true,
            id: rubric._id,
            title: rubric.title,
            message: `Rubric "${rubric.title}" saved successfully`,
        });
    } catch (err) {
        // Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('[POST /api/rubric]', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


// ── GET /api/rubric ───────────────────────────────────────────────────────────
// "Build assessment selection backend" — LIST
// Returns a lightweight list of all rubrics for the faculty selection dropdown.
// Does NOT return keywords/expectedAnswer to keep payload small.
//
// Response 200:
//   { success: true, count: number, rubrics: [{ id, title, question, maxScore, createdAt }] }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
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
        console.error('[GET /api/rubric]', err);
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
                expectedAnswer: rubric.expectedAnswer,
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
