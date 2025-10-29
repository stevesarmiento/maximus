"use client";

import { useEffect, useRef } from 'react';

export function LiquidFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const leftLevelRef = useRef(0.7);
  const rightLevelRef = useRef(0.3);
  const flowDirectionRef = useRef(1);
  const timeRef = useRef(0);

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

    function drawContainer(x: number, width: number, height: number, level: number) {
      if (!ctx || !canvas) return;
      
      const containerHeight = height * 0.8;
      const containerY = (canvas.height - containerHeight) / 2;
      
      // Draw container outline
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x, containerY, width, containerHeight);
      
      // Draw liquid with dithered fill
      const liquidHeight = containerHeight * level;
      const liquidY = containerY + containerHeight - liquidHeight;
      
      // Dithered pattern
      const dotSize = 2;
      const spacing = 4;
      
      for (let dy = 0; dy < liquidHeight; dy += spacing) {
        for (let dx = 0; dx < width; dx += spacing) {
          if ((dx / spacing + dy / spacing) % 2 === 0) {
            const waveOffset = Math.sin((dx * 0.1) + timeRef.current * 2) * 2;
            const opacity = 0.15 + (dy / liquidHeight) * 0.1;
            ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
            ctx.fillRect(x + dx, liquidY + dy + waveOffset, dotSize, dotSize);
          }
        }
      }
      
      // Top wave line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.3)';
      ctx.lineWidth = 2;
      for (let dx = 0; dx <= width; dx += 2) {
        const waveY = liquidY + Math.sin((dx * 0.05) + timeRef.current * 2) * 3;
        if (dx === 0) {
          ctx.moveTo(x + dx, waveY);
        } else {
          ctx.lineTo(x + dx, waveY);
        }
      }
      ctx.stroke();
    }

    function drawFlowParticles(x1: number, y1: number, x2: number, y2: number, progress: number) {
      if (!ctx) return;
      
      const numParticles = 6;
      for (let i = 0; i < numParticles; i++) {
        const offset = i * 0.15;
        const t = (progress + offset) % 1;
        
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI * 2) * 8;
        
        const alpha = Math.sin(t * Math.PI) * 0.4;
        ctx.fillStyle = `rgba(255, 224, 194, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      timeRef.current += 0.02;
      
      const containerWidth = canvas.width * 0.25;
      const containerHeight = canvas.height;
      const leftX = canvas.width * 0.15;
      const rightX = canvas.width * 0.6;
      
      // Animate levels
      const flowSpeed = 0.003;
      if (flowDirectionRef.current === 1) {
        leftLevelRef.current -= flowSpeed;
        rightLevelRef.current += flowSpeed;
        
        if (leftLevelRef.current <= 0.2) {
          flowDirectionRef.current = -1;
        }
      } else {
        leftLevelRef.current += flowSpeed;
        rightLevelRef.current -= flowSpeed;
        
        if (leftLevelRef.current >= 0.8) {
          flowDirectionRef.current = 1;
        }
      }
      
      // Draw containers
      drawContainer(leftX, containerWidth, containerHeight, leftLevelRef.current);
      drawContainer(rightX, containerWidth, containerHeight, rightLevelRef.current);
      
      // Draw flow particles
      const flowY = canvas.height / 2;
      const flowStartX = leftX + containerWidth;
      const flowEndX = rightX;
      
      if (flowDirectionRef.current === 1) {
        drawFlowParticles(flowStartX, flowY, flowEndX, flowY, timeRef.current * 0.5);
      } else {
        drawFlowParticles(flowEndX, flowY, flowStartX, flowY, timeRef.current * 0.5);
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

