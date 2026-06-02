import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';
import { useTheme } from '../contexts/ThemeContext';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Sections removed as requested

  return (
    <div className="landing-page">
      {/* Theme Toggle Button */}
      <button className="theme-toggle-btn" onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>

      {/* Simple chess related background */}
      <div className="chess-bg-pattern"></div>

      <div className="landing-content">

        {/* ── HERO ── */}
        <section className="hero-section">
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Chess Engine
          </div>

          <div className="engine-logo-static">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <text x="50" y="68" textAnchor="middle" fontSize="55" fill="currentColor">♞</text>
            </svg>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-astra">Astra</span>
            <span className="hero-title-chess"> Chess</span>
          </h1>

          <div className="hero-tagline">
            <span>C++17</span>
            <span>WebAssembly</span>
            <span>Alpha-Beta Pruning</span>
            <span>Deep Learning</span>
          </div>

          <div className="hero-cta-row">
            <Link to="/play" className="play-btn" id="play-now-btn">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
              Play vs Astra
            </Link>
            <a
              href="https://github.com/arpitsingh2492/Chess-Engine"
              target="_blank"
              rel="noopener noreferrer"
              className="github-btn"
              id="github-link-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              View Source
            </a>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <p>
          Designed &amp; engineered by{' '}
          <a href="https://github.com/arpitsingh2492" target="_blank" rel="noopener noreferrer">
            Arpit Singh
          </a>
          {' '}·{' '}
          <a href="https://www.linkedin.com/in/arpit-singh-86680734a" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          {' '}·{' '}
          <a href="https://github.com/arpitsingh2492/Chess-Engine" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
        <p className="footer-sub">Built from scratch — no chess libraries used</p>
      </footer>
    </div>
  );
};
