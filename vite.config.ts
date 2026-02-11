import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'path'

const externalDeps = [
  '@lancedb/lancedb',
  /@lancedb\/lancedb-.+/, // lancedb 二进制
  'apache-arrow',
  // native addons: 必须保持为 external，避免 Rollup/CJS 包装破坏动态加载 .node
  'better-sqlite3',
  /^better-sqlite3(\/.*)?$/,
  'sharp',
  /^sharp(\/.*)?$/,
  /sharp-.*\.node$/,
  // onnxruntime-node 会在运行时动态 require .node 二进制，必须保持为 external
  'onnxruntime-node',
  /^onnxruntime-node(\/.*)?$/,
  'onnxruntime-web',
  /onnxruntime[-_]web.*/,
  /onnxruntime_binding\.node$/, // onnxruntime 二进制
];

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: externalDeps,
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: externalDeps,
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
})
