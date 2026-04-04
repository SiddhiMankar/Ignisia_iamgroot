const mongoose = require('mongoose');

const evaluationSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: "New Evaluation Session"
  },
  status: {
    type: String,
    enum: ['DRAFT', 'COLLECTING_UPLOADS', 'PROCESSING_AI', 'READY_FOR_REVIEW', 'COMPLETED'],
    default: 'DRAFT'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for MVP if auth isn't fully wired yet
  }
}, { timestamps: true });

module.exports = mongoose.model('EvaluationSession', evaluationSessionSchema);
