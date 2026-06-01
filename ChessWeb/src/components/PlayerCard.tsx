import React from 'react';
import { Piece, BotLevel } from '../types';

interface PlayerCardProps {
  name: string;
  isEngine: boolean;
  botLevel?: BotLevel;
  isActive: boolean;
  isThinking: boolean;
  squares: number[];
  playerColor: 'white' | 'black';
  capturedByThisPlayer: 'white' | 'black';
  statusText?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  isEngine,
  botLevel,
  isActive,
  isThinking,
  squares,
  playerColor,
  capturedByThisPlayer,
  statusText
}) => {
  const startCounts = {
    [Piece.Pawn]: 8,
    [Piece.Knight]: 2,
    [Piece.Bishop]: 2,
    [Piece.Rook]: 2,
    [Piece.Queen]: 1
  };

  const values = {
    [Piece.Pawn]: 1,
    [Piece.Knight]: 3,
    [Piece.Bishop]: 3,
    [Piece.Rook]: 5,
    [Piece.Queen]: 9
  };

  const symbolsBlack: Record<number, string> = {
    [Piece.Pawn]: '♟',
    [Piece.Knight]: '♞',
    [Piece.Bishop]: '♝',
    [Piece.Rook]: '♜',
    [Piece.Queen]: '♛'
  };

  const symbolsWhite: Record<number, string> = {
    [Piece.Pawn]: '♙',
    [Piece.Knight]: '♘',
    [Piece.Bishop]: '♗',
    [Piece.Rook]: '♖',
    [Piece.Queen]: '♕'
  };

  const symbols =
    capturedByThisPlayer === 'white'
      ? symbolsWhite
      : symbolsBlack;

  const currentCounts = {
    white: { [Piece.Pawn]: 0, [Piece.Knight]: 0, [Piece.Bishop]: 0, [Piece.Rook]: 0, [Piece.Queen]: 0 },
    black: { [Piece.Pawn]: 0, [Piece.Knight]: 0, [Piece.Bishop]: 0, [Piece.Rook]: 0, [Piece.Queen]: 0 }
  };

  for (const piece of squares) {
    if (piece === Piece.Empty) continue;
    const type = Piece.getPieceType(piece);
    if (type === Piece.King) continue;
    const side = Piece.isWhite(piece) ? 'white' : 'black';
    if (type in currentCounts[side]) {
      currentCounts[side][type as keyof typeof startCounts]++;
    }
  }

  const capturedColor = capturedByThisPlayer;
  const thisPlayerColor = playerColor;
  const captured: { type: number; count: number }[] = [];

  let scoreFor = 0;
  let scoreOpponent = 0;

  const pieceTypes = [Piece.Queen, Piece.Rook, Piece.Bishop, Piece.Knight, Piece.Pawn];

  for (const type of pieceTypes) {
    const val = values[type as keyof typeof values];
    const opponentOnBoard = currentCounts[capturedColor][type as keyof typeof startCounts];
    const opponentStart = startCounts[type as keyof typeof startCounts];
    const opponentCaptured = Math.max(0, opponentStart - opponentOnBoard);

    if (opponentCaptured > 0) {
      captured.push({ type, count: opponentCaptured });
    }

    scoreFor += currentCounts[thisPlayerColor][type as keyof typeof startCounts] * val;
    scoreOpponent += currentCounts[capturedColor][type as keyof typeof startCounts] * val;
  }

  const diff = scoreFor - scoreOpponent;

  return (
    <div className={`player-card ${isActive ? 'active' : ''}`}>

      {/* MAIN ROW: left = avatar+name+badge, right = captured pieces */}
      <div className="player-card-main">

        {/* LEFT SIDE */}
        <div className="player-card-left">
          <div className={`player-card-avatar ${isEngine ? 'engine' : 'human'}`}>
            {isEngine ? '🤖' : '👤'}
          </div>
          <div className="player-card-info">
            <div className="player-card-name">
              {name}
              {isEngine && botLevel && (
                <span className="engine-badge">{botLevel}</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — captured pieces inline */}
        <div className="player-card-captures">
          {captured.map((c) => (
            <span key={c.type} className={`captured-group color-${capturedColor}`}>
              {Array.from({ length: c.count }).map((_, i) => (
                <span key={i} className="captured-icon">{symbols[c.type]}</span>
              ))}
            </span>
          ))}
          {diff > 0 && (
            <span className="material-diff">+{diff}</span>
          )}
        </div>
      </div>

      {/* FOOTER ROW: status / thinking */}
      {(statusText || isThinking) && (
        <div className="player-card-footer">
          {statusText && <span className="player-footer-text">{statusText}</span>}
          {isThinking && (
            <span className="thinking-indicator">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};