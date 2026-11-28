/* /api/config — 프론트가 쓰는 공개 설정값 + 관리자 대시보드용 집계 + 관리자 전용 동작
 *
 *  GET  : 설정·크론 요약 + 대시보드 집계
 *         - playerStats   : 선수별 솔랭/인게임 알림 구독 기기 수 (개인정보 없이 숫자만)
 *         - langStats     : 언어별 구독 기기 수 (기록이 없는 기기는 unknown)
 *         - pushLog       : 최근 실제 발송 10건 (dk:pushlog · 최대 15건 보관)
 *         - daily/dailyDelta/dailyHistory : 오늘 증감 + 최근 7일 구독자 기록
 *         - banner        : 메인 화면 한 줄 공지
 *
 *  POST : 관리자 전용 (X-Admin-Pin 헤더 = 관리자 PIN SHA-256)
 *         { action: 'runCheck' }                     점검 1회 실행 (api/check.js 의 runCheck)
 *         { action: 'setBanner', text, enabled }      한 줄 공지 저장 (dk:banner)
 *         { action: 'broadcast', title, body }        전체 구독자에게 알림 발송
 *
 *  ※ 모든 집계는 숫자만 내려갑니다. endpoint·keys·기기 정보는 응답에 넣지 않습니다.
 */
const { json, header, readBody } = require('./_lib/http');
const store = require('./_lib/store');
const push = require('./_lib/push');
const pushlog = require('./_lib/pushlog');
const stats = require('./_lib/stats');
const { PLAYERS } = require('./_lib/players');

const VERSION = '3.10.0';
const SUBS_KEY = 'dk:subs';
const BANNER_KEY = 'dk:banner';
const DAILY_KEY = stats.KEY;
const LANGS = ['ko', 'en', 'ja', 'zh', 'vi'];
const KEEP_LOG = 10;
const BANNER_MAX = 120;
const PUSH_TITLE_MAX = 60;
const PUSH_BODY_MAX = 160;

/* 관리자 PIN(4자리)의 SHA-256 — admin.js 의 잠금 해시와 같은 값입니다.
 * 배포 때 ADMIN_PIN_HASH 환경변수를 주면 그 값이 우선합니다. */
const PIN_HASH = String(process.env.ADMIN_PIN_HASH || '98cbd8bfd02876a7aabefc23e9cf760528b125688f06290512bef47d40c1fc45').toLowerCase();

function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (!x || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function adminOk(req) {
  const given = String(header(req, 'x-admin-pin') || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(given) && safeEqual(given, PIN_HASH);
}

function cleanText(value, max) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

async function loadSubs() {
  try {
    const subs = await store.getJSON(SUBS_KEY);
    return Array.isArray(subs) ? subs : [];
  } catch (e) { return []; }
}

/* 선수별 알림 구독 기기 수 — 키·endpoint 는 보지 않고 prefs 만 셉니다. */
function playerStats(subs) {
  const rows = {};
  PLAYERS.forEach(function (p) {
    rows[p.key] = { key: p.key, name: p.nameKo, pos: p.posKo, solo: 0, ingame: 0 };
  });
  subs.forEach(function (sub) {
    const prefs = (sub && sub.prefs) || {};
    if (Array.isArray(prefs.solo)) {
      Array.from(new Set(prefs.solo)).forEach(function (k) { if (rows[k]) rows[k].solo++; });
    }
    if (Array.isArray(prefs.ingame)) {
      Array.from(new Set(prefs.ingame)).forEach(function (k) { if (rows[k]) rows[k].ingame++; });
    }
  });
  return PLAYERS.map(function (p) { return rows[p.key]; });
}

function langStats(subs) {
  const counts = {};
  LANGS.forEach(function (l) { counts[l] = 0; });
  counts.unknown = 0;
  subs.forEach(function (sub) {
    const l = sub && typeof sub.lang === 'string' ? sub.lang : '';
    if (LANGS.indexOf(l) > -1) counts[l]++;
    else counts.unknown++;
  });
  return { lang: LANGS, counts: counts, total: subs.length };
}

function publicBanner(raw) {
  const b = raw && typeof raw === 'object' ? raw : {};
  const text = cleanText(b.text, BANNER_MAX);
  return {
    enabled: !!b.enabled && !!text,
    text: text,
    updatedAt: b.updatedAt ? String(b.updatedAt) : null
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'POST') return handlePost(req, res);

  let last = null;
  let subs = [];
  let dailyRaw = null;
  let logRaw = null;
  let bannerRaw = null;
  try {
    const rows = await store.getJSONMany(['dk:lastcheck', SUBS_KEY, DAILY_KEY, pushlog.KEY, BANNER_KEY]);
    last = rows[0];
    subs = Array.isArray(rows[1]) ? rows[1] : [];
    dailyRaw = rows[2];
    logRaw = rows[3];
    bannerRaw = rows[4];
  } catch (e) { /* 저장소가 없으면 아래 기본값으로 */ }

  const total = subs.length;

  const players = playerStats(subs);
  const langs = langStats(subs);
  const breakdown = {
    total: total,
    official: subs.filter(function (s) { return s && s.prefs && s.prefs.official !== false; }).length,
    live: subs.filter(function (s) { return s && s.prefs && s.prefs.live !== false; }).length,
    notice: subs.filter(function (s) { return !s || !s.prefs || s.prefs.notice !== false; }).length,
    solo: subs.reduce(function (n, s) {
      return n + ((s && s.prefs && Array.isArray(s.prefs.solo)) ? s.prefs.solo.length : 0);
    }, 0)
  };

  let daily = null;
  try { daily = await stats.ensureBaseline(total); } catch (e) { daily = null; }
  if (!daily) {
    const today = stats.kstDate();
    daily = { date: today, baseline: total, current: total, delta: 0, history: [] };
  }

  const log = Array.isArray(logRaw) ? logRaw : [];

  return json(res, 200, {
    ok: true,
    version: VERSION,
    serverTime: new Date().toISOString(),
    official: { source: 'lolesports' },
    solo: { source: process.env.RIOT_API_KEY ? 'riot' : 'snapshot' },
    push: {
      ready: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      publicKey: push.publicKey() || ''
    },
    store: {
      backend: store.backend(),
      durable: store.durable()
    },
    check: {
      secret: !!process.env.CHECK_SECRET,
      lastRun: last && last.at ? last : null
    },
    subsTotal: total,
    subs: breakdown,
    playerStats: players,
    langStats: langs,
    pushLog: log.filter(function (r) { return r && r.at; }).slice(0, KEEP_LOG).map(pushlog.clean),
    daily: { date: daily.date, baseline: daily.baseline, current: daily.current, delta: daily.delta },
    dailyDelta: daily.delta,
    dailyHistory: daily.history,
    banner: publicBanner(bannerRaw)
  });
};

/* ───────────── 관리자 전용 POST ───────────── */

async function handlePost(req, res) {
  const body = (await readBody(req)) || {};
  if (!adminOk(req)) {
    return json(res, 401, {
      ok: false, error: 'pin_required',
      message: '관리자 PIN 확인이 필요해요. 잠근 뒤 PIN 으로 다시 열어 주세요.'
    });
  }

  const action = String(body.action || '');

  if (action === 'runCheck') {
    const only = ['official', 'solo', 'live', 'ingame', 'notices'].indexOf(body.only) > -1 ? body.only : '';
    try {
      const hits = await store.incr('dk:admin:runcheck', 15);
      if (hits > 1) {
        return json(res, 429, { ok: false, error: 'too_many_requests', message: '점검은 15초에 한 번만 실행할 수 있어요.' });
      }
    } catch (e) { /* 저장소가 없으면 중복 방지만 건너뜁니다 */ }
    try {
      const summary = await require('./check').runCheck({
        dry: body.dry === true || body.dry === 1,
        only: only
      });
      return json(res, 200, {
        ok: true, action: 'runCheck',
        tookMs: summary.tookMs, pushed: summary.pushed, targets: summary.targets,
        daily: summary.daily, summary: summary
      });
    } catch (e) {
      return json(res, 500, { ok: false, error: 'check_failed', message: String((e && e.message) || e).slice(0, 200) });
    }
  }

  if (action === 'setBanner') {
    const text = cleanText(body.text, BANNER_MAX);
    const enabled = body.enabled !== false && !!text;
    const banner = { enabled: enabled, text: text, updatedAt: new Date().toISOString() };
    try { await store.setJSON(BANNER_KEY, banner); } catch (e) {
      return json(res, 503, { ok: false, error: 'store_error', message: '공지를 저장하지 못했어요.' });
    }
    return json(res, 200, { ok: true, action: 'setBanner', banner: publicBanner(banner) });
  }

  if (action === 'broadcast') {
    const title = cleanText(body.title, PUSH_TITLE_MAX);
    const text = cleanText(body.body, PUSH_BODY_MAX);
    if (!title || !text) {
      return json(res, 400, { ok: false, error: 'empty', message: '제목과 내용을 모두 입력해 주세요.' });
    }
    try {
      const hits = await store.incr('dk:admin:broadcast', 20);
      if (hits > 1) {
        return json(res, 429, { ok: false, error: 'too_many_requests', message: '전체 알림은 20초에 한 번만 보낼 수 있어요.' });
      }
    } catch (e) { /* 저장소가 없으면 중복 방지만 건너뜁니다 */ }
    const subs = await loadSubs();
    const payload = {
      title: title,
      body: text,
      tag: 'dk-notice-' + Date.now(),
      url: './',
      kind: 'broadcast'
    };
    const dryRun = body.dry === true || body.dry === 1 || process.env.PUSH_DRY_RUN === '1' || !push.ready();
    if (dryRun) {
      return json(res, 200, {
        ok: true, action: 'broadcast', dryRun: true,
        targets: subs.length, sent: 0, preview: payload
      });
    }

    const sent = [];
    const gone = [];
    let errors = 0;
    for (const sub of subs) {
      const r = await push.send(sub, payload);
      if (r.status === 'sent') sent.push(sub.id);
      else if (r.status === 'gone') gone.push(sub.id);
      else errors++;
    }
    if (gone.length && store.durable()) {
      const left = subs.filter(function (s) { return gone.indexOf(s.id) === -1; });
      try { await store.setJSON(SUBS_KEY, left); } catch (e) {}
    }
    if (sent.length) {
      try {
        await pushlog.record({
          at: new Date().toISOString(), type: 'broadcast', title: title,
          sent: sent.length, targets: subs.length
        });
      } catch (e) {}
    }
    return json(res, 200, {
      ok: true, action: 'broadcast', dryRun: false,
      targets: subs.length, sent: sent.length, gone: gone.length, errors: errors
    });
  }

  return json(res, 400, { ok: false, error: 'unknown_action', message: '알 수 없는 요청이에요.' });
}
