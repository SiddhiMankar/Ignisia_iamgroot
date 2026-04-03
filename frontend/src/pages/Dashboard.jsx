import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="p-8 bg-surface border border-outline-variant rounded-xl shadow-sm">
        <h1 className="font-display text-4xl font-bold text-on-surface">Welcome, Professor</h1>
        <p className="mt-2 text-on-surface-variant">Your curated academic dashboard.</p>
      </section>
      
      {/* Stats cards using Card.jsx */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Average Grade" value="B+" />
        <Card title="Pending Reviews" value="12" />
        <Card title="New Submissions" value="5" />
      </section>
      
      {/* Action area */}
      <div className="flex gap-4">
        <Button variant="primary" onClick={() => alert('Placeholder action')}>Add Comment</Button>
        <Button variant="secondary" onClick={() => alert('Secondary action')}>View Reports</Button>
      </div>
    </div>
  );
}
