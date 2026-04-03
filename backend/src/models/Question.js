const mongoose = require('mongoose');

// The Rubric is deeply nested directly into the Question as subdocuments
const rubricRuleSchema = new mongoose.Schema({
  ruleType: {
    type: String,
    enum: ['KEYWORD', 'CONCEPT', 'FORMULA', 'EDGE_CASE'],
    required: true
  },
  description: {
    type: String, 
    required: true // e.g. "Mentioned the word Gravity"
  },
  pointsAllocated: {
    type: Number,
    required: true // Can be positive (award) or negative (penalty)
  }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationSession',
    required: true
  },
  questionNumber: {
    type: String, // e.g., "1a", "Q2"
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  rubric: [rubricRuleSchema]
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
