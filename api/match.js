/* GET /api/match — DK 공식 경기 한 경기의 세트별 밴픽·K/D/A·딜 비중
 *   ?id=<getSchedule 의 match.id>   (필수)
 *   ?lang=ko|en|ja|zh|tw|vi|es|pt|th|id : VOD 언어 (기본 ko)
 *   ?refresh=1 : 캐시 건너뛰기
 *
 * LoL Esports(lolesports) + Leaguepedia(밴) 를 서버에서 합쳐 돌려줍니다.
 * 끝난 경기는 결과가 바뀌지 않아 7일 캐시, 진행 중/예정 경기는 2분 캐시.
 */
const { json, fail } = require('./_lib/http');
const { getMatchDetail } = require('./_lib/matchdetail');
const { hlFor, messageFor } = require('./_lib/official');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'GET 만 지원해요');

  const url = new URL(req.url || '/api/match', 'https://dk-signal.vercel.app');
  const id = (url.searchParams.get('id') || '').trim();
  const lang = (url.searchParams.get('lang') || 'ko').toLowerCase();
  const hl = hlFor(lang);
  if (!id) return json(res, 400, { ok: false, error: 'id 가 필요해요' });

  let result;
  try {
    result = await getMatchDetail(id, {
      hl: hl,
      lang: lang,
      refresh: url.searchParams.get('refresh') === '1',
      startTime: url.searchParams.get('start') || ''
    });
  } catch (e) {
    return json(res, 200, {
      ok: false,
      id: id,
      error: messageFor(lang, 'unavailable'),
      detail: String(e && e.message ? e.message : e),
      fetchedAt: new Date().toISOString(),
      sets: []
    });
  }
  return json(res, 200, Object.assign({ lang: lang }, result));
};
