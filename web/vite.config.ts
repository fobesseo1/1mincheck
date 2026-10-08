import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// 두 곳에 배포한다: GitHub Pages(main 브랜치, https://fobesseo1.github.io/1mincheck/)와 Vercel(simple-v2 브랜치, 주소 맨 앞 '/').
// Vercel 은 빌드할 때 VERCEL=1 과 배포 주소(VERCEL_PROJECT_PRODUCTION_URL·VERCEL_URL)를 넣어 준다.
const onVercel = !!process.env.VERCEL;
const base = onVercel ? '/' : '/1mincheck/';
const origin = onVercel
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost'}`
  : 'https://fobesseo1.github.io';

/** 카톡·문자에 링크를 붙였을 때 뜨는 미리보기(개인 숫자 없음)와, Vercel 에서만 익명 방문 통계 스크립트 */
function sharePreview(): Plugin {
  return {
    name: 'share-preview',
    transformIndexHtml(html) {
      const url = origin + base, img = `${url}og.png`;
      const tags = [
        `<meta property="og:type" content="website">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:image" content="${img}">`,
        `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:image" content="${img}">`,
        // 쿠키 없는 방문 수 집계. 입력한 건강정보는 주소(#/...)에도 넣지 않으므로 함께 가지 않는다
        onVercel ? `<script defer src="/_vercel/insights/script.js"></script>` : '',
      ].filter(Boolean).join('\n');
      return html.replace('</head>', `${tags}\n</head>`);
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), sharePreview()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __ANALYTICS__: JSON.stringify(onVercel) },
  server: { fs: { allow: ['..'] } },
  test: { environment: 'node' },
} as any);
