import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileSignature, FileKey, Layers, LayoutDashboard, BrainCircuit, Users, LogOut } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: FileKey, label: 'Faculty Setup', path: '/faculty-setup' },
  { icon: FileSignature, label: 'Student Extraction', path: '/student-extraction' },
  { icon: BrainCircuit, label: 'Evaluation Results', path: '/evaluation-results' },
  { icon: Layers, label: 'Cluster Analysis', path: '/cluster-analysis' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col relative z-20">
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white tracking-widest mr-3 shadow-lg shadow-indigo-600/20">
          AI
        </div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">
          Grading Engine
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
                  ? 'bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/20 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-slate-800 space-y-4">
        <div className="flex items-center space-x-3 text-slate-400 text-sm">
          <Users className="w-5 h-5" />
          <span className="font-medium">Faculty Mode</span>
        </div>
        <button 
          onClick={() => window.location.href = '/login'}
          className="flex items-center space-x-3 text-rose-500 hover:text-rose-400 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
