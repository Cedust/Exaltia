import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the same build works at the Pages root and under pr-preview/pr-N/.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Phaser alone is ~1.5 MB minified.
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
