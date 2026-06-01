import React, { useEffect, useRef } from 'react';
import { GameHistoryEntry } from '../types';

interface MoveHistoryProps {
  history: GameHistoryEntry[];
  currentMoveIndex: number;
  analysisEvals?: (number | null)[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history, currentMoveIndex, analysisEvals }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history.length]);

  const pairs: { 
    index: number; 
    white: string; 
    black?: string; 
    whiteIdx: number; 
    blackIdx: number;
    whiteEval?: number | null;
    blackEval?: number | null;
  }[] = [];
  
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      index: Math.floor(i / 2) + 1,
      white: history[i].san,
      black: history[i + 1]?.san,
      whiteIdx: i,
      blackIdx: i + 1,
      whiteEval: analysisEvals ? analysisEvals[i] : undefined,
      blackEval: analysisEvals ? analysisEvals[i + 1] : undefined
    });
  }

  const formatEval = (score: number | null | undefined) => {
    if (score === undefined || score === null) return null;
    const isMate = Math.abs(score) > 90000;
    const mateDist = Math.floor((1000000 - Math.abs(score)) / 2) + 1;
    
    if (isMate) {
      return score > 0 ? `+M${mateDist}` : `-M${mateDist}`;
    }
    const evalStr = (score / 100).toFixed(1);
    return score > 0 ? `+${evalStr}` : evalStr;
  };

  return (
    <div className="moves-table" ref={containerRef} style={{ height: '100%', overflowY: 'auto' }}>
      {pairs.length === 0 ? (
        <div className="moves-empty">No moves yet</div>
      ) : (
        pairs.map(pair => (
          <div className="move-row" key={pair.index}>
            <div className="move-num">{pair.index}.</div>
            <div className={`move-cell ${currentMoveIndex === pair.whiteIdx ? 'current' : ''}`}>
              <span>{pair.white}</span>
              {pair.whiteEval !== undefined && pair.whiteEval !== null && (
                <span className="move-eval">{formatEval(pair.whiteEval)}</span>
              )}
            </div>
            <div className={`move-cell ${currentMoveIndex === pair.blackIdx ? 'current' : ''}`}>
              <span>{pair.black || ''}</span>
              {pair.black && pair.blackEval !== undefined && pair.blackEval !== null && (
                <span className="move-eval">{formatEval(pair.blackEval)}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
