import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Loader2, Triangle, Circle, Music, Trophy, Save, Sparkles } from 'lucide-react';
import { Direction, Point, GameItem, ItemType, HighScoreEntry } from './types';
import { GRID_SIZE, INITIAL_SPEED, KEY_MAP, SPEED_INCREMENT, MIN_SPEED, PROGRESSIONS } from './constants';
import { getGameOverCommentary } from './services/geminiService';
import { audioService, PlayedNoteInfo } from './services/audioService';
import { subscribeToGlobalLeaderboard, addGlobalHighScore, validateFirestoreConnection } from './services/firebase';
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
    const onSnake = snake.some(s => s.x === newPos.x && s.y === newPos.y);
    const onItem = items.some(i => i.pos.x === newPos.x && i.pos.y === newPos.y);
    isOccupied = onSnake || onItem;
  }
  return newPos!;
};

const App: React.FC = () => {
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
  const [items, setItems] = useState<GameItem[]>([{ pos: { x: 11, y: 4 }, type: 'FOOD', id: 'init-food' }]);
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
  const [inModalName, setInModalName] = useState('');
  const [hasSavedScoreInModal, setHasSavedScoreInModal] = useState(false);

  // Audio & Melody State
  const [currentNoteInfo, setCurrentNoteInfo] = useState<PlayedNoteInfo | null>(null);
  const [reverbActive, setReverbActive] = useState(false);
  const [delayActive, setDelayActive] = useState(false);
  const [selectedProgression, setSelectedProgression] = useState('pop-anthem');
  const [isBeatEnabled, setIsBeatEnabled] = useState(true);

  // AI Commentary State
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Performance Refs for Lag-Free Instant Input Queueing
  const currentDirectionRef = useRef<Direction>(Direction.RIGHT);
  const directionQueueRef = useRef<Direction[]>([]);
  const snakeRef = useRef<Point[]>([{ x: 7, y: 7 }]);
  const itemsRef = useRef<GameItem[]>([{ pos: { x: 11, y: 4 }, type: 'FOOD', id: 'init-food' }]);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(INITIAL_SPEED);
  const isPausedRef = useRef<boolean>(true);
  const isGameOverRef = useRef<boolean>(false);
  const reverbRef = useRef<boolean>(false);
  const delayRef = useRef<boolean>(false);
  const isBeatEnabledRef = useRef<boolean>(true);

  // Keep refs in sync with reactive state
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { reverbRef.current = reverbActive; }, [reverbActive]);
  useEffect(() => { delayRef.current = delayActive; }, [delayActive]);
  useEffect(() => { isBeatEnabledRef.current = isBeatEnabled; }, [isBeatEnabled]);

  // Sync Drum Beat with game play/pause/gameover state
  useEffect(() => {
    if (!isPaused && !isGameOver && isBeatEnabled) {
      audioService.startBeat();
    } else {
      audioService.stopBeat();
    }
  }, [isPaused, isGameOver, isBeatEnabled]);

  // Warm up audio service & subscribe to live worldwide leaderboard
  useEffect(() => {
    audioService.initialize();
    validateFirestoreConnection();

    // Subscribe to live worldwide leaderboard from Firebase Firestore
    const unsubscribe = subscribeToGlobalLeaderboard((globalEntries) => {
      if (globalEntries && globalEntries.length > 0) {
        setLeaderboard(globalEntries);
      }
    });

    return () => {
      unsubscribe();
      audioService.stopBeat();
    };
  }, []);

  const toggleBeat = () => {
    audioService.initialize();
    setIsBeatEnabled(prev => !prev);
  };

  const resetGame = () => {
    audioService.initialize(); 
    
    const startSnake = [{ x: 7, y: 7 }];
    const startFood: GameItem = { 
      pos: generatePosition(startSnake, []), 
      type: 'FOOD', 
      id: Date.now().toString() 
    };
    
    currentDirectionRef.current = Direction.RIGHT;
    directionQueueRef.current = [];
    snakeRef.current = startSnake;
    itemsRef.current = [startFood];
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    isPausedRef.current = false;
    isGameOverRef.current = false;
    reverbRef.current = false;
    delayRef.current = false;

    setSnake(startSnake);
    setItems([startFood]);
    setDirection(Direction.RIGHT);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    setAiComment(null);
    setCurrentNoteInfo(null);
    setHasSavedScoreInModal(false);
    setInModalName('');
    
    setReverbActive(false);
    setDelayActive(false);
    audioService.toggleReverb(false);
    audioService.toggleDelay(false);
  };

  const saveHighScore = async (name: string) => {
    const trimmed = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
    const newEntry: HighScoreEntry = {
      name: trimmed,
      score,
      timestamp: Date.now()
    };
    
    // Save locally for instant feedback
    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(newLeaderboard);
    localStorage.setItem('freqSnakeLeaderboard', JSON.stringify(newLeaderboard));
    setHasSavedScoreInModal(true);

    // Persist to real-time worldwide Firebase Firestore
    try {
      await addGlobalHighScore(trimmed, score);
    } catch (err) {
      console.warn("Could not save to global leaderboard:", err);
    }
  };

  const handleModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (inModalName.trim().length > 0) {
      saveHighScore(inModalName);
      setInModalName('');
    }
  };

  // Instant Lag-Free Direction Queuing (resolves left/right delay)
  const changeDirection = useCallback((newDir: Direction) => {
    // If paused, unpause immediately on key/button press
    if (isPausedRef.current && !isGameOverRef.current) {
      audioService.initialize();
      isPausedRef.current = false;
      setIsPaused(false);
    }

    const queue = directionQueueRef.current;
    // Determine baseline direction: either the last direction in the queue or current movement
    const baseline = queue.length > 0 ? queue[queue.length - 1] : currentDirectionRef.current;

    // Prevent direct 180° reversal into own body
    if (newDir === Direction.UP && baseline === Direction.DOWN) return;
    if (newDir === Direction.DOWN && baseline === Direction.UP) return;
    if (newDir === Direction.LEFT && baseline === Direction.RIGHT) return;
    if (newDir === Direction.RIGHT && baseline === Direction.LEFT) return;
    if (newDir === baseline) return;

    // Queue the direction (limit buffer to 2 moves to avoid stale inputs)
    if (queue.length < 2) {
      queue.push(newDir);
    }
  }, []);

  // Global Keyboard Listener
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
        changeDirection(mappedDir as Direction);
      }
      if ((e.key === ' ' || e.code === 'Space') && !isGameOverRef.current) {
        e.preventDefault();
        if (activeEl && activeEl !== document.body) {
          activeEl.blur();
        }
        if (isPausedRef.current) {
          audioService.initialize();
        }
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [changeDirection]);

  // Progression Selector
  const handleProgressionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProgression(val);
    audioService.setProgression(val);
    (e.target as HTMLElement).blur();
  };

  // High performance game loop (runs on stable cadence without timer destruction on each tick)
  useEffect(() => {
    if (isPaused || isGameOver) return;

    const moveSnake = () => {
      // 1. Consume queued direction if available
      if (directionQueueRef.current.length > 0) {
        const nextDir = directionQueueRef.current.shift()!;
        currentDirectionRef.current = nextDir;
        setDirection(nextDir);
      }

      const currentDir = currentDirectionRef.current;
      const currentSnake = snakeRef.current;
      const head = currentSnake[0];
      const newHead = { ...head };

      switch (currentDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      // Wrap around grid boundaries
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      else if (newHead.x >= GRID_SIZE) newHead.x = 0;

      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      else if (newHead.y >= GRID_SIZE) newHead.y = 0;

      // Self Collision check
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return;
      }

      const newSnake = [newHead, ...currentSnake];
      const currentItems = itemsRef.current;
      
      // Check Item Collision
      const itemIndex = currentItems.findIndex(i => i.pos.x === newHead.x && i.pos.y === newHead.y);
      
      if (itemIndex !== -1) {
        const item = currentItems[itemIndex];
        
        if (item.type === 'FOOD') {
          const currentScore = scoreRef.current;
          
          // Play melodic note following chord progression
          const noteResult = audioService.playNote(currentScore);
          setCurrentNoteInfo(noteResult);

          const nextScore = currentScore + 1;
          scoreRef.current = nextScore;
          setScore(nextScore);

          const nextSpeed = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
          speedRef.current = nextSpeed;
          setSpeed(nextSpeed);
          
          // Respawn food
          const nextItems = currentItems.filter((_, i) => i !== itemIndex);
          nextItems.push({
            pos: generatePosition(newSnake, nextItems),
            type: 'FOOD',
            id: Date.now() + '-food'
          });

          // Random powerup spawn every 5 points
          if (nextScore % 5 === 0) {
            const type: ItemType = Math.random() > 0.5 ? 'REVERB' : 'DELAY';
            nextItems.push({
              pos: generatePosition(newSnake, nextItems),
              type: type,
              id: Date.now() + '-' + type
            });
          }
          
          itemsRef.current = nextItems;
          setItems(nextItems);
        } 
        else if (item.type === 'REVERB') {
           const newState = !reverbRef.current;
           reverbRef.current = newState;
           setReverbActive(newState);
           audioService.toggleReverb(newState);
           itemsRef.current = currentItems.filter((_, i) => i !== itemIndex);
           setItems(itemsRef.current);
           newSnake.pop(); 
        } 
        else if (item.type === 'DELAY') {
           const newState = !delayRef.current;
           delayRef.current = newState;
           setDelayActive(newState);
           audioService.toggleDelay(newState);
           itemsRef.current = currentItems.filter((_, i) => i !== itemIndex);
           setItems(itemsRef.current);
           newSnake.pop();
        }
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake(newSnake);
    };

    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [isPaused, isGameOver, speed]);

  const handleGameOver = async () => {
    isGameOverRef.current = true;
    isPausedRef.current = true;
    setIsGameOver(true);
    setIsPaused(true);
    
    if (scoreRef.current > 5) {
      setIsLoadingAi(true);
      const comment = await getGameOverCommentary(scoreRef.current);
      setAiComment(comment);
      setIsLoadingAi(false);
    } else {
      setAiComment("Practice your synth scales, Maestro!");
    }
  };

  // Determine if current game qualifies for leaderboard top 10
  const isHighScoreQualifying = isGameOver && score > 0 && (
    leaderboard.length < 10 || score > (leaderboard[leaderboard.length - 1]?.score || 0)
  );

  return (
    <div className="min-h-screen bg-[#070a12] text-white font-sans flex flex-col items-center justify-start py-3 sm:py-4 px-3 sm:px-4">
      
      {/* Outer Wrapper with Unified Width */}
      <div className="w-full max-w-[640px] md:max-w-[720px] flex flex-col gap-3 sm:gap-4">
        
        {/* Semantic SEO Heading for Search Engines */}
        <h1 className="sr-only">Play Snake Online Free — Freq Snake Retro Synth Arcade</h1>

        {/* Top Banner Marquee (Responsive height: sleek on mobile, grand on desktop) */}
        <div className="w-full relative overflow-hidden rounded-2xl border-2 border-teal-700/50 shadow-[0_0_35px_rgba(13,148,136,0.35)] bg-[#070b14] group">
          <img 
            src="/assets/aistudio/freqsnake-banner_7806c86a.jpg" 
            alt="Freq Snake Arcade Banner" 
            className="w-full h-auto max-h-24 sm:max-h-44 md:max-h-64 object-contain bg-[#070b14] mx-auto select-none block transition-all"
            draggable={false}
          />
        </div>

        {/* Main Section */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-4 sm:gap-6">
          
          {/* Left Column: Leaderboard & Desktop Controls Guide */}
          <div className="w-full md:w-64 flex flex-col items-center md:items-start gap-3 order-2 md:order-1">
             <Leaderboard 
                entries={leaderboard} 
                currentScore={score}
             />
             
             <div className="hidden md:flex flex-col gap-2 text-xs text-teal-300/70 font-mono bg-[#0b101d]/90 p-3 rounded-xl border border-teal-900/50 w-full shadow-lg">
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
            <div className="w-full mb-2.5 space-y-2">
                <div className="flex justify-between items-center">
                    {/* Live Equalizer Pulse Indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className={`w-1 bg-emerald-400 rounded-sm transition-all ${!isPaused ? 'animate-bounce h-3.5' : 'h-1.5'}`} style={{ animationDelay: '0ms' }}></span>
                        <span className={`w-1 bg-teal-400 rounded-sm transition-all ${!isPaused ? 'animate-bounce h-2.5' : 'h-2'}`} style={{ animationDelay: '150ms' }}></span>
                        <span className={`w-1 bg-yellow-400 rounded-sm transition-all ${!isPaused ? 'animate-bounce h-3.5' : 'h-1'}`} style={{ animationDelay: '75ms' }}></span>
                        <span className={`w-1 bg-amber-400 rounded-sm transition-all ${!isPaused ? 'animate-bounce h-2' : 'h-2.5'}`} style={{ animationDelay: '200ms' }}></span>
                      </div>
                      <span className="text-[11px] font-mono font-bold tracking-wider text-teal-300" style={{ fontFamily: '"Press Start 2P", monospace' }}>
                        FREQ LIVE
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full transition-all ${reverbActive ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]' : 'bg-gray-800/80 border border-teal-900/40'}`} title="Reverb Effect">
                            <Triangle size={11} className="fill-current text-white" />
                        </div>
                        <div className={`p-1.5 rounded-full transition-all ${delayActive ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]' : 'bg-gray-800/80 border border-teal-900/40'}`} title="Delay Effect">
                            <Circle size={11} className="fill-current text-white" />
                        </div>
                    </div>
                </div>

                {/* Musical Melody & Frequency Bar */}
                <div className="relative h-6 bg-[#060a12] rounded-lg overflow-hidden border border-teal-800/60 flex items-center px-2.5 shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-between px-1 opacity-20 pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="w-[1px] h-full bg-teal-400"></div>
                        ))}
                    </div>
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 transition-all duration-150 ease-out absolute left-0 top-0 opacity-85 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                        style={{ width: `${currentNoteInfo ? Math.min(100, Math.max(12, ((currentNoteInfo.freq - 130) / 600) * 100)) : 0}%` }}
                    ></div>
                    <div className="relative z-10 flex items-center justify-between w-full text-[10px] font-mono text-yellow-300 font-bold drop-shadow">
                      <span className="text-teal-200 truncate pr-2">
                        {currentNoteInfo ? `${currentNoteInfo.note} • ${currentNoteInfo.chordName}` : 'EAT FOOD TO PLAY MELODY'}
                      </span>
                      <span className="shrink-0">
                        {currentNoteInfo ? `${currentNoteInfo.freq.toFixed(1)} Hz` : 'READY'}
                      </span>
                    </div>
                </div>
                
                {/* Stats, Beat Toggle & Progression Row */}
                <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
                    <div className="flex gap-4 items-center">
                        <p className="text-teal-400/80">SCORE: <span className="text-yellow-400 font-bold text-sm">{score}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* 4-on-the-Floor Drum Beat Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur();
                            toggleBeat();
                          }}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer select-none ${
                            isBeatEnabled 
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.35)]' 
                              : 'bg-[#090f1c] text-teal-400/50 border-teal-800/50 hover:text-teal-200'
                          }`}
                          title="Toggle 4-on-the-floor synth drum beat"
                        >
                          <span className={isBeatEnabled && !isPaused && !isGameOver ? 'animate-pulse' : ''}>🥁</span>
                          <span>BEAT: {isBeatEnabled ? 'ON' : 'OFF'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <Music size={11} className="text-yellow-400 shrink-0" />
                          <select 
                              value={selectedProgression}
                              onChange={handleProgressionChange}
                              className="bg-[#090f1c] text-yellow-300 border border-teal-700/60 rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-yellow-400 cursor-pointer shadow-sm max-w-[125px] sm:max-w-none truncate"
                          >
                              {Object.entries(PROGRESSIONS).map(([key, data]) => (
                              <option key={key} value={key}>{data.name}</option>
                              ))}
                          </select>
                        </div>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm rounded-xl z-30 p-4 text-center border-2 border-teal-500/30">
                    {isGameOver ? (
                    <div className="w-full flex flex-col items-center max-w-[320px]">
                        <h2 className="text-lg sm:text-xl text-orange-500 font-bold mb-1 font-mono tracking-wider drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]">
                          TRACK ENDED
                        </h2>
                        
                        <p className="text-xs font-mono text-teal-300 mb-2">FINAL SCORE: <span className="text-yellow-300 font-bold text-sm">{score}</span></p>

                        {/* In-Modal High Score Submission Form */}
                        {isHighScoreQualifying && !hasSavedScoreInModal ? (
                          <div className="w-full bg-amber-950/60 p-2.5 rounded-lg border border-amber-500/70 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
                            <div className="flex items-center justify-center gap-1.5 text-yellow-300 text-xs font-bold font-mono mb-1.5">
                              <Trophy size={14} className="text-yellow-400" />
                              <span>NEW HIGH SCORE!</span>
                            </div>
                            <form onSubmit={handleModalSave} className="flex gap-2 w-full">
                              <input
                                type="text"
                                maxLength={3}
                                value={inModalName}
                                onChange={(e) => setInModalName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                placeholder="AAA"
                                className="w-full bg-[#080d18] border border-teal-600/70 rounded px-2.5 py-1 text-sm font-mono text-yellow-300 uppercase tracking-[0.3em] font-bold focus:border-yellow-400 outline-none text-center"
                                autoFocus
                              />
                              <button 
                                type="submit" 
                                disabled={!inModalName.trim()}
                                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1 rounded text-xs transition-all shadow-md shadow-amber-500/30 shrink-0 flex items-center gap-1 cursor-pointer"
                              >
                                <Save size={13} />
                                <span>SAVE</span>
                              </button>
                            </form>
                          </div>
                        ) : hasSavedScoreInModal ? (
                          <div className="w-full bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/60 mb-2 text-emerald-300 text-xs font-mono flex items-center justify-center gap-1.5">
                            <Sparkles size={14} className="text-yellow-300" />
                            <span>RECORD SAVED TO LEGENDS!</span>
                          </div>
                        ) : null}

                        {/* AI Music Critic Review */}
                        <div className="mb-3 min-h-[40px] max-w-[90%]">
                            {isLoadingAi ? (
                                <div className="flex items-center justify-center gap-2 text-yellow-300/80">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                                    <span className="text-xs font-mono">Analyzing groove...</span>
                                </div>
                            ) : (
                                <p className="text-[11px] italic text-yellow-100/90 border-l-2 border-yellow-400 pl-2 font-mono">
                                    "{aiComment}"
                                </p>
                            )}
                        </div>

                        <button 
                            onClick={(e) => {
                                e.currentTarget.blur();
                                resetGame();
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-full text-xs transition-transform hover:scale-105 shadow-lg shadow-emerald-500/40 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            REMIX & PLAY
                        </button>
                    </div>
                    ) : (
                    <button 
                        onClick={(e) => {
                            e.currentTarget.blur();
                            setIsPaused(false);
                            audioService.initialize();
                        }}
                        className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-full text-sm sm:text-base transition-all hover:scale-105 shadow-xl shadow-yellow-500/40 group cursor-pointer"
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
            <div className="mt-2.5 flex gap-4 text-[10px] text-teal-300/80 font-mono">
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