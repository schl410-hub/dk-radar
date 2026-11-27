/* 타 팀 프로 선수 계정 표 — '같은 판에 잡힌 프로' 를 오탐 없이 찾기 위한 기준값
 *
 * 원칙
 *  - Riot ID(gameName#tagLine)를 정확히 적어 둔 계정만 씁니다. 닉네임 일부 일치 같은 추측 매칭은 하지 않습니다.
 *  - 매칭은 두 가지 방식 모두 '정확 일치' 입니다.
 *      1) 끝난 경기: 참가자의 riotIdGameName#riotIdTagline 를 이 표와 그대로 비교 (API 호출 없음)
 *      2) 인게임: 이 표의 계정으로 PUUID 를 미리 받아 두고 참가자 PUUID 와 비교
 *  - PUUID 는 Riot 키마다 다르게 암호화되므로 캐시 키에 키 지문(KEY_FP)을 넣습니다. 키를 바꾸면 자동으로 다시 받습니다.
 *  - 계정을 못 찾으면(닉네임 변경·404) 그 선수만 조용히 빠집니다. 잘못 표시되는 일은 없습니다.
 *  - 호출량을 아끼려고 한 요청에서 최대 PRO_BUDGET 개만 새로 조회하고, 나머지는 다음 요청에서 이어서 채웁니다.
 *
 * 출처: 2026-11-27 JJANG.GG 프로게이머 솔랭 목록(현역 57명 · 팀·포지션·Riot ID)과
 *       각 선수 공개 프로필(위키백과·Sheep Esports)에 같은 아이디가 적힌 것을 함께 확인했습니다.
 *       명단은 api/_lib/pros.js 한 곳만 고치면 앱·검증·문서에 모두 반영됩니다.
 */
const { PLAYERS } = require('./players');

const PRO_BUDGET = 4;      /* 한 요청에서 새로 조회할 계정 수 */
const INDEX_TTL = 2592000; /* 30일 */
const MISS_TTL = 86400;    /* 못 찾은 계정은 24시간 동안 다시 조회하지 않음 */

const PROS = [
  { slug: 'faker',     nameKo: '페이커',   name: 'Faker',     team: 'T1',    role: 'MIDDLE',    riotId: 'Hide on bush#KR1' },
  { slug: 'oner',      nameKo: '오너',     name: 'Oner',      team: 'T1',    role: 'JUNGLE',    riotId: '오 너#111' },
  { slug: 'keria',     nameKo: '케리아',   name: 'Keria',     team: 'T1',    role: 'UTILITY',   riotId: 'keria#zxcv' },
  { slug: 'peyz',      nameKo: '페이즈',   name: 'Peyz',      team: 'T1',    role: 'BOTTOM',    riotId: 'Peyz#KR11' },
  { slug: 'chovy',     nameKo: '쵸비',     name: 'Chovy',     team: 'GEN',   role: 'MIDDLE',    riotId: '허거덩#0303' },
  { slug: 'kiin',      nameKo: '기인',     name: 'Kiin',      team: 'GEN',   role: 'TOP',       riotId: 'kiin#KR1' },
  { slug: 'canyon',    nameKo: '캐니언',   name: 'Canyon',    team: 'GEN',   role: 'JUNGLE',    riotId: 'JUGKlNG#kr' },
  { slug: 'ruler',     nameKo: '룰러',     name: 'Ruler',     team: 'GEN',   role: 'BOTTOM',    riotId: '강 철#샤 넬' },
  { slug: 'duro',      nameKo: '듀로',     name: 'Duro',      team: 'GEN',   role: 'UTILITY',   riotId: 'Duro#Gen' },
  { slug: 'gumayusi',  nameKo: '구마유시', name: 'Gumayusi',  team: 'HLE',   role: 'BOTTOM',    riotId: 'HLE Gumayusi#0298' },
  { slug: 'zeus',      nameKo: '제우스',   name: 'Zeus',      team: 'HLE',   role: 'TOP',       riotId: 'Athene#lll' },
  { slug: 'zeka',      nameKo: '제카',     name: 'Zeka',      team: 'HLE',   role: 'MIDDLE',    riotId: 'suis#kr7' },
  { slug: 'life',      nameKo: '라이프',   name: 'Life',      team: 'HLE',   role: 'UTILITY',   riotId: '홍부장#표지섭' },
  { slug: 'bdd',       nameKo: '비디디',   name: 'Bdd',       team: 'KT',    role: 'MIDDLE',    riotId: '메탈가루몬#0509' },
  { slug: 'perfect',   nameKo: '퍼펙트',   name: 'PerfecT',   team: 'KT',    role: 'TOP',       riotId: 'PerfecT#132' },
  { slug: 'cuzz',      nameKo: '커즈',     name: 'Cuzz',      team: 'DNS',   role: 'JUNGLE',    riotId: 'Cuzz#KR1' },
  { slug: 'pyosik',    nameKo: '표식',     name: 'Pyosik',    team: 'DNS',   role: 'JUNGLE',    riotId: 'DNS Pyosik#KR2' },
  { slug: 'kingen',    nameKo: '킹겐',     name: 'Kingen',    team: 'NS',    role: 'TOP',       riotId: 'Kingen#KR1' },
  { slug: 'lehends',   nameKo: '리헨즈',   name: 'Lehends',   team: 'NS',    role: 'UTILITY',   riotId: 'Lehends#KR1' },
  { slug: 'teddy',     nameKo: '테디',     name: 'Teddy',     team: 'BRO',   role: 'BOTTOM',    riotId: 'Teddy#sss' },
  { slug: 'casting',   nameKo: '캐스팅',   name: 'Casting',   team: 'BRO',   role: 'TOP',       riotId: 'Casting#KR11' }
];

function normId(riotId) {
  return String(riotId || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/* Riot ID 정확 일치 표 — 끝난 경기 참가자 비교에 씁니다. */
const PRO_BY_RIOTID = (function () {
  const map = {};
  PROS.forEach(function (p) { map[normId(p.riotId)] = p; });
  return map;
})();

function proForRiotId(gameName, tagLine) {
  if (!gameName || !tagLine) return null;
  return PRO_BY_RIOTID[normId(gameName + '#' + tagLine)] || null;
}

/* DK 5인 PUUID 표 (이미 /api/solo 가 받아 둔 값) — 인게임 참가자와 비교용 */
function dkPuuidMap(players) {
  const map = {};
  (players || []).forEach(function (p) {
    if (p && p.key && p.puuid) map[p.puuid] = p;
  });
  return map;
}

const KEY_FP = require('crypto').createHash('sha256')
  .update(process.env.RIOT_API_KEY || 'none').digest('hex').slice(0, 10);

function indexKey() { return 'dk:pros:puuid:' + KEY_FP; }

/* PUUID 표를 읽고, 비어 있는 계정을 조금씩 채웁니다.
 *   { byPuuid: {puuid: pro}, byRiotId: {normId: puuid}, resolved, total, missing }
 * store·riot 가 없거나 실패해도 던지지 않습니다 — 매칭만 비게 됩니다. */
async function loadProIndex(store, riot, budget) {
  const out = { byPuuid: {}, byRiotId: {}, resolved: 0, total: PROS.length, missing: [] };
  let saved = null;
  try { saved = await store.getJSON(indexKey()); } catch (e) { saved = null; }
  const map = (saved && saved.byRiotId && typeof saved.byRiotId === 'object') ? saved.byRiotId : {};
  const miss = (saved && saved.miss && typeof saved.miss === 'object') ? saved.miss : {};
  const now = Date.now();

  if (!riot || !riot.hasKey || !riot.hasKey()) {
    build(out, map);
    return out;
  }

  const allow = typeof budget === 'number' ? budget : PRO_BUDGET;
  let tries = 0;
  for (let i = 0; i < PROS.length; i++) {
    const p = PROS[i];
    const key = normId(p.riotId);
    if (map[key]) continue;
    if (miss[key] && now - Date.parse(miss[key]) < MISS_TTL * 1000) continue; /* 최근에 못 찾은 계정 */
    if (tries >= allow) break;
    tries++;
    try {
      const puuid = await riot.accountPuuid(p.riotId);
      if (puuid) map[key] = puuid;
    } catch (e) {
      /* 닉네임 변경·404 — 24시간 뒤에 다시 시도합니다. 한도 초과면 이번 요청은 멉춥니다. */
      if (e && e.status === 429) break;
      miss[key] = new Date().toISOString();
    }
  }
  if (tries) {
    try { await store.setJSON(indexKey(), { byRiotId: map, miss: miss, savedAt: new Date().toISOString() }, INDEX_TTL); } catch (e) {}
  }
  build(out, map);
  return out;
}

function build(out, map) {
  PROS.forEach(function (p) {
    const puuid = map[normId(p.riotId)];
    if (!puuid) { out.missing.push(p.slug); return; }
    out.byRiotId[normId(p.riotId)] = puuid;
    out.byPuuid[puuid] = p;
    out.resolved++;
  });
}

function proForPuuid(index, puuid) {
  if (!index || !index.byPuuid || !puuid) return null;
  return index.byPuuid[puuid] || null;
}

module.exports = {
  PROS, PRO_BUDGET, proForRiotId, proForPuuid, dkPuuidMap, loadProIndex,
  dkKeys: function () { return PLAYERS.map(function (p) { return p.key; }); }
};
