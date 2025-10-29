"use client";

import { useEffect, useRef } from 'react';

interface Note {
  lane: number;
  y: number;
  height: number;
  width: number;
  alpha: number;
}

export function PianoRollBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const notesRef = useRef<Note[]>([]);
  const frameCountRef = useRef(0);
  const scrollOffsetRef = useRef(0);

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

    const numLanes = 5;
    const laneWidth = () => canvas.width / numLanes;
    const playheadY = () => canvas.height * 0.4;

    function addNote() {
      if (!canvas) return;
      
      const lane = Math.floor(Math.random() * numLanes);
      const width = 0.7 + Math.random() * 0.25;
      const height = 20 + Math.random() * 40;
      
      notesRef.current.push({
        lane,
        y: canvas.height + height,
        height,
        width,
        alpha: 1,
      });
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      scrollOffsetRef.current += 1;
      
      // Add notes periodically
      if (frameCountRef.current % 25 === 0) {
        addNote();
      }
      
      // Draw lane dividers
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      
      for (let i = 1; i < numLanes; i++) {
        const x = (canvas.width / numLanes) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Draw playhead line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, playheadY());
      ctx.lineTo(canvas.width, playheadY());
      ctx.stroke();
      
      // Update and draw notes
      notesRef.current = notesRef.current.filter(note => {
        note.y -= 1.2;
        
        if (note.y < -note.height) {
          return false;
        }
        
        // Check if crossing playhead
        const isCrossingPlayhead = note.y < playheadY() && note.y + note.height > playheadY();
        
        const laneX = (laneWidth() * note.lane) + (laneWidth() * (1 - note.width)) / 2;
        const noteWidth = laneWidth() * note.width;
        
        // Draw note with dithered pattern
        const baseOpacity = 0.15;
        
        if (isCrossingPlayhead) {
          // Highlight when crossing playhead
          ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity * 2})`;
          ctx.fillRect(laneX, note.y, noteWidth, note.height);
          ctx.shadowBlur = 0;
        } else {
          // Normal note
          ctx.fillStyle = `rgba(255, 224, 194, ${baseOpacity})`;
          ctx.fillRect(laneX, note.y, noteWidth, note.height);
        }
        
        // Note border
        ctx.strokeStyle = `rgba(255, 224, 194, ${baseOpacity * 1.5})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(laneX, note.y, noteWidth, note.height);
        
        // Dithered dots inside
        const dotSpacing = 4;
        for (let dy = 0; dy < note.height; dy += dotSpacing) {
          for (let dx = 0; dx < noteWidth; dx += dotSpacing) {
            if ((dx / dotSpacing + dy / dotSpacing) % 2 === 0) {
              const dotOpacity = isCrossingPlayhead ? baseOpacity * 2.5 : baseOpacity * 0.8;
              ctx.fillStyle = `rgba(255, 224, 194, ${dotOpacity})`;
              ctx.fillRect(laneX + dx, note.y + dy, 1.5, 1.5);
            }
          }
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

