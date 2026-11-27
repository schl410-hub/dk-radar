/* GET /api/solo — 5인 솔로랭크(티어·LP·시즌 전적·인게임·최근 경기·내전/프로 매치업)
 * RIOT_API_KEY 가 있으면 Riot API 실시간, 없으면 data.js 스냅샷을 그대로 돌려줍니다.
 *
 * 2026-11-27 추가
 *  - liveGames : Spectator-V5 로 확인한 '지금 게임 중' 상세(양 팀 챔피언·스펠·같은 판 프로)
 *  - matchups  : 최근 경기에서 잡힌 DK 5인끼리(듀오·내전) / 타 팀 프로 선수(with·vs)
 *  - 서버리스 함수를 늘리지 않으려고 /api/solo 응답에 함께 실어 보냅니다(Vercel Hobby 함수 12개 한도).
 */
const { json, fail } = require('./_lib/http');
const store = require('./_lib/store');
const riot = require('./_lib/riot');
const snapshot = require('./_lib/snapshot');
const { PLAYERS } = require('./_lib/players');
const { loadProIndex, dkPuuidMap } = require('./_lib/pros');
const { buildLiveGame } = require('./_lib/ingame');
const matchups = require('./_lib/matchups');

const CACHE_KEY = 'dk:cache:solo';
const CACHE_TTL = 45;      /* 초 · 같은 값을 여러 기기가 동시에 물어도 호출은 한 번 */
const PUUID_TTL = 2592000; /* 30일 */

/* PUUID 는 Riot 키(앱)마다 다르게 암호화되어 발급됩니다.
 * 키를 바꿔 끼우면 예전 키로 받아 둔 PUUID 가 'Exception decrypting' 으로 거절되므로,
 * 캐시 키에 현재 키 지문을 넣어 키가 바뀌면 자동으로 새로 조회하게 합니다. */
const KEY_FP = require('crypto').createHash('sha256')
  .update(process.env.RIOT_API_KEY || 'none').digest('hex').slice(0, 10);

async function puuidFor(player, forceFresh) {
  const key = 'dk:riot:puuid:' + KEY_FP + ':' + player.key;
  if (!forceFresh) {
    try {
      const hit = await store.getJSON(key);
      if (hit && hit.puuid) return hit.puuid;
    } catch (e) { /* 저장소가 없으면 매번 조회 */ }
  }
  const puuid = await riot.accountPuuid(player.riotId);
  try { await store.setJSON(key, { puuid: puuid, riotId: player.riotId }, PUUID_TTL); } catch (e) {}
  return puuid;
}

/* 키 교체 직후처럼 캐시된 PUUID 가 거절되면('Exception decrypting') 한 번만 새로 받아 재시도 */
function puuidRejected(snap) {
  const text = String((snap && (snap.error || '')) + ' ' + (snap && snap.leagueError));
  return /decrypting|invalid puuid|Invalid UUID/i.test(text);
}

async function snapshotWithPuuid(player, opts) {
  const options = Object.assign({}, opts, { count: 5 });
  let puuid = null;
  try { puuid = await puuidFor(player); } catch (e) { puuid = null; }
  let snap = await riot.playerSnapshot(player, Object.assign({}, options, { puuid: puuid }));
  if (puuidRejected(snap)) {
    try {
      const fresh = await puuidFor(player, true);
      if (fresh && fresh !== puuid) {
        snap = await riot.playerSnapshot(player, Object.assign({}, options, { puuid: fresh }));
      }
    } catch (e) { /* 재시도 실패는 원래 결과를 그대로 둡니다 */ }
  }
  return snap;
}

function snapshotResponse(reason) {
  return {
    ok: true,
    source: 'snapshot',
    status: reason || 'no_key',
    message: 'RIOT_API_KEY 가 없어서 2026-11-26 스냅샷을 보여줘요. Vercel 환경변수에 키를 넣으면 자동으로 실시간 전적이 됩니다.',
    fetchedAt: snapshot.generatedAt,
    serverTime: new Date().toISOString(),
    players: snapshot.players,
    liveGames: [],
    matchups: {}
  };
}

/* 인게임 · 매치업을 응답에 실을 모양으로 정리합니다. */
function enrich(players, collected, proIndex) {
  const dkByPuuid = dkPuuidMap(players);
  const liveGames = [];

  players.forEach(function (p) {
    if (p.liveRaw && p.inGame) {
      const game = buildLiveGame(p.liveRaw, {
        mePuuid: p.puuid, meKey: p.key, dkByPuuid: dkByPuuid, proByPuuid: proIndex.byPuuid
      });
      if (game) {
        const mine = game.me || {};
        p.liveGame = {
          gameId: game.gameId, gameStartTime: game.gameStartTime, gameLength: game.gameLength,
          queueKey: game.queueKey, queueId: game.queueId,
          champion: mine.champion || '', championId: mine.championId || 0,
          spell1: mine.spell1 || '', spell2: mine.spell2 || '',
          tags: game.tags
        };
        liveGames.push(Object.assign({ playerKey: p.key }, game));
      }
    }
    delete p.liveRaw;
  });

  const analysis = matchups.analyze(Object.keys(collected).map(function (k) { return collected[k]; }), dkByPuuid);
  players.forEach(function (p) { p.tag = analysis.byPlayer[p.key] || null; });

  return { liveGames: liveGames, matchups: analysis.byMatch };
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

  /* 타 팀 프로 계정 PUUID 표는 한 요청에 조금씩만 채웁니다(호출 한도 보호). */
  let proIndex;
  try {
    proIndex = await loadProIndex(store, riot);
  } catch (e) {
    proIndex = { byPuuid: {}, byRiotId: {}, resolved: 0, total: 0, missing: [] };
  }

  const collected = {};
  const summaries = riot.summaryCache(store);
  const players = await Promise.all(PLAYERS.map(function (p) {
    return snapshotWithPuuid(p, { summaries: summaries, collected: collected, live: '' });
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

  const extra = enrich(players, collected, proIndex);

  const result = {
    ok: status !== 'error',
    source: 'riot',
    status: status,
    message: message,
    fetchedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    players: players,
    liveGames: extra.liveGames,
    matchups: extra.matchups,
    proIndex: { resolved: proIndex.resolved, total: proIndex.total }
  };

  if (status === 'live' || status === 'partial') {
    try { await store.setJSON(CACHE_KEY, result, CACHE_TTL); } catch (e) {}
  }
  return json(res, 200, Object.assign({ servedFrom: 'live' }, result));
};
