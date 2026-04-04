const EvaluationSession = require('../models/EvaluationSession');
const Submission = require('../models/Submission');
const Cluster = require('../models/Cluster');
const orchestrationService = require('../services/orchestrationService');

exports.triggerPipeline = async (req, res) => {
  try {
    const { sessionId, submissionId, documentType } = req.body;
    
    // Immediately respond to React so the browser doesn't spin and hang
    res.status(202).json({ 
      message: 'Evaluation pipeline triggered successfully. Processing in background.' 
    });

    // Execute heavy logic in background
    await orchestrationService.triggerAIEvaluation(submissionId, sessionId, documentType);

  } catch (error) {
    console.error(error);
    // Since we already responded 202, we can't send a 500. Error logging is crucial.
  }
};

/**
 * WEBHOOK ENDPOINT
 * Python FastAPI will POST to this route when the LLM finishes scoring
 */
exports.aiCallbackWebhook = async (req, res) => {
  try {
    const { sessionId, status, results } = req.body;
    console.log(`[Webhook] Received AI evaluation back for Session: ${sessionId}`);

    if (status !== 'SUCCESS') {
      console.warn(`[Webhook] Python reported failure for Session ${sessionId}`);
      return res.status(400).json({ message: 'Callback tracked as failed' });
    }

    // Process the returning Clusters and save them into the Database
    for (const [questionId, qData] of Object.entries(results)) {
      if (qData.clusters) {
        for (const aiCluster of qData.clusters) {
          
          await Cluster.create({
            questionId: null, // Hardcode/Mock mapping for MVP
            answers: aiCluster.answers.map(ans => ({
              rawText: ans.rawText,
              cleanText: ans.cleanText
            })),
            aiEvaluation: {
              suggestedScore: aiCluster.evaluation.suggestedScore,
              edgeCaseFlags: aiCluster.evaluation.flags,
              explainability: {
                rationale: aiCluster.evaluation.explainability
              }
            }
          });
        }
      }
    }

    // Update Session status so frontend stops polling
    await EvaluationSession.findByIdAndUpdate(sessionId, { status: 'READY_FOR_REVIEW' });

    res.status(200).json({ message: 'Webhook ingested heavily successfully' });
  } catch (error) {
    console.error('[Webhook Error]', error);
    res.status(500).json({ error: 'Failed to process AI results' });
  }
};

/**
 * CREATE NEW EVALUATION SESSION
 * Accepts a title and an array of questions with their rubrics.
 */
exports.createSessionWithRubrics = async (req, res) => {
  try {
    const { title, questions } = req.body;
    
    // 1. Create the overarching Session container
    const session = await EvaluationSession.create({
      title: title || 'New Evaluation Session',
      status: 'COLLECTING_UPLOADS'
    });

    // 2. Attach Rubrics to Questions and link to the Session
    const Question = require('../models/Question'); // dynamically import
    
    if (questions && questions.length > 0) {
      const qDocs = questions.map(q => ({
        sessionId: session._id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        maxMarks: q.maxMarks,
        rubric: q.rubric // Array of rule objects
      }));
      await Question.insertMany(qDocs);
    }

    res.status(201).json({ 
      message: 'Evaluation Session created successfully',
      sessionId: session._id 
    });

  } catch (error) {
    console.error('[Session Creation Error]', error);
    res.status(500).json({ error: 'Failed to create evaluation session' });
  }
};

/**
 * FETCH CLUSTERS FOR A SESSION
 * Exposes the MongoDB Clusters to the Frontend Review Dashboard
 */
exports.getClusters = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // In a full production app you would filter QuestionId mapped to SessionId.
    // For MVP, we'll fetch all clusters to demonstrate the UI works
    const clusters = await Cluster.find({})
      .sort({ createdAt: -1 }) // Newest first
      .limit(10); // Don't overwhelm the MVP UI

    res.status(200).json({ clusters });
  } catch (error) {
    console.error('[Fetch Clusters Error]', error);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
};

/**
 * PARSE FACULTY DOCUMENT
 * Proxies the request to the AI Engine
 */
exports.parseFacultyDocument = async (req, res) => {
  try {
    const documentType = req.body.documentType || 'rubric';
    const sessionTitle = req.body.sessionTitle || 'Imported Session';
    const sessionId = req.body.sessionId || null;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a PDF or image.' });
    }

    const absoluteFilePath = req.file.path;
    console.log(`[Faculty Parse] File saved at: ${absoluteFilePath}, type: ${documentType}`);

    // 1. Run OCR via AI Engine
    const result = await orchestrationService.parseFacultyDocument(absoluteFilePath, documentType, sessionTitle);

    // 2. Save structured rubric JSON to MongoDB
    try {
      const RubricDocument = require('../models/RubricDocument');
      const rubricDoc = await RubricDocument.create({
        sessionId:     sessionId || undefined,
        sessionTitle:  result.sessionTitle || sessionTitle,
        document_type: documentType,
        source_file:   req.file.originalname,
        questions:     (result.questions || []).map(q => {
          const qExtracted = q.structured || {};
          // Ensure question_number is a valid number, or null
          const qNumRaw = qExtracted.question_number || (q.questionId || '').replace(/\D/g, '');
          const qNum = parseInt(qNumRaw);
          
          return {
            question_number: isNaN(qNum) ? null : qNum,
            question_text:   qExtracted.question_text || q.questionPrompt || '',
            question_type:   qExtracted.question_type || q.questionType || 'short_concept',
            max_marks:       qExtracted.max_marks || q.marks || null,
            rubric_points:   (qExtracted.rubric_points || q.rules || []).map(r => ({
              type:              r.type || 'concept_point',
              point:             r.point || r.description || '',
              marks:             isNaN(parseFloat(r.marks || r.weight)) ? null : parseFloat(r.marks || r.weight),
              keywords:          r.keywords || [],
              alternate_phrases: r.alternate_phrases || [],
              concept_meaning:   r.concept_meaning || ''
            }))
          };
        }),
        embedding_status: 'PENDING',
        meta: result.meta || {}
      });
      console.log(`[Faculty Parse] Saved to MongoDB: ${rubricDoc._id}`);
      result.rubricDocumentId = rubricDoc._id;
      
      // 3. Trigger Vector Embedding in Python Engine
      orchestrationService.triggerRubricEmbedding(rubricDoc._id);
      
    } catch (dbError) {
      // Non-fatal: log but don't fail the request
      console.error('[Faculty Parse] MongoDB save failed (non-fatal):', dbError.message);
    }

    res.status(200).json(result);

  } catch (error) {
    const pyDetail = error.response?.data?.detail || error.response?.data?.error;
    console.error('[Faculty Parse Error]', pyDetail || error.message);
    res.status(500).json({ 
      error: 'Failed to parse faculty document', 
      detail: pyDetail || error.message 
    });
  }
};
