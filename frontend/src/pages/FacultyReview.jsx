import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, Check, X, AlertCircle, BrainCircuit, FileText } from 'lucide-react';

export default function FacultyReview() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Step-based workflow state
  const [selectedTest, setSelectedTest] = useState('Midterm Dynamics 2026');
  const [selectedQuestion, setSelectedQuestion] = useState('Q1');

  // Mock available selections
  const availableTests = ['Midterm Dynamics 2026', 'Final Physics 101', 'Quiz 3 Mechanics'];
  const availableQuestions = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Fetch the mock data from our node backend
  useEffect(() => {
    axios.get('http://localhost:5000/api/reviews/mock')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // Active viewing cluster
  const activeCluster = clusters[0] || null;

  return (
    <div className="space-y-8 pb-10">
      
      {/* 
        ========================================
        TOP FLOW AREA: Clean & Compact Step UI 
        ========================================
      */}
      <div className="minimal-card p-6 bg-white/70 backdrop-blur-md border border-white/60 shadow-sm relative z-20">
        <div className="flex items-center space-x-2 text-sm font-medium mb-6">
           <div className={`flex items-center space-x-2 transition-colors duration-300 ${selectedTest ? 'text-indigo-900' : 'text-gray-500'}`}>
             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors duration-300 ${selectedTest ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>1</span>
             <span>Select Test</span>
           </div>
           
           <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
           
           <div className={`flex items-center space-x-2 transition-colors duration-300 ${selectedQuestion ? 'text-indigo-900' : 'text-gray-500'}`}>
             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors duration-300 ${selectedQuestion ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>2</span>
             <span>Select Question</span>
           </div>

           <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />

           <div className="flex items-center space-x-2 text-gray-800">
             <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</span>
             <span>Review Data</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
           {/* Step 1: Select Test */}
           <div>
             <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 block">Test Session</label>
             <div className="flex flex-wrap gap-2">
               {availableTests.map((test) => (
                 <button 
                   key={test}
                   onClick={() => setSelectedTest(test)}
                   className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 hover:scale-[1.02] ${
                     selectedTest === test 
                       ? 'bg-indigo-600 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] ring-1 ring-indigo-500/50' 
                       : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm hover:border-gray-300'
                   }`}
                 >
                   {test}
                 </button>
               ))}
             </div>
           </div>

           {/* Step 2: Select Question */}
           <div>
             <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 block">Question</label>
             <div className="flex flex-wrap gap-2">
               {availableQuestions.map((q) => (
                 <button 
                   key={q}
                   onClick={() => setSelectedQuestion(q)}
                   className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 hover:scale-[1.02] ${
                     selectedQuestion === q 
                       ? 'bg-indigo-600 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] ring-1 ring-indigo-500/50' 
                       : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm hover:border-gray-300'
                   }`}
                 >
                   {q} Review
                 </button>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* 
        ========================================
        STEP 3: REVIEW DATA (Original content) 
        ========================================
      */}
      {activeCluster ? (
        <div className="grid grid-cols-12 gap-6 transition-all duration-500 opacity-100">
          {/* Left Column: AI Logic & Controls */}
          <div className="col-span-12 xl:col-span-5 space-y-6">
            
            {/* Score Badge Card */}
            <div className="minimal-card flex flex-col items-center justify-center py-10 relative overflow-hidden transition-all duration-300 ease-in-out hover:shadow border-t-4 border-t-indigo-500 bg-white">
               {/* Background pattern */}
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BrainCircuit className="w-32 h-32" />
               </div>

               <h3 className="text-gray-500 font-medium mb-2">AI Suggested Score</h3>
               <div className="text-7xl font-bold text-gray-900 mb-2 tracking-tighter">
                 {activeCluster.suggestedScore} <span className="text-3xl text-gray-400 font-light">/ 5</span>
               </div>
               
               <div className="flex items-center space-x-2 text-sm mt-4 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-100">
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                 <span>{activeCluster.confidence * 100}% Confidence Match</span>
               </div>
            </div>

            {/* Rubric Match Card */}
            <div className="minimal-card transition-all duration-300 ease-in-out hover:shadow-sm bg-white border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rubric Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-100 transition-colors duration-200 hover:bg-gray-100/60">
                  <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Keyword Found: Gravity</p>
                    <p className="text-xs text-gray-500 mt-1">Found in 100% of answers in this cluster.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-100 transition-colors duration-200 hover:bg-gray-100/60">
                  <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Missing Concept: Friction</p>
                    <p className="text-xs text-gray-500 mt-1">Formula derivation missing required variable.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="minimal-card bg-gray-50/80 transition-all duration-300 ease-in-out hover:shadow-sm border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Finalize Grade</h3>
              <div className="flex space-x-4">
                <input 
                  type="number" 
                  defaultValue={activeCluster.suggestedScore}
                  className="w-20 bg-white border border-gray-300 rounded-lg text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button className="flex-1 bg-gray-900 hover:bg-black text-white font-medium rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 shadow-sm">
                  Approve for {activeCluster.answers.length} Answers
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Original Answers Viewer */}
          <div className="col-span-12 xl:col-span-7 space-y-6">
            <div className="minimal-card h-full flex flex-col transition-all duration-300 ease-in-out hover:shadow-sm bg-white">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                  Answer Manifest ({activeCluster.answers.length})
                </h3>
                <span className="text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1 rounded-full">
                  Cluster ID: {activeCluster.id}
                </span>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {activeCluster.answers.map((ans, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm group transition-all duration-300 ease-in-out hover:border-indigo-300 hover:shadow-md cursor-pointer relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out" />
                    <p className="text-gray-700 leading-relaxed text-lg font-light">
                      {/* Fake highlight for demo wow-factor */}
                      {ans.split(/(gravity)/i).map((part, i) => 
                        part.toLowerCase() === 'gravity' 
                          ? <span key={i} className="text-indigo-900 bg-indigo-100 px-1 rounded font-medium transition-colors duration-200 group-hover:bg-indigo-200">{part}</span>
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
        <div className="p-8 text-center text-gray-500 minimal-card">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p>No clusters found. Ensure the mock backend server is running on port 5000.</p>
        </div>
      )}
    </div>
  );
}
