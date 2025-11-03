"use client";

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  connections: Node[];
  highlight: number;
}

interface Pulse {
  startNode: Node;
  endNode: Node;
  progress: number;
  speed: number;
  midX: number;
  midY: number;
  hopsRemaining: number;
}

export function CircuitTracesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initNodes();
    };

    const initNodes = () => {
      nodesRef.current = [];
      const gridSize = 60;
      const cols = Math.floor(canvas.width / gridSize);
      const rows = Math.floor(canvas.height / gridSize);
      
      // Create grid of nodes
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          nodesRef.current.push({
            x: i * gridSize + gridSize / 2,
            y: j * gridSize + gridSize / 2,
            connections: [],
            highlight: 0,
          });
        }
      }
      
      // Create connections (right-angle paths like circuit traces)
      nodesRef.current.forEach(node => {
        const nearby = nodesRef.current.filter(other => {
          const dx = Math.abs(node.x - other.x);
          const dy = Math.abs(node.y - other.y);
          return (dx < gridSize * 1.5 && dy < gridSize * 1.5) && node !== other;
        });
        
        // Connect to 1-2 nearby nodes
        const numConnections = Math.random() > 0.5 ? 1 : 2;
        for (let i = 0; i < numConnections && nearby.length > 0; i++) {
          const target = nearby[Math.floor(Math.random() * nearby.length)];
          if (!node.connections.includes(target)) {
            node.connections.push(target);
          }
        }
      });
    };

    resize();
    window.addEventListener('resize', resize);

    function startNewPulse() {
      if (nodesRef.current.length === 0) return;
      
      const startNode = nodesRef.current[Math.floor(Math.random() * nodesRef.current.length)];
      if (startNode.connections.length === 0) return;
      
      const endNode = startNode.connections[Math.floor(Math.random() * startNode.connections.length)];
      
      // Calculate midpoint for right-angle path
      const midX = Math.random() > 0.5 ? endNode.x : startNode.x;
      const midY = midX === endNode.x ? startNode.y : endNode.y;
      
      // Random hops: 1 or 2
      const hops = Math.random() > 0.5 ? 2 : 1;
      
      pulsesRef.current.push({
        startNode,
        endNode,
        progress: 0,
        speed: 0.015 + Math.random() * 0.01,
        midX,
        midY,
        hopsRemaining: hops,
      });
    }

    function drawRightAnglePath(x1: number, y1: number, x2: number, y2: number, alpha: number, midX: number, midY: number) {
      if (!ctx) return;
      
      // Draw path with right angles
      ctx.strokeStyle = `rgba(255, 224, 194, ${alpha * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Add dithered dots along the path
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        if (i % 2 === 0) {
          const t = i / steps;
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          
          ctx.fillStyle = `rgba(255, 224, 194, ${alpha * 0.15})`;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawNode(node: Node) {
      if (!ctx) return;
      
      const isHighlighted = node.highlight > 0;
      const padSize = 4;
      
      if (isHighlighted) {
        // White glow when highlighted
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(255, 255, 255, ${node.highlight})`;
        ctx.fillRect(node.x - padSize / 2, node.y - padSize / 2, padSize, padSize);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${node.highlight * 0.9})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Decay highlight
        node.highlight -= 0.05;
        if (node.highlight < 0) node.highlight = 0;
      } else {
        // Normal state
        ctx.fillStyle = 'rgba(255, 224, 194, 0.25)';
        ctx.fillRect(node.x - padSize / 2, node.y - padSize / 2, padSize, padSize);
        
        ctx.fillStyle = 'rgba(255, 224, 194, 0.4)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Dithered corners on pad
        ctx.fillStyle = 'rgba(255, 224, 194, 0.15)';
        ctx.fillRect(node.x - padSize / 2 - 1, node.y - padSize / 2 - 1, 1, 1);
        ctx.fillRect(node.x + padSize / 2, node.y - padSize / 2 - 1, 1, 1);
        ctx.fillRect(node.x - padSize / 2 - 1, node.y + padSize / 2, 1, 1);
        ctx.fillRect(node.x + padSize / 2, node.y + padSize / 2, 1, 1);
      }
    }

    function drawPulse(pulse: Pulse) {
      if (!ctx) return;
      
      const { startNode, endNode, progress, midX, midY } = pulse;
      
      // Calculate position along path
      let x, y;
      if (progress < 0.5) {
        // First segment: start to mid
        const t = progress * 2;
        x = startNode.x + (midX - startNode.x) * t;
        y = startNode.y + (midY - startNode.y) * t;
      } else {
        // Second segment: mid to end
        const t = (progress - 0.5) * 2;
        x = midX + (endNode.x - midX) * t;
        y = midY + (endNode.y - midY) * t;
      }
      
      // Draw pulse with glow
      ctx.shadowColor = 'rgba(255, 224, 194, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255, 224, 194, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw trail
      for (let i = 1; i <= 3; i++) {
        const trailProgress = Math.max(0, progress - i * 0.02);
        let tx, ty;
        
        if (trailProgress < 0.5) {
          const t = trailProgress * 2;
          tx = startNode.x + (midX - startNode.x) * t;
          ty = startNode.y + (midY - startNode.y) * t;
        } else {
          const t = (trailProgress - 0.5) * 2;
          tx = midX + (endNode.x - midX) * t;
          ty = midY + (endNode.y - midY) * t;
        }
        
        const alpha = 0.4 - i * 0.1;
        ctx.fillStyle = `rgba(255, 224, 194, ${alpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate() {
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      frameCountRef.current++;
      
      // Add new pulse only if we have less than 2 active pulses
      if (pulsesRef.current.length < 2 && frameCountRef.current % 60 === 0 && Math.random() > 0.3) {
        startNewPulse();
      }
      
      // Draw traces
      nodesRef.current.forEach(node => {
        node.connections.forEach(target => {
          const midX = Math.random() > 0.5 ? target.x : node.x;
          const midY = midX === target.x ? node.y : target.y;
          drawRightAnglePath(node.x, node.y, target.x, target.y, 0.7, midX, midY);
        });
      });
      
      // Update and draw pulses
      pulsesRef.current = pulsesRef.current.filter(pulse => {
        pulse.progress += pulse.speed;
        
        // Pulse reached destination
        if (pulse.progress >= 1) {
          // Highlight the end node
          pulse.endNode.highlight = 1;
          pulse.hopsRemaining--;
          
          // Check if pulse should continue to next node
          if (pulse.hopsRemaining > 0 && pulse.endNode.connections.length > 0) {
            const nextNode = pulse.endNode.connections[Math.floor(Math.random() * pulse.endNode.connections.length)];
            const newMidX = Math.random() > 0.5 ? nextNode.x : pulse.endNode.x;
            const newMidY = newMidX === nextNode.x ? pulse.endNode.y : nextNode.y;
            
            pulse.startNode = pulse.endNode;
            pulse.endNode = nextNode;
            pulse.progress = 0;
            pulse.midX = newMidX;
            pulse.midY = newMidY;
            return true;
          }
          
          // No more hops - remove pulse
          return false;
        }
        
        drawPulse(pulse);
        return true;
      });
      
      // Draw nodes
      nodesRef.current.forEach(node => {
        drawNode(node);
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

