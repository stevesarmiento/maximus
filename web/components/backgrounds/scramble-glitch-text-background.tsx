"use client";

import { useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
const ENCRYPTION_WORDS = [
  'ENCRYPTED', 'SECURE', 'DELEGATE', 'PROTECTED', 'PRIVATE', 'LOCKED',
  'VERIFIED', 'AUTHENTICATED', 'AUTHORIZED', 'VALIDATED', 'SIGNED'
];

interface GlitchText {
  text: string;
  targetText: string;
  x: number;
  y: number;
  glitchProgress: number;
  glitchDelay: number;
}

export function ScrambleGlitchTextBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const textsRef = useRef<GlitchText[]>([]);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initTexts();
    };

    const initTexts = () => {
      textsRef.current = [];
      const numTexts = 8;
      
      for (let i = 0; i < numTexts; i++) {
        const word = ENCRYPTION_WORDS[Math.floor(Math.random() * ENCRYPTION_WORDS.length)];
        textsRef.current.push({
          text: word.split('').map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''),
          targetText: word,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          glitchProgress: 0,
          glitchDelay: Math.random() * 60,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function scrambleChar(target: string, progress: number): string {
      if (progress >= 1) return target;
      if (Math.random() > progress) {
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      return target;
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      textsRef.current.forEach(textObj => {
        // Wait for delay before starting glitch
        if (textObj.glitchDelay > 0) {
          textObj.glitchDelay--;
          return;
        }
        
        // Progress the glitch
        textObj.glitchProgress += 0.01;
        
        // Reset when complete
        if (textObj.glitchProgress >= 1.2) {
          textObj.glitchProgress = 0;
          textObj.glitchDelay = 60 + Math.random() * 120;
          textObj.targetText = ENCRYPTION_WORDS[Math.floor(Math.random() * ENCRYPTION_WORDS.length)];
          textObj.text = textObj.targetText.split('').map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
        }
        
        // Scramble text based on progress
        const currentText = textObj.targetText.split('').map((char, i) => 
          scrambleChar(char, textObj.glitchProgress - (i * 0.05))
        ).join('');
        
        // Draw text
        ctx.font = '16px monospace';
        ctx.fillStyle = `rgba(255, 224, 194, ${0.15 + textObj.glitchProgress * 0.1})`;
        ctx.fillText(currentText, textObj.x, textObj.y);
        
        // Random glitch offset
        if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(255, 224, 194, 0.05)';
          ctx.fillText(currentText, textObj.x + (Math.random() - 0.5) * 4, textObj.y + (Math.random() - 0.5) * 2);
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

