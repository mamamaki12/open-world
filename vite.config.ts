import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built files work from any folder (static hosting, file preview)
export default defineConfig({
  base: './',
  plugins: [react()],
});
