import React, { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { LayoutDashboard, FileText, UploadCloud, CheckCircle, BarChart3, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const SidebarContext = createContext();

export default function DashboardLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: FileText, label: 'Exams & Subjects', path: '/exams' },
    { icon: UploadCloud, label: 'Upload Sheets', path: '/upload' },
    { icon: CheckCircle, label: 'Review Hub', path: '/review' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        {/* Sidebar */}
        {!isCollapsed && <Sidebar />}

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Topbar */}
          <Topbar />
          
          {/* Ambient background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-brand-600/10 blur-[100px] pointer-events-none rounded-full" />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
            {children}
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
