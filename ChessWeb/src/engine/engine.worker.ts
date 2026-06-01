/**
 * Chess Engine Web Worker
 * 
 * Uses the original TypeScript engine.
 * When the C++ WASM engine is built and available, the worker will
 * automatically detect and use it for higher performance.
 */

import { Piece, Move } from '../types';
import { BoardState } from './board';
import { SearchEngine } from './search';

const ctx: Worker = self as any;

/** Convert a move to Standard Algebraic Notation given the current board state */
function moveToSan(board: BoardState, move: Move): string {
  const squares = board.squares;

  if (move.isCastling) {
    return (move.destination % 8) === 6 ? 'O-O' : 'O-O-O';
  }

  const piece = squares[move.origin];
  const type = Piece.getPieceType(piece);
  const target = squares[move.destination];
  const isCapture = target !== Piece.Empty || move.isEnPassant;

  const file = String.fromCharCode(97 + (move.destination % 8));
  const rank = String(Math.floor(move.destination / 8) + 1);

  if (type === Piece.Pawn) {
    if (isCapture) {
      const origFile = String.fromCharCode(97 + (move.origin % 8));
      const suffix = move.isPromotion ? `=${promoChar(move.promotionPieceType)}` : '';
      return `${origFile}x${file}${rank}${suffix}`;
    }
    if (move.isPromotion) {
      return `${file}${rank}=${promoChar(move.promotionPieceType)}`;
    }
    return `${file}${rank}`;
  }

  const typeChar = type === Piece.Knight ? 'N'
    : type === Piece.Bishop ? 'B'
    : type === Piece.Rook ? 'R'
    : type === Piece.Queen ? 'Q'
    : type === Piece.King ? 'K'
    : '';

  const captureChar = isCapture ? 'x' : '';
  return `${typeChar}${captureChar}${file}${rank}`;
}

function promoChar(pieceType?: number): string {
  if (pieceType === Piece.Queen) return 'Q';
  if (pieceType === Piece.Rook) return 'R';
  if (pieceType === Piece.Bishop) return 'B';
  if (pieceType === Piece.Knight) return 'N';
  return 'Q';
}

// ===== WASM Engine Support =====
let useWasm = false;
let _wasm_load_fen: ((fen: string) => void) | null = null;
let _wasm_search: ((timeLimit: number, maxDepth: number) => string) | null = null;

async function tryLoadWasm(): Promise<boolean> {
  try {
    // Dynamically check for the WASM module file
    // @ts-ignore - dynamic import, may not exist
    const moduleUrl = new URL('./chess_engine.js', import.meta.url);
    const response = await fetch(moduleUrl.href, { method: 'HEAD' });
    if (!response.ok) return false;

    const module = await import(/* @vite-ignore */ moduleUrl.href);
    const ChessEngineModule = module.default;
    const instance = await ChessEngineModule();
    
    const init = instance.cwrap('engine_init', null, []);
    _wasm_load_fen = instance.cwrap('engine_load_fen', null, ['string']);
    _wasm_search = instance.cwrap('engine_search', 'string', ['number', 'number']);
    init();
    
    console.log('[Engine Worker] C++ WASM engine loaded successfully');
    return true;
  } catch {
    return false;
  }
}

// Try to load WASM asynchronously
tryLoadWasm().then(success => {
  useWasm = success;
  if (!success) {
    console.log('[Engine Worker] Using TypeScript engine (WASM not available)');
  }
});

ctx.onmessage = (e: MessageEvent) => {
  const { fen, timeLimit, maxDepth, type } = e.data;

  if (useWasm && _wasm_load_fen && _wasm_search) {
    // ===== WASM PATH =====
    const startTime = Date.now();
    _wasm_load_fen(fen);
    const resultJson = _wasm_search(timeLimit, maxDepth || 10);
    const elapsed = Date.now() - startTime;

    try {
      const result = JSON.parse(resultJson);
      ctx.postMessage({
        move: result.move,
        score: result.score,
        depth: result.depth,
        nodes: result.nodes,
        timeMs: result.timeMs || elapsed,
        pv: result.pv,
        type
      });
      return;
    } catch {
      console.warn('[Engine Worker] WASM parse failed, using TS fallback');
    }
  }

  // ===== TypeScript PATH =====
  const board = new BoardState();
  board.loadFromFen(fen);

  const searcher = new SearchEngine();
  const startTime = Date.now();
  const result = searcher.search(board, timeLimit, maxDepth || 10);
  const elapsed = Date.now() - startTime;

  // Convert PV moves to SAN notation by replaying on a temp board
  const pvSan: string[] = [];
  const tempBoard = new BoardState();
  tempBoard.loadFromFen(fen);
  for (const pvMove of result.pv) {
    try {
      pvSan.push(moveToSan(tempBoard, pvMove));
      tempBoard.executeMove(pvMove);
    } catch {
      break; // Stop if move application fails
    }
  }

  ctx.postMessage({
    move: result.move,
    score: result.score,
    depth: result.depth,
    nodes: result.nodes,
    timeMs: elapsed,
    pv: pvSan,
    type
  });
};
export {};
