"use client";

import { useEffect, useRef } from 'react';

interface Line {
  offset: number;
  frequency: number;
  amplitude: number;
  verticalOffset: number;
  color: string;
}

interface Dot {
  x: number;
  y: number;
  alpha: number;
  fadeRate: number;
}

export function SignalsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const dotsRef = useRef<Dot[]>([]);

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

    // Define 3 moving average lines
    const lines: Line[] = [
      {
        offset: 0,
        frequency: 0.008,
        amplitude: 30,
        verticalOffset: 0.35,
        color: 'rgba(255, 224, 194, 0.3)',
      },
      {
        offset: Math.PI * 0.5,
        frequency: 0.012,
        amplitude: 25,
        verticalOffset: 0.5,
        color: 'rgba(255, 224, 194, 0.25)',
      },
      {
        offset: Math.PI,
        frequency: 0.01,
        amplitude: 28,
        verticalOffset: 0.65,
        color: 'rgba(255, 224, 194, 0.28)',
      },
    ];

    function getLineY(line: Line, x: number, time: number): number {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      
      const wave = Math.sin(x * line.frequency + time * 0.001 + line.offset) * line.amplitude;
      return canvas.height * line.verticalOffset + wave;
    }

    function checkIntersection(
      x1: number, y1: number, x2: number, y2: number,
      x3: number, y3: number, x4: number, y4: number
    ): { x: number; y: number } | null {
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 0.001) return null;

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
          x: x1 + t * (x2 - x1),
          y: y1 + t * (y2 - y1),
        };
      }
      return null;
    }

    function detectCrossovers(time: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const step = 10;
      const newDots: Dot[] = [];

      for (let i = 0; i < lines.length - 1; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const line1 = lines[i];
          const line2 = lines[j];

          for (let x = 0; x < canvas.width - step; x += step) {
            const x1 = x;
            const y1_1 = getLineY(line1, x1, time);
            const y1_2 = getLineY(line2, x1, time);

            const x2 = x + step;
            const y2_1 = getLineY(line1, x2, time);
            const y2_2 = getLineY(line2, x2, time);

            const intersection = checkIntersection(x1, y1_1, x2, y2_1, x1, y1_2, x2, y2_2);

            if (intersection) {
              // Check if there's already a dot near this position
              const existingDot = dotsRef.current.find(
                d => Math.abs(d.x - intersection.x) < 50 && Math.abs(d.y - intersection.y) < 50
              );

              if (!existingDot) {
                newDots.push({
                  x: intersection.x,
                  y: intersection.y,
                  alpha: 0.6,
                  fadeRate: 0.008,
                });
              }
            }
          }
        }
      }

      dotsRef.current.push(...newDots);
    }

    function animate() {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) return;

      timeRef.current += 16;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw lines
      lines.forEach(line => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;

        for (let x = 0; x <= canvas.width; x += 2) {
          const y = getLineY(line, x, timeRef.current);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Detect crossovers every 30 frames (~500ms)
      if (timeRef.current % 500 < 20) {
        detectCrossovers(timeRef.current);
      }

      // Draw and update dots
      dotsRef.current = dotsRef.current.filter(dot => {
        if (dot.alpha <= 0) return false;

        // Draw dot with glow
        const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 8);
        gradient.addColorStop(0, `rgba(255, 224, 194, ${dot.alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 224, 194, ${dot.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 224, 194, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright dot
        ctx.fillStyle = `rgba(255, 224, 194, ${dot.alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Fade out
        dot.alpha -= dot.fadeRate;
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

