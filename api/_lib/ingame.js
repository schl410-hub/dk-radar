/* 인게임(Spectator-V5) 응답 → 화면이 바로 그릴 수 있는 모양
 *
 * Riot 은 참가자마다 puuid·championId·spell1Id·spell2Id·teamId 만 줍니다(닉네임 없음).
 * 그래서
 *   - DK 5인은 이미 받아 둔 PUUID 로 알아보고,
 *   - 타 팀 프로 선수는 pros.js 의 PUUID 표로 알아보고(정확 일치만),
 *   - 나머지는 챔피언만 표시합니다. 닉네임을 추측해서 붙이지 않습니다.
 */
const { championName, spellName } = require('./champions');

const QUEUES = {
  400: 'normal', 420: 'solo', 430: 'normal', 440: 'flex', 450: 'aram',
  490: 'normal', 700: 'clash', 720: 'clash', 900: 'urf', 1020: 'ofa', 0: 'custom'
};

function queueKey(queueId, mode) {
  if (QUEUES[queueId]) return QUEUES[queueId];
  if (mode === 'ARAM') return 'aram';
  if (mode === 'CLASSIC') return 'normal';
  return 'other';
}

function participant(row, mePuuid, dkByPuuid, proByPuuid) {
  const out = {
    championId: row.championId || 0,
    champion: championName(row.championId),
    spell1Id: row.spell1Id || 0,
    spell1: spellName(row.spell1Id),
    spell2Id: row.spell2Id || 0,
    spell2: spellName(row.spell2Id),
    teamId: Number(row.teamId) || 0,
    me: row.puuid === mePuuid,
    who: null
  };
  const dk = dkByPuuid[row.puuid];
  if (dk) {
    out.who = { kind: 'dk', key: dk.key, nameKo: dk.nameKo, mine: row.puuid === mePuuid };
  } else {
    const pro = proByPuuid[row.puuid];
    if (pro) out.who = { kind: 'pro', slug: pro.slug, name: pro.name, nameKo: pro.nameKo, team: pro.team, role: pro.role };
  }
  return out;
}

/* raw: Spectator-V5 응답, opts: { mePuuid, meKey, dkByPuuid, proByPuuid } */
function buildLiveGame(raw, opts) {
  const o = opts || {};
  if (!raw || !Array.isArray(raw.participants)) return null;
  const rows = raw.participants.map(function (p) { return participant(p, o.mePuuid, o.dkByPuuid || {}, o.proByPuuid || {}); });
  const mine = rows.filter(function (r) { return r.me; })[0] || null;

  const byTeam = {};
  rows.forEach(function (r) {
    const t = r.teamId;
    if (!byTeam[t]) byTeam[t] = [];
    byTeam[t].push(r);
  });
  const teamIds = Object.keys(byTeam).map(Number).sort(function (a, b) { return a - b; });
  const teams = teamIds.map(function (id) {
    return {
      teamId: id,
      side: id === 100 ? 'blue' : (id === 200 ? 'red' : 'team'),
      players: byTeam[id]
    };
  });

  const dkAllies = [];
  const dkEnemies = [];
  const pros = [];
  rows.forEach(function (r) {
    if (!r.who) return;
    const ally = mine ? r.teamId === mine.teamId : false;
    if (r.who.kind === 'dk') {
      if (r.me) return;
      (ally ? dkAllies : dkEnemies).push({ key: r.who.key, nameKo: r.who.nameKo, champion: r.champion });
    } else if (r.who.kind === 'pro') {
      pros.push({
        slug: r.who.slug, name: r.who.name, nameKo: r.who.nameKo, team: r.who.team,
        role: r.who.role, ally: ally, champion: r.champion
      });
    }
  });

  /* 배지: 우리 5인끼리 잡히면 듀오/내전, 타 팀 프로가 있으면 with/vs
   * 화면(app.js)·푸시가 같은 모모로 읽도록 이름과 키를 같이 넣어 둡니다. */
  const dkMap = o.dkByPuuid || {};
  const me = o.mePuuid ? (dkMap[o.mePuuid] || null) : null;
  const meKeys = [o.meKey || (me && me.key) || ''];
  const meNames = [me ? me.nameKo : ''];
  const tags = [];
  dkAllies.forEach(function (a) { tags.push({ type: 'duo', keys: meKeys.concat(a.key), names: meNames.concat(a.nameKo), ally: true, champion: a.champion }); });
  dkEnemies.forEach(function (a) { tags.push({ type: 'rival', keys: meKeys.concat(a.key), names: meNames.concat(a.nameKo), ally: false, champion: a.champion }); });
  pros.forEach(function (p) {
    tags.push({
      type: p.ally ? 'with' : 'vs',
      keys: meKeys, names: meNames, ally: p.ally, champion: p.champion,
      pro: { slug: p.slug, name: p.name, nameKo: p.nameKo, team: p.team, role: p.role }
    });
  });

  const now = Date.now();
  const started = Number(raw.gameStartTime) || 0;
  return {
    gameId: Number(raw.gameId) || 0,
    gameStartTime: started,
    gameLength: Number(raw.gameLength) || (started ? Math.max(0, Math.round((now - started) / 1000)) : 0),
    queueId: Number(raw.gameQueueConfigId) || 0,
    queueKey: queueKey(Number(raw.gameQueueConfigId) || 0, raw.gameMode),
    mode: raw.gameMode || '',
    me: mine ? { key: o.meKey || '', teamId: mine.teamId, championId: mine.championId, champion: mine.champion, spell1: mine.spell1, spell2: mine.spell2 } : null,
    teams: teams,
    dk: { allies: dkAllies, enemies: dkEnemies },
    pros: pros,
    tags: tags
  };
}

/* 응답에서 한 선수 몫만 남깁니다(같은 판에 두 명이 있으면 같은 게임이 두 번 실립니다). */
function playerLive(live, meKey) {
  if (!live) return null;
  return Object.assign({}, live, { playerKey: meKey });
}

module.exports = { buildLiveGame, playerLive, queueKey, QUEUES };
