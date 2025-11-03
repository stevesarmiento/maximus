"use client";

import { useEffect, useRef } from 'react';

const MATRIX_CHARS = 'ENCRYPTED0101SECURE0110DELEGATE1001PROTECTED0011';

interface Drop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

export function MatrixRainTextBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const dropsRef = useRef<Drop[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initDrops();
    };

    const initDrops = () => {
      dropsRef.current = [];
      const fontSize = 14;
      const columns = Math.floor(canvas.width / fontSize);
      
      for (let i = 0; i < columns; i++) {
        if (Math.random() > 0.7) {
          dropsRef.current.push({
            x: i * fontSize,
            y: Math.random() * canvas.height,
            speed: 0.5 + Math.random() * 1.5,
            chars: Array(15).fill(0).map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
          });
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      // Fade out previous frame
      ctx.fillStyle = 'rgba(34, 31, 29, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = '14px monospace';
      
      dropsRef.current.forEach(drop => {
        drop.chars.forEach((char, i) => {
          const y = drop.y - i * 14;
          
          if (y > 0 && y < canvas.height) {
            // Brightest at the head
            const alpha = i === 0 ? 0.3 : Math.max(0.05, 0.3 - i * 0.02);
            ctx.fillStyle = `rgba(255, 224, 194, ${alpha})`;
            ctx.fillText(char, drop.x, y);
          }
        });
        
        // Move drop down
        drop.y += drop.speed;
        
        // Reset when off screen
        if (drop.y > canvas.height + 100) {
          drop.y = -100;
          drop.speed = 0.5 + Math.random() * 1.5;
          drop.chars = Array(15).fill(0).map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]);
        }
        
        // Randomly change characters
        if (Math.random() > 0.98) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
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

