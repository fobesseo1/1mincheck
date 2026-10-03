import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// B버전(비교용) 주소: https://fobesseo1.github.io/1mincheck-b/ (A버전 /1mincheck/ 과 별도 저장소에 배포)
export default defineConfig({
  base: '/1mincheck-b/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  test: { environment: 'node' },
} as any);
