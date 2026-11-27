/* 디플러스 기아 공식 유튜브 최신 영상 스냅샷 생성
 *
 *   node tools/make_dk_youtube_snapshot.js
 *
 * 채널 RSS 를 한 번 받아 api/_lib/dk-youtube-snapshot.js 로 저장합니다.
 * (/api/dk-youtube 가 RSS 를 못 받았을 때 이 값을 폴백으로 씁니다)
 */
const fs = require('fs');
const path = require('path');
const lib = require('../api/_lib/dk-youtube');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'api/_lib/dk-youtube-snapshot.js');

(async function main() {
  const data = await lib.fetchDkYoutube();
  const rows = data.videos.map(function (v) {
    return {
      id: v.id,
      title: v.title,
      published: v.published,
      thumb: v.thumb,
      views: v.views,
      url: v.url
    };
  });
  const body = '/* 자동 생성 파일 — tools/make_dk_youtube_snapshot.js 가 채널 RSS 에서 만듭니다. 직접 고치지 마세요.\n' +
    ' * 생성 시각: ' + new Date().toISOString() + '\n' +
    ' * RSS 를 못 받았을 때 /api/dk-youtube 가 그대로 돌려주는 마지막 확인본입니다.\n' +
    ' */\n' +
    'const CHANNEL = ' + JSON.stringify(data.channel, null, 1) + ';\n\n' +
    'const VIDEOS = ' + JSON.stringify(rows, null, 1) + ';\n\n' +
    'module.exports = { CHANNEL: CHANNEL, VIDEOS: VIDEOS };\n';
  fs.writeFileSync(out, body, 'utf8');
  console.log('saved ' + rows.length + ' videos -> ' + path.relative(root, out));
})().catch(function (e) {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exit(1);
});
