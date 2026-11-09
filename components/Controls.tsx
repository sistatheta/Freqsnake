import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Direction } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
}

const Controls: React.FC<ControlsProps> = ({ onDirectionChange }) => {
  const btnClass = "w-14 h-14 flex items-center justify-center bg-[#0d1626]/90 hover:bg-[#132238] active:bg-emerald-600/80 active:scale-90 rounded-2xl border-2 border-teal-600/50 active:border-emerald-400 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_12px_rgba(13,148,136,0.3)] transition-all touch-manipulation cursor-pointer select-none";

  return (
    <div className="flex flex-col items-center mt-4 md:hidden w-full">
      <div className="grid grid-cols-3 gap-2 max-w-[190px] mx-auto">
        <div className="col-start-2 flex justify-center">
          <button 
            className={btnClass} 
            onClick={(e) => {
              e.currentTarget.blur();
              onDirectionChange(Direction.UP);
            }}
            aria-label="Up"
          >
            <ChevronUp className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </button>
        </div>
        <div className="col-start-1 row-start-2 flex justify-center">
          <button 
            className={btnClass} 
            onClick={(e) => {
              e.currentTarget.blur();
              onDirectionChange(Direction.LEFT);
            }}
            aria-label="Left"
          >
            <ChevronLeft className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </button>
        </div>
        <div className="col-start-2 row-start-2 flex justify-center">
          <button 
            className={btnClass} 
            onClick={(e) => {
              e.currentTarget.blur();
              onDirectionChange(Direction.DOWN);
            }}
            aria-label="Down"
          >
            <ChevronDown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </button>
        </div>
        <div className="col-start-3 row-start-2 flex justify-center">
          <button 
            className={btnClass} 
            onClick={(e) => {
              e.currentTarget.blur();
              onDirectionChange(Direction.RIGHT);
            }}
            aria-label="Right"
          >
            <ChevronRight className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-teal-400/70 font-mono tracking-widest mt-2">SWIPE BOARD OR TAP BUTTONS</p>
    </div>
  );
};

export default Controls;