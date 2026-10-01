// 개발자 모드: 주소에 ?dev=1616 이 있을 때만 켜진다(기기에 기억하지 않음).
// 켜지면 보정값 옆에 엔진 원래 값·보정 근거를 함께 보여주고, 예시 불러오기 버튼과 /dev 검증 화면을 연다.
export const isDev = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('dev') === '1616';
