import React from 'react';
import { Bot, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function EvaluationResultCard({ result }) {
  const { questionId, studentAnswer, marks, suggestedScore, flags, explainability, ruleEvaluations } = result;
  
  // Progress bar Math
  const scorePercent = (suggestedScore / marks) * 100;
  
  // Decide accent color based on score health
  const healthColor = scorePercent === 100 ? 'text-emerald-400' : scorePercent > 0 ? 'text-amber-400' : 'text-rose-400';
  const healthBg = scorePercent === 100 ? 'bg-emerald-500' : scorePercent > 0 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="premium-card p-0 overflow-hidden mb-6 border border-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-900 border-b border-slate-800">
        <div className="mb-4 md:mb-0 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-lg">
            {questionId}
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-100 flex items-center">
              Suggested: <span className={`ml-2 text-2xl ${healthColor}`}>{suggestedScore}</span><span className="text-slate-500 ml-1 text-lg">/ {marks}</span>
            </h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {flags?.map(flag => (
                <span key={flag} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono tracking-wider border border-slate-700">
                  {flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Answer Body */}
      <div className="p-5 bg-slate-950/50">
        <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">Student Output</p>
        <p className="text-slate-300 italic pl-4 border-l-2 border-slate-700">&quot;{studentAnswer}&quot;</p>
      </div>

      {/* LLM Explanation Engine Output */}
      <div className="px-5 pb-5 bg-slate-950/50">
        <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-500/20 flex items-start">
          <Bot className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-indigo-200 text-sm">{explainability}</p>
        </div>
      </div>

      {/* Rule Matches */}
      <div className="p-5 bg-slate-900 border-t border-slate-800">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Semantic Engine Rule Trace</h5>
        <div className="space-y-2">
          {ruleEvaluations?.map((rule, idx) => {
             let icon = <XCircle className="w-4 h-4 text-rose-400" />;
             let statusText = "Failed";
             let statusClass = "text-rose-400";
             
             if (rule.matched) {
               icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
               statusText = "Matched";
               statusClass = "text-emerald-400";
             } else if (rule.partial) {
               icon = <AlertCircle className="w-4 h-4 text-amber-400" />;
               statusText = "Partial";
               statusClass = "text-amber-400";
             }

             return (
               <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/50">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {icon}
                    <span className="text-slate-300 text-sm truncate">{rule.rule}</span>
                  </div>
                  <div className="flex items-center space-x-4 pl-4">
                    <span className="text-xs font-mono text-slate-500 hidden md:block">Sim: {rule.similarity.toFixed(2)}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${statusClass}`}>{statusText}</span>
                  </div>
               </div>
             )
          })}
        </div>
      </div>
      
    </div>
  );
}
