import React from 'react';

export const BlockquoteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}>
    <path d="M6 17h3l2-4V7H5v6h3l-2 4z"/>
    <path d="M14 17h3l2-4V7h-6v6h3l-2 4z"/>
  </svg>
);
