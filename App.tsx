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
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col items-center justify-center p-4">
      
      {/* Outer Wrapper with Unified Width */}
      <div className="w-full max-w-[640px] flex flex-col gap-5">
        
        {/* Top Main Section */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          
          {/* Left Column: Leaderboard & Controls */}
          <div className="w-full md:w-64 flex flex-col items-center md:items-start gap-4 order-2 md:order-1">
             <Leaderboard 
                entries={leaderboard} 
                currentScore={score} 
                isGameOver={isGameOver} 
                onSave={saveHighScore}
             />
             
             <div className="hidden md:flex flex-col gap-2.5 text-xs text-gray-500 font-mono bg-gray-900/50 p-3.5 rounded-lg border border-gray-800 w-full">
                <h3 className="font-bold text-gray-400">CONTROLS</h3>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-[11px]">WASD / ARROWS</span>
                    <span>Move</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-[11px]">SPACE</span>
                    <span>Pause</span>
                </div>
            </div>
          </div>

          {/* Right Column: Game Area */}
          <div className="w-full md:w-[360px] flex flex-col items-center justify-start order-1 md:order-2">
            
            {/* Header Area */}
            <div className="w-full mb-3 space-y-2.5">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 italic" style={{ fontFamily: '"Press Start 2P", monospace' }}>
                        FREQ SNAKE
                    </h1>
                    
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full transition-colors ${reverbActive ? 'bg-purple-500 shadow-[0_0_10px_purple]' : 'bg-gray-800'}`} title="Reverb">
                            <Triangle size={12} className="fill-current text-white" />
                        </div>
                        <div className={`p-1.5 rounded-full transition-colors ${delayActive ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-gray-800'}`} title="Delay">
                            <Circle size={12} className="fill-current text-white" />
                        </div>
                    </div>
                </div>

                {/* Horizontal Freq Bar (Top) */}
                <div className="relative h-6 bg-gray-900 rounded overflow-hidden border border-gray-700 flex items-center px-2 shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="w-full mx-[1px] h-full bg-gray-700" style={{ height: `${Math.random() * 100}%` }}></div>
                        ))}
                    </div>
                    <div 
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-200 ease-out absolute left-0 top-0 opacity-80"
                        style={{ width: `${Math.min(100, (currentFreq / 800) * 100)}%` }}
                    ></div>
                    <span className="relative z-10 text-[11px] font-mono text-white drop-shadow-md w-full text-right">
                    {currentFreq > 0 ? `${currentFreq.toFixed(1)} Hz` : 'WAITING FOR SIGNAL...'}
                    </span>
                </div>
                
                {/* Stats Row */}
                <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex gap-4">
                        <p className="text-gray-400">SCORE: <span className="text-white font-bold">{score}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <Music size={12} className="text-pink-400" />
                        <select 
                            value={selectedProgression}
                            onChange={handleProgressionChange}
                            className="bg-gray-900 text-white border border-gray-700 rounded px-1.5 py-0.5 text-[11px] outline-none focus:border-pink-500 cursor-pointer"
                        >
                            {Object.entries(PROGRESSIONS).map(([key, data]) => (
                            <option key={key} value={key}>{data.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Game Board Container */}
            <div className="relative w-full flex justify-center">
                <GameBoard snake={snake} items={items} />
                
                {(isPaused || isGameOver) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm rounded-lg z-30 p-5 text-center">
                    {isGameOver ? (
                    <>
                        <h2 className="text-xl text-red-500 font-bold mb-2 font-mono">TRACK ENDED</h2>
                        <div className="mb-4 min-h-[45px] max-w-[90%]">
                            {isLoadingAi ? (
                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Reviewing mix...</span>
                                </div>
                            ) : (
                                <p className="text-xs italic text-gray-300 border-l-2 border-pink-500 pl-2.5">
                                    "{aiComment}"
                                </p>
                            )}
                        </div>
                        <button 
                            onClick={(e) => {
                                e.currentTarget.blur();
                                resetGame();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-xs transition-transform hover:scale-105 shadow-lg shadow-green-500/40"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            REMIX
                        </button>
                    </>
                    ) : (
                    <button 
                        onClick={(e) => {
                            e.currentTarget.blur();
                            setIsPaused(false);
                            audioService.initialize();
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold text-base transition-all hover:scale-105 shadow-lg shadow-pink-600/40 group"
                    >
                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                        DROP BEAT
                    </button>
                    )}
                </div>
                )}
            </div>

            <Controls onDirectionChange={changeDirection} />
            
            {/* Mobile Legend */}
            <div className="mt-3 flex gap-4 text-[11px] text-gray-500 font-mono md:hidden">
                 <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-pink-500 rounded-sm"></div>
                    <span>Beat</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-purple-500"></div>
                    <span>Reverb</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full"></div>
                    <span>Delay</span>
                </div>
            </div>

          </div>

        </div>

        {/* Bottom Section: Audio Visualizer aligned with Left & Right edges of top components */}
        <div className="w-full">
           <Visualizer />
        </div>

      </div>

    </div>
  );
};

export default App;