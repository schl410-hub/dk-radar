/* GET /api/live — 5인 라이브 방송 상태 (SOOP · CHZZK 공개 API)
 *
 *   { ok, at, liveCount, players: { doran: { live, platform, title, viewers, startedAt, url }, ... } }
 *
 * 45초 캐시. 앱은 90초마다 자동 갱신하며, 라이브 배지와 '방송 시작' 푸시(/api/check)가 이 값을 씁니다.
 */
const { json } = require('./_lib/http');
const store = require('./_lib/store');
const { getLive } = require('./_lib/live');

const CACHE_KEY = 'dk:cache:live';
const CACHE_TTL = 45; /* 초 */

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { ok: false, error: 'GET 만 지원해요' });
  }

  const url = new URL(req.url || '/api/live', 'https://dk-signal.vercel.app');
  const refresh = url.searchParams.get('refresh') === '1';

  if (!refresh) {
    try {
      const cached = await store.getJSON(CACHE_KEY);
      if (cached && cached.at && Date.now() - Date.parse(cached.at) < CACHE_TTL * 1000) {
        return json(res, 200, Object.assign({}, cached, { servedFrom: 'cache' }));
      }
    } catch (e) { /* 캐시를 못 읽어도 계속 */ }
  }

  try {
    const data = await getLive();
    try { await store.setJSON(CACHE_KEY, data, CACHE_TTL * 2); } catch (e) {}
    return json(res, 200, Object.assign({ servedFrom: 'live' }, data));
  } catch (e) {
    return json(res, 200, {
      ok: false,
      status: 'unavailable',
      error: '방송 상태를 가져오지 못했어요',
      detail: String(e && e.message ? e.message : e),
      at: new Date().toISOString(),
      liveCount: 0,
      players: {}
    });
  }
};
