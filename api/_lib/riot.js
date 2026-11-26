/* Riot API 클라이언트 (Account-V1 · Summoner-V4 · League-V4 · Spectator-V5 · Match-V5)
 * RIOT_API_KEY 가 없으면 아무 호출도 하지 않습니다.
 */

const { fetchJson, kst } = require('./http');
const { PLAYERS, POS_KO, TIER_KO, splitRiotId, byKey } = require('./players');

const ASIA = process.env.RIOT_ASIA_BASE || 'https://asia.api.riotgames.com';
const KR = process.env.RIOT_KR_BASE || 'https://kr.api.riotgames.com';
const RANKED_SOLO_QUEUE = '420';

function hasKey() {
  return !!process.env.RIOT_API_KEY;
}

async function riotGet(base, path, timeout) {
  if (!hasKey()) {
    const err = new Error('RIOT_API_KEY 가 설정되지 않았어요');
    err.status = 401;
    throw err;
  }
  return fetchJson(base + path, {
    timeout: timeout || 9000,
    label: 'riot ' + path.split('?')[0],
    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY, Accept: 'application/json' }
  });
}

function enc(value) {
  return encodeURIComponent(value);
}

async function accountPuuid(riotId) {
  const id = splitRiotId(riotId);
  const data = await riotGet(ASIA, '/riot/account/v1/accounts/by-riot-id/' + enc(id.gameName) + '/' + enc(id.tagLine));
  return data.puuid;
}

async function summoner(puuid) {
  return riotGet(KR, '/lol/summoner/v4/summoners/by-puuid/' + enc(puuid));
}

async function leagueEntries(puuid) {
  return riotGet(KR, '/lol/league/v4/entries/by-puuid/' + enc(puuid));
}

async function spectator(puuid) {
  try {
    return await riotGet(KR, '/lol/spectator/v5/active-games/by-summoner/' + enc(puuid));
  } catch (e) {
    if (e.status === 404) return null; /* 인게임 아님 */
    throw e;
  }
}

async function matchIds(puuid, count) {
  const data = await riotGet(ASIA,
    '/lol/match/v5/matches/by-puuid/' + enc(puuid) + '/ids?queue=' + RANKED_SOLO_QUEUE + '&start=0&count=' + (count || 5));
  return Array.isArray(data) ? data : [];
}

async function matchDetail(matchId) {
  return riotGet(ASIA, '/lol/match/v5/matches/' + enc(matchId));
}

function tierLabel(entry) {
  if (!entry) return '언랭크';
  const tier = TIER_KO[String(entry.tier || '').toUpperCase()] || entry.tier || '';
  const rank = entry.rank && ['MASTER', 'GRANDMASTER', 'CHALLENGER'].indexOf(String(entry.tier).toUpperCase()) === -1
    ? ' ' + entry.rank
    : '';
  return (tier + rank).trim() || '언랭크';
}

function recordLabel(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  const rate = total ? Math.round((wins / total) * 100) : 0;
  return (wins || 0) + '승 ' + (losses || 0) + '패 · 승률 ' + rate + '%';
}

function soloEntry(entries) {
  if (!Array.isArray(entries)) return null;
  return entries.filter(function (e) { return e.queueType === 'RANKED_SOLO_5x5'; })[0] || null;
}

function duration(seconds) {
  let s = Number(seconds) || 0;
  if (s > 100000) s = Math.round(s / 1000); /* 아주 옛 경기는 ms 단위 */
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

/* Match-V5 응답 → 앱의 전적 행 모양 */
function mapMatch(match, puuid) {
  const info = match && match.info;
  if (!info || !Array.isArray(info.participants)) return null;
  const me = info.participants.filter(function (p) { return p.puuid === puuid; })[0];
  if (!me) return null;
  const endMs = info.gameEndTimestamp || info.gameCreation || 0;
  const when = kst(new Date(endMs).toISOString());
  const kills = me.kills || 0;
  const deaths = me.deaths || 0;
  const assists = me.assists || 0;
  return {
    matchId: match.metadata ? match.metadata.matchId : info.gameId,
    d: when ? when.shortDate : '',
    t: when ? when.time : '',
    ts: endMs,
    champ: me.championName || '',
    role: POS_KO[me.teamPosition] || POS_KO[me.individualPosition] || '',
    win: !!me.win,
    kda: kills + '/' + deaths + '/' + assists,
    dur: duration(info.gameDuration),
    perfect: deaths === 0 && kills > 0
  };
}

/* 한 선수: 계정 → 티어 → 인게임 → 최근 경기 */
async function playerSnapshot(player, options) {
  const opts = options || {};
  const out = {
    key: player.key,
    nameKo: player.nameKo,
    riotId: player.riotId,
    status: 'ok',
    tier: null,
    lp: null,
    record: null,
    wins: null,
    losses: null,
    inGame: false,
    inGameChamp: '',
    matches: []
  };
  try {
    const puuid = opts.puuid || await accountPuuid(player.riotId);
    out.puuid = puuid;

    const [entries, live] = await Promise.all([
      leagueEntries(puuid).catch(function (e) { return e; }),
      spectator(puuid).catch(function (e) { return e; })
    ]);

    if (Array.isArray(entries)) {
      const entry = soloEntry(entries);
      if (entry) {
        out.tier = tierLabel(entry);
        out.lp = (entry.leaguePoints || 0) + ' LP';
        out.wins = entry.wins || 0;
        out.losses = entry.losses || 0;
        out.record = recordLabel(entry.wins, entry.losses);
        out.hotStreak = !!entry.hotStreak;
      } else {
        out.tier = '언랭크';
        out.lp = '-';
      }
    } else {
      out.status = 'partial';
      out.leagueError = entries && entries.message ? entries.message : 'tier_error';
    }

    if (live && live.participants) {
      out.inGame = true;
      const meLive = live.participants.filter(function (p) { return p.puuid === puuid; })[0];
      if (meLive && meLive.championId) out.inGameChampId = meLive.championId;
    }

    const ids = await matchIds(puuid, opts.count || 5);
    out.matchIds = ids;
    const cache = opts.cache || null;
    const rows = await Promise.all(ids.map(async function (id) {
      if (cache) {
        try {
          const hit = await cache.getMatch(id);
          if (hit) return hit;
        } catch (e) { /* 캐시 실패는 무시하고 직접 조회 */ }
      }
      const detail = await matchDetail(id).catch(function () { return null; });
      const row = detail ? mapMatch(detail, puuid) : null;
      if (row && cache) { try { await cache.setMatch(id, row); } catch (e) {} }
      return row;
    }));
    out.matches = rows.filter(Boolean);
    if (!out.matches.length && ids.length) out.status = 'partial';
  } catch (e) {
    out.status = e.status === 429 ? 'rate_limited' : (e.status === 404 ? 'not_found' : 'error');
    out.error = e.body || e.message;
  }
  return out;
}

module.exports = {
  hasKey, accountPuuid, summoner, leagueEntries, spectator, matchIds, matchDetail,
  playerSnapshot, mapMatch, tierLabel, recordLabel, PLAYERS, byKey
};
