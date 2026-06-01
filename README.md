# Astra Chess Engine ♞

> **A beautifully crafted, high-performance chess application featuring a custom C++ engine alongside the world-class Stockfish 18 (NNUE) WebAssembly integration.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-629924?style=for-the-badge)](https://arpitsingh2492.github.io/astra-chess/)
[![C++](https://img.shields.io/badge/C++-17-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://webassembly.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## ✨ Overview

Astra Chess is a premium web-based chess experience that brings grandmaster-level play directly into your browser. 

This project is a hybrid showcase of systems programming and modern web development. It features a **custom chess engine written from scratch in C++17** for those interested in algorithmic chess programming, alongside a production-ready integration with **Stockfish 18 NNUE via WebAssembly** for the absolute highest quality gameplay on the web frontend.

### Key Web Features
- **Stockfish 18 NNUE Integration**: Play against the strongest chess engine in the world, running directly in your browser via WebAssembly Web Workers.
- **Premium UI/UX**: A highly symmetric, distraction-free React design built from scratch with custom CSS and a modern mesh-gradient aesthetic.
- **Light & Dark Mode**: Seamlessly toggle between Light and Dark themes that persist across sessions.
- **Live Position Evaluation**: Real-time best-move analysis during gameplay.

---

## 🔬 Core Engine Architecture (Custom C++)

For developers interested in how chess engines work under the hood, this repository includes a handcrafted C++ engine (`/engine/src/`). It heavily utilizes bitwise operations and efficient memory management.

### Search Algorithm (`engine/src/search.cpp`)
| Technique | Description |
|---|---|
| **Alpha-Beta Pruning** | The core minimax tree search optimized with strict α-β cutoffs, drastically reducing the search space. |
| **Iterative Deepening** | Progressively searches deeper plies until a time limit is hit. |
| **Quiescence Search** | Explores noisy leaf nodes (all captures) to avoid the horizon effect and ensure tactical stability. |
| **MVV-LVA Ordering** | "Most Valuable Victim – Least Valuable Attacker" heuristic ensures captures are checked in optimal order. |

### Board & Move Generation (`engine/src/movegen.cpp`)
| Feature | Implementation |
|---|---|
| **Move Generation** | Completely custom pseudo-legal and legal move generation algorithms. |
| **State Reversibility** | Fast `executeMove` and `undoMove` functions using lightweight snapshot history to traverse the search tree. |

---

## 🚀 Running Locally (Web UI)

You do not need to install any C++ tools or compile anything to play the game on the web. The Stockfish WebAssembly binary is bundled and ready to go.

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

## ⚙️ Advanced: Compiling C++ & Running NNUE Locally

If you want to dive into the low-level systems programming aspect, you can build the native C++ engine and interact with advanced operations.

**Option A: Build Native Engine (Testing & Benchmarking)**
*Requires CMake and a C++ compiler (g++, clang, MSVC).*
```powershell
cd engine
mkdir build
cd build
cmake ..
cmake --build . -j4
# Run the native test harness
.\chess_test.exe
```

**Option B: Downloading and Running Stockfish NNUE Locally**
The web app automatically uses the WASM-compiled NNUE network. However, to run advanced analysis locally via CLI:
1. Download the official [Stockfish binaries](https://stockfishchess.org/download/).
2. Download the latest `.nnue` evaluation file.
3. Run Stockfish in your terminal and pass advanced UCI commands:
```bash
stockfish
uci
setoption name EvalFile value /path/to/network.nnue
isready
position startpos
go depth 24
```

---

## 🗂️ Project Structure

```text
Chess-Engine/
├── engine/                 # ⚙️ Custom C++ Chess Engine
│   ├── CMakeLists.txt      # Build configuration for Native & WASM
│   ├── include/            # C++ Headers (types, board, movegen, eval, search)
│   └── src/                # C++ Implementations
│
└── ChessWeb/               # 🌐 React / TypeScript Frontend
    ├── public/stockfish/   # Precompiled Stockfish 18 WASM & NNUE data
    ├── src/components/     # UI Components (ChessBoard, AnalysisPanel, etc.)
    └── src/engine/         # Web Worker bridge for engine communication
```

---

## 🤝 Contributing & Feedback

Astra Chess is entirely open-source, and contributions are highly welcome! Whether you are a systems engineer looking to optimize C++ bitwise operations, a frontend developer wanting to polish the React UI, or a chess enthusiast with ideas for better evaluation heuristics, your input is appreciated.

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
