import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소: https://fobesseo1.github.io/1mincheck/
export default defineConfig({
  // 보관용 A (2026-10-03 배포본 b7a594d 그대로, 주소·저장 키·캐시만 분리)
  base: '/1mincheck-a/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  test: { environment: 'node' },
} as any);
