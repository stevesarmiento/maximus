"use client";

import { useEffect, useRef } from 'react';

const GLITCH_TEXT = 'ENCRYPTED • SECURE • DELEGATE • PROTECTED';

export function CyberpunkGlitchTextBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const glitchIntensityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Random glitch triggers
      if (Math.random() > 0.97) {
        glitchIntensityRef.current = 1;
      } else {
        glitchIntensityRef.current *= 0.9;
      }
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // RGB split effect
      const offset = glitchIntensityRef.current * 5;
      
      // Red channel (shifted left)
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255, 100, 100, ${0.1 + glitchIntensityRef.current * 0.1})`;
      ctx.fillText(GLITCH_TEXT, centerX - offset, centerY);
      
      // Green channel (shifted right)
      ctx.fillStyle = `rgba(100, 255, 100, ${0.1 + glitchIntensityRef.current * 0.1})`;
      ctx.fillText(GLITCH_TEXT, centerX + offset, centerY);
      
      // Blue channel (main)
      ctx.fillStyle = `rgba(255, 224, 194, ${0.15 + glitchIntensityRef.current * 0.15})`;
      ctx.fillText(GLITCH_TEXT, centerX, centerY);
      
      ctx.globalCompositeOperation = 'source-over';
      
      // Scanline effect
      if (glitchIntensityRef.current > 0.5) {
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillStyle = 'rgba(255, 224, 194, 0.02)';
          ctx.fillRect(0, y, canvas.width, 2);
        }
      }
      
      // Random horizontal displacement
      if (glitchIntensityRef.current > 0.7) {
        ctx.fillStyle = `rgba(255, 224, 194, 0.1)`;
        const sliceY = centerY + (Math.random() - 0.5) * 40;
        ctx.fillRect(0, sliceY, canvas.width, 3);
      }
      
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

