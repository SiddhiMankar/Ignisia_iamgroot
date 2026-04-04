import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, X, CheckCircle, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';

const FILE_STATES = { PENDING: 'pending', UPLOADING: 'uploading', DONE: 'done', ERROR: 'error' };

export default function StudentExtraction({ activeRubric, studentAnswers, setStudentAnswers }) {
  const [files, setFiles] = useState([]); // [{ id, file, status, error }]
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  // ── File helpers ──────────────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(f.type)
    );
    const mapped = valid.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: FILE_STATES.PENDING,
      error: null
    }));
    setFiles(prev => {
      // Deduplicate by name
      const existingNames = new Set(prev.map(p => p.file.name));
      return [...prev, ...mapped.filter(m => !existingNames.has(m.file.name))];
    });
  }, []);

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Upload ────────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsSubmitting(true);

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: FILE_STATES.UPLOADING })));

    const formData = new FormData();
    files.forEach(f => formData.append('answerSheets', f.file));
    formData.append('sessionId', activeRubric?.sessionId || activeRubric?.rubricDocumentId || 'DEMO_SESSION_ID');
    formData.append('documentType', 'answer_sheet');

    try {
      const res = await axios.post(`${baseUrl}/api/submissions/upload-batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Mark all as done
      setFiles(prev => prev.map(f => ({ ...f, status: FILE_STATES.DONE })));
      setStudentAnswers(res.data.submissions || []);

      // Pause briefly so user sees the success state, then navigate
      setTimeout(() => navigate('/cluster-analysis'), 1500);

    } catch (error) {
      console.error('Batch upload failed:', error);
      const detail = error?.response?.data?.error || error.message;
      setFiles(prev => prev.map(f => ({ ...f, status: FILE_STATES.ERROR, error: detail })));
      setIsSubmitting(false);
    }
  };

  const pendingCount = files.filter(f => f.status === FILE_STATES.PENDING).length;
  const doneCount = files.filter(f => f.status === FILE_STATES.DONE).length;
  const allDone = files.length > 0 && doneCount === files.length;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            Step 2 of 3
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-1">Upload Student Sheets</h1>
        <p className="text-slate-400">Drop all student answer PDFs at once — we'll process them in parallel.</p>
      </header>

      {/* Warning if no rubric loaded */}
      {!activeRubric && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-300">
          <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm"><strong>No rubric loaded.</strong> Return to Faculty Setup first so answers can be aligned to the marking scheme.</p>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isSubmitting && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
          ${isDragOver
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'}
          ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors
          ${isDragOver ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
          <UploadCloud className={`w-8 h-8 transition-colors ${isDragOver ? 'text-indigo-400' : 'text-slate-500'}`} />
        </div>
        <p className="text-lg font-semibold text-slate-200 mb-1">
          {isDragOver ? 'Drop files here!' : 'Drag & drop answer sheets'}
        </p>
        <p className="text-sm text-slate-500 mb-3">Supports PDF, PNG, JPG — select multiple files at once</p>
        <div className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors">
          Browse Files
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              {files.length} file{files.length !== 1 ? 's' : ''} queued
            </h2>
            {!isSubmitting && (
              <button
                onClick={() => setFiles([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {files.map((f) => (
            <div
              key={f.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                ${f.status === FILE_STATES.DONE ? 'bg-green-500/5 border-green-500/20' :
                  f.status === FILE_STATES.ERROR ? 'bg-red-500/5 border-red-500/20' :
                  f.status === FILE_STATES.UPLOADING ? 'bg-indigo-500/5 border-indigo-500/20' :
                  'bg-slate-900 border-slate-800'}`}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{f.file.name}</p>
                <p className="text-xs text-slate-500">{(f.file.size / 1024).toFixed(1)} KB</p>
                {f.error && <p className="text-xs text-red-400 mt-0.5">{f.error}</p>}
              </div>
              <div className="flex-shrink-0">
                {f.status === FILE_STATES.PENDING && !isSubmitting && (
                  <button onClick={() => removeFile(f.id)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === FILE_STATES.UPLOADING && (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
                {f.status === FILE_STATES.DONE && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {f.status === FILE_STATES.ERROR && (
                  <X className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload CTA */}
      {files.length > 0 && !allDone && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isSubmitting || pendingCount === 0}
            className={`px-8 py-3.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all
              ${isSubmitting
                ? 'bg-indigo-600/50 text-white/60 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:shadow-indigo-500/40'}`}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Uploading & Processing...</>
            ) : (
              <>Run AI Evaluation on {pendingCount} Paper{pendingCount !== 1 ? 's' : ''} <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      )}

      {/* All done state */}
      {allDone && (
        <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-300">All {doneCount} papers queued successfully!</p>
              <p className="text-sm text-slate-400 mt-0.5">Redirecting to Cluster Analysis...</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/cluster-analysis')}
            className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            View Results <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
