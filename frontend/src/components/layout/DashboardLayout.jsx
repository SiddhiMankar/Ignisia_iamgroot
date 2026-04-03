import React from 'react';
import { NavLink } from 'react-router-dom';
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
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center font-bold text-white tracking-widest mr-3">
            IG
          </div>
          <h1 className="text-xl font-bold text-black tracking-wide">
            Ignisia Core
          </h1>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 transform group ${
                  isActive 
                    ? 'bg-black text-white font-semibold shadow-md scale-105 my-1' 
                    : 'text-gray-600 hover:bg-black hover:text-white hover:scale-105 my-1'
                }`
              }
            >
              <item.icon className="w-5 h-5 transition-transform duration-300" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-200">
          <button className="flex items-center space-x-3 text-gray-600 hover:text-black transition-all duration-300 transform hover:scale-105 w-full group">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-end px-8 z-20">
          <div className="flex items-center space-x-4 cursor-pointer">
            <span className="text-sm font-medium text-gray-600">Admin Area</span>
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
