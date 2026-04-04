import React, { useState } from 'react';
import FileUploadCard from '../components/ui/FileUploadCard';
import ProcessingStatusCard from '../components/ui/ProcessingStatusCard';
import StudentAnswerPreviewCard from '../components/ui/StudentAnswerPreviewCard';
import axios from 'axios';
import { ArrowRight, BrainCircuit, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_EXTRACTED_ANSWERS = [
  { questionId: "Q1", text: "Photosynthesis is the process by which plants make food using sunlight. Oxygen is given off." },
  { questionId: "Q2", text: "F = ma because of Newton's second law." }
];

export default function StudentExtraction({ activeRubric, studentAnswers, setStudentAnswers }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const navigate = useNavigate();

  const STAGES = [
    "Uploading handwritten sheets...",
    "Enhancing image contrast...",
    "Running OCR engine...",
    "Detecting answer boundaries per question...",
    "Aligning with rubric structure..."
  ];

  const handleExtractClick = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessStep(1);

    const formData = new FormData();
    formData.append('answerSheet', file);
    formData.append('sessionId', activeRubric?.sessionId || 'DEMO_SESSION_ID');
    formData.append('documentType', 'answer_sheet');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/submissions/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setProcessStep(4);
      setTimeout(() => {
        setIsProcessing(false);
        setStudentAnswers(MOCK_EXTRACTED_ANSWERS);
      }, 1000);

    } catch (error) {
      console.error('Extraction Failed', error);
      const detail = error?.response?.data?.detail || error?.response?.data?.error || 'Unknown error';
      alert(`Failed to trigger extraction pipeline: ${detail}`);
      setIsProcessing(false);
    }
  };

  const handleProceedToEval = () => {
    navigate('/evaluation-results');
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Student Extraction</h1>
        <p className="text-slate-400">Upload handwritten answer sheets for OCR processing.</p>
      </header>

      {!activeRubric && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start text-amber-400">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <p><strong>Warning:</strong> You haven't loaded an Evaluation Session (Rubric) yet. We won't be able to align answers without it. Please return to Faculty Setup first.</p>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {studentAnswers.length === 0 && !isProcessing && (
        <div className="flex flex-col space-y-6">
          <FileUploadCard 
            onFileSelect={setFile} 
            label="Upload Answer Sheet" 
            hint="Supports scanned PDFs or images of handwritten student tests."
          />
          
          <div className="flex justify-end">
            <button 
              onClick={handleExtractClick}
              disabled={!file}
              className={`px-8 py-3 rounded-lg font-semibold flex items-center shadow-lg transition-all
                ${file 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              Extract Answers
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto mt-12">
          <ProcessingStatusCard 
            title="Handwriting Extraction Engine" 
            stages={STAGES} 
            currentStageIndex={processStep} 
          />
        </div>
      )}

      {/* STEP 3: RESULT REVIEW */}
      {studentAnswers.length > 0 && !isProcessing && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-200">Segmented Output</h2>
              <p className="text-sm text-emerald-400">Extracted {studentAnswers.length} discrete answers from the document.</p>
            </div>
            <button onClick={() => setStudentAnswers([])} className="text-sm text-slate-400 hover:text-slate-200">
              Start Over
            </button>
          </div>

          <div className="space-y-4 mb-8">
            {studentAnswers.map((ans, i) => (
              <StudentAnswerPreviewCard key={i} answer={ans} />
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-800">
            <button 
              onClick={handleProceedToEval}
              className="px-6 py-3 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center shadow-lg shadow-indigo-600/20 transition-all font-semibold"
            >
              Run Semantic Matcher <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
