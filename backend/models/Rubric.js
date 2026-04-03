const mongoose = require('mongoose');

/**
 * Rubric — the grading criteria that faculty define before uploading papers.
 *
 * A rubric is equivalent to what was called "subject" in the original checklist.
 * Faculty create a rubric once per question, then select it when uploading
 * answer sheets. The grader pipeline uses `keywords` for highlighting and
 * `expectedAnswer` for edge-case detection.
 */
const rubricSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Rubric title is required'],
            trim: true,
            maxlength: [120, 'Title cannot exceed 120 characters'],
        },

        question: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },

        keywords: {
            type: [String],
            required: [true, 'At least one keyword is required'],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: 'keywords must be a non-empty array',
            },
        },

        pdfPath: {
            type: String,
            required: [true, 'Rubric PDF file path is required'],
        },

        maxScore: {
            type: Number,
            required: [true, 'maxScore is required'],
            min: [1, 'maxScore must be at least 1'],
        },
    },
    {
        timestamps: true, // adds createdAt + updatedAt automatically
    }
);

module.exports = mongoose.model('Rubric', rubricSchema);
