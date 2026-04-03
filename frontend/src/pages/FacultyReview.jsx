import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, CheckCircle, AlertTriangle, ChevronRight, User } from 'lucide-react';

export default function FacultyReview() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ping the real MongoDB backend
    axios.get('http://localhost:5000/api/sessions/hackathon_session_1/clusters')
      .then(res => {
        setClusters(res.data.clusters || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch DB error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-white">Fetching Live AI Clusters from Database...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 mt-4 pb-12">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">Evaluation Session</h2>
          <h1 className="text-3xl font-bold text-white">Cluster Approval Dashboard</h1>
          <p className="text-slate-400 mt-2">Approve these semantic clusters and immediately grade {clusters.reduce((acc, c) => acc + (c.answers?.length || 0), 0)} students at once.</p>
        </div>
      </header>

      {clusters.length === 0 ? (
        <div className="premium-card text-center p-12 text-slate-400 border-slate-800 border-dashed">
            No clusters exist yet. Run the Upload pipeline!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Cluster Feed */}
          <div className="lg:col-span-2 space-y-6">
            {clusters.map((cluster) => (
              <div key={cluster._id} className="premium-card relative border-l-4 border-l-brand-500 overflow-hidden group hover:border-l-brand-400 transition-all">
                <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                   <div className="flex items-center">
                     <div className="bg-brand-900/50 p-2 rounded mr-4">
                        <Layers className="text-brand-400 w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-lg font-bold text-white">Cluster {cluster._id.substring(18)}</h3>
                       <p className="text-sm text-slate-400 flex items-center mt-1">
                          <User className="w-4 h-4 mr-1" /> {cluster.answers?.length || 1} identical student responses
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex space-x-3 items-center">
                      <div className="text-right mr-4">
                         <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">AI Suggestion</p>
                         <p className="text-2xl font-bold text-green-400">{cluster.aiEvaluation?.suggestedScore} pts</p>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg font-mono text-sm text-slate-300 leading-relaxed border border-slate-800 mb-6">
                   <div className="mb-2 text-xs text-slate-500 font-sans uppercase">Representative Answer Text (OCR):</div>
                   "{cluster.answers?.[0]?.cleanText || cluster.answers?.[0]?.rawText || 'Text missing'}"
                </div>

                {cluster.aiEvaluation?.edgeCaseFlags?.length > 0 && cluster.aiEvaluation.edgeCaseFlags[0] !== "NONE" && (
                  <div className="mb-6 bg-red-900/20 border border-red-900 rounded p-3 flex items-start">
                    <AlertTriangle className="text-red-400 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">AI Edge-Case Detection</p>
                      <p className="text-sm text-red-300/80 mt-1">{cluster.aiEvaluation.edgeCaseFlags.join(", ")}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-4">
                  <button className="text-brand-400 text-sm font-medium hover:text-brand-300 transition-colors flex items-center">
                    Inspect all {cluster.answers?.length} answers <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                  <button className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg flex items-center transition-all disabled:opacity-50">
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve Score
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="premium-card bg-slate-900/80 border border-slate-800">
               <h3 className="font-bold text-white mb-4">Rubric Compliance</h3>
               <div className="space-y-4">
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 flex items-center">
                    <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                    <span className="text-slate-300 text-sm">Keywords parsed correctly</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 flex items-center">
                    <AlertTriangle className="text-yellow-500 w-5 h-5 mr-3" />
                    <span className="text-slate-300 text-sm">Arithmetic logic partially verified</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
