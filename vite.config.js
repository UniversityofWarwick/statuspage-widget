import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig(({ mode }) => ({
  plugins: [preact()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  },
  build: {
    outDir: mode === 'dist' ? 'dist' : 'build',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.tsx',
      name: 'StatusPageEmbed',
      formats: ['iife'],
      fileName: () => 'main.js',
      cssFileName: 'main',
    },
  },
}));
