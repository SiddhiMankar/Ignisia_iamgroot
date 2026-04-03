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
      <div className="minimal-card p-6 bg-white border border-gray-200">
        <div className="flex items-center space-x-2 text-sm font-medium mb-6">
           <div className={`flex items-center space-x-2 ${selectedTest ? 'text-black' : 'text-gray-500'}`}>
             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${selectedTest ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>1</span>
             <span>Select Test</span>
           </div>
           
           <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
           
           <div className={`flex items-center space-x-2 ${selectedQuestion ? 'text-black' : 'text-gray-500'}`}>
             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${selectedQuestion ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>2</span>
             <span>Select Question</span>
           </div>

           <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />

           <div className="flex items-center space-x-2 text-black">
             <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">3</span>
             <span>Review Data</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Step 1: Select Test */}
           <div>
             <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 block">Test Session</label>
             <div className="flex flex-wrap gap-2">
               {availableTests.map((test) => (
                 <button 
                   key={test}
                   onClick={() => setSelectedTest(test)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                     selectedTest === test 
                       ? 'bg-black text-white shadow-md' 
                       : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                     selectedQuestion === q 
                       ? 'bg-black text-white shadow-md' 
                       : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
            <div className="minimal-card flex flex-col items-center justify-center py-10 relative overflow-hidden transition-all duration-300 hover:shadow-md">
               {/* Background pattern */}
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BrainCircuit className="w-32 h-32" />
               </div>

               <h3 className="text-gray-600 font-medium mb-2">AI Suggested Score</h3>
               <div className="text-7xl font-bold text-black mb-2 tracking-tighter">
                 {activeCluster.suggestedScore} <span className="text-3xl text-gray-400 font-light">/ 5</span>
               </div>
               
               <div className="flex items-center space-x-2 text-sm mt-4 bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full border border-gray-200">
                 <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                 <span>{activeCluster.confidence * 100}% Confidence Match</span>
               </div>
            </div>

            {/* Rubric Match Card */}
            <div className="minimal-card transition-all duration-300 hover:border-gray-300">
              <h3 className="text-lg font-semibold text-black mb-4">Rubric Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 transition-colors hover:bg-gray-100">
                  <Check className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Keyword Found: Gravity</p>
                    <p className="text-xs text-gray-500 mt-1">Found in 100% of answers in this cluster.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 transition-colors hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Missing Concept: Friction</p>
                    <p className="text-xs text-gray-500 mt-1">Formula derivation missing required variable.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="minimal-card bg-gray-50 transition-all duration-300 hover:shadow-md">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Finalize Grade</h3>
              <div className="flex space-x-4">
                <input 
                  type="number" 
                  defaultValue={activeCluster.suggestedScore}
                  className="w-20 bg-white border border-gray-300 rounded-lg text-center text-xl font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button className="flex-1 bg-black hover:bg-gray-800 text-white font-medium rounded-lg flex items-center justify-center transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm">
                  Approve for {activeCluster.answers.length} Answers
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Original Answers Viewer */}
          <div className="col-span-12 xl:col-span-7 space-y-6">
            <div className="minimal-card h-full flex flex-col transition-all duration-300 hover:shadow-md">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-500" />
                  Answer Manifest ({activeCluster.answers.length})
                </h3>
                <span className="text-xs font-medium bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1 rounded-full">
                  Cluster ID: {activeCluster.id}
                </span>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {activeCluster.answers.map((ans, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-gray-50 border border-gray-200 group transition-all duration-200 hover:border-gray-400 hover:bg-white hover:shadow-sm cursor-pointer">
                    <p className="text-gray-800 leading-relaxed text-lg font-light">
                      {/* Fake highlight for demo wow-factor */}
                      {ans.split(/(gravity)/i).map((part, i) => 
                        part.toLowerCase() === 'gravity' 
                          ? <span key={i} className="text-black bg-gray-200 px-1 rounded font-medium transition-colors group-hover:bg-gray-300">{part}</span>
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
