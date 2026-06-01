/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React, { useState } from 'react';
import { BotLevel } from '../types';

interface GameSetupModalProps {
  onStartGame: (color: 'white' | 'black', level: BotLevel) => void;
}

const LEVELS: { value: BotLevel; label: string; desc: string; emoji: string }[] = [
  { value: '800',  label: '800',  desc: 'Beginner',  emoji: '🌱' },
  { value: '1500', label: '1500', desc: 'Intermediate', emoji: '⚔️' },
  { value: '2500', label: '2500', desc: 'Master',    emoji: '👑' },
];

export const GameSetupModal: React.FC<GameSetupModalProps> = ({ onStartGame }) => {
  const [selectedLevel, setSelectedLevel] = useState<BotLevel>('1500');

  const handleSideSelect = (side: 'white' | 'black' | 'random') => {
    let finalSide: 'white' | 'black' = side === 'random'
      ? (Math.random() < 0.5 ? 'white' : 'black')
      : side;
    onStartGame(finalSide, selectedLevel);
  };

  return (
    <div className="setup-modal-overlay">
      <div className="setup-modal">
        <div className="setup-modal-header">
          <h2>New Game</h2>
          <p>Configure your match against Astra</p>
        </div>

        <div className="setup-modal-body">
          <div className="setup-section">
            <h3 className="setup-label">Bot Strength</h3>
            <div className="strength-selector">
              {LEVELS.map(lvl => (
                <button
                  key={lvl.value}
                  className={`strength-btn ${selectedLevel === lvl.value ? 'active' : ''}`}
                  onClick={() => setSelectedLevel(lvl.value)}
                >
                  <span>{lvl.emoji} {lvl.label}</span>
                  <span className="rating-label">{lvl.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <h3 className="setup-label">Play As</h3>
            <div className="side-selector">
              <button className="side-btn black-side" onClick={() => handleSideSelect('black')}>
                <span className="side-icon">♚</span>
                <span className="side-label">Black</span>
              </button>
              <button className="side-btn random-side" onClick={() => handleSideSelect('random')}>
                <span className="side-icon">⚄</span>
                <span className="side-label">Random</span>
              </button>
              <button className="side-btn white-side" onClick={() => handleSideSelect('white')}>
                <span className="side-icon">♔</span>
                <span className="side-label">White</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
