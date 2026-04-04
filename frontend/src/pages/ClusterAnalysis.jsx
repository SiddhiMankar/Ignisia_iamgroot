import React, { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from 'recharts';
import { Layers, ZoomIn, ZoomOut, Maximize, CheckCircle, AlertTriangle, XCircle, Zap, BrainCircuit, FileText, Check, X } from 'lucide-react';
import axios from 'axios';

// ── Cluster definitions ────────────────────────────────────────────────────────
const CLUSTER_META = {
  c1: { label: 'Correct Explanation',   color: '#22c55e', icon: CheckCircle,   emoji: '🔷', bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400'  },
  c2: { label: 'Partial Understanding', color: '#eab308', icon: AlertTriangle, emoji: '🔷', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  c3: { label: 'Conceptual Error',      color: '#f97316', icon: XCircle,       emoji: '🔷', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  c4: { label: 'Edge Case',             color: '#ef4444', icon: Zap,           emoji: '🔷', bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400'    },
  master: { label: 'Rubric Reference',  color: '#FFD700', icon: BrainCircuit,  emoji: '⭐', bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400'  },
};

// ── Mock question list (mirrors rubric structure) ──────────────────────────────
const MOCK_QUESTIONS = [
  { id: 'Q1', label: 'Q1 — Stack vs Queue (LIFO/FIFO)' },
  { id: 'Q2', label: 'Q2 — Binary Search Tree definition' },
];

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    const meta = CLUSTER_META[d.cluster] || CLUSTER_META.c1;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl max-w-[220px]">
        <p className="text-xs font-bold text-white mb-1 truncate">{d.studentId}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.text}`}>
          {meta.label}
        </span>
        <p className="text-xs text-slate-400 mt-2">Score: <span className="text-white font-bold">{d.suggestedScore}</span></p>
        <p className="text-xs text-slate-400">Similarity: <span className="text-white font-bold">{Math.round(d.confidence * 100)}%</span></p>
      </div>
    );
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClusterAnalysis() {
  const [graphData, setGraphData] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState('Q1');
  const [questions, setQuestions] = useState([
    { id: 'Q1', label: 'Q1 — Stack vs Queue (LIFO/FIFO)' },
    { id: 'Q2', label: 'Q2 — Binary Search Tree definition' },
  ]);
  const [activeNode, setActiveNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('mock');
  const [zoomDomain, setZoomDomain] = useState(320);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [presetMode, setPresetMode] = useState('balanced');

  // On mount — try real ChromaDB endpoint first, fallback to mock
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const AI_BASE  = 'http://localhost:8000';

    setLoading(true);

    axios.get(`${AI_BASE}/api/cluster/results`)
      .then(res => {
        setGraphData(res.data);
        // Populate question tabs from live API
        if (res.data.questions?.length > 0) {
          setQuestions(res.data.questions);
          setActiveQuestion(res.data.questions[0].id);
        }
        const firstStudent = res.data.semanticNodes?.find(n => n.cluster !== 'master');
        if (firstStudent) setActiveNode(firstStudent);
        setDataSource('chromadb');
        setLoading(false);
      })
      .catch(() => {
        // ChromaDB empty or AI engine down — fall back to Node mock
        axios.get(`${baseUrl}/api/reviews/mock`)
          .then(res => {
            setGraphData(res.data);
            const firstStudent = res.data.semanticNodes?.find(n => n.cluster !== 'master');
            if (firstStudent) setActiveNode(firstStudent);
            setDataSource('mock');
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  // Reset active node when question tab changes
  useEffect(() => {
    if (graphData) {
      const first = graphData.semanticNodes?.find(n => n.cluster !== 'master');
      if (first) setActiveNode(first);
    }
  }, [activeQuestion, graphData]);

  // ── Zoom & Pan ──────────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    if (Math.abs(e.deltaY) > 2)
      setZoomDomain(prev => Math.max(50, Math.min(800, prev + (e.deltaY > 0 ? 25 : -25))));
  };
  const handleMouseDown = (e) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const scale = (zoomDomain * 2) / 400;
    setPan(prev => ({ x: prev.x - (e.clientX - dragStart.x) * scale, y: prev.y + (e.clientY - dragStart.y) * scale }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);
  const resetView = () => { setZoomDomain(320); setPan({ x: 0, y: 0 }); };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getColor = useCallback((clusterId) => {
    if (clusterId === 'master') return '#FFD700';
    const c = graphData?.clusters?.find(cl => cl.id === clusterId);
    return c?.color || CLUSTER_META[clusterId]?.color || '#8884d8';
  }, [graphData]);

  const clusterCounts = useCallback(() => {
    if (!graphData) return {};
    return graphData.semanticNodes.reduce((acc, n) => {
      if (n.cluster !== 'master') acc[n.cluster] = (acc[n.cluster] || 0) + 1;
      return acc;
    }, {});
  }, [graphData]);

  const studentNodes = graphData?.semanticNodes?.filter(n => n.cluster !== 'master') || [];
  const masterNode  = graphData?.semanticNodes?.filter(n => n.cluster === 'master') || [];

  // ── Threshold domain by preset ───────────────────────────────────────────────
  const thresholdRadius = { lenient: 200, balanced: 130, strict: 70 }[presetMode];

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <span>Loading cluster data...</span>
    </div>
  );

  if (!graphData) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-2">
      <Layers className="w-12 h-12 opacity-30" />
      <p>No cluster data yet. Upload student papers first.</p>
    </div>
  );

  const counts = clusterCounts();

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">Step 3 of 3</span>
            {dataSource === 'chromadb'
              ? <span className="text-xs font-semibold px-2.5 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />Live — ChromaDB</span>
              : <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Demo Data</span>
            }
          </div>
          <h1 className="text-3xl font-bold text-white">Cluster Analysis</h1>
          <p className="text-slate-400 mt-1">Semantic distance map — one graph per question, language-agnostic clustering.</p>
        </div>

        {/* Preset mode toggle */}
        <div className="flex bg-slate-900 border border-slate-700/80 rounded-lg p-1 gap-1 shadow-inner self-start">
          {[
            { id: 'lenient',  label: '🟢 Lenient',  active: 'bg-green-500/10 text-green-400 border-green-500/30' },
            { id: 'balanced', label: '🟡 Balanced', active: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
            { id: 'strict',   label: '🔴 Strict',   active: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
          ].map(m => (
            <button key={m.id} onClick={() => setPresetMode(m.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all border
                ${presetMode === m.id ? m.active : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Cluster Legend Pills ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CLUSTER_META).filter(([k]) => k !== 'master').map(([id, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              <span className="ml-1 bg-slate-900/60 px-1.5 py-0.5 rounded-full text-slate-300">
                {counts[id] || 0}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Question Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-slate-800 pb-0">
        {questions.map(q => (
          <button key={q.id} onClick={() => setActiveQuestion(q.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px
              ${activeQuestion === q.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {q.id}
          </button>
        ))}
        <span className="ml-2 flex items-center text-xs text-slate-600 italic">
          {questions.find(q => q.id === activeQuestion)?.label.split('—')[1]?.trim()}
        </span>
      </div>

      {/* ── Main Layout: Graph + Inspector ──────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6" style={{ minHeight: '520px' }}>

        {/* ── LEFT: Scatter Graph ──────────────────────────────────────────── */}
        <div className="w-full xl:w-[60%] bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-white">Semantic Distance Map</h3>
              <p className="text-xs text-slate-500">Each node = one student answer. Distance from ⭐ = semantic drift from rubric.</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setZoomDomain(p => Math.max(50, p - 50))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoomDomain(p => Math.min(800, p + 50))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={resetView} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Reset"><Maximize className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Floating similarity badge */}
          {activeNode && activeNode.cluster !== 'master' && (
            <div className="absolute z-10 right-8 top-20 font-bold px-4 py-2 bg-slate-950/90 border border-slate-800 rounded-lg shadow-xl backdrop-blur pointer-events-none text-sm"
              style={{ color: getColor(activeNode.cluster) }}>
              Cosine Similarity: {activeNode.confidence.toFixed(2)}
            </div>
          )}

          <div
            className={`flex-1 min-h-[380px] relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <ResponsiveContainer width="100%" height="100%" style={{ pointerEvents: 'none' }}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis type="number" dataKey="x" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  domain={[pan.x - zoomDomain, pan.x + zoomDomain]}
                  label={{ value: 'Semantic Drift (X)', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 11 }} />
                <YAxis type="number" dataKey="y" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  domain={[pan.y - zoomDomain, pan.y + zoomDomain]}
                  label={{ value: 'Contextual Variance (Y)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                <ZAxis range={[300, 300]} />
                <Tooltip cursor={false} content={<CustomTooltip />} />

                {/* Threshold ring */}
                <ReferenceLine
                  segment={[{ x: -thresholdRadius, y: 0 }, { x: thresholdRadius, y: 0 }]}
                  stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1} opacity={0.3}
                />

                {/* Tether from rubric to active node */}
                {activeNode && activeNode.cluster !== 'master' && (
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: activeNode.x, y: activeNode.y }]}
                    stroke={getColor(activeNode.cluster)}
                    strokeDasharray="6 4" strokeWidth={2}
                  />
                )}

                {/* ⭐ Master Rubric Node */}
                <Scatter name="Rubric" data={masterNode} shape="star" fill="#FFD700"
                  style={{ pointerEvents: 'auto' }}
                  className="drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse cursor-pointer"
                  onMouseEnter={() => masterNode[0] && setActiveNode(masterNode[0])}
                />

                {/* Student Nodes */}
                <Scatter name="Students" data={studentNodes} shape="circle" style={{ pointerEvents: 'auto' }}>
                  {studentNodes.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={getColor(entry.cluster)}
                      className="transition-all cursor-pointer"
                      opacity={activeNode?.id === entry.id ? 1 : 0.75}
                      onMouseEnter={() => setActiveNode(entry)}
                      onClick={() => setActiveNode(entry)}
                      stroke={activeNode?.id === entry.id ? '#ffffff' : 'none'}
                      strokeWidth={activeNode?.id === entry.id ? 3 : 0}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── RIGHT: Node Inspector ────────────────────────────────────────── */}
        {activeNode ? (
          <div key={activeNode.id} className="w-full xl:w-[40%] flex flex-col gap-4 overflow-y-auto pr-1 animate-fade-in">

            {/* Score card */}
            <div className={`bg-slate-900/60 border rounded-2xl p-6 text-center relative overflow-hidden
              ${activeNode.cluster === 'master' ? 'border-amber-500/30' : 'border-slate-800'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <BrainCircuit className="w-28 h-28" />
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-400">Student</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full border
                  ${activeNode.cluster === 'master' ? 'text-amber-400 border-amber-400/50 bg-amber-400/10' : 'text-slate-200 border-slate-700 bg-slate-800'}`}>
                  {activeNode.studentId}
                </span>
              </div>

              {/* Cluster badge */}
              {activeNode.cluster !== 'master' && (() => {
                const meta = CLUSTER_META[activeNode.cluster] || {};
                const Icon = meta.icon;
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${meta.bg} ${meta.border} ${meta.text}`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {meta.label}
                  </div>
                );
              })()}

              <p className="text-slate-400 text-sm mb-1">AI Suggested Score</p>
              <p className="text-7xl font-bold text-white">{activeNode.suggestedScore}</p>

              {activeNode.cluster !== 'master' && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20 w-fit mx-auto">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  {Math.round(activeNode.confidence * 100)}% Confidence Match
                </div>
              )}
            </div>

            {/* Rubric analysis */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Rubric Analysis
              </h3>
              <div className="space-y-2">
                {activeNode.keywordsFound?.map((kw, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-xs text-green-300 font-medium">Found: {kw}</p>
                  </div>
                ))}
                {activeNode.missingConcepts?.map((mc, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300 font-medium">Missing: {mc}</p>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <p className="text-xs text-indigo-300"><b>AI Note:</b> {activeNode.feedbackSummary}</p>
                </div>
              </div>
            </div>

            {/* Answer text */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Answer Snippet
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-slate-300 leading-relaxed text-sm">
                  {activeNode.text.split(/(LIFO|FIFO|Stack|Queue)/i).map((part, i) =>
                    /LIFO|FIFO|Stack|Queue/i.test(part)
                      ? <span key={i} className="text-green-400 bg-green-400/10 px-1 rounded font-medium">{part}</span>
                      : part
                  )}
                </p>
              </div>
            </div>

          </div>
        ) : (
          <div className="w-full xl:w-[40%] flex items-center justify-center text-slate-600 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <p className="text-sm">Hover a node to inspect</p>
          </div>
        )}
      </div>
    </div>
  );
}
