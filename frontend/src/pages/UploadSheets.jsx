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
         <h2 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">Data Ingestion</h2>
         <h1 className="text-3xl font-bold text-black">Upload Answer Sheets</h1>
         <p className="text-gray-600 mt-2">
            Upload the raw handwritten assessment PDFs. The AI system will automatically handle text segmentation, noise cleanup, and structural clustering.
         </p>
      </header>

      {/* Drag & Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`minimal-card relative border-2 border-dashed flex flex-col items-center justify-center p-16 transition-colors cursor-pointer group ${
          selectedFile ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
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
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6 group-hover:bg-gray-200 group-hover:scale-105 transition-all">
              <UploadCloud className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-xl font-semibold text-black mb-2">Drag and drop your file here</h3>
            <p className="text-gray-500">or click to browse your computer (PDF, JPEG, PNG)</p>
          </>
        ) : (
          <div className="flex flex-col items-center w-full z-10">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <File className="w-12 h-12 text-black" />
            </div>
            <p className="text-lg font-medium text-black mb-2 text-center break-all">{selectedFile.name}</p>
            <p className="text-sm text-gray-500 mb-6 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            
            {uploadStatus === 'success' && (
              <div className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-full mb-6">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">File successfully delivered to AI Engine</span>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="flex items-center text-red-700 bg-red-50 px-4 py-2 rounded-full mb-6">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Failed to upload. Is the backend server running?</span>
              </div>
            )}

            <div className="flex space-x-4">
              <button 
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </button>
              
              <button 
                className="px-8 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center"
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
        <div className="minimal-card bg-gray-50 border-gray-200">
           <h4 className="text-black font-medium mb-2">Automated Pipelining</h4>
           <p className="text-sm text-gray-600 leading-relaxed">
             The moment your file completes uploading, our Node.js server acknowledges the request and immediately fires off an asynchronous webhook to the Python AI engine to begin processing the images in the background.
           </p>
        </div>
        <div className="minimal-card bg-gray-50 border-gray-200">
           <h4 className="text-black font-medium mb-2">Supported Entities</h4>
           <p className="text-sm text-gray-600 leading-relaxed">
             Currently restricted to single-page scanned PDFs or high-resolution JPEGs. Pytesseract extraction may fail if handwritten logic is too blurred or illegible for baseline mapping.
           </p>
        </div>
      </div>
    </div>
  );
}
