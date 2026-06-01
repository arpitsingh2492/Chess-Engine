/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React from 'react';
import { GameHistoryEntry } from '../types';

interface EvalGraphProps {
  history: GameHistoryEntry[];
  evals: (number | null)[]; // Centipawns, positive for white advantage
  currentMoveIndex: number;
  onScrub: (index: number) => void;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({ history, evals, currentMoveIndex, onScrub }) => {
  const width = 1000;
  const height = 100;
  
  if (history.length === 0) {
    return <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No game data</div>;
  }

  // Convert evaluation scores into y-coordinates (0 to 100)
  // Max advantage displayed is +/- 1000 centipawns (or mate)
  const getY = (score: number | null) => {
    if (score === null) return height / 2; // neutral
    // Sigmoid curve to flatten massive scores
    const percent = (2 / (1 + Math.exp(-score / 250)) - 1);
    // mapped to 0 (white max) to 100 (black max)
    return height / 2 - (percent * height / 2);
  };

  const stepX = width / Math.max(1, history.length - 1);

  let pathData = `M 0,${height/2}`;
  
  evals.forEach((score, i) => {
    if (i >= history.length) return;
    const x = i * stepX;
    const y = getY(score);
    pathData += ` L ${x},${y}`;
  });

  // The base pathData is used for stroke.
  // The fill paths are constructed inline in the SVG below using pathData.

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // Only scrub if mouse is held down
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - bounds.left, bounds.width));
    const percent = x / bounds.width;
    const index = Math.round(percent * (history.length - 1));
    onScrub(index);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - bounds.left, bounds.width));
    const percent = x / bounds.width;
    const index = Math.round(percent * (history.length - 1));
    onScrub(index);
  };

  const cursorX = currentMoveIndex >= 0 ? currentMoveIndex * stepX : 0;

  return (
    <div style={{ padding: '10px 0' }}>
      <div 
        style={{ 
          width: '100%', 
          height: `${height}px`, 
          position: 'relative', 
          cursor: 'col-resize',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleClick}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          {/* Black advantage fill */}
          <path d={pathData + ` L ${(history.length-1)*stepX},0 L 0,0 Z`} fill="rgba(217,79,79,0.3)" />
          {/* White advantage fill */}
          <path d={pathData + ` L ${(history.length-1)*stepX},${height} L 0,${height} Z`} fill="rgba(98,153,36,0.3)" />
          
          {/* Zero line */}
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          
          {/* Plot line */}
          <path d={pathData} fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinejoin="round" />
          
          {/* Current move cursor */}
          {currentMoveIndex >= 0 && (
            <line 
              x1={cursorX} 
              y1="0" 
              x2={cursorX} 
              y2={height} 
              stroke="#fff" 
              strokeWidth="2" 
              style={{ filter: 'drop-shadow(0 0 2px #000)' }}
            />
          )}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
};
