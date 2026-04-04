const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./db');
const authRouter = require('./routes/auth');
const rubricRouter = require('./routes/rubric');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Routes ────────────────────────────────────────────────────────────────────

// Auth CRUD — POST /api/auth/login, POST /api/auth/signup
app.use('/api/auth', authRouter);

// Rubric CRUD — POST /api/rubric, GET /api/rubric, GET /api/rubric/:id
app.use('/api/rubric', rubricRouter);

// Evaluation & ML Pipeline Routes
const sessionRoutes = require('./src/routes/sessionRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');

app.use('/api/sessions', sessionRoutes);
app.use('/api/submissions', submissionRoutes);

// Mock Evaluation Route (keeps frontend unblocked during dev)
app.get('/api/reviews/mock', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'mock_data', 'clustering_results.json'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

