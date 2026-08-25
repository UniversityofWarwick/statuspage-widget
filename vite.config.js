import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig(({ mode }) => {
  const isDist = mode === 'dist';
  
  return {
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
      outDir: isDist ? 'dist' : 'build',
      emptyOutDir: true,
      ...(isDist && {
        lib: {
          entry: 'src/index.tsx',
          name: 'StatusPageEmbed',
          formats: ['iife'],
          fileName: () => 'main.js',
          cssFileName: 'main',
        },
      }),
      ...(!isDist && {
        assetsDir: 'static',
        rollupOptions: {
          output: {
            entryFileNames: 'js/main.js',
            chunkFileNames: 'js/[name].js',
            assetFileNames: ({ name }) => {
              if (name?.endsWith('.css')) return 'css/main.css';
              if (name?.endsWith('.map')) return 'css/[name]';
              return 'assets/[name]';
            },
          },
        },
      }),
    },
  };
});
