/* Riot API 는 챔피언·소환사 주문을 숫자 id 로 줍니다.
 * 화면에 이름을 띄우려면 id → 영어 이름 표가 필요한데, 이 표를 Data Dragon 에서 다시 만듭니다.
 *
 *   node tools/make_riot_names.js            # 최신 버전
 *   node tools/make_riot_names.js 16.23.1    # 버전 고정
 *
 * 결과: api/_lib/champions.js  (CHAMPION_BY_ID · SPELL_BY_ID)
 * 영어 이름을 data.js 의 CHAMPIONS(4개 국어) / SPELLS 표로 바꿔 화면에 표시합니다.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', '_lib', 'champions.js');
const BASE = 'https://ddragon.leagueoflegends.com';

function get(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, { headers: { 'User-Agent': 'dk-signal/3.4' } }, function (res) {
      let text = '';
      res.on('data', function (c) { text += c; });
      res.on('end', function () {
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
        try { resolve(JSON.parse(text)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function jsTable(name, map, note) {
  const keys = Object.keys(map).sort(function (a, b) { return Number(a) - Number(b); });
  const rows = keys.map(function (k) { return '  ' + k + ": '" + String(map[k]).replace(/'/g, "\\'") + "'"; });
  return '/* ' + note + ' */\nconst ' + name + ' = {\n' + rows.join(',\n') + '\n};\n';
}

(async function main() {
  const version = process.argv[2] || (await get(BASE + '/api/versions.json'))[0];
  const champs = (await get(BASE + '/cdn/' + version + '/data/en_US/champion.json')).data;
  const spells = (await get(BASE + '/cdn/' + version + '/data/en_US/summoner.json')).data;

  const champById = {};
  Object.keys(champs).forEach(function (id) { champById[champs[id].key] = id; });

  const spellById = {};
  Object.keys(spells).forEach(function (id) { spellById[spells[id].key] = spells[id].name; });

  const out =
    '/* 챔피언·소환사 주문 id 표 (Riot Data Dragon ' + version + ' en_US) — tools/make_riot_names.js 로 생성\n' +
    ' * Spectator-V5 · Match-V5 는 championId / spell1Id / spell2Id 숫자만 주기 때문에\n' +
    ' * 서버에서 이 표로 영어 이름을 붙이고, 화면(app.js)이 data.js 의 CHAMPIONS·SPELLS 로 다시 번역합니다.\n' +
    ' * 이 파일은 손으로 고치지 말고 tools/make_riot_names.js 를 다시 돌려 주세요. */\n\n' +
    jsTable('CHAMPION_BY_ID', champById, '숫자 id → 영어 챔피언 이름') + '\n' +
    jsTable('SPELL_BY_ID', spellById, '숫자 id → 영어 소환사 주문 이름') + '\n' +
    'function championName(id) { return CHAMPION_BY_ID[id] || ""; }\n' +
    'function spellName(id) { return SPELL_BY_ID[id] || ""; }\n\n' +
    'module.exports = { CHAMPION_BY_ID, SPELL_BY_ID, championName, spellName, VERSION: \'' + version + '\' };\n';

  fs.writeFileSync(OUT, out);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' · champion ' + Object.keys(champById).length +
    ' · spell ' + Object.keys(spellById).length + ' · ddragon ' + version);
})().catch(function (e) { console.error(e.message); process.exit(1); });
