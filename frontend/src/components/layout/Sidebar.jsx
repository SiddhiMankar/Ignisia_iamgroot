// Sidebar component – vertical navigation with Lucide icons
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, CheckCircle, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: FileText, label: 'Exams & Subjects', path: '/exams' },
  { icon: UploadCloud, label: 'Upload Sheets', path: '/upload' },
  { icon: CheckCircle, label: 'Review Hub', path: '/review' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-background border-r border-outline-variant flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-outline-variant">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white tracking-widest mr-3">
          IG
        </div>
        <h1 className="text-xl font-bold text-on-surface">
          Ignisia Core
        </h1>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-surface-container-highest text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-outline-variant">
        <button className="flex items-center space-x-3 text-on-surface-variant hover:text-primary transition-colors w-full">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}

