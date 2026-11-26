/* data.js 의 5인 솔로랭크 스냅샷을 api/_lib/snapshot.js 로 뽑아냅니다.
 * Riot API 키가 없을 때 /api/solo 가 그대로 돌려주는 값입니다.
 *
 *   node tools/make_snapshot.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const sandbox = {};
const data = vm.runInNewContext(src + '\n;({ PLAYERS: PLAYERS, LAST_CHECKED: typeof LAST_CHECKED !== "undefined" ? LAST_CHECKED : "" })', sandbox, { timeout: 2000 });

const players = data.PLAYERS.map(function (p) {
  return {
    key: p.key,
    nameKo: p.nameKo,
    riotId: p.riotId,
    tier: p.tier,
    lp: p.lp,
    record: p.record,
    opgg: p.opgg,
    matches: p.matches.slice(0, 10).map(function (m) {
      return {
        d: m.d, t: m.t, champ: m.champ, role: m.role, win: m.win,
        kda: m.kda, dur: m.dur, perfect: !!m.perfect
      };
    })
  };
});

const out = '/* 자동 생성 파일 — tools/make_snapshot.js 가 data.js 에서 만듭니다. 직접 고치지 마세요. */\n' +
  'const SNAPSHOT = ' + JSON.stringify({ generatedAt: data.LAST_CHECKED, players: players }, null, 1) + ';\n\n' +
  'module.exports = SNAPSHOT;\n';

const target = path.join(root, 'api', '_lib', 'snapshot.js');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
console.log('wrote ' + path.relative(root, target) + ' · players ' + players.length + ' · snapshot ' + data.LAST_CHECKED);
