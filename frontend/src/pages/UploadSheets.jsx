import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, File, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadSheets() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'idle', 'success', 'error'
  const fileInputRef = useRef(null);

  // Mock Session ID since we don't have a fully wired router state yet
  const mockSessionId = "60d5ecb74d6bb892b15df991"; 

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadStatus('idle');
    }
  };

  const submitFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');

    // Create the multipart form data expected by Multer
    const formData = new FormData();
    formData.append('answerSheet', selectedFile);
    formData.append('sessionId', mockSessionId);

    try {
      const response = await axios.post('http://localhost:5000/api/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload Acknowledged:', response.data);
      setUploadStatus('success');
    } catch (err) {
      console.error('Upload Error:', err);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4">
      <header>
         <h2 className="text-sm font-semibold text-brand-400 tracking-wider uppercase mb-1">Data Ingestion</h2>
         <h1 className="text-3xl font-bold text-white">Upload Answer Sheets</h1>
         <p className="text-slate-400 mt-2">
            Upload the raw handwritten assessment PDFs. The AI system will automatically handle text segmentation, noise cleanup, and structural clustering.
         </p>
      </header>

      {/* Drag & Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`premium-card relative border-2 border-dashed flex flex-col items-center justify-center p-16 transition-colors cursor-pointer group ${
          selectedFile ? 'border-brand-500 bg-brand-900/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/50'
        }`}
        onClick={() => !selectedFile && fileInputRef.current.click()}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.png,.jpg,.jpeg" 
        />
        
        {!selectedFile ? (
          <>
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-slate-700 group-hover:scale-105 transition-all">
              <UploadCloud className="w-10 h-10 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Drag and drop your file here</h3>
            <p className="text-slate-400">or click to browse your computer (PDF, JPEG, PNG)</p>
          </>
        ) : (
          <div className="flex flex-col items-center w-full z-10">
            <div className="bg-brand-600/20 p-4 rounded-full mb-4">
              <File className="w-12 h-12 text-brand-400" />
            </div>
            <p className="text-lg font-medium text-white mb-2 text-center break-all">{selectedFile.name}</p>
            <p className="text-sm text-slate-400 mb-6 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            
            {uploadStatus === 'success' && (
              <div className="flex items-center text-green-400 bg-green-400/10 px-4 py-2 rounded-full mb-6">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">File successfully delivered to AI Engine</span>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="flex items-center text-red-400 bg-red-400/10 px-4 py-2 rounded-full mb-6">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Failed to upload. Is the backend server running?</span>
              </div>
            )}

            <div className="flex space-x-4">
              <button 
                className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors flex items-center shadow-lg"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </button>
              
              <button 
                className="px-8 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center"
                onClick={(e) => { e.stopPropagation(); submitFile(); }}
                disabled={isUploading || uploadStatus === 'success'}
              >
                 {isUploading ? (
                   <>
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                     Transferring...
                   </>
                 ) : (
                   'Initialize Evaluation'
                 )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="premium-card bg-slate-900 border-slate-800">
           <h4 className="text-slate-300 font-medium mb-2">Automated Pipelining</h4>
           <p className="text-sm text-slate-500 leading-relaxed">
             The moment your file completes uploading, our Node.js server acknowledges the request and immediately fires off an asynchronous webhook to the Python AI engine to begin processing the images in the background.
           </p>
        </div>
        <div className="premium-card bg-slate-900 border-slate-800">
           <h4 className="text-slate-300 font-medium mb-2">Supported Entities</h4>
           <p className="text-sm text-slate-500 leading-relaxed">
             Currently restricted to single-page scanned PDFs or high-resolution JPEGs. Pytesseract extraction may fail if handwritten logic is too blurred or illegible for baseline mapping.
           </p>
        </div>
      </div>
    </div>
  );
}
