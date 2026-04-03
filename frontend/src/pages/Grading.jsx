import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Grading() {
  return (
    <div className="flex h-full gap-6">
      {/* Left: Answers panel */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <h2 className="text-2xl font-bold text-on-surface mb-4">Cluster 1A Answers (25)</h2>
        
        {/* Placeholder for individual answers in the cluster */}
        {[1, 2, 3].map((num) => (
          <Card key={num}>
            <p className="text-on-surface text-sm leading-relaxed">
              "The process begins with transpiration leading to stomatal opening which allows for gas exchange. This ensures the plant receives adequate CO2 for photosynthesis..."
            </p>
            <p className="text-xs text-on-surface-variant mt-3 text-right">Student ID: 104{num}</p>
          </Card>
        ))}
      </div>

      {/* Right: Rubric and Marking panel */}
      <div className="w-96 flex flex-col gap-6">
        <Card title="Rubric">
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center bg-background border border-outline-variant px-3 py-2 rounded-md">
              <span className="text-sm font-medium">Mentions Transpiration</span>
              <span className="text-sm font-bold text-on-surface">+2 pts</span>
            </div>
            <div className="flex justify-between items-center bg-background border border-outline-variant px-3 py-2 rounded-md">
              <span className="text-sm font-medium">Mentions Stomata</span>
              <span className="text-sm font-bold text-on-surface">+1.5 pts</span>
            </div>
            <div className="flex justify-between items-center bg-background border border-outline-variant px-3 py-2 rounded-md">
              <span className="text-sm font-medium">Explains Water Loss</span>
              <span className="text-sm font-bold text-on-surface">+1.5 pts</span>
            </div>
            
            <div className="mt-6 pt-4 border-t border-outline-variant">
              <p className="text-sm font-semibold mb-2">Assign Score</p>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  min="0" 
                  max="5" 
                  defaultValue="5"
                  className="w-20 px-3 py-2 rounded-md bg-background border border-outline-variant text-on-surface focus:ring-1 focus:ring-on-surface"
                />
                <span className="text-sm text-on-surface-variant">/ 5 pts total</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={() => alert('Grades applied to all 25 students')}>Apply Score to Cluster</Button>
          <Button variant="secondary" onClick={() => alert('Returning to Results')}>Back to Results</Button>
        </div>
      </div>
    </div>
  );
}
