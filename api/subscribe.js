/* POST /api/subscribe — 기기의 웹 푸시 구독 + 알림 설정(선수별 솔랭 / DK 공식 경기 / 라이브 방송) 저장
 * POST /api/subscribe  {action:'test'} — 요청한 기기 1대에만 테스트 알림(서버 경유, iOS 대응)
 * DELETE /api/subscribe — 구독 해지
 * GET /api/subscribe?endpoint=... — 이 기기가 서버에 등록돼 있는지 확인
 */
const crypto = require('crypto');
const { json, fail, readBody } = require('./_lib/http');
const store = require('./_lib/store');
const push = require('./_lib/push');
const { PLAYERS } = require('./_lib/players');

const SUBS_KEY = 'dk:subs';
const MAX_SUBS = 1000;
const ALLOWED_SOLO = PLAYERS.map(function (p) { return p.key; });

/* 테스트 알림: 저장된 구독 전체가 아니라 "요청을 보낸 그 기기 한 대"에만 보냅니다.
 * iOS 는 앱을 보고 있을 때 배너가 묻히므로 기본 3초 뒤에 보내고, 최대 5초까지만 기다립니다. */
const TEST_DELAY_MS = 3000;
const TEST_DELAY_MAX = 5000;
const TEST_GAP_SEC = 15;
const TEST_TEXT_MAX = 120;
const TEST_LANGS = ['ko', 'en', 'ja', 'zh', 'vi'];

function cleanText(value, fallback) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, TEST_TEXT_MAX);
}

/* 한 기기 1대 전용 테스트 발송 — 구독 목록(DB)은 읽지도 쓰지도 않습니다. */
async function sendTestPush(res, body) {
  if (!push.ready()) {
    return json(res, 503, {
      ok: false, error: 'push_not_configured',
      message: '서버에 VAPID 키가 없어 테스트 알림을 보낼 수 없어요.'
    });
  }
  const sub = push.normSubscription(body.subscription || body);
  if (!sub) return fail(res, 400, '푸시 구독 정보(endpoint · keys)가 올바르지 않아요');

  const rawDelay = Number(body.delayMs);
  const delay = Number.isFinite(rawDelay) && rawDelay >= 0
    ? Math.min(TEST_DELAY_MAX, Math.round(rawDelay))
    : TEST_DELAY_MS;

  /* 같은 기기에서 연타하면 막습니다 (저장소가 없어도 테스트 자체는 보냅니다) */
  try {
    const hits = await store.incr('dk:test:' + subId(sub.endpoint), TEST_GAP_SEC);
    if (hits > 1) {
      return json(res, 429, {
        ok: false, error: 'too_many_requests', retryAfter: TEST_GAP_SEC,
        message: '방금 테스트 알림을 보냈어요. ' + TEST_GAP_SEC + '초 뒤에 다시 시도해 주세요.'
      });
    }
  } catch (e) { /* 저장소가 없으면 연타 제한만 건너뜁니다 */ }

  const lang = TEST_LANGS.indexOf(body.lang) > -1 ? body.lang : 'ko';
  const payload = {
    title: cleanText(body.title, '딮기 시그널 · 테스트 알림'),
    body: cleanText(body.body, '테스트 알림이에요. 새 소식이 이렇게 도착해요.'),
    tag: 'dk-signal-test',
    url: './',
    kind: 'test'
  };

  if (delay) await new Promise(function (resolve) { setTimeout(resolve, delay); });

  let result;
  try {
    result = await push.send(sub, payload);
  } catch (e) {
    result = { status: 'error', message: (e && e.message) || 'send_failed' };
  }

  if (result.status === 'sent' || result.status === 'dry_run') {
    return json(res, 200, {
      ok: true, sent: true, delayMs: delay, lang: lang, tag: payload.tag,
      title: payload.title, dryRun: result.status === 'dry_run', broadcast: false
    });
  }
  return json(res, 502, {
    ok: false, error: 'push_failed', status: result.status, code: result.code || 0,
    message: result.status === 'gone'
      ? '이 기기의 푸시 구독이 만료됐어요. 알림을 다시 켜 주세요.'
      : '테스트 알림을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'
  });
}

function subId(endpoint) {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 16);
}

function cleanPrefs(raw) {
  const prefs = raw && typeof raw === 'object' ? raw : {};
  const solo = Array.isArray(prefs.solo) ? prefs.solo.filter(function (k) { return ALLOWED_SOLO.indexOf(k) > -1; }) : [];
  return {
    solo: Array.from(new Set(solo)),
    official: prefs.official !== false,
    live: prefs.live !== false
  };
}

async function loadSubs() {
  const subs = await store.getJSON(SUBS_KEY);
  return Array.isArray(subs) ? subs : [];
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const url = new URL(req.url || '/api/subscribe', 'https://dk-signal.vercel.app');

  if (req.method === 'GET') {
    const endpoint = url.searchParams.get('endpoint') || '';
    if (!endpoint) return fail(res, 400, 'endpoint 가 필요해요');
    try {
      const subs = await loadSubs();
      const hit = subs.filter(function (s) { return s.endpoint === endpoint; })[0];
      return json(res, 200, { ok: true, registered: !!hit, id: hit ? hit.id : null, prefs: hit ? hit.prefs : null, total: subs.length });
    } catch (e) {
      return json(res, 200, { ok: false, registered: false, error: 'storage_unavailable' });
    }
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') return fail(res, 405, 'GET · POST · DELETE 만 지원해요');

  const body = await readBody(req);
  if (!body) return fail(res, 400, 'JSON 본문이 필요해요');

  /* 테스트 알림은 저장소·구독 목록과 무관하게 이 기기 한 대에만 보냅니다 */
  if (req.method === 'POST' && body.action === 'test') return sendTestPush(res, body);

  const endpoint = body.endpoint || (body.subscription && body.subscription.endpoint) || url.searchParams.get('endpoint') || '';

  /* 구독 정보는 인스턴스가 바뀌어도 남아야 하므로 저장소가 필수입니다.
   * (로컬 개발·검증에서만 DK_ALLOW_MEMORY_STORE=1 로 메모리 저장을 허용) */
  if (!store.durable() && process.env.DK_ALLOW_MEMORY_STORE !== '1') {
    return json(res, 503, {
      ok: false,
      error: 'store_missing',
      message: '서버 저장소(Upstash Redis)가 아직 연결되지 않았어요. Vercel 프로젝트에 저장소를 붙이면 푸시 구독이 켜집니다.'
    });
  }

  if (!endpoint) return fail(res, 400, 'endpoint 가 필요해요');

  let subs;
  try { subs = await loadSubs(); } catch (e) { return json(res, 503, { ok: false, error: 'store_missing' }); }

  if (req.method === 'DELETE') {
    const before = subs.length;
    subs = subs.filter(function (s) { return s.endpoint !== endpoint; });
    try { await store.setJSON(SUBS_KEY, subs); } catch (e) { return json(res, 503, { ok: false, error: 'store_error' }); }
    return json(res, 200, { ok: true, removed: before !== subs.length, total: subs.length });
  }

  const sub = push.normSubscription(body.subscription || body);
  if (!sub) return fail(res, 400, '푸시 구독 정보(endpoint · keys)가 올바르지 않아요');

  const prefs = cleanPrefs(body.prefs);
  const id = subId(sub.endpoint);
  const now = new Date().toISOString();
  const existing = subs.filter(function (s) { return s.id === id; })[0];

  if (existing) {
    existing.prefs = prefs;
    existing.updatedAt = now;
    existing.ua = String(body.ua || existing.ua || '').slice(0, 180);
  } else {
    if (subs.length >= MAX_SUBS) return fail(res, 507, '구독이 너무 많아요');
    subs.push({ id: id, endpoint: sub.endpoint, keys: sub.keys, prefs: prefs, ua: String(body.ua || '').slice(0, 180), createdAt: now, updatedAt: now });
  }

  try { await store.setJSON(SUBS_KEY, subs); } catch (e) { return json(res, 503, { ok: false, error: 'store_error' }); }
  return json(res, 200, { ok: true, id: id, created: !existing, prefs: prefs, total: subs.length, durable: store.durable(), pushReady: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) });
};
