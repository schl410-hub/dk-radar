/* POST /api/subscribe — 기기의 웹 푸시 구독 + 알림 설정(선수별 솔랭 / DK 공식 경기) 저장
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

function subId(endpoint) {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 16);
}

function cleanPrefs(raw) {
  const prefs = raw && typeof raw === 'object' ? raw : {};
  const solo = Array.isArray(prefs.solo) ? prefs.solo.filter(function (k) { return ALLOWED_SOLO.indexOf(k) > -1; }) : [];
  return {
    solo: Array.from(new Set(solo)),
    official: prefs.official !== false
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
