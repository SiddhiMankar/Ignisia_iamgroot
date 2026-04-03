const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationSession',
    required: true
  },
  filePath: {
    type: String,
    required: true // The path to the uploaded PDF / Image
  },
  status: {
    type: String,
    enum: ['UPLOADED', 'SEGMENTING_OCR', 'EVALUATED', 'ERROR'],
    default: 'UPLOADED'
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
