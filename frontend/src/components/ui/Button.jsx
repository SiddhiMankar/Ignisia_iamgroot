import React from 'react';

/**
 * Placeholder Button component following the Academic Curator design.
 * Props: `variant` ('primary' | 'secondary' | 'tertiary'), `children`, `onClick`.
 * Uses CSS variables defined in design.module.css.
 */
export default function Button({ variant = 'primary', children, onClick }) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]';
  const variantClasses = {
    primary: 'bg-primary text-white shadow-sm border border-transparent hover:bg-gray-800',
    secondary: 'bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low shadow-sm',
    tertiary: 'text-on-surface hover:bg-surface-container-low',
  }[variant];
  return (
    <button className={`${baseClasses} ${variantClasses}`} onClick={onClick}>
      {children}
    </button>
  );
}
