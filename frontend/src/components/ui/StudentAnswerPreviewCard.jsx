import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';

export default function StudentAnswerPreviewCard({ answer }) {
  return (
    <div className="premium-card p-0 overflow-hidden mb-4 border border-slate-800">
      <div className="flex flex-col md:flex-row h-full">
        
        {/* Left Side: "Mock" Image Crop Preview */}
        <div className="md:w-1/3 bg-slate-950 p-6 flex flex-col items-center justify-center border-r border-slate-800 min-h-[160px] relative overflow-hidden group">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>
          <ImageIcon className="w-8 h-8 text-slate-600 mb-3 group-hover:text-indigo-400 transition-colors duration-300" />
          <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Source Crop Placeholder</span>
          <div className="absolute top-3 left-3 px-2 py-1 bg-slate-900/80 rounded backdrop-blur-sm border border-slate-700">
            <span className="text-xs font-bold text-indigo-400">{answer.questionId}</span>
          </div>
        </div>

        {/* Right Side: Parsed Text */}
        <div className="md:w-2/3 p-6 bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Extracted Text
            </h4>
            <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">Confidence: 94%</span>
          </div>
          
          <div className="flex-1 bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 font-mono text-sm text-slate-300 leading-relaxed overflow-auto">
            {answer.text ? answer.text : <span className="italic text-slate-600">No output detected.</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
