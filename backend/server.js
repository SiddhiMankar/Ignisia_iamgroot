const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
