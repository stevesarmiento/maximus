"use client";

import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Triangle {
  p1: Point;
  p2: Point;
  p3: Point;
}

export function DitheredTriangulationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initPoints();
    };

    const initPoints = () => {
      pointsRef.current = [];
      const numPoints = 15;
      
      for (let i = 0; i < numPoints; i++) {
        pointsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function getTriangles(): Triangle[] {
      const points = pointsRef.current;
      const triangles: Triangle[] = [];
      
      // Simple triangulation - connect nearby points
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          for (let k = j + 1; k < points.length; k++) {
            const dist1 = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            const dist2 = Math.hypot(points[j].x - points[k].x, points[j].y - points[k].y);
            const dist3 = Math.hypot(points[k].x - points[i].x, points[k].y - points[i].y);
            
            if (dist1 < 200 && dist2 < 200 && dist3 < 200) {
              triangles.push({
                p1: points[i],
                p2: points[j],
                p3: points[k],
              });
            }
          }
        }
      }
      
      return triangles;
    }

    function drawDitheredTriangle(tri: Triangle) {
      if (!ctx) return;
      
      // Draw triangle outline
      ctx.beginPath();
      ctx.moveTo(tri.p1.x, tri.p1.y);
      ctx.lineTo(tri.p2.x, tri.p2.y);
      ctx.lineTo(tri.p3.x, tri.p3.y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      
      // Dithered fill with random dots
      const numDots = 8;
      for (let i = 0; i < numDots; i++) {
        const r1 = Math.random();
        const r2 = Math.random();
        const sqrtR1 = Math.sqrt(r1);
        
        const x = (1 - sqrtR1) * tri.p1.x + sqrtR1 * (1 - r2) * tri.p2.x + sqrtR1 * r2 * tri.p3.x;
        const y = (1 - sqrtR1) * tri.p1.y + sqrtR1 * (1 - r2) * tri.p2.y + sqrtR1 * r2 * tri.p3.y;
        
        ctx.fillStyle = 'rgba(255, 224, 194, 0.2)';
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update points
      pointsRef.current.forEach(point => {
        point.x += point.vx;
        point.y += point.vy;
        
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1;
      });
      
      // Draw triangles
      const triangles = getTriangles();
      triangles.forEach(tri => drawDitheredTriangle(tri));
      
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

