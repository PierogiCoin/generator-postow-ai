import React from 'react';

export const IdentificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}>
    <path d="M20 8.68V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.68" />
    <path d="M12 12h.01" />
    <path d="M6 12a6 6 0 0 1 6-6" />
    <path d="M12 18a6 6 0 0 1-6-6" />
    <path d="M18 12a6 6 0 0 0-6-6" />
    <path d="M6 12a6 6 0 0 0 6 6" />
    <path d="M12 6a6 6 0 0 1 6 6" />
    <path d="M12 18a6 6 0 0 0 6-6" />
    <path d="M22 12h-4" />
    <path d="M18 10v4" />
  </svg>
);