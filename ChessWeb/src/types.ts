/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

export const Piece = {
  Empty: 0,
  Pawn: 1,
  Knight: 2,
  Bishop: 3,
  Rook: 4,
  Queen: 5,
  King: 6,

  White: 8,
  Black: 16,

  TypeMask: 7, // 0b00111
  ColorMask: 24, // 0b11000

  getPieceType(piece: number): number {
    return piece & this.TypeMask;
  },

  getColor(piece: number): number {
    return piece & this.ColorMask;
  },

  isWhite(piece: number): boolean {
    return (piece & this.ColorMask) === this.White;
  },

  isBlack(piece: number): boolean {
    return (piece & this.ColorMask) === this.Black;
  },

  isEmpty(piece: number): boolean {
    return piece === this.Empty;
  }
};

export interface Move {
  origin: number; // 0-63
  destination: number; // 0-63
  isPromotion?: boolean;
  promotionPieceType?: number; // Queen, Rook, Bishop, Knight
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPawnTwoForward?: boolean;
}

export interface GameHistoryEntry {
  move: Move;
  san: string; // e.g. "Nf3"
  fenBefore: string;
  fenAfter: string;
}

export interface Variation {
  score: number;
  pv: string[];
}

export interface EngineResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
  timeMs: number;
  pv: string[];
  variations?: Variation[];
}

export type BotLevel = '800' | '1500' | '2500';
export type BoardTheme = 'pure' | 'cream' | 'wood' | 'blue' | 'green' | 'grey' | 'purple';
export type PieceTheme = 'cburnett' | 'merida' | 'alpha' | 'cheq' | 'none';
