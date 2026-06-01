/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import { Piece, Move } from '../types';

export class BoardState {
  public squares: number[] = new Array(64).fill(Piece.Empty);
  public whiteToMove = true;
  public castlingRights = 15; // 1111 in binary (WK, WQ, BK, BQ)
  public enPassantSquare = -1; // index 0-63, or -1
  public halfmoveClock = 0;
  public kingSquare: number[] = [4, 60]; // White King at e1 (4), Black King at e8 (60)

  // Track full game state history for robust undos
  private history: BoardStateClone[] = [];
  
  // Track position hashes for threefold repetition
  private positionHistory: string[] = [];

  public clone(): BoardState {
    const next = new BoardState();
    next.squares = [...this.squares];
    next.whiteToMove = this.whiteToMove;
    next.castlingRights = this.castlingRights;
    next.enPassantSquare = this.enPassantSquare;
    next.halfmoveClock = this.halfmoveClock;
    next.kingSquare = [...this.kingSquare];
    next.positionHistory = [...this.positionHistory];
    return next;
  }

  public getRepetitionHash(): string {
    const parts = this.getCurrentFen().split(' ');
    // parts[0] is board, parts[1] is turn, parts[2] is castling, parts[3] is en passant
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  }

  public isThreefoldRepetition(): boolean {
    const current = this.getRepetitionHash();
    let count = 1; // current position is 1
    for (const hash of this.positionHistory) {
      if (hash === current) {
        count++;
      }
    }
    return count >= 3;
  }

  public setupStartingPosition() {
    this.loadFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.history = [];
    this.positionHistory = [];
  }

  public loadFromFen(fen: string) {
    const parts = fen.trim().split(/\s+/);
    const boardPart = parts[0];
    const turnPart = parts[1];
    const castlePart = parts[2];
    const epPart = parts[3];
    const halfmovePart = parts[4] || '0';

    this.squares.fill(Piece.Empty);

    let rank = 7;
    let file = 0;

    for (const char of boardPart) {
      if (char === '/') {
        rank--;
        file = 0;
      } else if (char >= '1' && char <= '8') {
        file += parseInt(char, 10);
      } else {
        const isWhite = char === char.toUpperCase();
        const typeChar = char.toLowerCase();
        const type = typeChar === 'p' ? Piece.Pawn
                   : typeChar === 'n' ? Piece.Knight
                   : typeChar === 'b' ? Piece.Bishop
                   : typeChar === 'r' ? Piece.Rook
                   : typeChar === 'q' ? Piece.Queen
                   : typeChar === 'k' ? Piece.King
                   : Piece.Empty;

        const sq = rank * 8 + file;
        this.squares[sq] = type | (isWhite ? Piece.White : Piece.Black);

        if (type === Piece.King) {
          this.kingSquare[isWhite ? 0 : 1] = sq;
        }

        file++;
      }
    }

    this.whiteToMove = turnPart === 'w';

    // Castling rights
    this.castlingRights = 0;
    if (castlePart.includes('K')) this.castlingRights |= 1;
    if (castlePart.includes('Q')) this.castlingRights |= 2;
    if (castlePart.includes('k')) this.castlingRights |= 4;
    if (castlePart.includes('q')) this.castlingRights |= 8;

    // En Passant
    if (epPart === '-') {
      this.enPassantSquare = -1;
    } else {
      const f = epPart.charCodeAt(0) - 97; // 'a' = 97
      const r = parseInt(epPart[1], 10) - 1;
      this.enPassantSquare = r * 8 + f;
    }

    this.halfmoveClock = parseInt(halfmovePart, 10);
    this.positionHistory = []; // Reset on load
  }

  public getCurrentFen(): string {
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let emptyCount = 0;
      let rowStr = '';
      for (let file = 0; file < 8; file++) {
        const piece = this.squares[rank * 8 + file];
        if (piece === Piece.Empty) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          const isWhite = Piece.isWhite(piece);
          const type = Piece.getPieceType(piece);
          let char = type === Piece.Pawn ? 'p'
                   : type === Piece.Knight ? 'n'
                   : type === Piece.Bishop ? 'b'
                   : type === Piece.Rook ? 'r'
                   : type === Piece.Queen ? 'q'
                   : type === Piece.King ? 'k'
                   : '.';
          if (isWhite) char = char.toUpperCase();
          rowStr += char;
        }
      }
      if (emptyCount > 0) {
        rowStr += emptyCount;
      }
      rows.push(rowStr);
    }

    const turn = this.whiteToMove ? 'w' : 'b';
    
    let castle = '';
    if ((this.castlingRights & 1) !== 0) castle += 'K';
    if ((this.castlingRights & 2) !== 0) castle += 'Q';
    if ((this.castlingRights & 4) !== 0) castle += 'k';
    if ((this.castlingRights & 8) !== 0) castle += 'q';
    if (castle === '') castle = '-';

    let ep = '-';
    if (this.enPassantSquare !== -1) {
      const f = String.fromCharCode(97 + (this.enPassantSquare % 8));
      const r = Math.floor(this.enPassantSquare / 8) + 1;
      ep = f + r;
    }

    return `${rows.join('/')} ${turn} ${castle} ${ep} ${this.halfmoveClock} 1`;
  }

  public executeMove(move: Move) {
    // Save history record before applying (saves positionHistory BEFORE pushing current position's hash)
    this.history.push({
      squares: [...this.squares],
      castlingRights: this.castlingRights,
      enPassantSquare: this.enPassantSquare,
      halfmoveClock: this.halfmoveClock,
      kingSquare: [...this.kingSquare],
      positionHistory: [...this.positionHistory]
    });

    // Record current position hash before changing
    this.positionHistory.push(this.getRepetitionHash());

    const piece = this.squares[move.origin];
    const type = Piece.getPieceType(piece);
    const isWhite = Piece.isWhite(piece);
    const targetPiece = this.squares[move.destination];

    // Reset en passant square
    this.enPassantSquare = -1;

    // Reset halfmove clock on pawn push or capture
    if (type === Piece.Pawn || targetPiece !== Piece.Empty) {
      this.halfmoveClock = 0;
      this.positionHistory = []; // Repetition is broken permanently
    } else {
      this.halfmoveClock++;
    }

    // Castling
    if (move.isCastling) {
      const isKingSide = (move.destination % 8) === 6;
      const rookFrom = isKingSide ? move.destination + 1 : move.destination - 2;
      const rookTo = isKingSide ? move.destination - 1 : move.destination + 1;
      const rook = this.squares[rookFrom];
      this.squares[rookTo] = rook;
      this.squares[rookFrom] = Piece.Empty;
    }

    // En Passant capture execution
    if (move.isEnPassant) {
      const captureSq = move.destination + (isWhite ? -8 : 8);
      this.squares[captureSq] = Piece.Empty;
    }

    // Pawn Two Forward (sets en passant opportunity)
    if (move.isPawnTwoForward) {
      this.enPassantSquare = move.destination + (isWhite ? -8 : 8);
    }

    // Execute square change
    this.squares[move.destination] = move.isPromotion && move.promotionPieceType
      ? (move.promotionPieceType | (isWhite ? Piece.White : Piece.Black))
      : piece;
    this.squares[move.origin] = Piece.Empty;

    // Track Kings
    if (type === Piece.King) {
      this.kingSquare[isWhite ? 0 : 1] = move.destination;
      // Remove all castling rights for this king
      this.castlingRights &= isWhite ? ~3 : ~12;
    }

    // Remove rook castling rights if captured or moved
    this.updateCastlingRightsOnMove(move.origin, move.destination);

    // Swap turns
    this.whiteToMove = !this.whiteToMove;
  }

  public undoMove() {
    const prev = this.history.pop();
    if (!prev) return;

    this.squares = prev.squares;
    this.castlingRights = prev.castlingRights;
    this.enPassantSquare = prev.enPassantSquare;
    this.halfmoveClock = prev.halfmoveClock;
    this.kingSquare = prev.kingSquare;
    this.positionHistory = prev.positionHistory;

    // Swap turns back
    this.whiteToMove = !this.whiteToMove;
  }

  public getHistoryCount(): number {
    return this.history.length;
  }

  private updateCastlingRightsOnMove(origin: number, destination: number) {
    // White Rooks
    if (origin === 7) this.castlingRights &= ~1; // h1
    if (origin === 0) this.castlingRights &= ~2; // a1
    // Black Rooks
    if (origin === 63) this.castlingRights &= ~4; // h8
    if (origin === 56) this.castlingRights &= ~8; // a8

    // Capturing rooks also eliminates opponent castling rights!
    if (destination === 7) this.castlingRights &= ~1;
    if (destination === 0) this.castlingRights &= ~2;
    if (destination === 63) this.castlingRights &= ~4;
    if (destination === 56) this.castlingRights &= ~8;
  }
}

interface BoardStateClone {
  squares: number[];
  castlingRights: number;
  enPassantSquare: number;
  halfmoveClock: number;
  kingSquare: number[];
  positionHistory: string[];
}
