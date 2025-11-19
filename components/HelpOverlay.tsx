import React from 'react';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => (
  <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 animate-fade-in" onClick={onClose}>
    <div className="bg-neutral-900 border-4 border-retro-yellow p-8 max-w-md w-full shadow-[8px_8px_0_rgba(255,255,85,0.5)]" onClick={e => e.stopPropagation()}>
      <h2 className="text-3xl font-mono font-bold text-retro-cyan mb-6 text-center">CONTROLS</h2>
      <ul className="space-y-4 font-mono text-white text-lg">
        <li className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-retro-gray">LEFT / RIGHT</span>
          <span className="font-bold text-retro-yellow">Adjust Angle</span>
        </li>
        <li className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-retro-gray">HOLD SPACE</span>
          <span className="font-bold text-retro-red">Charge Power</span>
        </li>
        <li className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-retro-gray">RELEASE SPACE</span>
          <span className="font-bold text-retro-cyan">Fire Shot</span>
        </li>
        <li className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-retro-gray">SHIFT + ARROW</span>
          <span className="font-bold">Fast Adjust</span>
        </li>
        <li className="flex justify-between items-center">
          <span className="text-retro-gray">?</span>
          <span className="font-bold">Toggle Help</span>
        </li>
      </ul>
      <button 
        className="mt-8 w-full bg-retro-red text-white font-bold py-3 border-2 border-white hover:bg-red-600 transition-colors active:translate-y-1"
        onClick={onClose}
      >
        GOT IT
      </button>
    </div>
  </div>
);
