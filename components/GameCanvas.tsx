import React, { useRef, useEffect, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GORILLA_WIDTH, GORILLA_HEIGHT, BANANA_SIZE, GRAVITY, VELOCITY_SCALE, WIND_SCALE, EXPLOSION_RADIUS, WINDOW_LIT_COLOR, WINDOW_DARK_COLOR, MAX_VELOCITY, PHYSICS_SUBSTEPS } from '../constants';
import { Building, Gorilla, Turn, Explosion } from '../types';

interface GameCanvasProps {
  buildings: Building[];
  gorillas: Gorilla[];
  explosions: Explosion[];
  wind: number;
  onShotComplete: (hit: boolean, hitPlayer?: Turn, impactX?: number, impactY?: number) => void;
  isShooting: boolean;
  shotParams: { angle: number; velocity: number; shooter: Turn } | null;
  setExplosions: React.Dispatch<React.SetStateAction<Explosion[]>>;
  setSunShocked: (shocked: boolean) => void;
  timeOfDay: number; // 0.0 to 24.0
  aimAngle: number;
  aimVelocity: number;
  activeTurn: Turn;
  gameMode: 'PVP' | 'CPU';
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  buildings, 
  gorillas, 
  explosions, 
  wind, 
  onShotComplete, 
  isShooting, 
  shotParams,
  setExplosions,
  setSunShocked,
  timeOfDay,
  aimAngle,
  aimVelocity,
  activeTurn,
  gameMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Physics State stored in ref to avoid re-renders during animation loop
  const projectileRef = useRef<{x: number, y: number, vx: number, vy: number} | null>(null);
  const activeExplosionsRef = useRef<Explosion[]>([]);

  // Sync explosions prop to ref
  useEffect(() => {
    activeExplosionsRef.current = explosions;
  }, [explosions]);

  // Helper to get Sky Color based on time
  const getSkyColor = (time: number): string => {
    // Night: 20:00 - 05:00
    if (time >= 20 || time < 5) return '#050515'; // Very Dark Blue/Black
    
    // Dawn: 05:00 - 08:00
    if (time >= 5 && time < 8) {
       return '#AA4444';
    }
    
    // Day: 08:00 - 17:00
    if (time >= 8 && time < 17) return '#0000AA'; // Classic Retro Blue
    
    // Dusk: 17:00 - 20:00
    if (time >= 17 && time < 20) {
       return '#663366'; // Purple/Dusk
    }
    
    return '#0000AA';
  };

  const getCityLightProbability = (time: number): number => {
      if (time >= 8 && time < 17) return 0.05; // Day: mostly off
      if (time >= 22 || time < 5) return 0.9; // Deep Night: mostly on
      if (time >= 17 && time < 22) {
          return 0.05 + ((time - 17) / 5) * 0.85;
      }
      if (time >= 5 && time < 8) {
          return 0.9 - ((time - 5) / 3) * 0.85;
      }
      return 0;
  };

  // Draw Loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear (Sky with Time-based color)
    const skyColor = getSkyColor(timeOfDay);
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Buildings
    const currentLightChance = getCityLightProbability(timeOfDay);
    
    buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, CANVAS_HEIGHT - b.height, b.width, b.height);
      
      // Draw Windows (Persistent)
      b.windows.forEach(w => {
          const isLit = w.lightThreshold < currentLightChance;
          ctx.fillStyle = isLit ? WINDOW_LIT_COLOR : WINDOW_DARK_COLOR;
          ctx.fillRect(w.x, w.y, w.w, w.h);
      });
    });

    // 3. Draw Explosions
    const now = Date.now();
    
    activeExplosionsRef.current.forEach(exp => {
        // A. Crater (Permanent hole matching sky color)
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fillStyle = skyColor; 
        ctx.fill();

        // B. Fireball (Transient Animation)
        const age = now - exp.timestamp;
        const duration = 1000; // 1 second duration
        
        if (age < duration) {
           const progress = age / duration;
           
           // Outer ring (Red)
           const outerRadius = exp.radius * (1 + Math.sin(progress * Math.PI));
           ctx.beginPath();
           ctx.arc(exp.x, exp.y, outerRadius, 0, Math.PI * 2);
           ctx.fillStyle = `rgba(255, 85, 85, ${1 - progress})`;
           ctx.fill();

           // Inner core (Yellow)
           const innerRadius = outerRadius * 0.6;
           ctx.beginPath();
           ctx.arc(exp.x, exp.y, innerRadius, 0, Math.PI * 2);
           ctx.fillStyle = `rgba(255, 255, 85, ${1 - progress})`;
           ctx.fill();
        }
    });

    // 4. Draw Gorillas
    gorillas.forEach(g => {
        if (g.isDead) return;
        
        // Gorilla Body
        ctx.fillStyle = g.id === Turn.PLAYER_1 ? '#FFFF55' : '#55FFFF'; 
        ctx.fillRect(g.x - GORILLA_WIDTH/2, g.y, GORILLA_WIDTH, GORILLA_HEIGHT);
        
        // Gorilla Face
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(g.x - 10, g.y - 10, 20, 20);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(g.x - 5, g.y - 5, 4, 4);
        ctx.fillRect(g.x + 1, g.y - 5, 4, 4);

        // Arm Up Animation while shooting
        if (isShooting && shotParams?.shooter === g.id) {
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(g.x + (g.id === Turn.PLAYER_1 ? 15 : -25), g.y - 10, 10, 30);
        }

        // Draw Overhead Power Bar
        if (!isShooting && g.id === activeTurn && !g.isDead) {
           const barWidth = 50;
           const barHeight = 6;
           const barX = g.x - barWidth / 2;
           const barY = g.y - 20;

           ctx.fillStyle = '#000';
           ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
           ctx.strokeStyle = '#FFF';
           ctx.lineWidth = 1;
           ctx.strokeRect(barX - 1.5, barY - 1.5, barWidth + 3, barHeight + 3);

           const fillPercent = Math.min(100, (aimVelocity / MAX_VELOCITY) * 100);
           
           if (fillPercent < 50) ctx.fillStyle = '#00FF00';
           else if (fillPercent < 80) ctx.fillStyle = '#FFFF00';
           else ctx.fillStyle = '#FF0000';
           
           ctx.fillRect(barX, barY, (fillPercent / 100) * barWidth, barHeight);
        }
    });

    // 5. Draw Aim Indicator (Visual Feedback)
    if (!isShooting && !projectileRef.current) {
      const shouldDrawIndicator = (gameMode === 'PVP') || (gameMode === 'CPU' && activeTurn === Turn.PLAYER_1);
      
      if (shouldDrawIndicator) {
        const activeGorilla = gorillas.find(g => g.id === activeTurn);
        if (activeGorilla && !activeGorilla.isDead) {
          const dir = activeTurn === Turn.PLAYER_1 ? 1 : -1;
          const rad = (aimAngle * Math.PI) / 180;
          
          const startX = activeGorilla.x + (dir * 10);
          const startY = activeGorilla.y - 20;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);

          let simX = startX;
          let simY = startY;
          const PREVIEW_VELOCITY = 80; 
          let simVx = Math.cos(rad) * PREVIEW_VELOCITY * VELOCITY_SCALE * dir;
          let simVy = -Math.sin(rad) * PREVIEW_VELOCITY * VELOCITY_SCALE;

          const steps = 12; 
          for (let i = 0; i < steps; i++) {
             const windEffect = wind * WIND_SCALE * 0.015; 
             simVx += windEffect;
             simVy += GRAVITY;
             simX += simVx;
             simY += simVy;
             ctx.lineTo(simX, simY);
          }

          ctx.strokeStyle = activeTurn === Turn.PLAYER_1 ? '#FFFF55' : '#55FFFF';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.beginPath();
          ctx.arc(simX, simY, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF';
          ctx.fill();
        }
      }
    }

    // 6. Draw Projectile
    if (projectileRef.current) {
      const p = projectileRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BANANA_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFF00'; 
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Force redraw for animations (explosions)
    if (activeExplosionsRef.current.length > 0) {
        // We need to keep drawing if explosions are animating
        const hasActiveAnimation = activeExplosionsRef.current.some(e => Date.now() - e.timestamp < 1000);
        if (hasActiveAnimation && !isShooting) {
             requestAnimationFrame(drawFrame);
        }
    }

  }, [buildings, gorillas, isShooting, shotParams, timeOfDay, aimAngle, aimVelocity, activeTurn, gameMode, wind]);

  useEffect(() => {
      if (!isShooting) {
          requestAnimationFrame(() => drawFrame());
      }
  }, [timeOfDay, isShooting, drawFrame, aimAngle, aimVelocity, wind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawFrame();
  }, [buildings, gorillas, explosions, drawFrame]); 

  useEffect(() => {
    if (isShooting && shotParams) {
      const shooter = gorillas.find(g => g.id === shotParams.shooter);
      if (shooter) {
        const rad = shotParams.angle * (Math.PI / 180);
        const direction = shotParams.shooter === Turn.PLAYER_1 ? 1 : -1;
        
        const startX = shooter.x + (direction * 10);
        const startY = shooter.y - 20;

        projectileRef.current = {
          x: startX,
          y: startY,
          vx: Math.cos(rad) * shotParams.velocity * VELOCITY_SCALE * direction,
          vy: -Math.sin(rad) * shotParams.velocity * VELOCITY_SCALE
        };
        
        setSunShocked(false);
        requestRef.current = requestAnimationFrame(animate);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShooting, shotParams]);

  const checkCollision = (x: number, y: number): { hit: boolean, type?: 'BUILDING' | 'GORILLA' | 'BOUNDS', data?: any } => {
    if (x < 0 || x > CANVAS_WIDTH || y > CANVAS_HEIGHT) {
      return { hit: true, type: 'BOUNDS' };
    }

    // Check Gorillas (Direct Hit)
    for (const g of gorillas) {
        if (g.isDead) continue;
        if (x >= g.x - GORILLA_WIDTH/2 && x <= g.x + GORILLA_WIDTH/2 &&
            y >= g.y && y <= g.y + GORILLA_HEIGHT) {
            return { hit: true, type: 'GORILLA', data: g };
        }
    }

    // Check Buildings
    for (const b of buildings) {
        if (x >= b.x && x <= b.x + b.width && y >= CANVAS_HEIGHT - b.height) {
            let inCrater = false;
            for (const exp of activeExplosionsRef.current) {
                const dx = x - exp.x;
                const dy = y - exp.y;
                if (dx*dx + dy*dy < exp.radius * exp.radius) {
                    inCrater = true;
                    break;
                }
            }
            if (!inCrater) {
                return { hit: true, type: 'BUILDING' };
            }
        }
    }

    return { hit: false };
  };

  const animate = (time: number) => {
    if (!projectileRef.current) return;

    const p = projectileRef.current;
    let hitOccurred = false;
    let collisionInfo: any = { hit: false };

    // Sub-stepping for better collision detection
    for (let i = 0; i < PHYSICS_SUBSTEPS; i++) {
        const windEffect = wind * WIND_SCALE * 0.02 / PHYSICS_SUBSTEPS;
        
        p.vx += windEffect;
        p.vy += GRAVITY / PHYSICS_SUBSTEPS;
        p.x += p.vx / PHYSICS_SUBSTEPS;
        p.y += p.vy / PHYSICS_SUBSTEPS;

        collisionInfo = checkCollision(p.x, p.y);
        if (collisionInfo.hit) {
            hitOccurred = true;
            break;
        }
    }

    if (hitOccurred) {
        projectileRef.current = null; 
        
        if (collisionInfo.type === 'BOUNDS') {
            onShotComplete(false);
        } else {
            // Hit Building or Gorilla
            setSunShocked(true);
            
            const explosionX = p.x;
            const explosionY = p.y;
            
            const newExplosion: Explosion = {
                x: explosionX,
                y: explosionY,
                radius: EXPLOSION_RADIUS,
                timestamp: Date.now()
            };
            
            setExplosions(prev => [...prev, newExplosion]);

            // Check AOE Damage (Area of Effect)
            let hitPlayer: Turn | undefined = undefined;
            
            // Check both gorillas for proximity to explosion center
            for (const g of gorillas) {
                if (g.isDead) continue;
                // Distance from explosion center to gorilla center
                const gx = g.x;
                const gy = g.y + GORILLA_HEIGHT/2;
                const dist = Math.sqrt((gx - explosionX)**2 + (gy - explosionY)**2);
                
                // If inside explosion radius (+ small buffer for hitbox overlap)
                if (dist < EXPLOSION_RADIUS + (GORILLA_WIDTH/2)) {
                    hitPlayer = g.id;
                    // If we hit someone, we can stop checking or check all? 
                    // Standard allows double kill, but let's just return the first victim for game over logic
                    break;
                }
            }

            // Pass the hit player (from AOE or direct)
            onShotComplete(true, hitPlayer, explosionX, explosionY);
        }
    } else {
        requestRef.current = requestAnimationFrame(animate);
    }
    
    drawFrame();
  };

  return (
    <canvas 
        ref={canvasRef} 
        className="block w-full h-full cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
    />
  );
};