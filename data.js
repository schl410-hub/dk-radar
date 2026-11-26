/* 딮기 시그널 · 데이터
 * 5인(도란·카나비·쇼메이커·스매쉬·딜라이트) 솔로랭크/대회 기록: KO.LOL · OP.GG · u.gg 공개 전적을
 * 2026-11-26에 확인해 옮겼습니다. 자동 갱신이 아니라서 새 경기는 v2(서버 폴링)에서 붙일 예정입니다.
 */
const LAST_CHECKED = '2026-11-26T17:07:00+09:00';

const PLAYERS = [
  {
    key: 'doran',
    nameKo: '도란',
    nameEn: 'DORAN',
    real: '최현준',
    pos: 'TOP',
    posKo: '탑',
    riotId: '어리고싶다#KR1',
    tier: '다이아몬드 1',
    lp: '65 LP',
    record: '766승 710패 · 승률 52%',
    best: '최고 챌린저 1,891 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/%EC%96%B4%EB%A6%AC%EA%B3%A0%EC%8B%B6%EB%8B%A4-KR1',
    profile: 'https://ko.lol/ko/pros/doran/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: 'DK 영입 발표', url: 'https://www.xportsnews.com/article/2222289' },
    note: '',
    official: { stage: 'Worlds 2026 · 4강', team: 'T1', opp: 'BLG', score: '1 : 3', win: false, date: '11. 09.' },
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
      { event: 'Worlds 2026', result: '4강', set: '8승 5패', key: true },
      { event: 'MSI 2026', result: '', set: '15승 6패' },
      { event: 'LCK 2026 Playoffs', result: '', set: '9승 9패' },
      { event: 'LCK 2026 정규 1-2라운드', result: '', set: '30승 10패' },
      { event: 'LCK Cup 2026', result: '', set: '14승 9패' },
      { event: 'EWC 2026', result: '', set: '7승 5패' }
    ],
    worlds: { stage: '4강', line: 'BLG에 1:3 패배', date: '2026. 11. 09' }
  },
  {
    key: 'kanavi',
    nameKo: '카나비',
    nameEn: 'KANAVI',
    real: '서진혁',
    pos: 'JGL',
    posKo: '정글',
    riotId: 'vinaka#KR1',
    tier: '다이아몬드 2',
    lp: '75 LP',
    record: '349승 273패 · 승률 56%',
    best: '최고 챌린저 2,163 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/vinaka-KR1',
    profile: 'https://ko.lol/ko/pros/kanavi/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/kanavi/' },
    note: '',
    official: { stage: 'Worlds 2026 · 5라운드', team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: '11. 01.' },
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
      { event: 'Worlds 2026', result: '5라운드', set: '3승 4패', key: true },
      { event: 'MSI 2026', result: '우승', set: '13승 7패' },
      { event: 'LCK 2026 Playoffs', result: '준우승', set: '8승 9패' },
      { event: 'LCK 2026 정규 1-2라운드', result: '', set: '32승 11패' },
      { event: 'KeSPA Cup 2026', result: '', set: '5승 3패' },
      { event: 'LCK Cup 2026', result: '', set: '5승 9패' }
    ],
    worlds: { stage: '5라운드', line: 'BLG에 0:2 패배', date: '2026. 11. 01' }
  },
  {
    key: 'showmaker',
    nameKo: '쇼메이커',
    nameEn: 'SHOWMAKER',
    real: '허수',
    pos: 'MID',
    posKo: '미드',
    riotId: 'DK ShowMaker#KR1',
    tier: '마스터',
    lp: '381 LP',
    record: '375승 308패 · 승률 55%',
    best: '최고 챌린저 2,737 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/DK%20ShowMaker-KR1',
    profile: 'https://ko.lol/ko/pros/showmaker/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/showmaker/' },
    note: '최근 경기 중 NA 표시는 북미 계정(Sonny Hayes#722)에서 치른 게임이에요.',
    official: { stage: 'Worlds 2026 · 8강', team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: '11. 06.' },
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
      { event: 'Worlds 2026', result: '8강', set: '4승 3패', key: true },
      { event: 'EWC 2026', result: '', set: '11승 3패' },
      { event: 'LCK 2026 Playoffs', result: '', set: '7승 9패' },
      { event: 'LCK 2026 정규 1-2라운드', result: '', set: '24승 18패' },
      { event: 'LCK Cup 2026', result: '', set: '18승 17패' },
      { event: 'LCK 2026 정규 3-4라운드', result: '', set: '11승 8패' }
    ],
    worlds: { stage: '8강', line: 'BLG에 0:3 패배', date: '2026. 11. 06' }
  },
  {
    key: 'smash',
    nameKo: '스매쉬',
    nameEn: 'SMASH',
    real: '신금재',
    pos: 'BOT',
    posKo: '원딜',
    riotId: 'DK Smash#KR7',
    tier: '마스터',
    lp: '489 LP',
    record: '458승 409패 · 승률 53%',
    best: '최고 챌린저 2,677 LP',
    opgg: 'https://op.gg/ko/lol/summoners/kr/DK%20Smash-KR7',
    profile: 'https://ko.lol/ko/pros/smash/',
    statsLabel: 'OP.GG ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/smash/' },
    note: '',
    official: { stage: 'Worlds 2026 · 8강', team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: '11. 06.' },
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
      { event: 'Worlds 2026', result: '8강', set: '4승 3패', key: true },
      { event: 'EWC 2026', result: '', set: '11승 3패' },
      { event: 'LCK 2026 Playoffs', result: '', set: '7승 9패' },
      { event: 'LCK 2026 정규 1-2라운드', result: '', set: '24승 18패' },
      { event: 'LCK Cup 2026', result: '', set: '18승 17패' },
      { event: 'LCK 2026 정규 3-4라운드', result: '', set: '11승 8패' }
    ],
    worlds: { stage: '8강', line: 'BLG에 0:3 패배', date: '2026. 11. 06' }
  },
  {
    key: 'delight',
    nameKo: '딜라이트',
    nameEn: 'DELIGHT',
    real: '유환중',
    pos: 'SUP',
    posKo: '서폿',
    riotId: '플레이리스트겨울#KR1',
    tier: '마스터',
    lp: '873 LP',
    record: '439승 381패 · 승률 54%',
    best: '최고 챌린저',
    opgg: 'https://u.gg/lol/profile/kr/%ED%94%8C%EB%A0%88%EC%9D%B4%EB%A6%AC%EC%8A%A4%ED%8A%B8%EA%B2%A8%EC%9A%B8-kr1/overview',
    profile: 'https://ko.lol/ko/pros/delight/',
    statsLabel: 'u.gg ↗',
    heroLink: { label: '선수 프로필', url: 'https://ko.lol/ko/pros/delight/' },
    note: 'OP.GG에 이 계정 페이지가 아직 없어서 u.gg 전적으로 연결했어요.',
    official: { stage: 'Worlds 2026 · 5라운드', team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: '11. 01.' },
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
      { event: 'Worlds 2026', result: '5라운드', set: '3승 4패', key: true },
      { event: 'MSI 2026', result: '우승', set: '13승 7패' },
      { event: 'LCK 2026 Playoffs', result: '준우승', set: '8승 9패' },
      { event: 'LCK 2026 정규 1-2라운드', result: '', set: '30승 10패' },
      { event: 'KeSPA Cup 2026', result: '', set: '5승 3패' },
      { event: 'LCK Cup 2026', result: '', set: '5승 9패' }
    ],
    worlds: { stage: '5라운드', line: 'BLG에 0:2 패배', date: '2026. 11. 01' }
  }
];

const DK_PATH = [
  { round: '1라운드', opp: 'G2', score: '1 : 0', win: true, date: '10. 24.' },
  { round: '2라운드', opp: 'T1', score: '1 : 0', win: true, date: '10. 25.' },
  { round: '3라운드', opp: 'MKOI', score: '2 : 0', win: true, date: '10. 26.' },
  { round: '8강', opp: 'BLG', score: '0 : 3', win: false, date: '11. 06.' }
];

const ROSTER_NOTES = {
  doran: 'T1 → DK',
  kanavi: 'HLE → DK',
  showmaker: 'DK 재계약',
  smash: 'DK 재계약',
  delight: 'HLE → DK'
};

/* 2027 시즌 구조
 * LCK는 2025년부터 스프링·서머 스플릿을 폐지하고 'LCK 컵 → 단일 정규 시즌'으로 진행합니다.
 * 2027 국제 대회 개최지는 LoL e스포츠 2026-11-13 발표(First Stand: All In 중국,
 * MSI 스페인 발렌시아, 월즈 일본 나고야·한국 수원/서울) 기준이며 세부 일정은 추후 공지입니다.
 */
const SEASON_2027 = [
  { no: '01', name: 'LCK 컵', host: '국내', note: '2027 시즌 개막 · 세부 일정 추후 공지' },
  { no: '02', name: 'First Stand: All In', host: '중국', note: '2027 한정 확대판 · 형식과 일정은 2027년 1월 발표' },
  { no: '03', name: 'LCK 정규 시즌', host: '국내', note: '단일 정규 시즌 · 스프링·서머 스플릿 없음' },
  { no: '04', name: 'MSI 2027', host: '발렌시아', note: '미드 시즌 인비테이셔널 · 스페인 발렌시아' },
  { no: '05', name: '월즈 2027', host: '일본 · 한국', note: '스위스 나고야 · 8강/4강 수원 · 결승 서울' }
];
