/* LoL Esports 공식 일정 수집
 * lolesports.com 이 쓰는 공개 API(persisted/gw/getSchedule)에서 DK 경기만 골라 정리합니다.
 * 공개 키는 사이트가 함께 내려주는 값이라 바뀔 수 있어, LOLESPORTS_API_KEY 로 덮어쓸 수 있게 했습니다.
 */

const { fetchJson, kst, relative } = require('./http');

const BASE = 'https://esports-api.lolesports.com/persisted/gw';
const PUBLIC_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LCK_LEAGUE_ID = '98767991310872058'; /* LCK */

const DK_CODES = ['DK', 'DPLUSKIA', 'DPLUS KIA'];

function apiKey() {
  return process.env.LOLESPORTS_API_KEY || PUBLIC_KEY;
}

function isDkTeam(team) {
  if (!team) return false;
  const code = String(team.code || '').toUpperCase().replace(/\s+/g, '');
  if (DK_CODES.indexOf(code) > -1) return true;
  return /dplus\s*kia|dpluskia/i.test(String(team.name || ''));
}

async function schedule(query) {
  const url = BASE + '/getSchedule?hl=ko-KR' + (query || '');
  const data = await fetchJson(url, {
    timeout: 9000,
    label: 'lolesports getSchedule',
    headers: {
      'x-api-key': apiKey(),
      Origin: 'https://lolesports.com',
      Referer: 'https://lolesports.com/',
      Accept: 'application/json'
    }
  });
  const events = data && data.data && data.data.schedule && data.data.schedule.events;
  return Array.isArray(events) ? events : [];
}

function teamInfo(team) {
  if (!team) return null;
  const result = team.result || {};
  return {
    name: team.name || '',
    code: team.code || '',
    image: team.image || '',
    gameWins: typeof result.gameWins === 'number' ? result.gameWins : null,
    outcome: result.outcome || ''
  };
}

function shape(event, nowMs) {
  const match = event.match || {};
  const teams = Array.isArray(match.teams) ? match.teams : [];
  const dkTeam = teams.filter(isDkTeam)[0];
  const oppTeam = teams.filter(function (t) { return !isDkTeam(t); })[0];
  if (!dkTeam) return null;
  const when = kst(event.startTime);
  if (!when) return null;
  const strategy = match.strategy || {};
  const dk = teamInfo(dkTeam);
  const opp = teamInfo(oppTeam);
  const dkWins = dk && dk.gameWins;
  const oppWins = opp && opp.gameWins;
  const score = (typeof dkWins === 'number' && typeof oppWins === 'number')
    ? dkWins + ' : ' + oppWins
    : '';
  const win = dk && dk.outcome === 'win' ? true : (dk && dk.outcome === 'loss' ? false : null);
  const league = event.league || {};
  return {
    id: String(match.id || event.startTime),
    state: event.state || 'unstarted',
    type: event.type || 'match',
    startTime: event.startTime,
    startIso: when.iso,
    date: when.date,
    dateLabel: when.dateLabel,
    dayLabel: when.dayLabel,
    time: when.time,
    weekday: when.weekday,
    epoch: when.epoch,
    relative: relative(when.epoch, nowMs),
    league: { name: league.name || '', slug: league.slug || '' },
    block: event.blockName || '',
    bo: strategy.count || null,
    dk: dk,
    opponent: opp,
    score: score,
    win: win,
    streams: Array.isArray(event.streams) ? event.streams.length : 0
  };
}

function dedupe(list) {
  const seen = {};
  const out = [];
  list.forEach(function (e) {
    if (!e || seen[e.id]) return;
    seen[e.id] = true;
    out.push(e);
  });
  return out;
}

/* DK 공식 경기: 다가오는 경기 + 최근 결과 */
async function getDkOfficial(options) {
  const nowMs = Date.now();
  const opts = options || {};
  const results = await Promise.allSettled([
    schedule(''),
    schedule('&leagueId=' + LCK_LEAGUE_ID)
  ]);

  const events = [];
  const errors = [];
  results.forEach(function (r) {
    if (r.status === 'fulfilled') events.push.apply(events, r.value);
    else errors.push(String(r.reason && r.reason.message ? r.reason.message : r.reason));
  });

  const shaped = dedupe(events.map(function (e) { return shape(e, nowMs); }).filter(Boolean));
  if (!shaped.length && errors.length) {
    return {
      ok: false,
      source: 'lolesports',
      status: 'unavailable',
      error: '일정 API 응답을 받지 못했어요',
      detail: errors[0],
      fetchedAt: new Date().toISOString(),
      next: null,
      upcoming: [],
      recent: []
    };
  }

  shaped.sort(function (a, b) { return a.epoch - b.epoch; });
  const upcoming = shaped.filter(function (e) { return e.state !== 'completed'; });
  const recent = shaped.filter(function (e) { return e.state === 'completed'; }).reverse();
  const next = upcoming[0] || null;

  return {
    ok: true,
    source: 'lolesports',
    status: upcoming.length ? 'scheduled' : 'no_upcoming',
    fetchedAt: new Date().toISOString(),
    note: upcoming.length ? '' : '다음 공식 경기가 아직 공개되지 않았어요',
    next: next || (opts.withFallbackNext === false ? null : null),
    upcoming: upcoming.slice(0, 5),
    recent: recent.slice(0, 8)
  };
}

module.exports = { getDkOfficial, isDkTeam, PUBLIC_KEY, LCK_LEAGUE_ID };
