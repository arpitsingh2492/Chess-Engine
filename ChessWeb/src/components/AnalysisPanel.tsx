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

  const getEvalString = (score: number) => {
    const isMate = Math.abs(score) > 90000;
    if (isMate) {
      const dist = Math.floor((1000000 - Math.abs(score)) / 2) + 1;
      return score > 0 ? `M${dist}` : `-M${dist}`;
    }
    const cp = score / 100;
    return cp > 0 ? `+${cp.toFixed(2)}` : cp.toFixed(2);
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

    const { depth, variations } = engineResult;
    
    return (
      <div className="analysis-content">
        <div className="analysis-engine-meta">
          <span className="engine-name-label">Astra Engine</span>
          <span className="engine-depth-label">Depth {depth || '—'}</span>
        </div>
        
        {variations && variations.length > 0 ? (
          <div className="analysis-variations-list">
            {variations.map((v, idx) => (
              <div key={idx} className="analysis-variation-row">
                <span className={`analysis-var-score ${v.score > 0 ? 'pos' : v.score < 0 ? 'neg' : 'neu'}`}>
                  {getEvalString(v.score)}
                </span>
                <span className="analysis-var-pv">{v.pv.slice(0, 6).join(' ')}</span>
              </div>
            ))}
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
