/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React from 'react';
import { EngineResult } from '../types';

interface AnalysisPanelProps {
  engineResult: EngineResult | null;
  isThinking: boolean;
  startMoveNum?: number;
  isWhiteTurn?: boolean;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  engineResult, isThinking, startMoveNum = 1, isWhiteTurn = true, showAnalysis, onToggleAnalysis 
}) => {

  const getEvalString = (score: number) => {
    const isMate = Math.abs(score) > 90000;
    if (isMate) {
      const dist = Math.floor((1000000 - Math.abs(score)) / 2) + 1;
      return score > 0 ? `M${dist}` : `-M${dist}`;
    }
    const cp = score / 100;
    return cp > 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);
  };

  const getEvalClass = (score: number) => {
    if (score > 150) return 'positive';
    if (score < -150) return 'negative';
    return 'neutral';
  };

  const formatPV = (pvMoves: string[], startNum: number, isWhiteStart: boolean): React.ReactNode[] => {
    if (!pvMoves || pvMoves.length === 0) return [];
    const nodes: React.ReactNode[] = [];
    let moveNum = startNum;
    let i = 0;

    if (!isWhiteStart) {
      nodes.push(
        <span key="num-first" className="pv-move-num">{moveNum}...</span>
      );
      nodes.push(
        <span key="move-0" className={`pv-move ${i === 0 ? 'pv-best-move' : ''}`}>{pvMoves[0]}</span>
      );
      i = 1;
      moveNum++;
    }

    while (i < pvMoves.length) {
      // White move
      nodes.push(
        <span key={`num-${moveNum}`} className="pv-move-num">{moveNum}.</span>
      );
      nodes.push(
        <span key={`w-${i}`} className={`pv-move ${i === 0 ? 'pv-best-move' : ''}`}>{pvMoves[i]}</span>
      );
      i++;
      // Black move
      if (i < pvMoves.length) {
        nodes.push(
          <span key={`b-${i}`} className={`pv-move`}>{pvMoves[i]}</span>
        );
        i++;
      }
      moveNum++;
    }
    return nodes;
  };

  const renderAnalysis = () => {
    if (!showAnalysis) return null;

    if (!engineResult) {
      return (
        <div className="analysis-content">
          <div className="analysis-loading">
            <span className="analysis-spinner">⟳</span>
            {isThinking ? 'Calculating position...' : 'Enable analysis above'}
          </div>
        </div>
      );
    }

    const { score, depth, pv } = engineResult;
    const evalStr = getEvalString(score);
    const evalClass = getEvalClass(score);
    const bestMove = pv && pv.length > 0 ? pv[0] : null;

    return (
      <div className="analysis-content">
        <div className="analysis-eval-row">
          <div className={`analysis-eval-badge ${evalClass}`}>
            {evalStr}
          </div>
          <div className="analysis-engine-meta">
            <span className="engine-name-label">Astra 1.0</span>
            <span className="engine-depth-label">depth {depth || '—'}</span>
          </div>
        </div>

        {bestMove && (
          <div className="analysis-best-move-row">
            <span className="best-move-label">Best:</span>
            <span className="best-move-san">{bestMove}</span>
          </div>
        )}

        {pv && pv.length > 0 && (
          <div className="analysis-pv-line">
            {formatPV(pv, startMoveNum, isWhiteTurn)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="analysis-panel">
      <div className="analysis-topbar">
        <div className="analysis-toggle-row">
          <label className="toggle-switch" title="Toggle position analysis">
            <input type="checkbox" checked={showAnalysis} onChange={onToggleAnalysis} />
            <span className="slider round"></span>
          </label>
          <span className="analysis-toggle-label">
            {showAnalysis ? 'Analysis ON' : 'Analysis'}
          </span>
        </div>
        {renderAnalysis()}
      </div>
    </div>
  );
};
