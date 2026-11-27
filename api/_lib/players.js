/* 딮기 시그널 · 5인 계정 정의 (서버 함수 공용)
 * 클라이언트의 data.js 와 같은 순서·키를 씁니다. 계정이 바뀌면 여기와 data.js 를 함께 고쳐 주세요.
 *
 * stations: 라이브 방송 상태를 확인할 방송국 ID (2026-11-27 SOOP·CHZZK 공개 API 로 확인)
 *   - soop   : chapi.sooplive.co.kr/api/{id}/station 의 station.user_id
 *   - chzzk  : api.chzzk.naver.com/polling/v2/channels/{id}/live-status 의 채널 ID
 *   DK 는 SOOP 과 파트너십(2026~2028)을 맺고 있어 SOOP 방송국이 확인된 선수는 SOOP 를 먼저 봅니다.
 *   확인되지 않은 방송국은 넣지 않았습니다(카나비·딜라이트 SOOP 방송국은 아직 확인되지 않음).
 */
const PLAYERS = [
  {
    key: 'doran', nameKo: '도란', pos: 'TOP', posKo: '탑', riotId: '어리고싶다#KR1',
    stations: { soop: 'choi15778', chzzk: '20e11539e1afa21fc959dd3f4ff2332c' }
  },
  {
    key: 'kanavi', nameKo: '카나비', pos: 'JUNGLE', posKo: '정글', riotId: 'vinaka#KR1',
    stations: { chzzk: 'e351edbd85f1ebf4eb975c21179a4c43' }
  },
  {
    key: 'showmaker', nameKo: '쇼메이커', pos: 'MIDDLE', posKo: '미드', riotId: 'DK ShowMaker#KR1',
    stations: { soop: 'showmakerr', chzzk: '07a040b24eb497dc36c31d82bc06ccc2' }
  },
  {
    key: 'smash', nameKo: '스매쉬', pos: 'BOTTOM', posKo: '원딜', riotId: 'DK Smash#KR7',
    stations: { soop: 'tlsrmawo', chzzk: '44aa27b0df5175323fac934acdff1ed5' }
  },
  {
    key: 'delight', nameKo: '딜라이트', pos: 'SUPPORT', posKo: '서폿', riotId: '죽각딜#KR02',
    stations: { chzzk: '59dd654778e3d0b64f3ed06baece805d' }
  }
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
