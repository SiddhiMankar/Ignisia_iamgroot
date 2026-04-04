import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, Check, X, AlertCircle, BrainCircuit } from 'lucide-react';

export default function FacultyReview() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the mock data from our node backend
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reviews/mock`)
      .then(res => {
        setClusters(res.data.clusters);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Active viewing cluster
  const activeCluster = clusters[0] || null;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">Evaluation Pending</h2>
          <h1 className="text-3xl font-bold text-white">Question 1 Review</h1>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors">
            Previous
          </button>
          <button className="px-4 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-200 transition-colors flex items-center">
            Next Question <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </header>

      {activeCluster ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: AI Logic & Controls */}
          <div className="col-span-12 xl:col-span-5 space-y-6">
            
            {/* Score Badge Card */}
            <div className="premium-card flex flex-col items-center justify-center py-10 relative overflow-hidden">
               {/* Background pattern */}
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BrainCircuit className="w-32 h-32" />
               </div>

               <h3 className="text-slate-400 font-medium mb-2">AI Suggested Score</h3>
               <div className="text-7xl font-bold text-white mb-2">
                 {activeCluster.suggestedScore} <span className="text-3xl text-slate-500">/ 5</span>
               </div>
               
               <div className="flex items-center space-x-2 text-sm mt-4 bg-brand-500/10 text-brand-400 px-4 py-1.5 rounded-full border border-brand-500/20">
                 <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                 <span>{activeCluster.confidence * 100}% Confidence Match</span>
               </div>
            </div>

            {/* Rubric Match Card */}
            <div className="premium-card">
              <h3 className="text-lg font-semibold text-white mb-4">Rubric Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-300">Keyword Found: Gravity</p>
                    <p className="text-xs text-slate-400 mt-1">Found in 100% of answers in this cluster.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Missing Concept: Friction</p>
                    <p className="text-xs text-slate-400 mt-1">Formula derivation missing required variable.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="premium-card bg-brand-600/5 hover:border-brand-500/50">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Finalize Grade</h3>
              <div className="flex space-x-4">
                <input 
                  type="number" 
                  defaultValue={activeCluster.suggestedScore}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-brand-500"
                />
                <button className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  Approve for {activeCluster.answers.length} Answers
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Original Answers Viewer */}
          <div className="col-span-12 xl:col-span-7 space-y-6">
            <div className="premium-card h-full flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-slate-400" />
                  Answer Manifest ({activeCluster.answers.length})
                </h3>
                <span className="text-xs font-medium bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                  Cluster ID: {activeCluster.id}
                </span>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {activeCluster.answers.map((ans, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-950 border border-slate-800 group hover:border-slate-700 transition-colors">
                    <p className="text-slate-300 leading-relaxed text-lg font-light">
                      {/* Fake highlight for demo wow-factor */}
                      {ans.split(/(gravity)/i).map((part, i) => 
                        part.toLowerCase() === 'gravity' 
                          ? <span key={i} className="text-green-400 bg-green-400/10 px-1 rounded">{part}</span>
                          : part
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 premium-card">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No clusters found. Ensure the mock backend server is running on port 5000.</p>
        </div>
      )}
    </div>
  );
}
