"use client";

import { useEffect, useRef } from 'react';

interface SpiralPoint {
  angle: number;
  radius: number;
  alpha: number;
  age: number;
}

export function TimeSpiralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointsRef = useRef<SpiralPoint[]>([]);
  const rotationRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initSpiral();
    };

    const initSpiral = () => {
      pointsRef.current = [];
      const numPoints = 40;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
      
      for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints;
        const angle = t * Math.PI * 6; // 3 full rotations
        const radius = t * maxRadius;
        
        pointsRef.current.push({
          angle,
          radius,
          alpha: 1 - t * 0.8,
          age: i,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      rotationRef.current += 0.003;
      frameCountRef.current++;
      
      // Draw spiral path
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      
      pointsRef.current.forEach((point, idx) => {
        const angle = point.angle + rotationRef.current;
        const x = centerX + Math.cos(angle) * point.radius;
        const y = centerY + Math.sin(angle) * point.radius;
        
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Add new point periodically
      if (frameCountRef.current % 30 === 0) {
        // Age all points
        pointsRef.current.forEach(p => {
          p.age++;
          p.alpha -= 0.02;
        });
        
        // Remove old points
        pointsRef.current = pointsRef.current.filter(p => p.alpha > 0);
        
        // Add new point at center
        if (pointsRef.current.length < 50) {
          pointsRef.current.unshift({
            angle: 0,
            radius: 0,
            alpha: 1,
            age: 0,
          });
          
          // Update positions
          pointsRef.current.forEach((p, i) => {
            const t = i / 50;
            p.angle = t * Math.PI * 6;
            p.radius = t * Math.min(canvas.width, canvas.height) * 0.4;
          });
        }
      }
      
      // Draw points on spiral
      pointsRef.current.forEach((point, idx) => {
        const angle = point.angle + rotationRef.current;
        const x = centerX + Math.cos(angle) * point.radius;
        const y = centerY + Math.sin(angle) * point.radius;
        
        const opacity = point.alpha * 0.3;
        const size = idx === 0 ? 3 : (1.5 + (1 - point.alpha) * 1);
        
        // Glow for recent points
        if (idx < 5) {
          ctx.shadowColor = 'rgba(255, 224, 194, 0.5)';
          ctx.shadowBlur = 4;
        }
        
        ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      });
      
      // Draw center point
      ctx.fillStyle = 'rgba(255, 224, 194, 0.4)';
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

