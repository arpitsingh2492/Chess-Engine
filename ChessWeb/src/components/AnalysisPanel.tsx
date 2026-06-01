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
  engineResult, isThinking, showAnalysis, onToggleAnalysis 
}) => {

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

    const { pv } = engineResult;
    const bestMove = pv && pv.length > 0 ? pv[0] : null;
    return (
      <div className="analysis-content">
        {bestMove ? (
          <div className="analysis-best-move-row">
            <span className="best-move-label">Best Move:</span>
            <span className="best-move-san">{bestMove}</span>
          </div>
        ) : (
          <div className="analysis-loading">
            <span className="analysis-spinner">⟳</span>
            {isThinking ? 'Analyzing...' : 'Ready'}
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
