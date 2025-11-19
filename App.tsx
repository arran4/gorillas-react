import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ControlPanel } from './components/ControlPanel';
import { Sun } from './components/Sun';
import { HelpOverlay } from './components/HelpOverlay';
import { GameState, Turn, Building, Gorilla, Explosion, BuildingWindow } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BUILDING_COLORS, MAX_WIND, MAX_VELOCITY } from './constants';
import { calculateAiShot } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START_MENU);
  const [gameMode, setGameMode] = useState<'PVP' | 'CPU'>('PVP');
  const [turn, setTurn] = useState<Turn>(Turn.PLAYER_1);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [gorillas, setGorillas] = useState<Gorilla[]>([]);
  const [wind, setWind] = useState<number>(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  
  // Day/Night Cycle State (0.0 to 24.0)
  const [timeOfDay, setTimeOfDay] = useState<number>(12); 
  
  // Shooting State
  const [isShooting, setIsShooting] = useState(false);
  const [shotParams, setShotParams] = useState<{angle: number, velocity: number, shooter: Turn} | null>(null);
  const [sunShocked, setSunShocked] = useState(false);
  
  // Input State
  const [inputAngle, setInputAngle] = useState<number>(45);
  const [inputVelocity, setInputVelocity] = useState<number>(0); // Starts at 0 for charging
  const [isCharging, setIsCharging] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  
  // Ref to track charging direction (1 = up, -1 = down) for the ping-pong effect
  const chargeDirectionRef = useRef<number>(1);

  // AI State
  const [aiThinking, setAiThinking] = useState(false);
  const [aiTaunt, setAiTaunt] = useState<string>("");

  // Winner
  const [winner, setWinner] = useState<Turn | null>(null);

  // Help Overlay
  const [showHelp, setShowHelp] = useState(false);

  // Time Cycle Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        const next = prev + 0.05; // Speed of day cycle
        return next >= 24 ? 0 : next;
      });
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, []);

  // Power Charging Loop (Ping-Pong Style)
  useEffect(() => {
    let chargeInterval: ReturnType<typeof setInterval>;
    
    // Only charge if space is down, not shooting, game is playing, and it's not CPU turn in CPU mode
    const isCpuTurn = gameMode === 'CPU' && turn === Turn.PLAYER_2;
    
    if (isCharging && gameState === GameState.PLAYING && !isShooting && !isCpuTurn) {
      chargeInterval = setInterval(() => {
        setInputVelocity(prevVelocity => {
           // Speed of charge (Lowered for easier control)
           const step = 1.5; 
           let next = prevVelocity + (step * chargeDirectionRef.current);
           
           // Ping-pong logic
           if (next >= MAX_VELOCITY) {
             next = MAX_VELOCITY;
             chargeDirectionRef.current = -1; // Reverse
           } else if (next <= 0) {
             next = 0;
             chargeDirectionRef.current = 1; // Forward
           }
           
           return next;
        });
      }, 16); // ~60fps update
    }

    return () => clearInterval(chargeInterval);
  }, [isCharging, gameState, isShooting, gameMode, turn]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if (isShooting) return;
      
      const isCpuTurn = gameMode === 'CPU' && turn === Turn.PLAYER_2;
      if (isCpuTurn) return;

      const isShift = e.shiftKey;
      const stepLarge = 10;
      const stepSmall = 1;
      const step = isShift ? stepLarge : stepSmall;

      switch(e.key) {
        case 'ArrowLeft': // Increase Angle (Tilt Back)
          e.preventDefault();
          setInputAngle(a => Math.min(360, a + step));
          break;
        case 'ArrowRight': // Decrease Angle (Tilt Forward)
          e.preventDefault();
          setInputAngle(a => Math.max(0, a - step));
          break;
        case ' ': // Space Bar Down
          if (!e.repeat && !isSpaceDown) {
            e.preventDefault();
            setIsSpaceDown(true);
            setIsCharging(true);
            chargeDirectionRef.current = 1; // Always start charging UP
            setInputVelocity(0); // Reset to 0
          }
          break;
        case '?':
        case '/':
          e.preventDefault();
          setShowHelp(prev => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (isSpaceDown && gameState === GameState.PLAYING && !isShooting) {
          setIsSpaceDown(false);
          setIsCharging(false);
          // Fire on Release
          const isCpuTurn = gameMode === 'CPU' && turn === Turn.PLAYER_2;
          if (!isCpuTurn) {
             handleShot(inputAngle, inputVelocity);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, turn, gameMode, isShooting, inputAngle, inputVelocity, isSpaceDown]);

  const generateCity = useCallback(() => {
    const newBuildings: Building[] = [];
    let currentX = 0;
    
    while (currentX < CANVAS_WIDTH) {
      const width = 60 + Math.random() * 60;
      const height = 100 + Math.random() * 300;
      const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
      
      // Adjust last building to fit
      const actualWidth = (currentX + width > CANVAS_WIDTH) ? CANVAS_WIDTH - currentX : width;
      
      // Generate Windows for this building
      const windows: BuildingWindow[] = [];
      const floorHeight = 15;
      const windowGap = 10;
      const winW = 4;
      const winH = 8;

      for (let wy = CANVAS_HEIGHT - height + 10; wy < CANVAS_HEIGHT; wy += floorHeight) {
        for (let wx = currentX + 5; wx < currentX + actualWidth - 5; wx += windowGap) {
          // 80% chance a window exists at a grid spot
          if (Math.random() < 0.8) {
            windows.push({
              x: wx, // Absolute coordinates for easier drawing
              y: wy,
              w: winW,
              h: winH,
              lightThreshold: Math.random() // Random "habit" for when this window turns on
            });
          }
        }
      }
      
      newBuildings.push({
        x: currentX,
        width: actualWidth,
        height: height,
        color: color,
        windows: windows
      });
      
      currentX += actualWidth;
    }
    setBuildings(newBuildings);

    // Place Gorillas
    // P1 on second or third building
    const p1BuildingIndex = 1 + Math.floor(Math.random() * 2);
    const p1Building = newBuildings[p1BuildingIndex];
    
    // P2 on second or third to last
    const p2BuildingIndex = newBuildings.length - 2 - Math.floor(Math.random() * 2);
    const p2Building = newBuildings[p2BuildingIndex];

    setGorillas([
      {
        id: Turn.PLAYER_1,
        x: p1Building.x + p1Building.width / 2,
        y: CANVAS_HEIGHT - p1Building.height - 40, // Sit on top
        isDead: false
      },
      {
        id: Turn.PLAYER_2,
        x: p2Building.x + p2Building.width / 2,
        y: CANVAS_HEIGHT - p2Building.height - 40,
        isDead: false
      }
    ]);
  }, []);

  const randomizeWind = () => {
    // Wind between -100 and 100
    setWind(Math.floor(Math.random() * 200) - 100);
  };

  const startGame = (mode: 'PVP' | 'CPU') => {
    setGameMode(mode);
    setGameState(GameState.PLAYING);
    setTurn(Turn.PLAYER_1);
    setWinner(null);
    setExplosions([]);
    setAiTaunt("");
    setInputAngle(45);
    setInputVelocity(0);
    generateCity();
    randomizeWind();
    setTimeOfDay(12); // Start at noon
  };

  const handleShot = (angle: number, velocity: number) => {
    setIsShooting(true);
    setShotParams({
      angle,
      velocity,
      shooter: turn
    });
  };

  const handleShotComplete = (hit: boolean, hitPlayer?: Turn, impactX?: number, impactY?: number) => {
    setIsShooting(false);
    setShotParams(null);
    // Reset velocity for next turn for better UX (user has to charge again)
    setInputVelocity(0);
    
    // Sun shock effect lingers briefly then resets
    setTimeout(() => setSunShocked(false), 1000);

    if (hitPlayer) {
      // Game Over logic
      const losingGorilla = gorillas.find(g => g.id === hitPlayer);
      if (losingGorilla) losingGorilla.isDead = true;
      setGorillas([...gorillas]); // Force update
      setWinner(hitPlayer === Turn.PLAYER_1 ? Turn.PLAYER_2 : Turn.PLAYER_1);
      setGameState(GameState.GAME_OVER);
    } else {
      // Next turn
      switchTurn();
    }
  };

  const switchTurn = () => {
     // Randomize wind slightly each turn
     setWind(prev => {
         const change = (Math.random() * 20) - 10;
         let newWind = prev + change;
         if (newWind > MAX_WIND) newWind = MAX_WIND;
         if (newWind < -MAX_WIND) newWind = -MAX_WIND;
         return newWind;
     });

     setTurn(prev => prev === Turn.PLAYER_1 ? Turn.PLAYER_2 : Turn.PLAYER_1);
  };

  // AI Logic Effect
  useEffect(() => {
    if (gameState === GameState.PLAYING && gameMode === 'CPU' && turn === Turn.PLAYER_2 && !isShooting && !winner) {
      const triggerAi = async () => {
        setAiThinking(true);
        
        const me = gorillas.find(g => g.id === Turn.PLAYER_2);
        const target = gorillas.find(g => g.id === Turn.PLAYER_1);

        if (me && target) {
          const response = await calculateAiShot(
              { x: me.x, y: me.y }, 
              { x: target.x, y: target.y }, 
              wind, 
              9.8 // Gravity constant reference
          );
          
          setAiTaunt(response.taunt || "Calculated.");
          
          // Small delay to simulate "aiming" and let user read taunt
          setTimeout(() => {
              // AI shoots with full precision logic
              handleShot(response.angle, response.velocity);
              setAiThinking(false);
          }, 2000);
        }
      };
      triggerAi();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, turn, gameMode, isShooting, winner]);

  return (
    <div className="relative w-full h-screen bg-neutral-900 flex flex-col items-center justify-center font-mono select-none">
      
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {/* Start Menu */}
      {gameState === GameState.START_MENU && (
        <div className="z-50 flex flex-col items-center gap-8 p-12 border-4 border-retro-cyan bg-neutral-900 text-retro-yellow animate-fade-in">
          <h1 className="text-6xl font-bold tracking-widest text-retro-red drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">
            GORILLAS.REACT
          </h1>
          <p className="text-white text-lg mt-4 mb-8">
            Rebuilt with React, Tailwind & Gemini AI
          </p>
          
          <div className="flex gap-8">
            <button 
              onClick={() => startGame('PVP')}
              className="px-8 py-4 text-xl font-bold border-2 border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-black transition-all"
            >
              1 VS 1 HUMAN
            </button>
            <button 
              onClick={() => startGame('CPU')}
              className="px-8 py-4 text-xl font-bold border-2 border-retro-red text-retro-red hover:bg-retro-red hover:text-white transition-all relative group"
            >
              VS GEMINI AI
              <span className="absolute -top-3 -right-3 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-retro-yellow opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-retro-yellow"></span>
              </span>
            </button>
          </div>
          
          <div className="mt-12 text-xs text-gray-500">
            POWERED BY GOOGLE GEMINI 2.5 FLASH
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && winner && (
        <div className="absolute z-50 inset-0 bg-black/80 flex flex-col items-center justify-center">
           <h2 className="text-8xl font-bold text-retro-yellow mb-8 animate-bounce">
             {winner === Turn.PLAYER_1 ? 'PLAYER 1' : (gameMode === 'CPU' ? 'GEMINI AI' : 'PLAYER 2')} WINS!
           </h2>
           <button 
              onClick={() => setGameState(GameState.START_MENU)}
              className="px-8 py-4 text-2xl font-bold border-2 border-white text-white hover:bg-white hover:text-black transition-all"
            >
              PLAY AGAIN
            </button>
        </div>
      )}

      {/* Game Area */}
      <div className="relative w-[1024px] h-[600px] border-4 border-retro-gray bg-retro-blue overflow-hidden shadow-2xl">
        <Sun isShocked={sunShocked} />
        
        {/* Day/Night Overlay */}
        <div 
            className="absolute inset-0 pointer-events-none z-0 transition-colors duration-1000"
            style={{
                backgroundColor: `rgba(0,0,0, ${
                    timeOfDay < 6 || timeOfDay > 20 ? 0.3 : 0
                })`
            }}
        />

        <GameCanvas 
          buildings={buildings}
          gorillas={gorillas}
          explosions={explosions}
          wind={wind}
          onShotComplete={handleShotComplete}
          isShooting={isShooting}
          shotParams={shotParams}
          setExplosions={setExplosions}
          setSunShocked={setSunShocked}
          timeOfDay={timeOfDay}
          aimAngle={inputAngle}
          aimVelocity={inputVelocity}
          activeTurn={turn}
          gameMode={gameMode}
        />

        {/* UI Overlay Controls */}
        <ControlPanel 
          turn={turn}
          gameState={gameState}
          onFire={handleShot}
          wind={wind}
          isProcessing={isShooting || aiThinking}
          gameMode={gameMode}
          aiTaunt={aiTaunt}
          angle={inputAngle}
          velocity={inputVelocity}
          setAngle={setInputAngle}
          setVelocity={setInputVelocity}
        />
      </div>
      
      {/* Instructions / Footer */}
      <div className="mt-4 text-retro-gray text-sm flex flex-col items-center gap-1">
         <div className="flex gap-8">
            <span><span className="text-retro-yellow">TIME:</span> {Math.floor(timeOfDay).toString().padStart(2, '0')}:{(Math.floor((timeOfDay % 1) * 60)).toString().padStart(2, '0')}</span>
            <span><span className="text-retro-yellow">CONTROLS:</span> Arrows = Aim • Hold Space = Power • ? = Help</span>
         </div>
      </div>
    </div>
  );
};

export default App;