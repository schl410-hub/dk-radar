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

/* 하이라이트 아카이브 태그 — 검색과 배지에 함께 씁니다 (KO/EN/JA/ZH) */
const HL_TAGS = {
  lck: { ko: 'LCK', en: 'LCK', ja: 'LCK', zh: 'LCK' },
  worlds: { ko: '월즈', en: 'Worlds', ja: 'ワールズ', zh: '世界赛' },
  msi: { ko: 'MSI', en: 'MSI', ja: 'MSI', zh: 'MSI' },
  lckcup: { ko: 'LCK 컵', en: 'LCK Cup', ja: 'LCKカップ', zh: 'LCK 杯' },
  playoffs: { ko: '플레이오프', en: 'Playoffs', ja: 'プレーオフ', zh: '季后赛' },
  final: { ko: '결승', en: 'Final', ja: '決勝', zh: '决赛' },
  pentakill: { ko: '펜타킬', en: 'Pentakill', ja: 'ペンタキル', zh: '五杀' },
  carry: { ko: '캐리', en: 'Carry', ja: 'キャリー', zh: '带飞' },
  comeback: { ko: '역전극', en: 'Comeback', ja: '逆転劇', zh: '逆转' },
  top: { ko: '탑', en: 'Top', ja: 'トップ', zh: '上路' },
  jgl: { ko: '정글', en: 'Jungle', ja: 'ジャングル', zh: '打野' },
  mid: { ko: '미드', en: 'Mid', ja: 'ミッド', zh: '中路' },
  adc: { ko: '원딜', en: 'ADC', ja: 'ADC', zh: '射手' },
  sup: { ko: '서폿', en: 'Support', ja: 'サポート', zh: '辅助' },
  rookie: { ko: '신인왕', en: 'Rookie of the Year', ja: '新人王', zh: '最佳新人' },
  win300: { ko: '300승', en: '300th win', ja: '通算300勝', zh: '300胜' },
  champion: { ko: '우승', en: 'Title', ja: '優勝', zh: '冠军' },
  debut: { ko: '데뷔', en: 'Debut', ja: 'デビュー', zh: '出道' },
  gnar: { ko: '나르', en: 'Gnar', ja: 'ナー', zh: '纳尔' },
  jayce: { ko: '제이스', en: 'Jayce', ja: 'ジェイス', zh: '杰斯' },
  azir: { ko: '아지르', en: 'Azir', ja: 'アジール', zh: '阿兹尔' },
  leblanc: { ko: '르블랑', en: 'LeBlanc', ja: 'ルブラン', zh: '乐芙兰' },
  ambessa: { ko: '암베사', en: 'Ambessa', ja: 'アンベッサ', zh: '安蓓萨' },
  kaisa: { ko: '카이사', en: "Kai'Sa", ja: 'カイ＝サ', zh: '卡莎' }
};

/* 영상 카테고리 — 아카이브 칩과 카드 배지에 함께 씁니다 */
const HL_CATS = {
  highlight: { ko: '하이라이트', en: 'Highlights', ja: 'ハイライト', zh: '高光' },
  madmovie: { ko: '매드무비', en: 'Montage', ja: 'マッドムービー', zh: '剪辑' },
  behind: { ko: '딮터뷰·비하인드', en: 'Interview & behind', ja: 'インタビュー・舞台裏', zh: '专访·花絮' },
  shorts: { ko: '쇼츠', en: 'Shorts', ja: 'ショート', zh: '短片' }
};

const PLAYERS = [
  {
    key: 'doran',
    nameKo: '도란',
    nameEn: 'DORAN',
    nameIntl: 'Doran',
    nameJa: 'ドラン',
    nameZh: '多兰',
    real: '최현준',
    realEn: 'Choi Hyeon-jun',
    realJa: 'チェ・ヒョンジュン',
    realZh: '崔现准',
    pos: 'TOP',
    posKo: '탑',
    riotId: '어리고싶다#KR1',
    birthday: '2000-07-22',
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
      { id: 'FDos-nzB8HE', len: '10:04', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 도베사', en: 'Doran · Ambessa', ja: 'ドラン · アンベッサ', zh: '多兰 · 安蓓萨' }, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube' }, tags: ['top', 'carry'], cat: 'highlight', champ: ['ambessa'], point: {"ko": "도베사 발견", "en": "Doran + Ambessa spotted", "ja": "ドベッサ発見", "zh": "发现“多蓓萨”"} },
      { id: '7wZxtaNDCTI', len: '9:48', channel: 'T1', team: 'T1', year: 2025, match: { ko: '도란 · 암베사 연습', en: 'Doran · Ambessa practice', ja: 'ドラン · アンベッサ練習', zh: '多兰 · 安蓓萨练习' }, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube' }, tags: ['top'], cat: 'highlight', champ: ['ambessa'], point: {"ko": "도란의 암베사 깎기 1일차", "en": "Doran grinds Ambessa, day one", "ja": "ドランのアンベッサ仕上げ1日目", "zh": "多兰打磨安蓓萨第一天"} },
      { id: 'uzkulCX1cvw', len: '12:13', channel: 'LCK', team: 'T1', year: 2026, match: { ko: 'T1 vs BFX · 4세트', en: 'T1 vs BFX · Game 4', ja: 'T1 vs BFX 第4試合', zh: 'T1 vs BFX · 第4局' }, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛' }, tags: ['playoffs', 'lck', 'top'] , cat: 'highlight', point: {"ko": "건실한 청년, 4세트를 매듭짓다", "en": "The steady hand closes out Game 4", "ja": "堅実な青年、第4試合を締める", "zh": "沉稳青年收下第4局"} },

      { id: 'zmt-dT7garg', len: '13:10', channel: 'LCK', team: 'T1', year: 2026, match: { ko: 'T1 vs DK · 2세트', en: 'T1 vs DK · Game 2', ja: 'T1 vs DK 第2試合', zh: 'T1 vs DK · 第2局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'top', 'carry'] , cat: 'highlight', point: {"ko": "서커스를 시작해볼까", "en": "Shall we start the circus?", "ja": "サーカスを始めようか", "zh": "来场马戏吧"} },

      { id: 'sqjM3EJO7ng', len: '11:04', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs HLE · 4세트', en: 'T1 vs HLE · Game 4', ja: 'T1 vs HLE 第4試合', zh: 'T1 vs HLE · 第4局' }, event: { ko: '2025 우리은행 LCK CUP 플레이오프', en: '2025 LCK Cup Playoffs', ja: '2025 LCKカップ プレーオフ', zh: '2025 LCK 杯 季后赛' }, tags: ['lckcup', 'playoffs', 'top'] , cat: 'highlight', point: {"ko": "짜잔, 내가 도란왔다", "en": "Ta-da — Doran has arrived", "ja": "じゃじゃーん、ドラン参上", "zh": "闪亮登场，多兰来了"} },

      { id: 'gJarHbioMEg', len: '11:00', channel: 'LCK', team: 'Gen.G', year: 2023, match: { ko: 'T1 vs GEN · 1세트', en: 'T1 vs GEN · Game 1', ja: 'T1 vs GEN 第1試合', zh: 'T1 vs GEN · 第1局' }, event: { ko: '2023 LCK 스프링 결승', en: '2023 LCK Spring Final', ja: '2023 LCK スプリング決勝', zh: '2023 LCK 春季赛决赛' }, tags: ['lck', 'final', 'top', 'carry'] , cat: 'highlight', point: {"ko": "도란의 탑 단속", "en": "Doran's top-lane crackdown", "ja": "ドランのトップ取り締まり", "zh": "多兰的上路整治"} },

      { id: 'H4Tp-sRSp2Y', len: '3:02', channel: 'LoL Esports', team: 'HLE', year: 2024, match: { ko: '도란 · 나르 대형 궁', en: 'Doran · huge Gnar ult', ja: 'ドラン · ナー特大ウルト', zh: 'Doran · 纳尔巨量控制' }, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS' }, tags: ['top', 'carry', 'gnar'] , cat: 'highlight', champ: ['gnar'], point: {"ko": "나르 메가 궁 한 방", "en": "One huge Mega Gnar ult", "ja": "ナー メガウルト一発", "zh": "纳尔巨型形态一记大招"} },

      { id: 'q_2YoaayhFg', len: '3:29', channel: 'LoL Esports', team: 'Gen.G', year: 2023, match: { ko: 'Gen.G vs T1 · LCK 결승', en: 'Gen.G vs T1 · LCK Final', ja: 'Gen.G vs T1 · LCK決勝', zh: 'Gen.G vs T1 · LCK决赛' }, event: { ko: 'LoL Esports · Plays of the Week', en: 'LoL Esports · Plays of the Week', ja: 'LoL Esports · Plays of the Week', zh: 'LoL Esports · Plays of the Week' }, tags: ['lck', 'final', 'carry', 'comeback'] , cat: 'highlight', point: {"ko": "결승에서 T1을 무너뜨린 이변", "en": "The upset that wrecked T1 in the final", "ja": "決勝でT1を崩した番狂わせ", "zh": "决赛掀翻 T1 的爆冷"} },

      { id: 'J8XPHKlTBLM', len: '8:27', channel: 'LoL Esports', team: 'DRX', year: 2020, match: { ko: 'DRX · 월즈 그룹 스테이지', en: 'DRX · Worlds group stage', ja: 'DRX · ワールズ グループステージ', zh: 'DRX · 世界赛小组赛' }, event: { ko: 'Worlds 2020 · Lane Kingdom', en: 'Worlds 2020 · Lane Kingdom', ja: 'Worlds 2020 · Lane Kingdom', zh: 'Worlds 2020 · Lane Kingdom' }, tags: ['worlds', 'top', 'carry', 'jayce'] , cat: 'highlight', champ: ['jayce'], point: {"ko": "월즈 그룹 스테이지 제이스 캐리", "en": "Jayce carries the Worlds group stage", "ja": "ワールズGSのジェイスキャリー", "zh": "世界赛小组赛的杰斯带飞"} },

    ],
    note: { ko: '', en: '', ja: '', zh: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 4강', en: 'Worlds 2026 · Semifinals', ja: 'Worlds 2026 · ベスト4', zh: 'Worlds 2026 · 四强' },
      team: 'T1', opp: 'BLG', score: '1 : 3', win: false, date: { ko: '11. 09.', en: 'Nov 9', ja: '11月9日', zh: '11月9日' }
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' }, result: 'SEMI', set: { w: 8, l: 5 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026' }, result: '', set: { w: 15, l: 6 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛' }, result: '', set: { w: 9, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮' }, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯' }, result: '', set: { w: 14, l: 9 } },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026' }, result: '', set: { w: 7, l: 5 } }
    ],
    worlds: { stageKey: 'SEMI', line: { ko: 'BLG에 1:3 패배', en: 'Lost 1–3 to BLG', ja: 'BLGに1-3で敗退', zh: '1:3 负于 BLG' }, date: { ko: '2026. 11. 09', en: 'Nov 9, 2026', ja: '2026年11月9日', zh: '2026年11月9日' } }
  },
  {
    key: 'kanavi',
    nameKo: '카나비',
    nameEn: 'KANAVI',
    nameIntl: 'Kanavi',
    nameJa: 'カナビ',
    nameZh: '卡纳维',
    real: '서진혁',
    realEn: 'Seo Jin-hyeok',
    realJa: 'ソ・ジニョク',
    realZh: '徐真赫',
    pos: 'JGL',
    posKo: '정글',
    riotId: 'vinaka#KR1',
    birthday: '2000-11-02',
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
      { id: 'Ws93_VsEx-s', len: '12:39', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 3세트', en: 'HLE vs T1 · Game 3', ja: 'HLE vs T1 第3試合', zh: 'HLE vs T1 · 第3局' }, event: { ko: '2026 LCK 로드 투 MSI', en: '2026 LCK Road to MSI', ja: '2026 LCK ロード・トゥMSI', zh: '2026 LCK 通往 MSI' }, tags: ['lck', 'jgl', 'carry'] , cat: 'highlight', point: {"ko": "벌처럼 날아 나비처럼 쏜다", "en": "Flies like a bee, stings like a butterfly", "ja": "蜂のように飛び、蝶のように刺す", "zh": "像蜜蜂般飞，像蝴蝶般出击"} },

      { id: 'fOUtkqYy1VE', len: '10:02', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'DK vs HLE · 1세트', en: 'DK vs HLE · Game 1', ja: 'DK vs HLE 第1試合', zh: 'DK vs HLE · 第1局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'jgl'] , cat: 'highlight', point: {"ko": "LPL 유학생 출신 카정 카씨", "en": "The LPL-trained jungle thief", "ja": "LPL留学帰りのジャングル泥棒", "zh": "LPL 归来的野区小偷"} },

      { id: 'iNQxu7iC6pU', len: '10:51', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 2세트', en: 'HLE vs T1 · Game 2', ja: 'HLE vs T1 第2試合', zh: 'HLE vs T1 · 第2局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'jgl', 'carry'] , cat: 'highlight', point: {"ko": "번개의 신, 경기를 가져오다", "en": "The god of thunder takes the game", "ja": "雷神、試合を持っていく", "zh": "雷神拿下比赛"} },

      { id: 'OUHbIAms4F4', len: '0:25', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: 'HLE · G2 상대 정글 장악', en: 'HLE · jungle grip vs G2', ja: 'HLE · G2戦のジャングル掌握', zh: 'HLE · 对 G2 的野区压制' }, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮' }, tags: ['worlds', 'jgl', 'carry'] , cat: 'shorts', point: {"ko": "G2 정글을 폭파하다", "en": "Blowing up G2’s jungle", "ja": "G2のジャングルを爆破", "zh": "炸穿 G2 野区"} },

      { id: 'pPqJXwXuSDE', len: '0:56', channel: 'LoL Esports', team: 'JDG', year: 2023, match: { ko: '카나비 · 완벽한 각도', en: 'Kanavi · the perfect angle', ja: 'カナビ · 完璧な角度', zh: 'Kanavi · 完美角度' }, event: { ko: 'LoL Esports · 플레이 클립', en: 'LoL Esports · play clip', ja: 'LoL Esports · プレイクリップ', zh: 'LoL Esports · 精彩片段' }, tags: ['jgl', 'carry'] , cat: 'shorts', point: {"ko": "언제나 완벽한 각도", "en": "Always the perfect angle", "ja": "いつでも完璧な角度", "zh": "永远完美的角度"} },

      { id: 'SMxpnilYSyU', len: '0:09', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: '카나비 · 다시 정상에', en: 'Kanavi · champion again', ja: 'カナビ · 再び頂点へ', zh: 'Kanavi · 再度夺冠' }, event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026' }, tags: ['msi', 'champion', 'jgl'] , cat: 'shorts', point: {"ko": "다시 정상에 선 카나비", "en": "Kanavi, back on top", "ja": "再び頂点へ、カナビ", "zh": "重返巅峰的 Kanavi"} },

    ],
    note: { ko: '', en: '', ja: '', zh: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド', zh: 'Worlds 2026 · 第5轮' },
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日', zh: '11月1日' }
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' }, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026' }, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛' }, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮' }, result: '', set: { w: 32, l: 11 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026', zh: '2026 KeSPA 杯' }, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯' }, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退', zh: '0:2 负于 BLG' }, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日', zh: '2026年11月1日' } }
  },
  {
    key: 'showmaker',
    nameKo: '쇼메이커',
    nameEn: 'SHOWMAKER',
    nameIntl: 'ShowMaker',
    nameJa: 'ショウメイカー',
    nameZh: '秀梅克',
    real: '허수',
    realEn: 'Heo Su',
    realJa: 'ホ・ス',
    realZh: '许秀',
    pos: 'MID',
    posKo: '미드',
    riotId: 'DK ShowMaker#KR1',
    birthday: '2000-07-22',
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
      { platform: 'soop', url: 'https://ch.sooplive.co.kr/showmakerr', handle: 'DK쇼메쇼메' },
      { platform: 'chzzk', url: 'https://chzzk.naver.com/07a040b24eb497dc36c31d82bc06ccc2', handle: 'DK 쇼메쇼메' }
    ],
    highlights: [
      { id: 'FG8VNBFemDg', len: '10:29', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 3세트', en: 'DK vs GEN · Game 3', ja: 'DK vs GEN 第3試合', zh: 'DK vs GEN · 第3局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'mid', 'carry'] , cat: 'highlight', point: {"ko": "쇼 메 혹 — 한 번 속아보실?", "en": "ShowMaker’s bait — fooled you", "ja": "ショメの誘い — 引っかかった？", "zh": "ShowMaker 的诱饵 — 上当了吧"} },

      { id: 'SqKdQydiZKs', len: '7:31', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 1세트', en: 'DK vs GEN · Game 1', ja: 'DK vs GEN 第1試合', zh: 'DK vs GEN · 第1局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'mid'] , cat: 'highlight', point: {"ko": "북벌 페이스리프트", "en": "A facelift for the northern campaign", "ja": "北伐のフェイスリフト", "zh": "北伐改款"} },

      { id: 'C02yoXL62UY', len: '10:49', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 2세트', en: 'DK vs GEN · Game 2', ja: 'DK vs GEN 第2試合', zh: 'DK vs GEN · 第2局' }, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' }, tags: ['lck', 'mid', 'comeback'] , cat: 'highlight', point: {"ko": "1707일의 염원", "en": "A wish 1,707 days in the making", "ja": "1707日目の願い", "zh": "等待 1707 天的心愿"} },

      { id: 'VpNVX1aKR9g', len: '8:49', channel: 'LCK', team: 'DK', year: 2021, match: { ko: 'T1 vs DK · 4세트', en: 'T1 vs DK · Game 4', ja: 'T1 vs DK 第4試合', zh: 'T1 vs DK · 第4局' }, event: { ko: '2021 월드 챔피언십 4강', en: 'Worlds 2021 Semifinals', ja: 'ワールズ2021 準決勝', zh: '2021 世界赛四强' }, tags: ['worlds', 'mid', 'carry', 'leblanc'] , cat: 'highlight', champ: ['leblanc'], point: {"ko": "3대 800 르블랑", "en": "The 3-vs-800 LeBlanc", "ja": "3対800のルブラン", "zh": "3 打 800 的乐芙兰"} },

      { id: 'DyaPoq_QAO8', len: '7:51', channel: 'LCK', team: 'DK', year: 2025, match: { ko: 'DK vs BFX · 4세트', en: 'DK vs BFX · Game 4', ja: 'DK vs BFX 第4試合', zh: 'DK vs BFX · 第4局' }, event: { ko: '2025 우리은행 LCK 플레이오프', en: '2025 LCK Playoffs', ja: '2025 LCK プレーオフ', zh: '2025 LCK 季后赛' }, tags: ['playoffs', 'lck', 'mid', 'carry'] , cat: 'highlight', point: {"ko": "비 내리는 여름밤의 쇼메이커", "en": "ShowMaker on a rainy summer night", "ja": "雨の夏の夜のショーメイカー", "zh": "雨夜里的 ShowMaker"} },

      { id: 'JT8H1izxnL8', len: '3:45', channel: 'LoL Esports', team: 'DK', year: 2024, match: { ko: '쇼메이커 · 아지르 4인 궁', en: 'ShowMaker · Azir shuffle', ja: 'ショーメーカー · アジール シャッフル', zh: 'ShowMaker · 沙皇大招' }, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS' }, tags: ['mid', 'carry', 'azir'] , cat: 'highlight', champ: ['azir'], point: {"ko": "아지르 4인 궁 스쿱", "en": "Azir scoops up all four", "ja": "アジールの4人ウルト", "zh": "阿兹尔一 scoop 四人"} },

    ],
    note: {
      ko: '최근 경기 중 NA 표시는 북미 계정(Sonny Hayes#722)에서 치른 게임이에요.',
      en: 'Games marked NA in the recent list were played on a North American account (Sonny Hayes#722).',
      ja: '最近の試合のNA表示は北米アカウント（Sonny Hayes#722）で行ったゲームです。'
    },
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8', zh: 'Worlds 2026 · 八强' },
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日' }
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' }, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026' }, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛' }, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮' }, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯' }, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4', zh: 'LCK 2026 常规赛 第3-4轮' }, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退', zh: '0:3 负于 BLG' }, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日', zh: '2026年11月6日' } }
  },
  {
    key: 'smash',
    nameKo: '스매쉬',
    nameEn: 'SMASH',
    nameIntl: 'Smash',
    nameJa: 'スマッシュ',
    nameZh: '斯马什',
    real: '신금재',
    realEn: 'Shin Geum-jae',
    realJa: 'シン・クムジェ',
    realZh: '申锦宰',
    pos: 'BOT',
    posKo: '원딜',
    riotId: 'DK Smash#KR7',
    birthday: '2006-07-20',
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
      { id: 'uxnXy7SFMsY', len: '7:21', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs KT · 3세트', en: 'T1 vs KT · Game 3', ja: 'T1 vs KT 第3試合', zh: 'T1 vs KT · 第3局' }, event: { ko: '2025 LCK 컵', en: '2025 LCK Cup', ja: '2025 LCKカップ', zh: '2025 LCK 杯' }, tags: ['lckcup', 'adc'] , cat: 'highlight', point: {"ko": "불꽃 스매쉬", "en": "Flame Smash", "ja": "炎のスマッシュ", "zh": "火焰 Smash"} },

      { id: 'BxU5zVPnMiU', len: '9:33', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs GEN · 1세트', en: 'T1 vs GEN · Game 1', ja: 'T1 vs GEN 第1試合', zh: 'T1 vs GEN · 第1局' }, event: { ko: '2025 LCK 컵 · 신인왕 등장', en: '2025 LCK Cup · rookie debut', ja: '2025 LCKカップ · 新人王登場', zh: '2025 LCK 杯 · 新人王登场' }, tags: ['lckcup', 'rookie', 'debut', 'adc'] , cat: 'highlight', point: {"ko": "신인 금재, 등장", "en": "Rookie Keum-jae has arrived", "ja": "新人クムジェ、登場", "zh": "新人金宰登场"} },

      { id: '6qYVK6DGkrU', len: '3:28', channel: 'LoL Esports', team: 'T1', year: 2025, match: { ko: '스매쉬 · T1 신인왕', en: 'Smash · T1 rookie', ja: 'スマッシュ · T1新人', zh: 'Smash · T1 新人' }, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS' }, tags: ['rookie', 'adc', 'carry'] , cat: 'highlight', point: {"ko": "T1 신인왕의 스머프 모드", "en": "T1's rookie goes smurf mode", "ja": "T1新人王のスマーフモード", "zh": "T1 新人王的虐菜模式"} },

      { id: '2JCbasoSUrY', len: '0:26', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK · 월즈 1호 펜타킬', en: 'DK · first pentakill of Worlds', ja: 'DK · ワールズ第1号ペンタキル', zh: 'DK · 世界赛首个五杀' }, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: 'ワールズ2026', zh: '2026 世界赛' }, tags: ['worlds', 'pentakill', 'adc'] , cat: 'highlight', point: {"ko": "월즈 1호 펜타킬", "en": "The first pentakill of Worlds", "ja": "ワールズ第1号ペンタキル", "zh": "世界赛首记五杀"} },

      { id: 'yfC5vSjiJos', len: '13:27', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'MKOI vs DK · 1세트', en: 'MKOI vs DK · Game 1', ja: 'MKOI vs DK 第1試合', zh: 'MKOI vs DK · 第1局' }, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮' }, tags: ['worlds', 'adc'] , cat: 'highlight', point: {"ko": "‘한방’ 치료", "en": "The one-shot cure", "ja": "‘一発’治療", "zh": "“一针见效”"} },

      { id: '99lMm4kPg0o', len: '11:54', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BLG vs DK · 3세트', en: 'BLG vs DK · Game 3', ja: 'BLG vs DK 第3試合', zh: 'BLG vs DK · 第3局' }, event: { ko: '2026 월드 챔피언십 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'ワールズ2026 · 準々決勝', zh: '2026 世界赛 · 八强' }, tags: ['worlds', 'adc', 'carry'] , cat: 'highlight', point: {"ko": "Thank you, DK — 8강 마지막 세트", "en": "Thank you, DK — the last set of the quarters", "ja": "Thank you, DK — 準々決勝ラストセット", "zh": "Thank you, DK — 八强最后一场"} },

    ],
    note: { ko: '', en: '', ja: '', zh: '' },
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8', zh: 'Worlds 2026 · 八强' },
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日' }
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' }, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026' }, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛' }, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮' }, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯' }, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4', zh: 'LCK 2026 常规赛 第3-4轮' }, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退', zh: '0:3 负于 BLG' }, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日', zh: '2026年11月6日' } }
  },
  {
    key: 'delight',
    nameKo: '딜라이트',
    nameEn: 'DELIGHT',
    nameIntl: 'Delight',
    nameJa: 'ディライト',
    nameZh: '迪莱特',
    real: '유환중',
    realEn: 'Yoo Hwan-joong',
    realJa: 'ユ・ファンジュン',
    realZh: '柳焕中',
    pos: 'SUP',
    posKo: '서폿',
    riotId: '죽각딜#KR02',
    birthday: '2002-09-12',
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
      { id: 'COviyhL_fxc', len: '8:52', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs DK · 2세트', en: 'HLE vs DK · Game 2', ja: 'HLE vs DK 第2試合', zh: 'HLE vs DK · 第2局' }, event: { ko: '2026 LCK · LCK 300승', en: '2026 LCK · 300th LCK win', ja: '2026 LCK · LCK通算300勝', zh: '2026 LCK · LCK 300胜' }, tags: ['lck', 'sup', 'win300'] , cat: 'highlight', point: {"ko": "LCK 300승 달성", "en": "Reaching 300 LCK wins", "ja": "LCK通算300勝達成", "zh": "达成 LCK 300 胜"} },

      { id: 'OT-19WY8HFI', len: '12:03', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 1세트', en: 'HLE vs T1 · Game 1', ja: 'HLE vs T1 第1試合', zh: 'HLE vs T1 · 第1局' }, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛' }, tags: ['playoffs', 'lck', 'sup'] , cat: 'highlight', point: {"ko": "“기초적인 임플란트다”", "en": "“A basic implant”", "ja": "「基礎的なインプラントだ」", "zh": "“基础的种植牙”"} },

      { id: 'c3QdrFHgxTU', len: '35:59', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'DK vs HLE · 매치', en: 'DK vs HLE · Match', ja: 'DK vs HLE · マッチ', zh: 'DK vs HLE · 比赛' }, event: { ko: '2026 LCK 매치 123', en: '2026 LCK · Match 123', ja: '2026 LCK マッチ123', zh: '2026 LCK 第123场' }, tags: ['lck', 'sup'] , cat: 'highlight', point: {"ko": "DK vs HLE 매치 123", "en": "DK vs HLE, match 123", "ja": "DK vs HLE マッチ123", "zh": "DK vs HLE 第123场"} },

      { id: '2FDj-lJth1E', len: '0:20', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: '딜라이트 · 로봇 서폿', en: 'Delight · robot support', ja: 'ディライト · ロボットサポート', zh: 'Delight · 机器人辅助' }, event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026' }, tags: ['msi', 'champion', 'sup'] , cat: 'shorts', point: {"ko": "로봇 서폿 출동", "en": "Robot support on duty", "ja": "ロボットサポート出動", "zh": "机器人辅助出动"} },

      { id: 'PcrXCZYo_58', len: '9:37', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'G2 vs HLE · 1세트', en: 'G2 vs HLE · Game 1', ja: 'G2 vs HLE 第1試合', zh: 'G2 vs HLE · 第1局' }, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮' }, tags: ['worlds', 'sup'] , cat: 'highlight', point: {"ko": "이거 제 이모지양", "en": "That one is my emoji sheep", "ja": "これは私の絵文字羊", "zh": "这是我的表情羊"} },

      { id: 'oH96rywp2L0', len: '43:39', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs KT · 매치', en: 'HLE vs KT · Match', ja: 'HLE vs KT · マッチ', zh: 'HLE vs KT · 比赛' }, event: { ko: '2026 LCK 매치 117', en: '2026 LCK · Match 117', ja: '2026 LCK マッチ117', zh: '2026 LCK 第117场' }, tags: ['lck', 'sup'] , cat: 'highlight', point: {"ko": "HLE vs KT 매치 117", "en": "HLE vs KT, match 117", "ja": "HLE vs KT マッチ117", "zh": "HLE vs KT 第117场"} },

    ],
    note: {
      ko: '닉네임이 플레이리스트겨울#KR1 에서 죽각딜#KR02 로 바뀌어 u.gg 새 주소로 연결했어요.',
      en: 'The account name changed from 플레이리스트겨울#KR1 to 죽각딜#KR02, so the stats link opens the new u.gg profile.',
      ja: 'アカウント名が 플레이리스트겨울#KR1 から 죽각딜#KR02 に変わったため、u.ggの新しいプロフィールにリンクしています。'
    },
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド', zh: 'Worlds 2026 · 第5轮' },
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日', zh: '11月1日' }
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' }, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026' }, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛' }, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮' }, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026', zh: '2026 KeSPA 杯' }, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯' }, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退', zh: '0:2 负于 BLG' }, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日', zh: '2026年11月1日' } }
  }
];

const DK_PATH = [
  { round: { ko: '1라운드', en: 'Round 1', ja: '第1ラウンド', zh: '第1轮' }, opp: 'G2', score: '1 : 0', win: true, date: { ko: '10. 24.', en: 'Oct 24', ja: '10月24日', zh: '10月24日' } },
  { round: { ko: '2라운드', en: 'Round 2', ja: '第2ラウンド', zh: '第2轮' }, opp: 'T1', score: '1 : 0', win: true, date: { ko: '10. 25.', en: 'Oct 25', ja: '10月25日', zh: '10月25日' } },
  { round: { ko: '3라운드', en: 'Round 3', ja: '第3ラウンド', zh: '第3轮' }, opp: 'MKOI', score: '2 : 0', win: true, date: { ko: '10. 26.', en: 'Oct 26', ja: '10月26日', zh: '10月26日' } },
  { round: { ko: '8강', en: 'Quarterfinals', ja: 'ベスト8', zh: '八强' }, opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日' } }
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
    name: { ko: 'LCK 컵', en: 'LCK Cup', ja: 'LCKカップ', zh: 'LCK 杯' },
    host: { ko: '국내', en: 'Korea', ja: '韓国', zh: '国内' },
    note: { ko: '2027 시즌 개막 · 세부 일정 추후 공지', en: '2027 season opener · schedule to be announced', ja: '2027シーズン開幕 · 詳細日程は追って発表', zh: '2027 赛季开幕 · 详细赛程后续公布' }
  },
  {
    no: '02',
    name: { ko: 'First Stand: All In', en: 'First Stand: All In', ja: 'First Stand: All In', zh: 'First Stand: All In' },
    host: { ko: '중국', en: 'China', ja: '中国', zh: '中国' },
    note: { ko: '2027 한정 확대판 · 형식과 일정은 2027년 1월 발표', en: '2027-only expanded edition · format and dates announced January 2027', ja: '2027年限定の拡大版 · 形式と日程は2027年1月発表', zh: '2027 限定扩大版 · 赛制与赛程于 2027年1月公布' }
  },
  {
    no: '03',
    name: { ko: 'LCK 정규 시즌', en: 'LCK regular season', ja: 'LCKレギュラーシーズン', zh: 'LCK 常规赛' },
    host: { ko: '국내', en: 'Korea', ja: '韓国', zh: '国内' },
    note: { ko: '단일 정규 시즌 · 스프링·서머 스플릿 없음', en: 'One regular season · no spring/summer splits', ja: '単一レギュラーシーズン · スプリング／サマーなし', zh: '单一常规赛 · 无春季/夏季赛' }
  },
  {
    no: '04',
    name: { ko: 'MSI 2027', en: 'MSI 2027', ja: 'MSI 2027', zh: 'MSI 2027' },
    host: { ko: '발렌시아', en: 'Valencia', ja: 'バレンシア', zh: '巴伦西亚' },
    note: { ko: '미드 시즌 인비테이셔널 · 스페인 발렌시아', en: 'Mid-Season Invitational · Valencia, Spain', ja: 'ミッドシーズン・インビテーショナル · スペイン・バレンシア', zh: '季中冠军赛 · 西班牙 巴伦西亚' }
  },
  {
    no: '05',
    name: { ko: '월즈 2027', en: 'Worlds 2027', ja: 'Worlds 2027', zh: '2027 全球总决赛' },
    host: { ko: '일본 · 한국', en: 'Japan · Korea', ja: '日本・韓国', zh: '日本 · 韩国' },
    note: { ko: '스위스 나고야 · 8강/4강 수원 · 결승 서울', en: 'Swiss in Nagoya · quarters/semis in Suwon · final in Seoul', ja: 'スイスは名古屋 · 準々決勝／準決勝は水原 · 決勝はソウル', zh: '瑞士轮 名古屋 · 八强/四强 水原 · 决赛 首尔' }
  }
];

/* 챔피언 이름 (Riot Data Dragon 16.23.1 ko_KR · en_US · ja_JP · zh_CN)
 * data.js 는 한국어 이름을 쓰고, Riot API 는 영어 이름을 주기 때문에 네 언어를 한 표에 둡니다.
 * tools/make_champions.py 로 다시 만들 수 있습니다. */
const CHAMPIONS = {
  'Aatrox': ['아트록스', 'Aatrox', 'エイトロックス', '暗裔剑魔'],
  'Ahri': ['아리', 'Ahri', 'アーリ', '九尾妖狐'],
  'Akali': ['아칼리', 'Akali', 'アカリ', '离群之刺'],
  'Akshan': ['아크샨', 'Akshan', 'アクシャン', '影哨'],
  'Alistar': ['알리스타', 'Alistar', 'アリスター', '牛头酋长'],
  'Ambessa': ['암베사', 'Ambessa', 'アンベッサ', '铁血狼母'],
  'Amumu': ['아무무', 'Amumu', 'アムム', '殇之木乃伊'],
  'Anivia': ['애니비아', 'Anivia', 'アニビア', '冰晶凤凰'],
  'Annie': ['애니', 'Annie', 'アニー', '黑暗之女'],
  'Aphelios': ['아펠리오스', 'Aphelios', 'アフェリオス', '残月之肃'],
  'Ashe': ['애쉬', 'Ashe', 'アッシュ', '寒冰射手'],
  'AurelionSol': ['아우렐리온 솔', 'Aurelion Sol', 'オレリオン・ソル', '铸星龙王'],
  'Aurora': ['오로라', 'Aurora', 'オーロラ', '双界灵兔'],
  'Azir': ['아지르', 'Azir', 'アジール', '沙漠皇帝'],
  'Bard': ['바드', 'Bard', 'バード', '星界游神'],
  'Belveth': ['벨베스', 'Bel\'Veth', 'ベル＝ヴェス', '虚空女皇'],
  'Blitzcrank': ['블리츠크랭크', 'Blitzcrank', 'ブリッツクランク', '蒸汽机器人'],
  'Brand': ['브랜드', 'Brand', 'ブランド', '复仇焰魂'],
  'Braum': ['브라움', 'Braum', 'ブラウム', '弗雷尔卓德之心'],
  'Briar': ['브라이어', 'Briar', 'ブライアー', '狂厄蔷薇'],
  'Caitlyn': ['케이틀린', 'Caitlyn', 'ケイトリン', '皮城女警'],
  'Camille': ['카밀', 'Camille', 'カミール', '青钢影'],
  'Cassiopeia': ['카시오페아', 'Cassiopeia', 'カシオペア', '魔蛇之拥'],
  'Chogath': ['초가스', 'Cho\'Gath', 'チョ＝ガス', '虚空恐惧'],
  'Corki': ['코르키', 'Corki', 'コーキ', '英勇投弹手'],
  'Darius': ['다리우스', 'Darius', 'ダリウス', '诺克萨斯之手'],
  'Diana': ['다이애나', 'Diana', 'ダイアナ', '皎月女神'],
  'DrMundo': ['문도 박사', 'Dr. Mundo', 'ドクター・ムンド', '祖安狂人'],
  'Draven': ['드레이븐', 'Draven', 'ドレイヴン', '荣耀行刑官'],
  'Ekko': ['에코', 'Ekko', 'エコー', '时间刺客'],
  'Elise': ['엘리스', 'Elise', 'エリス', '蜘蛛女皇'],
  'Evelynn': ['이블린', 'Evelynn', 'イブリン', '痛苦之拥'],
  'Ezreal': ['이즈리얼', 'Ezreal', 'エズリアル', '探险家'],
  'Fiddlesticks': ['피들스틱', 'Fiddlesticks', 'フィドルスティックス', '远古恐惧'],
  'Fiora': ['피오라', 'Fiora', 'フィオラ', '无双剑姬'],
  'Fizz': ['피즈', 'Fizz', 'フィズ', '潮汐海灵'],
  'Galio': ['갈리오', 'Galio', 'ガリオ', '正义巨像'],
  'Gangplank': ['갱플랭크', 'Gangplank', 'ガングプランク', '海洋之灾'],
  'Garen': ['가렌', 'Garen', 'ガレン', '德玛西亚之力'],
  'Gnar': ['나르', 'Gnar', 'ナー', '迷失之牙'],
  'Gragas': ['그라가스', 'Gragas', 'グラガス', '酒桶'],
  'Graves': ['그레이브즈', 'Graves', 'グレイブス', '法外狂徒'],
  'Gwen': ['그웬', 'Gwen', 'グウェン', '灵罗娃娃'],
  'Hecarim': ['헤카림', 'Hecarim', 'ヘカリム', '战争之影'],
  'Heimerdinger': ['하이머딩거', 'Heimerdinger', 'ハイマーディンガー', '大发明家'],
  'Hwei': ['흐웨이', 'Hwei', 'フェイ', '异画师'],
  'Illaoi': ['일라오이', 'Illaoi', 'イラオイ', '海兽祭司'],
  'Irelia': ['이렐리아', 'Irelia', 'イレリア', '刀锋舞者'],
  'Ivern': ['아이번', 'Ivern', 'アイバーン', '翠神'],
  'Janna': ['잔나', 'Janna', 'ジャンナ', '风暴之怒'],
  'JarvanIV': ['자르반 4세', 'Jarvan IV', 'ジャーヴァンⅣ', '德玛西亚皇子'],
  'Jax': ['잭스', 'Jax', 'ジャックス', '武器大师'],
  'Jayce': ['제이스', 'Jayce', 'ジェイス', '未来守护者'],
  'Jhin': ['진', 'Jhin', 'ジン', '戏命师'],
  'Jinx': ['징크스', 'Jinx', 'ジンクス', '暴走萝莉'],
  'KSante': ['크산테', 'K\'Sante', 'カ・サンテ', '纳祖芒荣耀'],
  'Kaisa': ['카이사', 'Kai\'Sa', 'カイ＝サ', '虚空之女'],
  'Kalista': ['칼리스타', 'Kalista', 'カリスタ', '复仇之矛'],
  'Karma': ['카르마', 'Karma', 'カルマ', '天启者'],
  'Karthus': ['카서스', 'Karthus', 'カーサス', '死亡颂唱者'],
  'Kassadin': ['카사딘', 'Kassadin', 'カサディン', '虚空行者'],
  'Katarina': ['카타리나', 'Katarina', 'カタリナ', '不祥之刃'],
  'Kayle': ['케일', 'Kayle', 'ケイル', '正义天使'],
  'Kayn': ['케인', 'Kayn', 'ケイン', '影流之镰'],
  'Kennen': ['케넨', 'Kennen', 'ケネン', '狂暴之心'],
  'Khazix': ['카직스', 'Kha\'Zix', 'カ＝ジックス', '虚空掠夺者'],
  'Kindred': ['킨드레드', 'Kindred', 'キンドレッド', '永猎双子'],
  'Kled': ['클레드', 'Kled', 'クレッド', '暴怒骑士'],
  'KogMaw': ['코그모', 'Kog\'Maw', 'コグ＝マウ', '深渊巨口'],
  'Leblanc': ['르블랑', 'LeBlanc', 'ルブラン', '诡术妖姬'],
  'LeeSin': ['리 신', 'Lee Sin', 'リー・シン', '盲僧'],
  'Leona': ['레오나', 'Leona', 'レオナ', '曙光女神'],
  'Lillia': ['릴리아', 'Lillia', 'リリア', '含羞蓓蕾'],
  'Lissandra': ['리산드라', 'Lissandra', 'リサンドラ', '冰霜女巫'],
  'Locke': ['로크', 'Locke', 'ロック', '灰烬驱魔人'],
  'Lucian': ['루시안', 'Lucian', 'ルシアン', '圣枪游侠'],
  'Lulu': ['룰루', 'Lulu', 'ルル', '仙灵女巫'],
  'Lux': ['럭스', 'Lux', 'ラックス', '光辉女郎'],
  'Malphite': ['말파이트', 'Malphite', 'マルファイト', '熔岩巨兽'],
  'Malzahar': ['말자하', 'Malzahar', 'マルザハール', '虚空先知'],
  'Maokai': ['마오카이', 'Maokai', 'マオカイ', '扭曲树精'],
  'MasterYi': ['마스터 이', 'Master Yi', 'マスター・イー', '无极剑圣'],
  'Mel': ['멜', 'Mel', 'メル', '流光镜影'],
  'Milio': ['밀리오', 'Milio', 'ミリオ', '明烛'],
  'MissFortune': ['미스 포츈', 'Miss Fortune', 'ミス・フォーチュン', '赏金猎人'],
  'MonkeyKing': ['오공', 'Wukong', 'ウーコン', '齐天大圣'],
  'Mordekaiser': ['모데카이저', 'Mordekaiser', 'モルデカイザー', '铁铠冥魂'],
  'Morgana': ['모르가나', 'Morgana', 'モルガナ', '堕落天使'],
  'Naafiri': ['나피리', 'Naafiri', 'ナフィーリ', '百裂冥犬'],
  'Nami': ['나미', 'Nami', 'ナミ', '唤潮鲛姬'],
  'Nasus': ['나서스', 'Nasus', 'ナサス', '沙漠死神'],
  'Nautilus': ['노틸러스', 'Nautilus', 'ノーチラス', '深海泰坦'],
  'Neeko': ['니코', 'Neeko', 'ニーコ', '万花通灵'],
  'Nidalee': ['니달리', 'Nidalee', 'ニダリー', '狂野女猎手'],
  'Nilah': ['닐라', 'Nilah', 'ニーラ', '不羁之悦'],
  'Nocturne': ['녹턴', 'Nocturne', 'ノクターン', '永恒梦魇'],
  'Nunu': ['누누와 윌럼프', 'Nunu & Willump', 'ヌヌ＆ウィルンプ', '雪原双子'],
  'Olaf': ['올라프', 'Olaf', 'オラフ', '狂战士'],
  'Orianna': ['오리아나', 'Orianna', 'オリアナ', '发条魔灵'],
  'Ornn': ['오른', 'Ornn', 'オーン', '山隐之焰'],
  'Pantheon': ['판테온', 'Pantheon', 'パンテオン', '不屈之枪'],
  'Poppy': ['뽀삐', 'Poppy', 'ポッピー', '圣锤之毅'],
  'Pyke': ['파이크', 'Pyke', 'パイク', '血港鬼影'],
  'Qiyana': ['키아나', 'Qiyana', 'キヤナ', '元素女皇'],
  'Quinn': ['퀸', 'Quinn', 'クイン', '德玛西亚之翼'],
  'Rakan': ['라칸', 'Rakan', 'ラカン', '幻翎'],
  'Rammus': ['람머스', 'Rammus', 'ラムス', '披甲龙龟'],
  'RekSai': ['렉사이', 'Rek\'Sai', 'レク＝サイ', '虚空遁地兽'],
  'Rell': ['렐', 'Rell', 'レル', '镕铁少女'],
  'Renata': ['레나타 글라스크', 'Renata Glasc', 'レナータ・グラスク', '炼金男爵'],
  'Renekton': ['레넥톤', 'Renekton', 'レネクトン', '荒漠屠夫'],
  'Rengar': ['렝가', 'Rengar', 'レンガー', '傲之追猎者'],
  'Riven': ['리븐', 'Riven', 'リヴェン', '放逐之刃'],
  'Rumble': ['럼블', 'Rumble', 'ランブル', '机械公敌'],
  'Ryze': ['라이즈', 'Ryze', 'ライズ', '符文法师'],
  'Samira': ['사미라', 'Samira', 'サミーラ', '沙漠玫瑰'],
  'Sejuani': ['세주아니', 'Sejuani', 'セジュアニ', '北地之怒'],
  'Senna': ['세나', 'Senna', 'セナ', '涤魂圣枪'],
  'Seraphine': ['세라핀', 'Seraphine', 'セラフィーン', '星籁歌姬'],
  'Sett': ['세트', 'Sett', 'セト', '腕豪'],
  'Shaco': ['샤코', 'Shaco', 'シャコ', '恶魔小丑'],
  'Shen': ['쉔', 'Shen', 'シェン', '暮光之眼'],
  'Shyvana': ['쉬바나', 'Shyvana', 'シヴァーナ', '龙血武姬'],
  'Singed': ['신지드', 'Singed', 'シンジド', '炼金术士'],
  'Sion': ['사이온', 'Sion', 'サイオン', '亡灵战神'],
  'Sivir': ['시비르', 'Sivir', 'シヴィア', '战争女神'],
  'Skarner': ['스카너', 'Skarner', 'スカーナー', '上古领主'],
  'Smolder': ['스몰더', 'Smolder', 'スモルダー', '炽炎雏龙'],
  'Sona': ['소나', 'Sona', 'ソナ', '琴瑟仙女'],
  'Soraka': ['소라카', 'Soraka', 'ソラカ', '众星之子'],
  'Swain': ['스웨인', 'Swain', 'スウェイン', '诺克萨斯统领'],
  'Sylas': ['사일러스', 'Sylas', 'サイラス', '解脱者'],
  'Syndra': ['신드라', 'Syndra', 'シンドラ', '暗黑元首'],
  'TahmKench': ['탐 켄치', 'Tahm Kench', 'タム・ケンチ', '河流之王'],
  'Taliyah': ['탈리야', 'Taliyah', 'タリヤ', '岩雀'],
  'Talon': ['탈론', 'Talon', 'タロン', '刀锋之影'],
  'Taric': ['타릭', 'Taric', 'タリック', '瓦洛兰之盾'],
  'Teemo': ['티모', 'Teemo', 'ティーモ', '迅捷斥候'],
  'Thresh': ['쓰레쉬', 'Thresh', 'スレッシュ', '魂锁典狱长'],
  'Tristana': ['트리스타나', 'Tristana', 'トリスターナ', '麦林炮手'],
  'Trundle': ['트런들', 'Trundle', 'トランドル', '巨魔之王'],
  'Tryndamere': ['트린다미어', 'Tryndamere', 'トリンダメア', '蛮族之王'],
  'TwistedFate': ['트위스티드 페이트', 'Twisted Fate', 'ツイステッド・フェイト', '卡牌大师'],
  'Twitch': ['트위치', 'Twitch', 'トゥイッチ', '瘟疫之源'],
  'Udyr': ['우디르', 'Udyr', 'ウディア', '兽灵行者'],
  'Urgot': ['우르곳', 'Urgot', 'アーゴット', '无畏战车'],
  'Varus': ['바루스', 'Varus', 'ヴァルス', '惩戒之箭'],
  'Vayne': ['베인', 'Vayne', 'ヴェイン', '暗夜猎手'],
  'Veigar': ['베이가', 'Veigar', 'ベイガー', '邪恶小法师'],
  'Velkoz': ['벨코즈', 'Vel\'Koz', 'ヴェル＝コズ', '虚空之眼'],
  'Vex': ['벡스', 'Vex', 'ヴェックス', '愁云使者'],
  'Vi': ['바이', 'Vi', 'ヴァイ', '皮城执法官'],
  'Viego': ['비에고', 'Viego', 'ヴィエゴ', '破败之王'],
  'Viktor': ['빅토르', 'Viktor', 'ビクター', '奥术先驱'],
  'Vladimir': ['블라디미르', 'Vladimir', 'ブラッドミア', '猩红收割者'],
  'Volibear': ['볼리베어', 'Volibear', 'ボリベア', '不灭狂雷'],
  'Warwick': ['워윅', 'Warwick', 'ワーウィック', '祖安怒兽'],
  'Xayah': ['자야', 'Xayah', 'ザヤ', '逆羽'],
  'Xerath': ['제라스', 'Xerath', 'ゼラス', '远古巫灵'],
  'XinZhao': ['신 짜오', 'Xin Zhao', 'シン・ジャオ', '德邦总管'],
  'Yasuo': ['야스오', 'Yasuo', 'ヤスオ', '疾风剑豪'],
  'Yone': ['요네', 'Yone', 'ヨネ', '封魔剑魂'],
  'Yorick': ['요릭', 'Yorick', 'ヨリック', '牧魂人'],
  'Yunara': ['유나라', 'Yunara', 'ユナラ', '不破之誓'],
  'Yuumi': ['유미', 'Yuumi', 'ユーミ', '魔法猫咪'],
  'Zaahen': ['자헨', 'Zaahen', 'ザーヘン', '不落魔锋'],
  'Zac': ['자크', 'Zac', 'ザック', '生化魔人'],
  'Zed': ['제드', 'Zed', 'ゼド', '影流之主'],
  'Zeri': ['제리', 'Zeri', 'ゼリ', '祖安花火'],
  'Ziggs': ['직스', 'Ziggs', 'ジグス', '爆破鬼才'],
  'Zilean': ['질리언', 'Zilean', 'ジリアン', '时光守护者'],
  'Zoe': ['조이', 'Zoe', 'ゾーイ', '暮光星灵'],
  'Zyra': ['자이라', 'Zyra', 'ザイラ', '荆棘之兴'],
};


/* 디플러스 기아 공식 유튜브(@DplusKia_LOL · UCepHesz_5Lwr7qRaqjB-p1A) 재생목록
 * 2026-11-27 채널 재생목록 페이지에서 확인한 실제 ID·편수입니다. thumb 는 목록 첫 영상 썸네일. */
const DK_PLAYLISTS = [
  { id: 'PLRG5G_CO1tlo', thumb: 'XEXtPYNkPWg', n: 3,
    title: { ko: '2026 Worlds 딮터뷰', en: '2026 Worlds · DK Interview', ja: '2026 Worlds ディクインタビュー', zh: '2026 世界赛 · DK 专访' } },
  { id: 'PLfgIi8amvN7A', thumb: 'sWtO3OSF1k4', n: 7,
    title: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026' } },
  { id: 'PLqP9PZoXicPWtVT29eT2YRw2T9btvz9J7', thumb: 'xKWUGuS9Ly0', n: 28,
    title: { ko: '2026 정규시즌 딮터뷰', en: '2026 Regular Season · DK Interview', ja: '2026 レギュラーシーズン ディクインタビュー', zh: '2026 常规赛 · DK 专访' } },
  { id: 'PLqP9PZoXicPVvy4J6jfCqPzhmfgttDwXK', thumb: 'MZhN9B-TUF0', n: 7,
    title: { ko: '2026 THE MOMENT', en: '2026 THE MOMENT', ja: '2026 THE MOMENT', zh: '2026 THE MOMENT' } },
  { id: 'PLqP9PZoXicPV1mP4PJRXtqTActh2CRK8U', thumb: 'KvNvXc_b_xU', n: 12,
    title: { ko: '2026 승리의 딮터뷰', en: '2026 Victory · DK Interview', ja: '2026 勝利のディクインタビュー', zh: '2026 胜利专访' } },
  { id: 'PLqP9PZoXicPXPp7ovbHc5b1aB61PyARoV', thumb: '0CBrpQTp_so', n: 21,
    title: { ko: '2025 승리의 딮터뷰', en: '2025 Victory · DK Interview', ja: '2025 勝利のディクインタビュー', zh: '2025 胜利专访' } }
];

/* 디플러스 기아 공식 채널 영상(5인과 무관한 팀 단위) — 2026-11-27 재생목록·채널에서 확인 */
const DK_VIDEOS = [
  { id: 'XEXtPYNkPWg', len: '8:10', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs MKOI 스위스 3R', en: 'DK Interview · vs MKOI Swiss R3', ja: 'ディクインタビュー vs MKOI スイス3R', zh: 'DK 专访 · vs MKOI 瑞士轮 3R' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '더 높은 곳으로 — MKOI전 승리 직후', en: 'Higher still — right after beating MKOI', ja: 'もっと高い場所へ — MKOI戦勝利直後', zh: '向更高处 — 战胜 MKOI 之后' } },
  { id: 'CPVhODNOp7E', len: '24:21', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs T1 스위스 2R', en: 'DK Interview · vs T1 Swiss R2', ja: 'ディクインタビュー vs T1 スイス2R', zh: 'DK 专访 · vs T1 瑞士轮 2R' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '역전을 위한 최선의 수 — T1전', en: 'The best move to turn it around — vs T1', ja: '逆転のための最善手 — T1戦', zh: '逆转的最优解 — 对阵 T1' } },
  { id: 'uZFyMa0gUek', len: '7:51', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs G2 스위스 1R', en: 'DK Interview · vs G2 Swiss R1', ja: 'ディクインタビュー vs G2 スイス1R', zh: 'DK 专访 · vs G2 瑞士轮 1R' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '절망 속에서도 — G2전', en: 'Even in despair — vs G2', ja: '絶望の中でも — G2戦', zh: '即使在绝望中 — 对阵 G2' } },
  { id: 'hoFn9DSsdTQ', len: '4:14', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '월즈 녹아웃 티저 촬영기', en: 'Worlds knockout teaser — behind the shoot', ja: 'ワールズ決勝Tティザー撮影記', zh: '世界赛淘汰赛预告拍摄记' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '티저 한 편에 담긴 촬영 현장', en: 'The shoot behind one teaser', ja: 'ティザー1本の撮影現場', zh: '一支预告的拍摄现场' } },
  { id: 'vPqoNL7W_HM', len: '6:29', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '테크체크 비하인드', en: 'Tech check behind', ja: 'テックチェック舞台裏', zh: '设备检查花絮' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '월즈 생존신고 — 장비 점검 비하인드', en: 'Reporting live from Worlds — gear check', ja: 'ワールズ生存報告 — 機材チェック舞台裏', zh: '世界赛报到 — 装备检查花絮' } },
  { id: 'HO5CPhBrYlM', len: '3:49', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026, player: 'smash',
    match: { ko: '텍사스는 바베큐다', en: 'Texas is barbecue', ja: 'テキサスはバーベキューだ', zh: '德州就是烧烤' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '텍사스 바베큐 먹방 — 신금재', en: 'A Texas barbecue mukbang with Smash', ja: 'テキサスBBQモッパン — シン・クムジェ', zh: '德州烧烤吃播 — 申金宰' } },
  { id: 'QJIaTC-p8pg', len: '7:19', cat: 'highlight', channel: 'Dplus Kia', team: 'DK', year: 2026, champ: ['kaisa'],
    match: { ko: '카이사 올려놓기 장인', en: "A Kai'Sa carry specialist", ja: 'カイ＝サ育成の名人', zh: '卡莎带飞达人' },
    event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube' },
    point: { ko: '카이사 하나로 게임을 올려놓는 법', en: "How to lift a game on Kai'Sa alone", ja: 'カイ＝サ1本で試合を上げる方法', zh: '用卡莎一人带起全场' } },
  { id: 'MZhN9B-TUF0', len: '6:26', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs T1', en: 'the Moment · vs T1', ja: 'the Moment · vs T1', zh: 'the Moment · vs T1' },
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' },
    point: { ko: '솔리드한 원딜의 순간', en: 'The moment of a rock-solid bot laner', ja: 'ソリッドなADCの瞬間', zh: '稳健射手的瞬间' } },
  { id: 'FkoP2DBhFTk', len: '6:48', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs GEN', en: 'the Moment · vs GEN', ja: 'the Moment · vs GEN', zh: 'the Moment · vs GEN' },
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' },
    point: { ko: '악어는 협곡을 지배한다', en: 'The crocodile rules the Rift', ja: 'ワニはリフトを支配する', zh: '鳄鱼统治峡谷' } },
  { id: 'eXx3B3BZUHw', len: '4:01', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026, player: 'showmaker',
    match: { ko: 'the Moment · vs BRO', en: 'the Moment · vs BRO', ja: 'the Moment · vs BRO', zh: 'the Moment · vs BRO' },
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK' },
    point: { ko: '허허~ 쇼메이커ㄹrrrrr', en: 'Heh — ShowMakerrrrr', ja: 'ふふ〜ショーメイカーrrrr', zh: '呵呵 — ShowMakerrrrr' } },
  { id: 'qhC6sonTgAA', len: '6:46', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs T1 플레이오프', en: 'the Moment · vs T1 Playoffs', ja: 'the Moment · vs T1 プレーオフ', zh: 'the Moment · vs T1 季后赛' },
    event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛' },
    point: { ko: '루시드 = 강타의 신', en: 'Lucid = god of Smite', ja: 'ルシード＝スマイトの神', zh: 'Lucid = 惩戒之神' } },
  { id: 'sWtO3OSF1k4', len: '3:35', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'Worlds 2026 RECAP', en: 'Worlds 2026 RECAP', ja: 'Worlds 2026 RECAP', zh: 'Worlds 2026 RECAP' },
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛' },
    point: { ko: '2026 월즈 3분 요약', en: 'Worlds 2026 in three minutes', ja: '2026 ワールズ 3分まとめ', zh: '2026 世界赛三分钟回顾' } }
];

/* 소환사 주문 이름 (Riot 은 숫자 id → 영어 이름만 줍니다. 화면에서 네 언어로 바꿔 씁니다) */
const SPELLS = {
  'Flash': ['점멸', 'Flash', 'フラッシュ', '闪现'],
  'Teleport': ['순간이동', 'Teleport', 'テレポート', '传送'],
  'Ignite': ['점화', 'Ignite', 'イグナイト', '引燃'],
  'Ghost': ['유체화', 'Ghost', 'ゴースト', '幽灵疾步'],
  'Heal': ['회복', 'Heal', 'ヒール', '治疗术'],
  'Smite': ['강타', 'Smite', 'スマイト', '惩戒'],
  'Barrier': ['방어막', 'Barrier', 'バリア', '屏障'],
  'Exhaust': ['탈진', 'Exhaust', '疲労', '虚弱'],
  'Cleanse': ['정화', 'Cleanse', 'クレンズ', '净化'],
  'Mark': ['표식', 'Mark', 'マーク', '标记'],
  'Snowball': ['눈덩이', 'Snowball', 'スノーボール', '雪球']
};

/* 홈 상단 이벤트 · D-DAY (2026-11-27 확인)
 *  - 2026 LCK 어워드: 12월 16일(수) 치지직 롤파크 개최 · CHZZK/SOOP 생중계 (라이엇 게임즈 11-05 발표)
 *    팬 팀 투표(업비트 ALL-TIME HIGH)는 11-26 23:59 마감, 올해의 선수·포지션별 선수는 선정단 투표로 시상식 당일 공개.
 *  - 2027 LCK 컵: 개막일 공식 발표 전(1월~2월 예정) — 2026 시즌 개막일(1/14)을 기준으로 '예상' 카운트다운만 표시합니다.
 *  날짜가 확정되거나 새 이벤트가 생기면 이 표만 고치면 됩니다. (지난 이벤트는 앱이 자동으로 숨깁니다) */
const EVENTS = [
  {
    id: 'lck-awards-2026',
    date: '2026-12-16',
    kind: 'awards',
    title: { ko: '2026 LCK 어워드', en: '2026 LCK Awards', ja: '2026 LCKアワード', zh: '2026 LCK 颁奖礼' },
    sub: {
      ko: '치지직 롤파크 · CHZZK·SOOP 생중계',
      en: 'CHZZK LoL Park, Seoul · live on CHZZK & SOOP',
      ja: 'CHZZK LoL Park・CHZZK/SOOP 生中継',
      zh: 'CHZZK LoL Park · CHZZK/SOOP 直播'
    },
    note: {
      ko: 'DK 스매쉬 신인왕 · 팬 팀 투표 11.26 마감',
      en: 'DK Smash won Rookie of the Year · fan team vote closed 11/26',
      ja: 'DK スマッシュ新人王・ファン投票は11/26終了',
      zh: 'DK Smash 最佳新人 · 粉丝投票 11/26 截止'
    },
    url: 'https://lolesports.com/ko-KR/news/2026-lck-awards-voting-method-and-criteria'
  },
  {
    id: 'lck-cup-2027',
    date: '2027-01-14',
    tentative: true,
    kind: 'season',
    title: { ko: '2027 LCK 컵', en: '2027 LCK Cup', ja: '2027 LCKカップ', zh: '2027 LCK 杯' },
    sub: {
      ko: '개막일 미발표 · 1월 중순 예상',
      en: 'Opening day not announced · mid-January expected',
      ja: '開幕日未発表・1月中旬の見込み',
      zh: '开幕日未公布 · 预计1月中旬'
    },
    note: {
      ko: '2026 시즌은 1월 14일 개막 · 확정되면 알려드려요',
      en: 'The 2026 season opened on Jan 14 — this updates when LCK confirms',
      ja: '2026シーズンは1月14日開幕・確定次第更新',
      zh: '2026 赛季 1月14日开幕 · 确定后更新'
    },
    url: 'https://lolesports.com/ko-KR/schedule'
  }
];

/* Data Dragon 이미지 CDN (챔피언·스펠 아이콘) — api/_lib/champions.js 와 같은 버전 */
const DD_CDN = 'https://ddragon.leagueoflegends.com/cdn/16.23.1';

/* Riot 은 스펠 숫자 id → 영어 이름('Flash')을 주고, 아이콘 파일 이름은 'SummonerFlash' 입니다. */
const SPELL_IMG = {
  'Flash': 'SummonerFlash', 'Teleport': 'SummonerTeleport', 'Ignite': 'SummonerDot',
  'Ghost': 'SummonerHaste', 'Heal': 'SummonerHeal', 'Smite': 'SummonerSmite',
  'Barrier': 'SummonerBarrier', 'Exhaust': 'SummonerExhaust', 'Cleanse': 'SummonerBoost',
  'Mark': 'SummonerSnowball', 'Snowball': 'SummonerSnowball'
};
