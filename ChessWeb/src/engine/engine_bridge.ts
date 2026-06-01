/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

/**
 * Engine Bridge - TypeScript wrapper for the C++ WASM chess engine.
 * Provides type-safe access to the compiled WebAssembly module.
 */

import { Move, EngineResult } from '../types';

// Type for the Emscripten module
interface ChessEngineModule {
    ccall: (name: string, returnType: string | null, argTypes: string[], args: any[]) => any;
    cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: any[]) => any;
    UTF8ToString: (ptr: number) => string;
}

let moduleInstance: ChessEngineModule | null = null;
let moduleLoading: Promise<ChessEngineModule> | null = null;

// Wrapped functions (cached after first cwrap)
let _engine_init: (() => void) | null = null;
let _engine_new_game: (() => void) | null = null;
let _engine_load_fen: ((fen: string) => void) | null = null;
let _engine_search: ((timeLimit: number, maxDepth: number) => string) | null = null;
let _engine_get_legal_moves: (() => string) | null = null;
let _engine_get_fen: (() => string) | null = null;
let _engine_make_move: ((origin: number, dest: number, isPromo: boolean, promoType: number, isCastling: boolean, isEP: boolean, isPawn2: boolean) => boolean) | null = null;
let _engine_is_in_check: (() => boolean) | null = null;
let _engine_get_halfmove_clock: (() => number) | null = null;
let _engine_is_threefold_repetition: (() => boolean) | null = null;
let _engine_is_white_to_move: (() => boolean) | null = null;
let _engine_get_board_squares: (() => string) | null = null;

/**
 * Load and initialize the WASM module.
 * Call this once before using any engine functions.
 */
export async function loadEngine(): Promise<void> {
    if (moduleInstance) return;

    if (!moduleLoading) {
        moduleLoading = (async () => {
            // Dynamic import of the Emscripten-generated JS module
            // @ts-ignore - dynamic import, file might not exist during TS compilation
            const ChessEngineModule = (await import('./chess_engine.js')).default;
            const instance = await ChessEngineModule();
            return instance as ChessEngineModule;
        })();
    }

    moduleInstance = await moduleLoading;

    // Wrap all C functions
    _engine_init = moduleInstance.cwrap('engine_init', null, []);
    _engine_new_game = moduleInstance.cwrap('engine_new_game', null, []);
    _engine_load_fen = moduleInstance.cwrap('engine_load_fen', null, ['string']);
    _engine_search = moduleInstance.cwrap('engine_search', 'string', ['number', 'number']);
    _engine_get_legal_moves = moduleInstance.cwrap('engine_get_legal_moves', 'string', []);
    _engine_get_fen = moduleInstance.cwrap('engine_get_fen', 'string', []);
    _engine_make_move = moduleInstance.cwrap('engine_make_move', 'boolean', ['number', 'number', 'boolean', 'number', 'boolean', 'boolean', 'boolean']);
    _engine_is_in_check = moduleInstance.cwrap('engine_is_in_check', 'boolean', []);
    _engine_get_halfmove_clock = moduleInstance.cwrap('engine_get_halfmove_clock', 'number', []);
    _engine_is_threefold_repetition = moduleInstance.cwrap('engine_is_threefold_repetition', 'boolean', []);
    _engine_is_white_to_move = moduleInstance.cwrap('engine_is_white_to_move', 'boolean', []);
    _engine_get_board_squares = moduleInstance.cwrap('engine_get_board_squares', 'string', []);

    // Initialize the engine
    _engine_init();
}

export function engineInit(): void {
    _engine_init!();
}

export function engineNewGame(): void {
    _engine_new_game!();
}

export function engineLoadFen(fen: string): void {
    _engine_load_fen!(fen);
}

export function engineSearch(timeLimitMs: number, maxDepth: number): EngineResult {
    const jsonStr = _engine_search!(timeLimitMs, maxDepth);
    return JSON.parse(jsonStr) as EngineResult;
}

export function engineGetLegalMoves(): Move[] {
    const jsonStr = _engine_get_legal_moves!();
    return JSON.parse(jsonStr) as Move[];
}

export function engineGetFen(): string {
    return _engine_get_fen!();
}

export function engineMakeMove(move: Move): boolean {
    return _engine_make_move!(
        move.origin,
        move.destination,
        move.isPromotion || false,
        move.promotionPieceType || 0,
        move.isCastling || false,
        move.isEnPassant || false,
        move.isPawnTwoForward || false
    );
}

export function engineIsInCheck(): boolean {
    return _engine_is_in_check!();
}

export function engineGetHalfmoveClock(): number {
    return _engine_get_halfmove_clock!();
}

export function engineIsThreefoldRepetition(): boolean {
    return _engine_is_threefold_repetition!();
}

export function engineIsWhiteToMove(): boolean {
    return _engine_is_white_to_move!();
}

export function engineGetBoardSquares(): number[] {
    const jsonStr = _engine_get_board_squares!();
    return JSON.parse(jsonStr) as number[];
}
