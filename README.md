# Astra Chess ♞

> **A beautifully crafted, high-performance chess application featuring a modern React interface powered by the world-class Stockfish 18 WebAssembly engine.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-629924?style=for-the-badge)](https://arpitsingh2492.github.io/astra-chess/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://webassembly.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## ✨ Overview

Astra Chess is a premium web-based chess experience that brings grandmaster-level play directly into your browser. 

The application pairs a meticulously designed, distraction-free **React / TypeScript frontend** with the immense calculating power of **Stockfish 18 (NNUE)** compiled natively to WebAssembly (WASM). This allows the application to evaluate millions of positions per second completely client-side, requiring no backend servers.

### Key Features
- **Stockfish 18 NNUE Integration**: Play against the strongest chess engine in the world, running directly in your browser via WebAssembly Web Workers.
- **Dynamic Difficulty**: Choose between different bot levels (e.g. 800 Elo to 3200+ Elo) for casual games or hardcore analysis.
- **Premium UI/UX**: A highly symmetric, distraction-free design built from scratch with custom CSS and a modern mesh-gradient aesthetic.
- **Light & Dark Mode**: Seamlessly toggle between Light and Dark themes that persist across sessions.
- **Live Position Evaluation**: Real-time evaluation bar and best-move analysis during gameplay.

---

## 🚀 Running Locally

You do not need to install any C++ tools or compile anything to play the game. The Stockfish WebAssembly binary is bundled and ready to go.

### Quick Start
You only need [Node.js](https://nodejs.org/) installed.

```powershell
# 1. Clone the repository
git clone https://github.com/arpitsingh2492/Chess-Engine.git
cd Chess-Engine/ChessWeb

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# -> Open http://localhost:5173
```

---

## 🗂️ Project Structure

```text
Chess-Engine/
└── ChessWeb/               # 🌐 React / TypeScript Frontend
    ├── public/             
    │   └── stockfish/      # Precompiled Stockfish 18 WASM & JS glue code
    ├── src/
    │   ├── components/     # UI Components (ChessBoard, EvalBar, AnalysisPanel)
    │   ├── contexts/       # React Contexts (ThemeContext for Light/Dark mode)
    │   ├── engine/         # Web Worker bridge (engine.worker.ts, movegen, etc.)
    │   └── styles/         # Custom global and component-scoped CSS variables
    └── package.json        # Build scripts for Vite / Vercel
```

---

## 🛠️ Technology Stack

- **React 19 & TypeScript**: Provides a robust, type-safe architecture for building the complex interactive board and game states.
- **Vite**: Ultra-fast frontend tooling and bundling.
- **Web Workers**: Runs the Stockfish WASM engine entirely on a background thread so the UI never freezes during deep searches.
- **Stockfish 18 (WASM)**: The core AI calculating engine, utilizing Neural Network Updated Evaluation (NNUE) for state-of-the-art accuracy.

---

## 🤝 Contributing & Feedback

Astra Chess is entirely open-source, and contributions are highly welcome! Whether you are a frontend developer wanting to polish the UI, or a chess enthusiast with ideas for new features, your input is appreciated.

* **Open for Contributions:** Feel free to fork the repository, open issues, or submit pull requests (PRs).
* **Feedback & Comments:** Ideas, critiques, and suggestions are always appreciated. Reach out via GitHub Issues or connect with me on LinkedIn!

---

## 👤 Author

**Arpit Singh**

- GitHub: [@arpitsingh2492](https://github.com/arpitsingh2492)
- LinkedIn: [arpit-singh-86680734a](https://www.linkedin.com/in/arpit-singh-86680734a)

---

## 📄 License

MIT License — feel free to fork, study, and build on it.
