/* GET·POST /api/check — 주기 점검(크론)
 *
 *  1) DK 공식 경기: 다음 경기가 새로 잡히면 / 시작 40분 전이면 푸시
 *  2) 5인 솔로랭크: 새로 끝난 랭크 게임이 있으면 그 선수를 켜 둔 기기에 푸시
 *
 * 부르는 곳 : Vercel Cron(하루 1회) + 외부 크론(5분 간격 권장, 예: cron-job.org)
 * 보호      : CHECK_SECRET(또는 CRON_SECRET) 이 있으면 Bearer 토큰 또는 ?token= 이 필요합니다.
 * 검증      : ?dry=1 이면 실제 발송 없이 보낼 내용만 돌려줍니다.
 */
const { json, fail, header } = require('./_lib/http');
const store = require('./_lib/store');
const push = require('./_lib/push');
const riot = require('./_lib/riot');
const { PLAYERS } = require('./_lib/players');
const { getDkOfficial } = require('./_lib/official');

const STATE_KEY = 'dk:state';
const SUBS_KEY = 'dk:subs';
const SOON_MS = 40 * 60 * 1000; /* 경기 시작 40분 전 알림 */
const PUUID_TTL = 2592000;

function authorize(req, url) {
  const secret = process.env.CHECK_SECRET || process.env.CRON_SECRET || '';
  if (!secret) return { ok: true, mode: 'open' };
  const bearer = String(header(req, 'authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const given = bearer || url.searchParams.get('token') || '';
  return given === secret ? { ok: true, mode: 'secret' } : { ok: false, mode: 'secret' };
}

async function loadSubs() {
  try {
    const subs = await store.getJSON(SUBS_KEY);
    return Array.isArray(subs) ? subs : [];
  } catch (e) { return []; }
}

async function broadcast(subs, matchPref, payload, dry) {
  const targets = subs.filter(function (s) { return s && s.prefs && matchPref(s.prefs); });
  const sent = [];
  const gone = [];
  const errors = [];
  if (dry || process.env.PUSH_DRY_RUN === '1' || !push.ready()) {
    return {
      targets: targets.length,
      sent: dry || process.env.PUSH_DRY_RUN === '1' ? 0 : 0,
      dryRun: true,
      pushReady: push.ready(),
      gone: [],
      errors: [],
      preview: payload
    };
  }
  for (const sub of targets) {
    const r = await push.send(sub, payload);
    if (r.status === 'sent') sent.push(sub.id);
    else if (r.status === 'gone') gone.push(sub.id);
    else errors.push({ id: sub.id, status: r.status, code: r.code || 0 });
  }
  return { targets: targets.length, sent: sent.length, dryRun: false, pushReady: true, gone: gone, errors: errors, preview: payload };
}

async function puuidFor(player) {
  const key = 'dk:riot:puuid:' + player.key;
  try {
    const hit = await store.getJSON(key);
    if (hit && hit.puuid) return hit.puuid;
  } catch (e) {}
  const puuid = await riot.accountPuuid(player.riotId);
  try { await store.setJSON(key, { puuid: puuid, riotId: player.riotId }, PUUID_TTL); } catch (e) {}
  return puuid;
}

async function checkSolo(state, subs, dry) {
  const out = { status: 'no_key', players: [], pushes: [] };
  if (!riot.hasKey()) return out;

  state.solo = state.solo || {};
  const results = await Promise.all(PLAYERS.map(async function (player) {
    const rec = { key: player.key, nameKo: player.nameKo, status: 'ok', latestId: null, isNew: false };
    try {
      const puuid = await puuidFor(player);
      const ids = await riot.matchIds(puuid, 3);
      if (!ids.length) { rec.status = 'empty'; return rec; }
      rec.latestId = ids[0];
      const prev = state.solo[player.key] && state.solo[player.key].latestId;
      if (!prev) {
        rec.status = 'baseline';
        state.solo[player.key] = { latestId: ids[0], updatedAt: new Date().toISOString() };
        return rec;
      }
      if (prev !== ids[0]) {
        const fresh = [];
        for (const id of ids) {
          if (id === prev) break;
          fresh.push(id);
        }
        rec.isNew = true;
        rec.newIds = fresh;
        const detail = await riot.matchDetail(fresh[0]).catch(function () { return null; });
        const row = detail ? riot.mapMatch(detail, puuid) : null;
        rec.latest = row;
        state.solo[player.key] = { latestId: ids[0], updatedAt: new Date().toISOString() };
        if (row) {
          const payload = {
            title: player.nameKo + ' · 새 솔로랭크 경기',
            body: row.champ + ' ' + row.kda + ' · ' + (row.win ? '승리' : '패배') + ' · ' + row.dur,
            tag: 'solo-' + player.key + '-' + fresh[0],
            url: './?tab=solo&player=' + player.key,
            kind: 'solo',
            player: player.key
          };
          const res = await broadcast(subs, function (prefs) {
            return Array.isArray(prefs.solo) && prefs.solo.indexOf(player.key) > -1;
          }, payload, dry);
          if (fresh.length > 1) {
            /* 한 번에 여러 판이 새로 잡히면 요약 한 번 더 */
            const extra = {
              title: player.nameKo + ' · 솔로랭크 ' + fresh.length + '경기',
              body: '새로 끝난 ' + fresh.length + '경기를 확인해 보세요.',
              tag: 'solo-' + player.key + '-batch',
              url: './?tab=solo&player=' + player.key,
              kind: 'solo',
              player: player.key
            };
            const res2 = await broadcast(subs, function (prefs) {
              return Array.isArray(prefs.solo) && prefs.solo.indexOf(player.key) > -1;
            }, extra, dry);
            out.pushes.push(Object.assign({ player: player.key, count: fresh.length }, res2));
          } else {
            out.pushes.push(Object.assign({ player: player.key, count: 1 }, res));
          }
        }
      }
    } catch (e) {
      rec.status = e.status === 429 ? 'rate_limited' : (e.status === 404 ? 'not_found' : 'error');
      rec.error = e.message;
    }
    return rec;
  }));

  out.players = results;
  const okCount = results.filter(function (r) { return r.status === 'ok' || r.status === 'baseline'; }).length;
  out.status = okCount === results.length ? 'checked'
    : (results.every(function (r) { return r.status === 'rate_limited'; }) ? 'rate_limited' : 'partial');
  return out;
}

async function checkOfficial(state, subs, dry) {
  const out = { status: 'unavailable', pushes: [] };
  const data = await getDkOfficial();
  if (!data.ok) { out.status = 'unavailable'; out.error = data.detail || data.error; return out; }

  out.status = data.status;
  const next = data.next;
  state.official = state.official || {};
  const first = !state.official.initialized;
  const now = Date.now();

  out.next = next ? { id: next.id, start: next.startIso, opponent: next.opponent && next.opponent.code, league: next.league.name } : null;

  if (next) {
    if (!first && state.official.nextId !== next.id) {
      const payload = {
        title: 'DK 새 공식 경기 일정',
        body: next.dayLabel + ' ' + next.time + ' vs ' + (next.opponent ? next.opponent.name : 'TBD') + ' · ' + next.league.name,
        tag: 'official-new-' + next.id,
        url: './?tab=official',
        kind: 'official'
      };
      const res = await broadcast(subs, function (prefs) { return prefs.official !== false; }, payload, dry);
      out.pushes.push(Object.assign({ event: 'new_match' }, res));
    }
    const msLeft = next.epoch - now;
    if (msLeft > 0 && msLeft <= SOON_MS && state.official.startNotifiedId !== next.id) {
      const mins = Math.max(1, Math.round(msLeft / 60000));
      const payload = {
        title: 'DK 경기 ' + mins + '분 전',
        body: next.time + ' vs ' + (next.opponent ? next.opponent.name : 'TBD') + ' · ' + next.league.name + ' (' + next.block + ')',
        tag: 'official-soon-' + next.id,
        url: './?tab=official',
        kind: 'official'
      };
      const res = await broadcast(subs, function (prefs) { return prefs.official !== false; }, payload, dry);
      out.pushes.push(Object.assign({ event: 'starting_soon' }, res));
      state.official.startNotifiedId = next.id;
    }
    state.official.nextId = next.id;
  } else {
    state.official.nextId = null;
  }

  state.official.initialized = true;
  state.official.checkedAt = new Date().toISOString();
  out.recentTop = data.recent && data.recent[0] ? { id: data.recent[0].id, score: data.recent[0].score, opponent: data.recent[0].opponent && data.recent[0].opponent.code } : null;
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'POST') return fail(res, 405, 'GET · POST 만 지원해요');

  const url = new URL(req.url || '/api/check', 'https://dk-signal.vercel.app');
  const auth = authorize(req, url);
  if (!auth.ok) return fail(res, 401, '토큰이 올바르지 않아요', { auth: auth.mode });

  const dry = url.searchParams.get('dry') === '1';
  const only = url.searchParams.get('only') || '';
  const started = Date.now();

  let state = null;
  try { state = await store.getJSON(STATE_KEY); } catch (e) { state = null; }
  state = state || { version: 3, official: {}, solo: {} };

  const subs = await loadSubs();
  const targets = {
    total: subs.length,
    official: subs.filter(function (s) { return s.prefs && s.prefs.official !== false; }).length,
    solo: subs.reduce(function (n, s) { return n + ((s.prefs && Array.isArray(s.prefs.solo)) ? s.prefs.solo.length : 0); }, 0)
  };

  const official = (only === 'solo') ? { status: 'skipped' } : await checkOfficial(state, subs, dry).catch(function (e) {
    return { status: 'error', error: String(e && e.message ? e.message : e) };
  });
  const solo = (only === 'official') ? { status: 'skipped' } : await checkSolo(state, subs, dry).catch(function (e) {
    return { status: 'error', error: String(e && e.message ? e.message : e) };
  });

  /* 사라진 구독 정리 */
  const goneIds = [].concat(
    (official.pushes || []).reduce(function (a, p) { return a.concat(p.gone || []); }, []),
    (solo.pushes || []).reduce(function (a, p) { return a.concat(p.gone || []); }, [])
  );
  let pruned = 0;
  if (goneIds.length && store.durable()) {
    const left = subs.filter(function (s) { return goneIds.indexOf(s.id) === -1; });
    pruned = subs.length - left.length;
    try { await store.setJSON(SUBS_KEY, left); } catch (e) {}
  }

  const summary = {
    at: new Date().toISOString(),
    tookMs: Date.now() - started,
    dry: dry,
    pushed: (official.pushes || []).length + (solo.pushes || []).length,
    pruned: pruned,
    targets: targets,
    pushReady: push.ready(),
    official: { status: official.status, next: official.next || null, pushes: official.pushes || [] },
    solo: { status: solo.status, players: (solo.players || []).map(function (p) {
      return { key: p.key, status: p.status, latestId: p.latestId || null, isNew: !!p.isNew };
    }), pushes: solo.pushes || [] }
  };

  try {
    await store.setJSON('dk:lastcheck', summary, 604800);
    await store.setJSON(STATE_KEY, state);
  } catch (e) { summary.storeError = String(e && e.message ? e.message : e); }

  return json(res, 200, Object.assign({ ok: true }, summary));
};
