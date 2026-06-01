/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BoardState } from '../engine/board';
import { MoveGenerator } from '../engine/movegen';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerCard } from '../components/PlayerCard';
import { EvalBar } from '../components/EvalBar';
import { TabPanel } from '../components/TabPanel';
import { MoveHistory } from '../components/MoveHistory';
import { GameSetupModal } from '../components/GameSetupModal';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { Piece, Move, GameHistoryEntry, BoardTheme, EngineResult, BotLevel } from '../types';
import '../styles/game.css';

const BOT_CONFIG = {
  '800': { time: 500, depth: 4 },
  '1500': { time: 1500, depth: 7 },
  '2500': { time: 4000, depth: 10 }
};

export const GamePage: React.FC = () => {
  // Game state references
  const boardRef = useRef<BoardState>((() => {
    const b = new BoardState();
    b.setupStartingPosition();
    return b;
  })());

  const [squares, setSquares] = useState<number[]>([...boardRef.current.squares]);
  const [selectedSquare, setSelectedSquare] = useState<number>(-1);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<GameHistoryEntry[]>([]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('pearl');
  const [botLevel, setBotLevel] = useState<BotLevel>('1500');

  // App state
  const [isSetup, setIsSetup] = useState(true);
  const [activeTab, setActiveTab] = useState('moves');

  // History viewing
  const [viewIndex, setViewIndex] = useState<number>(-1);

  // Promotion handling
  const [activePromotion, setActivePromotion] = useState<{ origin: number; destination: number } | null>(null);

  // Statuses
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Select an opponent to start');
  const [gameResult, setGameResult] = useState<'active' | 'checkmate' | 'stalemate' | 'draw'>('active');

  // Engine analysis data
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Full game analysis state
  const [isAnalyzingGame, setIsAnalyzingGame] = useState(false);
  const [analysisEvals, setAnalysisEvals] = useState<(number | null)[]>([]);

  // Lichess cloud evaluation
  const [lichessScore, setLichessScore] = useState<number | null>(null);
  const lichessFetchRef = useRef<AbortController | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), {
      type: 'module'
    });

    const initialMoves = MoveGenerator.generateLegalMoves(boardRef.current);
    setLegalMoves(initialMoves);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Worker message handling (needs up-to-date closures)
  useEffect(() => {
    if (!workerRef.current) return;

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { move, score, depth, nodes, timeMs, pv, type } = e.data;

      if (type === 'game') {
        // Only execute move if it's the AI's turn playing and game is active
        if (move && move.origin !== -1 && gameResult === 'active' && !isSetup) {
          executeGameMove(move);
        }
        setAiIsThinking(false);
      } else {
        // 'view_analysis' type — update the eval display
        setEngineResult({ move, score, depth, nodes, timeMs, pv });
      }
    };
  }, [gameResult, viewIndex, playerColor, botLevel, isSetup]);

  const handlePrevMove = () => {
    if (moveHistory.length === 0 || isSetup) return;
    setViewIndex(prev => {
      const current = prev === -1 ? moveHistory.length : prev;
      return Math.max(0, current - 1);
    });
  };

  const handleNextMove = () => {
    if (moveHistory.length === 0 || isSetup) return;
    setViewIndex(prev => {
      const current = prev === -1 ? moveHistory.length : prev;
      const next = current + 1;
      return next >= moveHistory.length ? -1 : next;
    });
  };

  // Keyboard navigation for moves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (moveHistory.length === 0 || isSetup) return;
      if (e.key === 'ArrowLeft') {
        handlePrevMove();
      } else if (e.key === 'ArrowRight') {
        handleNextMove();
      } else if (e.key === 'ArrowUp') {
        setViewIndex(0);
      } else if (e.key === 'ArrowDown') {
        setViewIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHistory.length, isSetup]);

  // Fast analysis when browsing history or if showAnalysis is toggled on
  useEffect(() => {
    if (!showAnalysis || isAnalyzingGame || isSetup) return;
    
    // Clear old result to show "Calculating..." instantly while scrolling history
    setEngineResult(null);

    let fen = '';
    if (viewIndex === -1 || viewIndex === moveHistory.length) {
      fen = boardRef.current.getCurrentFen();
    } else if (viewIndex === 0) {
      fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    } else {
      fen = moveHistory[viewIndex - 1].fenAfter;
    }

    workerRef.current?.postMessage({
      fen,
      timeLimit: 500, // Fast 0.5s response for interactive analysis
      maxDepth: 16,
      type: 'view_analysis'
    });
  }, [viewIndex, moveHistory.length, showAnalysis, isAnalyzingGame, isSetup]);

  // Lichess cloud eval — fetch real evaluation from Lichess API
  useEffect(() => {
    if (!showAnalysis || isSetup) return;

    // Abort any in-flight request
    lichessFetchRef.current?.abort();
    const controller = new AbortController();
    lichessFetchRef.current = controller;

    let fen = '';
    if (viewIndex === -1 || viewIndex === moveHistory.length) {
      fen = boardRef.current.getCurrentFen();
    } else if (viewIndex === 0) {
      fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    } else {
      fen = moveHistory[viewIndex - 1].fenAfter;
    }

    setLichessScore(null); // clear while loading

    fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || !data.pvs || data.pvs.length === 0) return;
        const pv = data.pvs[0];
        if (pv.mate !== undefined) {
          // Mate score: use large sentinel value
          setLichessScore(pv.mate > 0 ? 999999 : -999999);
        } else if (pv.cp !== undefined) {
          setLichessScore(pv.cp); // centipawns, positive = white advantage
        }
      })
      .catch(() => {}); // ignore aborts / network errors

    return () => controller.abort();
  }, [viewIndex, moveHistory.length, showAnalysis, isSetup, squares]);

  // Compute displayed board based on viewIndex
  const displayedBoardState = React.useMemo(() => {
    const tempBoard = new BoardState();
    if (viewIndex === -1 || viewIndex === moveHistory.length) {
      tempBoard.loadFromFen(boardRef.current.getCurrentFen());
    } else if (viewIndex === 0) {
      tempBoard.setupStartingPosition();
    } else {
      tempBoard.loadFromFen(moveHistory[viewIndex - 1].fenAfter);
    }
    return tempBoard;
  }, [squares, viewIndex, moveHistory]);

  const displayedSquares = displayedBoardState.squares;

  const displayedLastMove = viewIndex === -1 || viewIndex === moveHistory.length
    ? lastMove
    : (viewIndex === 0 ? null : moveHistory[viewIndex - 1].move);

  // Determine which eval score to show
  // Priority: 1) Lichess cloud eval (most accurate), 2) analysisEvals, 3) engine local
  let currentScore = engineResult?.score ?? 0;
  
  // Convert local engine score to White's perspective
  if (engineResult !== null) {
    const isWhiteToMove = displayedBoardState.whiteToMove;
    if (!isWhiteToMove) {
      currentScore = -currentScore;
    }
  }

  if (analysisEvals.length > 0) {
    const evalIndex = viewIndex === -1 ? moveHistory.length - 1 : viewIndex - 1;
    if (evalIndex >= 0 && evalIndex < analysisEvals.length && analysisEvals[evalIndex] !== null) {
      currentScore = analysisEvals[evalIndex]!;
      // Convert it to White's perspective if needed
      const isWhiteToMove = displayedBoardState.whiteToMove;
      if (!isWhiteToMove) {
        currentScore = -currentScore;
      }
    }
  }

  // Override with Lichess cloud eval if available (more accurate, already from White's perspective)
  if (lichessScore !== null) {
    currentScore = lichessScore;
  }

  // Turn logic
  useEffect(() => {
    if (isSetup) return;

    const board = boardRef.current;
    const currentMoves = MoveGenerator.generateLegalMoves(board);
    setLegalMoves(currentMoves);

    const isWhiteTurn = board.whiteToMove;
    const aiColor = playerColor === 'white' ? 'black' : 'white';
    const isAiTurn = (isWhiteTurn && aiColor === 'white') || (!isWhiteTurn && aiColor === 'black');

    if (currentMoves.length === 0) {
      const kingIndex = isWhiteTurn ? 0 : 1;
      const inCheck = MoveGenerator.isSquareAttacked(board, board.kingSquare[kingIndex], isWhiteTurn ? Piece.Black : Piece.White);
      if (inCheck) {
        const winner = isWhiteTurn ? (playerColor === 'white' ? 'Astra' : 'You') : (playerColor === 'white' ? 'You' : 'Astra');
        setStatusMessage(`Checkmate — ${winner} wins!`);
        setGameResult('checkmate');
      } else {
        setStatusMessage('Stalemate — Draw');
        setGameResult('stalemate');
      }
      return;
    }

    if (board.halfmoveClock >= 100) {
      setStatusMessage('Draw by 50-move rule');
      setGameResult('draw');
      return;
    }

    if (board.isThreefoldRepetition()) {
      setStatusMessage('Draw by threefold repetition');
      setGameResult('draw');
      return;
    }

    // Only trigger AI if we are at the present move
    if (isAiTurn && gameResult === 'active' && !isAnalyzingGame && viewIndex === -1) {
      setAiIsThinking(true);
      setStatusMessage('Thinking...');
      
      const config = BOT_CONFIG[botLevel as keyof typeof BOT_CONFIG];
      workerRef.current?.postMessage({
        fen: board.getCurrentFen(),
        timeLimit: config.time,
        maxDepth: config.depth,
        type: 'game'
      });
    } else if (gameResult === 'active') {
      setStatusMessage(viewIndex === -1 ? 'Your turn' : 'Reviewing past moves');
    }
  }, [squares, playerColor, gameResult, botLevel, viewIndex, isSetup]);

  const convertToSan = (move: Move, prevSquares: number[]): string => {
    if (move.isCastling) {
      return (move.destination % 8) === 6 ? 'O-O' : 'O-O-O';
    }
    const piece = prevSquares[move.origin];
    const type = Piece.getPieceType(piece);
    const target = prevSquares[move.destination];
    const isCapture = target !== Piece.Empty || move.isEnPassant;
    const file = String.fromCharCode(97 + (move.destination % 8));
    const rank = String(Math.floor(move.destination / 8) + 1);
    if (type === Piece.Pawn) {
      if (isCapture) {
        const origFile = String.fromCharCode(97 + (move.origin % 8));
        return `${origFile}x${file}${rank}`;
      }
      return `${file}${rank}`;
    }
    const typeChar = type === Piece.Knight ? 'N' : type === Piece.Bishop ? 'B' : type === Piece.Rook ? 'R' : type === Piece.Queen ? 'Q' : type === Piece.King ? 'K' : '';
    const captureChar = isCapture ? 'x' : '';
    return `${typeChar}${captureChar}${file}${rank}`;
  };

  const executeGameMove = (move: Move) => {
    // If we are making a move while viewing history, truncate history
    if (viewIndex !== -1 && viewIndex < moveHistory.length) {
      const fenToRestore = viewIndex === 0 
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
        : moveHistory[viewIndex - 1].fenAfter;
      boardRef.current.loadFromFen(fenToRestore);
      setMoveHistory(prev => prev.slice(0, viewIndex));
      if (analysisEvals.length > 0) {
        setAnalysisEvals(prev => prev.slice(0, viewIndex));
      }
    }
    
    setViewIndex(-1);

    const board = boardRef.current;
    const san = convertToSan(move, board.squares);
    const fenBefore = board.getCurrentFen();

    board.executeMove(move);

    const fenAfter = board.getCurrentFen();
    const historyEntry: GameHistoryEntry = { move, san, fenBefore, fenAfter };

    setMoveHistory((prev) => [...prev, historyEntry]);
    setSquares([...board.squares]);
    setLastMove(move);
    setSelectedSquare(-1);
  };

  const handleSquareClick = (squareIndex: number) => {
    if (aiIsThinking || gameResult !== 'active' || isSetup) return;

    const board = boardRef.current;
    
    // Temporarily swap to the viewed board state to check legality if viewing history
    const tempBoard = new BoardState();
    let isWhiteTurn = board.whiteToMove;
    let currentLegalMoves = legalMoves;

    if (viewIndex !== -1) {
      const fen = viewIndex === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moveHistory[viewIndex - 1].fenAfter;
      tempBoard.loadFromFen(fen);
      isWhiteTurn = tempBoard.whiteToMove;
      currentLegalMoves = MoveGenerator.generateLegalMoves(tempBoard);
    } else {
      tempBoard.loadFromFen(board.getCurrentFen());
    }

    const piece = tempBoard.squares[squareIndex];
    const isPlayerTurn = (isWhiteTurn && playerColor === 'white') || (!isWhiteTurn && playerColor === 'black');

    if (!isPlayerTurn) return;

    const isFriendly = piece !== Piece.Empty &&
      ((playerColor === 'white' && Piece.isWhite(piece)) || (playerColor === 'black' && Piece.isBlack(piece)));

    if (isFriendly) {
      setSelectedSquare(squareIndex);
      return;
    }

    if (selectedSquare !== -1) {
      const match = currentLegalMoves.find(m => m.origin === selectedSquare && m.destination === squareIndex);
      if (match) {
        if (match.isPromotion) {
          setActivePromotion({ origin: selectedSquare, destination: squareIndex });
        } else {
          executeGameMove(match);
        }
      } else {
        setSelectedSquare(-1);
      }
    }
  };

  const handlePromotionSelect = (type: number) => {
    if (!activePromotion) return;
    
    const tempBoard = new BoardState();
    if (viewIndex !== -1) {
      const fen = viewIndex === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moveHistory[viewIndex - 1].fenAfter;
      tempBoard.loadFromFen(fen);
    } else {
      tempBoard.loadFromFen(boardRef.current.getCurrentFen());
    }

    const moves = MoveGenerator.generateLegalMoves(tempBoard);
    const promoMove = moves.find(
      m => m.origin === activePromotion.origin &&
           m.destination === activePromotion.destination &&
           m.promotionPieceType === type
    );

    if (promoMove) {
      executeGameMove(promoMove);
    }
    setActivePromotion(null);
  };

  const handleStartGame = (color: 'white' | 'black', level: BotLevel) => {
    const board = boardRef.current;
    board.setupStartingPosition();
    setSquares([...board.squares]);
    setSelectedSquare(-1);
    setLastMove(null);
    setMoveHistory([]);
    setPlayerColor(color);
    setBotLevel(level);
    setGameResult('active');
    setEngineResult(null);
    setAnalysisEvals([]);
    setIsAnalyzingGame(false);
    setViewIndex(-1);
    setIsSetup(false);
    setActiveTab('moves');
    setStatusMessage(color === 'white' ? 'Your turn' : 'Thinking...');
  };

  const handleShowSetup = () => {
    setIsSetup(true);
  };

  const handleUndo = () => {
    if (aiIsThinking || moveHistory.length < 2) return;
    const board = boardRef.current;
    board.undoMove();
    board.undoMove();
    setMoveHistory((prev) => prev.slice(0, -2));
    setSquares([...board.squares]);
    setLastMove(null);
    setSelectedSquare(-1);
    setGameResult('active');
    setAnalysisEvals([]);
    setViewIndex(-1);
    setStatusMessage('Your turn');
    setEngineResult(null);
  };

  const isWhiteTurn = viewIndex === -1 ? boardRef.current.whiteToMove : viewIndex % 2 === 0;
  const startMoveNum = viewIndex === -1 ? Math.floor(moveHistory.length / 2) + 1 : Math.floor(viewIndex / 2) + 1;
  const aiColor = playerColor === 'white' ? 'black' : 'white';
  const topPlayerColor = playerColor === 'white' ? 'black' : 'white';
  const bottomPlayerColor = playerColor;
  const topIsEngine = topPlayerColor === aiColor;
  const bottomIsEngine = bottomPlayerColor === aiColor;
  
  const topStatusText = topIsEngine && aiIsThinking ? statusMessage : '';
  const bottomStatusText = !topIsEngine && !aiIsThinking && gameResult === 'active' && viewIndex === -1 ? statusMessage : '';

  const tabs = [
    { id: 'moves', label: 'Moves', icon: '📋' }
  ];

  return (
    <div className="game-page" data-board-theme={boardTheme}>
      {isSetup && <GameSetupModal onStartGame={handleStartGame} />}
      
      <nav className="game-nav">
        <div className="game-nav-left">
          <Link to="/" className="game-nav-logo" id="nav-home-link">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
              <defs>
                <linearGradient id="nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#629924" />
                  <stop offset="100%" stopColor="#5b9bd5" />
                </linearGradient>
              </defs>
              <text x="50" y="72" textAnchor="middle" fontSize="60" fill="url(#nav-grad)">♞</text>
            </svg>
            Astra Chess
          </Link>
          <div className="nav-divider" />
          <Link to="/" className="back-link" id="back-home-link">← Home</Link>
        </div>

        {/* CENTER STATUS */}
        {!isSetup && (
          <div className="game-nav-status">
            {gameResult !== 'active' ? (
              <span className="nav-status-text game-over">
                {statusMessage}
              </span>
            ) : aiIsThinking ? (
              <span className="nav-status-text thinking">
                Astra is thinking
                <span className="nav-thinking-dots">
                  <span /><span /><span />
                </span>
              </span>
            ) : (
              <span className="nav-status-text your-turn">
                ● Your turn
              </span>
            )}
          </div>
        )}

        <div className="game-nav-right">
          {/* Board theme switcher */}
          <div className="theme-switcher" title="Board theme">
            {([
              { id: 'pearl',    light: '#f5f5f5', dark: '#2e313a',  label: 'Black & White' },
              { id: 'obsidian', light: '#c8b89a', dark: '#3d2b1f',  label: 'Obsidian' },
              { id: 'lichess',  light: '#f0d9b5', dark: '#b58863',  label: 'Classic' },
              { id: 'blue',     light: '#dee3e6', dark: '#8ca2ad',  label: 'Ocean' },
              { id: 'wood',     light: '#eedcbe', dark: '#9b5e2a',  label: 'Walnut' },
              { id: 'midnight', light: '#2a2a3e', dark: '#111120',  label: 'Midnight' },
            ] as { id: BoardTheme; light: string; dark: string; label: string }[]).map(t => (
              <div
                key={t.id}
                className={`theme-swatch ${boardTheme === t.id ? 'active' : ''}`}
                title={t.label}
                onClick={() => setBoardTheme(t.id)}
              >
                <div className="theme-swatch-cell" style={{ background: t.light }} />
                <div className="theme-swatch-cell" style={{ background: t.dark }} />
                <div className="theme-swatch-cell" style={{ background: t.dark }} />
                <div className="theme-swatch-cell" style={{ background: t.light }} />
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="game-layout">
        <div className="board-col">
          <PlayerCard
            name={topIsEngine ? `Astra` : 'You'}
            isEngine={topIsEngine}
            botLevel={topIsEngine ? botLevel : undefined}
            isActive={topPlayerColor === 'white' ? isWhiteTurn : !isWhiteTurn}
            isThinking={topIsEngine && aiIsThinking}
            squares={displayedSquares}
            playerColor={topPlayerColor}
            capturedByThisPlayer={topPlayerColor === 'white' ? 'black' : 'white'}
            statusText={topStatusText}
          />

          <div className="board-and-eval">
            {showAnalysis && !isSetup && (
              <div className="eval-bar-col">
                <EvalBar score={currentScore} isFlipped={playerColor === 'black'} />
              </div>
            )}
            <div className="board-wrapper">
              <ChessBoard
                squares={displayedSquares}
                selectedSquare={selectedSquare}
                legalMoves={viewIndex === -1 && !isSetup ? legalMoves : []} 
                lastMove={displayedLastMove}
                isFlipped={playerColor === 'black'}
                onSquareClick={handleSquareClick}
              />
            </div>
          </div>

          <PlayerCard
            name={bottomIsEngine ? `Astra` : 'You'}
            isEngine={bottomIsEngine}
            botLevel={bottomIsEngine ? botLevel : undefined}
            isActive={bottomPlayerColor === 'white' ? isWhiteTurn : !isWhiteTurn}
            isThinking={bottomIsEngine && aiIsThinking}
            squares={displayedSquares}
            playerColor={bottomPlayerColor}
            capturedByThisPlayer={bottomPlayerColor === 'white' ? 'black' : 'white'}
            statusText={bottomStatusText}
          />
        </div>

        <div className="sidebar-col">
          <TabPanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'moves' && (
              <div className="sidebar-flex-col">
                <AnalysisPanel 
                  engineResult={engineResult} 
                  isThinking={aiIsThinking || isAnalyzingGame} 
                  startMoveNum={startMoveNum}
                  isWhiteTurn={isWhiteTurn}
                  showAnalysis={showAnalysis}
                  onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
                />
                
                <div className="moves-scroll-area">
                  {moveHistory.length === 0 && !isSetup ? (
                    <div className="moves-empty">No moves played yet</div>
                  ) : (
                    <MoveHistory
                      history={moveHistory}
                      currentMoveIndex={viewIndex === -1 ? moveHistory.length - 1 : viewIndex - 1}
                      analysisEvals={analysisEvals.length > 0 ? analysisEvals : undefined}
                    />
                  )}
                </div>

                {!isSetup && (
                  <>
                    <div className="history-nav-hint">
                      <button className="nav-arrow-btn" onClick={handlePrevMove} disabled={moveHistory.length === 0 || viewIndex === 0} title="Previous Move">
                        ←
                      </button>
                      <span className="nav-hint-text">navigate moves</span>
                      <button className="nav-arrow-btn" onClick={handleNextMove} disabled={moveHistory.length === 0 || viewIndex === -1} title="Next Move">
                        →
                      </button>
                    </div>
                    <div className="sidebar-actions">
                      <button className="action-btn" onClick={handleUndo} disabled={aiIsThinking || moveHistory.length < 2 || viewIndex !== -1} title="Take back move">
                        ↩ Undo
                      </button>
                      <button className="action-btn danger-btn" onClick={() => { setGameResult('checkmate'); setStatusMessage('You resigned — Astra wins'); }} disabled={aiIsThinking || gameResult !== 'active' || viewIndex !== -1} title="Resign">
                        🏳 Resign
                      </button>
                      <button className="action-btn primary-btn" onClick={handleShowSetup} title="New Game">
                        ✦ New Game
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabPanel>
        </div>
      </div>
      
      {activePromotion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(6px)', gap: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Choose promotion piece</div>
          <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px var(--border-subtle)' }}>
            {[ { type: Piece.Queen, label: '♕', name: 'Queen' }, { type: Piece.Rook, label: '♖', name: 'Rook' }, { type: Piece.Bishop, label: '♗', name: 'Bishop' }, { type: Piece.Knight, label: '♘', name: 'Knight' } ].map((opt) => (
              <button
                key={opt.type}
                onClick={() => handlePromotionSelect(opt.type)}
                title={opt.name}
                style={{ width: '72px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '2.6rem', background: 'var(--bg-surface)', border: '2px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.15s', lineHeight: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(98,153,36,0.2)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = ''; }}
              >
                {opt.label}
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-primary)', letterSpacing: '0.3px' }}>{opt.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="game-footer-brand">Astra 1.0</div>
    </div>
  );
};
