import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, UploadCloud, CheckCircle, BarChart3, Settings } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function DashboardLayout({ children }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: FileText, label: 'Exams & Subjects', path: '/exams' },
    { icon: UploadCloud, label: 'Upload Sheets', path: '/upload' },
    { icon: CheckCircle, label: 'Review Hub', path: '/review' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      {/* Interactive Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div 
          className="absolute top-[-10%] left-[-5%] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)` }}
        >
          <div className="w-96 h-96 bg-blue-200 blob animate-float-slow" />
        </div>
        
        <div 
          className="absolute top-[20%] right-[-10%] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * 50}px, ${mousePos.y * 50}px)` }}
        >
          <div className="w-[500px] h-[500px] bg-pink-100 blob animate-float-medium ease-in-out" style={{ animationDelay: '2s' }} />
        </div>

        <div 
          className="absolute bottom-[-20%] left-[20%] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * -60}px, ${mousePos.y * -60}px)` }}
        >
          <div className="w-[600px] h-[600px] bg-violet-100 blob animate-float-slow" style={{ animationDelay: '4s' }} />
        </div>

        <div 
          className="absolute top-[60%] right-[30%] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)` }}
        >
          <div className="w-80 h-80 bg-teal-50 blob animate-float-medium" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-transparent flex flex-col z-20">
        <div className="h-24 flex items-center px-8">
          <img src={logo} alt="Rubrixa Logo" className="w-9 h-9 object-contain mr-3 filter drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Rubrixa
          </h1>
        </div>

        <nav className="flex-1 py-4 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform group ${
                  isActive 
                    ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-[0_4px_20px_-4px_rgba(79,70,229,0.15)] scale-[1.02]' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 hover:scale-[1.02] hover:shadow-sm'
                }`
              }
            >
              <item.icon className={`w-5 h-5 transition-all duration-300 ${item.isActive ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-gray-600 group-hover:scale-110'}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6">
          <button className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 hover:shadow-sm rounded-xl transition-all duration-300 ease-in-out w-full group transform hover:scale-[1.02]">
            <Settings className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:rotate-90 transition-all duration-300" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-transparent z-10">
        {/* Navbar */}
        <header className="h-24 flex items-center justify-end px-12 z-20 bg-transparent">
          <div className="flex items-center space-x-4 cursor-pointer group transition-all duration-300 ease-in-out hover:scale-105 bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/50">
            <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Admin Area</span>
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform duration-300 group-hover:rotate-12">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-12 pb-12 z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
