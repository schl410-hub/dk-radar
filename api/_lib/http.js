/* 공통 HTTP·시간 유틸 (Vercel Serverless Function, CommonJS) */

function json(res, status, body, extraHeaders) {
  const headers = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Access-Control-Allow-Origin': '*'
  }, extraHeaders || {});
  if (res.setHeader) {
    Object.keys(headers).forEach(function (k) { res.setHeader(k, headers[k]); });
  }
  const text = JSON.stringify(body);
  if (res.status) {
    res.status(status);
    res.send(text);
  } else {
    res.statusCode = status;
    res.end(text);
  }
}

function fail(res, status, message, extra) {
  json(res, status, Object.assign({ ok: false, error: message }, extra || {}));
}

function header(req, name) {
  const h = req.headers || {};
  return h[name] || h[name.toLowerCase()] || '';
}

async function fetchJson(url, options) {
  const opts = options || {};
  const timeout = opts.timeout || 9000;
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, timeout);
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'User-Agent': 'dk-signal/3.0 (+https://dk-signal.vercel.app)' }, opts.headers || {}),
      body: opts.body,
      signal: ac.signal
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error('HTTP ' + res.status + ' · ' + (opts.label || url));
      err.status = res.status;
      err.body = text.slice(0, 300);
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string' && req.body) {
      try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve(null); }
    }
    let raw = '';
    let done = false;
    const finish = function () {
      if (done) return;
      done = true;
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch (e) { resolve(null); }
    };
    req.on('data', function (chunk) {
      raw += chunk;
      if (raw.length > 200000) { req.destroy(); finish(); }
    });
    req.on('end', finish);
    req.on('error', reject);
  });
}

const KST_OFFSET_MIN = 9 * 60;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* UTC ISO → 한국 시간 표기 묶음 */
function kst(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + KST_OFFSET_MIN * 60000);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const da = d.getUTCDate();
  const hh = d.getUTCHours();
  const mm = d.getUTCMinutes();
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  const p = function (n) { return String(n).padStart(2, '0'); };
  return {
    iso: y + '-' + p(mo) + '-' + p(da) + 'T' + p(hh) + ':' + p(mm) + ':00+09:00',
    date: y + '.' + p(mo) + '.' + p(da),
    dateLabel: mo + '. ' + da + '.',
    shortDate: mo + '.' + p(da) + '.',
    time: pad(hh) + ':' + pad(mm),
    weekday: WEEKDAYS[d.getUTCDay()],
    dayLabel: mo + '. ' + da + '. (' + WEEKDAYS[d.getUTCDay()] + ')',
    monthDay: p(mo) + '.' + p(da),
    epoch: t
  };
}

function relative(epoch, nowMs) {
  const now = nowMs || Date.now();
  const diff = epoch - now;
  const abs = Math.abs(diff);
  const fmt = function (n, unit) { return n + unit; };
  if (abs < 60000) return '지금';
  if (diff > 0) {
    if (abs < 3600000) return fmt(Math.round(abs / 60000), '분 뒤');
    if (abs < 86400000) return fmt(Math.round(abs / 3600000), '시간 뒤');
    return fmt(Math.round(abs / 86400000), '일 뒤');
  }
  if (abs < 3600000) return fmt(Math.round(abs / 60000), '분 전');
  if (abs < 86400000) return fmt(Math.round(abs / 3600000), '시간 전');
  return fmt(Math.round(abs / 86400000), '일 전');
}

module.exports = { json, fail, header, fetchJson, readBody, kst, relative };
