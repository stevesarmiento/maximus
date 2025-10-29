"use client";

import { useEffect, useRef } from 'react';

export function PriceChartBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

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

    // Generate price data
    const points: { x: number; y: number; }[] = [];
    const numPoints = 60;
    let currentPrice = 50;
    
    for (let i = 0; i < numPoints; i++) {
      currentPrice += (Math.random() - 0.45) * 8;
      currentPrice = Math.max(20, Math.min(80, currentPrice));
      points.push({ x: i, y: currentPrice });
    }

    let offset = 0;

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const xStep = canvas.width / (numPoints - 1);
      const yScale = canvas.height / 100;
      
      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 175, 95, 0)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (i / 4) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Draw price line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.3)';
      ctx.lineWidth = 2;
      
      points.forEach((point, i) => {
        const x = (i * xStep) - offset;
        const y = canvas.height - (point.y * yScale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw fill
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(-offset, canvas.height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 224, 194, 0.01)';
      ctx.fill();
      
      offset += 0.5;
      if (offset > xStep) {
        offset = 0;
        // Shift data and add new point
        points.shift();
        let lastPrice = points[points.length - 1].y;
        lastPrice += (Math.random() - 0.45) * 8;
        lastPrice = Math.max(20, Math.min(80, lastPrice));
        points.push({ x: numPoints - 1, y: lastPrice });
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

