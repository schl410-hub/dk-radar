/* /api/* 함수 동작 검증 (Vercel 없이, 실제 코드 그대로)
 *
 *   node tools/api_smoke.js
 *
 *  - 공식 일정: 실제 LoL Esports API 1회 호출 + 고정 픽스처(다음 경기 없음/있음)
 *  - 솔로랭크: 키 없음(스냅샷) + 가짜 Riot 서버(실시간 변환 검증)
 *  - 구독/점검: 가짜 Upstash Redis REST + 가짜 Riot 서버로 기준선 → 새 경기 감지 → 푸시 미리보기
 *  - 푸시 암호화: 실제 VAPID 키로 generateRequestDetails 가 만들어지는지
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const root = path.resolve(__dirname, '..');
let pass = 0;
let failCount = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS ' + name + (detail ? ' :: ' + detail : '')); }
  else { failCount++; failures.push(name); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

/* ---------------- 가짜 Redis (Upstash REST) ---------------- */
const kv = new Map();
function kvCmd(args) {
  const op = String(args[0] || '').toUpperCase();
  const key = args[1];
  if (op === 'GET') {
    const hit = kv.get(key);
    if (!hit) return null;
    if (hit.exp && hit.exp < Date.now()) { kv.delete(key); return null; }
    return hit.value;
  }
  if (op === 'SET') {
    const exIdx = args.indexOf('EX');
    const exp = exIdx > -1 ? Date.now() + Number(args[exIdx + 1]) * 1000 : 0;
    kv.set(key, { value: String(args[2]), exp: exp });
    return 'OK';
  }
  if (op === 'DEL') { const had = kv.delete(key); return had ? 1 : 0; }
  if (op === 'INCR') {
    const hit = kv.get(key);
    const n = Number(hit ? hit.value : 0) + 1;
    kv.set(key, { value: String(n), exp: hit ? hit.exp : 0 });
    return n;
  }
  if (op === 'EXPIRE') { const hit = kv.get(key); if (hit) hit.exp = Date.now() + Number(args[2]) * 1000; return 1; }
  if (op === 'MGET') {
    return args.slice(1).map(function (k) {
      const hit = kv.get(k);
      if (!hit) return null;
      if (hit.exp && hit.exp < Date.now()) { kv.delete(k); return null; }
      return hit.value;
    });
  }
  if (op === 'KEYS') return Array.from(kv.keys());
  return null;
}

function startMockRedis() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      let raw = '';
      req.on('data', function (c) { raw += c; });
      req.on('end', function () {
        let result = null;
        try { result = kvCmd(JSON.parse(raw)); } catch (e) { result = null; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: result }));
      });
    });
    srv.listen(0, '127.0.0.1', function () { resolve({ srv: srv, port: srv.address().port }); });
  });
}

/* ---------------- 가짜 Riot API ---------------- */
const riotState = {
  matchIds: {},          /* puuid -> [{id, ...}] */
  inGame: {},            /* puuid -> bool */
  games: {},             /* puuid -> Spectator-V5 응답 (양 팀 참가자) */
  requests: 0
};

function idsFor(puuid) {
  return riotState.matchIds[puuid] || [];
}

function mockMatch(id, puuid, opts) {
  const o = opts || {};
  const end = Date.now() - (o.agoMinutes || 30) * 60000;
  const parts = [
    {
      puuid: puuid, championName: o.champ || '카밀', teamPosition: o.pos || 'TOP',
      kills: o.kills === undefined ? 8 : o.kills,
      deaths: o.deaths === undefined ? 2 : o.deaths,
      assists: o.assists === undefined ? 9 : o.assists,
      win: o.win === undefined ? true : o.win,
      teamId: o.teamId || 100,
      riotIdGameName: o.gameName || '',
      riotIdTagline: o.tagLine || ''
    }
  ];
  (o.mates || []).forEach(function (m) {
    parts.push({
      puuid: m.puuid, championName: m.champ || '아지르', teamPosition: m.pos || 'MIDDLE',
      kills: m.kills === undefined ? 2 : m.kills, deaths: m.deaths === undefined ? 4 : m.deaths,
      assists: m.assists === undefined ? 6 : m.assists,
      win: m.win === undefined ? (o.win === undefined ? true : o.win) : !!m.win,
      teamId: m.teamId || 100,
      riotIdGameName: m.gameName || '',
      riotIdTagline: m.tagLine || ''
    });
  });
  parts.push({ puuid: 'someone-else', championName: '이렐리아', teamPosition: 'BOTTOM', kills: 1, deaths: 5, assists: 2, win: !(o.win === undefined ? true : o.win), teamId: 200 });
  return {
    metadata: { matchId: id },
    info: {
      gameCreation: end - 1800000,
      gameEndTimestamp: end,
      gameDuration: o.duration || 1452,
      queueId: 420,
      participants: parts
    }
  };
}

function startMockRiot() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      riotState.requests++;
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = function (code, obj) {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      let m;
      if ((m = /^\/riot\/account\/v1\/accounts\/by-puuid\/(.+)$/.exec(url.pathname))) {
        const puuid = decodeURIComponent(m[1]);
        return send(200, { puuid: puuid, gameName: String(puuid).replace(/^puuid:/, ''), tagLine: 'KR1' });
      }
      if ((m = /^\/riot\/account\/v1\/accounts\/by-riot-id\/([^/]+)\/([^/]+)$/.exec(url.pathname))) {
        const name = decodeURIComponent(m[1]);
        return send(200, { puuid: 'puuid:' + name, gameName: name, tagLine: decodeURIComponent(m[2]) });
      }
      if ((m = /^\/lol\/league\/v4\/entries\/by-puuid\/(.+)$/.exec(url.pathname))) {
        const puuid = decodeURIComponent(m[1]);
        return send(200, [{
          queueType: 'RANKED_SOLO_5x5', tier: /showmaker/i.test(puuid) ? 'MASTER' : 'DIAMOND',
          rank: 'I', leaguePoints: 75, wins: 349, losses: 273
        }]);
      }
      if ((m = /^\/lol\/spectator\/v5\/active-games\/by-summoner\/(.+)$/.exec(url.pathname))) {
        const puuid = decodeURIComponent(m[1]);
        if (riotState.games[puuid]) return send(200, riotState.games[puuid]);
        if (riotState.inGame[puuid]) {
          return send(200, { gameId: 1, participants: [{ puuid: puuid, championId: 141 }] });
        }
        return send(404, { status: { status_code: 404, message: 'Not found' } });
      }
      if ((m = /^\/lol\/match\/v5\/matches\/by-puuid\/([^/]+)\/ids$/.exec(url.pathname))) {
        const puuid = decodeURIComponent(m[1]);
        return send(200, idsFor(puuid).map(function (r) { return r.id; }));
      }
      if ((m = /^\/lol\/match\/v5\/matches\/([^/]+)$/.exec(url.pathname))) {
        const id = decodeURIComponent(m[1]);
        let found = null;
        Object.keys(riotState.matchIds).forEach(function (k) {
          (riotState.matchIds[k] || []).forEach(function (r) { if (r.id === id) found = r; });
        });
        if (!found) return send(404, { status: { status_code: 404 } });
        return send(200, mockMatch(id, found.puuid, found));
      }
      send(404, { status: { status_code: 404, message: 'unknown path ' + url.pathname } });
    });
    srv.listen(0, '127.0.0.1', function () { resolve({ srv: srv, port: srv.address().port }); });
  });
}

/* ---------------- 가짜 SOOP / CHZZK (라이브 방송 상태) ---------------- */
const streamState = {
  soop: {},   /* id -> { title, viewers, startedAt } */
  chzzk: {},  /* id -> { title, viewers, openAt } */
  notices: {} /* id -> [{ title_no, title_name, board_type, is_notice, reg_date }] */
};

function startMockStreams() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = function (code, obj) {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      let m;
      if ((m = /^\/soop\/([^/]+)\/station$/.exec(url.pathname))) {
        const id = decodeURIComponent(m[1]);
        const row = streamState.soop[id];
        if (!row) return send(200, { station: { user_id: id, user_nick: id }, broad: null });
        return send(200, {
          station: { user_id: id, user_nick: row.title, station_title: row.title },
          broad: {
            broad_no: 1,
            broad_title: row.title,
            current_sum_viewer: row.viewers,
            broad_start: row.startedAt,
            broad_thumb: row.thumb === undefined ? '//thumbs.sooplive.co.kr/choi15778/broad.jpg' : row.thumb,
            broad_cate: row.category === undefined ? '리그 오브 레전드' : row.category
          }
        });
      }
      if ((m = /^\/soop\/([^/]+)\/home$/.exec(url.pathname))) {
        const id = decodeURIComponent(m[1]);
        const rows = streamState.notices[id] || [];
        return send(200, {
          station: { user_id: id, user_nick: id },
          boards: rows.map(function (r) {
            return {
              bbs_no: r.bbs_no === undefined ? 130689055 : r.bbs_no,
              title_no: r.title_no,
              title_name: r.title_name,
              board_type: r.board_type === undefined ? 104 : r.board_type,
              is_notice: r.is_notice === undefined ? true : r.is_notice,
              reg_date: r.reg_date || '2026-11-28 15:08:31',
              user_id: id
            };
          })
        });
      }
      if ((m = /^\/chzzk\/([^/]+)\/live-status$/.exec(url.pathname))) {
        const id = decodeURIComponent(m[1]);
        const row = streamState.chzzk[id];
        if (!row) return send(200, { code: 200, message: null, content: null });
        return send(200, {
          code: 200,
          message: null,
          content: {
            status: 'OPEN', liveTitle: row.title, concurrentUserCount: row.viewers, openDate: row.openAt,
            liveImageUrl: row.thumb === undefined
              ? 'https://livecloud-thumb.akamaized.net/chzzk/livecloud/KR/test/{type}_{time}.jpg?type=360'
              : row.thumb,
            liveCategoryValue: row.category === undefined ? '리그 오브 레전드' : row.category
          }
        });
      }
      send(404, { error: 'unknown stream path ' + url.pathname });
    });
    srv.listen(0, '127.0.0.1', function () { resolve({ srv: srv, port: srv.address().port }); });
  });
}

/* ---------------- 함수 호출 도우미 ---------------- */
function call(handler, opts) {
  const o = opts || {};
  return new Promise(function (resolve) {
    const req = new EventEmitter();
    req.method = o.method || 'GET';
    req.url = o.url || '/api/x';
    req.headers = o.headers || {};
    if (o.body !== undefined) {
      req.body = typeof o.body === 'string' ? o.body : JSON.stringify(o.body);
    }
    const res = {
      statusCode: 200,
      headers: {},
      headersSent: false,
      body: '',
      setHeader: function (k, v) { this.headers[k.toLowerCase()] = v; },
      status: function (c) { this.statusCode = c; return this; },
      send: function (b) { this.headersSent = true; this.body = b; return this; },
      end: function (b) { this.headersSent = true; if (b !== undefined) this.body = b; return this; }
    };
    Promise.resolve(handler(req, res)).then(function () {
      let json = null;
      try { json = JSON.parse(res.body); } catch (e) {}
      resolve({ status: res.statusCode, json: json, raw: res.body, headers: res.headers });
    }).catch(function (e) { resolve({ status: 0, json: null, error: String(e && e.stack || e) }); });
  });
}

function withFixture(name) {
  const file = path.join(__dirname, 'fixtures', 'schedule-' + name + '.json');
  global.fetch = async function (url, opts) {
    const u = String(url);
    if (u.indexOf('esports-api.lolesports.com') > -1) {
      return new Response(fs.readFileSync(file, 'utf8'), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, opts);
  };
}
const realFetch = global.fetch;

function assertNoSecrets(obj) {
  const text = JSON.stringify(obj);
  return !/VAPID_PRIVATE|RIOT_API_KEY/.test(text);
}

async function main() {
  const redis = await startMockRedis();
  const riotSrv = await startMockRiot();
  const streamSrv = await startMockStreams();

  process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:' + redis.port;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.PUSH_DRY_RUN = '1';
  process.env.DK_ALLOW_MEMORY_STORE = '1';
  process.env.CHECK_SECRET = 'smoke-secret';
  process.env.RIOT_ASIA_BASE = 'http://127.0.0.1:' + riotSrv.port;
  process.env.RIOT_KR_BASE = 'http://127.0.0.1:' + riotSrv.port;
  process.env.DK_SOOP_BASE = 'http://127.0.0.1:' + streamSrv.port + '/soop/';
  process.env.DK_CHZZK_BASE = 'http://127.0.0.1:' + streamSrv.port + '/chzzk/';

  /* --- 1. 공식 일정: 실제 API --- */
  const official = require('../api/official');
  const live = await call(official, { url: '/api/official?refresh=1' });
  check('official live status 200', live.status === 200, live.status);
  check('official live ok', live.json && live.json.ok === true, live.json && (live.json.error || live.json.status));
  if (live.json && live.json.ok) {
    check('official live recent array', Array.isArray(live.json.recent) && live.json.recent.length > 0, live.json.recent && live.json.recent.length);
    const top = live.json.recent[0];
    check('official live recent has DK score', !!top && /^\d+ : \d+$/.test(top.score || ''), top && (top.opponent && top.opponent.code) + ' ' + (top && top.score));
    check('official live recent kst fields', !!top && /^\d+\. \d+\.$/.test(top.dateLabel) && /^\d{2}:\d{2}$/.test(top.time), top && (top.dayLabel + ' ' + top.time));
    check('official live next null or shaped',
      live.json.next === null || (live.json.next && live.json.next.opponent && live.json.next.epoch), live.json.next && live.json.next.id);
    check('official live source label', live.json.source === 'lolesports', live.json.source);
    console.log('     · 현재 다음 경기: ' + (live.json.next ? live.json.next.dayLabel + ' ' + live.json.next.time + ' vs ' + live.json.next.opponent.name : '없음(비시즌)') + ', 최근 ' + live.json.recent.length + '경기');
  } else {
    /* 실패해도 함수가 죽지 않고 fallback 상태를 돌려주는지가 핵심 */
    check('official live degrades cleanly', live.json && live.json.ok === false && live.json.status === 'unavailable', live.json && live.json.detail);
  }

  /* --- 2. 공식 일정: 픽스처 --- */
  withFixture('none');
  const none = await call(official, { url: '/api/official?refresh=1' });
  check('official fixture none → next null', none.json && none.json.next === null, none.json && none.json.status);
  check('official fixture none → recent 4', none.json && none.json.recent.length === 4, none.json && none.json.recent.length);
  check('official fixture none → no_upcoming', none.json && none.json.status === 'no_upcoming', none.json && none.json.note);
  check('official fixture none → korean note by default', none.json && /아직 공개되지/.test(none.json.note || ''), none.json && none.json.note);
  const noneZh = await call(official, { url: '/api/official?refresh=1&lang=zh' });
  check('official zh note localized', noneZh.json && /尚未公布/.test(noneZh.json.note || ''), noneZh.json && noneZh.json.note);

  withFixture('next');
  const nextFix = await call(official, { url: '/api/official?refresh=1' });
  const n = nextFix.json && nextFix.json.next;
  check('official fixture next → next exists', !!n, nextFix.json && nextFix.json.status);
  check('official fixture next → opponent DK side', !!n && n.opponent.code === 'BLG' && n.dk.code === 'DK', n && (n.dk.code + ' vs ' + n.opponent.code));
  check('official fixture next → KST 17:00', !!n && n.time === '17:00' && n.dateLabel === '12. 3.', n && (n.dayLabel + ' ' + n.time));
  check('official fixture next → weekday 목', !!n && n.weekday === '목', n && n.weekday);
  check('official fixture next → startIso +09:00', !!n && /\+09:00$/.test(n.startIso), n && n.startIso);
  check('official fixture next → bo', !!n && n.bo === 5, n && n.bo);
  check('official cache hit second call', (await call(official, { url: '/api/official' })).json.servedFrom === 'cache', null);
  global.fetch = realFetch;

  /* --- 2b. 공식 경기 상세(/api/match): 세트별 밴픽·스탯 --- */
  const match = require('../api/match');
  const noId = await call(match, { url: '/api/match' });
  check('match without id → 400', noId.status === 400 && noId.json && noId.json.ok === false, noId.status + ' ' + (noId.json && noId.json.error));
  const unknown = await call(match, { url: '/api/match?id=000000000000000000' });
  check('match unknown id → ok:false (서버 안 죽음)', unknown.status === 200 && unknown.json && unknown.json.ok === false, unknown.json && (unknown.json.error || unknown.json.detail));

  const recentId = live.json && live.json.ok && live.json.recent && live.json.recent[0] ? live.json.recent[0].id : '';
  if (recentId) {
    const md = await call(match, { url: '/api/match?id=' + recentId + '&refresh=1' });
    check('match live status 200', md.status === 200, md.status);
    if (md.json && md.json.ok) {
      const sets = md.json.sets || [];
      const s0 = sets[0] || {};
      check('match live sets', sets.length >= 1, sets.length);
      check('match live set has sides', !!s0.dkSide && (s0.dkSide === 'blue' || s0.dkSide === 'red'), s0.dkSide + '/' + s0.oppSide);
      check('match live 5 dk players', (s0.players || []).length === 5, (s0.players || []).length);
      check('match live player fields',
        (s0.players || []).every(function (p) { return p.champion && p.role && typeof p.k === 'number' && typeof p.d === 'number' && typeof p.a === 'number' && typeof p.damageShare === 'number'; }),
        JSON.stringify((s0.players || [])[0] || {}));
      check('match live damage share in %', (s0.players || []).every(function (p) { return p.damageShare >= 0 && p.damageShare <= 100; }), (s0.players || []).map(function (p) { return p.damageShare; }).join(','));
      check('match live team objectives', !!(s0.team && s0.team.dk && typeof s0.team.dk.kills === 'number'), s0.team && JSON.stringify(s0.team.dk));
      check('match live startIso +09:00', /\+09:00$/.test(md.json.startIso || ''), md.json.startIso);
      const withBans = sets.filter(function (s) { return s.bans && s.bans.dk && s.bans.dk.length === 5; });
      console.log('     · 세트 ' + sets.length + '개, 밴 있는 세트 ' + withBans.length + '개 (위키 응답에 따라 달라질 수 있음)');
      if (withBans.length) {
        check('match bans 5:5', withBans.every(function (s) { return s.bans.opp.length === 5; }), withBans.length);
        check('match set winner', withBans.every(function (s) { return typeof s.win === 'boolean'; }), withBans.map(function (s) { return s.win; }).join(','));
      }
    } else {
      check('match live degrades cleanly', md.json && md.json.ok === false, md.json && (md.json.error || md.json.detail));
    }
  } else {
    console.log('     · 최근 공식 경기가 없어 /api/match 실호출은 건너뜀');
  }
  global.fetch = realFetch;

  /* --- 3. 솔로랭크: 키 없음 → 스냅샷 --- */
  const solo = require('../api/solo');
  delete process.env.RIOT_API_KEY;
  const snap = await call(solo, { url: '/api/solo' });
  check('solo no key → snapshot', snap.json && snap.json.source === 'snapshot' && snap.json.status === 'no_key', snap.json && snap.json.status);
  check('solo snapshot 5 players', snap.json && snap.json.players.length === 5, snap.json && snap.json.players.length);
  check('solo snapshot keeps tier', snap.json && snap.json.players[0].tier === '다이아몬드 1', snap.json && snap.json.players[0].tier);
  check('solo snapshot message', snap.json && /RIOT_API_KEY/.test(snap.json.message || ''), snap.json && snap.json.message.slice(0, 40));

  /* --- 4. 솔로랭크: 키 있음 → 가짜 Riot --- */
  process.env.RIOT_API_KEY = 'RGAPI-test-key';
  riotState.matchIds = {
    'puuid:어리고싶다': [{ id: 'KR_1', puuid: 'puuid:어리고싶다', champ: '카밀', kills: 8, deaths: 2, assists: 9, win: true }],
    'puuid:vinaka': [{ id: 'KR_2', puuid: 'puuid:vinaka', champ: '자르반 4세', kills: 3, deaths: 7, assists: 12, win: false }],
    'puuid:DK ShowMaker': [],
    'puuid:DK Smash': [],
    'puuid:플레이리스트겨울': []
  };
  riotState.inGame = { 'puuid:vinaka': true };
  const liveSolo = await call(solo, { url: '/api/solo?refresh=1' });
  check('solo riot → source riot', liveSolo.json && liveSolo.json.source === 'riot', liveSolo.json && liveSolo.json.source);
  const doran = liveSolo.json && liveSolo.json.players.filter(function (p) { return p.key === 'doran'; })[0];
  check('solo riot → tier/lp', !!doran && doran.tier === '다이아몬드 I' && doran.lp === '75 LP', doran && (doran.tier + ' ' + doran.lp));
  check('solo riot → record', !!doran && doran.record === '349승 273패 · 승률 56%', doran && doran.record);
  check('solo riot → match row', !!doran && doran.matches.length === 1 && doran.matches[0].champ === '카밀' && doran.matches[0].kda === '8/2/9' && doran.matches[0].dur === '24:12', doran && JSON.stringify(doran.matches[0]));
  check('solo riot → match date KST', !!doran && /^\d{2}\.\d{2}\.$/.test(doran.matches[0].d) && /^\d{2}:\d{2}$/.test(doran.matches[0].t), doran && (doran.matches[0].d + ' ' + doran.matches[0].t));
  const kanavi = liveSolo.json && liveSolo.json.players.filter(function (p) { return p.key === 'kanavi'; })[0];
  check('solo riot → inGame flag', !!kanavi && kanavi.inGame === true && doran.inGame === false, kanavi && kanavi.inGame);
  const sm = liveSolo.json && liveSolo.json.players.filter(function (p) { return p.key === 'showmaker'; })[0];
  check('solo riot → empty player ok', !!sm && sm.status === 'ok' && sm.matches.length === 0 && sm.tier === '마스터', sm && (sm.status + ' ' + sm.tier));
  check('solo riot → no secret leak', assertNoSecrets(liveSolo.json));

  /* --- 4-1. 인게임 레이더(Spectator-V5) · 내전/프로 매치업 --- */
  const filler = ['a', 'b', 'c', 'd', 'e', 'f'];
  const gameParticipants = [
    { puuid: 'puuid:어리고싶다', championId: 157, spell1Id: 4, spell2Id: 12, teamId: 100 },
    { puuid: 'puuid:vinaka', championId: 64, spell1Id: 4, spell2Id: 11, teamId: 100 },
    { puuid: 'puuid:DK ShowMaker', championId: 103, spell1Id: 4, spell2Id: 14, teamId: 200 },
    { puuid: 'puuid:Hide on bush', championId: 238, spell1Id: 4, spell2Id: 14, teamId: 100 }
  ];
  filler.forEach(function (f, i) {
    gameParticipants.push({ puuid: 'puuid:filler-' + f, championId: 1 + i, spell1Id: 4, spell2Id: 7, teamId: i < 2 ? 100 : 200 });
  });
  riotState.games['puuid:어리고싶다'] = {
    gameId: 99112233,
    gameStartTime: Date.now() - 13 * 60000,
    gameLength: 780,
    gameQueueConfigId: 420,
    gameMode: 'CLASSIC',
    participants: gameParticipants
  };
  riotState.matchIds['puuid:어리고싶다'] = [
    {
      id: 'KR_100', puuid: 'puuid:어리고싶다', champ: '카밀', teamId: 100, awayMinutes: 12,
      mates: [
        { puuid: 'puuid:DK ShowMaker', teamId: 200, champ: '아지르' },
        { puuid: 'puuid:Hide on bush', teamId: 100, champ: '야스오', gameName: 'Hide on bush', tagLine: 'KR1' }
      ]
    },
    { id: 'KR_1', puuid: 'puuid:어리고싶다', champ: '카밀' }
  ];

  const radar = await call(solo, { url: '/api/solo?refresh=1' });
  const lgList = (radar.json && radar.json.liveGames) || [];
  check('radar → liveGames has doran', lgList.length === 2 && lgList.some(function (g) { return g.playerKey === 'doran'; }),
        lgList.map(function (g) { return g.playerKey + ':' + g.gameId; }).join(' '));
  const lg = lgList.filter(function (g) { return g.playerKey === 'doran'; })[0];
  check('radar → two teams of 5', !!lg && lg.teams.length === 2 && lg.teams.every(function (t) { return t.players.length === 5; }),
        lg && lg.teams.map(function (t) { return t.teamId + ':' + t.players.length; }).join(' '));
  check('radar → champion by id', !!lg && lg.me && lg.me.champion === 'Yasuo' && lg.me.spell2 === 'Teleport',
        lg && lg.me && (lg.me.champion + ' ' + lg.me.spell1 + '/' + lg.me.spell2));
  check('radar → queue key', !!lg && lg.queueKey === 'solo' && lg.queueId === 420, lg && lg.queueKey);
  check('radar → dk ally/enemy', !!lg && lg.dk.allies.length === 1 && lg.dk.allies[0].key === 'kanavi' &&
        lg.dk.enemies.length === 1 && lg.dk.enemies[0].key === 'showmaker',
        lg && JSON.stringify({ allies: lg.dk.allies.map(function (a) { return a.key; }), enemies: lg.dk.enemies.map(function (a) { return a.key; }) }));
  check('radar → pro detected', !!lg && lg.pros.length === 1 && lg.pros[0].slug === 'faker' && lg.pros[0].ally === true,
        lg && JSON.stringify(lg.pros));
  const tagTypes = (lg && lg.tags || []).map(function (t) { return t.type; }).sort().join(',');
  check('radar → tags duo/rival/with', tagTypes === 'duo,rival,with', tagTypes);
  const doranLive = radar.json.players.filter(function (p) { return p.key === 'doran'; })[0];
  check('radar → player liveGame summary', !!doranLive.liveGame && doranLive.liveGame.champion === 'Yasuo' &&
        doranLive.liveGame.queueKey === 'solo' && doranLive.inGame === true, doranLive && JSON.stringify(doranLive.liveGame));
  check('radar → raw spectator not leaked', !('liveRaw' in doranLive), Object.keys(doranLive).join(','));

  const muTags = (radar.json.matchups && radar.json.matchups.KR_100) || [];
  const muTypes = muTags.map(function (t) { return t.type; }).sort().join(',');
  check('matchup → rival + with/vs in one game', muTypes === 'rival,vs,with', muTypes);
  check('matchup → rival names', muTags.some(function (t) {
    return t.type === 'rival' && t.keys.indexOf('doran') > -1 && t.keys.indexOf('showmaker') > -1;
  }), JSON.stringify(muTags.filter(function (t) { return t.type === 'rival'; })));
  check('matchup → pro tag by exact riot id', muTags.some(function (t) {
    return t.type === 'with' && t.pro && t.pro.slug === 'faker';
  }), JSON.stringify(muTags));
  check('matchup → player tag', !!doranLive.tag && doranLive.tag.type === 'rival', doranLive.tag && doranLive.tag.type);
  check('matchup → pro index resolved', radar.json.proIndex && radar.json.proIndex.resolved >= 1,
        radar.json.proIndex && (radar.json.proIndex.resolved + '/' + radar.json.proIndex.total));

  /* 내전이 아닌 듀오(아군) 판정 */
  riotState.matchIds['puuid:vinaka'] = [
    { id: 'KR_101', puuid: 'puuid:vinaka', champ: '자르반 4세', teamId: 100, win: false,
      mates: [{ puuid: 'puuid:어리고싶다', teamId: 100, champ: '카밀' }] }
  ];
  const duoRes = await call(solo, { url: '/api/solo?refresh=1' });
  const duoTags = (duoRes.json.matchups && duoRes.json.matchups.KR_101) || [];
  check('matchup → duo when same team', duoTags.length === 1 && duoTags[0].type === 'duo',
        JSON.stringify(duoTags.map(function (t) { return t.type; })));
  check('matchup → row uses own participant', duoRes.json.players.filter(function (p) {
    return p.key === 'kanavi';
  })[0].matches[0].kda === '8/2/9' && duoRes.json.players.filter(function (p) { return p.key === 'kanavi'; })[0].matches[0].champ === '자르반 4세',
        JSON.stringify(duoRes.json.players.filter(function (p) { return p.key === 'kanavi'; })[0].matches[0]));

  /* --- 5. 구독 --- */
  const subscribe = require('../api/subscribe');
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const p256dh = ecdh.getPublicKey().toString('base64url');
  const auth = crypto.randomBytes(16).toString('base64url');
  const endpoint = 'https://fcm.googleapis.com/wp/smoke-test-endpoint';
  const subBody = {
    subscription: { endpoint: endpoint, keys: { p256dh: p256dh, auth: auth } },
    prefs: { solo: ['doran', 'bogus'], official: true, live: true },
    ua: 'smoke'
  };
  const sub1 = await call(subscribe, { method: 'POST', url: '/api/subscribe', body: subBody });
  check('subscribe 200', sub1.status === 200 && sub1.json.ok === true, sub1.status + ' ' + (sub1.json && sub1.json.error));
  check('subscribe filters unknown player', sub1.json && JSON.stringify(sub1.json.prefs.solo) === '["doran"]', sub1.json && JSON.stringify(sub1.json.prefs));
  check('subscribe durable', sub1.json && sub1.json.durable === true, sub1.json && sub1.json.durable);
  check('subscribe stored in redis', kv.has('dk:subs'), Array.from(kv.keys()).join(','));
  const sub2 = await call(subscribe, { method: 'POST', url: '/api/subscribe', body: subBody });
  check('subscribe idempotent', sub2.json && sub2.json.created === false && sub2.json.total === 1, sub2.json && sub2.json.total);
  const got = await call(subscribe, { url: '/api/subscribe?endpoint=' + encodeURIComponent(endpoint) });
  check('subscribe GET registered', got.json && got.json.registered === true, got.json && got.json.registered);
  const badSub = await call(subscribe, { method: 'POST', url: '/api/subscribe', body: { subscription: { endpoint: 'http://insecure/x', keys: { p256dh: 'a', auth: 'b' } } } });
  check('subscribe rejects http endpoint', badSub.status === 400, badSub.status);

  /* --- 6. 점검: 기준선 → 새 경기 감지 --- */
  const checkFn = require('../api/check');
  const unauthorized = await call(checkFn, { url: '/api/check' });
  check('check requires secret', unauthorized.status === 401, unauthorized.status);
  const auth401 = await call(checkFn, { url: '/api/check', headers: { authorization: 'Bearer wrong' } });
  check('check rejects wrong secret', auth401.status === 401, auth401.status);

  /* --- 6-1. 라이브 방송 상태 (/api/live) — 가짜 SOOP·CHZZK --- */
  const liveFn = require('../api/live');
  const liveOff = await call(liveFn, { url: '/api/live?refresh=1' });
  check('live all offline', liveOff.json && liveOff.json.ok === true && liveOff.json.liveCount === 0,
        liveOff.json && JSON.stringify(liveOff.json.liveCount));
  check('live shows every player', liveOff.json && Object.keys(liveOff.json.players).length === 5,
        liveOff.json && Object.keys(liveOff.json.players).join(','));

  streamState.soop['choi15778'] = { title: '솔랭 가즈아', viewers: 3120, startedAt: '2026-11-27 14:02:11' };
  streamState.chzzk['e351edbd85f1ebf4eb975c21179a4c43'] = { title: 'HLE Kanavi', viewers: 880, openAt: '2026-11-27T14:20:00+09:00' };
  const liveOn = await call(liveFn, { url: '/api/live?refresh=1' });
  const lvDoran = liveOn.json && liveOn.json.players.doran;
  const lvKanavi = liveOn.json && liveOn.json.players.kanavi;
  check('live soop parsed', !!lvDoran && lvDoran.live === true && lvDoran.platform === 'soop' && lvDoran.title === '솔랭 가즈아' && lvDoran.viewers === 3120,
        lvDoran && JSON.stringify(lvDoran));
  check('live soop start time KST', !!lvDoran && lvDoran.startedAt === '2026-11-27T05:02:11.000Z', lvDoran && lvDoran.startedAt);
  check('live soop url', !!lvDoran && lvDoran.url === 'https://ch.sooplive.co.kr/choi15778', lvDoran && lvDoran.url);
  check('live soop thumb normalized', !!lvDoran && lvDoran.thumb === 'https://thumbs.sooplive.co.kr/choi15778/broad.jpg', lvDoran && lvDoran.thumb);
  check('live soop category', !!lvDoran && lvDoran.category === '리그 오브 레전드', lvDoran && lvDoran.category);
  check('live chzzk parsed', !!lvKanavi && lvKanavi.live === true && lvKanavi.platform === 'chzzk' && lvKanavi.viewers === 880,
        lvKanavi && JSON.stringify(lvKanavi));
  check('live chzzk thumb template resolved', !!lvKanavi && /\/480_\d+\.jpg/.test(lvKanavi.thumb || ''), lvKanavi && lvKanavi.thumb);
  check('live chzzk category', !!lvKanavi && lvKanavi.category === '리그 오브 레전드', lvKanavi && lvKanavi.category);
  check('live count', liveOn.json && liveOn.json.liveCount === 2, liveOn.json && liveOn.json.liveCount);
  check('live cache hit', (await call(liveFn, { url: '/api/live' })).json.servedFrom === 'cache', null);
  check('live offline player stays off', liveOn.json && liveOn.json.players.smash.live === false, null);
  check('live offline player has no thumb', liveOn.json && !('thumb' in liveOn.json.players.smash), liveOn.json && liveOn.json.players.smash.thumb);
  /* 방송 정보가 일부만 와도(썸네일·카테고리 없음) 안전하게 생략하는지 */
  streamState.soop['choi15778'] = { title: '썸네일 없는 방송', viewers: 12, startedAt: '2026-11-27 14:02:11', thumb: null, category: null };
  const liveBare = await call(liveFn, { url: '/api/live?refresh=1' });
  const lvBare = liveBare.json && liveBare.json.players.doran;
  check('live missing thumb omitted', !!lvBare && lvBare.live === true && !('thumb' in lvBare) && !('category' in lvBare),
        lvBare && JSON.stringify({ thumb: lvBare.thumb, category: lvBare.category }));
  streamState.soop['choi15778'] = { title: '솔랭 가즈아', viewers: 3120, startedAt: '2026-11-27 14:02:11' };
  await call(liveFn, { url: '/api/live?refresh=1' });

  const run1 = await call(checkFn, { url: '/api/check?dry=1&token=smoke-secret' });
  check('check run1 200', run1.status === 200 && run1.json.ok === true, run1.status);
  check('check run1 live baseline', run1.json.live && run1.json.live.liveCount === 2 && run1.json.live.pushes.length === 0,
        run1.json.live && JSON.stringify(run1.json.live.players.map(function (p) { return p.key + ':' + p.live; })));
  check('check run1 official baseline', run1.json.official.status === 'no_upcoming' || run1.json.official.status === 'scheduled', run1.json.official.status);
  check('check run1 solo baseline', run1.json.solo.players.filter(function (p) { return p.status === 'baseline'; }).length === 2, JSON.stringify(run1.json.solo.players.map(function (p) { return p.key + ':' + p.status; })));
  check('check run1 no push', run1.json.pushed === 0, run1.json.pushed);
  check('check state saved', kv.has('dk:state'), null);

  /* 새 랭크 게임 + 새 라이브(딜라이트 CHZZK) + 도란 방송 종료 */
  riotState.matchIds['puuid:어리고싶다'].unshift({ id: 'KR_9', puuid: 'puuid:어리고싶다', champ: '레넥톤', kills: 5, deaths: 9, assists: 0, win: false, agoMinutes: 2 });
  delete streamState.soop['choi15778'];
  streamState.chzzk['59dd654778e3d0b64f3ed06baece805d'] = { title: 'DK Delight', viewers: 540, openAt: '2026-11-27T16:05:00+09:00' };
  withFixture('next');
  const run2 = await call(checkFn, { url: '/api/check?token=smoke-secret' });
  check('check run2 sees new match', run2.json.solo.players.filter(function (p) { return p.isNew; }).length === 1, JSON.stringify(run2.json.solo.players.map(function (p) { return p.key + ':' + p.isNew; })));
  const soloPush = run2.json.solo.pushes[0];
  check('check run2 solo push preview', !!soloPush && /레넥톤 5\/9\/0/.test(soloPush.preview.body), soloPush && soloPush.preview.body);
  check('check run2 solo push target 1', !!soloPush && soloPush.targets === 1, soloPush && soloPush.targets);
  const livePush = (run2.json.live.pushes || [])[0];
  check('check run2 live push', !!livePush && livePush.player === 'delight' && livePush.targets === 1,
        livePush && JSON.stringify({ player: livePush.player, targets: livePush.targets }));
  check('check run2 live push title', !!livePush && /딜라이트/.test(livePush.preview.title) && /CHZZK/.test(livePush.preview.title),
        livePush && livePush.preview.title);
  check('check run2 live push url', !!livePush && /chzzk\.naver\.com\/59dd/.test(livePush.preview.url || ''),
        livePush && livePush.preview.url);
  check('check run2 live push body', !!livePush && /DK Delight/.test(livePush.preview.body), livePush && livePush.preview.body);
  const offPush = run2.json.official.pushes.filter(function (p) { return p.event === 'new_match'; })[0];
  check('check run2 official new schedule push', !!offPush && /12\. 3\./.test(offPush.preview.body), offPush && offPush.preview.body);
  check('check run2 official push target 1', !!offPush && offPush.targets === 1, offPush && offPush.targets);
  global.fetch = realFetch;

  const run3 = await call(checkFn, { url: '/api/check?token=smoke-secret' });
  check('check run3 no duplicate push', run3.json.pushed === 0, run3.json.pushed);
  check('check run3 live quiet', run3.json.live && run3.json.live.liveCount === 2 && run3.json.live.pushes.length === 0,
        run3.json.live && JSON.stringify(run3.json.live.players.map(function (p) { return p.key + ':' + p.live; })));

  /* --- 6-1b. SOOP 방송국 공지: 초기 시딩은 알리지 않고, 새 공지부터 푸시 --- */
  streamState.notices['choi15778'] = [{ title_no: 202801017, title_name: 'T1 LoL 선수단 방송국 구독 안내', reg_date: '2026-07-29 17:22:54' }];
  streamState.notices['showmakerr'] = [{ title_no: 213476127, title_name: '방송공지', reg_date: '2026-11-24 17:10:11' }];
  streamState.notices['tlsrmawo'] = [{ title_no: 183948431, title_name: '[SOOP 구독 이어주기 관련 공지]', board_type: 104, reg_date: '2026-01-16 13:34:38' }];

  const noticeSeed = await call(checkFn, { url: '/api/check?only=notices&dry=1&token=smoke-secret' });
  check('check notices seed run 200', noticeSeed.status === 200 && noticeSeed.json.ok === true, noticeSeed.status);
  check('check notices seeded 3 stations', noticeSeed.json.notices && noticeSeed.json.notices.seeded === 3,
        noticeSeed.json.notices && noticeSeed.json.notices.seeded);
  check('check notices seed sends nothing', noticeSeed.json.notices && noticeSeed.json.notices.pushes.length === 0 && noticeSeed.json.pushed === 0,
        noticeSeed.json.notices && JSON.stringify(noticeSeed.json.notices.pushes));
  check('check notices state stored', kv.has('dk:state.notices'), Array.from(kv.keys()).join(','));
  const seedState = JSON.parse((kv.get('dk:state.notices') || {}).value || '{}');
  check('check notices state keeps title_no', !!seedState.players && seedState.players.showmaker && seedState.players.showmaker.titleNo === 213476127,
        seedState.players && seedState.players.showmaker && seedState.players.showmaker.titleNo);

  const noticeQuiet = await call(checkFn, { url: '/api/check?only=notices&token=smoke-secret' });
  check('check notices no push without new notice', noticeQuiet.json.notices.pushes.length === 0,
        JSON.stringify(noticeQuiet.json.notices.players));

  streamState.notices['showmakerr'].unshift({ title_no: 213808933, title_name: '11월 29일 방송공지', reg_date: '2026-11-28 15:08:31' });
  streamState.notices['choi15778'].unshift({ title_no: 202801099, title_name: '새 공지', reg_date: '2026-11-28 16:00:00' });
  const noticePush = await call(checkFn, { url: '/api/check?only=notices&token=smoke-secret' });
  const nPushes = noticePush.json.notices.pushes || [];
  check('check notices new push count 2', nPushes.length === 2, JSON.stringify(nPushes.map(function (p) { return p.player; })));
  const smPush = nPushes.filter(function (p) { return p.player === 'showmaker'; })[0];
  check('check notices push title', !!smPush && smPush.preview.title === '📢 쇼메이커 방송 공지: 11월 29일 방송공지',
        smPush && smPush.preview.title);
  check('check notices push url', !!smPush && smPush.preview.url === 'https://ch.sooplive.co.kr/showmakerr/post/213808933',
        smPush && smPush.preview.url);
  check('check notices push target 1', !!smPush && smPush.targets === 1, smPush && smPush.targets);
  check('check notices push kind', !!smPush && smPush.preview.kind === 'notice', smPush && smPush.preview.kind);
  const noticeAgain = await call(checkFn, { url: '/api/check?only=notices&token=smoke-secret' });
  check('check notices no duplicate', noticeAgain.json.notices.pushes.length === 0,
        JSON.stringify(noticeAgain.json.notices.players));

  const noticesFn = require('../api/notices');
  const noticesApi = await call(noticesFn, { url: '/api/notices' });
  check('notices api ok', noticesApi.status === 200 && noticesApi.json.ok === true, noticesApi.status);
  check('notices api lists three stations', noticesApi.json.notices && noticesApi.json.notices.length === 3,
        noticesApi.json.notices && noticesApi.json.notices.map(function (n) { return n.player; }).join(','));
  const smNotice = (noticesApi.json.notices || []).filter(function (n) { return n.player === 'showmaker'; })[0];
  check('notices api latest title', !!smNotice && smNotice.titleNo === 213808933 && smNotice.titleName === '11월 29일 방송공지',
        smNotice && JSON.stringify(smNotice));
  check('notices api url', !!smNotice && smNotice.url === 'https://ch.sooplive.co.kr/showmakerr/post/213808933', smNotice && smNotice.url);
  check('notices api no secret leak', assertNoSecrets(noticesApi.json));

  /* --- 6-2. 인게임 알림: 같은 게임은 한 번만, 새 게임이면 다시 --- */
  check('check ingame counts baseline game', run3.json.ingame && run3.json.ingame.inGameCount === 2,
        run3.json.ingame && JSON.stringify(run3.json.ingame.players.map(function (p) { return p.key + ':' + p.inGame; })));
  const igQuiet = await call(checkFn, { url: '/api/check?only=ingame&token=smoke-secret&dry=1' });
  check('check ingame no duplicate', igQuiet.json.ingame.pushes.length === 0, JSON.stringify(igQuiet.json.ingame.pushes));

  riotState.games['puuid:어리고싶다'] = Object.assign({}, riotState.games['puuid:어리고싶다'], {
    gameId: 99112444, gameStartTime: Date.now() - 60 * 1000, gameLength: 60
  });
  const igPush = await call(checkFn, { url: '/api/check?only=ingame&token=smoke-secret' });
  const igEvent = (igPush.json.ingame.pushes || [])[0];
  check('check ingame new game push', !!igEvent && igEvent.player === 'doran' && igEvent.gameId === 99112444,
        igEvent && JSON.stringify({ player: igEvent.player, gameId: igEvent.gameId }));
  check('check ingame push target = solo prefs', !!igEvent && igEvent.targets === 1, igEvent && igEvent.targets);
  check('check ingame push title', !!igEvent && /도란/.test(igEvent.preview.title) && /게임 시작/.test(igEvent.preview.title),
        igEvent && igEvent.preview.title);
  check('check ingame push body has matchups', !!igEvent && /Yasuo/.test(igEvent.preview.body) && /🤝/.test(igEvent.preview.body),
        igEvent && igEvent.preview.body);
  const igAgain = await call(checkFn, { url: '/api/check?only=ingame&token=smoke-secret' });
  check('check ingame same game quiet', igAgain.json.ingame.pushes.length === 0, JSON.stringify(igAgain.json.ingame.pushes));

  const testPush = await call(checkFn, { url: '/api/check?token=smoke-secret&test=1&dry=1' });
  check('check test push targets subscriber', !!testPush.json.test && testPush.json.test.targets === 1, testPush.json.test && testPush.json.test.targets);
  check('check test push payload', !!testPush.json.test && /테스트 푸시/.test(testPush.json.test.preview.title), testPush.json.test && testPush.json.test.preview.title);

  /* --- 7. 푸시 암호화(VAPID) --- */
  const webpush = require('web-push');
  const vapid = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  process.env.VAPID_SUBJECT = 'https://dk-signal.vercel.app';
  const pushLib = require('../api/_lib/push');
  check('push ready with vapid', pushLib.ready() === true);
  const details = pushLib.requestDetails({ endpoint: endpoint, keys: { p256dh: p256dh, auth: auth } }, { title: 't', body: 'b' });
  check('push request details built', !!details && !!details.body && details.headers.Authorization.indexOf('vapid') === 0, details && Object.keys(details.headers).join(','));
  check('push header has ttl', !!details && String(details.headers.TTL) === '900', details && details.headers.TTL);
  const badPush = await pushLib.send({ endpoint: 'http://nope', keys: { p256dh: p256dh, auth: auth } }, { title: 't' });
  check('push rejects non-https', badPush.status === 'invalid', badPush.status);
  const config = require('../api/config');
  const cfg = await call(config, { url: '/api/config' });
  check('config push ready', cfg.json && cfg.json.push.ready === true, cfg.json && JSON.stringify(cfg.json.push.ready));
  check('config exposes public key only', cfg.json && cfg.json.push.publicKey === vapid.publicKey && assertNoSecrets(cfg.json), null);
  check('config riot source', cfg.json && cfg.json.solo.source === 'riot', cfg.json && cfg.json.solo.source);
  check('config store backend redis', cfg.json && cfg.json.store.backend === 'redis', cfg.json && cfg.json.store.backend);

  /* --- 7-0. 관리자 집계·공지·전체 알림 (POST /api/config, PIN 해시 필수) --- */
  const PIN_HASH = '98cbd8bfd02876a7aabefc23e9cf760528b125688f06290512bef47d40c1fc45';
  const noPin = await call(config, { method: 'POST', url: '/api/config', body: { action: 'setBanner', text: 'x', enabled: true } });
  check('config POST needs admin pin', noPin.status === 401 && noPin.json.error === 'pin_required', noPin.status);
  const badPin = await call(config, { method: 'POST', url: '/api/config', headers: { 'x-admin-pin': 'a'.repeat(64) }, body: { action: 'setBanner', text: 'x', enabled: true } });
  check('config POST rejects wrong pin', badPin.status === 401, badPin.status);

  check('config player stats aggregate', cfg.json && cfg.json.playerStats.filter(function (p) { return p.key === 'doran'; })[0].solo === 1,
    cfg.json && JSON.stringify(cfg.json.playerStats.map(function (p) { return [p.key, p.solo]; })));
  check('config lang unknown when not sent', cfg.json && cfg.json.langStats.counts.unknown === 1,
    cfg.json && JSON.stringify(cfg.json.langStats.counts));
  check('config daily baseline = total', cfg.json && cfg.json.daily.baseline === 1 && cfg.json.dailyDelta === 0,
    cfg.json && JSON.stringify(cfg.json.daily));
  check('config daily history 7 days', cfg.json && cfg.json.dailyHistory.length === 7 && cfg.json.dailyHistory[6].total === 1,
    cfg.json && JSON.stringify(cfg.json.dailyHistory));
  check('config push log empty', cfg.json && Array.isArray(cfg.json.pushLog) && cfg.json.pushLog.length === 0);
  check('config banner off by default', cfg.json && cfg.json.banner.enabled === false);
  check('config never exposes endpoints or keys', !/fcm\.googleapis|p256dh|endpoint/i.test(cfg.raw), (cfg.raw || '').slice(0, 120));

  const setB = await call(config, {
    method: 'POST', url: '/api/config', headers: { 'x-admin-pin': PIN_HASH },
    body: { action: 'setBanner', text: '오늘 22시 DK vs T1', enabled: true }
  });
  check('setBanner with pin', setB.status === 200 && setB.json.banner.enabled === true && setB.json.banner.text.indexOf('DK vs T1') > -1,
    setB.status + ' ' + JSON.stringify(setB.json && setB.json.banner));
  const cfgB = await call(config, { url: '/api/config' });
  check('config GET exposes banner', cfgB.json && cfgB.json.banner.enabled === true && cfgB.json.banner.text.indexOf('DK vs T1') > -1);

  const bcDry = await call(config, {
    method: 'POST', url: '/api/config', headers: { 'x-admin-pin': PIN_HASH },
    body: { action: 'broadcast', title: '스모크 전체 알림', body: '이것은 미리보기입니다', dry: true }
  });
  check('broadcast dry run sends nothing', bcDry.status === 200 && bcDry.json.dryRun === true && bcDry.json.sent === 0 && bcDry.json.targets === 1,
    bcDry.status + ' ' + JSON.stringify(bcDry.json));
  check('dry broadcast not logged', !kv.get('dk:pushlog'), Array.from(kv.keys()).join(','));
  const bcNoTitle = await call(config, {
    method: 'POST', url: '/api/config', headers: { 'x-admin-pin': PIN_HASH },
    body: { action: 'broadcast', title: '', body: 'x', dry: true }
  });
  check('broadcast needs title', bcNoTitle.status === 400, bcNoTitle.status);

  const runNoPin = await call(config, { method: 'POST', url: '/api/config', body: { action: 'runCheck' } });
  check('admin runCheck needs pin', runNoPin.status === 401, runNoPin.status);

  const pushlogLib = require('../api/_lib/pushlog');
  for (let i = 0; i < 20; i++) {
    await pushlogLib.record({ at: new Date(Date.now() - i * 1000).toISOString(), type: 'solo', title: 'log ' + i, sent: 1, targets: 2 });
  }
  const kept = JSON.parse((kv.get('dk:pushlog') || {}).value || '[]');
  check('push log keeps 15', kept.length === 15, kept.length);
  check('push log newest first', kept[0].title === 'log 19' && kept[14].title === 'log 5', kept[0] && kept[0].title);
  check('push log skips zero sends', (await pushlogLib.record({ type: 'test', title: 'none', sent: 0, targets: 0 })) === null);
  const recentLog = await pushlogLib.recent(10);
  check('push log recent 10', recentLog.length === 10 && recentLog[0].title === 'log 19' && recentLog[9].title === 'log 10', recentLog.length);


  /* --- 7-1. 기기 1대 전용 테스트 알림 (POST /api/subscribe {action:'test'}) --- */
  const testSub = {
    endpoint: 'https://fcm.googleapis.com/wp/smoke-test-only-me',
    keys: { p256dh: p256dh, auth: auth }
  };
  const tStart = Date.now();
  const testOne = await call(subscribe, {
    method: 'POST', url: '/api/subscribe',
    body: { action: 'test', subscription: testSub, title: '도란 · 테스트 알림', body: '테스트 알림이에요.', lang: 'ko', delayMs: 120 }
  });
  const tElapsed = Date.now() - tStart;
  check('test push 200', testOne.status === 200 && testOne.json.ok === true && testOne.json.sent === true,
    testOne.status + ' ' + JSON.stringify(testOne.json));
  check('test push delay honored', testOne.json.delayMs === 120 && tElapsed >= 100, tElapsed + 'ms');
  check('test push is not a broadcast', testOne.json.broadcast === false && testOne.json.dryRun === true, JSON.stringify(testOne.json));
  const subsAfterTest = JSON.parse((kv.get('dk:subs') || {}).value || '[]');
  check('test push leaves subscriptions untouched', subsAfterTest.length === 1 &&
    !subsAfterTest.some(function (s) { return s.endpoint === testSub.endpoint; }), subsAfterTest.length);

  const testBadSub = await call(subscribe, {
    method: 'POST', url: '/api/subscribe', body: { action: 'test', subscription: { endpoint: 'http://nope', keys: { p256dh: 'a', auth: 'b' } } }
  });
  check('test push rejects http endpoint', testBadSub.status === 400, testBadSub.status);
  const testNoSub = await call(subscribe, { method: 'POST', url: '/api/subscribe', body: { action: 'test' } });
  check('test push needs subscription', testNoSub.status === 400, testNoSub.status);

  const testSlow = await call(subscribe, {
    method: 'POST', url: '/api/subscribe',
    body: { action: 'test', delayMs: 9000,
            subscription: { endpoint: 'https://fcm.googleapis.com/wp/smoke-test-clamp', keys: { p256dh: p256dh, auth: auth } } }
  });
  check('test push clamps delay to 5s', testSlow.json && testSlow.json.delayMs === 5000, testSlow.json && testSlow.json.delayMs);

  const testAgain = await call(subscribe, {
    method: 'POST', url: '/api/subscribe', body: { action: 'test', subscription: testSub, delayMs: 0 }
  });
  check('test push rate limited per device', testAgain.status === 429 && testAgain.json.error === 'too_many_requests',
    testAgain.status + ' ' + (testAgain.json && testAgain.json.error));

  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  const testNoVapid = await call(subscribe, {
    method: 'POST', url: '/api/subscribe',
    body: { action: 'test', subscription: { endpoint: 'https://fcm.googleapis.com/wp/smoke-test-b', keys: { p256dh: p256dh, auth: auth } } }
  });
  check('test push needs vapid', testNoVapid.status === 503 && testNoVapid.json.error === 'push_not_configured',
    testNoVapid.status + ' ' + (testNoVapid.json && testNoVapid.json.error));
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;

  /* --- 8. 저장소 없을 때 구독 거절 --- */
  const child = require('child_process').spawnSync(process.execPath, ['-e', `
    delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; delete process.env.DK_ALLOW_MEMORY_STORE;
    const h = require(${JSON.stringify(path.join(root, 'api', 'subscribe.js'))});
    const {EventEmitter} = require('events');
    const req = new EventEmitter(); req.method='POST'; req.url='/api/subscribe'; req.headers={};
    req.body = JSON.stringify({subscription:{endpoint:'https://x.y/z',keys:{p256dh:'a',auth:'b'}},prefs:{solo:[],official:true}});
    const res = { setHeader(){}, status(c){this.code=c;return this;}, send(b){this.body=b;}, end(){}, code:0 };
    Promise.resolve(h(req,res)).then(()=>{ console.log('CODE '+res.code+' '+res.body); });
  `], { encoding: 'utf8', env: Object.assign({}, process.env) });
  check('subscribe without store → 503', /CODE 503 .*store_missing/.test(child.stdout || ''), (child.stdout || child.stderr || '').trim().split('\n').pop());

  /* --- 9. 디플러스 기아 공식 유튜브 (/api/dk-youtube) --- */
  const dkYtLib = require('../api/_lib/dk-youtube');
  const parsed = dkYtLib.parseFeed('<feed><entry><yt:videoId>abc12345678</yt:videoId><title>A &amp; B</title>' +
    '<published>2026-11-01T00:00:00+00:00</published><media:statistics views="123"/></entry></feed>');
  check('dk youtube rss parse', parsed.length === 1 && parsed[0].title === 'A & B' && parsed[0].views === 123,
    parsed[0] && parsed[0].title);
  check('dk youtube canonical thumb', parsed[0] && parsed[0].thumb === 'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg',
    parsed[0] && parsed[0].thumb);
  const proxied = dkYtLib.parseProxy({ status: 'ok', items: [
    { title: 'A &amp; B', pubDate: '2026-11-16 06:00:15', link: 'https://www.youtube.com/watch?v=abc12345678',
      guid: 'yt:video:abc12345678', thumbnail: 'https://i4.ytimg.com/vi/abc12345678/hqdefault.jpg' }] });
  check('dk youtube proxy parse', proxied.length === 1 && proxied[0].id === 'abc12345678' &&
    proxied[0].published === '2026-11-16T06:00:15Z' && proxied[0].title === 'A & B',
    proxied[0] && (proxied[0].published + ' · ' + proxied[0].title));

  const dkYt = require('../api/dk-youtube');
  const dkLive = await call(dkYt, { url: '/api/dk-youtube?refresh=1' });
  check('dk youtube status 200', dkLive.status === 200, dkLive.status);
  check('dk youtube ok', dkLive.json && dkLive.json.ok === true, dkLive.json && dkLive.json.error);
  if (dkLive.json && String(dkLive.json.source || '').indexOf('youtube-') === 0) {
    const vids = dkLive.json.videos || [];
    check('dk youtube live videos 10', vids.length === 10, vids.length);
    check('dk youtube channel id', dkLive.json.channel && dkLive.json.channel.id === 'UCepHesz_5Lwr7qRaqjB-p1A',
      dkLive.json.channel && dkLive.json.channel.id);
    check('dk youtube video fields', vids.length > 0 && vids.every(function (v) {
      return /^[-\w]{11}$/.test(v.id) && v.title &&
        /^https:\/\/www\.youtube\.com\/watch\?v=/.test(v.url) &&
        /^https:\/\/i\.ytimg\.com\//.test(v.thumb) &&
        isFinite(Date.parse(v.published));
    }), vids[0] && vids[0].title);
    check('dk youtube sorted newest first',
      vids.every(function (v, i) { return i === 0 || Date.parse(vids[i - 1].published) >= Date.parse(v.published); }),
      vids[0] && vids[0].published);
  } else {
    check('dk youtube degrades to snapshot', dkLive.json && dkLive.json.source === 'snapshot' && dkLive.json.stale === true,
      dkLive.json && dkLive.json.detail);
  }

  const dkCache = await call(dkYt, { url: '/api/dk-youtube' });
  check('dk youtube cache served', dkCache.json && dkCache.json.servedFrom === 'cache', dkCache.json && dkCache.json.servedFrom);

  /* RSS 장애 시 스냅샷 폴백 */
  const savedFetch = global.fetch;
  global.fetch = async function () { throw new Error('network down'); };
  const dkDown = await call(dkYt, { url: '/api/dk-youtube?refresh=1' });
  global.fetch = savedFetch;
  check('dk youtube fallback 200', dkDown.status === 200, dkDown.status);
  check('dk youtube fallback snapshot', dkDown.json && dkDown.json.ok === true && dkDown.json.source === 'snapshot' && dkDown.json.stale === true,
    dkDown.json && (dkDown.json.source + ' · ' + dkDown.json.detail));
  check('dk youtube fallback has videos', dkDown.json && Array.isArray(dkDown.json.videos) && dkDown.json.videos.length >= 6,
    dkDown.json && dkDown.json.videos && dkDown.json.videos.length);

  redis.srv.close();
  riotSrv.srv.close();
  streamSrv.srv.close();

  console.log('\n== api smoke ==');
  console.log((pass) + ' passed, ' + failCount + ' failed');
  if (failCount) {
    console.log('failed: ' + failures.join(' | '));
    process.exit(1);
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
