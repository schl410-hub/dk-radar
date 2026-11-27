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
  requests: 0
};

function idsFor(puuid) {
  return riotState.matchIds[puuid] || [];
}

function mockMatch(id, puuid, opts) {
  const o = opts || {};
  const end = Date.now() - (o.agoMinutes || 30) * 60000;
  return {
    metadata: { matchId: id },
    info: {
      gameCreation: end - 1800000,
      gameEndTimestamp: end,
      gameDuration: o.duration || 1452,
      queueId: 420,
      participants: [
        {
          puuid: puuid, championName: o.champ || '카밀', teamPosition: o.pos || 'TOP',
          kills: o.kills === undefined ? 8 : o.kills,
          deaths: o.deaths === undefined ? 2 : o.deaths,
          assists: o.assists === undefined ? 9 : o.assists,
          win: o.win === undefined ? true : o.win
        },
        { puuid: 'someone-else', championName: '아지르', teamPosition: 'MIDDLE', kills: 1, deaths: 5, assists: 2, win: false }
      ]
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
  chzzk: {}   /* id -> { title, viewers, openAt } */
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
            broad_start: row.startedAt
          }
        });
      }
      if ((m = /^\/chzzk\/([^/]+)\/live-status$/.exec(url.pathname))) {
        const id = decodeURIComponent(m[1]);
        const row = streamState.chzzk[id];
        if (!row) return send(200, { code: 200, message: null, content: null });
        return send(200, {
          code: 200,
          message: null,
          content: { status: 'OPEN', liveTitle: row.title, concurrentUserCount: row.viewers, openDate: row.openAt }
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
  check('live chzzk parsed', !!lvKanavi && lvKanavi.live === true && lvKanavi.platform === 'chzzk' && lvKanavi.viewers === 880,
        lvKanavi && JSON.stringify(lvKanavi));
  check('live count', liveOn.json && liveOn.json.liveCount === 2, liveOn.json && liveOn.json.liveCount);
  check('live cache hit', (await call(liveFn, { url: '/api/live' })).json.servedFrom === 'cache', null);
  check('live offline player stays off', liveOn.json && liveOn.json.players.smash.live === false, null);

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
