import React from 'react';

interface WordIconProps {
  className?: string;
}

export const WordIcon: React.FC<WordIconProps> = ({ className = "h-8 w-8" }) => (
  <svg 
    viewBox="0 0 32 32" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <rect x="4" y="4" width="24" height="24" rx="2" fill="#2B579A" />
    {/* Document shape */}
    <path d="M8 8h16v16H8V8z" fill="#fff" fillOpacity="0.2" />
    {/* W letter */}
    <path 
      d="M9 10h2.5l1.5 8 2-6h2l2 6 1.5-8H23l-3 12h-2.5l-2-6-2 6H11l-3-12z" 
      fill="#fff"
    />
  </svg>
);

export default WordIcon;
