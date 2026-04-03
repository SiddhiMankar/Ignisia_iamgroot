import React from 'react';
import ClusterCard from '../components/ui/ClusterCard';

// Dummy state (Phase 7.1)
const clusters = [
  { id: '1A', answers: 25, keywords: ["transpiration", "stomata", "water loss"] },
  { id: '2B', answers: 12, keywords: ["humidity", "environment", "evaporation"] },
  { id: '3C', answers: 4, keywords: ["photosynthesis", "sunlight"] },
];

export default function Results() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-bold text-on-surface">Clustering Results</h2>
        <p className="text-on-surface-variant mt-2">AI has finished analyzing the answers. Proceed to grade by clusters.</p>
      </section>

      {/* Render dynamically (Phase 7.2) */}
      <section className="space-y-6">
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.id} cluster={cluster} />
        ))}
      </section>
    </div>
  );
}
