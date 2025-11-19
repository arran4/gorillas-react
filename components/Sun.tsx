import React from 'react';

interface SunProps {
  isShocked: boolean;
}

export const Sun: React.FC<SunProps> = ({ isShocked }) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-0">
      <svg width="60" height="60" viewBox="0 0 100 100">
        {/* Rays */}
        <circle cx="50" cy="50" r="45" fill="#FFFF55" className="animate-pulse" />
        
        {/* Face */}
        <circle cx="50" cy="50" r="35" fill="#FFFF00" stroke="#CCAA00" strokeWidth="2" />
        
        {/* Eyes */}
        <circle cx="35" cy="40" r="4" fill="black" />
        <circle cx="65" cy="40" r="4" fill="black" />
        
        {/* Mouth */}
        {isShocked ? (
          <circle cx="50" cy="70" r="10" fill="none" stroke="black" strokeWidth="3" />
        ) : (
          <path d="M 30 65 Q 50 80 70 65" stroke="black" strokeWidth="3" fill="none" />
        )}
      </svg>
    </div>
  );
};
