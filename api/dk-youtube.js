/* GET /api/dk-youtube — 디플러스 기아 공식 유튜브(@DplusKia_LOL) 최신 영상
 *
 *   ?refresh=1 : 캐시 건너뛰기
 *
 * 채널 RSS(공개 Atom 피드)를 10분 캐시로 감싸 돌려줍니다.
 * RSS 가 막히면 api/_lib/dk-youtube-snapshot.js 의 마지막 확인본을 stale=true 로 내려줍니다.
 */
const { json, fail } = require('./_lib/http');
const { fetchDkYoutube } = require('./_lib/dk-youtube');
const snapshot = require('./_lib/dk-youtube-snapshot');
const store = require('./_lib/store');

const CACHE_KEY = 'dk:cache:dkyoutube';
const CACHE_TTL = 600; /* 초 · 10분 */

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'GET 만 지원해요');

  const url = new URL(req.url || '/api/dk-youtube', 'https://dk-signal.vercel.app');
  const refresh = url.searchParams.get('refresh') === '1';

  if (!refresh) {
    try {
      const cached = await store.getJSON(CACHE_KEY);
      if (cached && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL * 1000) {
        return json(res, 200, Object.assign({}, cached, { servedFrom: 'cache' }));
      }
    } catch (e) { /* 캐시를 못 읽어도 계속 진행 */ }
  }

  try {
    const live = await fetchDkYoutube();
    try { await store.setJSON(CACHE_KEY, live, CACHE_TTL); } catch (e) { /* 저장 실패는 무시 */ }
    return json(res, 200, Object.assign({}, live, { servedFrom: 'live' }));
  } catch (e) {
    const fallback = {
      ok: true,
      source: 'snapshot',
      stale: true,
      channel: snapshot.CHANNEL,
      videos: snapshot.VIDEOS,
      fetchedAt: null,
      servedFrom: 'snapshot',
      detail: String(e && e.message ? e.message : e)
    };
    if (!fallback.videos.length) {
      return json(res, 200, Object.assign({}, fallback, {
        ok: false,
        error: 'official_youtube_unavailable'
      }));
    }
    return json(res, 200, fallback);
  }
};
