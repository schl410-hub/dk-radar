/* 선수 라이브 방송 상태 (SOOP · CHZZK 공개 API)
 *
 *   SOOP   GET https://chapi.sooplive.co.kr/api/{id}/station   → broad 객체가 있으면 방송 중
 *   CHZZK  GET https://api.chzzk.naver.com/polling/v2/channels/{id}/live-status → content.status === 'OPEN'
 *
 * 두 API 모두 인증이 필요 없고, 방송 중이 아니면 SOOP 은 broad=null, CHZZK 는 content=null 을 줍니다.
 * 한 선수가 두 플랫폼에 방송국을 두고 있으면 SOOP 을 먼저 확인합니다(DK 는 SOOP 파트너).
 * 네트워크·API 오류는 '방송 중 아님'으로 처리하고 다음 플랫폼을 확인합니다.
 *
 * 검증(api_smoke.js)에서는 DK_SOOP_BASE · DK_CHZZK_BASE 로 가짜 서버를 가리킬 수 있습니다.
 */

const { PLAYERS } = require('./players');
const { fetchJson } = require('./http');

const SOOP_BASE = process.env.DK_SOOP_BASE || 'https://chapi.sooplive.co.kr/api/';
const CHZZK_BASE = process.env.DK_CHZZK_BASE || 'https://api.chzzk.naver.com/polling/v2/channels/';
const TIMEOUT = 3500;
/* SOOP 은 브라우저가 아닌 User-Agent 를 404 로 막습니다. 방송국 API 는 브라우저와 같은 헤더로 요청합니다. */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* 방송 썸네일 URL 정리: SOOP 은 '//host/...' 처럼 프로토콜이 빠진 값을 주기도 합니다. */
function thumbUrl(value) {
  var s = value == null ? '' : String(value).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.indexOf('//') === 0) return 'https:' + s;
  if (s.charAt(0) === '/') return 'https://ch.sooplive.co.kr' + s;
  return s;
}

/* 방송 카테고리: API 가 숫자 코드만 주면 표시하지 않습니다(이름이 확인된 값만). */
function categoryName(value) {
  if (value == null) return null;
  var s = String(value).trim();
  if (!s || /^\d+$/.test(s)) return null;
  return s.slice(0, 40);
}

/* SOOP 은 'YYYY-MM-DD HH:mm:ss' (KST) 문자열을 줍니다. */
function kstIso(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(value));
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5], +m[6]);
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function soopStream(userId) {
  const data = await fetchJson(SOOP_BASE + encodeURIComponent(userId) + '/station', {
    timeout: TIMEOUT,
    label: 'soop station',
    headers: { 'User-Agent': BROWSER_UA, Referer: 'https://www.sooplive.co.kr/', Origin: 'https://www.sooplive.co.kr' }
  });
  const broad = data && data.broad;
  if (!broad) return { live: false };
  const station = (data && data.station) || {};
  return {
    live: true,
    platform: 'soop',
    station: userId,
    title: broad.broad_title || station.station_title || '',
    viewers: Number(broad.current_sum_viewer || 0) || null,
    startedAt: kstIso(broad.broad_start),
    thumb: thumbUrl(broad.broad_thumb || broad.broadThumb || broad.broad_thumbnail),
    category: categoryName(broad.broad_cate || broad.broad_cate_name || broad.category),
    url: 'https://ch.sooplive.co.kr/' + encodeURIComponent(userId)
  };
}

async function chzzkStream(channelId) {
  const data = await fetchJson(CHZZK_BASE + encodeURIComponent(channelId) + '/live-status', {
    timeout: TIMEOUT,
    label: 'chzzk live-status',
    headers: { 'User-Agent': BROWSER_UA, Referer: 'https://chzzk.naver.com/' }
  });
  const c = data && data.content;
  if (!c) return { live: false };
  if (c.status && String(c.status).toUpperCase() !== 'OPEN') return { live: false };
  return {
    live: true,
    platform: 'chzzk',
    station: channelId,
    title: c.liveTitle || '',
    viewers: Number(c.concurrentUserCount || 0) || null,
    startedAt: c.openDate ? new Date(c.openDate).toISOString() : null,
    thumb: chzzkThumb(c.liveImageUrl),
    category: categoryName(c.liveCategoryValue),
    url: 'https://chzzk.naver.com/' + encodeURIComponent(channelId)
  };
}

/* CHZZK 은 liveImageUrl 에 '{type}_{time}.jpg' 자리표시자를 줍니다. 실제 이미지 주소로 바꿉니다. */
function chzzkThumb(template) {
  var s = thumbUrl(template);
  if (!s) return null;
  return s.replace(/\{type\}/g, '480').replace(/\{time\}/g, String(Date.now()));
}

/* 한 선수: 확인된 방송국을 순서대로 확인하고, 방송 중인 곳을 찾으면 바로 돌려줍니다. */
async function checkPlayer(player) {
  const st = player.stations || {};
  const order = [];
  if (st.soop) order.push(['soop', st.soop]);
  if (st.chzzk) order.push(['chzzk', st.chzzk]);
  const probed = [];
  const out = { key: player.key, nameKo: player.nameKo, live: false, stations: Object.keys(st), probed: probed };
  for (let i = 0; i < order.length; i++) {
    try {
      const r = order[i][0] === 'soop' ? await soopStream(order[i][1]) : await chzzkStream(order[i][1]);
      probed.push({ platform: order[i][0], ok: true, live: !!r.live });
      if (r.live) {
        /* 확인된 값만 내려보냅니다(썸네일·카테고리가 없으면 키 자체를 생략). */
        if (!r.thumb) delete r.thumb;
        if (!r.category) delete r.category;
        return Object.assign(out, r);
      }
    } catch (e) {
      /* 이 플랫폼은 실패 — 다음 방송국 확인 (차단·점검 여부를 알 수 있게 기록) */
      probed.push({ platform: order[i][0], ok: false, error: String(e && e.status ? 'HTTP ' + e.status : (e && e.message) || e).slice(0, 80) });
    }
  }
  return out;
}

async function getLive(players) {
  const list = Array.isArray(players) && players.length ? players : PLAYERS;
  const rows = await Promise.all(list.map(function (p) {
    return checkPlayer(p).catch(function (e) {
      return { key: p.key, nameKo: p.nameKo, live: false, error: String(e && e.message ? e.message : e) };
    });
  }));
  const byKey = {};
  let liveCount = 0;
  let reachable = 0;
  let probedTotal = 0;
  rows.forEach(function (r) {
    byKey[r.key] = r;
    if (r.live) liveCount++;
    (r.probed || []).forEach(function (p) { probedTotal++; if (p.ok) reachable++; });
  });
  return { ok: true, at: new Date().toISOString(), liveCount: liveCount, probed: { total: probedTotal, reachable: reachable }, players: byKey };
}

module.exports = { getLive, checkPlayer, soopStream, chzzkStream, kstIso };
