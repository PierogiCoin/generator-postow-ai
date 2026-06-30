import React from 'react';

interface KeyboardIconProps {
  className?: string;
}

export const KeyboardIcon: React.FC<KeyboardIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" 
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M8.25 8.25h.008v.008H8.25V8.25zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5V8.25zm0 2.25h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75V8.25zm0 2.25h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15V8.25zm0 2.25h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zm-6 2.25h7.5v.008H9v-.008z" 
    />
  </svg>
);

export default KeyboardIcon;
