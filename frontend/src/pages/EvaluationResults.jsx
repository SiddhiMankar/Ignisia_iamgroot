import React, { useState } from 'react';
import ProcessingStatusCard from '../components/ui/ProcessingStatusCard';
import EvaluationResultCard from '../components/ui/EvaluationResultCard';
import EmptyStatePanel from '../components/ui/EmptyStatePanel';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_RESULTS = [
  {
    questionId: "Q1",
    studentAnswer: "Photosynthesis is the process by which plants make food using sunlight. Oxygen is given off.",
    marks: 3,
    suggestedScore: 3,
    flags: ["PERFECT_SCORE"],
    explainability: "The student perfectly identified the core process of photosynthesis and its reliance on sunlight.",
    ruleEvaluations: [
      { rule: "Process by which plants make food", type: "Concept Match", matched: true, partial: false, similarity: 0.94 },
      { rule: "Uses energy from sunlight", type: "Concept Match", matched: true, partial: false, similarity: 0.88 },
    ]
  },
  {
    questionId: "Q2",
    studentAnswer: "F = ma because of Newton's second law.",
    marks: 2,
    suggestedScore: 2,
    flags: ["MATH_HEURISTIC_TRIGGERED"],
    explainability: "Accurately stated the formula for Newton's Second Law.",
    ruleEvaluations: [
      { rule: "F = ma", type: "Formula Match", matched: true, partial: false, similarity: 1.00 }
    ]
  }
];

export default function EvaluationResults({ activeRubric, evaluatedPayloads, setEvaluatedPayloads }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const navigate = useNavigate();

  const STAGES = [
    "Spinning up Semantic Engine...",
    "Converting rubric into vector embeddings...",
    "Embedding student answers...",
    "Calculating cosine similarities & partial bounds...",
    "Generating explainability via LLM..."
  ];

  const handleEvaluate = () => {
    setIsProcessing(true);
    setProcessStep(0);
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setProcessStep(currentStep);
      
      if (currentStep >= STAGES.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          setEvaluatedPayloads(MOCK_RESULTS);
        }, 800);
      }
    }, 1100);
  };

  if (!activeRubric) {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <EmptyStatePanel 
          title="No Answers to Evaluate" 
          message="Return to the Faculty and Student Setup tabs to load data before running the semantic engine." 
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Evaluation Results</h1>
          <p className="text-slate-400">View semantic matching scores and LLM reasoning per answer.</p>
        </div>
        
        {evaluatedPayloads.length === 0 && !isProcessing && (
           <button 
             onClick={handleEvaluate}
             className="px-6 py-2.5 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-indigo-500/50"
           >
             ▶ Run Semantic Engine
           </button>
        )}
      </header>

      {/* PROCESSING STATE */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto mt-12">
          <ProcessingStatusCard 
            title="Semantic Matching in Progress" 
            stages={STAGES} 
            currentStageIndex={processStep} 
          />
        </div>
      )}

      {/* RESULTS STATE */}
      {evaluatedPayloads.length > 0 && !isProcessing && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 mb-8">
            {evaluatedPayloads.map((res, i) => (
              <EvaluationResultCard key={i} result={res} />
            ))}
          </div>

          <div className="flex justify-between items-center p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-200">Done Evaluating?</h3>
              <p className="text-sm text-slate-400">Group hundreds of answers together for faster manual review.</p>
            </div>
            <button 
              onClick={() => navigate('/cluster-analysis')}
              className="px-6 py-3 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center shadow-lg transition-all font-semibold"
            >
              <Layers className="w-5 h-5 mr-2" /> Start Cluster Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
