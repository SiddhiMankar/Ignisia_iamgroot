import React, { useRef, useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

export default function FileUploadCard({ onFileSelect, accept = ".pdf,image/*", label = "Upload File", hint = "Drag and drop or click to select" }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div 
      className={`premium-card relative flex flex-col items-center justify-center p-12 text-center border-dashed border-2 cursor-pointer transition-all duration-300
        ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/50'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      
      {!selectedFile ? (
        <>
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
            <UploadCloud className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">{label}</h3>
          <p className="text-slate-400 max-w-md">{hint}</p>
        </>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
            <File className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-emerald-400 mb-1">File Selected</h3>
          <p className="text-slate-300 mb-6 truncate max-w-xs">{selectedFile.name}</p>
          <button 
            onClick={clearFile}
            className="flex items-center text-sm text-slate-400 hover:text-rose-400 transition-colors"
          >
            <X className="w-4 h-4 mr-1" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
