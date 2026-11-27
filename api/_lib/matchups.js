/* 내전 · 듀오 · 타 팀 프로 매치업 감지 (끝난 경기 · 인게임 공용)
 *
 * 끝난 경기는 Match-V5 참가자에 riotIdGameName / riotIdTagline 이 있어서
 * pros.js 의 '정확히 같은 Riot ID' 표와 그대로 비교합니다 — PUUID 조회가 필요 없습니다.
 * 인게임(Spectator-V5)은 닉네임이 없으므로 pros.js 가 미리 받아 둔 PUUID 표로 비교합니다.
 */
const pros = require('./pros');

/* Match-V5 응답에서 화면·매치업에 필요한 참가자만 추립니다(공용 캐시에 저장). */
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
        win: !!p.win
      };
    })
  };
}

/* 한 판에서 DK 5인끼리, 그리고 타 팀 프로와의 관계를 뽑습니다. */
function tagsForMatch(summary, dkByPuuid) {
  const out = [];
  if (!summary || !Array.isArray(summary.participants)) return out;
  const present = [];
  summary.participants.forEach(function (p) {
    const dk = dkByPuuid[p.puuid];
    if (dk) present.push({ dk: dk, teamId: p.teamId, champion: p.championName });
  });

  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i], b = present[j];
      const ally = a.teamId === b.teamId;
      out.push({
        type: ally ? 'duo' : 'rival',
        keys: [a.dk.key, b.dk.key],
        names: [a.dk.nameKo, b.dk.nameKo],
        ally: ally,
        matchId: summary.matchId
      });
    }
  }

  summary.participants.forEach(function (p) {
    const pro = pros.proForRiotId(p.gameName, p.tagLine);
    if (!pro) return;
    present.forEach(function (me) {
      const ally = me.teamId === p.teamId;
      out.push({
        type: ally ? 'with' : 'vs',
        key: me.dk.key,
        name: me.dk.nameKo,
        pro: { slug: pro.slug, name: pro.name, nameKo: pro.nameKo, team: pro.team, role: pro.role },
        ally: ally,
        matchId: summary.matchId
      });
    });
  });

  return out;
}

/* 대표 배지(가장 최근 판)를 선수별로 하나씩 고릅니다. 듀오/내전을 프로 매치업보다 먼저 보여줍니다. */
const PRIORITY = { rival: 4, duo: 3, vs: 2, with: 1 };

function pickLatest(tags) {
  let best = null;
  tags.forEach(function (t) {
    if (!best) { best = t; return; }
    if (t.matchId === best.matchId) {
      if (PRIORITY[t.type] > PRIORITY[best.type]) best = t;
      return;
    }
    if (String(t.matchId) > String(best.matchId)) best = t;
  });
  return best;
}

/* summaries: [summarizeMatch(...)], dkByPuuid: {puuid: player}
 *   → { byMatch: {matchId: [tag]}, byPlayer: {key: tag}, all: [tag] } */
function analyze(summaries, dkByPuuid) {
  const byMatch = {};
  const byPlayer = {};
  const all = [];
  (summaries || []).forEach(function (s) {
    if (!s) return;
    const tags = tagsForMatch(s, dkByPuuid);
    if (!tags.length) return;
    byMatch[s.matchId] = (byMatch[s.matchId] || []).concat(tags);
    tags.forEach(function (t) { all.push(t); });
  });
  Object.keys(byMatch).forEach(function (mid) {
    byMatch[mid].forEach(function (t) {
      const keys = t.keys || (t.key ? [t.key] : []);
      keys.forEach(function (k) {
        const cur = byPlayer[k];
        if (!cur || String(t.matchId) >= String(cur.matchId)) {
          if (!cur || String(t.matchId) > String(cur.matchId) ||
              PRIORITY[t.type] > PRIORITY[cur.type]) {
            byPlayer[k] = t;
          }
        }
      });
    });
  });
  return { byMatch: byMatch, byPlayer: byPlayer, all: all };
}

module.exports = { summarizeMatch, tagsForMatch, analyze, pickLatest };
