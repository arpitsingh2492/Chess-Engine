/*
 * ASTRA - Chess Engine by arpitsingh2492
 *
 * Web Worker that runs the custom C++ engine compiled to WebAssembly.
 * All chess logic (move generation, search, evaluation) runs natively
 * in C++ via the compiled WASM module.
 */

const ctx: Worker = self as any;

let engine: any = null;
let isReady = false;
let isSearching = false;
let queuedRequest: any = null;

// Wrapped C functions (cached after init)
let _engine_init: () => void;
let _engine_load_fen: (fen: string) => void;
let _engine_search: (timeLimit: number, maxDepth: number) => string;
let _engine_search_multipv: (timeLimit: number, maxDepth: number, numPV: number) => string;

async function initEngine() {
  if (engine) return;

  try {
    // Dynamically import the Emscripten module from /engine/chess_engine.js
    const response = await fetch('/engine/chess_engine.js');
    const jsText = await response.text();

    // Emscripten generates an ES6 module with `export default`. We need to 
    // evaluate it as a module. Create a blob URL to import it.
    const blob = new Blob([jsText], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    // Use dynamic import
    const module = await import(/* @vite-ignore */ blobUrl);
    const createEngine = module.default;
    URL.revokeObjectURL(blobUrl);

    // Initialize with locateFile to find the .wasm in /engine/
    const wasmModule = await createEngine({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/engine/chess_engine.wasm';
        }
        return '/engine/' + path;
      }
    });

    engine = wasmModule;

    // Wrap all C functions
    _engine_init = engine.cwrap('engine_init', null, []);
    _engine_load_fen = engine.cwrap('engine_load_fen', null, ['string']);
    _engine_search = engine.cwrap('engine_search', 'string', ['number', 'number']);
    _engine_search_multipv = engine.cwrap('engine_search_multipv', 'string', ['number', 'number', 'number']);

    _engine_init();
    isReady = true;
    console.log('[Astra WASM] C++ engine initialized successfully');
  } catch (err) {
    console.error('[Astra WASM] Failed to initialize engine:', err);
  }
}

function startSearch(requestData: any) {
  if (!isReady) return;

  const { fen, timeLimit, maxDepth, type, botLevel } = requestData;
  isSearching = true;

  const searchStart = Date.now();

  // Load position into the C++ engine
  _engine_load_fen(fen);

  let resultJson: string;

  if (type === 'game') {
    // For gameplay: use single best move search
    let depth = maxDepth || 10;
    let time = timeLimit || 2000;

    // Adjust difficulty based on bot level
    if (botLevel === '800') {
      depth = 2;
      time = 500;
    } else if (botLevel === '1500') {
      depth = 5;
      time = 1500;
    }

    resultJson = _engine_search(time, depth);
  } else {
    // For analysis: use MultiPV search (top 3 variations)
    const depth = maxDepth || 12;
    const time = timeLimit || 5000;
    resultJson = _engine_search_multipv(time, depth, 3);
  }

  const result = JSON.parse(resultJson);
  const elapsed = Date.now() - searchStart;

  // Build variations for analysis mode
  let variations: any[] = [];
  if (result.variations && result.variations.length > 0) {
    variations = result.variations.map((v: any) => ({
      score: v.score,
      pv: v.pv || []
    }));
  }

  const minDelay = (type === 'game' && botLevel === '800') ? 800 : 0;

  const postResult = () => {
    ctx.postMessage({
      move: result.move,
      score: result.score || 0,
      depth: result.depth || 0,
      nodes: result.nodes || 0,
      timeMs: result.timeMs || elapsed,
      pv: result.pv || [],
      variations: variations,
      type: type
    });
    isSearching = false;

    // Process queued request
    if (queuedRequest) {
      const next = queuedRequest;
      queuedRequest = null;
      startSearch(next);
    }
  };

  // Artificial delay for fast bot moves
  if (type === 'game' && elapsed < minDelay) {
    setTimeout(postResult, minDelay - elapsed);
  } else {
    postResult();
  }
}

// Handle messages from main thread
ctx.onmessage = async (e: MessageEvent) => {
  await initEngine();

  if (isSearching) {
    queuedRequest = e.data;
  } else {
    startSearch(e.data);
  }
};

export {};
