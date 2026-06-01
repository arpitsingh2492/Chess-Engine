import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

export const LandingPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated board pattern in the background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sq = 52;
      const cols = Math.ceil(canvas.width / sq) + 2;
      const rows = Math.ceil(canvas.height / sq) + 2;
      const t = frame * 0.003;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isLight = (r + c) % 2 === 0;
          const glow = Math.sin(t + r * 0.3 + c * 0.2) * 0.5 + 0.5;
          ctx.fillStyle = isLight
            ? `rgba(98,153,36,${0.018 + glow * 0.012})`
            : `rgba(0,0,0,${0.04})`;
          ctx.fillRect(c * sq - sq, r * sq, sq, sq);
        }
      }
      frame++;
      requestAnimationFrame(draw);
    };
    const animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const TECH_STATS = [
    { label: 'Search Algorithm', value: 'Alpha-Beta Pruning' },
    { label: 'Deepening Strategy', value: 'Iterative Deepening' },
    { label: 'Tactical Search', value: 'Quiescence Search' },
    { label: 'Move Ordering', value: 'MVV-LVA Heuristic' },
    { label: 'Draw Detection', value: '50-move / 3-fold' },
    { label: 'Implementation', value: 'TypeScript + Web Workers' },
  ];

  return (
    <div className="landing-page">
      {/* Animated chess board background */}
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* Gradient overlays */}
      <div className="landing-glow landing-glow-tl" />
      <div className="landing-glow landing-glow-br" />

      <div className="landing-content">

        {/* ── HERO ── */}
        <section className="hero-section">
          <div className="engine-badge">
            <span className="engine-badge-dot" />
            Chess Engine · TypeScript · Open Source
          </div>

          <div className="engine-logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="knight-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#629924" />
                  <stop offset="100%" stopColor="#5b9bd5" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="url(#knight-grad)" strokeWidth="2" opacity="0.5" />
              <text x="50" y="68" textAnchor="middle" fontSize="55" fill="url(#knight-grad)" style={{ filter: 'drop-shadow(0 2px 12px rgba(98,153,36,0.7))' }}>♞</text>
            </svg>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-astra">Astra</span>
            <span className="hero-title-chess"> Chess</span>
          </h1>

          <p className="hero-subtitle">
            A fully hand-crafted chess engine — built from scratch in TypeScript,<br />
            running live in your browser with no server required.
          </p>

          <div className="hero-tagline">
            <span>Alpha-Beta Pruning</span>
            <span>Iterative Deepening</span>
            <span>Quiescence Search</span>
            <span>MVV-LVA Ordering</span>
          </div>

          <div className="hero-cta-row">
            <Link to="/play" className="play-btn" id="play-now-btn">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
              Play vs Astra
            </Link>
            <a
              href="https://github.com/arpitsingh2492/astra-chess"
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

        {/* ── TECH SPEC GRID ── */}
        <section className="tech-grid-section">
          <h2 className="section-label">Under the Hood</h2>
          <div className="tech-grid">
            {TECH_STATS.map((s) => (
              <div className="tech-card" key={s.label}>
                <div className="tech-card-value">{s.value}</div>
                <div className="tech-card-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-card-icon">⚡</span>
              <h3>Sub-Second Thinking</h3>
              <p>
                Runs entirely in a Web Worker — the UI stays perfectly smooth while the
                engine evaluates millions of positions at multiple difficulty levels.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-card-icon">📊</span>
              <h3>Real-Time Analysis</h3>
              <p>
                Toggle the analysis bar to see the evaluation score and best variation for
                every move in your game — just like Lichess, powered by Astra.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-card-icon">🎨</span>
              <h3>Polished Interface</h3>
              <p>
                Multiple board themes, piece sets, keyboard move navigation, promotion
                UI, threefold &amp; 50-move draw detection, and a fully responsive layout.
              </p>
            </div>
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
          <a href="https://github.com/arpitsingh2492/astra-chess" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
        <p className="footer-sub">Built from scratch — no chess libraries used</p>
      </footer>
    </div>
  );
};
