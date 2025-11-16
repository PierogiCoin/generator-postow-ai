import React from 'react';

export const BrainCircuitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M12 5a3 3 0 1 0-5.993.142" />
    <path d="M12 5a3 3 0 1 1 5.993.142" />
    <path d="M12 19a3 3 0 1 0-5.993-.142" />
    <path d="M12 19a3 3 0 1 1 5.993-.142" />
    <path d="M12 12a3 3 0 1 0-5.993.142" />
    <path d="M12 12a3 3 0 1 1 5.993.142" />
    <path d="M6 12a3 3 0 1 0-5.858-.5" />
    <path d="M18 12a3 3 0 1 1 5.858-.5" />
    <path d="M6.142 6.142A3 3 0 1 0 5 12" />
    <path d="M17.858 6.142A3 3 0 1 1 19 12" />
    <path d="M6.142 17.858A3 3 0 1 1 5 12" />
    <path d="M17.858 17.858A3 3 0 1 0 19 12" />
  </svg>
);