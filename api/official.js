/* GET /api/official — DK 공식 경기(다음 경기 + 최근 결과)를 LoL Esports 공개 API에서 가져옵니다.
 *   ?lang=ko|en|ja|zh : 일정 문구 언어 (기본 ko)
 *   ?refresh=1      : 캐시 건너뛰기
 */
const { json, fail } = require('./_lib/http');
const { getDkOfficial, hlFor, messageFor } = require('./_lib/official');
const store = require('./_lib/store');

const CACHE_TTL = 90; /* 초 */

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'GET 만 지원해요');

  const url = new URL(req.url || '/api/official', 'https://dk-signal.vercel.app');
  const refresh = url.searchParams.get('refresh') === '1';
  const lang = (url.searchParams.get('lang') || 'ko').toLowerCase();
  const hl = hlFor(lang);
  const CACHE_KEY = 'dk:cache:official:' + lang;

  if (!refresh) {
    try {
      const cached = await store.getJSON(CACHE_KEY);
      if (cached && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < CACHE_TTL * 1000) {
        return json(res, 200, Object.assign({}, cached, { lang: lang, servedFrom: 'cache' }));
      }
    } catch (e) { /* 캐시를 못 읽어도 계속 진행 */ }
  }

  let result;
  try {
    result = await getDkOfficial({ hl: hl });
  } catch (e) {
    return json(res, 200, {
      ok: false,
      source: 'lolesports',
      status: 'unavailable',
      error: messageFor(lang, 'unavailable'),
      detail: String(e && e.message ? e.message : e),
      lang: lang,
      fetchedAt: new Date().toISOString(),
      next: null,
      upcoming: [],
      recent: []
    });
  }

  if (result.ok) {
    try { await store.setJSON(CACHE_KEY, result, CACHE_TTL); } catch (e) { /* 저장 실패는 무시 */ }
  }
  return json(res, 200, Object.assign({ lang: lang, servedFrom: 'live' }, result));
};
