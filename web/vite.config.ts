import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소: https://fobesseo1.github.io/1mincheck/
export default defineConfig({
  base: '/1mincheck/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  test: { environment: 'node' },
} as any);
