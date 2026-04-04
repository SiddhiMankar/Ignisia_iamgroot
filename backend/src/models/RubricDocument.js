const mongoose = require('mongoose');

/**
 * RubricPoint — represents a single atomic marking criterion extracted from OCR.
 * Designed to support semantic comparison with student answers via embeddings.
 */
const rubricPointSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'concept_point'  // concept_point | example_match
  },
  point: {
    type: String,
    required: true          // The core marking criterion text
  },
  marks: {
    type: Number,
    default: null           // Marks allocated to this specific point
  },
  keywords: [String],       // Key terms extracted from the point
  alternate_phrases: [String], // Valid alternate student phrasings
  concept_meaning: {
    type: String,
    default: ''             // Semantic rephrasing for embedding comparison
  }
}, { _id: false });

/**
 * RubricQuestion — one structured question with its rubric from a teacher document.
 */
const rubricQuestionSchema = new mongoose.Schema({
  question_number: Number,
  question_text:   { type: String, required: true },
  question_type:   { type: String, default: 'short_concept' }, // definition | explanation | reasoning | ...
  max_marks:       { type: Number, default: null },
  rubric_points:   [rubricPointSchema]
}, { _id: false });

/**
 * RubricDocument — top-level document stored after faculty uploads a rubric/QP PDF.
 * This is the source of truth for the grading pipeline.
 * Linked to an EvaluationSession.
 *
 * NOTE: This is a NEW collection and does not modify any existing collections.
 */
const rubricDocumentSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationSession',
    required: false  // optional for standalone uploads
  },
  sessionTitle: {
    type: String,
    default: 'Untitled Session'
  },
  document_type: {
    type: String,
    enum: ['rubric', 'question_paper', 'marking_scheme', 'model_answer'],
    default: 'rubric'
  },
  source_file: {
    type: String,    // Original uploaded filename
    default: ''
  },
  questions: [rubricQuestionSchema],
  embedding_status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'DONE', 'FAILED'],
    default: 'PENDING'  // Will be updated once ChromaDB embeddings are generated
  },
  meta: {
    page_count: { type: Number, default: 0 },
    method:     { type: String, default: 'ocr_v2' }
  }
}, { timestamps: true });

module.exports = mongoose.model('RubricDocument', rubricDocumentSchema);
