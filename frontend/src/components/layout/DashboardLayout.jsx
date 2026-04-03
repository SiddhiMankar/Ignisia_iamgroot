import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { LayoutDashboard, FileText, UploadCloud, CheckCircle, BarChart3, Settings } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: FileText, label: 'Exams & Subjects', path: '/exams' },
    { icon: UploadCloud, label: 'Upload Sheets', path: '/upload' },
    { icon: CheckCircle, label: 'Review Hub', path: '/review' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-surface">
        {/* Topbar */}
        <Topbar />
        <div className="flex-1 overflow-y-auto p-8 z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
