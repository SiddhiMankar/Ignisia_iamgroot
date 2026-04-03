// Card component – reusable UI primitive
import React from 'react';

export default function Card({ title, value, children }) {
  return (
    <div className="p-6 bg-surface border border-outline-variant rounded-xl shadow-ghost transition-all duration-300 hover:shadow-sm hover:-translate-y-[1px]">
      {title && <h3 className="text-lg font-semibold mb-2 text-on-surface">{title}</h3>}
      {value && <p className="text-2xl font-bold text-on-surface">{value}</p>}
      {children}
    </div>
  );
}

