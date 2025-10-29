"use client";

import { useEffect, useRef } from 'react';

interface Layer {
  y: number;
  height: number;
  density: number;
  age: number;
}

export function SedimentLayersBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const layersRef = useRef<Layer[]>([]);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initLayers();
    };

    const initLayers = () => {
      layersRef.current = [];
      const numLayers = 12;
      let currentY = canvas.height;
      
      for (let i = 0; i < numLayers; i++) {
        const height = 15 + Math.random() * 25;
        currentY -= height;
        layersRef.current.push({
          y: currentY,
          height: height,
          density: 0.3 + Math.random() * 0.4,
          age: i,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    function drawLayer(layer: Layer) {
      if (!ctx || !canvas) return;
      
      // Fade based on age (older = more faded)
      const ageFade = Math.max(0.2, 1 - (layer.age / 15));
      const baseOpacity = 0.12 * ageFade;
      
      // Draw horizontal line at top of layer
      ctx.strokeStyle = `rgba(255, 224, 194, ${baseOpacity * 1.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, layer.y);
      ctx.lineTo(canvas.width, layer.y);
      ctx.stroke();
      
      // Dithered/stippled fill
      const dotSize = 1.5;
      const spacing = 4;
      
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < layer.height; y += spacing) {
          if (Math.random() < layer.density) {
            const opacity = baseOpacity * (0.8 + Math.random() * 0.4);
            ctx.fillStyle = `rgba(255, 224, 194, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, layer.y + y, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      // Add new layer periodically
      if (frameCountRef.current % 120 === 0) {
        // Age all layers
        layersRef.current.forEach(layer => layer.age++);
        
        // Remove old layers
        layersRef.current = layersRef.current.filter(layer => layer.age < 15);
        
        // Add new layer at bottom
        const height = 15 + Math.random() * 25;
        layersRef.current.push({
          y: canvas.height - height,
          height: height,
          density: 0.3 + Math.random() * 0.4,
          age: 0,
        });
        
        // Shift all layers up
        layersRef.current.forEach(layer => {
          layer.y -= height;
        });
      }
      
      // Draw layers
      layersRef.current.forEach(layer => {
        drawLayer(layer);
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

