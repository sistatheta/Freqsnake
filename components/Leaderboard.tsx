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
    <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700 backdrop-blur-md w-full md:w-64 h-fit flex flex-col gap-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
        <Trophy className="text-yellow-400 w-5 h-5" />
        <h2 className="text-yellow-400 font-bold font-mono text-sm">LEGENDS</h2>
      </div>

      {isQualifying && (
        <div className="animate-pulse bg-pink-900/30 p-3 rounded border border-pink-500/50 mb-2">
          <p className="text-xs text-pink-300 mb-2 font-bold text-center">NEW HIGH SCORE!</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              maxLength={5}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="NAME"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm font-mono text-white uppercase focus:border-pink-500 outline-none"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!name}
              className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white p-1 rounded transition-colors"
            >
              <Save size={16} />
            </button>
          </form>
          <p className="text-[10px] text-gray-400 mt-1 text-center">Max 5 letters</p>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">No records yet.</p>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={`${entry.name}-${entry.timestamp}`} 
              className={`flex justify-between items-center text-xs font-mono p-2 rounded ${
                hasSaved && entry.score === currentScore && entry.timestamp > Date.now() - 1000 
                  ? 'bg-green-900/50 border border-green-500/30' 
                  : 'bg-gray-800/40 odd:bg-gray-800/20'
              }`}
            >
              <div className="flex gap-2">
                <span className="text-gray-500 w-4">{idx + 1}.</span>
                <span className="text-cyan-300 font-bold">{entry.name}</span>
              </div>
              <span className="text-white">{entry.score}</span>
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