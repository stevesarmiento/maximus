"use client";

import { useEffect, useRef } from 'react';

interface Scanline {
  radius: number;
  alpha: number;
  speed: number;
}

export function RadialScanlinesBackground() {
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
    };
    resize();
    window.addEventListener('resize', resize);

    function addScanline() {
      scanlinesRef.current.push({
        radius: 0,
        alpha: 1,
        speed: 1.5 + Math.random() * 0.5,
      });
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.hypot(canvas.width, canvas.height);
      
      // Add new scanline periodically
      frameCountRef.current++;
      if (frameCountRef.current % 60 === 0) {
        addScanline();
      }
      
      // Update and draw scanlines
      scanlinesRef.current = scanlinesRef.current.filter(scanline => {
        scanline.radius += scanline.speed;
        scanline.alpha -= 0.008;
        
        if (scanline.alpha <= 0 || scanline.radius > maxRadius) {
          return false;
        }
        
        // Draw dithered scanline
        ctx.strokeStyle = `rgba(255, 224, 194, ${scanline.alpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, scanline.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw secondary faint line
        ctx.strokeStyle = `rgba(255, 224, 194, ${scanline.alpha * 0.15})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, scanline.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw dots on scanline
        const numDots = Math.floor(scanline.radius / 15);
        for (let i = 0; i < numDots; i++) {
          const angle = (i / numDots) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * scanline.radius;
          const y = centerY + Math.sin(angle) * scanline.radius;
          
          if (i % 3 === 0) {
            ctx.fillStyle = `rgba(255, 224, 194, ${scanline.alpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        return true;
      });
      
      // Draw center point
      ctx.fillStyle = 'rgba(255, 224, 194, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw center pulse ring
      const pulseRadius = 15 + Math.sin(frameCountRef.current * 0.05) * 5;
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
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

