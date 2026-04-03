import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, CheckCircle, BarChart3, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: FileText, label: 'Exams & Subjects', path: '/exams' },
    { icon: UploadCloud, label: 'Upload Sheets', path: '/upload' },
    { icon: CheckCircle, label: 'Review Hub', path: '/review' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white tracking-widest mr-3">
            IG
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Ignisia Core
          </h1>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-600/10 text-brand-400 ' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <button className="flex items-center space-x-3 text-slate-400 hover:text-white transition-colors w-full">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          
          <button 
            onClick={() => {
              // Clear any auth tokens here if securely logged in in the future
              window.location.href = '/login';
            }}
            className="flex items-center space-x-3 text-rose-400 hover:text-rose-300 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-brand-600/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="flex-1 overflow-y-auto p-8 z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
