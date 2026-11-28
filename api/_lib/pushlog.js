/* 푸시 발송 기록 — Redis `dk:pushlog` 에 최근 15건만 남깁니다.
 *
 *  · 실제로 발송된 알림(sent > 0, dry 아님)만 기록합니다.
 *  · 남기는 값은 { at, type, title, sent, targets } 뿐입니다.
 *    endpoint · keys · 기기 정보는 절대 저장하지 않습니다.
 */
const store = require('./store');

const KEY = 'dk:pushlog';
const KEEP = 15;
const TITLE_MAX = 90;

function clean(row) {
  const r = row && typeof row === 'object' ? row : {};
  return {
    at: r.at ? String(r.at) : new Date().toISOString(),
    type: String(r.type || 'etc').slice(0, 16),
    title: String(r.title || '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX),
    sent: Math.max(0, Math.round(Number(r.sent) || 0)),
    targets: Math.max(0, Math.round(Number(r.targets) || 0))
  };
}

/* 발송 1건을 기록합니다. 보낸 기기가 없으면(sent = 0) 아무것도 남기지 않습니다. */
async function record(entry) {
  const row = clean(entry);
  if (!row.sent) return null;
  let list = null;
  try { list = await store.getJSON(KEY); } catch (e) { list = null; }
  const prev = Array.isArray(list) ? list.filter(function (r) { return r && r.at; }) : [];
  const next = [row].concat(prev).slice(0, KEEP);
  try { await store.setJSON(KEY, next); } catch (e) { return null; }
  return row;
}

/* 최근 n건(기본 10건) — 최신이 앞입니다. */
async function recent(n) {
  let list = null;
  try { list = await store.getJSON(KEY); } catch (e) { list = null; }
  if (!Array.isArray(list)) return [];
  return list.filter(function (r) { return r && r.at; }).slice(0, n || 10).map(clean);
}

module.exports = { record, recent, clean, KEY, KEEP };
