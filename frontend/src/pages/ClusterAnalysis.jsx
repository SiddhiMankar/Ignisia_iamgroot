import React, { useState } from 'react';
import ProcessingStatusCard from '../components/ui/ProcessingStatusCard';
import ClusterSummaryCard from '../components/ui/ClusterSummaryCard';
import { Layers } from 'lucide-react';

const MOCK_CLUSTERS = {
  "Q1": [
    {
      clusterName: "Perfect Matches",
      studentCount: 18,
      expectedScore: "3/3",
      summary: "Students correctly identified that plants make food using sunlight and release oxygen.",
      students: [
        "Photosynthesis is the process by which plants make food using sunlight. Oxygen is given off.",
        "Plants use energy from the sun to make food. O2 is released.",
        "They use sunlight to make food and release oxygen."
      ]
    },
    {
      clusterName: "Missed Byproduct",
      studentCount: 4,
      expectedScore: "2/3",
      summary: "Students knew they make food with sunlight, but entirely missed mentioning oxygen or any byproduct.",
      students: [
        "Plants use sunlight but I forgot the rest.",
        "Photosynthesis is when a plant makes its own food from the sun."
      ]
    }
  ],
  "Q2": [
    {
      clusterName: "Full Formula & Law",
      studentCount: 30,
      expectedScore: "2/2",
      summary: "Accurately stated the formula for Newton's Second Law.",
      students: [
        "F = ma because of Newton's second law."
      ]
    }
  ]
};

export default function ClusterAnalysis({ evaluatedPayloads }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [clustersCalculated, setClustersCalculated] = useState(false);
  const [activeTab, setActiveTab] = useState("Q1");

  const STAGES = [
    "DBSCAN clustering of embedding vectors...",
    "Finding centroids...",
    "Generating AI summaries for cluster groups...",
    "Preparing matrix for manual review..."
  ];

  const handleClusterCalc = () => {
    setIsProcessing(true);
    setProcessStep(0);
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setProcessStep(currentStep);
      
      if (currentStep >= STAGES.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          setClustersCalculated(true);
        }, 600);
      }
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Cluster Analysis</h1>
          <p className="text-slate-400">Review grouped student answers designed for mass grading acceleration.</p>
        </div>
        
        {!clustersCalculated && !isProcessing && (
           <button 
             onClick={handleClusterCalc}
             className="px-6 py-2.5 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-indigo-500/50 flex flex-items-center"
           >
             <Layers className="w-5 h-5 mr-2" />
             Execute Clustering
           </button>
        )}
      </header>

      {/* PROCESSING STATE */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto mt-12">
          <ProcessingStatusCard 
            title="Clustering Engine Active" 
            stages={STAGES} 
            currentStageIndex={processStep} 
          />
        </div>
      )}

      {/* RESULTS STATE */}
      {clustersCalculated && !isProcessing && (
        <div className="animate-in fade-in flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left Pane: Question Nav */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-2 sticky top-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2 mb-3">Questions</h3>
            {Object.keys(MOCK_CLUSTERS).map(qId => (
               <button
                 key={qId}
                 onClick={() => setActiveTab(qId)}
                 className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors border ${
                   activeTab === qId 
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' 
                    : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-800'
                 }`}
               >
                 Question {qId}
               </button>
            ))}
          </div>

          {/* Right Pane: Clusters */}
          <div className="flex-1 min-w-0">
             <div className="mb-6 flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-200">
                 Identified <span className="text-indigo-400">{MOCK_CLUSTERS[activeTab]?.length || 0}</span> Clusters for {activeTab}
               </h2>
             </div>
             
             <div className="space-y-4">
               {MOCK_CLUSTERS[activeTab]?.map((cluster, idx) => (
                 <ClusterSummaryCard key={idx} cluster={cluster} />
               ))}
             </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
