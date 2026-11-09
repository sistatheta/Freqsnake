import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Direction } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
}

const Controls: React.FC<ControlsProps> = ({ onDirectionChange }) => {
  const handleTrigger = (dir: Direction, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if ('currentTarget' in e && e.currentTarget) {
      (e.currentTarget as HTMLElement).blur();
    }
    onDirectionChange(dir);
  };

  const btnClass = "w-14 h-14 flex items-center justify-center bg-[#0d1626]/95 hover:bg-[#132238] active:bg-emerald-600/90 active:scale-95 rounded-2xl border-2 border-teal-600/60 active:border-emerald-400 shadow-[0_4px_14px_rgba(0,0,0,0.6),0_0_12px_rgba(13,148,136,0.3)] transition-transform touch-none cursor-pointer select-none";

  return (
    <div className="flex flex-col items-center mt-3 md:hidden w-full select-none touch-none">
      {/* Positioned directly above buttons so thumb never covers it */}
      <div className="flex items-center gap-1.5 mb-2.5 px-3 py-1 bg-teal-950/70 border border-teal-800/50 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
        <span className="text-[9px] text-teal-300 font-mono tracking-wider font-bold">SWIPE BOARD OR TAP ARROWS</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 max-w-[190px] mx-auto select-none">
        <div className="col-start-2 flex justify-center">
          <button 
            type="button"
            className={btnClass} 
            onTouchStart={(e) => handleTrigger(Direction.UP, e)}
            onMouseDown={(e) => handleTrigger(Direction.UP, e)}
            aria-label="Up"
          >
            <ChevronUp className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] pointer-events-none" />
          </button>
        </div>
        <div className="col-start-1 row-start-2 flex justify-center">
          <button 
            type="button"
            className={btnClass} 
            onTouchStart={(e) => handleTrigger(Direction.LEFT, e)}
            onMouseDown={(e) => handleTrigger(Direction.LEFT, e)}
            aria-label="Left"
          >
            <ChevronLeft className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] pointer-events-none" />
          </button>
        </div>
        <div className="col-start-2 row-start-2 flex justify-center">
          <button 
            type="button"
            className={btnClass} 
            onTouchStart={(e) => handleTrigger(Direction.DOWN, e)}
            onMouseDown={(e) => handleTrigger(Direction.DOWN, e)}
            aria-label="Down"
          >
            <ChevronDown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] pointer-events-none" />
          </button>
        </div>
        <div className="col-start-3 row-start-2 flex justify-center">
          <button 
            type="button"
            className={btnClass} 
            onTouchStart={(e) => handleTrigger(Direction.RIGHT, e)}
            onMouseDown={(e) => handleTrigger(Direction.RIGHT, e)}
            aria-label="Right"
          >
            <ChevronRight className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;