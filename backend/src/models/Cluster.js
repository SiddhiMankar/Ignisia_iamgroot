const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  // The raw strings or extracted text that got grouped here
  answers: [{
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    },
    rawText: String,
    cleanText: String,
    confidenceMatch: Number
  }],
  aiEvaluation: {
    suggestedScore: Number,
    edgeCaseFlags: [String],
    explainability: {
      matchedConcepts: [String],
      missingConcepts: [String],
      rationale: String
    }
  },
  humanEvaluation: {
    approvedScore: {
      type: Number,
      default: null // Null means pending review
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Cluster', clusterSchema);
