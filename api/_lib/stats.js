/* 구독자 일별 통계 — Redis `dk:stats:daily`
 *
 *  저장 모양
 *    { date: 'YYYY-MM-DD', baseline: 435, total: 441, history: [{ date, total }, ...] }
 *    · date     : 마지막으로 관측한 KST 날짜
 *    · baseline : 그날 처음 관측한 구독자 수 (오늘 증감의 기준)
 *    · total    : 그날 마지막으로 관측한 구독자 수
 *    · history  : 최근 7일 스냅샷 (기록이 없는 날은 total: null)
 *
 *  구독자 숫자만 다룹니다. endpoint·keys 같은 개인정보는 저장하지 않습니다.
 */
const store = require('./store');

const KEY = 'dk:stats:daily';
const DAYS = 7;
const DAY_MS = 86400000;
const KST_MS = 9 * 3600 * 1000;

function pad(n) { return (n < 10 ? '0' : '') + n; }

/* KST 기준 YYYY-MM-DD */
function kstDate(when) {
  const t = (when instanceof Date ? when.getTime() : Number(when)) || Date.now();
  const d = new Date(t + KST_MS);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function shiftDate(date, deltaDays) {
  const p = String(date).split('-').map(Number);
  const t = Date.UTC(p[0], p[1] - 1, p[2]) + deltaDays * DAY_MS;
  const d = new Date(t);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

/* 오래된 날짜 → 오늘 순서의 최근 n일 */
function lastDays(today, n) {
  const out = [];
  for (let i = (n || DAYS) - 1; i >= 0; i--) out.push(shiftDate(today, -i));
  return out;
}

function validTotal(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/* 저장값 + 지금 값 → 화면·API 가 쓰는 모양 (쓰기는 하지 않음) */
function build(saved, today, total) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const now = validTotal(total);
  const hist = {};
  (Array.isArray(s.history) ? s.history : []).forEach(function (row) {
    if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.date || ''))) return;
    const v = validTotal(row.total);
    if (v !== null) hist[row.date] = v;
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(s.date || ''))) {
    const v = validTotal(s.total);
    if (v !== null) hist[s.date] = v;
  }
  if (now !== null) hist[today] = now;

  const sameDay = s.date === today && validTotal(s.baseline) !== null;
  const baseline = sameDay ? validTotal(s.baseline) : now;
  const days = lastDays(today, DAYS);
  const history = days.map(function (date) {
    const v = Object.prototype.hasOwnProperty.call(hist, date) ? hist[date] : null;
    return { date: date, total: v };
  });

  return {
    date: today,
    baseline: baseline === null ? 0 : baseline,
    current: now === null ? (baseline || 0) : now,
    delta: now === null ? 0 : now - (baseline === null ? now : baseline),
    history: history
  };
}

function sameState(saved, today, total, out) {
  if (!saved || saved.date !== today) return false;
  if (validTotal(saved.total) !== validTotal(total)) return false;
  if (validTotal(saved.baseline) !== validTotal(out.baseline)) return false;
  return JSON.stringify(saved.history || []) === JSON.stringify(out.history);
}

async function read() {
  try { return await store.getJSON(KEY); } catch (e) { return null; }
}

async function write(out) {
  try {
    await store.setJSON(KEY, {
      date: out.date,
      baseline: out.baseline,
      total: out.current,
      history: out.history
    });
    return true;
  } catch (e) { return false; }
}

/* 그날 처음 관측이면 기준값을 저장합니다 (하루 1번만 쓰기). */
async function ensureBaseline(total) {
  const today = kstDate();
  const saved = await read();
  const out = build(saved, today, total);
  const fresh = !saved || saved.date !== today || validTotal(saved.baseline) === null;
  if (fresh) await write(out);
  return out;
}

/* 점검(크론)에서 매번 호출 — 오늘 마지막 구독자 수와 7일 기록을 갱신합니다. */
async function observe(total) {
  const today = kstDate();
  const saved = await read();
  const out = build(saved, today, total);
  if (!sameState(saved, today, total, out)) await write(out);
  return out;
}

/* 화면용 — 저장은 하지 않고 지금 값으로 오늘 칸만 채워 돌려줍니다. */
async function snapshot(total) {
  const today = kstDate();
  const saved = await read();
  return build(saved, today, total);
}

module.exports = { KEY, DAYS, kstDate, lastDays, build, ensureBaseline, observe, snapshot };
