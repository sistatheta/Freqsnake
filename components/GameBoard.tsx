import React, { useMemo } from 'react';
import { Point, GameItem, ItemType } from '../types';
import { GRID_SIZE } from '../constants';

interface GameBoardProps {
  snake: Point[];
  items: GameItem[];
}

const GameBoard: React.FC<GameBoardProps> = ({ snake, items }) => {
  
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
        const baseClass = "w-full h-full flex items-center justify-center border-[0.5px] border-gray-800/20";
        
        if (isSnakeHead(x, y)) {
          cellContent = <div className="w-full h-full bg-green-400 shadow-[0_0_15px_rgba(74,222,128,1)] rounded-sm z-20 scale-110 relative">
             <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
          </div>;
        } else if (isSnakeBody(x, y)) {
          cellContent = <div className="w-full h-full bg-green-600/80 rounded-sm border border-green-500/30"></div>;
        } else if (item) {
          if (item.type === 'FOOD') {
            cellContent = <div className="w-[80%] h-[80%] bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-bounce rounded-sm"></div>;
          } else if (item.type === 'REVERB') {
            cellContent = (
              <div className="w-full h-full flex items-center justify-center animate-pulse">
                <div 
                  className="w-[90%] h-[90%] bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                  style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                ></div>
              </div>
            );
          } else if (item.type === 'DELAY') {
             cellContent = <div className="w-[90%] h-[90%] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] rounded-full animate-pulse"></div>;
          }
        } else {
           // Empty cell, purely decorative grid line is handled by gap/border in container or logic here
           // Leaving empty to show background
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
      className="grid bg-gray-900/80 p-1 rounded-lg border-4 border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        width: 'min(85vw, 360px)',
        aspectRatio: '1/1',
      }}
    >
      {cells}
    </div>
  );
};

export default GameBoard;