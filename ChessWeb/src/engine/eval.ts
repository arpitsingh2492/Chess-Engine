/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import { Piece } from '../types';
import { BoardState } from './board';

export class Evaluator {
  private static readonly PawnTable = [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0
  ];

  private static readonly KnightTable = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  private static readonly BishopTable = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  private static readonly RookTable = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  5,  5,  0
  ];

  private static readonly QueenTable = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  private static readonly KingMiddleTable = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ];

  public static evaluate(board: BoardState): number {
    let score = 0;

    for (let sq = 0; sq < 64; sq++) {
      const piece = board.squares[sq];
      if (piece === Piece.Empty) continue;

      const type = Piece.getPieceType(piece);
      const isWhite = Piece.isWhite(piece);
      
      let val = 0;

      // 1. Material value
      switch (type) {
        case Piece.Pawn: val += 100; break;
        case Piece.Knight: val += 320; break;
        case Piece.Bishop: val += 330; break;
        case Piece.Rook: val += 500; break;
        case Piece.Queen: val += 900; break;
        case Piece.King: val += 20000; break;
      }

      // 2. Positional value (Piece-Square table)
      const psqIndex = isWhite ? (56 - Math.floor(sq / 8) * 8 + (sq % 8)) : sq;
      switch (type) {
        case Piece.Pawn: val += this.PawnTable[psqIndex]; break;
        case Piece.Knight: val += this.KnightTable[psqIndex]; break;
        case Piece.Bishop: val += this.BishopTable[psqIndex]; break;
        case Piece.Rook: val += this.RookTable[psqIndex]; break;
        case Piece.Queen: val += this.QueenTable[psqIndex]; break;
        case Piece.King: val += this.KingMiddleTable[psqIndex]; break;
      }

      if (isWhite) {
        score += val;
      } else {
        score -= val;
      }
    }

    // Return perspective score relative to side-to-move
    const perspective = board.whiteToMove ? 1 : -1;
    return score * perspective;
  }
}
