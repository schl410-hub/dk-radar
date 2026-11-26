/* 딮기 시그널 · 5인 계정 정의 (서버 함수 공용)
 * 클라이언트의 data.js 와 같은 순서·키를 씁니다. 계정이 바뀌면 여기와 data.js 를 함께 고쳐 주세요.
 */
const PLAYERS = [
  { key: 'doran', nameKo: '도란', pos: 'TOP', posKo: '탑', riotId: '어리고싶다#KR1' },
  { key: 'kanavi', nameKo: '카나비', pos: 'JUNGLE', posKo: '정글', riotId: 'vinaka#KR1' },
  { key: 'showmaker', nameKo: '쇼메이커', pos: 'MIDDLE', posKo: '미드', riotId: 'DK ShowMaker#KR1' },
  { key: 'smash', nameKo: '스매쉬', pos: 'BOTTOM', posKo: '원딜', riotId: 'DK Smash#KR7' },
  { key: 'delight', nameKo: '딜라이트', pos: 'SUPPORT', posKo: '서폿', riotId: '죽각딜#KR02' }
];

const POS_KO = {
  TOP: '탑', JUNGLE: '정글', MIDDLE: '미드', BOTTOM: '원딜', UTILITY: '서폿',
  MID: '미드', ADC: '원딜', SUPPORT: '서폿'
};

const TIER_KO = {
  IRON: '아이언', BRONZE: '브론즈', SILVER: '실버', GOLD: '골드', PLATINUM: '플래티넘',
  EMERALD: '에메랄드', DIAMOND: '다이아몬드', MASTER: '마스터', GRANDMASTER: '그랜드마스터', CHALLENGER: '챌린저'
};

function splitRiotId(riotId) {
  const i = riotId.lastIndexOf('#');
  return { gameName: riotId.slice(0, i), tagLine: riotId.slice(i + 1) };
}

function byKey(key) {
  for (let i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return PLAYERS[i];
  return null;
}

module.exports = { PLAYERS, POS_KO, TIER_KO, splitRiotId, byKey };
