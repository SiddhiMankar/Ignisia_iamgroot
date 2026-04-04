import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function EmptyStatePanel({ 
  title = "No Data Available", 
  message = "Upload a file to get started.", 
  Icon = FolderOpen 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-slate-800 rounded-xl bg-slate-900/30">
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-500" />
      </div>
      <h3 className="text-2xl font-semibold text-slate-300 mb-3">{title}</h3>
      <p className="text-slate-500 max-w-md">{message}</p>
    </div>
  );
}
