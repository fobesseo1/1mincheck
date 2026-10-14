// 1분체크 서비스 워커: 한 번 열어 본 파일을 기기에 보관해 오프라인에서도 열리게 한다.
// 답한 내용이나 결과는 여기서 다루지 않는다(네트워크로 보내는 요청이 없음).
const CACHE = '1mincheck-v5';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  // 체형 캐릭터: 목록(characters.json)은 붙잡지 않는다(늘 네트워크, 오프라인일 때만 보관본).
  // 그림은 주소 뒤 ?v=버전 으로 구분해 보관하고, 새 버전을 받으면 같은 그림의 옛 버전은 지운다.
  if (url.pathname.includes('/characters/')) {
    if (url.pathname.endsWith('.json')) {
      e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)); } return r; }).catch(() => caches.match(url.pathname)));
      return;
    }
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.keys().then((ks) => Promise.all(ks.filter((k) => { const u = new URL(k.url); return u.pathname === url.pathname && u.search !== url.search; }).map((k) => c.delete(k)))).then(() => c.put(req, copy)));
      }
      return r;
    })));
    return;
  }
  // 페이지는 네트워크 우선(새 버전 반영), 나머지 파일은 캐시 우선
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; }).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
});
