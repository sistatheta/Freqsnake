import React, { useState } from 'react';
import { Trophy, Save } from 'lucide-react';
import { HighScoreEntry } from '../types';

interface LeaderboardProps {
  entries: HighScoreEntry[];
  currentScore: number;
  isGameOver: boolean;
  onSave: (name: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, currentScore, isGameOver, onSave }) => {
  const [name, setName] = useState('');
  const [hasSaved, setHasSaved] = useState(false);

  // Check if current score qualifies for leaderboard (top 10)
  const isQualifying = isGameOver && !hasSaved && currentScore > 0 && (
    entries.length < 10 || currentScore > entries[entries.length - 1].score
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length > 0) {
      onSave(name.toUpperCase());
      setHasSaved(true);
      setName('');
    }
  };

  return (
    <div className="bg-[#0b101d]/90 p-4 rounded-xl border border-teal-800/40 backdrop-blur-md w-full md:w-64 h-fit flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-teal-900/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-400 w-4 h-4 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
          <h2 className="text-yellow-400 font-bold font-mono text-xs tracking-wider">LEGENDS</h2>
        </div>
        <span className="text-[10px] text-teal-400/60 font-mono">TOP 10</span>
      </div>

      {isQualifying && (
        <div className="animate-pulse bg-amber-950/40 p-3 rounded-lg border border-amber-500/60 mb-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <p className="text-xs text-yellow-300 mb-2 font-bold text-center">NEW HIGH SCORE!</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              maxLength={5}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="NAME"
              className="w-full bg-[#080d18] border border-teal-700/60 rounded px-2 py-1 text-xs font-mono text-yellow-300 uppercase focus:border-yellow-400 outline-none"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!name}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold p-1.5 rounded transition-all shadow-md shadow-amber-500/30"
            >
              <Save size={14} />
            </button>
          </form>
          <p className="text-[10px] text-teal-300/60 mt-1 text-center">Max 5 letters</p>
        </div>
      )}

      <div className="space-y-1.5 overflow-y-auto max-h-[220px] md:max-h-[280px] pr-1 custom-scrollbar">
        {entries.length === 0 ? (
          <p className="text-teal-400/40 text-xs text-center py-4 font-mono">No records yet.</p>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={`${entry.name}-${entry.timestamp}`} 
              className={`flex justify-between items-center text-xs font-mono p-2 rounded-lg transition-all ${
                hasSaved && entry.score === currentScore && entry.timestamp > Date.now() - 1000 
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