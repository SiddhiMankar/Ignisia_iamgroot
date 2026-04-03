const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./db');
const rubricRouter = require('./routes/rubric');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Routes ────────────────────────────────────────────────────────────────────

// Rubric CRUD — POST /api/rubric, GET /api/rubric, GET /api/rubric/:id
app.use('/api/rubric', rubricRouter);

// Mock Evaluation Route (keeps frontend unblocked during dev)
app.get('/api/reviews/mock', (req, res) => {
    res.json({
        clusters: [
            {
                id: 'c1',
                answers: ['It accelerates down via gravity', 'Gravity acceleration'],
                suggestedScore: 5,
                confidence: 0.95,
            },
        ],
    });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

