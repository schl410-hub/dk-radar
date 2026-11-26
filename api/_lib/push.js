/* 웹 푸시(VAPID) 발송
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 가 없으면 발송하지 않고 상태만 알려 줍니다.
 * PUSH_DRY_RUN=1 이면 실제 전송 없이 로그만 남깁니다(로컬 검증용).
 */

let webpush = null;
try { webpush = require('web-push'); } catch (e) { webpush = null; }

const DEFAULT_SUBJECT = 'https://dk-signal.vercel.app';
let configuredFor = '';

function publicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

/* VAPID 설정은 환경변수가 바뀌면 다시 적용합니다(로컬 테스트에서 키를 갈아끼울 수 있게). */
function ready() {
  const pub = process.env.VAPID_PUBLIC_KEY || '';
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  if (!webpush || !pub || !priv) return false;
  const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;
  const stamp = pub + '|' + priv + '|' + subject;
  if (configuredFor !== stamp) {
    webpush.setVapidDetails(subject, pub, priv);
    configuredFor = stamp;
  }
  return true;
}

function normSubscription(sub) {
  if (!sub || !sub.endpoint) return null;
  const keys = sub.keys || {};
  if (!keys.p256dh || !keys.auth) return null;
  if (!/^https:\/\//.test(sub.endpoint)) return null;
  return { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/* payload: {title, body, tag, url, kind} */
async function send(sub, payload) {
  const target = normSubscription(sub);
  if (!target) return { status: 'invalid' };
  const body = JSON.stringify(Object.assign({
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    lang: 'ko'
  }, payload));

  if (process.env.PUSH_DRY_RUN === '1') {
    return { status: 'dry_run', body: body };
  }
  if (!ready()) return { status: 'not_configured' };
  try {
    await webpush.sendNotification(target, body, { TTL: 900, urgency: 'high' });
    return { status: 'sent' };
  } catch (e) {
    const code = e && e.statusCode ? e.statusCode : 0;
    return {
      status: (code === 404 || code === 410) ? 'gone' : 'error',
      code: code,
      message: (e && (e.body || e.message)) || 'send_failed'
    };
  }
}

/* 전송 없이 암호화 요청만 만들어 보는 검증용 */
function requestDetails(sub, payload) {
  if (!ready()) return null;
  return webpush.generateRequestDetails(normSubscription(sub), JSON.stringify(payload || {}), { TTL: 900, urgency: 'high' });
}

module.exports = { ready, publicKey, send, requestDetails, normSubscription };
