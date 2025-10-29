"use client";

import { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function RippleEchoesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const ripplesRef = useRef<Ripple[]>([]);
  const frameCountRef = useRef(0);

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

    function addRipple() {
      if (!canvas) return;
      
      ripplesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 0,
        maxRadius: 80 + Math.random() * 100,
        alpha: 1,
      });
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      // Add new ripple periodically
      if (frameCountRef.current % 45 === 0) {
        addRipple();
      }
      
      // Update and draw ripples
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        ripple.radius += 1.2;
        ripple.alpha -= 0.008;
        
        if (ripple.alpha <= 0 || ripple.radius > ripple.maxRadius) {
          return false;
        }
        
        // Draw multiple concentric rings per ripple
        for (let i = 0; i < 3; i++) {
          const r = ripple.radius - i * 8;
          if (r > 0) {
            const opacity = ripple.alpha * 0.15 * (1 - i * 0.3);
            
            // Dithered circle
            ctx.strokeStyle = `rgba(255, 224, 194, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, r, 0, Math.PI * 2);
            ctx.stroke();
            
            // Dots on circle
            if (i === 0) {
              const numDots = Math.floor(r / 12);
              for (let j = 0; j < numDots; j++) {
                if (j % 3 === 0) {
                  const angle = (j / numDots) * Math.PI * 2;
                  const dotX = ripple.x + Math.cos(angle) * r;
                  const dotY = ripple.y + Math.sin(angle) * r;
                  
                  ctx.fillStyle = `rgba(255, 224, 194, ${opacity * 1.5})`;
                  ctx.beginPath();
                  ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }
        
        return true;
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

