import { Piece, Move } from '../types';
import { BoardState } from './board';
import { MoveGenerator } from './movegen';
import { Evaluator } from './eval';

export class SearchEngine {
  private static readonly INFINITY = 9999999;
  private static readonly MATE_VALUE = 900000;

  private nodesSearched = 0;
  private startTime = 0;
  private timeLimit = 0;
  private isTimeout = false;

  // Triangular PV table for tracking principal variation
  private pvTable: Move[][] = [];
  private pvLength: number[] = [];

  public search(board: BoardState, timeLimitMs: number, maxDepth: number = 10): { move: Move; score: number; depth: number; nodes: number; pv: Move[] } {
    this.startTime = Date.now();
    this.timeLimit = timeLimitMs;
    this.isTimeout = false;
    this.nodesSearched = 0;

    // Initialize PV tables with room for quiescence extensions
    const maxPly = maxDepth + 30;
    this.pvTable = [];
    this.pvLength = [];
    for (let i = 0; i < maxPly; i++) {
      this.pvTable[i] = [];
      this.pvLength[i] = 0;
    }

    let bestMove: Move | null = null;
    let bestScore = -SearchEngine.INFINITY;
    let completedDepth = 1;
    let bestPV: Move[] = [];

    const legalMoves = MoveGenerator.generateLegalMoves(board);
    if (legalMoves.length === 0) {
      const isWhite = board.whiteToMove;
      const kingIndex = isWhite ? 0 : 1;
      const inCheck = MoveGenerator.isSquareAttacked(board, board.kingSquare[kingIndex], isWhite ? Piece.Black : Piece.White);
      return { move: { origin: -1, destination: -1 }, score: inCheck ? -SearchEngine.MATE_VALUE : 0, depth: 0, nodes: 0, pv: [] };
    }

    // Iterative deepening
    for (let depth = 1; depth <= maxDepth; depth++) {
      let currentBestMove: Move | null = null;
      let currentBestScore = -SearchEngine.INFINITY;
      let currentBestPV: Move[] = [];

      // Order root moves
      this.orderMoves(board, legalMoves);

      for (const move of legalMoves) {
        if (this.checkTimeout()) {
          this.isTimeout = true;
          break;
        }

        board.executeMove(move);
        const score = -this.alphaBeta(board, depth - 1, -SearchEngine.INFINITY, -currentBestScore, 1);
        board.undoMove();

        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
          // Build PV: root move + child's PV
          currentBestPV = [move];
          for (let i = 0; i < this.pvLength[1]; i++) {
            currentBestPV.push(this.pvTable[1][i]);
          }
        }
      }

      if (this.isTimeout && depth > 1) {
        break; // Reject incomplete depth search results
      }

      if (currentBestMove) {
        bestMove = currentBestMove;
        bestScore = currentBestScore;
        completedDepth = depth;
        bestPV = currentBestPV;
      }

      // Quick mate found
      if (Math.abs(bestScore) > SearchEngine.MATE_VALUE - 100) {
        break;
      }
    }

    return {
      move: bestMove || legalMoves[0],
      score: bestScore,
      depth: completedDepth,
      nodes: this.nodesSearched,
      pv: bestPV
    };
  }

  private alphaBeta(board: BoardState, depth: number, alpha: number, beta: number, ply: number): number {
    this.nodesSearched++;

    if (this.nodesSearched % 1000 === 0 && this.checkTimeout()) {
      this.isTimeout = true;
      return 0;
    }

    // Initialize PV for this ply
    this.pvLength[ply] = 0;

    if (depth === 0) {
      return this.quiescence(board, alpha, beta);
    }

    const moves = MoveGenerator.generateLegalMoves(board);

    if (moves.length === 0) {
      const isWhite = board.whiteToMove;
      const kingIndex = isWhite ? 0 : 1;
      const inCheck = MoveGenerator.isSquareAttacked(board, board.kingSquare[kingIndex], isWhite ? Piece.Black : Piece.White);
      if (inCheck) {
        return -SearchEngine.MATE_VALUE + (10 - depth); // Prefer closer mate
      }
      return 0; // Stalemate
    }

    this.orderMoves(board, moves);

    for (const move of moves) {
      board.executeMove(move);
      const score = -this.alphaBeta(board, depth - 1, -beta, -alpha, ply + 1);
      board.undoMove();

      if (this.isTimeout) return 0;

      if (score >= beta) {
        return beta; // Pruning
      }
      if (score > alpha) {
        alpha = score;
        // Update PV: this move + child's PV
        this.pvTable[ply][0] = move;
        for (let i = 0; i < this.pvLength[ply + 1]; i++) {
          this.pvTable[ply][i + 1] = this.pvTable[ply + 1][i];
        }
        this.pvLength[ply] = 1 + this.pvLength[ply + 1];
      }
    }

    return alpha;
  }

  private quiescence(board: BoardState, alpha: number, beta: number): number {
    if (this.isTimeout) return 0;
    this.nodesSearched++;

    if (this.nodesSearched % 1000 === 0 && this.checkTimeout()) {
      this.isTimeout = true;
      return 0;
    }

    const standPat = Evaluator.evaluate(board);
    if (standPat >= beta) {
      return beta;
    }
    if (standPat > alpha) {
      alpha = standPat;
    }

    // Generate captures only
    const moves = MoveGenerator.generateLegalMoves(board).filter(m => {
      const target = board.squares[m.destination];
      return target !== Piece.Empty || m.isEnPassant;
    });

    this.orderMoves(board, moves);

    for (const move of moves) {
      board.executeMove(move);
      const score = -this.quiescence(board, -beta, -alpha);
      board.undoMove();

      if (this.isTimeout) return 0;

      if (score >= beta) {
        return beta;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  private checkTimeout(): boolean {
    return Date.now() - this.startTime >= this.timeLimit;
  }

  private orderMoves(board: BoardState, moves: Move[]) {
    const scores = new Map<Move, number>();

    for (const move of moves) {
      let score = 0;
      const piece = board.squares[move.origin];
      const target = board.squares[move.destination];

      // MVV-LVA for captures
      if (target !== Piece.Empty) {
        const victimType = Piece.getPieceType(target);
        const attackerType = Piece.getPieceType(piece);
        score += 10 * victimType - attackerType + 1000;
      }

      // Promotion bonus
      if (move.isPromotion && move.promotionPieceType) {
        score += 100 * move.promotionPieceType + 500;
      }

      scores.set(move, score);
    }

    // Sort descending
    moves.sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0));
  }
}
