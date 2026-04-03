// Topbar component – header with page title and avatar placeholder
import React from 'react';
import { Bell } from 'lucide-react';

export default function Topbar({ title = 'Dashboard' }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-outline-variant">
      <h2 className="text-2xl font-semibold text-on-surface">{title}</h2>
      <div className="flex items-center space-x-4">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        {/* Avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-medium">
          UG
        </div>
      </div>
    </header>
  );
}

