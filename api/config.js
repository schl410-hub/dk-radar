/* GET /api/config — 프론트가 실시간 상태를 표시하고 푸시를 구독할 때 쓰는 공개 설정값 */
const { json } = require('./_lib/http');
const store = require('./_lib/store');
const push = require('./_lib/push');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  let last = null;
  try { last = await store.getJSON('dk:lastcheck'); } catch (e) {}
  return json(res, 200, {
    ok: true,
    version: '3.6.0',
    serverTime: new Date().toISOString(),
    official: { source: 'lolesports' },
    solo: { source: process.env.RIOT_API_KEY ? 'riot' : 'snapshot' },
    push: {
      ready: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      publicKey: push.publicKey() || ''
    },
    store: {
      backend: store.backend(),
      durable: store.durable()
    },
    check: {
      secret: !!process.env.CHECK_SECRET,
      lastRun: last && last.at ? last : null
    }
  });
};
