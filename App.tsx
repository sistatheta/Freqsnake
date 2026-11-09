import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Loader2, Triangle, Circle, Volume2, Music } from 'lucide-react';
import { GameState, Direction, Point, GameItem, ItemType, HighScoreEntry } from './types';
import { GRID_SIZE, INITIAL_SPEED, KEY_MAP, SPEED_INCREMENT, MIN_SPEED, PROGRESSIONS } from './constants';
import { getGameOverCommentary } from './services/geminiService';
import { audioService } from './services/audioService';
import GameBoard from './components/GameBoard';
import Controls from './components/Controls';
import Visualizer from './components/Visualizer';
import Leaderboard from './components/Leaderboard';

// Helper to generate random coordinate
const generatePosition = (snake: Point[], items: GameItem[]): Point => {
  let newPos: Point;
  let isOccupied = true;
  while (isOccupied) {
    newPos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // eslint-disable-next-line no-loop-func
    const onSnake = snake.some(s => s.x === newPos.x && s.y === newPos.y);
    // eslint-disable-next-line no-loop-func
    const onItem = items.some(i => i.pos.x === newPos.x && i.pos.y === newPos.y);
    isOccupied = onSnake || onItem;
  }
  return newPos!;
};

const App: React.FC = () => {
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
  const [items, setItems] = useState<GameItem[]>([]);
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<HighScoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem('freqSnakeLeaderboard');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Audio & Logic State
  const [currentFreq, setCurrentFreq] = useState<number>(0);
  const [reverbActive, setReverbActive] = useState(false);
  const [delayActive, setDelayActive] = useState(false);
  const [selectedProgression, setSelectedProgression] = useState('pop-anthem');

  // AI Commentary State
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const directionRef = useRef(Direction.RIGHT);
  const lastProcessedDirectionRef = useRef(Direction.RIGHT);

  // Initialize items on load
  useEffect(() => {
    if (items.length === 0) {
      setItems([{ pos: { x: 11, y: 4 }, type: 'FOOD', id: 'init-food' }]);
    }
    // Warm up audio service gently
    audioService.initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetGame = () => {
    audioService.initialize(); 
    
    const startSnake = [{ x: 7, y: 7 }];
    const startFood: GameItem = { 
      pos: generatePosition(startSnake, []), 
      type: 'FOOD', 
      id: Date.now().toString() 
    };
    
    setSnake(startSnake);
    setItems([startFood]);
    setDirection(Direction.RIGHT);
    directionRef.current = Direction.RIGHT;
    lastProcessedDirectionRef.current = Direction.RIGHT;
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    setAiComment(null);
    
    // Reset effects
    setReverbActive(false);
    setDelayActive(false);
    audioService.toggleReverb(false);
    audioService.toggleDelay(false);
    setCurrentFreq(0);
  };

  const saveHighScore = (name: string) => {
    const newEntry: HighScoreEntry = {
      name,
      score,
      timestamp: Date.now()
    };
    
    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    setLeaderboard(newLeaderboard);
    localStorage.setItem('freqSnakeLeaderboard', JSON.stringify(newLeaderboard));
  };

  const changeDirection = useCallback((newDir: Direction) => {
    const current = lastProcessedDirectionRef.current;
    if (newDir === Direction.UP && current === Direction.DOWN) return;
    if (newDir === Direction.DOWN && current === Direction.UP) return;
    if (newDir === Direction.LEFT && current === Direction.RIGHT) return;
    if (newDir === Direction.RIGHT && current === Direction.LEFT) return;
    
    setDirection(newDir);
    directionRef.current = newDir;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || activeEl?.tagName === 'INPUT') return;

      const mappedDir = KEY_MAP[e.key] || KEY_MAP[e.code];
      if (mappedDir) {
        e.preventDefault();
        if (activeEl && activeEl !== document.body) {
          activeEl.blur();
        }
        if (isPaused && !isGameOver) {
          audioService.initialize();
          setIsPaused(false);
        }
        changeDirection(mappedDir as Direction);
      }
      if ((e.key === ' ' || e.code === 'Space') && !isGameOver) {
        e.preventDefault();
        if (activeEl && activeEl !== document.body) {
          activeEl.blur();
        }
        if (isPaused) {
          audioService.initialize();
        }
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [changeDirection, isGameOver, isPaused]);

  // Change progression handler
  const handleProgressionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProgression(val);
    audioService.setProgression(val);
    (e.target as HTMLElement).blur();
  };

  // Game Loop
  useEffect(() => {
    if (isPaused || isGameOver) return;

    const moveSnake = () => {
      const head = snake[0];
      const newHead = { ...head };
      const currentDir = directionRef.current;
      lastProcessedDirectionRef.current = currentDir;

      switch (currentDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      // Pass-through wrap-around walls
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      else if (newHead.x >= GRID_SIZE) newHead.x = 0;

      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      else if (newHead.y >= GRID_SIZE) newHead.y = 0;

      // Self Collision
      if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return;
      }

      const newSnake = [newHead, ...snake];
      
      // Check Item Collision
      const itemIndex = items.findIndex(i => i.pos.x === newHead.x && i.pos.y === newHead.y);
      
      if (itemIndex !== -1) {
        const item = items[itemIndex];
        
        if (item.type === 'FOOD') {
          // Play sound
          const freq = audioService.playNote(score);
          setCurrentFreq(freq);

          // Logic
          setScore(prev => prev + 1);
          setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
          
          // Respawn items
          const nextItems = items.filter((_, i) => i !== itemIndex);
          
          // Always respawn food
          nextItems.push({
            pos: generatePosition(newSnake, nextItems),
            type: 'FOOD',
            id: Date.now() + '-food'
          });

          // Randomly spawn powerups (Every 5 points)
          const currentScore = score + 1;
          if (currentScore % 5 === 0) {
            const type: ItemType = Math.random() > 0.5 ? 'REVERB' : 'DELAY';
            nextItems.push({
              pos: generatePosition(newSnake, nextItems),
              type: type,
              id: Date.now() + '-' + type
            });
          }
          
          setItems(nextItems);
        } 
        else if (item.type === 'REVERB') {
           const newState = !reverbActive;
           setReverbActive(newState);
           audioService.toggleReverb(newState);
           setItems(items.filter((_, i) => i !== itemIndex));
           newSnake.pop(); 
        } 
        else if (item.type === 'DELAY') {
           const newState = !delayActive;
           setDelayActive(newState);
           audioService.toggleDelay(newState);
           setItems(items.filter((_, i) => i !== itemIndex));
           newSnake.pop();
        }
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const gameInterval = setInterval(moveSnake, speed);
    return () => clearInterval(gameInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, isGameOver, snake, items, speed, score, reverbActive, delayActive]);

  const handleGameOver = async () => {
    setIsGameOver(true);
    setIsPaused(true);
    
    // Only fetch AI comment if score is notable
    if (score > 5) {
        setIsLoadingAi(true);
        const comment = await getGameOverCommentary(score);
        setAiComment(comment);
        setIsLoadingAi(false);
    } else {
        setAiComment("Practice your scales!");
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-white font-sans flex flex-col items-center justify-start py-4 px-3 sm:px-4">
      
      {/* Outer Wrapper with Unified Width */}
      <div className="w-full max-w-[640px] flex flex-col gap-4 sm:gap-5">
        
        {/* Top Banner Marquee */}
        <div className="w-full relative overflow-hidden rounded-2xl border-2 border-teal-700/50 shadow-[0_0_35px_rgba(13,148,136,0.35)] bg-[#070b14] group">
          <img 
            src="/assets/aistudio/freqsnake-banner_7806c86a.jpg" 
            alt="Freq Snake Arcade Banner" 
            className="w-full h-auto max-h-44 sm:max-h-56 object-contain bg-[#070b14] mx-auto select-none block"
            draggable={false}
          />
        </div>

        {/* Main Section */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-5 sm:gap-6">
          
          {/* Left Column: Leaderboard & Desktop Controls Guide */}
          <div className="w-full md:w-64 flex flex-col items-center md:items-start gap-4 order-2 md:order-1">
             <Leaderboard 
                entries={leaderboard} 
                currentScore={score} 
                isGameOver={isGameOver} 
                onSave={saveHighScore}
             />
             
             <div className="hidden md:flex flex-col gap-2.5 text-xs text-teal-300/70 font-mono bg-[#0b101d]/90 p-3.5 rounded-xl border border-teal-900/50 w-full shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-yellow-400">DESKTOP KEYS</h3>
                  <span className="text-[10px] text-teal-400/50">ARCADE</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="bg-[#070b14] border border-teal-800/60 text-yellow-300 px-2 py-0.5 rounded text-[11px]">WASD / ARROWS</span>
                    <span className="text-gray-300">Move Snake</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="bg-[#070b14] border border-teal-800/60 text-yellow-300 px-2 py-0.5 rounded text-[11px]">SPACEBAR</span>
                    <span className="text-gray-300">Play / Pause</span>
                </div>
            </div>
          </div>

          {/* Right Column: Game Area */}
          <div className="w-full md:w-[360px] flex flex-col items-center justify-start order-1 md:order-2">
            
            {/* Header Area */}
            <div className="w-full mb-3 space-y-2.5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-xs font-mono font-bold tracking-wider text-teal-300" style={{ fontFamily: '"Press Start 2P", monospace' }}>
                        FREQ LIVE
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full transition-all ${reverbActive ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]' : 'bg-gray-800/80 border border-teal-900/40'}`} title="Reverb Effect">
                            <Triangle size={12} className="fill-current text-white" />
                        </div>
                        <div className={`p-1.5 rounded-full transition-all ${delayActive ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]' : 'bg-gray-800/80 border border-teal-900/40'}`} title="Delay Effect">
                            <Circle size={12} className="fill-current text-white" />
                        </div>
                    </div>
                </div>

                {/* Horizontal Freq Bar */}
                <div className="relative h-6 bg-[#060a12] rounded-lg overflow-hidden border border-teal-800/60 flex items-center px-2 shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center opacity-15">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="w-full mx-[1px] h-full bg-teal-500" style={{ height: `${Math.random() * 100}%` }}></div>
                        ))}
                    </div>
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 transition-all duration-200 ease-out absolute left-0 top-0 opacity-85 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                        style={{ width: `${Math.min(100, (currentFreq / 800) * 100)}%` }}
                    ></div>
                    <span className="relative z-10 text-[11px] font-mono text-yellow-300 font-bold drop-shadow-md w-full text-right">
                    {currentFreq > 0 ? `${currentFreq.toFixed(1)} Hz` : 'SYNTH READY...'}
                    </span>
                </div>
                
                {/* Stats & Progression Row */}
                <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex gap-4">
                        <p className="text-teal-400/80">SCORE: <span className="text-yellow-400 font-bold text-sm">{score}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <Music size={12} className="text-yellow-400" />
                        <select 
                            value={selectedProgression}
                            onChange={handleProgressionChange}
                            className="bg-[#090f1c] text-yellow-300 border border-teal-700/60 rounded px-2 py-0.5 text-[11px] outline-none focus:border-yellow-400 cursor-pointer shadow-sm"
                        >
                            {Object.entries(PROGRESSIONS).map(([key, data]) => (
                            <option key={key} value={key}>{data.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Game Board Container with Swipe support */}
            <div className="relative w-full flex justify-center">
                <GameBoard 
                  snake={snake} 
                  items={items} 
                  onDirectionChange={changeDirection}
                />
                
                {(isPaused || isGameOver) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl z-30 p-5 text-center border-2 border-teal-500/30">
                    {isGameOver ? (
                    <>
                        <h2 className="text-xl text-orange-500 font-bold mb-2 font-mono tracking-wider drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]">TRACK ENDED</h2>
                        <div className="mb-4 min-h-[45px] max-w-[90%]">
                            {isLoadingAi ? (
                                <div className="flex items-center justify-center gap-2 text-yellow-300/80">
                                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                                    <span className="text-xs font-mono">Analyzing groove...</span>
                                </div>
                            ) : (
                                <p className="text-xs italic text-yellow-100/90 border-l-2 border-yellow-400 pl-2.5 font-mono">
                                    "{aiComment}"
                                </p>
                            )}
                        </div>
                        <button 
                            onClick={(e) => {
                                e.currentTarget.blur();
                                resetGame();
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-full text-xs transition-transform hover:scale-105 shadow-lg shadow-emerald-500/40 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            REMIX & PLAY
                        </button>
                    </>
                    ) : (
                    <button 
                        onClick={(e) => {
                            e.currentTarget.blur();
                            setIsPaused(false);
                            audioService.initialize();
                        }}
                        className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-full text-sm sm:text-base transition-all hover:scale-105 shadow-xl shadow-yellow-500/40 group cursor-pointer"
                    >
                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                        DROP BEAT
                    </button>
                    )}
                </div>
                )}
            </div>

            {/* Mobile Touch D-Pad */}
            <Controls onDirectionChange={changeDirection} />
            
            {/* Mobile & Desktop Audio Element Legend */}
            <div className="mt-3 flex gap-4 text-[11px] text-teal-300/80 font-mono">
                 <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-sm shadow-[0_0_6px_#facc15]"></div>
                    <span>Beat</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-orange-500"></div>
                    <span>Reverb</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]"></div>
                    <span>Delay</span>
                </div>
            </div>

          </div>

        </div>

        {/* Bottom Section: Audio Visualizer */}
        <div className="w-full">
           <Visualizer />
        </div>

      </div>

    </div>
  );
};

export default App;