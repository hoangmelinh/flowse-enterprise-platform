import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Tăng ngưỡng cảnh báo lên 600 kB (sau khi đã tối ưu vendor splitting)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── React core ──────────────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // ── React Router ────────────────────────────────────────────────
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }

          // ── Redux / State management ────────────────────────────────────
          if (id.includes('node_modules/@reduxjs/') ||
              id.includes('node_modules/redux/') ||
              id.includes('node_modules/react-redux/') ||
              id.includes('node_modules/immer/')) {
            return 'vendor-redux';
          }

          // ── Ant Design UI ────────────────────────────────────────────────
          if (id.includes('node_modules/antd/') ||
              id.includes('node_modules/@ant-design/') ||
              id.includes('node_modules/rc-') ||
              id.includes('node_modules/@rc-component/')) {
            return 'vendor-antd';
          }

          // ── Lucide icons ─────────────────────────────────────────────────
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide';
          }

          // ── i18n ─────────────────────────────────────────────────────────
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next/')) {
            return 'vendor-i18n';
          }

          // ── HTTP / Utilities ──────────────────────────────────────────────
          if (id.includes('node_modules/axios/') ||
              id.includes('node_modules/zod/') ||
              id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/')) {
            return 'vendor-utils';
          }

          // ── Markdown ──────────────────────────────────────────────────────
          if (id.includes('node_modules/react-markdown/') ||
              id.includes('node_modules/remark') ||
              id.includes('node_modules/unified/') ||
              id.includes('node_modules/vfile') ||
              id.includes('node_modules/hast') ||
              id.includes('node_modules/mdast') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/unist')) {
            return 'vendor-markdown';
          }

          // ── Other node_modules → misc vendor ──────────────────────────────
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
})

