"use client";

import { useEffect, useRef } from 'react';

interface Orbiter {
  angle: number;
  speed: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
}

export function OrbitalExchangeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const orbitersRef = useRef<Orbiter[]>([]);

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

    // Initialize two orbiting objects
    orbitersRef.current = [
      {
        angle: 0,
        speed: 0.02,
        radius: Math.min(canvas.width, canvas.height) * 0.25,
        trail: [],
      },
      {
        angle: Math.PI,
        speed: 0.02,
        radius: Math.min(canvas.width, canvas.height) * 0.25,
        trail: [],
      },
    ];

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw orbit path
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbitersRef.current[0].radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Update and draw orbiters
      orbitersRef.current.forEach((orbiter, i) => {
        orbiter.angle += orbiter.speed;
        
        const x = centerX + Math.cos(orbiter.angle) * orbiter.radius;
        const y = centerY + Math.sin(orbiter.angle) * orbiter.radius;
        
        // Add to trail
        orbiter.trail.push({ x, y, alpha: 1 });
        if (orbiter.trail.length > 20) orbiter.trail.shift();
        
        // Draw trail
        orbiter.trail.forEach((point, idx) => {
          const alpha = (idx / orbiter.trail.length) * 0.2;
          ctx.fillStyle = `rgba(255, 224, 194, ${alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Draw orbiter
        ctx.fillStyle = 'rgba(255, 224, 194, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowColor = 'rgba(255, 224, 194, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(255, 224, 194, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      // Check if orbiters are near each other (exchange point)
      const dist = Math.abs(orbitersRef.current[0].angle - orbitersRef.current[1].angle);
      const isNear = Math.min(dist, Math.PI * 2 - dist) < 0.3;
      
      if (isNear) {
        // Draw connection flash
        const x1 = centerX + Math.cos(orbitersRef.current[0].angle) * orbitersRef.current[0].radius;
        const y1 = centerY + Math.sin(orbitersRef.current[0].angle) * orbitersRef.current[0].radius;
        const x2 = centerX + Math.cos(orbitersRef.current[1].angle) * orbitersRef.current[1].radius;
        const y2 = centerY + Math.sin(orbitersRef.current[1].angle) * orbitersRef.current[1].radius;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - Math.abs(dist - 0.15) / 0.15)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Exchange burst
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Draw center point
      ctx.fillStyle = 'rgba(255, 224, 194, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
      
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

