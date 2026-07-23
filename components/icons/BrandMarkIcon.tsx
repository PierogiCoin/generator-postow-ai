import React from 'react';

/** Studio Ink brand mark — ink bar + content lines */
export const BrandMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <rect x="4" y="3" width="2.5" height="18" rx="0.5" fill="currentColor" />
    <rect x="9" y="5" width="11" height="2.25" rx="0.5" fill="currentColor" />
    <rect x="9" y="10.5" width="9" height="2.25" rx="0.5" fill="currentColor" opacity="0.75" />
    <rect x="9" y="16" width="6.5" height="2.25" rx="0.5" fill="currentColor" opacity="0.45" />
  </svg>
);
