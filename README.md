# Astra Chess Engine ♞

> **A beautifully crafted, high-performance chess application featuring a custom C++ engine built entirely from scratch, utilizing NNUE evaluation trained on Stockfish 18 data.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-629924?style=for-the-badge)](https://arpitsingh2492.github.io/astra-chess/)
[![C++](https://img.shields.io/badge/C++-17-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://webassembly.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## ✨ Overview

Astra Chess is a premium web-based chess experience that brings powerful play directly into your browser. 

This project is a showcase of systems programming and modern web development. It features a **custom chess engine written from scratch in C++17** for algorithmic chess programming, which has been compiled to WebAssembly to run natively in the browser. 

For positional evaluation training, the engine utilizes a custom Neural Network Updated Evaluation (NNUE) architecture trained on **Stockfish 18** datasets, granting it extremely accurate positional understanding without sacrificing performance.

### Key Web Features
- **Astra Engine (WASM)**: Play against a custom-built chess engine running directly in your browser via WebAssembly Web Workers.
- **Deep Multi-Line Analysis**: When enabled, the engine calculates and displays the top 3 best variations (MultiPV) simultaneously.
- **Premium UI/UX**: A highly symmetric, distraction-free React design built from scratch with custom CSS and a modern mesh-gradient aesthetic.
- **Light & Dark Mode**: Seamlessly toggle between Light and Dark themes that persist across sessions.

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

You do not need to install any C++ tools or compile anything to play the game on the web. The WebAssembly binary is bundled and ready to go.

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

**Option B: WebAssembly (WASM) Compilation**
The web app automatically uses the compiled C++ WASM module. If you make changes to the C++ engine, you can recompile it for the web using Emscripten:
```powershell
emcc -O3 -std=c++17 src/*.cpp -o astra_engine.js \
  -s EXPORTED_FUNCTIONS=[_engine_search,_engine_search_multipv,...] \
  -s ALLOW_MEMORY_GROWTH=1 -s EXPORT_ES6=1 -s MODULARIZE=1
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
    ├── public/             # Precompiled WASM & NNUE data
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
