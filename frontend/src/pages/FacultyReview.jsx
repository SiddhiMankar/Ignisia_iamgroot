import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ChevronRight, Check, X, AlertCircle, BrainCircuit, FileText, ArrowLeft, BookOpen, Layers, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis, CartesianGrid, ReferenceLine } from 'recharts';
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
      <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl shrink-0">
        <p className="text-sm font-bold text-white mb-1">{data.studentId}</p>
        <p className="text-xs text-slate-400">Click/Hover to view data</p>
      </div>
    );
  }
  return null;
};

export default function FacultyReview() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const { setIsCollapsed } = useContext(SidebarContext);
  
  const [mockData, setMockData] = useState({ clusters: [], semanticNodes: [] });
  const [activeNode, setActiveNode] = useState(null);
  const [zoomDomain, setZoomDomain] = useState(300);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  // Handle Trackpad Scroll to Zoom
  const handleWheel = (e) => {
    // Only zoom if delta is significant to avoid twitching
    if (Math.abs(e.deltaY) > 2) {
      setZoomDomain(prev => Math.max(50, Math.min(800, prev + (e.deltaY > 0 ? 25 : -25))));
    }
  };

  // Handle Click & Drag to Pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      // Rough pixel-to-domain scaling
      const scale = (zoomDomain * 2) / 400; 
      setPan(prev => ({ 
        x: prev.x - dx * scale, 
        y: prev.y + dy * scale // Y is inverted in Recharts
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomDomain(300);
    setPan({ x: 0, y: 0 });
  };

  // Fetch data only when a question is finally selected
  useEffect(() => {
    if (selectedQuestion) {
      setIsCollapsed(true);
      setLoading(true);
      axios.get('http://localhost:5001/api/reviews/mock')
        .then(res => {
          setMockData(res.data);
          // Default to the first student node
          const firstStudent = res.data.semanticNodes.find(n => n.cluster !== 'master');
          if (firstStudent) setActiveNode(firstStudent);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setIsCollapsed(false);
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
  const getClusterColor = (clusterId) => {
    if (clusterId === 'master') return '#FFD700';
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
            <h1 className="text-3xl font-bold text-white">Student-Level Analytics</h1>
          </div>
        </div>
      </header>

      {/* Main 2-Column Split Layout */}
      {activeNode ? (
        <div className="flex flex-col xl:flex-row gap-6 mt-6 h-[calc(100vh-140px)] w-full">
          
          {/* Left Half: Fixed 2D Semantic Distribution Map */}
          <div className="w-full xl:w-1/2 premium-card flex flex-col h-full">
            <header className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white cursor-default">Semantic AI Distance Map</h3>
                <p className="text-sm text-slate-400">Hover over any student node to view their unique vector grading profile.</p>
              </div>
              <div className="flex space-x-2 shrink-0">
                <button onClick={() => setZoomDomain(prev => Math.max(50, prev - 50))} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setZoomDomain(prev => Math.min(800, prev + 50))} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={resetView} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Reset Zoom & Center">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </header>
            
            <div 
              className={`flex-1 w-full mix-blend-screen min-h-[400px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: 'none' }}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" dataKey="x" stroke="#475569" tick={{fill: '#94a3b8'}} domain={[pan.x - zoomDomain, pan.x + zoomDomain]} label={{ value: 'Semantic Drift (X)', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" stroke="#475569" tick={{fill: '#94a3b8'}} domain={[pan.y - zoomDomain, pan.y + zoomDomain]} label={{ value: 'Contextual Variance (Y)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                  <ZAxis range={[300, 300]} />
                  {/* Disable standard generic cartesian crosshairs */}
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  
                  {/* Dynamic Tether: Draws a line from the cluster to the Master reference! */}
                  {activeNode && activeNode.cluster !== 'master' && (
                     <ReferenceLine 
                       segment={[{ x: 0, y: 0 }, { x: activeNode.x, y: activeNode.y }]} 
                       stroke={getClusterColor(activeNode.cluster)} 
                       strokeDasharray="6 6"
                       strokeWidth={2}
                       label={{ 
                         value: `${Math.round(activeNode.confidence * 100)}% Match`, 
                         fill: getClusterColor(activeNode.cluster),
                         fontSize: 14,
                         fontWeight: 'bold',
                         position: 'insideTopLeft'
                       }}
                     />
                  )}

                  {/* Highlight the Master Reference Node with a glowing star */}
                  <Scatter 
                    name="Master" 
                    data={masterNode} 
                    shape="star" 
                    fill="#FFD700" 
                    style={{ pointerEvents: 'auto' }}
                    className="drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse cursor-pointer" 
                    onMouseEnter={() => {
                        if (masterNode.length > 0) setActiveNode(masterNode[0]);
                    }}
                  />
                  
                  {/* Regular Student Answer Nodes */}
                  <Scatter name="Students" data={studentNodes} shape="circle" style={{ pointerEvents: 'auto' }}>
                    {studentNodes.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getClusterColor(entry.cluster)} 
                        className="transition-all duration-300 drop-shadow-md cursor-pointer hover:opacity-100 opacity-80" 
                        onMouseEnter={() => setActiveNode(entry)}
                        onClick={(e) => { e.stopPropagation(); setActiveNode(entry); }}
                        stroke={activeNode?.id === entry.id ? '#ffffff' : 'none'}
                        strokeWidth={activeNode?.id === entry.id ? 4 : 0}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Half: Scrollable Data Columns */}
          <div className="w-full xl:w-1/2 flex flex-col space-y-6 overflow-y-auto pr-2 pb-10">
            
            {/* Score Badge Card */}
            <div className={`premium-card flex flex-col items-center justify-center py-10 relative overflow-hidden shrink-0 transition-opacity duration-300 ${activeNode.cluster === 'master' ? 'border-amber-400/50' : ''}`}>
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <BrainCircuit className="w-32 h-32" />
               </div>

               <div className="w-full flex justify-between px-6 absolute top-4">
                 <h3 className="text-slate-400 font-medium">Viewing</h3>
                 <span className={`text-sm font-bold bg-slate-900 px-3 py-1 rounded-full border ${activeNode.cluster === 'master' ? 'text-amber-400 border-amber-400' : 'text-slate-300 border-slate-700'}`}>
                   {activeNode.studentId}
                 </span>
               </div>
               
               <h3 className="text-slate-400 font-medium mt-4 mb-2">AI Suggested Score</h3>
               <div className="text-7xl font-bold text-white mb-2 transition-all">
                 {activeNode.suggestedScore} <span className="text-3xl text-slate-500">/ {selectedQuestion.maxScore}</span>
               </div>
               
               {activeNode.cluster !== 'master' && (
                 <div className="flex items-center space-x-2 text-sm mt-4 bg-brand-500/10 text-brand-400 px-4 py-1.5 rounded-full border border-brand-500/20">
                   <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                   <span>{Math.round(activeNode.confidence * 100)}% Confidence Match</span>
                 </div>
               )}
            </div>

            {/* Rubric Match Card */}
            <div className="premium-card shrink-0 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-brand-400" /> 
                Student Analysis
              </h3>
              <div className="space-y-3">
                {activeNode.keywordsFound?.map((kw, i) => (
                  <div key={`kw-${i}`} className="flex items-start space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-300">Found Keyword: {kw}</p>
                    </div>
                  </div>
                ))}
                
                {activeNode.missingConcepts?.map((mc, i) => (
                  <div key={`mc-${i}`} className="flex items-start space-x-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Missing Concept: {mc}</p>
                    </div>
                  </div>
                ))}

                {activeNode.id !== "0" && activeNode.keywordsFound?.length === 0 && activeNode.missingConcepts?.length === 0 && (
                   <p className="text-slate-400 italic p-3">No specific rubric flags triggered.</p>
                )}
                
                <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                  <p className="text-sm text-brand-300"><b>AI Note:</b> {activeNode.feedbackSummary}</p>
                </div>
              </div>
            </div>

            {/* Action Bar (Only for actual students) */}
            {activeNode.cluster !== 'master' && (
              <div className="premium-card bg-brand-600/5 hover:border-brand-500/50 shrink-0">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Finalize Student Grade</h3>
                <div className="flex space-x-4">
                  <input 
                    type="number" 
                    key={`input-${activeNode.id}`}
                    defaultValue={activeNode.suggestedScore}
                    min={0}
                    max={selectedQuestion.maxScore}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-brand-500"
                  />
                  <button className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                    Approve for {activeNode.studentId}
                  </button>
                </div>
              </div>
            )}

            {/* Original Answer Viewer */}
            <div className="premium-card flex flex-col shrink-0 min-h-[250px]">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-slate-400" />
                  Answer Snippet
                </h3>
              </div>
              
              <div className="flex-1">
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 transition-colors shadow-inner">
                  <p className="text-slate-300 leading-relaxed text-lg font-light transition-all">
                    {activeNode.text.split(/(LIFO|FIFO|Stack|Queue)/i).map((part, i) => 
                      /LIFO|FIFO|Stack|Queue/i.test(part) 
                        ? <span key={i} className="text-green-400 bg-green-400/10 px-1 rounded font-medium">{part}</span>
                        : part
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 premium-card mt-6">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>No answers found. Ensure the mock backend server is running.</p>
        </div>
      )}
    </div>
  );
}
