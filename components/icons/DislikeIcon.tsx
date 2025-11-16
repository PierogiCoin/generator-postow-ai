import React from 'react';

export const DislikeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M17 14V2" />
    <path d="M6 14v4.5a3.5 3.5 0 0 0 7 0V12H7.17a2 2 0 0 0-1.79 2.89L7 22h10a2 2 0 0 0 2-2v-6.5a2.5 2.5 0 0 0-2.5-2.5H7Z" />
  </svg>
);