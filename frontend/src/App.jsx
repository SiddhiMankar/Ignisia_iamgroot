import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import FacultyReview from './pages/FacultyReview';

// Placeholder empty page for other routes
const Placeholder = ({ title }) => (
  <div className="premium-card flex flex-col items-center justify-center h-64 text-center">
    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
    <p className="text-slate-400">This module represents part of the application flow.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/review" replace />} />
          <Route path="/exams" element={<Placeholder title="Exams & Subjects" />} />
          <Route path="/upload" element={<Placeholder title="Upload Answer Sheets" />} />
          <Route path="/review" element={<FacultyReview />} />
          <Route path="/analytics" element={<Placeholder title="Analytics Engine" />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
