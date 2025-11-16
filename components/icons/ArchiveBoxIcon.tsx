import React from 'react';

export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="3" y="3" width="18" height="5" rx="2" ry="2" />
    <path d="M3 8v11a2 2 0 002 2h14a2 2 0 002-2V8" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);
