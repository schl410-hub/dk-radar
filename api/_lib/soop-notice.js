/* 선수 SOOP 방송국 공지 (공개 API)
 *
 *   GET https://chapi.sooplive.co.kr/api/{id}/home
 *     → boards 배열에 공지사항·최근 게시글이 함께 옵니다.
 *       공지사항 판별: board_type === 104 이거나 is_notice === true
 *       (방송국마다 공지 bbs_no 가 달라서 bbs_no 고정값 대신 이 두 신호를 씁니다)
 *
 * SOOP 은 브라우저가 아닌 User-Agent 를 404 로 막기 때문에 라이브 방송 상태(live.js)와
 * 같은 브라우저 헤더로 요청합니다. 검증(api_smoke.js)은 DK_SOOP_BASE 로 가짜 서버를 가리킵니다.
 */

const { fetchJson } = require('./http');

const SOOP_BASE = process.env.DK_SOOP_BASE || 'https://chapi.sooplive.co.kr/api/';
const TIMEOUT = 5000;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* SOOP reg_date 는 'YYYY-MM-DD HH:mm:ss' (KST) — 날짜만 씁니다. */
function kstDateOnly(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
}

function isNoticePost(post) {
  if (!post) return false;
  if (Number(post.board_type) === 104) return true;
  return post.is_notice === true;
}

function postUrl(userId, titleNo) {
  return 'https://ch.sooplive.co.kr/' + encodeURIComponent(userId) + '/post/' + titleNo;
}

/* boards 에서 공지 중 가장 큰 title_no 를 고릅니다 (SOOP 은 글마다 번호가 커집니다). */
function latestNotice(data, userId) {
  const boards = data && Array.isArray(data.boards) ? data.boards : [];
  let best = null;
  boards.forEach(function (post) {
    if (!isNoticePost(post)) return;
    const no = Number(post.title_no);
    if (!no) return;
    if (best && no <= Number(best.titleNo)) return;
    best = {
      titleNo: no,
      titleName: String(post.title_name || '').slice(0, 120),
      posted: kstDateOnly(post.reg_date),
      bbsNo: post.bbs_no == null ? null : Number(post.bbs_no),
      boardType: post.board_type == null ? null : Number(post.board_type),
      url: postUrl(userId, no)
    };
  });
  return best;
}

async function stationNotice(userId) {
  if (!userId) return null;
  const data = await fetchJson(SOOP_BASE + encodeURIComponent(userId) + '/home', {
    timeout: TIMEOUT,
    label: 'soop home',
    headers: { 'User-Agent': BROWSER_UA, Referer: 'https://www.sooplive.co.kr/', Origin: 'https://www.sooplive.co.kr' }
  });
  return latestNotice(data, userId);
}

module.exports = { stationNotice, latestNotice, isNoticePost, kstDateOnly };
