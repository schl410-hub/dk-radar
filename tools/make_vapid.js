/* VAPID 키 생성 (웹 푸시용)
 *
 *   node tools/make_vapid.js
 *
 * 나온 두 값을 Vercel 프로젝트의 환경변수 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 에 넣으면 됩니다.
 * 비밀키는 저장소에 커밋하지 마세요.
 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('# Vercel → Settings → Environment Variables 에 추가');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=https://dk-signal.vercel.app');
console.log('');
console.log('# 확인: 배포 후');
console.log('#   curl -s https://dk-signal.vercel.app/api/config | head -c 300');
