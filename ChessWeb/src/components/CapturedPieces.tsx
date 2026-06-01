import React from 'react';
import { Piece } from '../types';

interface CapturedPiecesProps {
  squares: number[];
  forColor: 'white' | 'black'; // Whose captures we are showing
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ squares, forColor }) => {
  // Original starting counts
  const startCounts = {
    [Piece.Pawn]: 8,
    [Piece.Knight]: 2,
    [Piece.Bishop]: 2,
    [Piece.Rook]: 2,
    [Piece.Queen]: 1
  };

  const values = {
    [Piece.Pawn]: 1,
    [Piece.Knight]: 3,
    [Piece.Bishop]: 3,
    [Piece.Rook]: 5,
    [Piece.Queen]: 9
  };

  // Unicode icons for captured display
  const symbols: Record<number, string> = {
    [Piece.Pawn]: '♟',
    [Piece.Knight]: '♞',
    [Piece.Bishop]: '♝',
    [Piece.Rook]: '♜',
    [Piece.Queen]: '♛'
  };

  // Count current pieces on board
  const currentCounts = {
    white: { [Piece.Pawn]: 0, [Piece.Knight]: 0, [Piece.Bishop]: 0, [Piece.Rook]: 0, [Piece.Queen]: 0 },
    black: { [Piece.Pawn]: 0, [Piece.Knight]: 0, [Piece.Bishop]: 0, [Piece.Rook]: 0, [Piece.Queen]: 0 }
  };

  for (const piece of squares) {
    if (piece === Piece.Empty) continue;
    const type = Piece.getPieceType(piece);
    if (type === Piece.King) continue;

    const isWhite = Piece.isWhite(piece);
    const side = isWhite ? 'white' : 'black';
    
    if (type in currentCounts[side]) {
      currentCounts[side][type as keyof typeof startCounts]++;
    }
  }

  // Calculate captured count
  // If showing captures 'for' White, it means we are showing what White captured (which are Black's captured pieces!)
  // If showing captures 'for' Black, it means we are showing what Black captured (which are White's captured pieces!)
  const targetSide = forColor === 'white' ? 'black' : 'white';
  const opponentSide = forColor === 'white' ? 'white' : 'black';

  const captured: { type: number; count: number }[] = [];
  let scoreFor = 0;
  let scoreOpponent = 0;

  const pieceTypes = [Piece.Queen, Piece.Rook, Piece.Bishop, Piece.Knight, Piece.Pawn];

  // Calculate material totals
  for (const type of pieceTypes) {
    const val = values[type as keyof typeof values];
    
    // Opponent pieces on board
    const opponentOnBoard = currentCounts[targetSide][type as keyof typeof startCounts];
    const opponentStart = startCounts[type as keyof typeof startCounts];
    const opponentCaptured = Math.max(0, opponentStart - opponentOnBoard);

    if (opponentCaptured > 0) {
      captured.push({ type, count: opponentCaptured });
    }

    // Accumulate total current material scores
    scoreFor += currentCounts[opponentSide][type as keyof typeof startCounts] * val;
    scoreOpponent += currentCounts[targetSide][type as keyof typeof startCounts] * val;
  }

  // Material advantage
  const diff = scoreFor - scoreOpponent;

  return (
    <div 
      className="captured-container" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        height: '24px',
        fontSize: '0.85rem'
      }}
    >
      <div className="captured-list" style={{ display: 'flex', gap: '2px', opacity: 0.6, fontSize: '1.1rem' }}>
        {captured.map((c) => (
          <span key={c.type} style={{ display: 'flex' }}>
            {Array.from({ length: c.count }).map((_, idx) => (
              <span key={idx} style={{ marginRight: '-4px' }}>{symbols[c.type]}</span>
            ))}
          </span>
        ))}
      </div>
      {diff > 0 && (
        <span 
          style={{ 
            fontWeight: 800, 
            color: 'var(--text-secondary)', 
            backgroundColor: 'rgba(255,255,255,0.05)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontFamily: 'monospace'
          }}
        >
          +{diff}
        </span>
      )}
    </div>
  );
};
