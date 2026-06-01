/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  server: {
    open: true,
    headers: {
      // Required for SharedArrayBuffer (used by some WASM configurations)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['chess_engine.js'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      // Ensure WASM files are properly handled
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
}))
