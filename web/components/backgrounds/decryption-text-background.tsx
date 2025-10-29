"use client";

import { useEffect, useRef } from 'react';

const SYMBOLS = '▓░▒█▄▀▐│┤╡╢╖╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌';
const TARGET_LINES = [
  'ENCRYPTION: AES-256',
  'KEY LENGTH: 2048-BIT',
  'STATUS: AUTHORIZED',
  'DELEGATION: ACTIVE',
  'SECURITY: VERIFIED'
];

interface DecryptingLine {
  text: string;
  targetText: string;
  y: number;
  progress: number;
  delay: number;
}

export function DecryptionTextBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const linesRef = useRef<DecryptingLine[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initLines();
    };

    const initLines = () => {
      linesRef.current = [];
      const lineHeight = 30;
      const startY = (canvas.height - TARGET_LINES.length * lineHeight) / 2;
      
      TARGET_LINES.forEach((line, i) => {
        linesRef.current.push({
          text: line.split('').map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]).join(''),
          targetText: line,
          y: startY + i * lineHeight,
          progress: 0,
          delay: i * 20,
        });
      });
    };

    resize();
    window.addEventListener('resize', resize);

    function decryptChar(target: string, progress: number): string {
      if (progress >= 1) return target;
      if (target === ' ' || target === ':') return target;
      if (Math.random() > progress * 0.7) {
        return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      }
      return target;
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      
      linesRef.current.forEach(line => {
        if (line.delay > 0) {
          line.delay--;
          return;
        }
        
        line.progress += 0.008;
        
        // Reset after fully decrypted
        if (line.progress >= 1.5) {
          line.progress = 0;
          line.delay = 120;
          line.text = line.targetText.split('').map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]).join('');
        }
        
        // Decrypt text character by character
        const currentText = line.targetText.split('').map((char, i) => 
          decryptChar(char, Math.max(0, line.progress - (i * 0.03)))
        ).join('');
        
        const opacity = Math.min(0.25, line.progress * 0.25);
        ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
        ctx.fillText(currentText, canvas.width / 2, line.y);
        
        // Cursor effect on current decrypting character
        if (line.progress < 1) {
          const decodingIndex = Math.floor(line.progress * line.targetText.length);
          const charWidth = ctx.measureText(currentText.substring(0, decodingIndex)).width;
          ctx.fillStyle = `rgba(255, 224, 194, ${0.4 * Math.sin(Date.now() * 0.01)})`;
          ctx.fillRect(canvas.width / 2 - ctx.measureText(currentText).width / 2 + charWidth, line.y - 12, 2, 14);
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

