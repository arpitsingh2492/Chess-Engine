/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import { BoardState } from './board';
import { MoveGenerator } from './movegen';
import { Piece } from '../types';

const ctx: Worker = self as any;

let sfWorker: Worker | null = null;
let activeRequest: any = null;
let queuedRequest: any = null;
let isSearching = false;
let searchStartTime = 0;
let isWhiteToMove = true;

import { Variation } from '../types';

// Parsed data from info lines
let currentDepth = 0;
let currentNodes = 0;
let currentVariations: Variation[] = [];

// Create a local board just for move parsing
const board = new BoardState();

function initStockfish() {
  if (sfWorker) return;
  // Load the official Stockfish WASM worker
  sfWorker = new Worker('/stockfish/stockfish.js');
  
  sfWorker.onmessage = (e) => {
    const line = e.data;
    if (typeof line !== 'string') return;
    
    if (line.startsWith('info')) {
      const depthMatch = line.match(/depth (\d+)/);
      if (depthMatch) currentDepth = parseInt(depthMatch[1], 10);
      
      const nodesMatch = line.match(/nodes (\d+)/);
      if (nodesMatch) currentNodes = parseInt(nodesMatch[1], 10);

      const multipvMatch = line.match(/multipv (\d+)/);
      const pvIndex = multipvMatch ? parseInt(multipvMatch[1], 10) - 1 : 0;

      const scoreMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      let score = 0;
      let hasScore = false;
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
        hasScore = true;
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        score = mateIn > 0 ? 999999 : -999999;
        hasScore = true;
      }
      
      const pvMatch = line.match(/pv (.+)/);
      let pv: string[] = [];
      if (pvMatch) {
        pv = pvMatch[1].trim().split(' ');
      }

      if (!currentVariations[pvIndex]) {
        currentVariations[pvIndex] = { score: 0, pv: [] };
      }
      if (hasScore) {
        currentVariations[pvIndex].score = isWhiteToMove ? score : -score;
      }
      if (pvMatch) {
        currentVariations[pvIndex].pv = pv;
      }

      // Stream intermediate evaluation to UI for instant updates
      if (activeRequest) {
        ctx.postMessage({
          move: null,
          score: currentVariations[0]?.score || 0,
          depth: currentDepth,
          nodes: currentNodes,
          timeMs: Date.now() - searchStartTime,
          pv: currentVariations[0]?.pv || [],
          variations: [...currentVariations],
          type: 'info' // Mark as an intermediate info update
        });
      }
    }
    
    if (line.startsWith('bestmove')) {
      const match = line.match(/bestmove (\S+)/);
      if (match && activeRequest) {
        const uciMove = match[1]; // e.g. "e2e4" or "e7e8q"
        
        let moveObj = null;
        if (uciMove !== '(none)') {
          const file1 = uciMove.charCodeAt(0) - 97;
          const rank1 = parseInt(uciMove[1], 10) - 1;
          const file2 = uciMove.charCodeAt(2) - 97;
          const rank2 = parseInt(uciMove[3], 10) - 1;
          const origin = rank1 * 8 + file1;
          const destination = rank2 * 8 + file2;
          
          let promoType = 0;
          if (uciMove.length === 5) {
            const p = uciMove[4];
            if (p === 'q') promoType = Piece.Queen;
            if (p === 'r') promoType = Piece.Rook;
            if (p === 'b') promoType = Piece.Bishop;
            if (p === 'n') promoType = Piece.Knight;
          }

          const legalMoves = MoveGenerator.generateLegalMoves(board);
          moveObj = legalMoves.find(m => 
            m.origin === origin && 
            m.destination === destination && 
            (promoType === 0 || m.promotionPieceType === promoType)
          ) || null;
        }

        const elapsed = Date.now() - searchStartTime;

        const reqType = activeRequest.type;
        const reqMinDelay = activeRequest.minDelay;
        activeRequest = null; // Clear immediately so new requests can cancel properly
        
        const postResult = () => {
          ctx.postMessage({
            move: moveObj,
            score: currentVariations[0]?.score || 0,
            depth: currentDepth,
            nodes: currentNodes,
            timeMs: elapsed,
            pv: currentVariations[0]?.pv || [],
            variations: [...currentVariations],
            type: reqType
          });
        };

        // Artificial delay for fast moves (like 800 bot)
        if (reqType === 'game' && elapsed < reqMinDelay) {
          setTimeout(postResult, reqMinDelay - elapsed);
        } else {
          postResult();
        }

        isSearching = false;
        if (queuedRequest) {
          const nextReq = queuedRequest;
          queuedRequest = null;
          startSearch(nextReq);
        }
      }
    }
  };
  
  sfWorker.postMessage('uci');
  sfWorker.postMessage('setoption name Use NNUE value true');
  sfWorker.postMessage('isready');
}

function startSearch(requestData: any) {
  const { fen, timeLimit, maxDepth, type, botLevel } = requestData;
  
  isSearching = true;
  activeRequest = { 
    type, 
    minDelay: botLevel === '800' ? 800 : 0 
  };
  
  board.loadFromFen(fen);
  isWhiteToMove = fen.includes(' w ');

  searchStartTime = Date.now();
  currentDepth = 0;
  currentNodes = 0;
  currentVariations = [];

  sfWorker!.postMessage(`position fen ${fen}`);
  
  if (type === 'game') {
    let skillLevel = 20;
    if (botLevel === '800') skillLevel = 0;
    if (botLevel === '1500') skillLevel = 5;
    sfWorker!.postMessage(`setoption name Skill Level value ${skillLevel}`);
    sfWorker!.postMessage(`setoption name MultiPV value 1`);
  } else {
    sfWorker!.postMessage(`setoption name Skill Level value 20`);
    sfWorker!.postMessage(`setoption name MultiPV value 3`);
  }

  let limits = '';
  if (botLevel === '800' && type === 'game') {
    limits = 'depth 1';
  } else {
    limits = `movetime ${timeLimit}`;
    if (maxDepth) limits += ` depth ${maxDepth}`;
  }

  sfWorker!.postMessage(`go ${limits}`);
}

ctx.onmessage = (e: MessageEvent) => {
  initStockfish();
  
  if (isSearching) {
    queuedRequest = e.data;
    sfWorker!.postMessage('stop');
  } else {
    startSearch(e.data);
  }
};

export {};
