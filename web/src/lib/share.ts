// 앱 주소 공유: 서비스 소개와 주소만 보낸다(개인 결과·답은 보내지 않음)
export const APP_URL = () => location.href.split('#')[0];
export const SHARE_TEXT = '나는 또래 100명 중 어디쯤일까? 몸 정보 몇 개로 1분 만에 가늠해 봤어요.';
export async function shareApp(toast: (m: string) => void) {
  try {
    if (navigator.share) await navigator.share({ title: '1분체크', text: SHARE_TEXT, url: APP_URL() });
    else { await navigator.clipboard.writeText(`${SHARE_TEXT} ${APP_URL()}`); toast('소개 문구와 주소를 복사했어요'); }
  } catch { /* 취소 */ }
}

/** 개인정보 한 줄. Vercel 빌드에서 익명 방문 통계를 켜면 그 사실도 함께 말한다(vite.config.ts __ANALYTICS__) */
export const PRIVACY_LINE = __ANALYTICS__ ? '건강정보는 보내지 않고 방문 수만 익명으로 세요' : '입력한 건강정보는 서버로 보내지 않아요';
