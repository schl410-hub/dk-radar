/* Riot API 클라이언트 (Account-V1 · Summoner-V4 · League-V4 · Spectator-V5 · Match-V5)
 * RIOT_API_KEY 가 없으면 아무 호출도 하지 않습니다.
 */

const { fetchJson, kst } = require('./http');
const { PLAYERS, POS_KO, TIER_KO, splitRiotId, byKey } = require('./players');

const ASIA = process.env.RIOT_ASIA_BASE || 'https://asia.api.riotgames.com';
const KR = process.env.RIOT_KR_BASE || 'https://kr.api.riotgames.com';
const RANKED_SOLO_QUEUE = '420';
const MATCH_TTL = 21600; /* 6시간 · 끝난 경기 상세는 다시 받지 않음 */

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

/* PUUID → Riot ID (인게임 참가자 닉네임 확인용) */
async function accountByPuuid(puuid) {
  return riotGet(ASIA, '/riot/account/v1/accounts/by-puuid/' + enc(puuid));
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

/* Match-V5 응답 → 공용 '참가자 요약' (한 판을 DK 5인이 같이 봐도 조회는 한 번)
 *  - 내전·듀오·프로 매치업 판정에 필요한 참가자 정보를 모두 담습니다. */
function summarizeMatch(match) {
  const info = match && match.info;
  if (!info || !Array.isArray(info.participants)) return null;
  const endMs = info.gameEndTimestamp || info.gameCreation || 0;
  return {
    matchId: (match.metadata && match.metadata.matchId) || String(info.gameId || ''),
    at: endMs,
    queueId: info.queueId || 0,
    gameDuration: info.gameDuration || 0,
    participants: info.participants.map(function (p) {
      return {
        puuid: p.puuid || '',
        gameName: p.riotIdGameName || p.summonerName || '',
        tagLine: p.riotIdTagline || '',
        teamId: Number(p.teamId) || 0,
        championName: p.championName || '',
        teamPosition: p.teamPosition || p.individualPosition || '',
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        assists: p.assists || 0,
        win: !!p.win
      };
    })
  };
}

/* 참가자 요약 → 한 선수의 전적 행 */
function rowFromSummary(summary, puuid) {
  if (!summary || !Array.isArray(summary.participants)) return null;
  const me = summary.participants.filter(function (p) { return p.puuid === puuid; })[0];
  if (!me) return null;
  const when = kst(new Date(summary.at || 0).toISOString());
  return {
    matchId: summary.matchId,
    d: when ? when.shortDate : '',
    t: when ? when.time : '',
    ts: summary.at || 0,
    champ: me.championName || '',
    role: POS_KO[me.teamPosition] || '',
    roleKey: me.teamPosition || '',
    win: !!me.win,
    kda: me.kills + '/' + me.deaths + '/' + me.assists,
    dur: duration(summary.gameDuration),
    perfect: me.deaths === 0 && me.kills > 0
  };
}

/* Match-V5 응답 → 앱의 전적 행 모양 (한 판만 볼 때 쓰는 예전 경로 · /api/check 등) */
function mapMatch(match, puuid) {
  return rowFromSummary(summarizeMatch(match), puuid);
}

/* 끝난 경기 상세를 한 번만 받아 공용 캐시에 두는 도우미 */
function summaryCache(store) {
  return {
    get: function (id) { return store.getJSON('dk:riot:mv5:' + id); },
    set: function (id, summary) { return store.setJSON('dk:riot:mv5:' + id, summary, MATCH_TTL); }
  };
}

/* 한 선수: 계정 → 티어 → 인게임 → 최근 경기
 *  opts.summaries : { get(id), set(id, summary) }  — 같은 판을 두 번 받지 않는 공용 캐시
 *  opts.collected : {}  — 이번 응답에서 확인한 참가자 요약을 모아 둡니다(매치업 판정용)
 *  opts.live      : ''  — 인게임 원본을 out.liveRaw 에 담아 둡니다(응답 전에 지웁니다)
 */
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
        out.tierKey = String(entry.tier || '').toUpperCase();
        out.tierRank = entry.rank || '';
        out.lp = (entry.leaguePoints || 0) + ' LP';
        out.lpValue = entry.leaguePoints || 0;
        out.wins = entry.wins || 0;
        out.losses = entry.losses || 0;
        out.record = recordLabel(entry.wins, entry.losses);
        out.hotStreak = !!entry.hotStreak;
      } else {
        out.tier = '언랭크';
        out.tierKey = '';
        out.tierRank = '';
        out.lp = '-';
        out.lpValue = null;
      }
    } else {
      out.status = 'partial';
      out.leagueError = entries && entries.message ? entries.message : 'tier_error';
    }

    if (live && Array.isArray(live.participants)) {
      out.inGame = true;
      out.liveRaw = live;
      const meLive = live.participants.filter(function (p) { return p.puuid === puuid; })[0];
      if (meLive && meLive.championId) out.inGameChampId = meLive.championId;
      if (Number(live.gameStartTime)) out.gameStartTime = Number(live.gameStartTime);
    }

    const ids = await matchIds(puuid, opts.count || 5);
    out.matchIds = ids;
    const cache = opts.summaries || null;
    const collected = opts.collected || null;
    const rows = await Promise.all(ids.map(async function (id) {
      let summary = null;
      if (cache) {
        try { summary = await cache.get(id); } catch (e) { summary = null; }
      }
      if (!summary) {
        const detail = await matchDetail(id).catch(function () { return null; });
        summary = detail ? summarizeMatch(detail) : null;
        if (summary && cache) { try { await cache.set(id, summary); } catch (e) {} }
      }
      if (summary && collected) collected[id] = summary;
      return summary ? rowFromSummary(summary, puuid) : null;
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
  hasKey, accountPuuid, accountByPuuid, summoner, leagueEntries, spectator, matchIds, matchDetail,
  playerSnapshot, mapMatch, summarizeMatch, rowFromSummary, summaryCache,
  tierLabel, recordLabel, PLAYERS, byKey
};
