import { Piece, Move } from '../types';
import { BoardState } from './board';

export class MoveGenerator {
  // Sliding piece directions
  private static readonly bishopDirections = [7, 9, -7, -9];
  private static readonly rookDirections = [8, -8, 1, -1];
  private static readonly queenDirections = [7, 9, -7, -9, 8, -8, 1, -1];
  private static readonly knightOffsets = [-17, -15, -10, -6, 6, 10, 15, 17];
  private static readonly kingOffsets = [-9, -8, -7, -1, 1, 7, 8, 9];

  public static generateLegalMoves(board: BoardState): Move[] {
    const pseudo = this.generatePseudoLegalMoves(board);
    const legal: Move[] = [];

    for (const move of pseudo) {
      if (this.isMoveLegal(board, move)) {
        legal.push(move);
      }
    }

    return legal;
  }

  private static isMoveLegal(board: BoardState, move: Move): boolean {
    const playerColor = board.whiteToMove ? Piece.White : Piece.Black;
    
    // Simulate move
    const prevSquares = [...board.squares];
    const prevKingSquare = [...board.kingSquare];
    const prevCastling = board.castlingRights;
    const prevEnPassant = board.enPassantSquare;
    const prevHalfmove = board.halfmoveClock;

    // Apply move
    this.executeMoveSim(board, move);

    // Is friendly king in check?
    const inCheck = this.isSquareAttacked(board, board.kingSquare[playerColor === Piece.White ? 0 : 1], playerColor === Piece.White ? Piece.Black : Piece.White);

    // Undo move
    board.squares = prevSquares;
    board.kingSquare = prevKingSquare;
    board.castlingRights = prevCastling;
    board.enPassantSquare = prevEnPassant;
    board.halfmoveClock = prevHalfmove;

    return !inCheck;
  }

  private static executeMoveSim(board: BoardState, move: Move) {
    const piece = board.squares[move.origin];
    const isWhite = Piece.isWhite(piece);
    const type = Piece.getPieceType(piece);

    // En Passant
    if (move.isEnPassant) {
      const captureSq = move.destination + (isWhite ? -8 : 8);
      board.squares[captureSq] = Piece.Empty;
    }

    // Castling
    if (move.isCastling) {
      const isKingSide = (move.destination % 8) === 6;
      const rookFrom = isKingSide ? move.destination + 1 : move.destination - 2;
      const rookTo = isKingSide ? move.destination - 1 : move.destination + 1;
      const rook = board.squares[rookFrom];
      board.squares[rookTo] = rook;
      board.squares[rookFrom] = Piece.Empty;
    }

    // Update board squares
    board.squares[move.destination] = move.isPromotion && move.promotionPieceType 
      ? (move.promotionPieceType | (isWhite ? Piece.White : Piece.Black))
      : piece;
    board.squares[move.origin] = Piece.Empty;

    // Track King square
    if (type === Piece.King) {
      board.kingSquare[isWhite ? 0 : 1] = move.destination;
    }
  }

  public static isSquareAttacked(board: BoardState, square: number, attackerColor: number): boolean {
    const isAttackerWhite = attackerColor === Piece.White;

    // 1. Knight attacks
    for (const offset of this.knightOffsets) {
      const target = square + offset;
      if (this.isValidSquare(square, target, offset, true)) {
        const piece = board.squares[target];
        if (Piece.getPieceType(piece) === Piece.Knight && Piece.getColor(piece) === attackerColor) {
          return true;
        }
      }
    }

    // 2. Sliding pieces (Bishop, Rook, Queen)
    // Bishop & Queen diagonals
    for (const dir of this.bishopDirections) {
      let target = square;
      while (true) {
        const prev = target;
        target += dir;
        if (!this.isValidSquare(prev, target, dir, false)) break;

        const piece = board.squares[target];
        if (piece !== Piece.Empty) {
          const type = Piece.getPieceType(piece);
          if (Piece.getColor(piece) === attackerColor && (type === Piece.Bishop || type === Piece.Queen)) {
            return true;
          }
          break; // Blocked
        }
      }
    }

    // Rook & Queen orthogonal
    for (const dir of this.rookDirections) {
      let target = square;
      while (true) {
        const prev = target;
        target += dir;
        if (!this.isValidSquare(prev, target, dir, false)) break;

        const piece = board.squares[target];
        if (piece !== Piece.Empty) {
          const type = Piece.getPieceType(piece);
          if (Piece.getColor(piece) === attackerColor && (type === Piece.Rook || type === Piece.Queen)) {
            return true;
          }
          break; // Blocked
        }
      }
    }

    // 3. Pawn attacks
    const pawnDirections = isAttackerWhite ? [-9, -7] : [7, 9];
    for (const dir of pawnDirections) {
      const target = square + dir;
      if (this.isValidSquare(square, target, dir, true)) {
        const piece = board.squares[target];
        if (Piece.getPieceType(piece) === Piece.Pawn && Piece.getColor(piece) === attackerColor) {
          return true;
        }
      }
    }

    // 4. King attacks
    for (const offset of this.kingOffsets) {
      const target = square + offset;
      if (this.isValidSquare(square, target, offset, true)) {
        const piece = board.squares[target];
        if (Piece.getPieceType(piece) === Piece.King && Piece.getColor(piece) === attackerColor) {
          return true;
        }
      }
    }

    return false;
  }

  private static generatePseudoLegalMoves(board: BoardState): Move[] {
    const moves: Move[] = [];
    const color = board.whiteToMove ? Piece.White : Piece.Black;

    for (let origin = 0; origin < 64; origin++) {
      const piece = board.squares[origin];
      if (piece === Piece.Empty || Piece.getColor(piece) !== color) continue;

      const type = Piece.getPieceType(piece);

      if (type === Piece.Pawn) {
        this.generatePawnMoves(board, origin, color, moves);
      } else if (type === Piece.Knight) {
        this.generateKnightMoves(board, origin, color, moves);
      } else if (type === Piece.Bishop) {
        this.generateSlidingMoves(board, origin, this.bishopDirections, color, moves);
      } else if (type === Piece.Rook) {
        this.generateSlidingMoves(board, origin, this.rookDirections, color, moves);
      } else if (type === Piece.Queen) {
        this.generateSlidingMoves(board, origin, this.queenDirections, color, moves);
      } else if (type === Piece.King) {
        this.generateKingMoves(board, origin, color, moves);
      }
    }

    return moves;
  }

  private static generatePawnMoves(board: BoardState, origin: number, color: number, moves: Move[]) {
    const isWhite = color === Piece.White;
    const forward = isWhite ? 8 : -8;
    const rank = Math.floor(origin / 8);

    // Single push
    const singleDest = origin + forward;
    if (singleDest >= 0 && singleDest < 64 && board.squares[singleDest] === Piece.Empty) {
      const isPromoRank = isWhite ? rank === 6 : rank === 1;
      if (isPromoRank) {
        this.addPromotionMoves(origin, singleDest, moves);
      } else {
        moves.push({ origin, destination: singleDest });
      }

      // Double push
      const startRank = isWhite ? 1 : 6;
      const doubleDest = origin + forward * 2;
      if (rank === startRank && board.squares[doubleDest] === Piece.Empty) {
        moves.push({ origin, destination: doubleDest, isPawnTwoForward: true });
      }
    }

    // Captures
    const attackOffsets = isWhite ? [7, 9] : [-7, -9];
    for (const offset of attackOffsets) {
      const dest = origin + offset;
      if (this.isValidSquare(origin, dest, offset, true)) {
        const piece = board.squares[dest];
        const isPromoRank = isWhite ? rank === 6 : rank === 1;

        if (piece !== Piece.Empty && Piece.getColor(piece) !== color) {
          if (isPromoRank) {
            this.addPromotionMoves(origin, dest, moves);
          } else {
            moves.push({ origin, destination: dest });
          }
        }

        // En passant
        if (dest === board.enPassantSquare) {
          moves.push({ origin, destination: dest, isEnPassant: true });
        }
      }
    }
  }

  private static addPromotionMoves(origin: number, destination: number, moves: Move[]) {
    const promoTypes = [Piece.Queen, Piece.Rook, Piece.Bishop, Piece.Knight];
    for (const type of promoTypes) {
      moves.push({ origin, destination, isPromotion: true, promotionPieceType: type });
    }
  }

  private static generateKnightMoves(board: BoardState, origin: number, color: number, moves: Move[]) {
    for (const offset of this.knightOffsets) {
      const dest = origin + offset;
      if (this.isValidSquare(origin, dest, offset, true)) {
        const piece = board.squares[dest];
        if (piece === Piece.Empty || Piece.getColor(piece) !== color) {
          moves.push({ origin, destination: dest });
        }
      }
    }
  }

  private static generateSlidingMoves(board: BoardState, origin: number, directions: number[], color: number, moves: Move[]) {
    for (const dir of directions) {
      let target = origin;
      while (true) {
        const prev = target;
        target += dir;
        if (!this.isValidSquare(prev, target, dir, false)) break;

        const piece = board.squares[target];
        if (piece === Piece.Empty) {
          moves.push({ origin, destination: target });
        } else {
          if (Piece.getColor(piece) !== color) {
            moves.push({ origin, destination: target });
          }
          break; // Blocked
        }
      }
    }
  }

  private static generateKingMoves(board: BoardState, origin: number, color: number, moves: Move[]) {
    const isWhite = color === Piece.White;
    
    // Normal moves
    for (const offset of this.kingOffsets) {
      const dest = origin + offset;
      if (this.isValidSquare(origin, dest, offset, true)) {
        const piece = board.squares[dest];
        if (piece === Piece.Empty || Piece.getColor(piece) !== color) {
          moves.push({ origin, destination: dest });
        }
      }
    }
    // Castling
    const kingIndex = isWhite ? 0 : 1;
    if (this.isSquareAttacked(board, board.kingSquare[kingIndex], isWhite ? Piece.Black : Piece.White)) return; // Cannot castle out of check

    const rankOffset = isWhite ? 0 : 56;

    // Kingside
    const kingsideRight = isWhite ? 1 : 4;
    if ((board.castlingRights & kingsideRight) !== 0) {
      const f1 = rankOffset + 5;
      const g1 = rankOffset + 6;
      if (board.squares[f1] === Piece.Empty && board.squares[g1] === Piece.Empty) {
        if (!this.isSquareAttacked(board, f1, isWhite ? Piece.Black : Piece.White) &&
            !this.isSquareAttacked(board, g1, isWhite ? Piece.Black : Piece.White)) {
          moves.push({ origin, destination: g1, isCastling: true });
        }
      }
    }

    // Queenside
    const queensideRight = isWhite ? 2 : 8;
    if ((board.castlingRights & queensideRight) !== 0) {
      const d1 = rankOffset + 3;
      const c1 = rankOffset + 2;
      const b1 = rankOffset + 1;
      if (board.squares[d1] === Piece.Empty && board.squares[c1] === Piece.Empty && board.squares[b1] === Piece.Empty) {
        if (!this.isSquareAttacked(board, d1, isWhite ? Piece.Black : Piece.White) &&
            !this.isSquareAttacked(board, c1, isWhite ? Piece.Black : Piece.White)) {
          moves.push({ origin, destination: c1, isCastling: true });
        }
      }
    }
  }

  private static isValidSquare(origin: number, dest: number, offset: number, singleStep: boolean): boolean {
    if (dest < 0 || dest >= 64) return false;

    const fileOrigin = origin % 8;
    const fileDest = dest % 8;
    const fileDiff = Math.abs(fileOrigin - fileDest);

    // Prevent wrapping around left and right edges
    if (singleStep) {
      // Pawn attacks, Knight jumps, King moves
      return fileDiff <= 2;
    } else {
      // Sliding pieces: diagonal directions change columns by exactly 1 per step, orthogonal dirs by 0 or 1.
      const absOffset = Math.abs(offset);
      if (absOffset === 7 || absOffset === 9) {
        return fileDiff === 1;
      }
      if (absOffset === 1) {
        return fileDiff === 1;
      }
      if (absOffset === 8) {
        return fileDiff === 0;
      }
    }

    return true;
  }
}
