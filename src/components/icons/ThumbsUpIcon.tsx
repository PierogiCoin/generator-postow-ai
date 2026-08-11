import React from 'react';

export const ThumbsUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M7 10v12" />
    <path d="M18 10V5.5a3.5 3.5 0 0 0-7 0V12H4.83a2 2 0 0 0-1.79 2.89L5 22h12a2 2 0 0 0 2-2v-6.5a2.5 2.5 0 0 0-2.5-2.5H18Z" />
  </svg>
);
