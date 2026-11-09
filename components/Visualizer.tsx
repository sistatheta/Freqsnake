import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { audioService } from '../services/audioService';

const Visualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const analyser = audioService.getAnalyser();
      const canvas = canvasRef.current;

      if (canvas && analyser) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background with translucent fade effect
          ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.fillRect(0, 0, width, height);

          // 1. Draw FFT Frequency Spectrum Bars
          const freqBufferLength = analyser.frequencyBinCount;
          const freqData = new Uint8Array(freqBufferLength);
          analyser.getByteFrequencyData(freqData);

          const barCount = Math.min(64, Math.floor(width / 8));
          const barWidth = width / barCount;

          for (let i = 0; i < barCount; i++) {
            const index = Math.floor((i / barCount) * (freqBufferLength / 4));
            const value = freqData[index] || 0;
            const percent = value / 255;
            const barHeight = percent * (height * 0.85);

            const x = i * barWidth;
            const y = height - barHeight;

            // Gradient for spectrum bars
            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            gradient.addColorStop(0, '#ec4899'); // Pink
            gradient.addColorStop(0.5, '#a855f7'); // Purple
            gradient.addColorStop(1, '#22d3ee'); // Cyan

            ctx.fillStyle = gradient;
            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
          }

          // 2. Draw Time Domain Waveform Overlay
          const timeBufferLength = analyser.fftSize;
          const timeData = new Uint8Array(timeBufferLength);
          analyser.getByteTimeDomainData(timeData);

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#22d3ee';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#22d3ee';
          ctx.beginPath();

          const sliceWidth = width / timeBufferLength;
          let x = 0;

          for (let i = 0; i < timeBufferLength; i++) {
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
          ctx.shadowBlur = 0; // Reset shadow for next frame
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
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-lg p-3 backdrop-blur-md shadow-lg flex flex-col gap-2">
      {/* Header Label - Cleanly displayed & un-truncated */}
      <div className="flex items-center justify-between text-xs font-mono border-b border-gray-800/80 pb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>AUDIO VISUALIZER</span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono tracking-widest hidden sm:inline">
          SPECTRUM & WAVEFORM
        </span>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="w-full h-20 relative overflow-hidden rounded bg-gray-950/80 border border-gray-800">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default Visualizer;
