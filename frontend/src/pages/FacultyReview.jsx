import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ChevronRight, Check, X, AlertCircle, BrainCircuit, FileText, ArrowLeft, BookOpen, Layers } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis, CartesianGrid } from 'recharts';
import { SidebarContext } from '../components/layout/DashboardLayout';

const MOCK_TESTS = [
  { id: 't1', name: 'Data Structures - Midterm', date: '2026-04-01', paperCount: 45 },
  { id: 't2', name: 'Algorithms - Final Exam', date: '2026-05-15', paperCount: 120 },
];

const MOCK_QUESTIONS = {
  't1': [
    { id: 'q1', text: 'Explain LIFO vs FIFO', maxScore: 10, status: 'evaluating' },
    { id: 'q2', text: 'Write a QuickSort implementation', maxScore: 20, status: 'pending' },
  ],
  't2': [
    { id: 'q3', text: 'What is a Binary Search Tree?', maxScore: 15, status: 'pending' }
  ]
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl max-w-xs">
        <p className="text-xs font-semibold text-brand-400 mb-1">Cluster: {data.cluster}</p>
        <p className="text-sm text-slate-300 italic">"{data.text}"</p>
      </div>
    );
  }
  return null;
};

export default function FacultyReview() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const { setIsCollapsed } = useContext(SidebarContext);
  
  const [mockData, setMockData] = useState({ clusters: [], keywordsFound: [], missingConcepts: [], semanticNodes: [] });
  const [loading, setLoading] = useState(false);

  // Fetch data only when a question is finally selected
  useEffect(() => {
    if (selectedQuestion) {
      setIsCollapsed(true); // Automatically collapse sidebar to make room for charts
      setLoading(true);
      axios.get('http://localhost:5001/api/reviews/mock')
        .then(res => {
          setMockData(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setIsCollapsed(false); // Restore sidebar width when leaving
    }
  }, [selectedQuestion, setIsCollapsed]);

  const handleBackToTests = () => {
    setSelectedTest(null);
    setSelectedQuestion(null);
    setIsCollapsed(false);
  };

  const handleBackToQuestions = () => {
    setSelectedQuestion(null);
    setIsCollapsed(false);
  };

  // --- STEP 1: Select Test ---
  if (!selectedTest) {
    return (
      <div className="space-y-6 animate-fade-in">
        <header>
          <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">Step 1</h2>
          <h1 className="text-3xl font-bold text-white">Select a Test to Grade</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {MOCK_TESTS.map(test => (
            <button
              key={test.id}
              onClick={() => setSelectedTest(test)}
              className="premium-card text-left p-6 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-slate-800 group-hover:bg-brand-600 transition-colors">
                  <BookOpen className="w-6 h-6 text-brand-400 group-hover:text-white" />
                </div>
                <span className="text-sm font-medium text-slate-500">{test.date}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{test.name}</h3>
              <p className="text-slate-400">{test.paperCount} student papers uploaded</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- STEP 2: Select Question ---
  if (!selectedQuestion) {
    const questions = MOCK_QUESTIONS[selectedTest.id] || [];
    
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex items-center space-x-4">
          <button onClick={handleBackToTests} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">{selectedTest.name}</h2>
            <h1 className="text-3xl font-bold text-white">Select a Question</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 mt-8">
          {questions.map(q => (
            <button
              key={q.id}
              onClick={() => setSelectedQuestion(q)}
              className="premium-card text-left p-6 flex justify-between items-center hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-brand-400">
                  {q.id.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{q.text}</h3>
                  <p className="text-sm text-slate-400">Max Score: {q.maxScore}</p>
                </div>
              </div>
              <div className="flex items-center text-brand-400 font-medium group-hover:translate-x-2 transition-transform">
                Evaluate <ChevronRight className="w-5 h-5 ml-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- STEP 3: Data Visualization (Active Dashboard) ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        <p className="text-slate-400 animate-pulse">Running AI FAISS clustering on papers...</p>
      </div>
    );
  }

  const clusters = mockData.clusters || [];
  const activeCluster = clusters[0] || null;
  
  // Helper to color scatter nodes by cluster
  const getClusterColor = (clusterId) => {
    if (clusterId === 'master') return '#FFD700'; // Gold for master rubric
    const c = clusters.find(cl => cl.id === clusterId);
    return c ? c.color : '#8884d8';
  };

  const studentNodes = mockData.semanticNodes?.filter(n => n.cluster !== 'master') || [];
  const masterNode = mockData.semanticNodes?.filter(n => n.cluster === 'master') || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-end">
        <div className="flex items-center space-x-4">
          <button onClick={handleBackToQuestions} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">
              {selectedTest.name} • {selectedQuestion.id.toUpperCase()}
            </h2>
            <h1 className="text-3xl font-bold text-white">Grader Analytics</h1>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors">
            Previous Cluster
          </button>
          <button className="px-4 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-200 transition-colors flex items-center">
            Next Cluster <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </header>

      {/* Main 2-Column Split Layout */}
      {activeCluster ? (
        <div className="flex flex-col xl:flex-row gap-6 mt-6 h-[calc(100vh-140px)] w-full">
          
          {/* Left Half: Fixed 2D Semantic Distribution Map */}
          <div className="w-full xl:w-1/2 premium-card flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Semantic AI Distance Map</h3>
              <p className="text-sm text-slate-400">FAISS dimensionality reduction. Nodes mapped by contextual distance from the master Rubric vector.</p>
            </div>
            <div className="flex-1 w-full mix-blend-screen min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" dataKey="x" stroke="#475569" tick={{fill: '#94a3b8'}} domain={[-300, 300]} label={{ value: 'Semantic Drift (X)', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" stroke="#475569" tick={{fill: '#94a3b8'}} domain={[-300, 300]} label={{ value: 'Contextual Variance (Y)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                  <ZAxis range={[100, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} content={<CustomTooltip />} />
                  
                  {/* Highlight the Master Reference Node with a glowing star */}
                  <Scatter data={masterNode} shape="star" fill="#FFD700" className="drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse" />
                  
                  {/* Regular Student Answer Nodes */}
                  <Scatter data={studentNodes} shape="circle">
                    {studentNodes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getClusterColor(entry.cluster)} className="transition-all duration-300 hover:opacity-80 drop-shadow-md" />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Half: Scrollable Data Columns */}
          <div className="w-full xl:w-1/2 flex flex-col space-y-6 overflow-y-auto pr-2 pb-10">
            
            {/* Score Badge Card */}
            <div className="premium-card flex flex-col items-center justify-center py-10 relative overflow-hidden shrink-0">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BrainCircuit className="w-32 h-32" />
               </div>

               <h3 className="text-slate-400 font-medium mb-2">AI Suggested Score</h3>
               <div className="text-7xl font-bold text-white mb-2">
                 {activeCluster.suggestedScore} <span className="text-3xl text-slate-500">/ {selectedQuestion.maxScore}</span>
               </div>
               
               <div className="flex items-center space-x-2 text-sm mt-4 bg-brand-500/10 text-brand-400 px-4 py-1.5 rounded-full border border-brand-500/20">
                 <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                 <span>{activeCluster.confidence * 100}% Confidence Match</span>
               </div>
            </div>

            {/* Rubric Match Card */}
            <div className="premium-card shrink-0">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-brand-400" /> 
                Rubric Analysis
              </h3>
              <div className="space-y-3">
                {mockData.keywordsFound?.map((kw, i) => (
                  <div key={`kw-${i}`} className="flex items-start space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-300">Keyword Highlighted: {kw}</p>
                    </div>
                  </div>
                ))}
                
                {mockData.missingConcepts?.map((mc, i) => (
                  <div key={`mc-${i}`} className="flex items-start space-x-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Missing Concept: {mc}</p>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                  <p className="text-sm text-brand-300"><b>AI Note:</b> {activeCluster.feedbackSummary}</p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="premium-card bg-brand-600/5 hover:border-brand-500/50 shrink-0">
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

            {/* Original Answers Viewer */}
            <div className="premium-card flex flex-col shrink-0 min-h-[400px]">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-slate-400" />
                  Answer Manifest ({activeCluster.answers.length})
                </h3>
                <span className="text-xs font-medium bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                  Cluster ID: {activeCluster.id}
                </span>
              </div>
              
              <div className="flex-1 space-y-4">
                {activeCluster.answers.map((ans, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-950 border border-slate-800 group hover:border-slate-700 transition-colors">
                    <p className="text-slate-300 leading-relaxed text-lg font-light">
                      {ans.split(/(LIFO|FIFO|Stack|Queue)/i).map((part, i) => 
                        /LIFO|FIFO|Stack|Queue/i.test(part) 
                          ? <span key={i} className="text-green-400 bg-green-400/10 px-1 rounded font-medium">{part}</span>
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
        <div className="p-8 text-center text-slate-400 premium-card mt-6">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No clusters found. Ensure the mock backend server is running.</p>
        </div>
      )}
    </div>
  );
}
