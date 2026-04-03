import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, CheckCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EvaluationSessionBuilder() {
  const [sessionTitle, setSessionTitle] = useState('Midterm Term Dynamics 2026');
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      questionNumber: 'Q1',
      questionText: '',
      maxMarks: 5,
      rubric: [
        { id: Date.now() + 1, ruleType: 'KEYWORD', description: '', pointsAllocated: 1 }
      ]
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(),
      questionNumber: `Q${questions.length + 1}`,
      questionText: '',
      maxMarks: 5,
      rubric: [{ id: Date.now() + 1, ruleType: 'KEYWORD', description: '', pointsAllocated: 1 }]
    }]);
  };

  const addRubricRule = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].rubric.push({
      id: Date.now(),
      ruleType: 'KEYWORD',
      description: '',
      pointsAllocated: 1
    });
    setQuestions(newQuestions);
  };

  const updateRubricRule = (qIndex, ruleIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].rubric[ruleIndex][field] = value;
    setQuestions(newQuestions);
  };

  const saveSession = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title: sessionTitle,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          maxMarks: q.maxMarks,
          rubric: q.rubric.map(r => ({
            ruleType: r.ruleType,
            description: r.description,
            pointsAllocated: Number(r.pointsAllocated)
          }))
        }))
      };

      const res = await axios.post('http://localhost:5000/api/sessions/create', payload);
      alert(`Session Created! ID: ${res.data.sessionId}`);
      navigate('/upload');
      
    } catch (error) {
      console.error(error);
      alert("Failed to save session. Is the backend running?");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 mt-4 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">Configuration</h2>
          <h1 className="text-3xl font-bold text-black">Rule Builder</h1>
          <p className="text-gray-600 mt-2">Define explicit expectations to constrain the AI Evaluation Engine.</p>
        </div>
        <button 
          onClick={saveSession}
          disabled={isSaving}
          className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center"
        >
          {isSaving ? <CheckCircle className="animate-spin mr-2 w-5 h-5" /> : <Save className="mr-2 w-5 h-5" />}
          Finalize Session
        </button>
      </header>

      <div className="minimal-card p-6">
        <label className="text-sm font-medium text-gray-600 block mb-2">Evaluation Session Title</label>
        <input 
          type="text" 
          value={sessionTitle}
          onChange={e => setSessionTitle(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="minimal-card p-6 border border-gray-200 relative">
            <div className="flex gap-4 mb-6">
              <div className="w-24">
                <label className="text-xs text-gray-600 font-medium mb-1 block">Q.</label>
                <input 
                  type="text" 
                  value={q.questionNumber}
                  onChange={(e) => {
                     const newQ = [...questions]; newQ[qIndex].questionNumber = e.target.value; setQuestions(newQ);
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-900 outline-none focus:border-black"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 font-medium mb-1 block">Question Prompt</label>
                <input 
                  type="text" 
                  placeholder="Explain the relationship between mass and gravity..."
                  value={q.questionText}
                  onChange={(e) => {
                     const newQ = [...questions]; newQ[qIndex].questionText = e.target.value; setQuestions(newQ);
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-900 outline-none focus:border-black"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-600 font-medium mb-1 block">Marks</label>
                <input 
                  type="number" 
                  value={q.maxMarks}
                  onChange={(e) => {
                     const newQ = [...questions]; newQ[qIndex].maxMarks = e.target.value; setQuestions(newQ);
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-black font-bold outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-medium text-gray-800">Strict AI Rubric Rules</h4>
                 <button onClick={() => addRubricRule(qIndex)} className="text-xs text-black font-semibold hover:text-gray-600 flex items-center">
                   <Plus className="w-3 h-3 mr-1" /> Add Rule
                 </button>
              </div>
              
              <div className="space-y-3">
                {q.rubric.map((rule, rIndex) => (
                  <div key={rule.id} className="flex gap-2 items-center">
                    <select 
                      value={rule.ruleType}
                      onChange={e => updateRubricRule(qIndex, rIndex, 'ruleType', e.target.value)}
                      className="bg-white border border-gray-300 rounded p-2 text-sm text-gray-800 outline-none"
                    >
                      <option value="KEYWORD">Keyword Match</option>
                      <option value="CONCEPT">Semantic Concept</option>
                      <option value="FORMULA">Formula/Math</option>
                      <option value="EDGE_CASE">Conditional Flag</option>
                    </select>
                    
                    <input 
                       type="text" 
                       placeholder="e.g. Must mention the word 'acceleration'"
                       value={rule.description}
                       onChange={e => updateRubricRule(qIndex, rIndex, 'description', e.target.value)}
                       className="flex-1 bg-white border border-gray-300 rounded p-2 text-sm text-gray-900 outline-none"
                    />

                    <input 
                       type="number" 
                       value={rule.pointsAllocated}
                       onChange={e => updateRubricRule(qIndex, rIndex, 'pointsAllocated', e.target.value)}
                       className="w-16 bg-white border border-gray-300 rounded p-2 text-sm text-center text-gray-800 outline-none"
                       title="Points awarded (or deducted if negative) when rule is met"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}

        <button 
          onClick={addQuestion}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-black justify-center hover:border-gray-500 hover:bg-gray-50 transition-all flex items-center font-medium"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Next Question
        </button>
      </div>
    </div>
  );
}
