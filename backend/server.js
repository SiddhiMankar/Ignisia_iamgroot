const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection failed:', err.message));
} else {
  console.warn('⚠️  MONGODB_URI not set in .env — MongoDB features will be disabled');
}

app.use(cors());
app.use(express.json());

// Import & Apply Routes
const sessionRoutes = require('./src/routes/sessionRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');

app.use('/api/sessions', sessionRoutes);
app.use('/api/submissions', submissionRoutes);

// Mock Evaluation Route (to unblock frontend early)
app.get('/api/reviews/mock', (req, res) => {
    res.json({
        clusters: [
            {
                id: "c1",
                answers: ["It accelerates down via gravity", "Gravity acceleration"],
                suggestedScore: 5,
                confidence: 0.95
            }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
});
