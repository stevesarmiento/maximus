"use client";

import { useEffect, useRef } from 'react';

const TOKENS = ['SOL', 'USDC', 'BONK', 'JUP'];

interface TokenGlyph {
  text: string;
  targetText: string;
  x: number;
  y: number;
  morphProgress: number;
  alpha: number;
}

export function MorphingTokensBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const glyphsRef = useRef<TokenGlyph[]>([]);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initGlyphs();
    };

    const initGlyphs = () => {
      glyphsRef.current = [];
      const spacing = canvas.width / 4;
      
      for (let i = 0; i < 3; i++) {
        glyphsRef.current.push({
          text: TOKENS[i % TOKENS.length],
          targetText: TOKENS[(i + 1) % TOKENS.length],
          x: spacing * (i + 1),
          y: canvas.height / 2,
          morphProgress: 0,
          alpha: 0.8,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      glyphsRef.current.forEach((glyph, i) => {
        glyph.morphProgress += 0.003;
        
        // Reset morph
        if (glyph.morphProgress >= 1.2) {
          glyph.morphProgress = 0;
          glyph.text = glyph.targetText;
          currentIndexRef.current = (currentIndexRef.current + 1) % TOKENS.length;
          glyph.targetText = TOKENS[(TOKENS.indexOf(glyph.text) + 1) % TOKENS.length];
        }
        
        // Calculate alpha based on morph progress
        let displayAlpha = glyph.alpha;
        if (glyph.morphProgress < 0.5) {
          displayAlpha = glyph.alpha * (1 - glyph.morphProgress * 2);
        } else {
          displayAlpha = glyph.alpha * ((glyph.morphProgress - 0.5) * 2);
        }
        
        // Draw current text
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dissolving effect
        const text = glyph.morphProgress < 0.5 ? glyph.text : glyph.targetText;
        
        // Draw with stipple effect
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (Math.random() > glyph.morphProgress) {
              ctx.fillStyle = `rgba(255, 224, 194, ${displayAlpha * 0.15})`;
              ctx.fillText(text, glyph.x + dx * 2, glyph.y + dy * 2);
            }
          }
        }
        
        // Main text
        ctx.fillStyle = `rgba(255, 224, 194, ${displayAlpha * 0.25})`;
        ctx.fillText(text, glyph.x, glyph.y);
        
        // Bridging particles during morph
        if (glyph.morphProgress > 0.3 && glyph.morphProgress < 0.7 && i < glyphsRef.current.length - 1) {
          const nextGlyph = glyphsRef.current[i + 1];
          const numBridgeParticles = 8;
          
          for (let j = 0; j < numBridgeParticles; j++) {
            const t = j / numBridgeParticles;
            const x = glyph.x + (nextGlyph.x - glyph.x) * t;
            const y = glyph.y + Math.sin(t * Math.PI) * 15;
            
            if (j % 2 === 0) {
              ctx.fillStyle = `rgba(255, 224, 194, ${0.2 * (1 - Math.abs(glyph.morphProgress - 0.5) * 2)})`;
              ctx.beginPath();
              ctx.arc(x, y, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
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

