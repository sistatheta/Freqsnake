import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { audioService } from '../services/audioService';

const Visualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = Math.floor(rect.width);
        canvasRef.current.height = Math.floor(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const analyser = audioService.getAnalyser();
      const canvas = canvasRef.current;

      if (canvas && analyser && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background with translucent fade effect
          ctx.fillStyle = 'rgba(10, 14, 23, 0.5)';
          ctx.fillRect(0, 0, width, height);

          // 1. Draw FFT Frequency Spectrum Bars (Zero-Allocation Buffers)
          const freqBufferLength = analyser.frequencyBinCount;
          if (!freqDataRef.current || freqDataRef.current.length !== freqBufferLength) {
            freqDataRef.current = new Uint8Array(freqBufferLength);
          }
          const freqData = freqDataRef.current;
          analyser.getByteFrequencyData(freqData);

          const barCount = Math.min(48, Math.floor(width / 7));
          const barWidth = width / barCount;

          // Precompute gradient once or use simple fast gradient
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#ea580c');
          gradient.addColorStop(0.5, '#facc15');
          gradient.addColorStop(1, '#34d399');

          ctx.fillStyle = gradient;

          for (let i = 0; i < barCount; i++) {
            const index = Math.floor((i / barCount) * (freqBufferLength / 4));
            const value = freqData[index] || 0;
            const percent = value / 255;
            const barHeight = percent * (height * 0.82);

            const x = i * barWidth;
            const y = height - barHeight;

            ctx.fillRect(x + 1, y, barWidth - 1.5, barHeight);
          }

          // 2. Draw Time Domain Waveform Overlay (Zero-Allocation Buffers)
          const timeBufferLength = analyser.fftSize;
          if (!timeDataRef.current || timeDataRef.current.length !== timeBufferLength) {
            timeDataRef.current = new Uint8Array(timeBufferLength);
          }
          const timeData = timeDataRef.current;
          analyser.getByteTimeDomainData(timeData);

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#2dd4bf';
          ctx.beginPath();

          // Subsample points for high 60fps mobile performance
          const step = Math.max(1, Math.floor(timeBufferLength / 128));
          const sliceWidth = width / (timeBufferLength / step);
          let x = 0;

          for (let i = 0; i < timeBufferLength; i += step) {
            const v = timeData[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="w-full bg-[#0b101d]/90 border border-teal-800/40 rounded-xl p-3 backdrop-blur-md shadow-lg flex flex-col gap-2">
      {/* Header Label */}
      <div className="flex items-center justify-between text-xs font-mono border-b border-teal-900/60 pb-2">
        <div className="flex items-center gap-2 text-yellow-400 font-bold tracking-wider">
          <Activity className="w-4 h-4 text-yellow-400 animate-pulse drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
          <span>AUDIO VISUALIZER</span>
        </div>
        <span className="text-[10px] text-teal-300/60 font-mono tracking-widest hidden sm:inline">
          SPECTRUM & WAVEFORM
        </span>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="w-full h-20 relative overflow-hidden rounded-lg bg-[#070b13] border border-teal-900/50">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default Visualizer;
