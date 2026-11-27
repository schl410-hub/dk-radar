/* LoL Esports 공식 일정 수집
 * lolesports.com 이 쓰는 공개 API(persisted/gw/getSchedule · getEventDetails)에서 DK 경기만 골라 정리합니다.
 * 공개 키는 사이트가 함께 내려주는 값이라 바뀔 수 있어, LOLESPORTS_API_KEY 로 덮어쓸 수 있게 했습니다.
 *
 * getEventDetails 의 games[].vods 에는 언어별 다시보기(provider + parameter + 시작 지점)가 들어 있어,
 * 종료된 경기의 '풀영상 VOD' 바로가기를 언어별로 만들 수 있습니다. (확인되지 않으면 앱은 유튜브 검색으로 안내)
 */

const { fetchJson, kst, relative } = require('./http');
const store = require('./store');

const BASE = 'https://esports-api.lolesports.com/persisted/gw';
const PUBLIC_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LCK_LEAGUE_ID = '98767991310872058'; /* LCK */

const DK_CODES = ['DK', 'DPLUSKIA', 'DPLUS KIA'];

const HL = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
const VOD_LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
/* 한국 팬은 SOOP(아프리카) 중계를, 해외 팬은 유튜브를 먼저 봅니다. */
const PROVIDER_PREF = {
  ko: ['afreecatv', 'youtube', 'twitch'],
  en: ['youtube', 'twitch', 'afreecatv'],
  ja: ['youtube', 'twitch', 'afreecatv'],
  zh: ['youtube', 'twitch', 'afreecatv']
};

/* 서버가 앱으로 그대로 돌려주는 안내 문구 (zh 는 중국어 간체) */
const MESSAGES = {
  ko: {
    unavailable: '공식 일정을 가져오지 못했어요',
    apiError: '일정 API 응답을 받지 못했어요',
    noUpcoming: '다음 공식 경기가 아직 공개되지 않았어요'
  },
  en: {
    unavailable: 'Could not load the official schedule',
    apiError: 'No response from the schedule API',
    noUpcoming: 'The next official match has not been published yet'
  },
  ja: {
    unavailable: '公式日程を取得できませんでした',
    apiError: '日程APIから応答がありませんでした',
    noUpcoming: '次の公式戦はまだ公開されていません'
  },
  zh: {
    unavailable: '获取官方赛程失败',
    apiError: '没有收到赛程 API 的响应',
    noUpcoming: '下一场官方比赛尚未公布'
  }
};
function messageFor(lang, key) {
  const table = MESSAGES[lang] || MESSAGES.ko;
  return table[key] || MESSAGES.ko[key] || key;
}

/* hl(ko-KR / en-US / ja-JP / zh-CN) → 앱 언어 키 */
function langForHl(hl) {
  const s = String(hl || '').toLowerCase();
  if (s.indexOf('zh') === 0) return 'zh';
  if (s.indexOf('ja') === 0) return 'ja';
  if (s.indexOf('en') === 0) return 'en';
  return 'ko';
}

function apiKey() {
  return process.env.LOLESPORTS_API_KEY || PUBLIC_KEY;
}

function headers() {
  return {
    'x-api-key': apiKey(),
    Origin: 'https://lolesports.com',
    Referer: 'https://lolesports.com/',
    Accept: 'application/json'
  };
}

function hlFor(lang) {
  return HL[lang] || HL.ko;
}

function isDkTeam(team) {
  if (!team) return false;
  const code = String(team.code || '').toUpperCase().replace(/\s+/g, '');
  if (DK_CODES.indexOf(code) > -1) return true;
  return /dplus\s*kia|dpluskia/i.test(String(team.name || ''));
}

async function schedule(query, hl) {
  const url = BASE + '/getSchedule?hl=' + (hl || HL.ko) + (query || '');
  const data = await fetchJson(url, {
    timeout: 9000,
    label: 'lolesports getSchedule',
    headers: headers()
  });
  const events = data && data.data && data.data.schedule && data.data.schedule.events;
  return Array.isArray(events) ? events : [];
}

async function eventDetails(id, hl) {
  const url = BASE + '/getEventDetails?hl=' + (hl || HL.ko) + '&id=' + encodeURIComponent(id);
  const data = await fetchJson(url, {
    timeout: 7000,
    label: 'lolesports getEventDetails',
    headers: headers()
  });
  return data && data.data && data.data.event ? data.data.event : null;
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

function shape(event, nowMs, hl) {
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

/* ---------- 다시보기(VOD) · 스트림 링크 ---------- */

function hms(sec) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return (h ? h + 'h' : '') + (m ? m + 'm' : '') + r + 's';
}

function vodUrl(provider, parameter, startMillis) {
  if (!parameter) return '';
  const p = String(provider || '').toLowerCase();
  const sec = Number.isFinite(startMillis) ? Math.max(0, Math.floor(startMillis / 1000)) : null;
  if (p === 'youtube') return 'https://www.youtube.com/watch?v=' + encodeURIComponent(parameter) + (sec ? '&t=' + sec + 's' : '');
  if (p === 'twitch') return 'https://www.twitch.tv/videos/' + encodeURIComponent(parameter) + (sec ? '?t=' + hms(sec) : '');
  if (p === 'afreecatv') return 'https://vod.sooplive.com/player/' + encodeURIComponent(parameter) + (sec ? '?change_second=' + sec : '');
  return '';
}

/* 경기(game) 묶음에서 언어별 대표 다시보기를 고릅니다. 첫 세트 시작 지점으로 연결합니다. */
function pickVod(games, langKey) {
  const locale = VOD_LOCALE[langKey] || VOD_LOCALE.ko;
  const prefs = PROVIDER_PREF[langKey] || PROVIDER_PREF.ko;
  for (let pi = 0; pi < prefs.length; pi++) {
    const provider = prefs[pi];
    for (let gi = 0; gi < games.length; gi++) {
      const game = games[gi];
      const vods = Array.isArray(game.vods) ? game.vods : [];
      const hit = vods.filter(function (v) {
        return v && v.provider === provider && v.parameter && v.locale === locale;
      })[0];
      if (hit) {
        return {
          provider: provider,
          id: hit.parameter,
          game: game.number || null,
          t: Number.isFinite(hit.startMillis) ? Math.floor(hit.startMillis / 1000) : null,
          url: vodUrl(provider, hit.parameter, hit.startMillis)
        };
      }
    }
  }
  return null;
}

function streamLinks(streams) {
  if (!Array.isArray(streams)) return [];
  const out = [];
  const seen = {};
  streams.forEach(function (s) {
    if (!s || !s.parameter) return;
    const provider = String(s.provider || '').toLowerCase();
    let url = '';
    if (provider === 'youtube') url = 'https://www.youtube.com/watch?v=' + encodeURIComponent(s.parameter);
    else if (provider === 'twitch') url = 'https://www.twitch.tv/' + encodeURIComponent(s.parameter);
    else if (provider === 'afreecatv') url = 'https://ch.sooplive.co.kr/' + encodeURIComponent(s.parameter);
    if (!url || seen[url]) return;
    seen[url] = true;
    out.push({
      provider: provider,
      locale: s.locale || '',
      language: (s.mediaLocale && s.mediaLocale.englishName) || '',
      url: url
    });
  });
  return out.slice(0, 6);
}

/* getEventDetails 결과를 캐시하기 좋은 모양으로 (언어와 무관한 값) */
function shapeDetails(event) {
  const match = event.match || {};
  const games = Array.isArray(match.games) ? match.games : [];
  return {
    games: games.map(function (g) {
      return {
        number: g.number || null,
        vods: (Array.isArray(g.vods) ? g.vods : []).map(function (v) {
          return {
            provider: v.provider || '',
            parameter: v.parameter || '',
            locale: v.locale || '',
            startMillis: Number.isFinite(v.startMillis) ? v.startMillis : null
          };
        }).filter(function (v) { return v.parameter && v.locale; })
      };
    }).filter(function (g) { return g.vods.length; }),
    streams: streamLinks(event.streams)
  };
}

async function detailFor(eventId, hl) {
  const key = 'dk:vod:' + eventId;
  try {
    const hit = await store.getJSON(key);
    if (hit) return hit;
  } catch (e) { /* 저장소가 없으면 바로 조회 */ }
  const event = await eventDetails(eventId, hl).catch(function () { return null; });
  if (!event) return null;
  const shaped = shapeDetails(event);
  try { await store.setJSON(key, shaped, 21600); } catch (e) { /* 캐시 실패는 무시 */ }
  return shaped;
}

/* 다음 경기 + 최근 경기에 영상 정보를 붙입니다. 최대 4경기까지만(응답 시간 보호). */
async function enrichVideos(list, hl) {
  const targets = list.filter(Boolean).slice(0, 4);
  await Promise.allSettled(targets.map(async function (item) {
    const details = await detailFor(item.id, hl);
    if (!details) return;
    if (details.games.length) {
      const vod = {
        ko: pickVod(details.games, 'ko'),
        en: pickVod(details.games, 'en'),
        ja: pickVod(details.games, 'ja')
      };
      const any = vod.ko || vod.en || vod.ja;
      if (any) item.vod = vod;
    }
    if (details.streams.length) item.streamLinks = details.streams;
  }));
  return list;
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
  const hl = opts.hl || HL.ko;
  const results = await Promise.allSettled([
    schedule('', hl),
    schedule('&leagueId=' + LCK_LEAGUE_ID, hl)
  ]);

  const events = [];
  const errors = [];
  results.forEach(function (r) {
    if (r.status === 'fulfilled') events.push.apply(events, r.value);
    else errors.push(String(r.reason && r.reason.message ? r.reason.message : r.reason));
  });

  /* 한쪽 일정 호출이 잠깐 실패하면(레이트 리밋 등) 그 호출만 한 번 더 시도합니다. */
  if (errors.length) {
    const retry = await Promise.allSettled([
      schedule('', hl),
      schedule('&leagueId=' + LCK_LEAGUE_ID, hl)
    ]);
    retry.forEach(function (r) {
      if (r.status === 'fulfilled') events.push.apply(events, r.value);
    });
  }

  const shaped = dedupe(events.map(function (e) { return shape(e, nowMs, hl); }).filter(Boolean));
  if (!shaped.length && errors.length) {
    return {
      ok: false,
      source: 'lolesports',
      status: 'unavailable',
      error: messageFor(langForHl(hl), 'apiError'),
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

  /* 영상·다시보기 링크: 다음 경기 1개 + 최근 3경기 */
  const videoTargets = [next].concat(recent.slice(0, 3)).filter(Boolean);
  try {
    await enrichVideos(videoTargets, hl);
  } catch (e) { /* 영상 정보는 없어도 일정은 보여줍니다 */ }

  return {
    ok: true,
    source: 'lolesports',
    status: upcoming.length ? 'scheduled' : 'no_upcoming',
    fetchedAt: new Date().toISOString(),
    note: upcoming.length ? '' : messageFor(langForHl(hl), 'noUpcoming'),
    next: next || null,
    upcoming: upcoming.slice(0, 5),
    recent: recent.slice(0, 8)
  };
}

module.exports = { getDkOfficial, isDkTeam, hlFor, vodUrl, messageFor, langForHl, PUBLIC_KEY, LCK_LEAGUE_ID };
