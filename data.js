/* 딮기 시그널 · 데이터
 * 5인(도란·카나비·쇼메이커·스매쉬·딜라이트) 솔로랭크/대회 기록: KO.LOL · OP.GG · u.gg 공개 전적을
 * 2026-11-26에 확인해 옮겼습니다. 자동 갱신이 아니라서 새 경기는 서버 폴링(/api/solo)에서 붙입니다.
 *
 * 방송국·하이라이트 링크는 2026-11-27에 직접 확인한 값입니다.
 *  - 방송국: CHZZK 채널 API / SOOP 스테이션 API 로 실제 존재·이름을 확인
 *  - 하이라이트: LCK 공식 유튜브에서 검색해 oEmbed 로 재생 가능 여부를 확인
 * 이름·포지션처럼 언어별로 달라지는 값은 { ko, en, ja } 묶음으로 둡니다.
 */
const LAST_CHECKED = '2026-11-26T17:07:00+09:00';

/* 공식 채널 (2026-11-27 확인) */
const CHANNELS = {
  lckChzzk: 'https://chzzk.naver.com/9381e7d6816e6d915a44a13c0195b202',
  lckSoop: 'https://ch.sooplive.co.kr/aflol',
  lckYoutube: 'https://www.youtube.com/@LCK',
  dkYoutube: 'https://www.youtube.com/@DplusKia_LOL',
  lolesportsSchedule: {
    ko: 'https://lolesports.com/ko-KR/schedule',
    en: 'https://lolesports.com/en-US/schedule',
    ja: 'https://lolesports.com/ja-JP/schedule'
  }
};

const PLAYERS = [
  {
    key: 'doran',
    nameKo: '도란',
    nameEn: 'DORAN',
    nameIntl: 'Doran',
    nameJa: 'ドラン',
    real: '최현준',
    realEn: 'Choi Hyeon-jun',
    realJa: 'チェ・ヒョンジュン',
    pos: 'TOP',
    posKo: '탑',
    riotId: '어리고싶다#KR1',
    tier: '다이아몬드 1',
    tierKey: 'DIAMOND',
    tierRank: 'I',
    lp: '65 LP',
    lpValue: 65,
    wins: 766,
    losses: 710,
    record: '766승 710패 · 승률 52%',
    best: '최고 챌린저 1,891 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/%EC%96%B4%EB%A6%AC%EA%B3%A0%EC%8B%B6%EB%8B%A4-KR1',
    profile: 'https://ko.lol/ko/pros/doran/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: 'DK 영입 발표', url: 'https://www.xportsnews.com/article/2222289' },
    streams: [
      { platform: 'soop', url: 'https://ch.sooplive.co.kr/choi15778', handle: '도란도라아안' },
      { platform: 'chzzk', url: 'https://chzzk.naver.com/20e11539e1afa21fc959dd3f4ff2332c', handle: '도란도란란' }
    ],
    highlights: [
      { id: 'uzkulCX1cvw', len: '12:13', channel: 'LCK', match: { ko: 'T1 vs BFX · 4세트', en: 'T1 vs BFX · Game 4', ja: 'T1 vs BFX 第4試合' }, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ' } },
      { id: 'zmt-dT7garg', len: '13:10', channel: 'LCK', match: { ko: 'T1 vs DK · 2세트', en: 'T1 vs DK · Game 2', ja: 'T1 vs DK 第2試合' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK' } }
    ],
    note: { ko: '', en: '', ja: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 4강', en: 'Worlds 2026 · Semifinals', ja: 'Worlds 2026 · ベスト4' },
      team: 'T1', opp: 'BLG', score: '1 : 3', win: false, date: { ko: '11. 09.', en: 'Nov 9', ja: '11月9日' }
    },
    matches: [
      { d: '11. 25.', t: '21:04', champ: '레넥톤', role: '탑', win: false, kda: '5/9/0', dur: '21:12' },
      { d: '10. 18.', t: '20:39', champ: '암베사', role: '탑', win: true, kda: '9/0/0', dur: '15:20', perfect: true },
      { d: '10. 18.', t: '20:13', champ: '바루스', role: '탑', win: true, kda: '4/3/2', dur: '18:47' },
      { d: '10. 18.', t: '19:41', champ: '카밀', role: '탑', win: true, kda: '10/1/9', dur: '24:42' },
      { d: '10. 18.', t: '19:12', champ: '자헨', role: '탑', win: true, kda: '5/2/7', dur: '21:35' },
      { d: '10. 17.', t: '23:47', champ: '올라프', role: '탑', win: true, kda: '8/1/7', dur: '24:08' },
      { d: '10. 17.', t: '23:11', champ: '럼블', role: '탑', win: false, kda: '4/4/4', dur: '20:31' },
      { d: '10. 17.', t: '22:33', champ: '카밀', role: '탑', win: true, kda: '11/2/3', dur: '24:19' },
      { d: '10. 17.', t: '21:48', champ: '바루스', role: '탑', win: false, kda: '13/11/10', dur: '39:02' },
      { d: '10. 17.', t: '20:12', champ: '올라프', role: '탑', win: true, kda: '4/4/6', dur: '28:44' },
      { d: '10. 16.', t: '23:29', champ: '바루스', role: '탑', win: false, kda: '5/9/2', dur: '21:07' }
    ],
    records: [
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026' }, result: 'SEMI', set: { w: 8, l: 5 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026' }, result: '', set: { w: 15, l: 6 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ' }, result: '', set: { w: 9, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2' }, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026' }, result: '', set: { w: 14, l: 9 } },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026' }, result: '', set: { w: 7, l: 5 } }
    ],
    worlds: { stageKey: 'SEMI', line: { ko: 'BLG에 1:3 패배', en: 'Lost 1–3 to BLG', ja: 'BLGに1-3で敗退' }, date: { ko: '2026. 11. 09', en: 'Nov 9, 2026', ja: '2026年11月9日' } }
  },
  {
    key: 'kanavi',
    nameKo: '카나비',
    nameEn: 'KANAVI',
    nameIntl: 'Kanavi',
    nameJa: 'カナビ',
    real: '서진혁',
    realEn: 'Seo Jin-hyeok',
    realJa: 'ソ・ジニョク',
    pos: 'JGL',
    posKo: '정글',
    riotId: 'vinaka#KR1',
    tier: '다이아몬드 2',
    tierKey: 'DIAMOND',
    tierRank: 'II',
    lp: '75 LP',
    lpValue: 75,
    wins: 349,
    losses: 273,
    record: '349승 273패 · 승률 56%',
    best: '최고 챌린저 2,163 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/vinaka-KR1',
    profile: 'https://ko.lol/ko/pros/kanavi/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/kanavi/' },
    streams: [
      { platform: 'chzzk', url: 'https://chzzk.naver.com/e351edbd85f1ebf4eb975c21179a4c43', handle: 'HLE Kanavi' }
    ],
    highlights: [
      { id: 'Ws93_VsEx-s', len: '12:39', channel: 'LCK', match: { ko: 'HLE vs T1 · 3세트', en: 'HLE vs T1 · Game 3', ja: 'HLE vs T1 第3試合' }, event: { ko: '2026 LCK 로드 투 MSI', en: '2026 LCK Road to MSI', ja: '2026 LCK ロード・トゥMSI' } },
      { id: 'fOUtkqYy1VE', len: '10:02', channel: 'LCK', match: { ko: 'DK vs HLE · 1세트', en: 'DK vs HLE · Game 1', ja: 'DK vs HLE 第1試合' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK' } }
    ],
    note: { ko: '', en: '', ja: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド' },
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日' }
    },
    matches: [
      { d: '09. 11.', t: '22:15', champ: '쉬바나', role: '정글', win: true, kda: '7/1/1', dur: '15:08' },
      { d: '09. 11.', t: '21:44', champ: '키아나', role: '정글', win: true, kda: '11/2/5', dur: '22:31' },
      { d: '09. 11.', t: '21:02', champ: '바이', role: '정글', win: false, kda: '2/8/9', dur: '29:14' },
      { d: '09. 10.', t: '23:51', champ: '초가스', role: '정글', win: true, kda: '10/3/3', dur: '22:02' },
      { d: '09. 10.', t: '23:12', champ: '나피리', role: '정글', win: false, kda: '1/6/5', dur: '15:33' },
      { d: '09. 10.', t: '22:36', champ: '진', role: '원딜', win: false, kda: '11/12/10', dur: '34:11' },
      { d: '09. 10.', t: '21:55', champ: '키아나', role: '정글', win: true, kda: '20/10/11', dur: '36:04' },
      { d: '09. 10.', t: '21:12', champ: '신드라', role: '미드', win: true, kda: '11/10/10', dur: '33:26' },
      { d: '09. 09.', t: '23:40', champ: '키아나', role: '정글', win: false, kda: '8/10/2', dur: '28:19' },
      { d: '09. 09.', t: '23:05', champ: '쉬바나', role: '정글', win: false, kda: '5/6/7', dur: '23:41' },
      { d: '09. 09.', t: '22:18', champ: '키아나', role: '정글', win: true, kda: '17/10/10', dur: '39:07' },
      { d: '09. 09.', t: '21:30', champ: '리 신', role: '정글', win: false, kda: '5/9/13', dur: '34:22' }
    ],
    records: [
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026' }, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026' }, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ' }, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2' }, result: '', set: { w: 32, l: 11 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026' }, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026' }, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退' }, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日' } }
  },
  {
    key: 'showmaker',
    nameKo: '쇼메이커',
    nameEn: 'SHOWMAKER',
    nameIntl: 'ShowMaker',
    nameJa: 'ショウメイカー',
    real: '허수',
    realEn: 'Heo Su',
    realJa: 'ホ・ス',
    pos: 'MID',
    posKo: '미드',
    riotId: 'DK ShowMaker#KR1',
    tier: '마스터',
    tierKey: 'MASTER',
    tierRank: '',
    lp: '381 LP',
    lpValue: 381,
    wins: 375,
    losses: 308,
    record: '375승 308패 · 승률 55%',
    best: '최고 챌린저 2,737 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/DK%20ShowMaker-KR1',
    profile: 'https://ko.lol/ko/pros/showmaker/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/showmaker/' },
    streams: [
      { platform: 'chzzk', url: 'https://chzzk.naver.com/07a040b24eb497dc36c31d82bc06ccc2', handle: 'DK 쇼메쇼메' }
    ],
    highlights: [
      { id: 'FG8VNBFemDg', len: '10:29', channel: 'LCK', match: { ko: 'DK vs GEN · 3세트', en: 'DK vs GEN · Game 3', ja: 'DK vs GEN 第3試合' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK' } },
      { id: 'SqKdQydiZKs', len: '7:31', channel: 'LCK', match: { ko: 'DK vs GEN · 1세트', en: 'DK vs GEN · Game 1', ja: 'DK vs GEN 第1試合' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK' } }
    ],
    note: {
      ko: '최근 경기 중 NA 표시는 북미 계정(Sonny Hayes#722)에서 치른 게임이에요.',
      en: 'Games marked NA in the recent list were played on a North American account (Sonny Hayes#722).',
      ja: '最近の試合のNA表示は北米アカウント（Sonny Hayes#722）で行ったゲームです。'
    },
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8' },
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日' }
    },
    matches: [
      { d: '11. 04.', t: '22:31', champ: '사일러스', role: '미드', win: false, kda: '5/9/8', dur: '24:12', srv: 'NA' },
      { d: '11. 04.', t: '21:58', champ: '니달리', role: '미드', win: true, kda: '9/1/6', dur: '16:04', srv: 'NA' },
      { d: '11. 04.', t: '21:02', champ: '사일러스', role: '미드', win: false, kda: '15/3/14', dur: '38:21', srv: 'NA' },
      { d: '11. 04.', t: '20:11', champ: '요네', role: '미드', win: true, kda: '11/2/4', dur: '15:33', srv: 'NA' },
      { d: '10. 15.', t: '23:20', champ: '요릭', role: '미드', win: true, kda: '5/2/9', dur: '22:18' },
      { d: '10. 15.', t: '22:41', champ: '사일러스', role: '미드', win: false, kda: '6/4/3', dur: '21:02' },
      { d: '10. 14.', t: '23:52', champ: '밀리오', role: '서폿', win: false, kda: '2/5/25', dur: '32:40' },
      { d: '10. 14.', t: '22:38', champ: '로크', role: '미드', win: false, kda: '7/5/7', dur: '25:10' },
      { d: '10. 13.', t: '23:41', champ: '스웨인', role: '미드', win: true, kda: '10/5/11', dur: '22:35' },
      { d: '10. 13.', t: '22:57', champ: '사일러스', role: '미드', win: true, kda: '7/5/9', dur: '23:04' },
      { d: '10. 13.', t: '22:04', champ: '갈리오', role: '미드', win: true, kda: '11/0/7', dur: '19:26', perfect: true },
      { d: '10. 13.', t: '21:12', champ: '르블랑', role: '미드', win: true, kda: '11/6/12', dur: '33:10' }
    ],
    records: [
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026' }, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026' }, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ' }, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2' }, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026' }, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4' }, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退' }, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日' } }
  },
  {
    key: 'smash',
    nameKo: '스매쉬',
    nameEn: 'SMASH',
    nameIntl: 'Smash',
    nameJa: 'スマッシュ',
    real: '신금재',
    realEn: 'Shin Geum-jae',
    realJa: 'シン・クムジェ',
    pos: 'BOT',
    posKo: '원딜',
    riotId: 'DK Smash#KR7',
    tier: '마스터',
    tierKey: 'MASTER',
    tierRank: '',
    lp: '489 LP',
    lpValue: 489,
    wins: 458,
    losses: 409,
    record: '458승 409패 · 승률 53%',
    best: '최고 챌린저 2,677 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/DK%20Smash-KR7',
    profile: 'https://ko.lol/ko/pros/smash/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/smash/' },
    streams: [
      { platform: 'soop', url: 'https://ch.sooplive.co.kr/tlsrmawo', handle: 'Dplus Kia ADC 스매쉬' },
      { platform: 'chzzk', url: 'https://chzzk.naver.com/44aa27b0df5175323fac934acdff1ed5', handle: 'DK 스매쉬1' }
    ],
    highlights: [
      { id: 'uxnXy7SFMsY', len: '7:21', channel: 'LCK', match: { ko: 'T1 vs KT · 3세트', en: 'T1 vs KT · Game 3', ja: 'T1 vs KT 第3試合' }, event: { ko: '2025 LCK 컵', en: '2025 LCK Cup', ja: '2025 LCKカップ' } },
      { id: 'BxU5zVPnMiU', len: '9:33', channel: 'LCK', match: { ko: 'T1 vs GEN · 1세트', en: 'T1 vs GEN · Game 1', ja: 'T1 vs GEN 第1試合' }, event: { ko: '2025 LCK 컵 · 신인왕 등장', en: '2025 LCK Cup · rookie debut', ja: '2025 LCKカップ · 新人登場' } }
    ],
    note: { ko: '', en: '', ja: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8' },
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日' }
    },
    matches: [
      { d: '11. 24.', t: '22:41', champ: '자르반 4세', role: '정글', win: true, kda: '14/2/16', dur: '29:18' },
      { d: '11. 24.', t: '21:52', champ: '애쉬', role: '원딜', win: false, kda: '4/9/7', dur: '23:04' },
      { d: '11. 24.', t: '21:08', champ: '빅토르', role: '미드', win: true, kda: '14/6/8', dur: '40:12' },
      { d: '11. 24.', t: '20:14', champ: '카이사', role: '원딜', win: true, kda: '18/5/6', dur: '33:29' },
      { d: '11. 24.', t: '19:31', champ: '이즈리얼', role: '원딜', win: true, kda: '5/4/6', dur: '26:06' },
      { d: '11. 24.', t: '18:44', champ: '징크스', role: '원딜', win: true, kda: '4/2/6', dur: '18:22' },
      { d: '11. 21.', t: '23:12', champ: '징크스', role: '원딜', win: true, kda: '8/4/14', dur: '28:40' }
    ],
    records: [
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026' }, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026' }, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ' }, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2' }, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026' }, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4' }, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退' }, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日' } }
  },
  {
    key: 'delight',
    nameKo: '딜라이트',
    nameEn: 'DELIGHT',
    nameIntl: 'Delight',
    nameJa: 'ディライト',
    real: '유환중',
    realEn: 'Yoo Hwan-joong',
    realJa: 'ユ・ファンジュン',
    pos: 'SUP',
    posKo: '서폿',
    riotId: '죽각딜#KR02',
    tier: '마스터',
    tierKey: 'MASTER',
    tierRank: '',
    lp: '873 LP',
    lpValue: 873,
    wins: 439,
    losses: 381,
    record: '439승 381패 · 승률 54%',
    best: '최고 챌린저',
    opgg: 'https://u.gg/lol/profile/kr/%EC%A3%BD%EA%B0%81%EB%94%9C-kr02/overview',
    profile: 'https://ko.lol/ko/pros/delight/',
    statsLabel: 'u.gg ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/delight/' },
    streams: [
      { platform: 'chzzk', url: 'https://chzzk.naver.com/59dd654778e3d0b64f3ed06baece805d', handle: 'HLE Delight' }
    ],
    highlights: [
      { id: 'COviyhL_fxc', len: '8:52', channel: 'LCK', match: { ko: 'HLE vs DK · 2세트', en: 'HLE vs DK · Game 2', ja: 'HLE vs DK 第2試合' }, event: { ko: '2026 LCK · LCK 300승 기념', en: '2026 LCK · 300th LCK win', ja: '2026 LCK · LCK通算300勝' } },
      { id: 'OT-19WY8HFI', len: '12:03', channel: 'LCK', match: { ko: 'HLE vs T1 · 1세트', en: 'HLE vs T1 · Game 1', ja: 'HLE vs T1 第1試合' }, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ' } }
    ],
    note: {
      ko: '닉네임이 플레이리스트겨울#KR1 에서 죽각딜#KR02 로 바뀌어 u.gg 새 주소로 연결했어요.',
      en: 'The account name changed from 플레이리스트겨울#KR1 to 죽각딜#KR02, so the stats link opens the new u.gg profile.',
      ja: 'アカウント名が 플레이리스트겨울#KR1 から 죽각딜#KR02 に変わったため、u.ggの新しいプロフィールにリンクしています。'
    },
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド' },
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日' }
    },
    matches: [
      { d: '10. 17.', t: '22:36', champ: '룰루', role: '서폿', win: true, kda: '2/0/12', dur: '15:41' },
      { d: '10. 17.', t: '22:02', champ: '탐 켄치', role: '서폿', win: true, kda: '2/2/25', dur: '26:18' },
      { d: '10. 17.', t: '21:21', champ: '라칸', role: '서폿', win: false, kda: '2/9/14', dur: '29:03' },
      { d: '10. 17.', t: '20:44', champ: '알리스타', role: '서폿', win: true, kda: '3/3/10', dur: '15:12' },
      { d: '10. 16.', t: '23:51', champ: '카밀', role: '서폿', win: true, kda: '5/6/17', dur: '31:22' },
      { d: '10. 16.', t: '23:02', champ: '카르마', role: '서폿', win: true, kda: '4/3/15', dur: '26:07' },
      { d: '10. 16.', t: '22:18', champ: '사일러스', role: '서폿', win: false, kda: '4/7/8', dur: '20:55' },
      { d: '10. 16.', t: '21:44', champ: '카밀', role: '서폿', win: true, kda: '12/0/8', dur: '16:33', perfect: true },
      { d: '10. 16.', t: '21:12', champ: '라칸', role: '서폿', win: false, kda: '1/4/2', dur: '15:04' },
      { d: '10. 15.', t: '23:58', champ: '탐 켄치', role: '서폿', win: true, kda: '0/5/18', dur: '26:41' },
      { d: '10. 15.', t: '23:11', champ: '카밀', role: '서폿', win: true, kda: '6/2/8', dur: '15:20' },
      { d: '10. 15.', t: '22:33', champ: '탐 켄치', role: '서폿', win: true, kda: '3/5/21', dur: '24:15' },
      { d: '10. 15.', t: '21:49', champ: '사일러스', role: '서폿', win: true, kda: '4/11/25', dur: '31:09' },
      { d: '10. 15.', t: '21:02', champ: '자르반 4세', role: '서폿', win: false, kda: '1/3/6', dur: '35:27' },
      { d: '10. 14.', t: '23:26', champ: '뽀삐', role: '서폿', win: false, kda: '2/9/9', dur: '27:14' }
    ],
    records: [
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026' }, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026' }, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ' }, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2' }, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026' }, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026' }, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退' }, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日' } }
  }
];

const DK_PATH = [
  { round: { ko: '1라운드', en: 'Round 1', ja: '第1ラウンド' }, opp: 'G2', score: '1 : 0', win: true, date: { ko: '10. 24.', en: 'Oct 24', ja: '10月24日' } },
  { round: { ko: '2라운드', en: 'Round 2', ja: '第2ラウンド' }, opp: 'T1', score: '1 : 0', win: true, date: { ko: '10. 25.', en: 'Oct 25', ja: '10月25日' } },
  { round: { ko: '3라운드', en: 'Round 3', ja: '第3ラウンド' }, opp: 'MKOI', score: '2 : 0', win: true, date: { ko: '10. 26.', en: 'Oct 26', ja: '10月26日' } },
  { round: { ko: '8강', en: 'Quarterfinals', ja: 'ベスト8' }, opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日' } }
];

const ROSTER_NOTES = {
  doran: 'T1 → DK',
  kanavi: 'HLE → DK',
  showmaker: 'DK',
  smash: 'DK',
  delight: 'HLE → DK'
};

/* 2027 시즌 구조
 * LCK는 2025년부터 스프링·서머 스플릿을 폐지하고 'LCK 컵 → 단일 정규 시즌'으로 진행합니다.
 * 2027 국제 대회 개최지는 LoL e스포츠 2026-11-13 발표(First Stand: All In 중국,
 * MSI 스페인 발렌시아, 월즈 일본 나고야·한국 수원/서울) 기준이며 세부 일정은 추후 공지입니다.
 */
const SEASON_2027 = [
  {
    no: '01',
    name: { ko: 'LCK 컵', en: 'LCK Cup', ja: 'LCKカップ' },
    host: { ko: '국내', en: 'Korea', ja: '韓国' },
    note: { ko: '2027 시즌 개막 · 세부 일정 추후 공지', en: '2027 season opener · schedule to be announced', ja: '2027シーズン開幕 · 詳細日程は追って発表' }
  },
  {
    no: '02',
    name: { ko: 'First Stand: All In', en: 'First Stand: All In', ja: 'First Stand: All In' },
    host: { ko: '중국', en: 'China', ja: '中国' },
    note: { ko: '2027 한정 확대판 · 형식과 일정은 2027년 1월 발표', en: '2027-only expanded edition · format and dates announced January 2027', ja: '2027年限定の拡大版 · 形式と日程は2027年1月発表' }
  },
  {
    no: '03',
    name: { ko: 'LCK 정규 시즌', en: 'LCK regular season', ja: 'LCKレギュラーシーズン' },
    host: { ko: '국내', en: 'Korea', ja: '韓国' },
    note: { ko: '단일 정규 시즌 · 스프링·서머 스플릿 없음', en: 'One regular season · no spring/summer splits', ja: '単一レギュラーシーズン · スプリング／サマーなし' }
  },
  {
    no: '04',
    name: { ko: 'MSI 2027', en: 'MSI 2027', ja: 'MSI 2027' },
    host: { ko: '발렌시아', en: 'Valencia', ja: 'バレンシア' },
    note: { ko: '미드 시즌 인비테이셔널 · 스페인 발렌시아', en: 'Mid-Season Invitational · Valencia, Spain', ja: 'ミッドシーズン・インビテーショナル · スペイン・バレンシア' }
  },
  {
    no: '05',
    name: { ko: '월즈 2027', en: 'Worlds 2027', ja: 'Worlds 2027' },
    host: { ko: '일본 · 한국', en: 'Japan · Korea', ja: '日本・韓国' },
    note: { ko: '스위스 나고야 · 8강/4강 수원 · 결승 서울', en: 'Swiss in Nagoya · quarters/semis in Suwon · final in Seoul', ja: 'スイスは名古屋 · 準々決勝／準決勝は水原 · 決勝はソウル' }
  }
];

/* 챔피언 이름 (Riot Data Dragon 16.23.1 ko_KR · en_US · ja_JP)
 * data.js 는 한국어 이름을 쓰고, Riot API 는 영어 이름을 주기 때문에 세 언어를 한 표에 둡니다.
 * tools/make_champions.py 로 다시 만들 수 있습니다. */
const CHAMPIONS = {
  'Aatrox': ['아트록스', 'Aatrox', 'エイトロックス'],
  'Ahri': ['아리', 'Ahri', 'アーリ'],
  'Akali': ['아칼리', 'Akali', 'アカリ'],
  'Akshan': ['아크샨', 'Akshan', 'アクシャン'],
  'Alistar': ['알리스타', 'Alistar', 'アリスター'],
  'Ambessa': ['암베사', 'Ambessa', 'アンベッサ'],
  'Amumu': ['아무무', 'Amumu', 'アムム'],
  'Anivia': ['애니비아', 'Anivia', 'アニビア'],
  'Annie': ['애니', 'Annie', 'アニー'],
  'Aphelios': ['아펠리오스', 'Aphelios', 'アフェリオス'],
  'Ashe': ['애쉬', 'Ashe', 'アッシュ'],
  'AurelionSol': ['아우렐리온 솔', 'Aurelion Sol', 'オレリオン・ソル'],
  'Aurora': ['오로라', 'Aurora', 'オーロラ'],
  'Azir': ['아지르', 'Azir', 'アジール'],
  'Bard': ['바드', 'Bard', 'バード'],
  'Belveth': ['벨베스', 'Bel\'Veth', 'ベル＝ヴェス'],
  'Blitzcrank': ['블리츠크랭크', 'Blitzcrank', 'ブリッツクランク'],
  'Brand': ['브랜드', 'Brand', 'ブランド'],
  'Braum': ['브라움', 'Braum', 'ブラウム'],
  'Briar': ['브라이어', 'Briar', 'ブライアー'],
  'Caitlyn': ['케이틀린', 'Caitlyn', 'ケイトリン'],
  'Camille': ['카밀', 'Camille', 'カミール'],
  'Cassiopeia': ['카시오페아', 'Cassiopeia', 'カシオペア'],
  'Chogath': ['초가스', 'Cho\'Gath', 'チョ＝ガス'],
  'Corki': ['코르키', 'Corki', 'コーキ'],
  'Darius': ['다리우스', 'Darius', 'ダリウス'],
  'Diana': ['다이애나', 'Diana', 'ダイアナ'],
  'DrMundo': ['문도 박사', 'Dr. Mundo', 'ドクター・ムンド'],
  'Draven': ['드레이븐', 'Draven', 'ドレイヴン'],
  'Ekko': ['에코', 'Ekko', 'エコー'],
  'Elise': ['엘리스', 'Elise', 'エリス'],
  'Evelynn': ['이블린', 'Evelynn', 'イブリン'],
  'Ezreal': ['이즈리얼', 'Ezreal', 'エズリアル'],
  'Fiddlesticks': ['피들스틱', 'Fiddlesticks', 'フィドルスティックス'],
  'Fiora': ['피오라', 'Fiora', 'フィオラ'],
  'Fizz': ['피즈', 'Fizz', 'フィズ'],
  'Galio': ['갈리오', 'Galio', 'ガリオ'],
  'Gangplank': ['갱플랭크', 'Gangplank', 'ガングプランク'],
  'Garen': ['가렌', 'Garen', 'ガレン'],
  'Gnar': ['나르', 'Gnar', 'ナー'],
  'Gragas': ['그라가스', 'Gragas', 'グラガス'],
  'Graves': ['그레이브즈', 'Graves', 'グレイブス'],
  'Gwen': ['그웬', 'Gwen', 'グウェン'],
  'Hecarim': ['헤카림', 'Hecarim', 'ヘカリム'],
  'Heimerdinger': ['하이머딩거', 'Heimerdinger', 'ハイマーディンガー'],
  'Hwei': ['흐웨이', 'Hwei', 'フェイ'],
  'Illaoi': ['일라오이', 'Illaoi', 'イラオイ'],
  'Irelia': ['이렐리아', 'Irelia', 'イレリア'],
  'Ivern': ['아이번', 'Ivern', 'アイバーン'],
  'Janna': ['잔나', 'Janna', 'ジャンナ'],
  'JarvanIV': ['자르반 4세', 'Jarvan IV', 'ジャーヴァンⅣ'],
  'Jax': ['잭스', 'Jax', 'ジャックス'],
  'Jayce': ['제이스', 'Jayce', 'ジェイス'],
  'Jhin': ['진', 'Jhin', 'ジン'],
  'Jinx': ['징크스', 'Jinx', 'ジンクス'],
  'KSante': ['크산테', 'K\'Sante', 'カ・サンテ'],
  'Kaisa': ['카이사', 'Kai\'Sa', 'カイ＝サ'],
  'Kalista': ['칼리스타', 'Kalista', 'カリスタ'],
  'Karma': ['카르마', 'Karma', 'カルマ'],
  'Karthus': ['카서스', 'Karthus', 'カーサス'],
  'Kassadin': ['카사딘', 'Kassadin', 'カサディン'],
  'Katarina': ['카타리나', 'Katarina', 'カタリナ'],
  'Kayle': ['케일', 'Kayle', 'ケイル'],
  'Kayn': ['케인', 'Kayn', 'ケイン'],
  'Kennen': ['케넨', 'Kennen', 'ケネン'],
  'Khazix': ['카직스', 'Kha\'Zix', 'カ＝ジックス'],
  'Kindred': ['킨드레드', 'Kindred', 'キンドレッド'],
  'Kled': ['클레드', 'Kled', 'クレッド'],
  'KogMaw': ['코그모', 'Kog\'Maw', 'コグ＝マウ'],
  'Leblanc': ['르블랑', 'LeBlanc', 'ルブラン'],
  'LeeSin': ['리 신', 'Lee Sin', 'リー・シン'],
  'Leona': ['레오나', 'Leona', 'レオナ'],
  'Lillia': ['릴리아', 'Lillia', 'リリア'],
  'Lissandra': ['리산드라', 'Lissandra', 'リサンドラ'],
  'Locke': ['로크', 'Locke', 'ロック'],
  'Lucian': ['루시안', 'Lucian', 'ルシアン'],
  'Lulu': ['룰루', 'Lulu', 'ルル'],
  'Lux': ['럭스', 'Lux', 'ラックス'],
  'Malphite': ['말파이트', 'Malphite', 'マルファイト'],
  'Malzahar': ['말자하', 'Malzahar', 'マルザハール'],
  'Maokai': ['마오카이', 'Maokai', 'マオカイ'],
  'MasterYi': ['마스터 이', 'Master Yi', 'マスター・イー'],
  'Mel': ['멜', 'Mel', 'メル'],
  'Milio': ['밀리오', 'Milio', 'ミリオ'],
  'MissFortune': ['미스 포츈', 'Miss Fortune', 'ミス・フォーチュン'],
  'MonkeyKing': ['오공', 'Wukong', 'ウーコン'],
  'Mordekaiser': ['모데카이저', 'Mordekaiser', 'モルデカイザー'],
  'Morgana': ['모르가나', 'Morgana', 'モルガナ'],
  'Naafiri': ['나피리', 'Naafiri', 'ナフィーリ'],
  'Nami': ['나미', 'Nami', 'ナミ'],
  'Nasus': ['나서스', 'Nasus', 'ナサス'],
  'Nautilus': ['노틸러스', 'Nautilus', 'ノーチラス'],
  'Neeko': ['니코', 'Neeko', 'ニーコ'],
  'Nidalee': ['니달리', 'Nidalee', 'ニダリー'],
  'Nilah': ['닐라', 'Nilah', 'ニーラ'],
  'Nocturne': ['녹턴', 'Nocturne', 'ノクターン'],
  'Nunu': ['누누와 윌럼프', 'Nunu & Willump', 'ヌヌ＆ウィルンプ'],
  'Olaf': ['올라프', 'Olaf', 'オラフ'],
  'Orianna': ['오리아나', 'Orianna', 'オリアナ'],
  'Ornn': ['오른', 'Ornn', 'オーン'],
  'Pantheon': ['판테온', 'Pantheon', 'パンテオン'],
  'Poppy': ['뽀삐', 'Poppy', 'ポッピー'],
  'Pyke': ['파이크', 'Pyke', 'パイク'],
  'Qiyana': ['키아나', 'Qiyana', 'キヤナ'],
  'Quinn': ['퀸', 'Quinn', 'クイン'],
  'Rakan': ['라칸', 'Rakan', 'ラカン'],
  'Rammus': ['람머스', 'Rammus', 'ラムス'],
  'RekSai': ['렉사이', 'Rek\'Sai', 'レク＝サイ'],
  'Rell': ['렐', 'Rell', 'レル'],
  'Renata': ['레나타 글라스크', 'Renata Glasc', 'レナータ・グラスク'],
  'Renekton': ['레넥톤', 'Renekton', 'レネクトン'],
  'Rengar': ['렝가', 'Rengar', 'レンガー'],
  'Riven': ['리븐', 'Riven', 'リヴェン'],
  'Rumble': ['럼블', 'Rumble', 'ランブル'],
  'Ryze': ['라이즈', 'Ryze', 'ライズ'],
  'Samira': ['사미라', 'Samira', 'サミーラ'],
  'Sejuani': ['세주아니', 'Sejuani', 'セジュアニ'],
  'Senna': ['세나', 'Senna', 'セナ'],
  'Seraphine': ['세라핀', 'Seraphine', 'セラフィーン'],
  'Sett': ['세트', 'Sett', 'セト'],
  'Shaco': ['샤코', 'Shaco', 'シャコ'],
  'Shen': ['쉔', 'Shen', 'シェン'],
  'Shyvana': ['쉬바나', 'Shyvana', 'シヴァーナ'],
  'Singed': ['신지드', 'Singed', 'シンジド'],
  'Sion': ['사이온', 'Sion', 'サイオン'],
  'Sivir': ['시비르', 'Sivir', 'シヴィア'],
  'Skarner': ['스카너', 'Skarner', 'スカーナー'],
  'Smolder': ['스몰더', 'Smolder', 'スモルダー'],
  'Sona': ['소나', 'Sona', 'ソナ'],
  'Soraka': ['소라카', 'Soraka', 'ソラカ'],
  'Swain': ['스웨인', 'Swain', 'スウェイン'],
  'Sylas': ['사일러스', 'Sylas', 'サイラス'],
  'Syndra': ['신드라', 'Syndra', 'シンドラ'],
  'TahmKench': ['탐 켄치', 'Tahm Kench', 'タム・ケンチ'],
  'Taliyah': ['탈리야', 'Taliyah', 'タリヤ'],
  'Talon': ['탈론', 'Talon', 'タロン'],
  'Taric': ['타릭', 'Taric', 'タリック'],
  'Teemo': ['티모', 'Teemo', 'ティーモ'],
  'Thresh': ['쓰레쉬', 'Thresh', 'スレッシュ'],
  'Tristana': ['트리스타나', 'Tristana', 'トリスターナ'],
  'Trundle': ['트런들', 'Trundle', 'トランドル'],
  'Tryndamere': ['트린다미어', 'Tryndamere', 'トリンダメア'],
  'TwistedFate': ['트위스티드 페이트', 'Twisted Fate', 'ツイステッド・フェイト'],
  'Twitch': ['트위치', 'Twitch', 'トゥイッチ'],
  'Udyr': ['우디르', 'Udyr', 'ウディア'],
  'Urgot': ['우르곳', 'Urgot', 'アーゴット'],
  'Varus': ['바루스', 'Varus', 'ヴァルス'],
  'Vayne': ['베인', 'Vayne', 'ヴェイン'],
  'Veigar': ['베이가', 'Veigar', 'ベイガー'],
  'Velkoz': ['벨코즈', 'Vel\'Koz', 'ヴェル＝コズ'],
  'Vex': ['벡스', 'Vex', 'ヴェックス'],
  'Vi': ['바이', 'Vi', 'ヴァイ'],
  'Viego': ['비에고', 'Viego', 'ヴィエゴ'],
  'Viktor': ['빅토르', 'Viktor', 'ビクター'],
  'Vladimir': ['블라디미르', 'Vladimir', 'ブラッドミア'],
  'Volibear': ['볼리베어', 'Volibear', 'ボリベア'],
  'Warwick': ['워윅', 'Warwick', 'ワーウィック'],
  'Xayah': ['자야', 'Xayah', 'ザヤ'],
  'Xerath': ['제라스', 'Xerath', 'ゼラス'],
  'XinZhao': ['신 짜오', 'Xin Zhao', 'シン・ジャオ'],
  'Yasuo': ['야스오', 'Yasuo', 'ヤスオ'],
  'Yone': ['요네', 'Yone', 'ヨネ'],
  'Yorick': ['요릭', 'Yorick', 'ヨリック'],
  'Yunara': ['유나라', 'Yunara', 'ユナラ'],
  'Yuumi': ['유미', 'Yuumi', 'ユーミ'],
  'Zaahen': ['자헨', 'Zaahen', 'ザーヘン'],
  'Zac': ['자크', 'Zac', 'ザック'],
  'Zed': ['제드', 'Zed', 'ゼド'],
  'Zeri': ['제리', 'Zeri', 'ゼリ'],
  'Ziggs': ['직스', 'Ziggs', 'ジグス'],
  'Zilean': ['질리언', 'Zilean', 'ジリアン'],
  'Zoe': ['조이', 'Zoe', 'ゾーイ'],
  'Zyra': ['자이라', 'Zyra', 'ザイラ'],
};
