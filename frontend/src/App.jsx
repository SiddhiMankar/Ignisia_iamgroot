import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import FacultyReview from './pages/FacultyReview';
import UploadSheets from './pages/UploadSheets';
import EvaluationSessionBuilder from './pages/EvaluationSessionBuilder';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import Grading from './pages/Grading';

// Placeholder empty page for other routes
const Placeholder = ({ title }) => (
  <div className="bg-surface border border-outline-variant rounded-xl flex flex-col items-center justify-center h-64 text-center shadow-sm">
    <h2 className="text-2xl font-bold text-on-surface mb-2">{title}</h2>
    <p className="text-on-surface-variant">This module represents part of the application flow.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/exams" element={<EvaluationSessionBuilder />} />
          <Route path="/upload" element={<UploadSheets />} />
          <Route path="/review" element={<Results />} />
          <Route path="/grading" element={<Grading />} />
          <Route path="/analytics" element={<Placeholder title="Analytics Engine" />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}


export default App;
