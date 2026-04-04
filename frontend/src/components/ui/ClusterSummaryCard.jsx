import React, { useState } from 'react';
import { Users, ChevronDown, ChevronRight, Check } from 'lucide-react';

export default function ClusterSummaryCard({ cluster }) {
  const [expanded, setExpanded] = useState(false);
  const { clusterName, studentCount, summary, expectedScore, students } = cluster;

  return (
    <div className="premium-card p-0 overflow-hidden mb-4 border border-slate-800">
      
      {/* Header */}
      <div 
        className="flex md:flex-row flex-col justify-between items-start md:items-center p-5 bg-slate-900 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 flex-shrink-0 mt-1">
            <Users className="w-6 h-6 text-indigo-400" />
            <span className="absolute -mr-8 -mt-8 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-900">
              {studentCount}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-xl font-bold text-slate-200">{clusterName}</h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                Suggested Score: {expectedScore}
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">{summary}</p>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4 text-slate-400 pl-16 md:pl-0">
          <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500/50" onClick={(e) => { e.stopPropagation(); alert(`Approved score ${expectedScore} for ${studentCount} students.`); }}>
             Approve All
          </button>
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded Student List */}
      {expanded && (
        <div className="p-5 border-t border-slate-800 bg-slate-950/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Raw Student Outputs in this Cluster</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
             {students.map((text, idx) => (
               <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800 text-slate-300 text-sm italic">
                 "{text}"
               </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
