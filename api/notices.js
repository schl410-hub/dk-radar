/* GET /api/notices — 선수 SOOP 방송국 공지 (일정&투표 탭의 방송 일정)
 *
 *  ?refresh=1 이면 SOOP 에서 새로 읽어 Redis(dk:state.notices)에 저장하고,
 *  아니면 저장된 값을 그대로 돌려줍니다. 저장된 값이 없으면 한 번 읽어 시드만 합니다
 *  (새 공지 푸시는 /api/check 가 같은 dk:state.notices 를 보며 판단합니다).
 *
 *  응답: { ok, source: 'redis' | 'soop' | 'empty', fetchedAt, notices: [
 *    { player, soop, titleNo, titleName, posted, url } ] }
 */
const { json, fail } = require('./_lib/http');
const store = require('./_lib/store');
const { PLAYERS } = require('./_lib/players');
const { stationNotice } = require('./_lib/soop-notice');

const NOTICE_KEY = 'dk:state.notices';
const CACHE_MS = 10 * 60 * 1000;

function withSoop() {
  return PLAYERS.filter(function (p) { return p.stations && p.stations.soop; });
}

function toList(state) {
  const players = (state && state.players) || {};
  return withSoop().map(function (p) {
    const row = players[p.key];
    if (!row || !row.titleNo) return null;
    return {
      player: p.key,
      nameKo: p.nameKo,
      soop: p.stations.soop,
      titleNo: Number(row.titleNo),
      titleName: row.titleName || '',
      posted: row.posted || null,
      url: row.url || ('https://ch.sooplive.co.kr/' + encodeURIComponent(p.stations.soop) + '/post/' + row.titleNo)
    };
  }).filter(Boolean);
}

async function readAll() {
  const out = {};
  const errors = [];
  for (const p of withSoop()) {
    try {
      const latest = await stationNotice(p.stations.soop);
      if (latest) out[p.key] = Object.assign({ soop: p.stations.soop }, latest);
    } catch (e) {
      errors.push({ key: p.key, error: String((e && e.message) || e).slice(0, 80) });
    }
  }
  return { players: out, errors: errors };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET') return fail(res, 405, 'GET 만 지원해요');

  const url = new URL(req.url || '/api/notices', 'https://dk-signal.vercel.app');
  const refresh = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  let state = null;
  try { state = await store.getJSON(NOTICE_KEY); } catch (e) { state = null; }

  const empty = !state || !state.players || !Object.keys(state.players).length;
  const stale = !state || !state.checkedAt || (now - Date.parse(state.checkedAt)) > CACHE_MS;
  let source = 'redis';
  let errors = [];

  if (refresh || empty || stale) {
    const fresh = await readAll();
    errors = fresh.errors;
    if (Object.keys(fresh.players).length) {
      state = { players: Object.assign({}, (state && state.players) || {}, fresh.players), checkedAt: new Date(now).toISOString() };
      try { await store.setJSON(NOTICE_KEY, state); } catch (e) { /* 저장 실패해도 응답은 보냅니다 */ }
      source = 'soop';
    } else if (!state) {
      source = 'empty';
    }
  }

  return json(res, 200, {
    ok: true,
    source: source,
    fetchedAt: state && state.checkedAt ? state.checkedAt : null,
    notices: toList(state),
    errors: errors
  });
};
