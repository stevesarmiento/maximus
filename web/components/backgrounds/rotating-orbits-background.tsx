"use client";

import { useEffect, useRef } from 'react';

interface Orbit {
  radius: number;
  rotation: number;
  speed: number;
  dashPattern: number[];
}

export function RotatingOrbitsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const orbitsRef = useRef<Orbit[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initOrbits();
    };

    const initOrbits = () => {
      orbitsRef.current = [];
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;
      const numOrbits = 5;
      
      for (let i = 0; i < numOrbits; i++) {
        const radiusFactor = (i + 1) / numOrbits;
        orbitsRef.current.push({
          radius: maxRadius * radiusFactor,
          rotation: Math.random() * Math.PI * 2,
          speed: (0.002 + Math.random() * 0.003) * (i % 2 === 0 ? 1 : -1),
          dashPattern: [4, 8, 2, 8],
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function drawDitheredOrbit(orbit: Orbit, centerX: number, centerY: number) {
      if (!ctx) return;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(orbit.rotation);
      
      // Draw dithered circle using dash pattern
      ctx.setLineDash(orbit.dashPattern);
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, orbit.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw dots at cardinal points
      const numDots = 8;
      for (let i = 0; i < numDots; i++) {
        const angle = (i / numDots) * Math.PI * 2;
        const x = Math.cos(angle) * orbit.radius;
        const y = Math.sin(angle) * orbit.radius;
        
        // Dithered dots - only draw some of them
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 224, 194, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.restore();
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Update and draw orbits
      orbitsRef.current.forEach(orbit => {
        orbit.rotation += orbit.speed;
        drawDitheredOrbit(orbit, centerX, centerY);
      });
      
      // Draw center dot
      ctx.fillStyle = 'rgba(255, 224, 194, 0.4)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
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

