/* 상태 저장소 어댑터
 *
 * 우선순위
 *  1) Upstash Redis REST (Vercel Marketplace 연동 시 자동 주입되는 환경변수)
 *     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *     또는 예전 Vercel KV 이름 KV_REST_API_URL / KV_REST_API_TOKEN
 *  2) 메모리 (같은 실행 인스턴스 안에서만 유효 · 로컬 개발·테스트용)
 *
 * 구독 정보처럼 인스턴스가 바뀌어도 남아야 하는 값은 1) 이 있어야 합니다.
 * 푸시 감지용 캐시(마지막 경기 ID 등)는 메모리로도 동작하지만, 그때는 매번 새로 확인합니다.
 */

const KV_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

const memory = new Map();

function backend() {
  return (KV_URL && KV_TOKEN) ? 'redis' : 'memory';
}

function durable() {
  return backend() === 'redis';
}

/* Upstash REST 는 루트에 명령 배열을 POST 하는 방식이 가장 단순합니다. */
async function redisCmd(args, timeout) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, timeout || 6000);
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + KV_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: ac.signal
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error('storage HTTP ' + res.status);
      err.status = res.status;
      err.body = text.slice(0, 200);
      throw err;
    }
    if (data && data.error) throw new Error('storage: ' + data.error);
    return data ? data.result : null;
  } finally {
    clearTimeout(timer);
  }
}

function memGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.exp && hit.exp < Date.now()) { memory.delete(key); return null; }
  return hit.value;
}

function memSet(key, value, ttlSec) {
  memory.set(key, { value: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
}

async function getJSON(key) {
  if (backend() === 'redis') {
    const raw = await redisCmd(['GET', key]);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  return memGet(key);
}

/* 여러 키를 한 번에 읽습니다 (Redis 는 MGET 1회 — 대시보드 폴링에서 명령 수를 아낍니다). */
async function getJSONMany(keys) {
  const list = Array.isArray(keys) ? keys : [];
  if (!list.length) return [];
  if (backend() === 'redis') {
    const raw = await redisCmd(['MGET'].concat(list));
    const arr = Array.isArray(raw) ? raw : [];
    return list.map(function (_, i) {
      const v = arr[i];
      if (!v) return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    });
  }
  return list.map(memGet);
}

async function setJSON(key, value, ttlSec) {
  const raw = JSON.stringify(value);
  if (backend() === 'redis') {
    const cmd = ttlSec ? ['SET', key, raw, 'EX', String(ttlSec)] : ['SET', key, raw];
    await redisCmd(cmd);
    return true;
  }
  memSet(key, value, ttlSec);
  return true;
}

async function del(key) {
  if (backend() === 'redis') { await redisCmd(['DEL', key]); return true; }
  memory.delete(key);
  return true;
}

async function incr(key, ttlSec) {
  if (backend() === 'redis') {
    const n = await redisCmd(['INCR', key]);
    if (n === 1 && ttlSec) await redisCmd(['EXPIRE', key, String(ttlSec)]);
    return Number(n) || 0;
  }
  const n = (Number(memGet(key)) || 0) + 1;
  memSet(key, n, ttlSec);
  return n;
}

module.exports = { backend, durable, getJSON, getJSONMany, setJSON, del, incr };
