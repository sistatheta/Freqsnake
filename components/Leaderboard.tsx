import React, { useState } from 'react';
import { Trophy, Save } from 'lucide-react';
import { HighScoreEntry } from '../types';

interface LeaderboardProps {
  entries: HighScoreEntry[];
  currentScore?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentScore }) => {
  return (
    <div className="bg-[#0b101d]/90 p-4 rounded-xl border border-teal-800/40 backdrop-blur-md w-full md:w-64 h-fit flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-teal-900/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-400 w-4 h-4 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
          <h2 className="text-yellow-400 font-bold font-mono text-xs tracking-wider">LEGENDS</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[9px] text-emerald-300 font-mono tracking-wider font-bold">WORLDWIDE</span>
        </div>
      </div>

      <div className="space-y-1.5 overflow-y-auto max-h-[220px] md:max-h-[280px] pr-1 custom-scrollbar">
        {entries.length === 0 ? (
          <p className="text-teal-400/40 text-xs text-center py-4 font-mono">No records yet.</p>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={`${entry.name}-${entry.timestamp}`} 
              className={`flex justify-between items-center text-xs font-mono p-2 rounded-lg transition-all ${
                currentScore !== undefined && entry.score === currentScore && entry.timestamp > Date.now() - 2000 
                  ? 'bg-emerald-900/50 border border-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
                  : 'bg-[#0f172a]/40 odd:bg-[#0f172a]/20 border border-teal-900/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-4 text-[10px] ${idx === 0 ? 'text-yellow-400 font-bold' : idx === 1 ? 'text-teal-300' : idx === 2 ? 'text-amber-500' : 'text-slate-500'}`}>{idx + 1}.</span>
                <span className="text-emerald-300 font-bold tracking-wider">{entry.name}</span>
              </div>
              <span className="text-yellow-300 font-bold">{entry.score}</span>
            </div>
          ))
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;