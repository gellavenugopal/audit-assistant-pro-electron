import React from 'react';

interface PdfIconProps {
  className?: string;
}

export const PdfIcon: React.FC<PdfIconProps> = ({ className = "h-8 w-8" }) => (
  <svg 
    viewBox="0 0 32 32" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <rect x="4" y="4" width="24" height="24" rx="2" fill="#E2574C" />
    {/* Document fold */}
    <path d="M22 4v6h6" fill="#B33D38" />
    <path d="M22 4l6 6h-6V4z" fill="#fff" fillOpacity="0.3" />
    {/* PDF text */}
    <text 
      x="16" 
      y="20" 
      textAnchor="middle" 
      fontSize="7" 
      fontWeight="bold" 
      fill="#fff" 
      fontFamily="Arial, sans-serif"
    >
      PDF
    </text>
  </svg>
);

export default PdfIcon;
