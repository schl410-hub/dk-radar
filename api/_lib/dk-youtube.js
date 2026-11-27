/* 디플러스 기아 공식 유튜브 채널 RSS 수집
 *
 *  youtube.com/@DplusKia_LOL → channel_id UCepHesz_5Lwr7qRaqjB-p1A (2026-11-27 확인)
 *  https://www.youtube.com/feeds/videos.xml?channel_id=... 는 공개 Atom 피드라 API 키가 필요 없습니다.
 *  Vercel 서버리스에서 그냥 요청하면 빈 응답을 주는 경우가 있어 브라우저 UA 를 함께 보냅니다.
 *
 *  RSS 는 최근 15편까지만 돌려줍니다. 영상 길이(duration)는 피드에 없어서 넣지 않습니다.
 */

const CHANNEL_ID = 'UCepHesz_5Lwr7qRaqjB-p1A';
const CHANNEL_HANDLE = '@DplusKia_LOL';
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX = 10;

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

function parseFeed(xml) {
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const videos = entries.map(function (block) {
    const id = tag(block, 'yt:videoId');
    const published = tag(block, 'published');
    const views = Number(attr(block, 'media:statistics', 'views') || 0);
    const desc = tag(block, 'media:description').split('\n')[0] || '';
    /* 피드는 i1~i4.ytimg.com 을 섞어 주므로 대표 주소로 맞춥니다. */
    const thumb = id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' :
      attr(block, 'media:thumbnail', 'url');
    return {
      id: id,
      title: tag(block, 'title'),
      published: published,
      thumb: thumb,
      views: Number.isFinite(views) ? views : 0,
      desc: desc,
      url: id ? 'https://www.youtube.com/watch?v=' + id : ''
    };
  }).filter(function (v) { return v.id && v.title; });
  return videos.slice(0, MAX);
}

async function fetchDkYoutube() {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, 8000);
  try {
    const res = await fetch(FEED, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      signal: ac.signal
    });
    if (!res.ok) throw new Error('feed HTTP ' + res.status);
    const xml = await res.text();
    const channelTitle = (xml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Dplus Kia';
    const videos = parseFeed(xml);
    if (!videos.length) throw new Error('feed에 영상이 없습니다');
    return {
      ok: true,
      source: 'youtube-rss',
      channel: {
        id: CHANNEL_ID,
        handle: CHANNEL_HANDLE,
        title: decode(channelTitle),
        url: 'https://www.youtube.com/' + CHANNEL_HANDLE
      },
      videos: videos,
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { CHANNEL_ID, CHANNEL_HANDLE, FEED, MAX, parseFeed, fetchDkYoutube };
