/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React, { useRef, useEffect, useState } from 'react';

interface EvalBarProps {
  score: number;
  isFlipped?: boolean;
}

// Sigmoid mapping: centipawns → white percentage
// Uses sigmoid so ±200cp ≈ 60/40, ±800cp ≈ 85/15 — feels natural like Lichess
function cpToPercent(cp: number): number {
  // Sigmoid mapping — matches Lichess feel: ±200cp ≈ 60/40, ±800cp ≈ 85/15
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.006 * cp)) - 1);
  return Math.max(3, Math.min(97, pct));
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, isFlipped }) => {
  // Use a separate displayed score that animates smoothly
  const [displayScore, setDisplayScore] = useState(score);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(score);

  useEffect(() => {
    targetRef.current = score;

    // Smoothly animate displayScore toward score using lerp in rAF loop
    const animate = () => {
      setDisplayScore(prev => {
        const diff = targetRef.current - prev;
        if (Math.abs(diff) < 1) return targetRef.current;
        return prev + diff * 0.02; // Very slow and smooth lerp
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const whitePercent = cpToPercent(displayScore);
  const isMate = Math.abs(score) > 90000;
  const whiteWinning = score >= 0;

  const mateDist = isMate
    ? Math.max(1, Math.floor((1000000 - Math.abs(score)) / 2) + 1)
    : 0;

  const label = isMate
    ? (score > 0 ? `M${mateDist}` : `-M${mateDist}`)
    : (score > 0 ? `+${(score / 100).toFixed(1)}` : (score / 100).toFixed(1));

  return (
    <div className={`eval-bar ${isFlipped ? 'flipped' : ''}`} title={`Evaluation: ${label}`}>
      <div
        className="eval-bar-black"
        style={{ height: `${100 - whitePercent}%` }}
      >
        {!whiteWinning && (
          <span className={`eval-bar-score ${isFlipped ? 'bottom' : 'top'}`}>{isMate ? label : label.replace('-', '')}</span>
        )}
      </div>

      <div
        className="eval-bar-white"
        style={{ height: `${whitePercent}%` }}
      >
        {whiteWinning && (
          <span className={`eval-bar-score ${isFlipped ? 'top' : 'bottom'}`}>{label}</span>
        )}
      </div>
    </div>
  );
};