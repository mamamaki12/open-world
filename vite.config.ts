import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built files work from any folder (static hosting, file preview)
export default defineConfig({
  base: './',
  plugins: [react()],
  // 今動いている版がいつ作られたかを設定メニューに出す
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  build: {
    // ライブラリを別ファイルにして、ゲーム側を更新してもブラウザのキャッシュが効くようにする
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
