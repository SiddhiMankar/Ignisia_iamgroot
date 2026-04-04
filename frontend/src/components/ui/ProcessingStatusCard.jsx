import React from 'react';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

/**
 * stages: Array of string labels, e.g., ["Uploading...", "Extracting OCR...", "Parsing Rules..."]
 * currentStageIndex: Number indicating which stage is active
 */
export default function ProcessingStatusCard({ title = "Processing", stages = [], currentStageIndex = 0 }) {
  
  // Calculate percentage for progress bar
  const progressPercent = stages.length > 0 ? Math.min(100, Math.round((currentStageIndex / stages.length) * 100)) : 0;

  return (
    <div className="premium-card p-8 bg-slate-900/90 border border-indigo-500/30 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-indigo-600/10 blur-3xl"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mr-3" />
          {title}
        </h3>
        <span className="text-indigo-400 font-medium font-mono">{progressPercent}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8 relative z-10">
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Stages List */}
      <div className="space-y-4 relative z-10">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isActive = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          return (
            <div key={idx} className={`flex items-start transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
              <div className="mt-0.5 mr-3">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
                )}
              </div>
              <span className={`font-medium ${isCompleted ? 'text-slate-300' : isActive ? 'text-indigo-300' : 'text-slate-500'}`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
