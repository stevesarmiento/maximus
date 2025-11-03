"use client";

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  age: number;
}

export function DecayParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
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

    function addParticle() {
      if (!canvas) return;
      
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.5,
        alpha: 1,
        size: 2 + Math.random() * 2,
        age: 0,
      });
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      // Add new particles
      if (frameCountRef.current % 8 === 0) {
        addParticle();
      }
      
      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.age++;
        particle.alpha -= 0.005;
        
        // Slow down over time
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        
        if (particle.alpha <= 0 || particle.y < -10) {
          return false;
        }
        
        // Opacity based on age (brightest at bottom, faded at top)
        const positionFade = 1 - (canvas.height - particle.y) / canvas.height;
        const opacity = particle.alpha * 0.25 * (0.3 + positionFade * 0.7);
        
        // Draw particle
        ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Dithered trail
        if (particle.age % 3 === 0) {
          ctx.fillStyle = `rgba(255, 224, 194, ${opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y + 5, particle.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
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

