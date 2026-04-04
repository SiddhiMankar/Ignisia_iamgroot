import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UploadCloud } from 'lucide-react';

export default function UploadSheets() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = () => {
    setIsUploading(true);
    setProgress(0);
    // Fake progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsUploading(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-bold text-on-surface">Upload Answer Sheets</h2>
        <p className="text-on-surface-variant mt-2">Upload student submissions to begin the AI grading process.</p>
      </section>

      <Card>
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-outline-variant rounded-xl bg-background">
          <UploadCloud className="w-16 h-16 text-on-surface mb-4" />
          <p className="text-lg font-medium text-on-surface">Drag & drop your files here</p>
          <p className="text-sm text-on-surface-variant mb-6">Supports PDF, JPG, PNG (Max 50MB)</p>
          
          {isUploading ? (
            <div className="w-full max-w-md">
              <div className="h-2 bg-surface-container-high border border-outline-variant rounded-full overflow-hidden">
                <div 
                  className="h-full bg-on-surface transition-all duration-200" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center mt-2 text-sm text-on-surface-variant">Uploading... {progress}%</p>
            </div>
          ) : (
            <Button variant="primary" onClick={handleUpload}>Browse Files</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
