import React, { useMemo } from 'react';
import { Point, GameItem, ItemType, Direction } from '../types';
import { GRID_SIZE } from '../constants';

interface GameBoardProps {
  snake: Point[];
  items: GameItem[];
  onDirectionChange?: (dir: Direction) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ snake, items, onDirectionChange }) => {
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !onDirectionChange) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 25;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        onDirectionChange(diffX > 0 ? Direction.RIGHT : Direction.LEFT);
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        onDirectionChange(diffY > 0 ? Direction.DOWN : Direction.UP);
      }
    }
    touchStartRef.current = null;
  };
  
  const isSnakeBody = (x: number, y: number) => {
    return snake.some((segment, index) => {
      if (index === 0) return false;
      return segment.x === x && segment.y === y;
    });
  };

  const isSnakeHead = (x: number, y: number) => {
    return snake[0].x === x && snake[0].y === y;
  };

  const getItemAt = (x: number, y: number) => {
    return items.find(item => item.pos.x === x && item.pos.y === y);
  };

  // Render the grid cells
  const cells = useMemo(() => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let cellContent = null;
        const item = getItemAt(x, y);
        
        // Base Cell
        const baseClass = "w-full h-full flex items-center justify-center border-[0.5px] border-teal-900/25";
        
        if (isSnakeHead(x, y)) {
          cellContent = (
            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_16px_rgba(52,211,153,0.95)] rounded-sm z-20 scale-110 relative flex items-center justify-center border border-yellow-400/40">
              {/* Snake eye glowing yellow */}
              <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-[0_0_6px_#facc15] animate-pulse"></div>
            </div>
          );
        } else if (isSnakeBody(x, y)) {
          cellContent = (
            <div className="w-full h-full bg-gradient-to-br from-teal-600 to-emerald-700 rounded-sm border border-emerald-400/30 shadow-[0_0_4px_rgba(16,185,129,0.4)]"></div>
          );
        } else if (item) {
          if (item.type === 'FOOD') {
            // Neon Gold / Amber Beat matching FREQ text
            cellContent = (
              <div className="w-[82%] h-[82%] bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_14px_rgba(250,204,21,0.95)] animate-pulse rounded-sm border border-yellow-200/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
              </div>
            );
          } else if (item.type === 'REVERB') {
            // Warm Ochre-Orange matching SNAKE 3D shadow
            cellContent = (
              <div className="w-full h-full flex items-center justify-center animate-bounce">
                <div 
                  className="w-[90%] h-[90%] bg-gradient-to-t from-orange-600 to-amber-500 shadow-[0_0_15px_rgba(249,115,22,0.9)]"
                  style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                ></div>
              </div>
            );
          } else if (item.type === 'DELAY') {
            // Electric Cyan matching synth wave
            cellContent = (
              <div className="w-[88%] h-[88%] bg-gradient-to-br from-cyan-300 to-teal-500 shadow-[0_0_15px_rgba(34,211,238,0.9)] rounded-full animate-pulse border border-cyan-200/50"></div>
            );
          } else if (item.type === 'STAR') {
            // Radiant Cosmic Synth Star (Soft Ambient Pad Powerup)
            cellContent = (
              <div className="w-full h-full flex items-center justify-center animate-spin" style={{ animationDuration: '4.5s' }}>
                <div 
                  className="w-[94%] h-[94%] bg-gradient-to-tr from-fuchsia-500 via-pink-400 to-yellow-200 shadow-[0_0_18px_rgba(244,114,182,1)]"
                  style={{
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                  }}
                ></div>
              </div>
            );
          }
        }

        grid.push(
          <div key={`${x}-${y}`} className={baseClass}>
            {cellContent}
          </div>
        );
      }
    }
    return grid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake, items]);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="grid bg-[#0a0f1d]/95 p-1 rounded-xl border-4 border-teal-800/60 shadow-[0_0_35px_rgba(13,148,136,0.25)] backdrop-blur-md touch-none select-none"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        width: 'min(88vw, 360px)',
        aspectRatio: '1/1',
      }}
    >
      {cells}
    </div>
  );
};

export default GameBoard;