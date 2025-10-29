"use client";

import { useEffect, useRef } from 'react';

interface Scanline {
  y: number;
  data: string;
  alpha: number;
}

const DATA_CHARS = '01▓░▒█-';

export function ArchiveScanlinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const scanlinesRef = useRef<Scanline[]>([]);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initScanlines();
    };

    const initScanlines = () => {
      scanlinesRef.current = [];
      const lineSpacing = 12;
      const numLines = Math.ceil(canvas.height / lineSpacing);
      
      for (let i = 0; i < numLines; i++) {
        scanlinesRef.current.push({
          y: canvas.height - i * lineSpacing,
          data: generateDataString(canvas.width),
          alpha: 1 - (i / numLines) * 0.8,
        });
      }
    };

    function generateDataString(width: number): string {
      const numChars = Math.floor(width / 7);
      let str = '';
      for (let i = 0; i < numChars; i++) {
        str += DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)];
      }
      return str;
    }

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      // Move scanlines up
      scanlinesRef.current.forEach(line => {
        line.y -= 0.3;
        line.alpha -= 0.002;
      });
      
      // Remove old scanlines
      scanlinesRef.current = scanlinesRef.current.filter(line => line.alpha > 0 && line.y > -20);
      
      // Add new scanline at bottom
      if (frameCountRef.current % 40 === 0) {
        scanlinesRef.current.push({
          y: canvas.height,
          data: generateDataString(canvas.width),
          alpha: 1,
        });
      }
      
      // Draw scanlines
      ctx.font = '10px monospace';
      
      scanlinesRef.current.forEach(line => {
        const opacity = line.alpha * 0.15;
        
        // Draw base line
        ctx.strokeStyle = `rgba(255, 224, 194, ${opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(0, line.y);
        ctx.lineTo(canvas.width, line.y);
        ctx.stroke();
        
        // Draw data characters with dithering
        ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
        for (let i = 0; i < line.data.length; i++) {
          if (i % 2 === 0 || Math.random() > 0.3) {
            ctx.fillText(line.data[i], i * 7, line.y - 2);
          }
        }
        
        // Random glitch effect
        if (Math.random() > 0.98) {
          const glitchX = Math.random() * canvas.width;
          ctx.fillStyle = `rgba(255, 224, 194, ${opacity * 1.5})`;
          ctx.fillText('█', glitchX, line.y - 2);
        }
      });
      
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

