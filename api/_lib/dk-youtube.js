/* 디플러스 기아 공식 유튜브 채널 영상 수집
 *
 *  youtube.com/@DplusKia_LOL → channel_id UCepHesz_5Lwr7qRaqjB-p1A (2026-11-27 확인)
 *  https://www.youtube.com/feeds/videos.xml?channel_id=... 는 공개 Atom 피드라 API 키가 필요 없습니다.
 *
 *  유튜브는 데이터센터 IP(Vercel)에서 피드 요청을 503 으로 막는 일이 잦아, 세 가지를 차례로 시도합니다.
 *    1) 채널 RSS 직접 (가장 정확 · 조회수까지)
 *    2) RSS → JSON 프록시(api.rss2json.com) — 공개 피드만 넘기고, 조회수는 없음
 *  모두 실패하면 호출부가 api/_lib/dk-youtube-snapshot.js 로 대체합니다.
 */

const CHANNEL_ID = 'UCepHesz_5Lwr7qRaqjB-p1A';
const CHANNEL_HANDLE = '@DplusKia_LOL';
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
const PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX = 10;

const HEADERS_BROWSER = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+678; SOCS=CAI',
  'Referer': 'https://www.youtube.com/'
};

function decode(s) {
  return String(s == null ? '' : s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(block, name) {
  const re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>');
  const m = block.match(re);
  return m ? decode(m[1]) : '';
}

function attr(block, name, attribute) {
  const re = new RegExp('<' + name + '\\s[^>]*' + attribute + '="([^"]*)"');
  const m = block.match(re);
  return m ? decode(m[1]) : '';
}

function thumbOf(id) {
  return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
}

function parseFeed(xml) {
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const videos = entries.map(function (block) {
    const id = tag(block, 'yt:videoId');
    const views = Number(attr(block, 'media:statistics', 'views') || 0);
    const desc = tag(block, 'media:description').split('\n')[0] || '';
    return {
      id: id,
      title: tag(block, 'title'),
      published: tag(block, 'published'),
      thumb: thumbOf(id),
      views: Number.isFinite(views) ? views : 0,
      desc: desc,
      url: id ? 'https://www.youtube.com/watch?v=' + id : ''
    };
  }).filter(function (v) { return v.id && v.title; });
  return videos.slice(0, MAX);
}

/* rss2json 응답: items[].{title, pubDate('YYYY-MM-DD HH:MM:SS'), link, guid, thumbnail} */
function parseProxy(json) {
  const items = (json && Array.isArray(json.items)) ? json.items : [];
  return items.map(function (it) {
    const id = String(it.guid || '').replace('yt:video:', '') ||
      String(it.link || '').replace(/.*[?&]v=/, '');
    return {
      id: id,
      title: decode(it.title),
      published: String(it.pubDate || '').replace(' ', 'T') + (it.pubDate ? 'Z' : ''),
      thumb: thumbOf(id),
      views: 0,
      desc: '',
      url: 'https://www.youtube.com/watch?v=' + id
    };
  }).filter(function (v) { return v.id && v.title; }).slice(0, MAX);
}

async function get(url, headers, timeout) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, timeout || 7000);
  try {
    const res = await fetch(url, { headers: headers, signal: ac.signal });
    const text = await res.text();
    return { status: res.status, text: text };
  } finally {
    clearTimeout(timer);
  }
}

const STRATEGIES = [
  {
    name: 'rss',
    run: async function () {
      const r = await get(FEED, HEADERS_BROWSER);
      if (r.status !== 200) throw new Error('rss HTTP ' + r.status);
      const rows = parseFeed(r.text);
      if (!rows.length) throw new Error('rss: no entries');
      return rows;
    }
  },
  {
    name: 'proxy',
    run: async function () {
      const r = await get(PROXY, { 'User-Agent': 'dk-signal/3.3 (+https://dk-signal.vercel.app)' });
      if (r.status !== 200) throw new Error('proxy HTTP ' + r.status);
      let data = null;
      try { data = JSON.parse(r.text); } catch (e) { throw new Error('proxy: not json'); }
      if (data.status && data.status !== 'ok') throw new Error('proxy: ' + data.status);
      const rows = parseProxy(data);
      if (!rows.length) throw new Error('proxy: no items');
      return rows;
    }
  },
];

async function fetchDkYoutube() {
  const errors = [];
  for (let i = 0; i < STRATEGIES.length; i++) {
    const s = STRATEGIES[i];
    try {
      const videos = await s.run();
      return {
        ok: true,
        source: 'youtube-' + s.name,
        channel: {
          id: CHANNEL_ID,
          handle: CHANNEL_HANDLE,
          title: 'Dplus Kia',
          url: 'https://www.youtube.com/' + CHANNEL_HANDLE
        },
        videos: videos,
        fetchedAt: new Date().toISOString()
      };
    } catch (e) {
      errors.push(s.name + ': ' + String(e && e.message ? e.message : e));
    }
  }
  throw new Error(errors.join(' | '));
}

async function probe() {
  return Promise.all(STRATEGIES.map(async function (s) {
    try {
      const videos = await s.run();
      return { name: s.name, ok: true, videos: videos.length, first: videos[0] && videos[0].title };
    } catch (e) {
      return { name: s.name, ok: false, detail: String(e && e.message ? e.message : e) };
    }
  }));
}

module.exports = { CHANNEL_ID, CHANNEL_HANDLE, FEED, PROXY, MAX, parseFeed, parseProxy, fetchDkYoutube, probe };
