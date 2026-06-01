import { Piece, Move } from '../types';
import { PieceArt } from './PieceArt';
import '../styles/board.css';

interface ChessBoardProps {
  squares: number[];
  selectedSquare: number;
  legalMoves: Move[];
  lastMove: Move | null;
  isFlipped: boolean;
  onSquareClick: (squareIndex: number) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  squares,
  selectedSquare,
  legalMoves,
  lastMove,
  isFlipped,
  onSquareClick
}) => {
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

  const renderPiece = (piece: number) => {
    if (piece === Piece.Empty) return null;
    const isWhite = Piece.isWhite(piece);
    const colorClass = isWhite ? 'white-piece' : 'black-piece';
    return <div className={`piece svg-piece ${colorClass}`}>{getSvgPiece(piece)}</div>;
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
          const piece = squares[sqIndex];

          const isSelected = sqIndex === selectedSquare;
          const isTarget = targetSquares.has(sqIndex);
          const isLastMove = lastMove && (lastMove.origin === sqIndex || lastMove.destination === sqIndex);
          const hasPiece = piece !== Piece.Empty;

          const showRankLabel = isFlipped ? file === 7 : file === 0;
          const showFileLabel = isFlipped ? rank === 7 : rank === 0;
          const fileChar = String.fromCharCode(97 + file);
          const rankChar = String(rank + 1);

          let squareClasses = `square ${isLight ? 'light' : 'dark'}`;
          if (isSelected) squareClasses += ' selected';
          if (isTarget) squareClasses += ' target';
          if (isLastMove) squareClasses += ' last-move';
          if (hasPiece) squareClasses += ' has-piece';

          return (
            <div key={sqIndex} className={squareClasses} onClick={() => onSquareClick(sqIndex)}>
              {renderPiece(piece)}
              {showRankLabel && <span className="coordinate-label rank">{rankChar}</span>}
              {showFileLabel && <span className="coordinate-label file">{fileChar}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
