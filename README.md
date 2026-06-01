# Astra Chess Engine ♞

> **A high-performance custom chess engine written in C++ from scratch, compiled to WebAssembly, and running natively in your browser.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-629924?style=for-the-badge)](https://arpitsingh2492.github.io/astra-chess/)
[![C++](https://img.shields.io/badge/C++-17-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://webassembly.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)

---

## ✨ Overview

Astra Chess is a **high-speed, handcrafted chess engine** built fundamentally in **C++**. It avoids any external chess libraries (like Stockfish or chess.js). Every rule, move generation, and evaluation heuristic is computed by custom logic written in C++. 

To bring this native performance to the web without requiring a backend server, the engine is compiled into **WebAssembly (WASM)** using Emscripten. The beautiful UI is constructed in React/TypeScript, which interfaces with the compiled C++ engine inside a Web Worker.

This project showcases **systems programming**, **advanced search algorithms**, and **C++ / WebAssembly interop**.

---

## 🔬 Core Engine Architecture (C++)

The engine is engineered for maximum node calculation speed, heavily utilizing bitwise operations and efficient memory management in C++17.

### Search Algorithm (`engine/src/search.cpp`)
| Technique | Description |
|---|---|
| **Alpha-Beta Pruning** | The core minimax tree search optimized with strict α-β cutoffs, drastically reducing the search space. |
| **Iterative Deepening** | Progressively searches deeper plies until a time limit is hit, ensuring the engine always has a "best move" ready. |
| **Quiescence Search** | Explores noisy leaf nodes (all captures) to avoid the horizon effect and ensure tactical stability. |
| **MVV-LVA Ordering** | "Most Valuable Victim – Least Valuable Attacker" heuristic ensures captures are checked in optimal order for maximum pruning efficiency. |

### Board & Move Generation (`engine/src/movegen.cpp`)
| Feature | Implementation |
|---|---|
| **Move Generation** | Completely custom pseudo-legal and legal move generation algorithms. Handles all chess rules (En Passant, Castling, Promotions). |
| **State Reversibility** | Fast `executeMove` and `undoMove` functions that use a lightweight snapshot history to traverse the search tree without expensive board cloning. |
| **Check Detection** | Optimized `isSquareAttacked` raycasting and step-checks to rapidly verify king safety. |

### Evaluation (`engine/src/eval.cpp`)
| Feature | Implementation |
|---|---|
| **Material Evaluation** | Weighted standard pieces: P=100, N=320, B=330, R=500, Q=900. |
| **Piece-Square Tables (PST)** | Positional static evaluation rewarding center control for knights, open diagonals for bishops, and back-rank safety for kings. |

---

## 🚀 Building & Running Locally

To run the engine locally, you will need **Node.js** and **CMake**. To build the WebAssembly module, you need the **Emscripten SDK (emsdk)**. 

### 1. Clone the repository
```bash
git clone https://github.com/arpitsingh2492/Chess-Engine.git
cd Chess-Engine
```

### 2. Build the C++ Engine

**Option A: Build for Web (WASM via Emscripten)**
*Requires [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) installed and activated in your terminal.*
```bash
cd engine
mkdir build_wasm && cd build_wasm
emcmake cmake ..
emmake make -j4
# Copy the compiled engine to the web directory
cp chess_engine.js chess_engine.wasm ../../ChessWeb/src/engine/
```

**Option B: Build Native (For Testing & Benchmarking)**
*Requires CMake and a C++ compiler (g++, clang, MSVC).*
```bash
cd engine
mkdir build && cd build
cmake ..
cmake --build . -j4
# Run the native test harness
./chess_test
```

### 3. Run the Web Interface
```bash
cd ../ChessWeb
npm install
npm run dev
# -> Open http://localhost:5173
```
*Note: If the WASM file is not built, the web app will gracefully fall back to a slower, identical logic written in TypeScript.*

---

## 🗂️ Project Structure

```text
Chess-Engine/
├── engine/                 # ⚙️ Core C++ Chess Engine
│   ├── CMakeLists.txt      # Build configuration for Native & WASM
│   ├── include/            # C++ Headers (types, board, movegen, eval, search)
│   └── src/                # C++ Implementations
│       ├── main.cpp        # Native CLI testing and benchmarking harness
│       └── wasm_api.cpp    # C-linkage exports for WebAssembly interop
│
└── ChessWeb/               # 🌐 React / TypeScript Frontend
    ├── src/engine/         # Web Worker bridge & WASM module host
    ├── src/components/     # UI Components (ChessBoard, EvalBar, etc.)
    └── package.json        # Build scripts
```

---

## 🛠️ Technology Stack

- **C++17**: The raw brain of the engine.
- **Emscripten**: Compiles the C++ engine into `.wasm` and generates JS glue code.
- **TypeScript**: Provides type safety for the Web Worker bridging layer and UI.
- **React 19 & Vite**: High-performance UI rendering and local development server.
- **Web Workers**: Runs the WASM engine on a background thread so the UI never freezes.

---

## 👤 Author

**Arpit Singh**

- GitHub: [@arpitsingh2492](https://github.com/arpitsingh2492)
- LinkedIn: [arpit-singh-86680734a](https://www.linkedin.com/in/arpit-singh-86680734a)

---

## 📄 License

MIT License — feel free to fork, study, and build on it.

---

*"No Stockfish. No chess.js. Every node calculated natively by code written from scratch."*
