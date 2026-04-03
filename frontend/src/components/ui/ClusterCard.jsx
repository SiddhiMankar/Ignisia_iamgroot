import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

export default function ClusterCard({ cluster }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-on-surface">Cluster {cluster.id}</h3>
            <p className="text-sm text-on-surface-variant mt-1">{cluster.answers} identical/similar answers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button variant="primary" onClick={() => alert('Proceed to Grade')}>Grade Cluster</Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-on-surface mb-2">Key Concepts Found:</p>
          <div className="flex flex-wrap gap-2">
            {cluster.keywords.map((keyword, index) => (
              <span 
                key={index} 
                className="px-3 py-1 bg-background border border-outline-variant text-on-surface text-sm rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 p-4 bg-background rounded-lg border border-outline-variant shadow-sm">
            <p className="text-sm font-semibold text-on-surface mb-2">Sample Answer:</p>
            <p className="text-on-surface-variant text-sm italic border-l-4 border-on-surface pl-3 py-2">
              "The process begins with transpiration leading to stomatal opening which allows for gas exchange..."
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
