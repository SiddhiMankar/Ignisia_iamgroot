import React, { useState } from 'react';
import FileUploadCard from '../components/ui/FileUploadCard';
import ProcessingStatusCard from '../components/ui/ProcessingStatusCard';
import ExtractedQuestionCard from '../components/ui/ExtractedQuestionCard';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ChevronDown } from 'lucide-react';

// Mock backend response for Phase 1 testing
const MOCK_EXTRACTED_RUBRIC = {
  sessionTitle: "Midterm Physics (Mock)",
  questions: [
    {
      questionId: "Q1",
      questionPrompt: "Photosynthesis Process",
      marks: 3,
      rules: [
        { type: "Concept Match", description: "Process by which plants make food", weight: 2 },
        { type: "Concept Match", description: "Uses energy from sunlight", weight: 1 }
      ]
    },
    {
      questionId: "Q2",
      questionPrompt: "Newton's Second Law",
      marks: 2,
      rules: [
        { type: "Formula Match", description: "F = ma", weight: 2 }
      ]
    }
  ]
};

export default function FacultySetup({ activeRubric, setActiveRubric }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [docType, setDocType] = useState('rubric');
  const navigate = useNavigate();

  const STAGES = [
    "Uploading document...",
    "Scanning via EasyOCR...",
    "Detecting question boundaries...",
    "Extracting Rules...",
    "Generating Frontend JSON..."
  ];

  const handleExtractClick = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProcessStep(1);
    
    // Send as real multipart/form-data so the file lands on disk
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);
    formData.append('sessionTitle', 'New Academic Session');

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const res = await axios.post(
        `${baseUrl}/api/sessions/faculty/parse`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setProcessStep(4);
      setTimeout(() => {
        setIsProcessing(false);
        setActiveRubric(res.data);
        navigate('/student-extraction'); // ← auto-guide to next step
      }, 500);

    } catch (error) {
      console.error('Extraction Failed', error);
      const detail = error?.response?.data?.detail || error?.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to parse document: ${detail}`);
      setIsProcessing(false);
    }
  };

  const handleSaveSession = () => {
    alert("Session saved! Proceed to Student Extraction.");
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Faculty Setup</h1>
        <p className="text-slate-400">Upload your rubric or answer key to extract grading rules automatically.</p>
      </header>

      {/* STEP 1: UPLOAD */}
      {!activeRubric && !isProcessing && (
        <div className="flex flex-col space-y-6">
          <FileUploadCard 
            onFileSelect={setFile} 
            label="Upload Rubric PDF" 
            hint="Drag and drop your faculty answer key or rubric here. Our system will automatically parse the rules."
          />
          
          <div className="flex items-center gap-4 justify-end">
            <div className="relative">
              <select 
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 py-3 px-6 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="rubric">Rubric / Ans Key</option>
                <option value="question_paper">Question Paper</option>
                <option value="marking_scheme">Marking Scheme</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <button 
              onClick={handleExtractClick}
              disabled={!file}
              className={`px-8 py-3 rounded-lg font-semibold flex items-center shadow-lg transition-all
                ${file 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              Extract Rubric
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto mt-12">
          <ProcessingStatusCard 
            title="AI Extraction Engine" 
            stages={STAGES} 
            currentStageIndex={processStep} 
          />
        </div>
      )}

      {/* STEP 3: RESULT REVIEW */}
      {activeRubric && !isProcessing && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-200">Rule Builder</h2>
              <p className="text-sm text-emerald-400">Successfully extracted {activeRubric.questions.length} questions.</p>
            </div>
            <button 
              onClick={() => setActiveRubric(null)} 
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Start Over
            </button>
          </div>

          <div className="space-y-4 mb-8">
            {activeRubric.questions.map((q, i) => (
              <ExtractedQuestionCard key={q.questionId} question={q} index={i} />
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-800 gap-4">
            <button className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSaveSession}
              className="px-6 py-2.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Evaluation Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
