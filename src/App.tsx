import React, { useState, useEffect, useRef } from 'react';
import { 
  Shuffle, HelpCircle, Coins, Dices, Layers, List, 
  RotateCcw, ArrowRight, Check, Play, Trophy, Copy, 
  Download, Sparkles, Hash, Plus, Trash2, ArrowUpDown
} from 'lucide-react';

interface GenerationHistory {
  id: string;
  type: 'number' | 'dice' | 'coin' | 'list_pick' | 'list_shuffle';
  result: string | number | string[] | number[];
  parameters: string;
  timestamp: Date;
}

export default function App() {
  // Navigation / Tab state within single-screen layout
  const [activeTab, setActiveTab] = useState<'number' | 'dice' | 'coin' | 'list'>('number');

  // Core RNG States
  const [minVal, setMinVal] = useState<number>(1);
  const [maxVal, setMaxVal] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);
  const [isRollingNumber, setIsRollingNumber] = useState<boolean>(false);

  // Dice Roller States
  const [diceType, setDiceType] = useState<number>(6);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);

  // Coin Flipper States
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [isFlippingCoin, setIsFlippingCoin] = useState<boolean>(false);
  const [headsCount, setHeadsCount] = useState<number>(0);
  const [tailsCount, setTailsCount] = useState<number>(0);

  // List Picker / Shuffler States
  const [listInput, setListInput] = useState<string>("Pizza\nTacos\nBurgers\nSushi\nSalad");
  const [listWinner, setListWinner] = useState<string | null>(null);
  const [shuffledList, setShuffledList] = useState<string[]>([]);
  const [isRandomizingList, setIsRandomizingList] = useState<boolean>(false);
  const [listActionType, setListActionType] = useState<'pick' | 'shuffle' | null>(null);

  // Global States
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sound effects (simulated using web audio api)
  const playBeep = (freq: number, type: 'sine' | 'square' | 'triangle' = 'sine', duration: number = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context blocked or not supported
    }
  };

  // 1. Single/Multiple Number Generator
  const generateRandomNumbers = () => {
    if (minVal > maxVal) {
      alert("Minimum value cannot be greater than maximum value.");
      return;
    }

    setIsRollingNumber(true);
    let rollsCount = 0;
    const intervalTime = 40;
    const totalSteps = 15;

    // Rolling animation
    const interval = setInterval(() => {
      const tempNums: number[] = [];
      for (let i = 0; i < quantity; i++) {
        tempNums.push(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
      }
      setGeneratedNumbers(tempNums);
      playBeep(250 + Math.random() * 200, 'triangle', 0.05);
      
      rollsCount++;
      if (rollsCount >= totalSteps) {
        clearInterval(interval);
        
        // Final generation
        const finalNums: number[] = [];
        const rangeSize = maxVal - minVal + 1;
        
        if (!allowDuplicates && quantity > rangeSize) {
          alert(`Cannot generate ${quantity} unique numbers in a range of ${rangeSize}. Adjusting quantity to ${rangeSize}.`);
          setQuantity(rangeSize);
          // Generate unique numbers
          const pool = Array.from({ length: rangeSize }, (_, i) => minVal + i);
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          finalNums.push(...pool.slice(0, rangeSize));
        } else {
          const used = new Set<number>();
          while (finalNums.length < quantity) {
            const num = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
            if (allowDuplicates) {
              finalNums.push(num);
            } else {
              if (!used.has(num)) {
                used.add(num);
                finalNums.push(num);
              }
            }
          }
        }

        // Apply sorting
        if (sortOrder === 'asc') {
          finalNums.sort((a, b) => a - b);
        } else if (sortOrder === 'desc') {
          finalNums.sort((a, b) => b - a);
        }

        setGeneratedNumbers(finalNums);
        setIsRollingNumber(false);
        playBeep(440, 'sine', 0.15);

        // Add to history
        const resultString = finalNums.join(', ');
        const newHist: GenerationHistory = {
          id: `hist_${Date.now()}`,
          type: 'number',
          result: finalNums,
          parameters: `Range: ${minVal}-${maxVal} | Qty: ${quantity}${!allowDuplicates ? ' | Unique' : ''}`,
          timestamp: new Date()
        };
        setHistory(prev => [newHist, ...prev].slice(0, 50));
      }
    }, intervalTime);
  };

  // 2. Dice Roller
  const rollDice = () => {
    setIsRollingDice(true);
    let rollsCount = 0;
    const intervalTime = 60;
    const totalSteps = 12;

    const interval = setInterval(() => {
      const tempDice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceType) + 1);
      setDiceResults(tempDice);
      playBeep(300 + Math.random() * 300, 'square', 0.04);

      rollsCount++;
      if (rollsCount >= totalSteps) {
        clearInterval(interval);
        
        const finalDice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceType) + 1);
        setDiceResults(finalDice);
        setIsRollingDice(false);
        playBeep(520, 'sine', 0.2);

        // Add to history
        const sum = finalDice.reduce((acc, v) => acc + v, 0);
        const newHist: GenerationHistory = {
          id: `hist_${Date.now()}`,
          type: 'dice',
          result: `Rolled ${diceCount}d${diceType}: [${finalDice.join(', ')}] (Sum: ${sum})`,
          parameters: `${diceCount} x D${diceType}`,
          timestamp: new Date()
        };
        setHistory(prev => [newHist, ...prev].slice(0, 50));
      }
    }, intervalTime);
  };

  // 3. Coin Flipper
  const flipCoin = () => {
    setIsFlippingCoin(true);
    let rollsCount = 0;
    const intervalTime = 70;
    const totalSteps = 10;

    const interval = setInterval(() => {
      setCoinResult(Math.random() < 0.5 ? 'heads' : 'tails');
      playBeep(600, 'triangle', 0.03);

      rollsCount++;
      if (rollsCount >= totalSteps) {
        clearInterval(interval);
        
        const finalCoin = Math.random() < 0.5 ? 'heads' : 'tails';
        setCoinResult(finalCoin);
        
        if (finalCoin === 'heads') {
          setHeadsCount(prev => prev + 1);
        } else {
          setTailsCount(prev => prev + 1);
        }
        
        setIsFlippingCoin(false);
        playBeep(finalCoin === 'heads' ? 580 : 490, 'sine', 0.18);

        // Add to history
        const newHist: GenerationHistory = {
          id: `hist_${Date.now()}`,
          type: 'coin',
          result: finalCoin.toUpperCase(),
          parameters: 'Standard 50/50 Coin',
          timestamp: new Date()
        };
        setHistory(prev => [newHist, ...prev].slice(0, 50));
      }
    }, intervalTime);
  };

  // 4. List Shuffler / Picker
  const handleListAction = (action: 'pick' | 'shuffle') => {
    const items = listInput
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (items.length === 0) {
      alert("Please enter at least one item in the list.");
      return;
    }

    setListActionType(action);
    setIsRandomizingList(true);
    setListWinner(null);
    setShuffledList([]);

    let steps = 0;
    const totalSteps = 12;
    const intervalTime = 80;

    const interval = setInterval(() => {
      if (action === 'pick') {
        const randomIndex = Math.floor(Math.random() * items.length);
        setListWinner(items[randomIndex]);
      } else {
        // Quick fake shuffle for animation
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        setShuffledList(shuffled);
      }
      playBeep(350 + Math.random() * 150, 'triangle', 0.04);

      steps++;
      if (steps >= totalSteps) {
        clearInterval(interval);
        setIsRandomizingList(false);

        if (action === 'pick') {
          const randomIndex = Math.floor(Math.random() * items.length);
          const winner = items[randomIndex];
          setListWinner(winner);
          playBeep(650, 'sine', 0.25);

          // Add to history
          const newHist: GenerationHistory = {
            id: `hist_${Date.now()}`,
            type: 'list_pick',
            result: `Picked: ${winner}`,
            parameters: `From list of ${items.length} items`,
            timestamp: new Date()
          };
          setHistory(prev => [newHist, ...prev].slice(0, 50));
        } else {
          // Final shuffle
          const finalShuffle = [...items];
          for (let i = finalShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalShuffle[i], finalShuffle[j]] = [finalShuffle[j], finalShuffle[i]];
          }
          setShuffledList(finalShuffle);
          playBeep(600, 'sine', 0.2);

          // Add to history
          const newHist: GenerationHistory = {
            id: `hist_${Date.now()}`,
            type: 'list_shuffle',
            result: `Shuffled: ${finalShuffle.slice(0, 3).join(', ')}${finalShuffle.length > 3 ? `... (+${finalShuffle.length - 3} more)` : ''}`,
            parameters: `Shuffled list of ${items.length} items`,
            timestamp: new Date()
          };
          setHistory(prev => [newHist, ...prev].slice(0, 50));
        }
      }
    }, intervalTime);
  };

  // Copy result to clipboard
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // Reset coin counters
  const handleResetCoinCounter = () => {
    setHeadsCount(0);
    setTailsCount(0);
    setCoinResult(null);
  };

  // Download history as text file
  const handleDownloadHistory = () => {
    if (history.length === 0) return;
    const content = history
      .map(h => `[${h.timestamp.toLocaleTimeString()}] ${h.type.toUpperCase()} | ${h.parameters} => Result: ${Array.isArray(h.result) ? h.result.join(', ') : h.result}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rng_history_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Randomizer Studio</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Smart Precision RNG</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" /> True Pseudo-RNG Engine
          </span>
          {history.length > 0 && (
            <button 
              onClick={() => {
                if (confirm("Clear all generation history?")) setHistory([]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </header>

      {/* Main Content Split View */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Pane: Config & Active Generator Component */}
        <section className="w-1/2 p-6 bg-slate-100 border-r border-slate-200 overflow-y-auto flex flex-col gap-6">
          
          {/* Quick tab switch (No external routed pages, clean tab widget for active tool) */}
          <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200 flex shrink-0">
            <button 
              onClick={() => setActiveTab('number')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'number' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Numbers</span>
            </button>
            <button 
              onClick={() => setActiveTab('dice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dice' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Dice Roller</span>
            </button>
            <button 
              onClick={() => setActiveTab('coin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'coin' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Coin Flipper</span>
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'list' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List Tools</span>
            </button>
          </div>

          {/* ACTIVE TOOL CONTAINER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col p-6 overflow-hidden">
            
            {/* TAB 1: NUMBERS */}
            {activeTab === 'number' && (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Number Generator Config</h3>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => { setMinVal(1); setMaxVal(10); setQuantity(1); }}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded border border-slate-200 transition-colors"
                      >
                        1-10
                      </button>
                      <button 
                        onClick={() => { setMinVal(1); setMaxVal(100); setQuantity(1); }}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded border border-slate-200 transition-colors"
                      >
                        1-100
                      </button>
                      <button 
                        onClick={() => { setMinVal(1); setMaxVal(1000); setQuantity(1); }}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded border border-slate-200 transition-colors"
                      >
                        1-1000
                      </button>
                    </div>
                  </div>

                  {/* Range Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Min Value</label>
                      <input 
                        type="number" 
                        value={minVal}
                        onChange={(e) => setMinVal(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Max Value</label>
                      <input 
                        type="number" 
                        value={maxVal}
                        onChange={(e) => setMaxVal(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Quantity & Unique checkboxes */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">How many numbers?</label>
                      <input 
                        type="number" 
                        min="1"
                        max="500"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div className="flex flex-col justify-end pb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-indigo-600 transition-colors py-2 px-1">
                        <input 
                          type="checkbox" 
                          checked={!allowDuplicates}
                          onChange={(e) => setAllowDuplicates(!e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 border-slate-300"
                        />
                        <span className="text-xs font-semibold">Strictly Unique</span>
                      </label>
                    </div>
                  </div>

                  {/* Sorting preference */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sorting Order</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setSortOrder('none')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                          sortOrder === 'none' 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Unsorted
                      </button>
                      <button 
                        onClick={() => setSortOrder('asc')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          sortOrder === 'asc' 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ArrowUpDown className="w-3 h-3" /> Ascending
                      </button>
                      <button 
                        onClick={() => setSortOrder('desc')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          sortOrder === 'desc' 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ArrowUpDown className="w-3 h-3 rotate-180" /> Descending
                      </button>
                    </div>
                  </div>
                </div>

                {/* Big Generation Trigger & Display */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-5">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center min-h-[140px] flex flex-col justify-center items-center relative group">
                    {generatedNumbers.length === 0 ? (
                      <div className="text-slate-400 text-sm flex flex-col items-center">
                        <Sparkles className="w-8 h-8 opacity-40 mb-2 animate-pulse text-indigo-500" />
                        <p>Click Generate to roll random numbers</p>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex justify-end gap-1.5 absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopyToClipboard(generatedNumbers.join(', '), 'num_result')}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition-all shadow-3xs"
                            title="Copy result"
                          >
                            {copiedId === 'num_result' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 max-h-[140px] overflow-y-auto px-6">
                          {generatedNumbers.map((num, i) => (
                            <div 
                              key={i} 
                              className={`h-12 min-w-12 px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-mono text-base font-bold text-indigo-700 shadow-2xs transition-all ${
                                isRollingNumber ? 'animate-bounce scale-105' : 'hover:scale-105'
                              }`}
                              style={{ animationDelay: `${i * 30}ms` }}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={generateRandomNumbers}
                    disabled={isRollingNumber}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer text-sm tracking-wide uppercase"
                  >
                    <Shuffle className={`w-4 h-4 ${isRollingNumber ? 'animate-spin' : ''}`} />
                    <span>{isRollingNumber ? "Rolling Numbers..." : "Generate Numbers"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DICE ROLLER */}
            {activeTab === 'dice' && (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Dice Configuration</h3>
                  </div>

                  {/* Dice Presets */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">Dice Type (Sided)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                        <button
                          key={sides}
                          onClick={() => setDiceType(sides)}
                          className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border transition-all ${
                            diceType === sides 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          D{sides}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dice Count */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Number of Dice</label>
                      <span className="text-xs font-bold text-indigo-600">{diceCount}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={diceCount}
                        onChange={(e) => setDiceCount(parseInt(e.target.value) || 1)}
                        className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={() => setDiceCount(prev => Math.max(1, prev - 1))}
                          className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold"
                        >
                          -
                        </button>
                        <button 
                          onClick={() => setDiceCount(prev => Math.min(12, prev + 1))}
                          className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rolling Panel & Trigger */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-5">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center min-h-[140px] flex flex-col justify-center items-center relative">
                    {diceResults.length === 0 ? (
                      <div className="text-slate-400 text-sm flex flex-col items-center">
                        <Dices className="w-8 h-8 opacity-40 mb-2 text-indigo-500 animate-pulse" />
                        <p>Configure dice and roll!</p>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex flex-wrap justify-center gap-3 max-h-[130px] overflow-y-auto py-2">
                          {diceResults.map((val, i) => (
                            <div 
                              key={i} 
                              className={`w-14 h-14 bg-white border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center shadow-xs text-indigo-700 transition-all ${
                                isRollingDice ? 'animate-spin scale-110 border-indigo-300' : 'hover:scale-105'
                              }`}
                            >
                              <span className="text-xl font-black font-mono leading-none">{val}</span>
                              <span className="text-[8px] text-slate-400 mt-0.5 font-bold uppercase">D{diceType}</span>
                            </div>
                          ))}
                        </div>
                        {diceResults.length > 1 && (
                          <div className="mt-3.5 text-xs font-bold text-slate-500">
                            Sum total: <span className="text-indigo-700 font-mono text-sm">{diceResults.reduce((acc, v) => acc + v, 0)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={rollDice}
                    disabled={isRollingDice}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer text-sm tracking-wide uppercase"
                  >
                    <Dices className={`w-4 h-4 ${isRollingDice ? 'animate-bounce' : ''}`} />
                    <span>{isRollingDice ? "Rolling Dice..." : "Roll Dice"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: COIN FLIPPER */}
            {activeTab === 'coin' && (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Coin Flipper</h3>
                    <button 
                      onClick={handleResetCoinCounter}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 uppercase flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Stats
                    </button>
                  </div>

                  {/* Coin Flipper Counter Banner */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Heads Count</p>
                      <p className="text-xl font-bold font-mono mt-0.5 text-indigo-600">{headsCount}</p>
                    </div>
                    <div className="text-center border-l border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tails Count</p>
                      <p className="text-xl font-bold font-mono mt-0.5 text-indigo-600">{tailsCount}</p>
                    </div>
                  </div>
                </div>

                {/* Coin visual space */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-5">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center min-h-[140px] flex flex-col justify-center items-center relative">
                    {coinResult === null ? (
                      <div className="text-slate-400 text-sm flex flex-col items-center">
                        <Coins className="w-10 h-10 opacity-40 mb-2 text-indigo-500 animate-pulse" />
                        <p>Flip the coin to settle the debate!</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        {/* Custom Animated Coin Circle */}
                        <div 
                          className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all shadow-md ${
                            coinResult === 'heads' 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : 'bg-slate-200 text-slate-700 border-slate-400'
                          } ${isFlippingCoin ? 'animate-bounce scale-110 rotate-360 duration-300' : ''}`}
                        >
                          <span className="text-sm font-black uppercase tracking-wider">{coinResult}</span>
                        </div>
                        <p className="mt-3.5 text-xs font-semibold text-slate-500">
                          Result is <span className="text-slate-800 font-bold uppercase">{coinResult}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={flipCoin}
                    disabled={isFlippingCoin}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer text-sm tracking-wide uppercase"
                  >
                    <Coins className={`w-4 h-4 ${isFlippingCoin ? 'animate-spin' : ''}`} />
                    <span>{isFlippingCoin ? "Flipping Coin..." : "Flip Coin"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: LIST TOOLS */}
            {activeTab === 'list' && (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">List Picker & Shuffler</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Enter List Items (separated by comma or newline)</label>
                    <textarea 
                      value={listInput}
                      onChange={(e) => setListInput(e.target.value)}
                      placeholder="Enter one item per line..."
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
                    />
                  </div>
                </div>

                {/* Result Block */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center min-h-[110px] flex flex-col justify-center items-center relative max-h-[160px] overflow-y-auto">
                    {isRandomizingList ? (
                      <div className="flex flex-col items-center">
                        <Shuffle className="w-6 h-6 text-indigo-600 animate-spin mb-1.5" />
                        <p className="text-xs text-slate-500 italic">Randomizing list items...</p>
                      </div>
                    ) : listWinner ? (
                      <div className="p-1">
                        <div className="flex items-center gap-1.5 justify-center text-emerald-600 font-bold text-xs uppercase mb-1">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Winner Selected</span>
                        </div>
                        <p className="text-lg font-black text-indigo-700">{listWinner}</p>
                      </div>
                    ) : shuffledList.length > 0 ? (
                      <div className="w-full text-left p-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Shuffled Sequence:</p>
                        <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                          {shuffledList.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs py-1 px-2.5 bg-white border border-slate-100 rounded-md">
                              <span className="font-mono text-[10px] font-bold text-slate-400">{idx + 1}.</span>
                              <span className="font-medium text-slate-800">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center">
                        <HelpCircle className="w-8 h-8 opacity-40 mb-1.5 text-indigo-500 animate-pulse" />
                        <p>Pick a random item or shuffle the whole list</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleListAction('pick')}
                      disabled={isRandomizingList || !listInput.trim()}
                      className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Pick Random</span>
                    </button>
                    <button 
                      onClick={() => handleListAction('shuffle')}
                      disabled={isRandomizingList || !listInput.trim()}
                      className="py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle All</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Right Pane: Smart Chat & Statistics */}
        <section className="w-1/2 flex flex-col bg-white overflow-hidden">
          
          {/* Smart Statistic Summary Bar */}
          <div className="p-4 bg-indigo-600 text-white flex justify-around items-center shrink-0 shadow-sm">
            <div className="text-center flex-1">
              <p className="text-[10px] opacity-80 uppercase font-semibold tracking-widest">Total Generated</p>
              <p className="text-lg font-bold font-mono tracking-tight">{history.length}</p>
            </div>
            <div className="w-px h-8 bg-white/20 self-center mx-2"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] opacity-80 uppercase font-semibold tracking-widest font-sans">Recent Mode</p>
              <p className="text-base font-bold uppercase truncate mt-0.5">
                {history.length > 0 ? history[0].type : "N/A"}
              </p>
            </div>
            <div className="w-px h-8 bg-white/20 self-center mx-2"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] opacity-80 uppercase font-semibold tracking-widest">Active Tool</p>
              <p className="text-base font-bold uppercase truncate mt-0.5">{activeTab}</p>
            </div>
          </div>

          {/* Generator Feed / History */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Roll Feed & History Log</span>
              {history.length > 0 && (
                <button 
                  onClick={handleDownloadHistory}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" /> Download log
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 opacity-80 mt-10">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-3 animate-bounce">
                  <Shuffle className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Awaiting first generation...</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                  Generated random numbers, dice rolls, coin flips, or list operations will appear in this real-time history log.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((log) => {
                  const itemResultStr = Array.isArray(log.result) ? log.result.join(', ') : log.result.toString();
                  return (
                    <div key={log.id} className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-3xs hover:border-indigo-100 hover:shadow-2xs transition-all relative group flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide border ${
                            log.type === 'number' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            log.type === 'dice' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            log.type === 'coin' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {log.parameters}
                          </span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleCopyToClipboard(itemResultStr, log.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors"
                            title="Copy output"
                          >
                            {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="pr-8 mt-1">
                        <p className="text-sm font-black font-mono text-slate-800 leading-snug break-all">
                          {itemResultStr}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-slate-50 pt-2">
                        <span>Studio Precision Engine</span>
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Helper Tip Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Studio Entropy Engine</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto uppercase tracking-wider font-semibold">
              Unbiased, uniform, and lightning-fast generations
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
