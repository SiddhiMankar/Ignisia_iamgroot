import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import FacultySetup from './pages/FacultySetup';
import StudentExtraction from './pages/StudentExtraction';
import EvaluationResults from './pages/EvaluationResults';
import ClusterAnalysis from './pages/ClusterAnalysis';

function App() {
  // Global Workflow State
  // We lift state up here so that when faculty parses a rubric, it is available for evaluation later.
  const [activeRubric, setActiveRubric] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [evaluatedPayloads, setEvaluatedPayloads] = useState([]);

  // Provide state tightly through contexts or passing props, here we will pass props for simplicity
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/faculty-setup" replace />} />
          
          <Route 
            path="/faculty-setup" 
            element={<FacultySetup activeRubric={activeRubric} setActiveRubric={setActiveRubric} />} 
          />
          
          <Route 
            path="/student-extraction" 
            element={<StudentExtraction activeRubric={activeRubric} studentAnswers={studentAnswers} setStudentAnswers={setStudentAnswers} />} 
          />
          
          <Route 
            path="/evaluation-results" 
            element={<EvaluationResults activeRubric={activeRubric} evaluatedPayloads={evaluatedPayloads} setEvaluatedPayloads={setEvaluatedPayloads} />} 
          />
          
          <Route 
            path="/cluster-analysis" 
            element={<ClusterAnalysis evaluatedPayloads={evaluatedPayloads} />} 
          />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
