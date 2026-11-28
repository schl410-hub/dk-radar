/* 딮기 시그널 · 공식 경기 '세트별 밴픽 · K/D/A · 딜 비중' 수집
 *
 * 경기로그 탭의 `공식 경기` 화면이 쓰는 데이터입니다.
 *   1) LoL Esports getEventDetails          → 세트(게임) 목록 · 팀별 진영(blue/red) · VOD
 *   2) feed.lolesports.com livestats window → 10명 챔피언 · K/D/A · 골드 · CS · 팀 오브젝트
 *   3) feed.lolesports.com livestats details→ championDamageShare(팀 내 딜 비중 %) · 킬관여
 *   4) Leaguepedia Cargo ScoreboardGames    → 세트별 밴 5:5 + 그 세트 승리 팀 (lolesports 에는 없음)
 *
 * 세트 하나를 읽는 데 window 2회(시작 프레임 · 종료 프레임) + details 1회면 충분합니다.
 * Leaguepedia 의 Gamelength(예: 33:21)로 종료 시각을 바로 계산하고, 없거나 빗나가면
 * 10초 단위 startingTime 으로 4분씩 건너뛰며 finished 프레임을 찾습니다.
 * 끝난 경기의 응답은 바뀌지 않으므로 Redis 에 길게(7일) 캐시합니다.
 */

const { fetchJson, kst } = require('./http');
const store = require('./store');

const BASE = 'https://esports-api.lolesports.com/persisted/gw';
const FEED = 'https://feed.lolesports.com/livestats/v1';
const LP = 'https://lol.fandom.com/api.php';
const LP_EXPORT = 'https://lol.fandom.com/wiki/Special:CargoExport';
const PUBLIC_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const UA = 'dk-signal/1.0 (personal fan app; +https://dk-signal.vercel.app)';

const DK_CODES = ['DK', 'DPLUSKIA', 'DPLUS KIA', 'DPLUS KIA'];
const ROLE_KEY = { top: 'TOP', jungle: 'JGL', mid: 'MID', middle: 'MID', bottom: 'BOT', bot: 'BOT', support: 'SUP', utility: 'SUP' };
/* 앱의 5인과 이름이 같으면 그 선수로 표시합니다 (2026 시즌 로스터는 다를 수 있음). */
const PLAYER_KEYS = {
  doran: 'doran', choihyeonjun: 'doran',
  kanavi: 'kanavi', seojinhyeok: 'kanavi',
  showmaker: 'showmaker', heosu: 'showmaker',
  smash: 'smash', singeumjae: 'smash',
  delight: 'delight', yuhwanjoong: 'delight'
};

function headers() {
  return {
    'x-api-key': process.env.LOLESPORTS_API_KEY || PUBLIC_KEY,
    Origin: 'https://lolesports.com',
    Referer: 'https://lolesports.com/',
    Accept: 'application/json'
  };
}

function isDkTeam(team) {
  if (!team) return false;
  const code = String(team.code || '').toUpperCase().replace(/\s+/g, '');
  if (DK_CODES.indexOf(code) > -1) return true;
  return /dplus\s*kia|dpluskia/i.test(String(team.name || ''));
}

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* ---------- LoL Esports ---------- */

/* getEventDetails 응답에는 경기 시작 시각이 없습니다. 일정(getSchedule)에서 찾아
 * 한 번만 확인하고 하루 동안 기억합니다. (밴 위키 조회·카드 날짜에 필요) */
async function eventStartTime(matchId, hl) {
  const key = 'dk:match:start:' + matchId;
  try {
    const hit = await store.getJSON(key);
    if (hit && hit.startTime) return hit.startTime;
  } catch (e) { /* 캐시 없으면 조회 */ }
  try {
    const url = BASE + '/getSchedule?hl=' + (hl || 'ko-KR');
    const data = await fetchJson(url, { timeout: 9000, label: 'lolesports getSchedule', headers: headers() });
    const events = (data && data.data && data.data.schedule && data.data.schedule.events) || [];
    const hit = events.filter(function (e) { return e.match && String(e.match.id) === String(matchId); })[0];
    if (hit && hit.startTime) {
      try { await store.setJSON(key, { startTime: hit.startTime, block: hit.blockName || '' }, 86400); } catch (e) {}
      return hit.startTime;
    }
  } catch (e) { /* 일정을 못 읽어도 나머지는 보여줍니다 */ }
  return '';
}

/* 일정에서 경기 블록 이름(예: '8강')도 함께 확인합니다. */
async function eventBlockName(matchId, hl) {
  try {
    const hit = await store.getJSON('dk:match:start:' + matchId);
    if (hit && hit.block) return hit.block;
  } catch (e) {}
  await eventStartTime(matchId, hl);
  try {
    const hit = await store.getJSON('dk:match:start:' + matchId);
    return (hit && hit.block) || '';
  } catch (e) { return ''; }
}


async function eventDetails(id, hl) {
  const url = BASE + '/getEventDetails?hl=' + (hl || 'ko-KR') + '&id=' + encodeURIComponent(id);
  const data = await fetchJson(url, { timeout: 8000, label: 'lolesports getEventDetails', headers: headers() });
  return data && data.data && data.data.event ? data.data.event : null;
}

async function feed(path) {
  return fetchJson(FEED + path, { timeout: 9000, label: 'livestats ' + path.split('?')[0], headers: headers() });
}

function tsOf(frame) {
  return frame && frame.rfc460Timestamp ? Date.parse(frame.rfc460Timestamp) : NaN;
}
/* startingTime 은 10초 단위여야 합니다(BAD_QUERY_PARAMETER). */
function round10(ms) { return Math.floor(ms / 10000) * 10000; }
function atParam(ms) { return new Date(round10(ms)).toISOString(); }

/* 세트 하나의 최종 프레임 + 시시각각 프레임을 찾습니다. */
async function finalFrames(gameId, durationSec) {
  const first = await feed('/window/' + gameId);
  const frames = (first && first.frames) || [];
  if (!frames.length) return null;
  const start = tsOf(frames[0]);
  const metadata = first.gameMetadata || {};
  let at = Math.round(start + (durationSec ? durationSec * 1000 : 20 * 60000));
  let last = null;
  let window = null;
  for (let i = 0; i < 7; i++) {
    let w;
    try {
      w = await feed('/window/' + gameId + '?startingTime=' + atParam(at));
    } catch (e) {
      w = null;
    }
    const wf = (w && w.frames) || [];
    if (wf.length) {
      last = wf[wf.length - 1];
      window = w;
      if (last.gameState === 'finished') break;
      /* 아직 끝나지 않았으면 마지막 프레임에서 4분 더 갑니다. */
      at = tsOf(last) + 4 * 60000;
    } else {
      at = at + 4 * 60000;
    }
  }
  return { start: start, metadata: metadata, last: last, window: window, at: at };
}

function teamTotals(side) {
  if (!side) return null;
  const dragons = Array.isArray(side.dragons) ? side.dragons : [];
  return {
    kills: Number(side.totalKills) || 0,
    gold: Number(side.totalGold) || 0,
    towers: Number(side.towers) || 0,
    barons: Number(side.barons) || 0,
    inhibitors: Number(side.inhibitors) || 0,
    dragons: dragons.length
  };
}

/* livestats 의 summonerName 은 "Dplus KIA ShowMaker", "BLG Bin" 처럼 팀 이름이 앞에 붙어 옵니다. */
function shortPlayer(name, teamCode, teamName) {
  const full = String(name || '').trim();
  if (!full) return '';
  const code = String(teamCode || '').toUpperCase();
  const words = full.split(/\s+/);
  const drop = [];
  if (code) drop.push(code.toLowerCase());
  String(teamName || '').split(/\s+/).forEach(function (w) { if (w) drop.push(w.toLowerCase()); });
  drop.push('dplus', 'kia', 'dk');
  let i = 0;
  while (i < words.length - 1 && drop.indexOf(words[i].toLowerCase().replace(/[^a-z0-9]/g, '')) > -1) i++;
  return words.slice(i).join(' ') || full;
}

function playerList(metadata, side, team) {
  const sideMeta = metadata && metadata[side === 'blue' ? 'blueTeamMetadata' : 'redTeamMetadata'];
  const list = (sideMeta && sideMeta.participantMetadata) || [];
  return list.map(function (p) {
    return {
      participantId: p.participantId,
      player: shortPlayer(p.summonerName || p.name || '', (team && team.code) || '', (team && team.name) || ''),
      role: ROLE_KEY[String(p.role || '').toLowerCase()] || String(p.role || '').toUpperCase(),
      champion: p.championId || ''
    };
  });
}

/* ---------- Leaguepedia (밴 · 세트 승리 팀) ---------- */

function lpTime(ms) {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}

function lpWhere(start) {
  return '(Team1="Dplus Kia" OR Team2="Dplus Kia")' +
    ' AND DateTime_UTC >= "' + lpTime(start - 3 * 3600 * 1000) + '"' +
    ' AND DateTime_UTC <= "' + lpTime(start + 8 * 3600 * 1000) + '"';
}

/* 응답 두 가지 모양(api.php 의 cargoquery / CargoExport 의 배열)을 같은 모양으로 맞춥니다. */
function lpRow(raw) {
  const t = raw && raw.title ? raw.title : (raw || {});
  const arr = function (v) { return Array.isArray(v) ? v.join(',') : String(v || ''); };
  return {
    Team1: t.Team1 || '',
    Team2: t.Team2 || '',
    WinTeam: t.WinTeam || '',
    Team1Bans: arr(t.Team1Bans),
    Team2Bans: arr(t.Team2Bans),
    Gamelength: t.Gamelength || '',
    MatchId: t.MatchId || '',
    N: Number(t['N GameInMatch'] || t.N_GameInMatch || 0)
  };
}

async function lpQuery(start, useExport) {
  if (useExport) {
    const url = LP_EXPORT + '?' + new URLSearchParams({
      tables: 'ScoreboardGames',
      fields: 'Team1,Team2,WinTeam,DateTime_UTC,Team1Bans,Team2Bans,Gamelength,MatchId,N_GameInMatch',
      where: lpWhere(start),
      format: 'json',
      limit: '30'
    }).toString();
    const data = await fetchJson(url, {
      timeout: 7000,
      label: 'leaguepedia export',
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Encoding': 'identity' }
    });
    return (Array.isArray(data) ? data : []).map(lpRow);
  }
  const url = LP + '?' + new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    tables: 'ScoreboardGames=SG',
    fields: 'SG.Team1,SG.Team2,SG.WinTeam,SG.DateTime_UTC,SG.Team1Bans,SG.Team2Bans,SG.Gamelength,SG.MatchId,SG.N_GameInMatch,SG.Tournament',
    where: '(SG.Team1="Dplus Kia" OR SG.Team2="Dplus Kia")' +
      ' AND SG.DateTime_UTC >= "' + lpTime(start - 3 * 3600 * 1000) + '"' +
      ' AND SG.DateTime_UTC <= "' + lpTime(start + 8 * 3600 * 1000) + '"',
    order_by: 'SG.DateTime_UTC',
    limit: '30'
  }).toString();
  const data = await fetchJson(url, {
    timeout: 7000,
    label: 'leaguepedia scoreboard',
    headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Encoding': 'identity' }
  });
  if (data && data.error) throw new Error('leaguepedia ' + (data.error.code || 'error'));
  return ((data && data.cargoquery) || []).map(lpRow);
}

/* 위키는 가끔 레이트 리밋을 걸기 때문에 api.php 를 두 번, 그래도 안 되면
 * Special:CargoExport 로 한 번 더 시도합니다. (같은 데이터, 다른 통로) */
async function leaguepediaGames(startIso) {
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return [];
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = await lpQuery(start, attempt === 2);
      if (rows.length) return rows;
    } catch (e) {
      lastError = e;
    }
    await new Promise(function (r) { setTimeout(r, attempt === 0 ? 400 : 900); });
  }
  if (lastError) throw lastError;
  return [];
}

function bansOf(str) {
  return String(str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
}

/* LP 한 줄 → 우리 세트 기준 밴·승리 팀. Team1 은 블루 사이드입니다. */
function lpForSet(rows, setNumber, dkName, oppName) {
  if (!rows || !rows.length) return null;
  const hit = rows.filter(function (r) { return Number(r.N) === Number(setNumber); })[0];
  if (!hit) return null;
  const t1 = String(hit.Team1 || '');
  const t2 = String(hit.Team2 || '');
  const team1IsDk = norm(t1) === norm(dkName) || /dplus/i.test(t1);
  const team2IsDk = norm(t2) === norm(dkName) || /dplus/i.test(t2);
  if (!team1IsDk && !team2IsDk) return null;
  const dkIsTeam1 = team1IsDk && !team2IsDk;
  const win = String(hit.WinTeam || '');
  const winIsDk = /dplus/i.test(win) || norm(win) === norm(dkName);
  const len = /^(\d+):(\d+)$/.exec(String(hit.Gamelength || ''));
  return {
    dkBans: bansOf(dkIsTeam1 ? hit.Team1Bans : hit.Team2Bans),
    oppBans: bansOf(dkIsTeam1 ? hit.Team2Bans : hit.Team1Bans),
    dkTeam1: dkIsTeam1,
    win: win ? winIsDk : null,
    duration: len ? Number(len[1]) * 60 + Number(len[2]) : null,
    source: 'leaguepedia'
  };
}

/* ---------- 세트 하나 ---------- */

async function buildSet(game, ctx) {
  const out = {
    number: game.number || null,
    gameId: String(game.id || ''),
    state: game.state || 'unstarted',
    dkSide: '',
    oppSide: '',
    win: null,
    duration: null,
    bans: null,
    bansSource: '',
    players: [],
    team: null
  };
  const sides = Array.isArray(game.teams) ? game.teams : [];
  sides.forEach(function (t) {
    if (String(t.id) === String(ctx.dkTeamId)) out.dkSide = t.side || '';
    else out.oppSide = t.side || '';
  });

  const lp = lpForSet(ctx.lpRows, game.number, ctx.dkName, ctx.oppName);
  if (lp) {
    out.bans = { dk: lp.dkBans, opp: lp.oppBans };
    out.bansSource = lp.source;
    out.win = lp.win;
    out.duration = lp.duration;
  }
  if (out.state !== 'completed' || !out.gameId) return out;

  try {
    const ff = await finalFrames(out.gameId, lp && lp.duration);
    if (!ff || !ff.last) return out;
    const last = ff.last;
    if (!out.duration) {
      const sec = Math.round((tsOf(last) - ff.start) / 1000);
      if (Number.isFinite(sec) && sec > 0) out.duration = sec;
    }
    /* 딜 비중 · 킬관여 */
    let details = null;
    try {
      const d = await feed('/details/' + out.gameId + '?startingTime=' + atParam(ff.at));
      const df = (d && d.frames) || [];
      if (df.length) details = df[df.length - 1];
    } catch (e) { details = null; }
    const dById = {};
    if (details && Array.isArray(details.participants)) {
      details.participants.forEach(function (p) { dById[p.participantId] = p; });
    }
    const statsById = {};
    ['blueTeam', 'redTeam'].forEach(function (side) {
      const t = last[side];
      (t && t.participants ? t.participants : []).forEach(function (p) { statsById[p.participantId] = p; });
    });

    const dkMeta = playerList(ff.metadata, out.dkSide, ctx.dkTeam);
    out.players = dkMeta.map(function (p) {
      const s = statsById[p.participantId] || {};
      const d = dById[p.participantId] || {};
      const k = Number(s.kills) || 0, dd = Number(s.deaths) || 0, a = Number(s.assists) || 0;
      const share = Number.isFinite(Number(d.championDamageShare)) ? Number(d.championDamageShare) * 100 : null;
      const kp = Number.isFinite(Number(d.killParticipation)) ? Number(d.killParticipation) * 100 : null;
      const key = PLAYER_KEYS[norm(p.player)] || '';
      return {
        key: key,
        player: p.player,
        role: p.role,
        champion: p.champion,
        k: k, d: dd, a: a,
        kda: dd ? Math.round(((k + a) / dd) * 10) / 10 : (k + a),
        kp: kp == null ? null : Math.round(kp),
        cs: Number(s.creepScore) || 0,
        gold: Number(s.totalGold) || 0,
        damageShare: share == null ? null : Math.round(share * 10) / 10
      };
    });

    const dkTotals = teamTotals(last[out.dkSide === 'blue' ? 'blueTeam' : 'redTeam']);
    const oppTotals = teamTotals(last[out.oppSide === 'blue' ? 'blueTeam' : 'redTeam']);
    out.team = { dk: dkTotals, opp: oppTotals };
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }
  return out;
}

function vodFor(games, langKey) {
  const locale = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', tw: 'zh-TW', vi: 'vi-VN' }[langKey] || 'en-US';
  const prefs = langKey === 'ko' ? ['afreecatv', 'youtube', 'twitch'] : ['youtube', 'twitch', 'afreecatv'];
  for (let pi = 0; pi < prefs.length; pi++) {
    for (let gi = 0; gi < games.length; gi++) {
      const vods = games[gi].vods || [];
      const hit = vods.filter(function (v) { return v.provider === prefs[pi] && v.locale === locale && v.parameter; })[0];
      if (!hit) continue;
      const p = hit.provider;
      const sec = Number.isFinite(hit.startMillis) ? Math.floor(hit.startMillis / 1000) : 0;
      const url = p === 'youtube' ? 'https://www.youtube.com/watch?v=' + hit.parameter + (sec ? '&t=' + sec + 's' : '')
        : p === 'twitch' ? 'https://www.twitch.tv/videos/' + hit.parameter + (sec ? '?t=' + Math.floor(sec / 3600) + 'h' + Math.floor((sec % 3600) / 60) + 'm' + (sec % 60) + 's' : '')
          : 'https://vod.sooplive.com/player/' + hit.parameter + (sec ? '?change_second=' + sec : '');
      return { provider: p, url: url };
    }
  }
  return null;
}

/* ---------- 바깥에 내보내는 함수 ---------- */

async function getMatchDetail(matchId, options) {
  const opts = options || {};
  const hl = opts.hl || 'ko-KR';
  const langKey = opts.lang || 'ko';
  const fresh = !!opts.refresh;
  const key = 'dk:match:' + matchId + ':' + hl;

  if (!fresh) {
    try {
      const hit = await store.getJSON(key);
      if (hit) return hit;
    } catch (e) { /* 캐시가 없으면 조회 */ }
  }

  const event = await eventDetails(matchId, hl);
  if (!event || !event.match) return { ok: false, id: matchId, error: 'event_not_found' };

  const match = event.match;
  const teams = Array.isArray(match.teams) ? match.teams : [];
  const dkTeam = teams.filter(isDkTeam)[0];
  const oppTeam = teams.filter(function (t) { return !isDkTeam(t); })[0];
  if (!dkTeam) return { ok: false, id: matchId, error: 'not_dk_match' };

  const startIso = opts.startTime || event.startTime || match.startTime || (await eventStartTime(matchId, hl));
  const when = kst(startIso);
  const games = Array.isArray(match.games) ? match.games : [];
  const completed = games.filter(function (g) { return g.state === 'completed'; });

  let lpRows = [];
  if (completed.length) {
    try { lpRows = await leaguepediaGames(startIso); } catch (e) { lpRows = []; }
  }

  const ctx = {
    dkTeamId: dkTeam.id,
    dkTeam: dkTeam,
    dkName: dkTeam.name || 'Dplus Kia',
    oppName: (oppTeam && oppTeam.name) || '',
    lpRows: lpRows
  };
  const sets = [];
  for (let i = 0; i < completed.length; i++) {
    sets.push(await buildSet(completed[i], ctx));
  }

  const dkWins = dkTeam.result && typeof dkTeam.result.gameWins === 'number' ? dkTeam.result.gameWins : null;
  const oppWins = oppTeam && oppTeam.result && typeof oppTeam.result.gameWins === 'number' ? oppTeam.result.gameWins : null;

  const result = {
    ok: true,
    id: String(match.id || matchId),
    source: 'lolesports',
    fetchedAt: new Date().toISOString(),
    state: (event.state || '').toLowerCase() || (completed.length ? 'completed' : 'unstarted'),
    league: { name: (event.league && event.league.name) || '', slug: (event.league && event.league.slug) || '' },
    block: event.blockName || (await eventBlockName(matchId, hl)),
    bo: (match.strategy && match.strategy.count) || null,
    startIso: when ? when.iso : '',
    date: when ? when.date : '',
    time: when ? when.time : '',
    weekday: when ? when.weekday : '',
    dk: { code: dkTeam.code || 'DK', name: dkTeam.name || '', image: dkTeam.image || '', wins: dkWins },
    opponent: oppTeam ? { code: oppTeam.code || '', name: oppTeam.name || '', image: oppTeam.image || '', wins: oppWins } : null,
    score: (dkWins != null && oppWins != null) ? dkWins + ' : ' + oppWins : '',
    win: (dkWins != null && oppWins != null && dkWins !== oppWins) ? dkWins > oppWins
      : (dkTeam.result && dkTeam.result.outcome === 'win' ? true : (dkTeam.result && dkTeam.result.outcome === 'loss' ? false : null)),
    sets: sets,
    vod: completed.length ? vodFor(completed, langKey) : null,
    bans: sets.some(function (s) { return s.bans; }) ? 'leaguepedia' : ''
  };

  const ttl = result.state !== 'completed' ? 120
    /* 밴(위키)까지 받았으면 사실상 안 바뀌므로 7일, 밴이 비었으면 30분 뒤 다시 시도합니다. */
    : (result.bans ? 7 * 24 * 3600 : 1800);
  try { await store.setJSON(key, result, ttl); } catch (e) { /* 캐시 실패는 무시 */ }
  return result;
}

module.exports = { getMatchDetail };
