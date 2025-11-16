import React from 'react';

export const SuggestHashtagsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M4 9h16" />
        <path d="M4 15h16" />
        <path d="M10 3L8 21" />
        <path d="M16 3l-2 18" />
        <path d="M18 5h3M19.5 3.5v3"/>
    </svg>
);
