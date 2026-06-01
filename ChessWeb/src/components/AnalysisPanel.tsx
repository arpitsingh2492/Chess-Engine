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

    const { depth, variations } = engineResult;
    
    return (
      <div className="analysis-content">
        <div className="analysis-engine-meta">
          <span className="engine-name-label">Astra Engine</span>
          <span className="engine-depth-label">Depth {depth || '—'}</span>
        </div>
        
        {variations && variations.length > 0 ? (
          <div className="analysis-variations-list">
            {variations.map((v, idx) => {
              let scoreStr = '';
              if (v.score > 900000) {
                scoreStr = `M${999999 - v.score}`;
              } else if (v.score < -900000) {
                scoreStr = `-M${999999 + v.score}`;
              } else {
                const val = v.score / 100;
                scoreStr = (val > 0 ? '+' : '') + val.toFixed(2);
              }
              return (
                <div key={idx} className="analysis-variation-row">
                  <span className="analysis-var-score neu" style={{ width: '50px', display: 'inline-block' }}>{scoreStr}</span>
                  <span className="analysis-var-pv">{v.pv[0]}</span>
                </div>
              );
            })}
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
