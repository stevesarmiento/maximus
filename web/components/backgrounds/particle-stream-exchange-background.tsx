"use client";

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  isSwapping: boolean;
  swapProgress: number;
  targetX: number;
}

export function ParticleStreamExchangeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      const numParticles = 40;
      
      for (let i = 0; i < numParticles; i++) {
        const isLeftStream = i < numParticles / 2;
        particlesRef.current.push({
          x: isLeftStream ? canvas.width * 0.3 : canvas.width * 0.7,
          y: Math.random() * canvas.height,
          vy: isLeftStream ? -1 : 1,
          alpha: 0.3 + Math.random() * 0.4,
          isSwapping: false,
          swapProgress: 0,
          targetX: isLeftStream ? canvas.width * 0.7 : canvas.width * 0.3,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach(particle => {
        if (!particle.isSwapping) {
          // Normal vertical movement
          particle.y += particle.vy;
          
          // Wrap around
          if (particle.y < -10) particle.y = canvas.height + 10;
          if (particle.y > canvas.height + 10) particle.y = -10;
          
          // Random chance to swap
          if (Math.random() > 0.99) {
            particle.isSwapping = true;
            particle.swapProgress = 0;
          }
        } else {
          // Swapping - move horizontally
          particle.swapProgress += 0.02;
          
          const startX = particle.x;
          particle.x = startX + (particle.targetX - startX) * Math.min(1, particle.swapProgress);
          
          // Continue vertical movement during swap
          particle.y += particle.vy * 0.5;
          
          // Complete swap
          if (particle.swapProgress >= 1) {
            particle.isSwapping = false;
            particle.vy *= -1;
            particle.targetX = particle.targetX === canvas.width * 0.3 ? canvas.width * 0.7 : canvas.width * 0.3;
          }
        }
        
        // Draw particle
        const size = particle.isSwapping ? 2.5 : 1.5;
        const alpha = particle.isSwapping ? particle.alpha * 1.3 : particle.alpha;
        
        ctx.fillStyle = `rgba(255, 224, 194, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow for swapping particles
        if (particle.isSwapping) {
          ctx.shadowColor = 'rgba(255, 224, 194, 0.5)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = `rgba(255, 224, 194, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      
      // Draw stream center lines
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.3, 0);
      ctx.lineTo(canvas.width * 0.3, canvas.height);
      ctx.moveTo(canvas.width * 0.7, 0);
      ctx.lineTo(canvas.width * 0.7, canvas.height);
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

