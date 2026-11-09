import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Direction } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
}

const Controls: React.FC<ControlsProps> = ({ onDirectionChange }) => {
  const btnClass = "p-4 bg-gray-800/80 rounded-full active:bg-green-500/50 active:scale-95 transition-all border border-gray-600 backdrop-blur-md shadow-lg touch-manipulation";

  return (
    <div className="grid grid-cols-3 gap-2 mt-6 max-w-[200px] mx-auto md:hidden">
      <div className="col-start-2 flex justify-center">
        <button 
          className={btnClass} 
          onClick={(e) => {
            e.currentTarget.blur();
            onDirectionChange(Direction.UP);
          }}
          aria-label="Up"
        >
          <ChevronUp className="w-8 h-8 text-white" />
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
          <ChevronLeft className="w-8 h-8 text-white" />
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
          <ChevronDown className="w-8 h-8 text-white" />
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
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
};

export default Controls;