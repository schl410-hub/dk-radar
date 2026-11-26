/* GET /api/solo — 5인 솔로랭크(티어·LP·시즌 전적·인게임·최근 경기)
 * RIOT_API_KEY 가 있으면 Riot API 실시간, 없으면 data.js 스냅샷을 그대로 돌려줍니다.
 */
const { json, fail } = require('./_lib/http');
const store = require('./_lib/store');
const riot = require('./_lib/riot');
const snapshot = require('./_lib/snapshot');
const { PLAYERS } = require('./_lib/players');

const CACHE_KEY = 'dk:cache:solo';
const CACHE_TTL = 45;      /* 초 · 같은 값을 여러 기기가 동시에 물어도 호출은 한 번 */
const MATCH_TTL = 21600;   /* 6시간 · 끝난 경기 상세는 다시 받지 않음 */
const PUUID_TTL = 2592000; /* 30일 */

async function puuidFor(player) {
  const key = 'dk:riot:puuid:' + player.key;
  try {
    const hit = await store.getJSON(key);
    if (hit && hit.puuid) return hit.puuid;
  } catch (e) { /* 저장소가 없으면 매번 조회 */ }
  const puuid = await riot.accountPuuid(player.riotId);
  try { await store.setJSON(key, { puuid: puuid, riotId: player.riotId }, PUUID_TTL); } catch (e) {}
  return puuid;
}

const matchCache = {
  getMatch: function (id) { return store.getJSON('dk:riot:match:' + id); },
  setMatch: function (id, row) { return store.setJSON('dk:riot:match:' + id, row, MATCH_TTL); }
};

function snapshotResponse(reason) {
  return {
    ok: true,
    source: 'snapshot',
    status: reason || 'no_key',
    message: 'RIOT_API_KEY 가 없어서 2026-11-26 스냅샷을 보여줘요. Vercel 환경변수에 키를 넣으면 자동으로 실시간 전적이 됩니다.',
    fetchedAt: snapshot.generatedAt,
    serverTime: new Date().toISOString(),
    players: snapshot.players
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'GET 만 지원해요');

  if (!riot.hasKey()) return json(res, 200, snapshotResponse('no_key'));

  const url = new URL(req.url || '/api/solo', 'https://dk-signal.vercel.app');
  const refresh = url.searchParams.get('refresh') === '1';

  if (!refresh) {
    try {
      const cached = await store.getJSON(CACHE_KEY);
      if (cached && cached.serverTime && Date.now() - Date.parse(cached.serverTime) < CACHE_TTL * 1000) {
        return json(res, 200, Object.assign({}, cached, { servedFrom: 'cache' }));
      }
    } catch (e) {}
  }

  const players = await Promise.all(PLAYERS.map(async function (player) {
    let puuid = null;
    try { puuid = await puuidFor(player); } catch (e) { puuid = null; }
    return riot.playerSnapshot(player, { puuid: puuid, count: 5, cache: matchCache });
  }));

  const bad = players.filter(function (p) { return p.status !== 'ok'; });
  const rateLimited = players.filter(function (p) { return p.status === 'rate_limited'; });
  let status = 'live';
  let message = '';
  if (rateLimited.length) {
    status = 'rate_limited';
    message = 'Riot API 호출 한도를 잠깐 넘었어요. 잠시 뒤에 다시 확인합니다.';
  } else if (bad.length === players.length) {
    status = 'error';
    message = 'Riot API 응답을 받지 못했어요. 잠시 뒤 다시 시도합니다.';
  } else if (bad.length) {
    status = 'partial';
    message = '일부 선수 전적을 받지 못했어요.';
  }

  const result = {
    ok: status !== 'error',
    source: 'riot',
    status: status,
    message: message,
    fetchedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    players: players
  };

  if (status === 'live' || status === 'partial') {
    try { await store.setJSON(CACHE_KEY, result, CACHE_TTL); } catch (e) {}
  }
  return json(res, 200, Object.assign({ servedFrom: 'live' }, result));
};
