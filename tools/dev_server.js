/* 로컬 개발·검증 서버: 정적 파일 + /api/* (Vercel 없이 같은 코드를 그대로 실행)
 *
 *   node tools/dev_server.js            # 실제 LoL Esports API 호출
 *   DK_FIXTURE=none node tools/dev_server.js   # 공식 일정 고정(다음 경기 없음)
 *   DK_FIXTURE=next node tools/dev_server.js   # 공식 일정 고정(다음 경기 있음)
 *
 * 검증(tools/verify.py)은 이 서버를 8765 포트로 띄워 놓고 실행합니다.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8765);
const FIXTURE = process.env.DK_FIXTURE || 'live';
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

/* ---- 고정된 공식 일정을 쓰고 싶을 때 fetch 를 갈아끼웁니다 ---- */
if (FIXTURE !== 'live') {
  const realFetch = global.fetch;
  global.fetch = async function (url, opts) {
    const u = String(url);
    if (u.indexOf('esports-api.lolesports.com') > -1 && u.indexOf('getSchedule') > -1) {
      const file = path.join(FIXTURE_DIR, 'schedule-' + FIXTURE + '.json');
      const body = fs.readFileSync(file, 'utf8');
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, opts);
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

const HANDLERS = {
  '/api/official': require('../api/official'),
  '/api/solo': require('../api/solo'),
  '/api/config': require('../api/config'),
  '/api/subscribe': require('../api/subscribe'),
  '/api/check': require('../api/check'),
  '/api/live': require('../api/live'),
  '/api/dk-youtube': require('../api/dk-youtube'),
  '/api/notices': require('../api/notices')
};

/* DK_LIVE_FAKE=1: 실제 방송이 없을 때도 라이브 배지 UI 를 검증할 수 있게 가짜 상태를 돌려줍니다. */
if (process.env.DK_LIVE_FAKE === '1' || process.env.DK_LIVE_FAKE === 'off') {
  HANDLERS['/api/live'] = function (req, res) {
    var players = {};
    ['doran', 'kanavi', 'showmaker', 'smash', 'delight'].forEach(function (k) { players[k] = { key: k, live: false }; });
    if (process.env.DK_LIVE_FAKE === '1') {
      players.doran = {
        key: 'doran', nameKo: '도란', live: true, platform: 'soop', station: 'choi15778',
        title: '솔랭 빠짐없이 갑니다', viewers: 4820,
        startedAt: new Date(Date.now() - (1 * 3600 + 42 * 60 + 8) * 1000).toISOString(),
        thumb: 'https://i.ytimg.com/vi/o1E-pxEdRw8/maxresdefault.jpg',
        category: '리그 오브 레전드',
        url: 'https://ch.sooplive.co.kr/choi15778'
      };
      players.delight = {
        key: 'delight', nameKo: '딜라이트', live: true, platform: 'chzzk', station: '59dd654778e3d0b64f3ed06baece805d',
        title: 'DK Delight · 랭크', viewers: 540, startedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        thumb: 'https://i.ytimg.com/vi/yfC5vSjiJos/maxresdefault.jpg',
        category: '리그 오브 레전드',
        url: 'https://chzzk.naver.com/59dd654778e3d0b64f3ed06baece805d'
      };
    }
    var body = { ok: true, at: new Date().toISOString(), servedFrom: 'fake', liveCount: players.doran.live ? 2 : 0, players: players };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

/* DK_INGAME_FAKE=1: 실제 인게임이 없을 때도 '게임 중' 배지·시트·매치업 UI 를 검증할 수 있게
 * /api/solo 응답에 가짜 liveGames · matchups · tag 를 끼워 넣습니다. (응답 본문만 손봅니다) */
function fakeIngame(data) {
  if (!data || !Array.isArray(data.players) || data.players.length !== 5) return;
  const now = Date.now();
  const start = now - 13 * 60000;
  const p = function (championId, champion, spell1, spell2, teamId, who, me) {
    return { championId: championId, champion: champion, spell1Id: 4, spell1: spell1, spell2Id: 12, spell2: spell2, teamId: teamId, me: !!me, who: who || null };
  };
  const alleyA = p(157, 'Yasuo', 'Flash', 'Teleport', 100,
    { kind: 'dk', key: 'doran', nameKo: '도란', mine: true }, true);
  const alleyB = p(64, 'LeeSin', 'Flash', 'Smite', 100, { kind: 'dk', key: 'kanavi', nameKo: '카나비' });
  const proAlly = p(268, 'Azir', 'Flash', 'Ignite', 100, { kind: 'pro', slug: 'faker', name: 'Faker', nameKo: '페이커', team: 'T1', role: 'MIDDLE' });
  const proEnemy = p(103, 'Ahri', 'Flash', 'Ignite', 200, { kind: 'pro', slug: 'chovy', name: 'Chovy', nameKo: '쵸비', team: 'GEN', role: 'MIDDLE' });
  const rival = p(55, 'Katarina', 'Flash', 'Ignite', 200, { kind: 'dk', key: 'showmaker', nameKo: '쇼메이커' });
  const anon = function (id, champ, team) { return p(id, champ, 'Flash', 'Heal', team, null); };

  const game = {
    playerKey: 'doran',
    gameId: 99112233,
    gameStartTime: start,
    gameLength: 780,
    queueId: 420,
    queueKey: 'solo',
    mode: 'CLASSIC',
    me: { key: 'doran', teamId: 100, championId: 157, champion: 'Yasuo', spell1: 'Flash', spell2: 'Teleport' },
    teams: [
      { teamId: 100, side: 'blue', players: [alleyA, alleyB, proAlly, anon(17, 'Teemo', 100), anon(99, 'Lux', 100)] },
      { teamId: 200, side: 'red', players: [rival, proEnemy, anon(22, 'Ashe', 200), anon(89, 'Leona', 200), anon(40, 'Janna', 200)] }
    ],
    dk: {
      allies: [{ key: 'kanavi', nameKo: '카나비', champion: 'LeeSin' }],
      enemies: [{ key: 'showmaker', nameKo: '쇼메이커', champion: 'Katarina' }]
    },
    pros: [
      { slug: 'faker', name: 'Faker', nameKo: '페이커', team: 'T1', role: 'MIDDLE', ally: true, champion: 'Azir' },
      { slug: 'chovy', name: 'Chovy', nameKo: '쵸비', team: 'GEN', role: 'MIDDLE', ally: false, champion: 'Ahri' }
    ],
    tags: [
      { type: 'duo', keys: ['doran', 'kanavi'], names: ['도란', '카나비'], ally: true, champion: 'LeeSin' },
      { type: 'rival', keys: ['doran', 'showmaker'], names: ['도란', '쇼메이커'], ally: false, champion: 'Katarina' },
      { type: 'with', keys: ['doran'], names: ['도란'], ally: true, champion: 'Azir', pro: { slug: 'faker', name: 'Faker', nameKo: '페이커', team: 'T1', role: 'MIDDLE' } },
      { type: 'vs', keys: ['doran'], names: ['도란'], ally: false, champion: 'Ahri', pro: { slug: 'chovy', name: 'Chovy', nameKo: '쵸비', team: 'GEN', role: 'MIDDLE' } }
    ]
  };
  const kanaviGame = Object.assign({}, game, {
    playerKey: 'kanavi',
    me: { key: 'kanavi', teamId: 100, championId: 64, champion: 'LeeSin', spell1: 'Flash', spell2: 'Smite' }
  });
  data.liveGames = [game, kanaviGame];

  /* 스냅샷 데이터에는 matchId 가 없을 수 있어, 행마다 하나씩 붙여 매치업 배지를 붙입니다. */
  data.players.forEach(function (row) {
    (row.matches || []).forEach(function (m, i) {
      if (!m.matchId) m.matchId = 'fake-' + row.key + '-' + i;
    });
  });
  const firstMatch = function (key) {
    const row = data.players.filter(function (x) { return x.key === key; })[0];
    return row && row.matches && row.matches[0] ? row.matches[0].matchId : null;
  };
  const dMatch = firstMatch('doran');
  const sMatch = firstMatch('smash');
  data.matchups = {};
  if (dMatch) data.matchups[dMatch] = [
    { type: 'duo', keys: ['doran', 'kanavi'], names: ['도란', '카나비'], ally: true, matchId: dMatch },
    { type: 'vs', key: 'doran', name: '도란', pro: { slug: 'chovy', name: 'Chovy', nameKo: '쵸비', team: 'GEN', role: 'MIDDLE' }, ally: false, matchId: dMatch }
  ];
  if (sMatch) data.matchups[sMatch] = [
    { type: 'rival', keys: ['smash', 'showmaker'], names: ['스매쉬', '쇼메이커'], ally: false, matchId: sMatch }
  ];

  data.players.forEach(function (row) {
    row.tag = null;
    if (row.key === 'doran') row.tag = { type: 'rival', keys: ['doran', 'showmaker'], names: ['도란', '쇼메이커'], ally: false, matchId: dMatch };
    if (row.key === 'kanavi') row.tag = { type: 'duo', keys: ['doran', 'kanavi'], names: ['도란', '카나비'], ally: true, matchId: dMatch };
    if (row.key === 'showmaker') row.tag = { type: 'rival', keys: ['doran', 'showmaker'], names: ['도란', '쇼메이커'], ally: false, matchId: dMatch };
    if (row.key === 'smash') row.tag = { type: 'rival', keys: ['smash', 'showmaker'], names: ['스매쉬', '쇼메이커'], ally: false, matchId: sMatch };
    if (row.key === 'doran' || row.key === 'kanavi') {
      const g = row.key === 'doran' ? game : kanaviGame;
      row.inGame = true;
      row.liveGame = {
        gameId: g.gameId, gameStartTime: g.gameStartTime, gameLength: g.gameLength,
        queueKey: g.queueKey, queueId: g.queueId,
        champion: g.me.champion, championId: g.me.championId,
        spell1: g.me.spell1, spell2: g.me.spell2, tags: g.tags
      };
    }
  });
  data.ingameFake = true;
}

if (process.env.DK_INGAME_FAKE === '1') {
  const realSolo = HANDLERS['/api/solo'];
  HANDLERS['/api/solo'] = function (req, res) {
    const realSend = res.send.bind(res);
    res.send = function (body) {
      let out = body;
      if (typeof body === 'string') {
        try {
          const data = JSON.parse(body);
          fakeIngame(data);
          out = JSON.stringify(data);
        } catch (e) { out = body; }
      }
      return realSend(out);
    };
    return realSolo(req, res);
  };
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const handler = HANDLERS[url.pathname];
  if (handler) {
    res.status = function (code) { res.statusCode = code; return res; };
    res.send = function (body) { res.end(body); return res; };
    Promise.resolve(handler(req, res)).catch(function (e) {
      console.error('[api error]', req.url, e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    });
    return;
  }
  if (url.pathname.indexOf('/api/') === 0) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: false, error: 'not found' }));
  }
  serveStatic(req, res, req.url);
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('dk-signal dev server → http://127.0.0.1:' + PORT + ' (fixture: ' + FIXTURE + ')');
});
