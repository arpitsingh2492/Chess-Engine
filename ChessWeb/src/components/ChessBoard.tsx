/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React from 'react';
import { Piece, Move } from '../types';
import { PieceArt } from './PieceArt';
import '../styles/board.css';

interface ChessBoardProps {
  squares: number[];
  selectedSquare: number;
  legalMoves: Move[];
  lastMove: Move | null;
  isFlipped: boolean;
  checkSquare?: number;
  isMate?: boolean;
  onSquareClick: (squareIndex: number) => void;
}

type PieceNode = { id: string; piece: number; square: number };

export const ChessBoard: React.FC<ChessBoardProps> = ({
  squares,
  selectedSquare,
  legalMoves,
  lastMove,
  isFlipped,
  checkSquare = -1,
  isMate = false,
  onSquareClick
}) => {
  const [pieces, setPieces] = React.useState<PieceNode[]>([]);
  const prevSquares = React.useRef<number[]>([]);

  React.useEffect(() => {
    if (squares.join(',') === prevSquares.current.join(',')) return;

    let nextPieces = [...pieces];
    
    // If full reset or major change (e.g. load position)
    if (pieces.length === 0 || Math.abs(squares.filter(p => p !== Piece.Empty).length - nextPieces.length) > 3) {
      nextPieces = [];
      let idCounter = 0;
      for (let i = 0; i < 64; i++) {
        if (squares[i] !== Piece.Empty) {
          nextPieces.push({ id: `p_${idCounter++}`, piece: squares[i], square: i });
        }
      }
    } else {
      const oldSquares = prevSquares.current;
      const removedSquares: number[] = [];
      const addedSquares: number[] = [];

      for (let i = 0; i < 64; i++) {
        const oldP = oldSquares[i] || Piece.Empty;
        const newP = squares[i] || Piece.Empty;
        if (oldP !== Piece.Empty && newP === Piece.Empty) removedSquares.push(i);
        if (oldP === Piece.Empty && newP !== Piece.Empty) addedSquares.push(i);
        if (oldP !== Piece.Empty && newP !== Piece.Empty && oldP !== newP) {
          removedSquares.push(i);
          addedSquares.push(i);
        }
      }

      const unmatchedAdded = [...addedSquares];
      const unmatchedRemovedNodes = removedSquares.map(sq => nextPieces.find(p => p.square === sq)).filter(Boolean) as PieceNode[];

      for (let i = unmatchedAdded.length - 1; i >= 0; i--) {
        const addSq = unmatchedAdded[i];
        const addedPiece = squares[addSq];
        
        const removedIdx = unmatchedRemovedNodes.findIndex(node => {
           const oldPiece = node.piece;
           return Piece.isWhite(oldPiece) === Piece.isWhite(addedPiece) &&
                 (Piece.getPieceType(oldPiece) === Piece.getPieceType(addedPiece) || Piece.getPieceType(oldPiece) === Piece.Pawn);
        });

        if (removedIdx !== -1) {
          const pieceNode = unmatchedRemovedNodes[removedIdx];
          pieceNode.square = addSq;
          pieceNode.piece = addedPiece;
          unmatchedAdded.splice(i, 1);
          unmatchedRemovedNodes.splice(removedIdx, 1);
        }
      }

      const idsToRemove = unmatchedRemovedNodes.map(n => n.id);
      nextPieces = nextPieces.filter(p => !idsToRemove.includes(p.id));
      for (const addSq of unmatchedAdded) {
        nextPieces.push({ id: `p_${Date.now()}_${Math.random()}`, piece: squares[addSq], square: addSq });
      }
    }

    setPieces(nextPieces);
    prevSquares.current = [...squares];
  }, [squares]);
  const getSvgPiece = (piece: number): React.ReactNode => {
    if (piece === Piece.Empty) return null;
    const type = Piece.getPieceType(piece);
    const isWhite = Piece.isWhite(piece);

    const typeStr = type === Piece.Pawn ? 'P' :
                    type === Piece.Knight ? 'N' :
                    type === Piece.Bishop ? 'B' :
                    type === Piece.Rook ? 'R' :
                    type === Piece.Queen ? 'Q' :
                    type === Piece.King ? 'K' : '';
    const key = (isWhite ? 'w' : 'b') + typeStr;
    return PieceArt[key] || null;
  };

  const targetSquares = new Set<number>();
  if (selectedSquare !== -1) {
    for (const m of legalMoves) {
      if (m.origin === selectedSquare) targetSquares.add(m.destination);
    }
  }

  const renderPiece = (node: PieceNode) => {
    const isWhite = Piece.isWhite(node.piece);
    const colorClass = isWhite ? 'white-piece' : 'black-piece';
    
    // Calculate position
    const file = node.square % 8;
    const rank = Math.floor(node.square / 8);
    const visualFile = isFlipped ? 7 - file : file;
    const visualRank = isFlipped ? rank : 7 - rank;
    
    const style: React.CSSProperties = {
      top: 0,
      left: 0,
      transform: `translate(${visualFile * 100}%, ${visualRank * 100}%)`,
      position: 'absolute',
      width: '12.5%',
      height: '12.5%',
      transition: 'transform 0.2s ease-in-out',
      zIndex: 10
    };

    return (
      <div key={node.id} className={`piece svg-piece ${colorClass}`} style={style}>
        {getSvgPiece(node.piece)}
      </div>
    );
  };

  const squaresToRender: number[] = [];
  for (let r = 0; r < 8; r++) {
    const rank = isFlipped ? r : 7 - r;
    for (let f = 0; f < 8; f++) {
      const file = isFlipped ? 7 - f : f;
      squaresToRender.push(rank * 8 + file);
    }
  }

  return (
    <div className="board-outer">
      <div className="board-container">
        {squaresToRender.map((sqIndex) => {
          const file = sqIndex % 8;
          const rank = Math.floor(sqIndex / 8);
          const isLight = (rank + file) % 2 !== 0;

          const isSelected = sqIndex === selectedSquare;
          const isTarget = targetSquares.has(sqIndex);
          const isLastMove = lastMove && (lastMove.origin === sqIndex || lastMove.destination === sqIndex);

          const showRankLabel = isFlipped ? file === 7 : file === 0;
          const showFileLabel = isFlipped ? rank === 7 : rank === 0;
          const fileChar = String.fromCharCode(97 + file);
          const rankChar = String(rank + 1);

          let squareClasses = `square ${isLight ? 'light' : 'dark'}`;
          if (isSelected) squareClasses += ' selected';
          if (isTarget) squareClasses += ' target';
          if (isLastMove) squareClasses += ' last-move';
          
          if (sqIndex === checkSquare) {
            squareClasses += isMate ? ' king-checkmate' : ' king-check';
          }

          return (
            <div key={sqIndex} className={squareClasses} onClick={() => onSquareClick(sqIndex)}>
              {showRankLabel && <span className="coordinate-label rank">{rankChar}</span>}
              {showFileLabel && <span className="coordinate-label file">{fileChar}</span>}
            </div>
          );
        })}
        {pieces.map(renderPiece)}
      </div>
    </div>
  );
};
