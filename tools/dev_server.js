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
  '/api/live': require('../api/live')
};

/* DK_LIVE_FAKE=1: 실제 방송이 없을 때도 라이브 배지 UI 를 검증할 수 있게 가짜 상태를 돌려줍니다. */
if (process.env.DK_LIVE_FAKE === '1') {
  HANDLERS['/api/live'] = function (req, res) {
    var players = {};
    ['doran', 'kanavi', 'showmaker', 'smash', 'delight'].forEach(function (k) { players[k] = { key: k, live: false }; });
    players.doran = {
      key: 'doran', nameKo: '도란', live: true, platform: 'soop', station: 'choi15778',
      title: '솔랭 가즈아', viewers: 3120, startedAt: new Date().toISOString(),
      url: 'https://ch.sooplive.co.kr/choi15778'
    };
    players.delight = {
      key: 'delight', nameKo: '딜라이트', live: true, platform: 'chzzk', station: '59dd654778e3d0b64f3ed06baece805d',
      title: 'DK Delight', viewers: 540, startedAt: new Date().toISOString(),
      url: 'https://chzzk.naver.com/59dd654778e3d0b64f3ed06baece805d'
    };
    var body = { ok: true, at: new Date().toISOString(), servedFrom: 'fake', liveCount: 2, players: players };
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
