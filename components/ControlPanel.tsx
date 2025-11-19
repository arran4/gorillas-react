import React from 'react';
import { Turn, GameState } from '../types';

interface ControlPanelProps {
  turn: Turn;
  gameState: GameState;
  onFire: (angle: number, velocity: number) => void;
  wind: number;
  isProcessing: boolean;
  gameMode: 'PVP' | 'CPU';
  aiTaunt?: string;
  angle: number;
  velocity: number;
  setAngle: (a: number) => void;
  setVelocity: (v: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  turn, 
  gameState, 
  onFire, 
  wind, 
  isProcessing,
  gameMode,
  aiTaunt,
  angle,
  velocity,
  setAngle,
  setVelocity
}) => {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    onFire(angle, velocity);
  };

  const isCpuTurn = gameMode === 'CPU' && turn === Turn.PLAYER_2;

  if (gameState !== GameState.PLAYING) return null;

  // Calculate percentage for power bar (max velocity is 200)
  const powerPercent = Math.min(100, (velocity / 200) * 100);

  return (
    <div className="absolute bottom-0 left-0 w-full bg-neutral-800/90 border-t-4 border-retro-gray p-4 font-mono text-white flex justify-between items-center z-20 select-none">
      
      <div className={`text-xl font-bold ${turn === Turn.PLAYER_1 ? 'text-retro-cyan' : 'text-retro-gray'}`}>
        PLAYER 1
      </div>

      {/* Wind Indicator */}
      <div className="flex flex-col items-center w-1/5">
        <span className="text-xs text-retro-yellow mb-1">WIND</span>
        <div className="w-full h-4 bg-gray-700 relative rounded overflow-hidden border border-gray-600">
          <div 
            className="absolute top-0 bottom-0 bg-retro-red transition-all duration-500"
            style={{
              left: '50%',
              width: `${Math.abs(wind)}%`,
              transform: wind > 0 ? 'translateX(0)' : 'translateX(-100%)'
            }}
          />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white opacity-50" />
        </div>
        <span className="text-xs mt-1 text-gray-400">{wind > 0 ? '>>>' : '<<<'} {Math.abs(Math.round(wind))}</span>
      </div>

      {/* Controls Center */}
      <div className="flex items-center gap-6 flex-1 justify-center">
        {isCpuTurn ? (
          <div className="text-retro-yellow animate-pulse text-center">
            <p>GEMINI AI IS THINKING...</p>
            {aiTaunt && <p className="text-sm italic text-white">"{aiTaunt}"</p>}
          </div>
        ) : (
          <div className="flex items-end gap-6 w-full max-w-md">
            {/* Angle Control */}
            <div className="flex flex-col items-center">
              <label className="text-xs text-retro-gray mb-1">ANGLE</label>
              <div className="flex items-center border-2 border-retro-gray bg-neutral-900 p-2">
                <span className="text-retro-yellow font-bold text-xl w-12 text-center">{angle}°</span>
              </div>
            </div>

            {/* Power Bar (Replaces Velocity Input) */}
            <div className="flex flex-col flex-1">
              <label className="text-xs text-retro-gray mb-1 flex justify-between">
                <span>POWER (HOLD SPACE)</span>
                <span className="text-retro-yellow">{Math.round(velocity)}</span>
              </label>
              <div className="h-10 w-full bg-neutral-900 border-2 border-retro-gray relative">
                {/* Power Fill */}
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75 ease-linear"
                  style={{ width: `${powerPercent}%` }}
                />
                {/* Tick Marks */}
                <div className="absolute inset-0 flex justify-between px-2">
                   {[...Array(9)].map((_, i) => (
                     <div key={i} className="h-full w-0.5 bg-black/20" />
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`text-xl font-bold ${turn === Turn.PLAYER_2 ? 'text-retro-cyan' : 'text-retro-gray'}`}>
        {gameMode === 'CPU' ? 'GEMINI AI' : 'PLAYER 2'}
      </div>
    </div>
  );
};
