# Astra Chess ♞

> **A fully hand-crafted chess engine built from scratch in TypeScript — running live in your browser with no server required.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-629924?style=for-the-badge)](https://arpitsingh2492.github.io/astra-chess/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## ✨ What is Astra?

Astra Chess is a **complete chess application** — both the game engine and the UI — written entirely from scratch. No chess libraries (like Stockfish) are used anywhere. Every rule, every move, every evaluation score is computed by code I wrote.

This project was built as a showcase of **systems programming** and **algorithm design** skills, and demonstrates how complex AI search algorithms work in practice.

---

## 🔬 Engine Architecture

The engine runs in a **Web Worker** (separate thread) so the UI is always smooth and responsive while the engine searches.

### Search
| Technique | Description |
|---|---|
| **Alpha-Beta Pruning** | Core minimax tree search with α-β cutoffs — eliminates branches that cannot affect the result |
| **Iterative Deepening** | Searches depth 1, 2, 3... up to a time limit — allows anytime termination with best available move |
| **Quiescence Search** | Extends search at leaf nodes for captures to avoid the horizon effect |
| **Move Ordering** | MVV-LVA (Most Valuable Victim – Least Valuable Attacker) for capture ordering; improves pruning efficiency |

### Evaluation
| Feature | Description |
|---|---|
| **Material Count** | Standard piece values (P=100, N=320, B=330, R=500, Q=900) |
| **Piece-Square Tables** | Bonus/penalty per piece per square — encourages center control, king safety |
| **King Safety** | Penalises open files near king, rewards castled position |

### Rules
| Rule | Implemented |
|---|---|
| En passant | ✅ |
| Castling (K-side & Q-side) | ✅ |
| Pawn promotion (any piece) | ✅ |
| 50-move rule | ✅ |
| Threefold repetition | ✅ |
| Stalemate | ✅ |
| Check / Checkmate detection | ✅ |

---

## 🎮 Features

- **Three difficulty levels** — Beginner · Intermediate · Master
- **Real-time analysis bar** — Toggle evaluation bar + best variation (like Lichess)
- **Keyboard navigation** — Browse moves with ← → arrow keys
- **Move history** — Full PGN-style move list with position highlighting
- **Undo** — Take back your last move pair
- **Multiple board themes** — Lichess, Chess.com, Blue, Walnut, Dark
- **Responsive design** — Works on desktop and mobile

---

## 🚀 Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/arpitsingh2492/astra-chess.git
cd astra-chess

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# → Open http://localhost:5173
```

### Build for Production

```bash
npm run build
# Output is in ./dist — can be served as a static site
```

### Preview Production Build

```bash
npm run preview
```

---

## 🌐 Deploy to GitHub Pages

```bash
# 1. Add homepage to package.json (already done if you forked this repo)
# 2. Build
npm run build

# 3. Deploy (using gh-pages)
npx gh-pages -d dist
```

Or use the included GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment on every push to `main`.

---

## 🗂️ Project Structure

```
src/
├── engine/
│   ├── board.ts          # Board representation (10×10 mailbox)
│   ├── movegen.ts        # Legal move generation
│   ├── evaluate.ts       # Position evaluation
│   ├── search.ts         # Alpha-beta search + iterative deepening
│   └── engine.worker.ts  # Web Worker wrapper
├── components/
│   ├── ChessBoard.tsx    # Interactive board rendering
│   ├── EvalBar.tsx       # Smooth evaluation bar (sigmoid + lerp)
│   ├── MoveHistory.tsx   # Move list with navigation
│   ├── AnalysisPanel.tsx # Analysis toggle + best line display
│   └── ...
├── pages/
│   ├── LandingPage.tsx   # Hero landing page
│   └── GamePage.tsx      # Main game view
└── styles/
    ├── index.css         # Design tokens & global styles
    ├── game.css          # Game layout styles
    └── landing.css       # Landing page styles
```

---

## 🧪 Testing the Engine

You can test the engine's strength:

1. **Play against it** at all three difficulty levels
2. **Use the Analysis bar** — flip it on and navigate through moves to see eval scores
3. **Benchmark** — uncomment the benchmark in `engine.worker.ts` to see nodes/second

### Lichess Engine Testing
You can test Astra against other engines by exporting a game as PGN and pasting it into Lichess's Analysis board.

---

## 🛠️ Tech Stack

- **TypeScript** — Full type safety across engine + UI
- **React 19** — Component-based UI with hooks
- **Vite** — Lightning-fast bundler with Web Worker support
- **React Router** — Client-side routing (Landing → Game)
- **Web Workers API** — Off-thread engine search

---

## 👤 Author

**Arpit Singh**

- GitHub: [@arpitsingh2492](https://github.com/arpitsingh2492)
- LinkedIn: [arpit-singh-86680734a](https://www.linkedin.com/in/arpit-singh-86680734a)

---

## 📄 License

MIT License — feel free to fork, study, and build on it.

---

*"No Stockfish. No chess.js. Every move generated, evaluated, and searched by code written from scratch."*
