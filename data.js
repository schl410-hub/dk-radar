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
    ja: 'https://lolesports.com/ja-JP/schedule', 'vi': 'https://lolesports.com/en-US/schedule'}
};

/* 하이라이트 아카이브 태그 — 검색과 배지에 함께 씁니다 (KO/EN/JA/ZH) */
const HL_TAGS = {
  lck: { ko: 'LCK', en: 'LCK', ja: 'LCK', zh: 'LCK', 'vi': 'LCK'},
  worlds: { ko: '월즈', en: 'Worlds', ja: 'ワールズ', zh: '世界赛', 'vi': 'Worlds'},
  msi: { ko: 'MSI', en: 'MSI', ja: 'MSI', zh: 'MSI', 'vi': 'MSI'},
  lckcup: { ko: 'LCK 컵', en: 'LCK Cup', ja: 'LCKカップ', zh: 'LCK 杯', 'vi': 'LCK Cup'},
  playoffs: { ko: '플레이오프', en: 'Playoffs', ja: 'プレーオフ', zh: '季后赛', 'vi': 'Playoffs'},
  final: { ko: '결승', en: 'Final', ja: '決勝', zh: '决赛', 'vi': 'Chung kết'},
  pentakill: { ko: '펜타킬', en: 'Pentakill', ja: 'ペンタキル', zh: '五杀', 'vi': 'Pentakill'},
  carry: { ko: '캐리', en: 'Carry', ja: 'キャリー', zh: '带飞', 'vi': 'Gánh đội'},
  comeback: { ko: '역전극', en: 'Comeback', ja: '逆転劇', zh: '逆转', 'vi': 'Lội ngược dòng'},
  top: { ko: '탑', en: 'Top', ja: 'トップ', zh: '上路', 'vi': 'Đường trên'},
  jgl: { ko: '정글', en: 'Jungle', ja: 'ジャングル', zh: '打野', 'vi': 'Đi rừng'},
  mid: { ko: '미드', en: 'Mid', ja: 'ミッド', zh: '中路', 'vi': 'Đường giữa'},
  adc: { ko: '원딜', en: 'ADC', ja: 'ADC', zh: '射手', 'vi': 'Xạ thủ'},
  sup: { ko: '서폿', en: 'Support', ja: 'サポート', zh: '辅助', 'vi': 'Hỗ trợ'},
  rookie: { ko: '신인왕', en: 'Rookie of the Year', ja: '新人王', zh: '最佳新人', 'vi': 'Tân binh xuất sắc nhất'},
  win300: { ko: '300승', en: '300th win', ja: '通算300勝', zh: '300胜', 'vi': '300 trận thắng'},
  champion: { ko: '우승', en: 'Title', ja: '優勝', zh: '冠军', 'vi': 'Vô địch'},
  debut: { ko: '데뷔', en: 'Debut', ja: 'デビュー', zh: '出道', 'vi': 'Ra mắt'},
  gnar: { ko: '나르', en: 'Gnar', ja: 'ナー', zh: '纳尔', 'vi': 'Gnar'},
  jayce: { ko: '제이스', en: 'Jayce', ja: 'ジェイス', zh: '杰斯', 'vi': 'Jayce'},
  azir: { ko: '아지르', en: 'Azir', ja: 'アジール', zh: '阿兹尔', 'vi': 'Azir'},
  leblanc: { ko: '르블랑', en: 'LeBlanc', ja: 'ルブラン', zh: '乐芙兰', 'vi': 'LeBlanc'},
  ambessa: { ko: '암베사', en: 'Ambessa', ja: 'アンベッサ', zh: '安蓓萨', 'vi': 'Ambessa'},
  kaisa: { ko: '카이사', en: "Kai'Sa", ja: 'カイ＝サ', zh: '卡莎', 'vi': 'Kai\'Sa'},
  ksante: { ko: '크산테', en: "K'Sante", ja: 'カサンテ', zh: '克桑提', 'vi': 'K\'Sante'},
  rumble: { ko: '럼블', en: 'Rumble', ja: 'ランブル', zh: '兰博', 'vi': 'Rumble'},
  syndra: { ko: '신드라', en: 'Syndra', ja: 'シンドラ', zh: '辛德拉', 'vi': 'Syndra'},
  yone: { ko: '요네', en: 'Yone', ja: 'ヨネ', zh: '永恩', 'vi': 'Yone'},
  taliyah: { ko: '탈리야', en: 'Taliyah', ja: 'タリヤ', zh: '塔莉垭', 'vi': 'Taliyah'},
  zoe: { ko: '조이', en: 'Zoe', ja: 'ゾーイ', zh: '佐伊', 'vi': 'Zoe'},
  wukong: { ko: '오공', en: 'Wukong', ja: 'ウーコン', zh: '悟空', 'vi': 'Wukong'},
  olaf: { ko: '올라프', en: 'Olaf', ja: 'オラフ', zh: '奥拉夫', 'vi': 'Olaf'},
  nasus: { ko: '나서스', en: 'Nasus', ja: 'ナサス', zh: '内瑟斯', 'vi': 'Nasus'},
  kled: { ko: '클레드', en: 'Kled', ja: 'クレッド', zh: '克烈', 'vi': 'Kled'}
};

/* 영상 카테고리 — 아카이브 칩과 카드 배지에 함께 씁니다 */
const HL_CATS = {
  highlight: { ko: '하이라이트', en: 'Highlights', ja: 'ハイライト', zh: '高光', 'vi': 'Highlight'},
  madmovie: { ko: '매드무비', en: 'Montage', ja: 'マッドムービー', zh: '剪辑', 'vi': 'Montage'},
  behind: { ko: '딮터뷰·비하인드', en: 'Interview & behind', ja: 'インタビュー・舞台裏', zh: '专访·花絮', 'vi': 'Phỏng vấn & hậu trường'},
  shorts: { ko: '쇼츠', en: 'Shorts', ja: 'ショート', zh: '短片', 'vi': 'Shorts'}
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
    debut: '2019-07-20',
    debutNote: { ko: '2019 LCK 서머 · Griffin', en: 'LCK Summer 2019 · Griffin', ja: '2019 LCKサマー · Griffin', zh: '2019 LCK 夏季赛 · Griffin', vi: 'LCK Mùa Hè 2019 · Griffin' },
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
      { id: 'FDos-nzB8HE', len: '10:04', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 도베사', en: 'Doran · Ambessa', ja: 'ドラン · アンベッサ', zh: '多兰 · 安蓓萨', 'vi': 'Doran · Ambessa'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: ['top', 'carry'], cat: 'highlight', champ: ['ambessa'], point: { ko: '도베사 발견', en: 'Doran + Ambessa spotted', ja: 'ドベッサ発見', zh: '发现“多蓓萨”', vi: 'Doran + Ambessa xuất hiện' } },
      { id: '7wZxtaNDCTI', len: '9:48', channel: 'T1', team: 'T1', year: 2025, match: { ko: '도란 · 암베사 연습', en: 'Doran · Ambessa practice', ja: 'ドラン · アンベッサ練習', zh: '多兰 · 安蓓萨练习', 'vi': 'Doran · luyện Ambessa'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: ['top'], cat: 'highlight', champ: ['ambessa'], point: { ko: '도란의 암베사 깎기 1일차', en: 'Doran grinds Ambessa, day one', ja: 'ドランのアンベッサ仕上げ1日目', zh: '多兰打磨安蓓萨第一天', vi: 'Doran luyện Ambessa ngày 1' } },
      { id: 'uzkulCX1cvw', len: '12:13', channel: 'LCK', team: 'T1', year: 2026, match: { ko: 'T1 vs BFX · 4세트', en: 'T1 vs BFX · Game 4', ja: 'T1 vs BFX 第4試合', zh: 'T1 vs BFX · 第4局', 'vi': 'T1 vs BFX · Ván 4'}, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026 (Woori Bank)'}, tags: ['playoffs', 'lck', 'top'] , cat: 'highlight', point: { ko: '건실한 청년, 4세트를 매듭짓다', en: 'The steady hand closes out Game 4', ja: '堅実な青年、第4試合を締める', zh: '沉稳青年收下第4局', vi: 'Chàng trai vững chãi khép lại ván 4' } },

      { id: 'zmt-dT7garg', len: '13:10', channel: 'LCK', team: 'T1', year: 2026, match: { ko: 'T1 vs DK · 2세트', en: 'T1 vs DK · Game 2', ja: 'T1 vs DK 第2試合', zh: 'T1 vs DK · 第2局', 'vi': 'T1 vs DK · Ván 2'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'top', 'carry'] , cat: 'highlight', point: { ko: '서커스를 시작해볼까', en: 'Shall we start the circus?', ja: 'サーカスを始めようか', zh: '来场马戏吧', vi: 'Bắt đầu màn xiếc nhé?' } },

      { id: 'sqjM3EJO7ng', len: '11:04', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs HLE · 4세트', en: 'T1 vs HLE · Game 4', ja: 'T1 vs HLE 第4試合', zh: 'T1 vs HLE · 第4局', 'vi': 'T1 vs HLE · Ván 4'}, event: { ko: '2025 우리은행 LCK CUP 플레이오프', en: '2025 LCK Cup Playoffs', ja: '2025 LCKカップ プレーオフ', zh: '2025 LCK 杯 季后赛', 'vi': 'Playoffs LCK Cup 2025 (Woori Bank)'}, tags: ['lckcup', 'playoffs', 'top'] , cat: 'highlight', point: { ko: '짜잔, 내가 도란왔다', en: 'Ta-da — Doran has arrived', ja: 'じゃじゃーん、ドラン参上', zh: '闪亮登场，多兰来了', vi: 'Ta-da, Doran đã đến' } },

      { id: 'gJarHbioMEg', len: '11:00', channel: 'LCK', team: 'Gen.G', year: 2023, match: { ko: 'T1 vs GEN · 1세트', en: 'T1 vs GEN · Game 1', ja: 'T1 vs GEN 第1試合', zh: 'T1 vs GEN · 第1局', 'vi': 'T1 vs GEN · Ván 1'}, event: { ko: '2023 LCK 스프링 결승', en: '2023 LCK Spring Final', ja: '2023 LCK スプリング決勝', zh: '2023 LCK 春季赛决赛', 'vi': 'Chung kết LCK Mùa Xuân 2023'}, tags: ['lck', 'final', 'top', 'carry'] , cat: 'highlight', point: { ko: '도란의 탑 단속', en: 'Doran\'s top-lane crackdown', ja: 'ドランのトップ取り締まり', zh: '多兰的上路整治', vi: 'Doran dọn dẹp đường trên' } },

      { id: 'H4Tp-sRSp2Y', len: '3:02', channel: 'LoL Esports', team: 'HLE', year: 2024, match: { ko: '도란 · 나르 대형 궁', en: 'Doran · huge Gnar ult', ja: 'ドラン · ナー特大ウルト', zh: 'Doran · 纳尔巨量控制', 'vi': 'Doran · chiêu cuối Gnar cực lớn'}, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS', 'vi': 'LoL Esports · TOP 5 PHA HAY'}, tags: ['top', 'carry', 'gnar'] , cat: 'highlight', champ: ['gnar'], point: { ko: '나르 메가 궁 한 방', en: 'One huge Mega Gnar ult', ja: 'ナー メガウルト一発', zh: '纳尔巨型形态一记大招', vi: 'Một chiêu cuối Mega Gnar' } },

      { id: 'q_2YoaayhFg', len: '3:29', channel: 'LoL Esports', team: 'Gen.G', year: 2023, match: { ko: 'Gen.G vs T1 · LCK 결승', en: 'Gen.G vs T1 · LCK Final', ja: 'Gen.G vs T1 · LCK決勝', zh: 'Gen.G vs T1 · LCK决赛', 'vi': 'Gen.G vs T1 · Chung kết LCK'}, event: { ko: 'LoL Esports · Plays of the Week', en: 'LoL Esports · Plays of the Week', ja: 'LoL Esports · Plays of the Week', zh: 'LoL Esports · Plays of the Week', 'vi': 'LoL Esports · Pha hay trong tuần'}, tags: ['lck', 'final', 'carry', 'comeback'] , cat: 'highlight', point: { ko: '결승에서 T1을 무너뜨린 이변', en: 'The upset that wrecked T1 in the final', ja: '決勝でT1を崩した番狂わせ', zh: '决赛掀翻 T1 的爆冷', vi: 'Cú lật đổ T1 ở chung kết' } },

      { id: 'J8XPHKlTBLM', len: '8:27', channel: 'LoL Esports', team: 'DRX', year: 2020, match: { ko: 'DRX · 월즈 그룹 스테이지', en: 'DRX · Worlds group stage', ja: 'DRX · ワールズ グループステージ', zh: 'DRX · 世界赛小组赛', 'vi': 'DRX · vòng bảng Worlds'}, event: { ko: 'Worlds 2020 · Lane Kingdom', en: 'Worlds 2020 · Lane Kingdom', ja: 'Worlds 2020 · Lane Kingdom', zh: 'Worlds 2020 · Lane Kingdom', 'vi': 'Worlds 2020 · Lane Kingdom'}, tags: ['worlds', 'top', 'carry', 'jayce'] , cat: 'highlight', champ: ['jayce'], point: { ko: '월즈 그룹 스테이지 제이스 캐리', en: 'Jayce carries the Worlds group stage', ja: 'ワールズGSのジェイスキャリー', zh: '世界赛小组赛的杰斯带飞', vi: 'Jayce gánh vòng bảng Worlds' } },
      { id: 'geP1C28wCeE', len: '3:20', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 이별 영상', en: 'Doran farewell film', ja: 'ドラン 卒業映像', zh: '多兰告别影像', 'vi': 'Video chia tay của Doran'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'behind', player: 'doran', point: { ko: '고마워요, 최현준 — T1과의 2년', en: 'Thank you, Hyeon-jun — two years with T1', ja: 'ありがとう、チェ・ヒョンジュン — T1での2年', zh: '谢谢你，崔现准 — 与 T1 的两年', 'vi': 'Cảm ơn Hyeon-jun — hai năm cùng T1'} },
      { id: 'o1E-pxEdRw8', len: '9:46', channel: 'T1', team: 'T1', year: 2026, match: { ko: 'T1 vs MKOI · 스위스 3R', en: 'T1 vs MKOI · Swiss R3', ja: 'T1 vs MKOI スイス3R', zh: 'T1 vs MKOI · 瑞士轮 3R', 'vi': 'T1 vs MKOI · Thụy Sĩ vòng 3'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', player: 'doran', point: { ko: '불멸의 도란, MKOI전', en: 'Immortal Doran vs MKOI', ja: '不滅のドラン、MKOI戦', zh: '不灭的多兰，对阵 MKOI', 'vi': 'Doran bất tử, gặp MKOI'} },
      { id: 'oxbm2AhUrzs', len: '11:33', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 탑', en: 'Doran · Top', ja: 'ドラン · トップ', zh: '多兰 · 上路', 'vi': 'Doran · Đường trên'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'doran', point: { ko: '도끼보다 망치', en: 'Hammer over axe', ja: '斧よりハンマー', zh: '比起斧头，锤子更好', 'vi': 'Búa hơn rìu'} },
      { id: 'g0t_SV-6ykU', len: '10:27', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 크산테', en: 'Doran · K\'Sante', ja: 'ドラン · カサンテ', zh: '多兰 · 克桑提', 'vi': 'Doran · K\'Sante'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', champ: ['ksante'], player: 'doran', point: { ko: '도도한 도산테', en: 'Doran the K\'Sante', ja: 'ドドンなドサンテ', zh: '傲娇的多兰桑提', 'vi': 'Doran K\'Sante đầy kiêu hãnh'} },
      { id: '8vMuHvDkNFg', len: '9:07', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 탑', en: 'Doran · Top', ja: 'ドラン · トップ', zh: '多兰 · 上路', 'vi': 'Doran · Đường trên'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'doran', point: { ko: '분노조절 잘해', en: 'Anger management, mastered', ja: '怒りのコントロールは完璧', zh: '情绪管理很到位', 'vi': 'Kiểm soát cơn giận quá giỏi'} },
      { id: 'N_YDbqf8BuE', len: '9:35', channel: 'T1', team: 'T1', year: 2026, match: { ko: '도란 · 탑', en: 'Doran · Top', ja: 'ドラン · トップ', zh: '多兰 · 上路', 'vi': 'Doran · Đường trên'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'doran', point: { ko: '현준이가 현준이에게', en: 'Hyeon-jun versus Hyeon-jun', ja: 'ヒョンジュンがヒョンジュンに', zh: '现准对现准', 'vi': 'Hyeon-jun gặp Hyeon-jun'} },
      { id: 'YsBGfmshBNU', len: '8:56', channel: 'T1', team: 'T1', year: 2025, match: { ko: '도란 · 럼블', en: 'Doran · Rumble', ja: 'ドラン · ランブル', zh: '多兰 · 兰博', 'vi': 'Doran · Rumble'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', champ: ['rumble'], player: 'doran', point: { ko: '슈퍼 갤럭시 란블 출격', en: 'Super Galaxy Rumble deploys', ja: 'スーパーギャラクシー・ランブル出撃', zh: '超级银河兰博出击', 'vi': 'Super Galaxy Rumble xuất trận'} },
      { id: 'DG6ZjU_hrPA', len: '11:29', channel: 'LCK', team: 'HLE', year: 2024, match: { ko: 'KT vs HLE · 2세트', en: 'KT vs HLE · Game 2', ja: 'KT vs HLE 第2試合', zh: 'KT vs HLE · 第2局', 'vi': 'KT vs HLE · Ván 2'}, event: { ko: '2024 LCK 서머', en: '2024 LCK Summer', ja: '2024 LCK サマー', zh: '2024 LCK 夏季赛', 'vi': 'LCK Mùa Hè 2024'}, tags: [], cat: 'highlight', champ: ['gnar'], player: 'doran', point: { ko: '마! 도란나르!', en: 'Doran Gnar, take that!', ja: 'それっ、ドランナー！', zh: '看招，多兰纳尔！', 'vi': 'Đấy! Doran Gnar!'} },
      { id: '2N5-fS-7D18', len: '6:59', channel: 'LCK', team: 'T1', year: 2026, match: { ko: 'DNS vs T1 · 2세트', en: 'DNS vs T1 · Game 2', ja: 'DNS vs T1 第2試合', zh: 'DNS vs T1 · 第2局', 'vi': 'DNS vs T1 · Ván 2'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'highlight', champ: ['gnar'], player: 'doran', point: { ko: '경기 종료 나르 캐리', en: 'Gnar closes it out', ja: '試合を決めたナー', zh: '纳尔终结比赛', 'vi': 'Gnar kết liễu trận đấu'} },
      { id: 'ih-YpqA-Bgs', len: '17:15', channel: 'T1', team: 'T1', year: 2026, match: { ko: 'T1 비하인드', en: 'T1 behind', ja: 'T1 舞台裏', zh: 'T1 花絮', 'vi': 'Hậu trường T1'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'behind', player: 'doran', point: { ko: '도란 강아지 유치원 1편', en: 'Doran\'s puppy kindergarten, ep.1', ja: 'ドランの子犬幼稚園 第1話', zh: '多兰小狗幼儿园 第1集', 'vi': 'Lớp mẫu giáo cún của Doran, tập 1'} },
      { id: 'OmYopXkcbQk', len: '20:20', channel: 'T1', team: 'T1', year: 2026, match: { ko: 'T1 봉사 활동', en: 'T1 volunteer day', ja: 'T1 奉仕活動', zh: 'T1 公益活动', 'vi': 'Ngày tình nguyện của T1'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'behind', player: 'doran', point: { ko: 'T1 WISH RUN with 도란', en: 'T1 WISH RUN with Doran', ja: 'T1 WISH RUN with ドラン', zh: 'T1 WISH RUN 与多兰', 'vi': 'T1 WISH RUN cùng Doran'} },
    ],
    note: { ko: '', en: '', ja: '', zh: '', 'vi': ''},
    official: {
      stage: { ko: 'Worlds 2026 · 4강', en: 'Worlds 2026 · Semifinals', ja: 'Worlds 2026 · ベスト4', zh: 'Worlds 2026 · 四强', 'vi': 'Worlds 2026 · Bán kết'},
      team: 'T1', opp: 'BLG', score: '1 : 3', win: false, date: { ko: '11. 09.', en: 'Nov 9', ja: '11月9日', zh: '11月9日', 'vi': '09/11'}
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, result: 'SEMI', set: { w: 8, l: 5 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026', 'vi': 'MSI 2026'}, result: '', set: { w: 15, l: 6 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛', 'vi': 'Playoffs LCK 2026'}, result: '', set: { w: 9, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮', 'vi': 'LCK 2026 vòng 1-2'}, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯', 'vi': 'LCK Cup 2026'}, result: '', set: { w: 14, l: 9 } },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026', 'vi': 'EWC 2026'}, result: '', set: { w: 7, l: 5 } }
    ],
    worlds: { stageKey: 'SEMI', line: { ko: 'BLG에 1:3 패배', en: 'Lost 1–3 to BLG', ja: 'BLGに1-3で敗退', zh: '1:3 负于 BLG', 'vi': 'Thua BLG 1-3'}, date: { ko: '2026. 11. 09', en: 'Nov 9, 2026', ja: '2026年11月9日', zh: '2026年11月9日', 'vi': '09/11/2026'} }
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
    debut: '2019-06-09',
    debutNote: { ko: '2019 LPL 서머 · JD Gaming', en: 'LPL Summer 2019 · JD Gaming', ja: '2019 LPLサマー · JD Gaming', zh: '2019 LPL 夏季赛 · JD Gaming', vi: 'LPL Mùa Hè 2019 · JD Gaming' },
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
      { id: 'Ws93_VsEx-s', len: '12:39', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 3세트', en: 'HLE vs T1 · Game 3', ja: 'HLE vs T1 第3試合', zh: 'HLE vs T1 · 第3局', 'vi': 'HLE vs T1 · Ván 3'}, event: { ko: '2026 LCK 로드 투 MSI', en: '2026 LCK Road to MSI', ja: '2026 LCK ロード・トゥMSI', zh: '2026 LCK 通往 MSI', 'vi': 'LCK 2026 · Road to MSI'}, tags: ['lck', 'jgl', 'carry'] , cat: 'highlight', point: { ko: '벌처럼 날아 나비처럼 쏜다', en: 'Flies like a bee, stings like a butterfly', ja: '蜂のように飛び、蝶のように刺す', zh: '像蜜蜂般飞，像蝴蝶般出击', vi: 'Bay như ong, chích như bướm' } },

      { id: 'fOUtkqYy1VE', len: '10:02', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'DK vs HLE · 1세트', en: 'DK vs HLE · Game 1', ja: 'DK vs HLE 第1試合', zh: 'DK vs HLE · 第1局', 'vi': 'DK vs HLE · Ván 1'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'jgl'] , cat: 'highlight', point: { ko: 'LPL 유학생 출신 카정 카씨', en: 'The LPL-trained jungle thief', ja: 'LPL留学帰りのジャングル泥棒', zh: 'LPL 归来的野区小偷', vi: 'Kẻ cướp rừng từng học LPL' } },

      { id: 'iNQxu7iC6pU', len: '10:51', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 2세트', en: 'HLE vs T1 · Game 2', ja: 'HLE vs T1 第2試合', zh: 'HLE vs T1 · 第2局', 'vi': 'HLE vs T1 · Ván 2'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'jgl', 'carry'] , cat: 'highlight', point: { ko: '번개의 신, 경기를 가져오다', en: 'The god of thunder takes the game', ja: '雷神、試合を持っていく', zh: '雷神拿下比赛', vi: 'Thần sấm đoạt lấy ván đấu' } },

      { id: 'OUHbIAms4F4', len: '0:25', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: 'HLE · G2 상대 정글 장악', en: 'HLE · jungle grip vs G2', ja: 'HLE · G2戦のジャングル掌握', zh: 'HLE · 对 G2 的野区压制', 'vi': 'HLE · chiếm rừng trước G2'}, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮', 'vi': 'Worlds 2026 · Thụy Sĩ'}, tags: ['worlds', 'jgl', 'carry'] , cat: 'shorts', point: { ko: 'G2 정글을 폭파하다', en: 'Blowing up G2’s jungle', ja: 'G2のジャングルを爆破', zh: '炸穿 G2 野区', vi: 'Cho nổ tung khu rừng của G2' } },

      { id: 'pPqJXwXuSDE', len: '0:56', channel: 'LoL Esports', team: 'JDG', year: 2023, match: { ko: '카나비 · 완벽한 각도', en: 'Kanavi · the perfect angle', ja: 'カナビ · 完璧な角度', zh: 'Kanavi · 完美角度', 'vi': 'Kanavi · góc đánh hoàn hảo'}, event: { ko: 'LoL Esports · 플레이 클립', en: 'LoL Esports · play clip', ja: 'LoL Esports · プレイクリップ', zh: 'LoL Esports · 精彩片段', 'vi': 'LoL Esports · clip pha đấu'}, tags: ['jgl', 'carry'] , cat: 'shorts', point: { ko: '언제나 완벽한 각도', en: 'Always the perfect angle', ja: 'いつでも完璧な角度', zh: '永远完美的角度', vi: 'Lúc nào cũng đúng góc hoàn hảo' } },

      { id: 'SMxpnilYSyU', len: '0:09', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: '카나비 · 다시 정상에', en: 'Kanavi · champion again', ja: 'カナビ · 再び頂点へ', zh: 'Kanavi · 再度夺冠', 'vi': 'Kanavi · trở lại đỉnh cao'}, event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026', 'vi': 'MSI 2026'}, tags: ['msi', 'champion', 'jgl'] , cat: 'shorts', point: { ko: '다시 정상에 선 카나비', en: 'Kanavi, back on top', ja: '再び頂点へ、カナビ', zh: '重返巅峰的 Kanavi', vi: 'Kanavi trở lại đỉnh' } },
      { id: 'oKXw1EWZ8R4', len: '11:55', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: '밥이나 먹을까?', en: 'Let\'s grab a bite', ja: '飯でも食おうか', zh: '一起吃个饭吧', 'vi': 'Đi ăn chút gì nhé?'}, event: { ko: '한화생명 공식 유튜브', en: 'Hanwha Life official YouTube', ja: 'ハンファ生命 公式YouTube', zh: '韩华生命 官方 YouTube', 'vi': 'YouTube chính thức Hanwha Life'}, tags: [], cat: 'behind', player: 'kanavi', point: { ko: '소고기 사주는 사람을 주의하세요 — 카나비·딜라이트편', en: 'Beware the one buying beef — Kanavi & Delight', ja: '焼肉をごちそうする人に注意 — カナビ・ディライト編', zh: '小心请你吃牛肉的人 — Kanavi·Delight 篇', 'vi': 'Cẩn thận người mời ăn thịt bò — Kanavi & Delight'} },
      { id: 'iWW9C11UgUo', len: '10:48', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: 'HLE · 정글', en: 'HLE · Jungle', ja: 'HLE · ジャングル', zh: 'HLE · 打野', 'vi': 'HLE · Đi rừng'}, event: { ko: '한화생명 공식 유튜브', en: 'Hanwha Life official YouTube', ja: 'ハンファ生命 公式YouTube', zh: '韩华生命 官方 YouTube', 'vi': 'YouTube chính thức Hanwha Life'}, tags: [], cat: 'highlight', player: 'kanavi', point: { ko: '두 개의 심장, 카버지', en: 'Two hearts, Kanavi', ja: '二つの心、カナビ', zh: '两颗心脏，Kanavi', 'vi': 'Hai trái tim, Kanavi'} },
      { id: 'PfNJVJ5fRrY', len: '13:17', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: 'HLE · 정글', en: 'HLE · Jungle', ja: 'HLE · ジャングル', zh: 'HLE · 打野', 'vi': 'HLE · Đi rừng'}, event: { ko: '한화생명 공식 유튜브', en: 'Hanwha Life official YouTube', ja: 'ハンファ生命 公式YouTube', zh: '韩华生命 官方 YouTube', 'vi': 'YouTube chính thức Hanwha Life'}, tags: [], cat: 'highlight', player: 'kanavi', point: { ko: '새벽 3시에 카정하는 사람이 어딨냐구', en: 'Who counter-jungles at 3 a.m.?', ja: '深夜3時にカウンタージャングルする人なんている？', zh: '谁会凌晨三点来反野？', 'vi': 'Ai lại đi cướp rừng lúc 3 giờ sáng chứ'} },
      { id: 'Ct4Rn6-TjIY', len: '15:49', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: 'HLE · 정글', en: 'HLE · Jungle', ja: 'HLE · ジャングル', zh: 'HLE · 打野', 'vi': 'HLE · Đi rừng'}, event: { ko: '한화생명 공식 유튜브', en: 'Hanwha Life official YouTube', ja: 'ハンファ生命 公式YouTube', zh: '韩华生命 官方 YouTube', 'vi': 'YouTube chính thức Hanwha Life'}, tags: [], cat: 'highlight', player: 'kanavi', point: { ko: '진짜 총을 들고 오면 어떡해', en: 'What if he brings a real gun?', ja: '本物の銃を持ってきたらどうするの', zh: '真拿枪来了怎么办', 'vi': 'Nếu anh ta mang súng thật thì sao'} },
      { id: 'rpo52x-xi8Y', len: '8:29', channel: 'LCK', team: 'JDG', year: 2023, match: { ko: 'JDG vs T1 · 4세트', en: 'JDG vs T1 · Game 4', ja: 'JDG vs T1 第4試合', zh: 'JDG vs T1 · 第4局', 'vi': 'JDG vs T1 · Ván 4'}, event: { ko: '2023 MSI', en: 'MSI 2023', ja: '2023 MSI', zh: '2023 MSI', 'vi': 'MSI 2023'}, tags: [], cat: 'highlight', champ: ['wukong'], player: 'kanavi', point: { ko: '오공의 믹서기', en: 'Wukong, the blender', ja: '悟空のミキサー', zh: '悟空搅拌机', 'vi': 'Máy xay của Wukong'} },
      { id: 'K_EKujzbEQw', len: '2:25', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: 'HLE 공식 응원가', en: 'HLE official chant', ja: 'HLE 公式応援歌', zh: 'HLE 官方应援歌', 'vi': 'Bài cổ vũ chính thức của HLE'}, event: { ko: '한화생명 공식 유튜브', en: 'Hanwha Life official YouTube', ja: 'ハンファ生命 公式YouTube', zh: '韩华生命 官方 YouTube', 'vi': 'YouTube chính thức Hanwha Life'}, tags: [], cat: 'shorts', player: 'kanavi', point: { ko: '정글의 왕 카나비 (AI 응원가)', en: 'Kanavi, king of the jungle (AI chant)', ja: 'ジャングルの王カナビ（AI応援歌）', zh: '野区之王 Kanavi（AI 应援歌）', 'vi': 'Kanavi, vua rừng xanh (bài cổ vũ AI)'} },
    ],
    note: { ko: '', en: '', ja: '', zh: '', 'vi': ''},
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド', zh: 'Worlds 2026 · 第5轮', 'vi': 'Worlds 2026 · Vòng 5'},
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日', zh: '11月1日', 'vi': '01/11'}
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026', 'vi': 'MSI 2026'}, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛', 'vi': 'Playoffs LCK 2026'}, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮', 'vi': 'LCK 2026 vòng 1-2'}, result: '', set: { w: 32, l: 11 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026', zh: '2026 KeSPA 杯', 'vi': 'KeSPA Cup 2026'}, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯', 'vi': 'LCK Cup 2026'}, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退', zh: '0:2 负于 BLG', 'vi': 'Thua BLG 0-2'}, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日', zh: '2026年11月1日', 'vi': '01/11/2026'} }
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
    debut: '2017-11-22',
    debutNote: { ko: '2017 KeSPA Cup · DAMWON Gaming', en: 'KeSPA Cup 2017 · DAMWON Gaming', ja: '2017 KeSPAカップ · DAMWON Gaming', zh: '2017 KeSPA 杯 · DAMWON Gaming', vi: 'KeSPA Cup 2017 · DAMWON Gaming' },
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
      { id: 'FG8VNBFemDg', len: '10:29', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 3세트', en: 'DK vs GEN · Game 3', ja: 'DK vs GEN 第3試合', zh: 'DK vs GEN · 第3局', 'vi': 'DK vs GEN · Ván 3'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'mid', 'carry'] , cat: 'highlight', point: { ko: '쇼 메 혹 — 한 번 속아보실?', en: 'ShowMaker’s bait — fooled you', ja: 'ショメの誘い — 引っかかった？', zh: 'ShowMaker 的诱饵 — 上当了吧', vi: 'ShowMaker gài bẫy — bị lừa chưa?' } },

      { id: 'SqKdQydiZKs', len: '7:31', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 1세트', en: 'DK vs GEN · Game 1', ja: 'DK vs GEN 第1試合', zh: 'DK vs GEN · 第1局', 'vi': 'DK vs GEN · Ván 1'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'mid'] , cat: 'highlight', point: { ko: '북벌 페이스리프트', en: 'A facelift for the northern campaign', ja: '北伐のフェイスリフト', zh: '北伐改款', vi: 'Cuộc bắc tiến lột xác' } },

      { id: 'C02yoXL62UY', len: '10:49', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs GEN · 2세트', en: 'DK vs GEN · Game 2', ja: 'DK vs GEN 第2試合', zh: 'DK vs GEN · 第2局', 'vi': 'DK vs GEN · Ván 2'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: ['lck', 'mid', 'comeback'] , cat: 'highlight', point: { ko: '1707일의 염원', en: 'A wish 1,707 days in the making', ja: '1707日目の願い', zh: '等待 1707 天的心愿', vi: 'Khát vọng 1.707 ngày' } },

      { id: 'VpNVX1aKR9g', len: '8:49', channel: 'LCK', team: 'DK', year: 2021, match: { ko: 'T1 vs DK · 4세트', en: 'T1 vs DK · Game 4', ja: 'T1 vs DK 第4試合', zh: 'T1 vs DK · 第4局', 'vi': 'T1 vs DK · Ván 4'}, event: { ko: '2021 월드 챔피언십 4강', en: 'Worlds 2021 Semifinals', ja: 'ワールズ2021 準決勝', zh: '2021 世界赛四强', 'vi': 'Bán kết Worlds 2021'}, tags: ['worlds', 'mid', 'carry', 'leblanc'] , cat: 'highlight', champ: ['leblanc'], point: { ko: '3대 800 르블랑', en: 'The 3-vs-800 LeBlanc', ja: '3対800のルブラン', zh: '3 打 800 的乐芙兰', vi: 'LeBlanc 3 chọi 800' } },

      { id: 'DyaPoq_QAO8', len: '7:51', channel: 'LCK', team: 'DK', year: 2025, match: { ko: 'DK vs BFX · 4세트', en: 'DK vs BFX · Game 4', ja: 'DK vs BFX 第4試合', zh: 'DK vs BFX · 第4局', 'vi': 'DK vs BFX · Ván 4'}, event: { ko: '2025 우리은행 LCK 플레이오프', en: '2025 LCK Playoffs', ja: '2025 LCK プレーオフ', zh: '2025 LCK 季后赛', 'vi': 'Playoffs LCK 2025 (Woori Bank)'}, tags: ['playoffs', 'lck', 'mid', 'carry'] , cat: 'highlight', point: { ko: '비 내리는 여름밤의 쇼메이커', en: 'ShowMaker on a rainy summer night', ja: '雨の夏の夜のショーメイカー', zh: '雨夜里的 ShowMaker', vi: 'ShowMaker trong đêm mưa mùa hè' } },

      { id: 'JT8H1izxnL8', len: '3:45', channel: 'LoL Esports', team: 'DK', year: 2024, match: { ko: '쇼메이커 · 아지르 4인 궁', en: 'ShowMaker · Azir shuffle', ja: 'ショーメーカー · アジール シャッフル', zh: 'ShowMaker · 沙皇大招', 'vi': 'ShowMaker · Azir hất 4 người'}, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS', 'vi': 'LoL Esports · TOP 5 PHA HAY'}, tags: ['mid', 'carry', 'azir'] , cat: 'highlight', champ: ['azir'], point: { ko: '아지르 4인 궁 스쿱', en: 'Azir scoops up all four', ja: 'アジールの4人ウルト', zh: '阿兹尔一 scoop 四人', vi: 'Azir hốt cả bốn người' } },
      { id: 'DZPcIPDg614', len: '8:04', channel: 'Dplus Kia', team: 'DK', year: 2025, match: { ko: '쇼메이커 · 르블랑', en: 'ShowMaker · LeBlanc', ja: 'ShowMaker · ルブラン', zh: 'ShowMaker · 乐芙兰', 'vi': 'ShowMaker · LeBlanc'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['leblanc'], player: 'showmaker', point: { ko: 'ShowMaker 르블랑 압수', en: 'ShowMaker seizes LeBlanc', ja: 'ShowMaker ルブラン没収', zh: 'ShowMaker 没收乐芙兰', 'vi': 'ShowMaker tịch thu LeBlanc'} },
      { id: 'A9EPQ-LuS8Q', len: '10:51', channel: 'LCK', team: 'DK', year: 2023, match: { ko: 'DK vs NS · 2세트', en: 'DK vs NS · Game 2', ja: 'DK vs NS 第2試合', zh: 'DK vs NS · 第2局', 'vi': 'DK vs NS · Ván 2'}, event: { ko: '2023 LCK 서머', en: '2023 LCK Summer', ja: '2023 LCK サマー', zh: '2023 LCK 夏季赛', 'vi': 'LCK Mùa Hè 2023'}, tags: [], cat: 'highlight', champ: ['leblanc'], player: 'showmaker', point: { ko: '전기속성 르블랑', en: 'Electric-type LeBlanc', ja: '電気属性ルブラン', zh: '电属性乐芙兰', 'vi': 'LeBlanc hệ Điện'} },
      { id: 'poQBzdCFlY4', len: '10:38', channel: 'LCK', team: 'DK', year: 2023, match: { ko: 'HLE vs DK · 3세트', en: 'HLE vs DK · Game 3', ja: 'HLE vs DK 第3試合', zh: 'HLE vs DK · 第3局', 'vi': 'HLE vs DK · Ván 3'}, event: { ko: '2023 LCK 대표 선발전', en: '2023 LCK Regional Finals', ja: '2023 LCK 代表選抜戦', zh: '2023 LCK 选拔赛', 'vi': 'Vòng loại khu vực LCK 2023'}, tags: [], cat: 'highlight', champ: ['azir'], player: 'showmaker', point: { ko: '중요한 건 깎아온 아지르', en: 'What matters is the Azir pick', ja: '大事なのはアジールを取ること', zh: '重要的是拿到了阿兹尔', 'vi': 'Quan trọng là Azir đã bị bào mòn'} },
      { id: 'DR-PinpKn4k', len: '6:20', channel: 'Dplus Kia', team: 'DK', year: 2023, match: { ko: '쇼메이커 · 신드라', en: 'ShowMaker · Syndra', ja: 'ShowMaker · シンドラ', zh: 'ShowMaker · 辛德拉', 'vi': 'ShowMaker · Syndra'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['syndra'], player: 'showmaker', point: { ko: '신드라의 악마', en: 'The Syndra demon', ja: 'シンドラの悪魔', zh: '辛德拉的恶魔', 'vi': 'Ác quỷ Syndra'} },
      { id: '8buABZCVkm0', len: '7:54', channel: 'Dplus Kia', team: 'DK', year: 2023, match: { ko: '쇼메이커 · 요네', en: 'ShowMaker · Yone', ja: 'ShowMaker · ヨネ', zh: 'ShowMaker · 永恩', 'vi': 'ShowMaker · Yone'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['yone'], player: 'showmaker', point: { ko: '쇼메이커 요네 vs 체력 4700', en: 'ShowMaker\'s Yone vs 4,700 HP', ja: 'ShowMaker ヨネ vs HP4700', zh: 'ShowMaker 永恩 对阵 4700 血量', 'vi': 'Yone của ShowMaker vs 4.700 máu'} },
      { id: 'pJDwY28AFdg', len: '8:29', channel: 'Dplus Kia', team: 'DK', year: 2020, match: { ko: '쇼메이커 · 요네', en: 'ShowMaker · Yone', ja: 'ShowMaker · ヨネ', zh: 'ShowMaker · 永恩', 'vi': 'ShowMaker · Yone'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['yone'], player: 'showmaker', point: { ko: '요네로 1등 복귀하는 남자', en: 'Back to rank 1 with Yone', ja: 'ヨネで1位に戻る男', zh: '用永恩重回第一的男人', 'vi': 'Người trở lại hạng 1 bằng Yone'} },
      { id: '-3mbm1sNaPo', len: '7:53', channel: 'Dplus Kia', team: 'DK', year: 2023, match: { ko: '쇼메이커 · 탈리야', en: 'ShowMaker · Taliyah', ja: 'ShowMaker · タリヤ', zh: 'ShowMaker · 塔莉垭', 'vi': 'ShowMaker · Taliyah'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['taliyah'], player: 'showmaker', point: { ko: '탈리야 무죄', en: 'Taliyah is innocent', ja: 'タリヤは無罪', zh: '塔莉垭无罪', 'vi': 'Taliyah vô tội'} },
      { id: 'A-3GFd93T6Q', len: '7:28', channel: 'Dplus Kia', team: 'DK', year: 2024, match: { ko: '쇼메이커 · 탈리야', en: 'ShowMaker · Taliyah', ja: 'ShowMaker · タリヤ', zh: 'ShowMaker · 塔莉垭', 'vi': 'ShowMaker · Taliyah'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['taliyah'], player: 'showmaker', point: { ko: '쇼메이커 탈리야? 뺏어볼게요', en: 'ShowMaker\'s Taliyah? I\'ll take it', ja: 'ShowMakerのタリヤ？もらうね', zh: 'ShowMaker 的塔莉垭？我拿走了', 'vi': 'Taliyah của ShowMaker? Để tôi lấy'} },
      { id: '9h1KC_nvLFo', len: '7:51', channel: 'Dplus Kia', team: 'DK', year: 2024, match: { ko: '쇼메이커 · 조이', en: 'ShowMaker · Zoe', ja: 'ShowMaker · ゾーイ', zh: 'ShowMaker · 佐伊', 'vi': 'ShowMaker · Zoe'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['zoe'], player: 'showmaker', point: { ko: '달려라 조이', en: 'Run, Zoe', ja: '走れゾーイ', zh: '跑起来，佐伊', 'vi': 'Chạy đi, Zoe'} },
      { id: 'RQ1ugn52QNg', len: '4:59', channel: 'Dplus Kia', team: 'DK', year: 2021, match: { ko: '쇼메이커 · 조이', en: 'ShowMaker · Zoe', ja: 'ShowMaker · ゾーイ', zh: 'ShowMaker · 佐伊', 'vi': 'ShowMaker · Zoe'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['zoe'], player: 'showmaker', point: { ko: '조이가 타고 있어요', en: 'Zoe is riding along', ja: 'ゾーイが乗っている', zh: '佐伊骑着呢', 'vi': 'Zoe đang cưỡi đây'} },
      { id: 'xuzymvnzYZA', len: '6:46', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: '스킨 리뷰', en: 'Skin review', ja: 'スキンレビュー', zh: '皮肤测评', 'vi': 'Đánh giá skin'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'behind', player: 'showmaker', point: { ko: '쇼메이커의 Hall of Legends: Caps 스킨 리뷰', en: 'ShowMaker reviews the Caps Hall of Legends skin', ja: 'ShowMakerのHall of Legends：Capsスキンレビュー', zh: 'ShowMaker 的名人堂 Caps 皮肤测评', 'vi': 'ShowMaker đánh giá skin Caps Hall of Legends'} },
      { id: 'yN3IV2hq3U8', len: '4:46', channel: 'Dplus Kia', team: 'DK', year: 2025, match: { ko: '승리의 딮터뷰 vs DRX', en: 'DK Interview after DRX', ja: '勝利のディクインタビュー vs DRX', zh: '胜利专访 vs DRX', 'vi': 'Phỏng vấn DK sau trận thắng DRX'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'behind', player: 'showmaker', point: { ko: '쇼메이커 600전 · 경사났네', en: 'ShowMaker\'s 600th game', ja: 'ShowMaker 600試合', zh: 'ShowMaker 第600场', 'vi': 'Trận thứ 600 của ShowMaker'} },
      { id: '8o6b3ODQdBs', len: '9:36', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'DK 비하인드', en: 'DK behind', ja: 'DK 舞台裏', zh: 'DK 花絮', 'vi': 'Hậu trường DK'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'behind', player: 'showmaker', point: { ko: '쇼메이커·제우스의 컵케이크 소동', en: 'ShowMaker, Zeus and the cupcake caper', ja: 'ShowMakerとZeusのカップケーキ騒動', zh: 'ShowMaker 与 Zeus 的纸杯蛋糕风波', 'vi': 'ShowMaker, Zeus và vụ bánh cupcake'} },
      { id: '9z6bBAjg4EQ', len: '9:31', channel: 'LCK', team: 'DK', year: 2021, match: { ko: 'DWG KIA vs T1 · 결승', en: 'DWG KIA vs T1 · Final', ja: 'DWG KIA vs T1 決勝', zh: 'DWG KIA vs T1 · 决赛', 'vi': 'DWG KIA vs T1 · Chung kết'}, event: { ko: '2021 LCK 서머', en: '2021 LCK Summer', ja: '2021 LCK サマー', zh: '2021 LCK 夏季赛', 'vi': 'LCK Mùa Hè 2021'}, tags: [], cat: 'highlight', player: 'showmaker', point: { ko: 'MAKER — 서머 결승의 주인공', en: 'MAKER — the summer final\'s hero', ja: 'MAKER — サマー決勝の主役', zh: 'MAKER — 夏季决赛的主角', 'vi': 'MAKER — người hùng chung kết Mùa Hè'} },
    ],
    note: {
      ko: '최근 경기 중 NA 표시는 북미 계정(Sonny Hayes#722)에서 치른 게임이에요.',
      en: 'Games marked NA in the recent list were played on a North American account (Sonny Hayes#722).',
      ja: '最近の試合のNA表示は北米アカウント（Sonny Hayes#722）で行ったゲームです。',
      zh: '最近对局中标记 NA 的是在北美账号（Sonny Hayes#722）上进行的比赛。', 'vi': 'Các trận có nhãn NA trong danh sách gần đây được chơi trên tài khoản Bắc Mỹ (Sonny Hayes#722).'},
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8', zh: 'Worlds 2026 · 八强', 'vi': 'Worlds 2026 · Tứ kết'},
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日', 'vi': '06/11'}
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026', 'vi': 'EWC 2026'}, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛', 'vi': 'Playoffs LCK 2026'}, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮', 'vi': 'LCK 2026 vòng 1-2'}, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯', 'vi': 'LCK Cup 2026'}, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4', zh: 'LCK 2026 常规赛 第3-4轮', 'vi': 'LCK 2026 vòng 3-4'}, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退', zh: '0:3 负于 BLG', 'vi': 'Thua BLG 0-3'}, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日', zh: '2026年11月6日', 'vi': '06/11/2026'} }
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
    debut: '2025-01-24',
    debutNote: { ko: '2025 LCK 컵 · T1 1군 데뷔', en: 'LCK Cup 2025 · T1 main-roster debut', ja: '2025 LCKカップ · T1 1軍デビュー', zh: '2025 LCK 杯 · T1 一队出道', vi: 'LCK Cup 2025 · ra mắt đội chính T1' },
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
      { id: 'uxnXy7SFMsY', len: '7:21', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs KT · 3세트', en: 'T1 vs KT · Game 3', ja: 'T1 vs KT 第3試合', zh: 'T1 vs KT · 第3局', 'vi': 'T1 vs KT · Ván 3'}, event: { ko: '2025 LCK 컵', en: '2025 LCK Cup', ja: '2025 LCKカップ', zh: '2025 LCK 杯', 'vi': 'LCK Cup 2025'}, tags: ['lckcup', 'adc'] , cat: 'highlight', point: { ko: '불꽃 스매쉬', en: 'Flame Smash', ja: '炎のスマッシュ', zh: '火焰 Smash', vi: 'Smash rực lửa' } },

      { id: 'BxU5zVPnMiU', len: '9:33', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs GEN · 1세트', en: 'T1 vs GEN · Game 1', ja: 'T1 vs GEN 第1試合', zh: 'T1 vs GEN · 第1局', 'vi': 'T1 vs GEN · Ván 1'}, event: { ko: '2025 LCK 컵 · 신인왕 등장', en: '2025 LCK Cup · rookie debut', ja: '2025 LCKカップ · 新人王登場', zh: '2025 LCK 杯 · 新人王登场', 'vi': 'LCK Cup 2025 · tân binh xuất hiện'}, tags: ['lckcup', 'rookie', 'debut', 'adc'] , cat: 'highlight', point: { ko: '신인 금재, 등장', en: 'Rookie Keum-jae has arrived', ja: '新人クムジェ、登場', zh: '新人金宰登场', vi: 'Tân binh Geum-jae xuất hiện' } },

      { id: '6qYVK6DGkrU', len: '3:28', channel: 'LoL Esports', team: 'T1', year: 2025, match: { ko: '스매쉬 · T1 신인왕', en: 'Smash · T1 rookie', ja: 'スマッシュ · T1新人', zh: 'Smash · T1 新人', 'vi': 'Smash · tân binh T1'}, event: { ko: 'LoL Esports · TOP 5 PLAYS', en: 'LoL Esports · TOP 5 PLAYS', ja: 'LoL Esports · TOP 5 PLAYS', zh: 'LoL Esports · TOP 5 PLAYS', 'vi': 'LoL Esports · TOP 5 PHA HAY'}, tags: ['rookie', 'adc', 'carry'] , cat: 'highlight', point: { ko: 'T1 신인왕의 스머프 모드', en: 'T1\'s rookie goes smurf mode', ja: 'T1新人王のスマーフモード', zh: 'T1 新人王的虐菜模式', vi: 'Tân binh T1 bật chế độ smurf' } },

      { id: '2JCbasoSUrY', len: '0:26', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK · 월즈 1호 펜타킬', en: 'DK · first pentakill of Worlds', ja: 'DK · ワールズ第1号ペンタキル', zh: 'DK · 世界赛首个五杀', 'vi': 'DK · pentakill đầu tiên ở Worlds'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: 'ワールズ2026', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: ['worlds', 'pentakill', 'adc'] , cat: 'highlight', point: { ko: '월즈 1호 펜타킬', en: 'The first pentakill of Worlds', ja: 'ワールズ第1号ペンタキル', zh: '世界赛首记五杀', vi: 'Pentakill đầu tiên của Worlds' } },

      { id: 'yfC5vSjiJos', len: '13:27', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'MKOI vs DK · 1세트', en: 'MKOI vs DK · Game 1', ja: 'MKOI vs DK 第1試合', zh: 'MKOI vs DK · 第1局', 'vi': 'MKOI vs DK · Ván 1'}, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮', 'vi': 'Worlds 2026 · Thụy Sĩ'}, tags: ['worlds', 'adc'] , cat: 'highlight', point: { ko: '‘한방’ 치료', en: 'The one-shot cure', ja: '‘一発’治療', zh: '“一针见效”', vi: 'Liệu pháp ‘một đòn’' } },

      { id: '99lMm4kPg0o', len: '11:54', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BLG vs DK · 3세트', en: 'BLG vs DK · Game 3', ja: 'BLG vs DK 第3試合', zh: 'BLG vs DK · 第3局', 'vi': 'BLG vs DK · Ván 3'}, event: { ko: '2026 월드 챔피언십 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'ワールズ2026 · 準々決勝', zh: '2026 世界赛 · 八强', 'vi': 'Worlds 2026 · Tứ kết'}, tags: ['worlds', 'adc', 'carry'] , cat: 'highlight', point: { ko: 'Thank you, DK — 8강 마지막 세트', en: 'Thank you, DK — the last set of the quarters', ja: 'Thank you, DK — 準々決勝ラストセット', zh: 'Thank you, DK — 八强最后一场', vi: 'Cảm ơn DK — ván cuối tứ kết' } },
      { id: '-EQGPgySTHo', len: '9:08', channel: 'T1', team: 'T1', year: 2025, match: { ko: 'T1 · 원딜', en: 'T1 · ADC', ja: 'T1 · ADC', zh: 'T1 · 下路', 'vi': 'T1 · Xạ thủ'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'smash', point: { ko: '금제리의 대상혁 레이드', en: 'Smash\'s raid on Sang-hyeok', ja: 'スマッシュのサンヒョク討伐', zh: 'Smash 突袭相赫', 'vi': 'Geum-jae đột kích Sang-hyeok'} },
      { id: 'PMuVcONoenQ', len: '8:47', channel: 'T1', team: 'T1', year: 2025, match: { ko: '스매쉬 · 원딜', en: 'Smash · ADC', ja: 'Smash · ADC', zh: 'Smash · 下路', 'vi': 'Smash · Xạ thủ'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'smash', point: { ko: '어떤 걸로 맞을래?', en: 'Which one do you want to get hit by?', ja: 'どれで殴られたい？', zh: '你想被哪个打中？', 'vi': 'Muốn ăn đòn nào?'} },
      { id: 'O6dSbAVUSjQ', len: '12:36', channel: 'T1', team: 'T1', year: 2025, match: { ko: '스매쉬 · 원딜', en: 'Smash · ADC', ja: 'Smash · ADC', zh: 'Smash · 下路', 'vi': 'Smash · Xạ thủ'}, event: { ko: 'T1 공식 유튜브', en: 'T1 official YouTube', ja: 'T1 公式YouTube', zh: 'T1 官方 YouTube', 'vi': 'YouTube chính thức T1'}, tags: [], cat: 'highlight', player: 'smash', point: { ko: '금재네 꼬치집 오픈', en: 'Smash\'s skewer shop opens', ja: 'クムジェの串焼き屋オープン', zh: '金宰的烤串店开业', 'vi': 'Quán xiên của Geum-jae khai trương'} },
      { id: 'S5JIQSBaZnQ', len: '11:07', channel: 'LCK', team: 'T1', year: 2025, match: { ko: 'T1 vs GEN · 3세트', en: 'T1 vs GEN · Game 3', ja: 'T1 vs GEN 第3試合', zh: 'T1 vs GEN · 第3局', 'vi': 'T1 vs GEN · Ván 3'}, event: { ko: '2025 LCK 컵', en: '2025 LCK Cup', ja: '2025 LCKカップ', zh: '2025 LCK 杯', 'vi': 'LCK Cup 2025'}, tags: [], cat: 'highlight', player: 'smash', point: { ko: 'T1 갈리오', en: 'T1\'s Galio', ja: 'T1のガリオ', zh: 'T1 的加里奥', 'vi': 'Galio của T1'} },
    ],
    note: { ko: '', en: '', ja: '', zh: '', 'vi': ''},
    official: {
      stage: { ko: 'Worlds 2026 · 8강', en: 'Worlds 2026 · Quarterfinals', ja: 'Worlds 2026 · ベスト8', zh: 'Worlds 2026 · 八强', 'vi': 'Worlds 2026 · Tứ kết'},
      team: 'DK', opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日', 'vi': '06/11'}
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, result: 'QF', set: { w: 4, l: 3 }, key: true },
      { event: { ko: 'EWC 2026', en: 'EWC 2026', ja: 'EWC 2026', zh: 'EWC 2026', 'vi': 'EWC 2026'}, result: '', set: { w: 11, l: 3 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛', 'vi': 'Playoffs LCK 2026'}, result: '', set: { w: 7, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮', 'vi': 'LCK 2026 vòng 1-2'}, result: '', set: { w: 24, l: 18 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯', 'vi': 'LCK Cup 2026'}, result: '', set: { w: 18, l: 17 } },
      { event: { ko: 'LCK 2026 정규 3-4라운드', en: 'LCK 2026 Rounds 3–4', ja: 'LCK 2026 レギュラー 3-4', zh: 'LCK 2026 常规赛 第3-4轮', 'vi': 'LCK 2026 vòng 3-4'}, result: '', set: { w: 11, l: 8 } }
    ],
    worlds: { stageKey: 'QF', line: { ko: 'BLG에 0:3 패배', en: 'Lost 0–3 to BLG', ja: 'BLGに0-3で敗退', zh: '0:3 负于 BLG', 'vi': 'Thua BLG 0-3'}, date: { ko: '2026. 11. 06', en: 'Nov 6, 2026', ja: '2026年11月6日', zh: '2026年11月6日', 'vi': '06/11/2026'} }
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
    debut: '2021-01-15',
    debutNote: { ko: '2021 LCK 스프링 · Fredit BRION', en: 'LCK Spring 2021 · Fredit BRION', ja: '2021 LCKスプリング · Fredit BRION', zh: '2021 LCK 春季赛 · Fredit BRION', vi: 'LCK Mùa Xuân 2021 · Fredit BRION' },
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
      { id: 'COviyhL_fxc', len: '8:52', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs DK · 2세트', en: 'HLE vs DK · Game 2', ja: 'HLE vs DK 第2試合', zh: 'HLE vs DK · 第2局', 'vi': 'HLE vs DK · Ván 2'}, event: { ko: '2026 LCK · LCK 300승', en: '2026 LCK · 300th LCK win', ja: '2026 LCK · LCK通算300勝', zh: '2026 LCK · LCK 300胜', 'vi': 'LCK 2026 · 300 trận thắng LCK'}, tags: ['lck', 'sup', 'win300'] , cat: 'highlight', point: { ko: 'LCK 300승 달성', en: 'Reaching 300 LCK wins', ja: 'LCK通算300勝達成', zh: '达成 LCK 300 胜', vi: 'Cán mốc 300 trận thắng LCK' } },

      { id: 'OT-19WY8HFI', len: '12:03', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs T1 · 1세트', en: 'HLE vs T1 · Game 1', ja: 'HLE vs T1 第1試合', zh: 'HLE vs T1 · 第1局', 'vi': 'HLE vs T1 · Ván 1'}, event: { ko: '2026 우리은행 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026 (Woori Bank)'}, tags: ['playoffs', 'lck', 'sup'] , cat: 'highlight', point: { ko: '“기초적인 임플란트다”', en: '“A basic implant”', ja: '「基礎的なインプラントだ」', zh: '“基础的种植牙”', vi: '“Cấy implant cơ bản thôi”' } },

      { id: 'c3QdrFHgxTU', len: '35:59', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'DK vs HLE · 매치', en: 'DK vs HLE · Match', ja: 'DK vs HLE · マッチ', zh: 'DK vs HLE · 比赛', 'vi': 'DK vs HLE · Trận đấu'}, event: { ko: '2026 LCK 매치 123', en: '2026 LCK · Match 123', ja: '2026 LCK マッチ123', zh: '2026 LCK 第123场', 'vi': 'LCK 2026 · Trận 123'}, tags: ['lck', 'sup'] , cat: 'highlight', point: { ko: 'DK vs HLE 매치 123', en: 'DK vs HLE, match 123', ja: 'DK vs HLE マッチ123', zh: 'DK vs HLE 第123场', vi: 'DK vs HLE, trận 123' } },

      { id: '2FDj-lJth1E', len: '0:20', channel: 'LoL Esports', team: 'HLE', year: 2026, match: { ko: '딜라이트 · 로봇 서폿', en: 'Delight · robot support', ja: 'ディライト · ロボットサポート', zh: 'Delight · 机器人辅助', 'vi': 'Delight · hỗ trợ robot'}, event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026', 'vi': 'MSI 2026'}, tags: ['msi', 'champion', 'sup'] , cat: 'shorts', point: { ko: '로봇 서폿 출동', en: 'Robot support on duty', ja: 'ロボットサポート出動', zh: '机器人辅助出动', vi: 'Hỗ trợ robot xuất trận' } },

      { id: 'PcrXCZYo_58', len: '9:37', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'G2 vs HLE · 1세트', en: 'G2 vs HLE · Game 1', ja: 'G2 vs HLE 第1試合', zh: 'G2 vs HLE · 第1局', 'vi': 'G2 vs HLE · Ván 1'}, event: { ko: '2026 월드 챔피언십 · 스위스', en: 'Worlds 2026 · Swiss', ja: 'ワールズ2026 · スイス', zh: '2026 世界赛 · 瑞士轮', 'vi': 'Worlds 2026 · Thụy Sĩ'}, tags: ['worlds', 'sup'] , cat: 'highlight', point: { ko: '이거 제 이모지양', en: 'That one is my emoji sheep', ja: 'これは私の絵文字羊', zh: '这是我的表情羊', vi: 'Con cừu emoji của tôi' } },

      { id: 'oH96rywp2L0', len: '43:39', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs KT · 매치', en: 'HLE vs KT · Match', ja: 'HLE vs KT · マッチ', zh: 'HLE vs KT · 比赛', 'vi': 'HLE vs KT · Trận đấu'}, event: { ko: '2026 LCK 매치 117', en: '2026 LCK · Match 117', ja: '2026 LCK マッチ117', zh: '2026 LCK 第117场', 'vi': 'LCK 2026 · Trận 117'}, tags: ['lck', 'sup'] , cat: 'highlight', point: { ko: 'HLE vs KT 매치 117', en: 'HLE vs KT, match 117', ja: 'HLE vs KT マッチ117', zh: 'HLE vs KT 第117场', vi: 'HLE vs KT, trận 117' } },
      { id: 'eqj8YKM-PaE', len: '12:46', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs DK · 3세트', en: 'HLE vs DK · Game 3', ja: 'HLE vs DK 第3試合', zh: 'HLE vs DK · 第3局', 'vi': 'HLE vs DK · Ván 3'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'highlight', player: 'delight', point: { ko: '현시점 지구 1등', en: 'Best in the world right now', ja: '現時点で地球一', zh: '当下地球第一', 'vi': 'Số một thế giới hiện tại'} },
      { id: 'UEGOFxU0-zk', len: '35:09', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'BLG vs HLE · 스위스 Day8', en: 'BLG vs HLE · Swiss Day 8', ja: 'BLG vs HLE スイス Day8', zh: 'BLG vs HLE · 瑞士轮 Day8', 'vi': 'BLG vs HLE · Thụy Sĩ ngày 8'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', player: 'delight', point: { ko: '스위스 마지막 날, BLG전', en: 'The last Swiss day against BLG', ja: 'スイス最終日、BLG戦', zh: '瑞士轮最后一天，对阵 BLG', 'vi': 'Ngày cuối Thụy Sĩ, gặp BLG'} },
      { id: 'tnkIch-yIzc', len: '31:51', channel: 'LCK', team: 'HLE', year: 2026, match: { ko: 'HLE vs DK · 매치 65', en: 'HLE vs DK · Match 65', ja: 'HLE vs DK マッチ65', zh: 'HLE vs DK · 第65场', 'vi': 'HLE vs DK · Trận 65'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'highlight', player: 'delight', point: { ko: 'HLE vs DK, 매치 65', en: 'HLE vs DK, match 65', ja: 'HLE vs DK マッチ65', zh: 'HLE vs DK，第65场', 'vi': 'HLE vs DK, trận 65'} },
      { id: 'M46pXsWIOUc', len: '8:03', channel: 'Hanwha Life Esports', team: 'HLE', year: 2026, match: { ko: '2026 월즈 승리 비하인드 vs TES', en: 'Worlds 2026 win behind vs TES', ja: '2026 ワールズ勝利の舞台裏 vs TES', zh: '2026 世界赛胜利花絮 vs TES', 'vi': 'Hậu trường chiến thắng Worlds 2026 vs TES'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'behind', player: 'delight', point: { ko: '행운의 여신이 내게 미소를 — TES전', en: 'Fortune smiles on us — vs TES', ja: '幸運の女神が微笑む — TES戦', zh: '幸运女神微笑 — 对阵 TES', 'vi': 'Nữ thần may mắn mỉm cười — gặp TES'} },
    ],
    note: {
      ko: '닉네임이 플레이리스트겨울#KR1 에서 죽각딜#KR02 로 바뀌어 u.gg 새 주소로 연결했어요.',
      en: 'The account name changed from 플레이리스트겨울#KR1 to 죽각딜#KR02, so the stats link opens the new u.gg profile.',
      ja: 'アカウント名が 플레이리스트겨울#KR1 から 죽각딜#KR02 に変わったため、u.ggの新しいプロフィールにリンクしています。',
      zh: '账号名已从 플레이리스트겨울#KR1 改为 죽각딜#KR02，因此战绩链接指向新的 u.gg 个人页。', 'vi': 'Tên tài khoản đổi từ 플레이리스트겨울#KR1 sang 죽각딜#KR02, nên liên kết thống kê mở hồ sơ u.gg mới.'},
    official: {
      stage: { ko: 'Worlds 2026 · 5라운드', en: 'Worlds 2026 · Round 5', ja: 'Worlds 2026 · 第5ラウンド', zh: 'Worlds 2026 · 第5轮', 'vi': 'Worlds 2026 · Vòng 5'},
      team: 'HLE', opp: 'BLG', score: '0 : 2', win: false, date: { ko: '11. 01.', en: 'Nov 1', ja: '11月1日', zh: '11月1日', 'vi': '01/11'}
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
      { event: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, result: 'R5', set: { w: 3, l: 4 }, key: true },
      { event: { ko: 'MSI 2026', en: 'MSI 2026', ja: 'MSI 2026', zh: 'MSI 2026', 'vi': 'MSI 2026'}, result: 'CHAMP', set: { w: 13, l: 7 } },
      { event: { ko: 'LCK 2026 Playoffs', en: 'LCK 2026 Playoffs', ja: 'LCK 2026 プレーオフ', zh: 'LCK 2026 季后赛', 'vi': 'Playoffs LCK 2026'}, result: 'RUNNER', set: { w: 8, l: 9 } },
      { event: { ko: 'LCK 2026 정규 1-2라운드', en: 'LCK 2026 Rounds 1–2', ja: 'LCK 2026 レギュラー 1-2', zh: 'LCK 2026 常规赛 第1-2轮', 'vi': 'LCK 2026 vòng 1-2'}, result: '', set: { w: 30, l: 10 } },
      { event: { ko: 'KeSPA Cup 2026', en: 'KeSPA Cup 2026', ja: 'KeSPAカップ 2026', zh: '2026 KeSPA 杯', 'vi': 'KeSPA Cup 2026'}, result: '', set: { w: 5, l: 3 } },
      { event: { ko: 'LCK Cup 2026', en: 'LCK Cup 2026', ja: 'LCKカップ 2026', zh: '2026 LCK 杯', 'vi': 'LCK Cup 2026'}, result: '', set: { w: 5, l: 9 } }
    ],
    worlds: { stageKey: 'R5', line: { ko: 'BLG에 0:2 패배', en: 'Lost 0–2 to BLG', ja: 'BLGに0-2で敗退', zh: '0:2 负于 BLG', 'vi': 'Thua BLG 0-2'}, date: { ko: '2026. 11. 01', en: 'Nov 1, 2026', ja: '2026年11月1日', zh: '2026年11月1日', 'vi': '01/11/2026'} }
  }
];

const DK_PATH = [
  { round: { ko: '1라운드', en: 'Round 1', ja: '第1ラウンド', zh: '第1轮', 'vi': 'Vòng 1'}, opp: 'G2', score: '1 : 0', win: true, date: { ko: '10. 24.', en: 'Oct 24', ja: '10月24日', zh: '10月24日', 'vi': '24/10'} },
  { round: { ko: '2라운드', en: 'Round 2', ja: '第2ラウンド', zh: '第2轮', 'vi': 'Vòng 2'}, opp: 'T1', score: '1 : 0', win: true, date: { ko: '10. 25.', en: 'Oct 25', ja: '10月25日', zh: '10月25日', 'vi': '25/10'} },
  { round: { ko: '3라운드', en: 'Round 3', ja: '第3ラウンド', zh: '第3轮', 'vi': 'Vòng 3'}, opp: 'MKOI', score: '2 : 0', win: true, date: { ko: '10. 26.', en: 'Oct 26', ja: '10月26日', zh: '10月26日', 'vi': '26/10'} },
  { round: { ko: '8강', en: 'Quarterfinals', ja: 'ベスト8', zh: '八强', 'vi': 'Tứ kết'}, opp: 'BLG', score: '0 : 3', win: false, date: { ko: '11. 06.', en: 'Nov 6', ja: '11月6日', zh: '11月6日', 'vi': '06/11'} }
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
    name: { ko: 'LCK 컵', en: 'LCK Cup', ja: 'LCKカップ', zh: 'LCK 杯', 'vi': 'LCK Cup'},
    host: { ko: '국내', en: 'Korea', ja: '韓国', zh: '国内', 'vi': 'Hàn Quốc'},
    note: { ko: '2027 시즌 개막 · 세부 일정 추후 공지', en: '2027 season opener · schedule to be announced', ja: '2027シーズン開幕 · 詳細日程は追って発表', zh: '2027 赛季开幕 · 详细赛程后续公布', 'vi': 'Khai mạc mùa 2027 · lịch chi tiết sẽ công bố sau'}
  },
  {
    no: '02',
    name: { ko: 'First Stand: All In', en: 'First Stand: All In', ja: 'First Stand: All In', zh: 'First Stand: All In', 'vi': 'First Stand: All In'},
    host: { ko: '중국', en: 'China', ja: '中国', zh: '中国', 'vi': 'Trung Quốc'},
    note: { ko: '2027 한정 확대판 · 형식과 일정은 2027년 1월 발표', en: '2027-only expanded edition · format and dates announced January 2027', ja: '2027年限定の拡大版 · 形式と日程は2027年1月発表', zh: '2027 限定扩大版 · 赛制与赛程于 2027年1月公布', 'vi': 'Bản mở rộng chỉ trong 2027 · thể thức và lịch công bố tháng 1/2027'}
  },
  {
    no: '03',
    name: { ko: 'LCK 정규 시즌', en: 'LCK regular season', ja: 'LCKレギュラーシーズン', zh: 'LCK 常规赛', 'vi': 'Mùa thường LCK'},
    host: { ko: '국내', en: 'Korea', ja: '韓国', zh: '国内', 'vi': 'Hàn Quốc'},
    note: { ko: '단일 정규 시즌 · 스프링·서머 스플릿 없음', en: 'One regular season · no spring/summer splits', ja: '単一レギュラーシーズン · スプリング／サマーなし', zh: '单一常规赛 · 无春季/夏季赛', 'vi': 'Một mùa thường · không chia Xuân/Hè'}
  },
  {
    no: '04',
    name: { ko: 'MSI 2027', en: 'MSI 2027', ja: 'MSI 2027', zh: 'MSI 2027', 'vi': 'MSI 2027'},
    host: { ko: '발렌시아', en: 'Valencia', ja: 'バレンシア', zh: '巴伦西亚', 'vi': 'Valencia'},
    note: { ko: '미드 시즌 인비테이셔널 · 스페인 발렌시아', en: 'Mid-Season Invitational · Valencia, Spain', ja: 'ミッドシーズン・インビテーショナル · スペイン・バレンシア', zh: '季中冠军赛 · 西班牙 巴伦西亚', 'vi': 'Mid-Season Invitational · Valencia, Tây Ban Nha'}
  },
  {
    no: '05',
    name: { ko: '월즈 2027', en: 'Worlds 2027', ja: 'Worlds 2027', zh: '2027 全球总决赛', 'vi': 'Worlds 2027'},
    host: { ko: '일본 · 한국', en: 'Japan · Korea', ja: '日本・韓国', zh: '日本 · 韩国', 'vi': 'Nhật Bản · Hàn Quốc'},
    note: { ko: '스위스 나고야 · 8강/4강 수원 · 결승 서울', en: 'Swiss in Nagoya · quarters/semis in Suwon · final in Seoul', ja: 'スイスは名古屋 · 準々決勝／準決勝は水原 · 決勝はソウル', zh: '瑞士轮 名古屋 · 八强/四强 水原 · 决赛 首尔', 'vi': 'Thụy Sĩ ở Nagoya · tứ kết/bán kết ở Suwon · chung kết ở Seoul'}
  }
];

/* 챔피언 이름 (Riot Data Dragon 16.23.1 ko_KR · en_US · ja_JP · zh_CN)
 * data.js 는 한국어 이름을 쓰고, Riot API 는 영어 이름을 주기 때문에 네 언어를 한 표에 둡니다.
 * tools/make_champions.py 로 다시 만들 수 있습니다. */
const CHAMPIONS = {
  'Aatrox': ['아트록스', 'Aatrox', 'エイトロックス', '暗裔剑魔', 'Aatrox'],
  'Ahri': ['아리', 'Ahri', 'アーリ', '九尾妖狐', 'Ahri'],
  'Akali': ['아칼리', 'Akali', 'アカリ', '离群之刺', 'Akali'],
  'Akshan': ['아크샨', 'Akshan', 'アクシャン', '影哨', 'Akshan'],
  'Alistar': ['알리스타', 'Alistar', 'アリスター', '牛头酋长', 'Alistar'],
  'Ambessa': ['암베사', 'Ambessa', 'アンベッサ', '铁血狼母', 'Ambessa'],
  'Amumu': ['아무무', 'Amumu', 'アムム', '殇之木乃伊', 'Amumu'],
  'Anivia': ['애니비아', 'Anivia', 'アニビア', '冰晶凤凰', 'Anivia'],
  'Annie': ['애니', 'Annie', 'アニー', '黑暗之女', 'Annie'],
  'Aphelios': ['아펠리오스', 'Aphelios', 'アフェリオス', '残月之肃', 'Aphelios'],
  'Ashe': ['애쉬', 'Ashe', 'アッシュ', '寒冰射手', 'Ashe'],
  'AurelionSol': ['아우렐리온 솔', 'Aurelion Sol', 'オレリオン・ソル', '铸星龙王', 'Aurelion Sol'],
  'Aurora': ['오로라', 'Aurora', 'オーロラ', '双界灵兔', 'Aurora'],
  'Azir': ['아지르', 'Azir', 'アジール', '沙漠皇帝', 'Azir'],
  'Bard': ['바드', 'Bard', 'バード', '星界游神', 'Bard'],
  'Belveth': ['벨베스', 'Bel\'Veth', 'ベル＝ヴェス', '虚空女皇', "Bel'Veth"],
  'Blitzcrank': ['블리츠크랭크', 'Blitzcrank', 'ブリッツクランク', '蒸汽机器人', 'Blitzcrank'],
  'Brand': ['브랜드', 'Brand', 'ブランド', '复仇焰魂', 'Brand'],
  'Braum': ['브라움', 'Braum', 'ブラウム', '弗雷尔卓德之心', 'Braum'],
  'Briar': ['브라이어', 'Briar', 'ブライアー', '狂厄蔷薇', 'Briar'],
  'Caitlyn': ['케이틀린', 'Caitlyn', 'ケイトリン', '皮城女警', 'Caitlyn'],
  'Camille': ['카밀', 'Camille', 'カミール', '青钢影', 'Camille'],
  'Cassiopeia': ['카시오페아', 'Cassiopeia', 'カシオペア', '魔蛇之拥', 'Cassiopeia'],
  'Chogath': ['초가스', 'Cho\'Gath', 'チョ＝ガス', '虚空恐惧', "Cho'Gath"],
  'Corki': ['코르키', 'Corki', 'コーキ', '英勇投弹手', 'Corki'],
  'Darius': ['다리우스', 'Darius', 'ダリウス', '诺克萨斯之手', 'Darius'],
  'Diana': ['다이애나', 'Diana', 'ダイアナ', '皎月女神', 'Diana'],
  'DrMundo': ['문도 박사', 'Dr. Mundo', 'ドクター・ムンド', '祖安狂人', 'Dr. Mundo'],
  'Draven': ['드레이븐', 'Draven', 'ドレイヴン', '荣耀行刑官', 'Draven'],
  'Ekko': ['에코', 'Ekko', 'エコー', '时间刺客', 'Ekko'],
  'Elise': ['엘리스', 'Elise', 'エリス', '蜘蛛女皇', 'Elise'],
  'Evelynn': ['이블린', 'Evelynn', 'イブリン', '痛苦之拥', 'Evelynn'],
  'Ezreal': ['이즈리얼', 'Ezreal', 'エズリアル', '探险家', 'Ezreal'],
  'Fiddlesticks': ['피들스틱', 'Fiddlesticks', 'フィドルスティックス', '远古恐惧', 'Fiddlesticks'],
  'Fiora': ['피오라', 'Fiora', 'フィオラ', '无双剑姬', 'Fiora'],
  'Fizz': ['피즈', 'Fizz', 'フィズ', '潮汐海灵', 'Fizz'],
  'Galio': ['갈리오', 'Galio', 'ガリオ', '正义巨像', 'Galio'],
  'Gangplank': ['갱플랭크', 'Gangplank', 'ガングプランク', '海洋之灾', 'Gangplank'],
  'Garen': ['가렌', 'Garen', 'ガレン', '德玛西亚之力', 'Garen'],
  'Gnar': ['나르', 'Gnar', 'ナー', '迷失之牙', 'Gnar'],
  'Gragas': ['그라가스', 'Gragas', 'グラガス', '酒桶', 'Gragas'],
  'Graves': ['그레이브즈', 'Graves', 'グレイブス', '法外狂徒', 'Graves'],
  'Gwen': ['그웬', 'Gwen', 'グウェン', '灵罗娃娃', 'Gwen'],
  'Hecarim': ['헤카림', 'Hecarim', 'ヘカリム', '战争之影', 'Hecarim'],
  'Heimerdinger': ['하이머딩거', 'Heimerdinger', 'ハイマーディンガー', '大发明家', 'Heimerdinger'],
  'Hwei': ['흐웨이', 'Hwei', 'フェイ', '异画师', 'Hwei'],
  'Illaoi': ['일라오이', 'Illaoi', 'イラオイ', '海兽祭司', 'Illaoi'],
  'Irelia': ['이렐리아', 'Irelia', 'イレリア', '刀锋舞者', 'Irelia'],
  'Ivern': ['아이번', 'Ivern', 'アイバーン', '翠神', 'Ivern'],
  'Janna': ['잔나', 'Janna', 'ジャンナ', '风暴之怒', 'Janna'],
  'JarvanIV': ['자르반 4세', 'Jarvan IV', 'ジャーヴァンⅣ', '德玛西亚皇子', 'Jarvan IV'],
  'Jax': ['잭스', 'Jax', 'ジャックス', '武器大师', 'Jax'],
  'Jayce': ['제이스', 'Jayce', 'ジェイス', '未来守护者', 'Jayce'],
  'Jhin': ['진', 'Jhin', 'ジン', '戏命师', 'Jhin'],
  'Jinx': ['징크스', 'Jinx', 'ジンクス', '暴走萝莉', 'Jinx'],
  'KSante': ['크산테', 'K\'Sante', 'カ・サンテ', '纳祖芒荣耀', "K'Sante"],
  'Kaisa': ['카이사', 'Kai\'Sa', 'カイ＝サ', '虚空之女', "Kai'Sa"],
  'Kalista': ['칼리스타', 'Kalista', 'カリスタ', '复仇之矛', 'Kalista'],
  'Karma': ['카르마', 'Karma', 'カルマ', '天启者', 'Karma'],
  'Karthus': ['카서스', 'Karthus', 'カーサス', '死亡颂唱者', 'Karthus'],
  'Kassadin': ['카사딘', 'Kassadin', 'カサディン', '虚空行者', 'Kassadin'],
  'Katarina': ['카타리나', 'Katarina', 'カタリナ', '不祥之刃', 'Katarina'],
  'Kayle': ['케일', 'Kayle', 'ケイル', '正义天使', 'Kayle'],
  'Kayn': ['케인', 'Kayn', 'ケイン', '影流之镰', 'Kayn'],
  'Kennen': ['케넨', 'Kennen', 'ケネン', '狂暴之心', 'Kennen'],
  'Khazix': ['카직스', 'Kha\'Zix', 'カ＝ジックス', '虚空掠夺者', "Kha'Zix"],
  'Kindred': ['킨드레드', 'Kindred', 'キンドレッド', '永猎双子', 'Kindred'],
  'Kled': ['클레드', 'Kled', 'クレッド', '暴怒骑士', 'Kled'],
  'KogMaw': ['코그모', 'Kog\'Maw', 'コグ＝マウ', '深渊巨口', "Kog'Maw"],
  'Leblanc': ['르블랑', 'LeBlanc', 'ルブラン', '诡术妖姬', 'LeBlanc'],
  'LeeSin': ['리 신', 'Lee Sin', 'リー・シン', '盲僧', 'Lee Sin'],
  'Leona': ['레오나', 'Leona', 'レオナ', '曙光女神', 'Leona'],
  'Lillia': ['릴리아', 'Lillia', 'リリア', '含羞蓓蕾', 'Lillia'],
  'Lissandra': ['리산드라', 'Lissandra', 'リサンドラ', '冰霜女巫', 'Lissandra'],
  'Locke': ['로크', 'Locke', 'ロック', '灰烬驱魔人', 'Locke'],
  'Lucian': ['루시안', 'Lucian', 'ルシアン', '圣枪游侠', 'Lucian'],
  'Lulu': ['룰루', 'Lulu', 'ルル', '仙灵女巫', 'Lulu'],
  'Lux': ['럭스', 'Lux', 'ラックス', '光辉女郎', 'Lux'],
  'Malphite': ['말파이트', 'Malphite', 'マルファイト', '熔岩巨兽', 'Malphite'],
  'Malzahar': ['말자하', 'Malzahar', 'マルザハール', '虚空先知', 'Malzahar'],
  'Maokai': ['마오카이', 'Maokai', 'マオカイ', '扭曲树精', 'Maokai'],
  'MasterYi': ['마스터 이', 'Master Yi', 'マスター・イー', '无极剑圣', 'Master Yi'],
  'Mel': ['멜', 'Mel', 'メル', '流光镜影', 'Mel'],
  'Milio': ['밀리오', 'Milio', 'ミリオ', '明烛', 'Milio'],
  'MissFortune': ['미스 포츈', 'Miss Fortune', 'ミス・フォーチュン', '赏金猎人', 'Miss Fortune'],
  'MonkeyKing': ['오공', 'Wukong', 'ウーコン', '齐天大圣', 'Ngộ Không'],
  'Mordekaiser': ['모데카이저', 'Mordekaiser', 'モルデカイザー', '铁铠冥魂', 'Mordekaiser'],
  'Morgana': ['모르가나', 'Morgana', 'モルガナ', '堕落天使', 'Morgana'],
  'Naafiri': ['나피리', 'Naafiri', 'ナフィーリ', '百裂冥犬', 'Naafiri'],
  'Nami': ['나미', 'Nami', 'ナミ', '唤潮鲛姬', 'Nami'],
  'Nasus': ['나서스', 'Nasus', 'ナサス', '沙漠死神', 'Nasus'],
  'Nautilus': ['노틸러스', 'Nautilus', 'ノーチラス', '深海泰坦', 'Nautilus'],
  'Neeko': ['니코', 'Neeko', 'ニーコ', '万花通灵', 'Neeko'],
  'Nidalee': ['니달리', 'Nidalee', 'ニダリー', '狂野女猎手', 'Nidalee'],
  'Nilah': ['닐라', 'Nilah', 'ニーラ', '不羁之悦', 'Nilah'],
  'Nocturne': ['녹턴', 'Nocturne', 'ノクターン', '永恒梦魇', 'Nocturne'],
  'Nunu': ['누누와 윌럼프', 'Nunu & Willump', 'ヌヌ＆ウィルンプ', '雪原双子', 'Nunu & Willump'],
  'Olaf': ['올라프', 'Olaf', 'オラフ', '狂战士', 'Olaf'],
  'Orianna': ['오리아나', 'Orianna', 'オリアナ', '发条魔灵', 'Orianna'],
  'Ornn': ['오른', 'Ornn', 'オーン', '山隐之焰', 'Ornn'],
  'Pantheon': ['판테온', 'Pantheon', 'パンテオン', '不屈之枪', 'Pantheon'],
  'Poppy': ['뽀삐', 'Poppy', 'ポッピー', '圣锤之毅', 'Poppy'],
  'Pyke': ['파이크', 'Pyke', 'パイク', '血港鬼影', 'Pyke'],
  'Qiyana': ['키아나', 'Qiyana', 'キヤナ', '元素女皇', 'Qiyana'],
  'Quinn': ['퀸', 'Quinn', 'クイン', '德玛西亚之翼', 'Quinn'],
  'Rakan': ['라칸', 'Rakan', 'ラカン', '幻翎', 'Rakan'],
  'Rammus': ['람머스', 'Rammus', 'ラムス', '披甲龙龟', 'Rammus'],
  'RekSai': ['렉사이', 'Rek\'Sai', 'レク＝サイ', '虚空遁地兽', "Rek'Sai"],
  'Rell': ['렐', 'Rell', 'レル', '镕铁少女', 'Rell'],
  'Renata': ['레나타 글라스크', 'Renata Glasc', 'レナータ・グラスク', '炼金男爵', 'Renata Glasc'],
  'Renekton': ['레넥톤', 'Renekton', 'レネクトン', '荒漠屠夫', 'Renekton'],
  'Rengar': ['렝가', 'Rengar', 'レンガー', '傲之追猎者', 'Rengar'],
  'Riven': ['리븐', 'Riven', 'リヴェン', '放逐之刃', 'Riven'],
  'Rumble': ['럼블', 'Rumble', 'ランブル', '机械公敌', 'Rumble'],
  'Ryze': ['라이즈', 'Ryze', 'ライズ', '符文法师', 'Ryze'],
  'Samira': ['사미라', 'Samira', 'サミーラ', '沙漠玫瑰', 'Samira'],
  'Sejuani': ['세주아니', 'Sejuani', 'セジュアニ', '北地之怒', 'Sejuani'],
  'Senna': ['세나', 'Senna', 'セナ', '涤魂圣枪', 'Senna'],
  'Seraphine': ['세라핀', 'Seraphine', 'セラフィーン', '星籁歌姬', 'Seraphine'],
  'Sett': ['세트', 'Sett', 'セト', '腕豪', 'Sett'],
  'Shaco': ['샤코', 'Shaco', 'シャコ', '恶魔小丑', 'Shaco'],
  'Shen': ['쉔', 'Shen', 'シェン', '暮光之眼', 'Shen'],
  'Shyvana': ['쉬바나', 'Shyvana', 'シヴァーナ', '龙血武姬', 'Shyvana'],
  'Singed': ['신지드', 'Singed', 'シンジド', '炼金术士', 'Singed'],
  'Sion': ['사이온', 'Sion', 'サイオン', '亡灵战神', 'Sion'],
  'Sivir': ['시비르', 'Sivir', 'シヴィア', '战争女神', 'Sivir'],
  'Skarner': ['스카너', 'Skarner', 'スカーナー', '上古领主', 'Skarner'],
  'Smolder': ['스몰더', 'Smolder', 'スモルダー', '炽炎雏龙', 'Smolder'],
  'Sona': ['소나', 'Sona', 'ソナ', '琴瑟仙女', 'Sona'],
  'Soraka': ['소라카', 'Soraka', 'ソラカ', '众星之子', 'Soraka'],
  'Swain': ['스웨인', 'Swain', 'スウェイン', '诺克萨斯统领', 'Swain'],
  'Sylas': ['사일러스', 'Sylas', 'サイラス', '解脱者', 'Sylas'],
  'Syndra': ['신드라', 'Syndra', 'シンドラ', '暗黑元首', 'Syndra'],
  'TahmKench': ['탐 켄치', 'Tahm Kench', 'タム・ケンチ', '河流之王', 'Tahm Kench'],
  'Taliyah': ['탈리야', 'Taliyah', 'タリヤ', '岩雀', 'Taliyah'],
  'Talon': ['탈론', 'Talon', 'タロン', '刀锋之影', 'Talon'],
  'Taric': ['타릭', 'Taric', 'タリック', '瓦洛兰之盾', 'Taric'],
  'Teemo': ['티모', 'Teemo', 'ティーモ', '迅捷斥候', 'Teemo'],
  'Thresh': ['쓰레쉬', 'Thresh', 'スレッシュ', '魂锁典狱长', 'Thresh'],
  'Tristana': ['트리스타나', 'Tristana', 'トリスターナ', '麦林炮手', 'Tristana'],
  'Trundle': ['트런들', 'Trundle', 'トランドル', '巨魔之王', 'Trundle'],
  'Tryndamere': ['트린다미어', 'Tryndamere', 'トリンダメア', '蛮族之王', 'Tryndamere'],
  'TwistedFate': ['트위스티드 페이트', 'Twisted Fate', 'ツイステッド・フェイト', '卡牌大师', 'Twisted Fate'],
  'Twitch': ['트위치', 'Twitch', 'トゥイッチ', '瘟疫之源', 'Twitch'],
  'Udyr': ['우디르', 'Udyr', 'ウディア', '兽灵行者', 'Udyr'],
  'Urgot': ['우르곳', 'Urgot', 'アーゴット', '无畏战车', 'Urgot'],
  'Varus': ['바루스', 'Varus', 'ヴァルス', '惩戒之箭', 'Varus'],
  'Vayne': ['베인', 'Vayne', 'ヴェイン', '暗夜猎手', 'Vayne'],
  'Veigar': ['베이가', 'Veigar', 'ベイガー', '邪恶小法师', 'Veigar'],
  'Velkoz': ['벨코즈', 'Vel\'Koz', 'ヴェル＝コズ', '虚空之眼', "Vel'Koz"],
  'Vex': ['벡스', 'Vex', 'ヴェックス', '愁云使者', 'Vex'],
  'Vi': ['바이', 'Vi', 'ヴァイ', '皮城执法官', 'Vi'],
  'Viego': ['비에고', 'Viego', 'ヴィエゴ', '破败之王', 'Viego'],
  'Viktor': ['빅토르', 'Viktor', 'ビクター', '奥术先驱', 'Viktor'],
  'Vladimir': ['블라디미르', 'Vladimir', 'ブラッドミア', '猩红收割者', 'Vladimir'],
  'Volibear': ['볼리베어', 'Volibear', 'ボリベア', '不灭狂雷', 'Volibear'],
  'Warwick': ['워윅', 'Warwick', 'ワーウィック', '祖安怒兽', 'Warwick'],
  'Xayah': ['자야', 'Xayah', 'ザヤ', '逆羽', 'Xayah'],
  'Xerath': ['제라스', 'Xerath', 'ゼラス', '远古巫灵', 'Xerath'],
  'XinZhao': ['신 짜오', 'Xin Zhao', 'シン・ジャオ', '德邦总管', 'Xin Zhao'],
  'Yasuo': ['야스오', 'Yasuo', 'ヤスオ', '疾风剑豪', 'Yasuo'],
  'Yone': ['요네', 'Yone', 'ヨネ', '封魔剑魂', 'Yone'],
  'Yorick': ['요릭', 'Yorick', 'ヨリック', '牧魂人', 'Yorick'],
  'Yunara': ['유나라', 'Yunara', 'ユナラ', '不破之誓', 'Yunara'],
  'Yuumi': ['유미', 'Yuumi', 'ユーミ', '魔法猫咪', 'Yuumi'],
  'Zaahen': ['자헨', 'Zaahen', 'ザーヘン', '不落魔锋', 'Zaahen'],
  'Zac': ['자크', 'Zac', 'ザック', '生化魔人', 'Zac'],
  'Zed': ['제드', 'Zed', 'ゼド', '影流之主', 'Zed'],
  'Zeri': ['제리', 'Zeri', 'ゼリ', '祖安花火', 'Zeri'],
  'Ziggs': ['직스', 'Ziggs', 'ジグス', '爆破鬼才', 'Ziggs'],
  'Zilean': ['질리언', 'Zilean', 'ジリアン', '时光守护者', 'Zilean'],
  'Zoe': ['조이', 'Zoe', 'ゾーイ', '暮光星灵', 'Zoe'],
  'Zyra': ['자이라', 'Zyra', 'ザイラ', '荆棘之兴', 'Zyra'],
};


/* 디플러스 기아 공식 유튜브(@DplusKia_LOL · UCepHesz_5Lwr7qRaqjB-p1A) 재생목록
 * 2026-11-27 채널 재생목록 페이지에서 확인한 실제 ID·편수입니다. thumb 는 목록 첫 영상 썸네일. */
const DK_PLAYLISTS = [
  { id: 'PLRG5G_CO1tlo', thumb: 'XEXtPYNkPWg', n: 3,
    title: { ko: '2026 Worlds 딮터뷰', en: '2026 Worlds · DK Interview', ja: '2026 Worlds ディクインタビュー', zh: '2026 世界赛 · DK 专访', 'vi': 'Worlds 2026 · phỏng vấn DK'} },
  { id: 'PLfgIi8amvN7A', thumb: 'sWtO3OSF1k4', n: 7,
    title: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'} },
  { id: 'PLqP9PZoXicPWtVT29eT2YRw2T9btvz9J7', thumb: 'xKWUGuS9Ly0', n: 28,
    title: { ko: '2026 정규시즌 딮터뷰', en: '2026 Regular Season · DK Interview', ja: '2026 レギュラーシーズン ディクインタビュー', zh: '2026 常规赛 · DK 专访', 'vi': 'Mùa thường 2026 · phỏng vấn DK'} },
  { id: 'PLqP9PZoXicPVvy4J6jfCqPzhmfgttDwXK', thumb: 'MZhN9B-TUF0', n: 7,
    title: { ko: '2026 THE MOMENT', en: '2026 THE MOMENT', ja: '2026 THE MOMENT', zh: '2026 THE MOMENT', 'vi': '2026 THE MOMENT'} },
  { id: 'PLqP9PZoXicPV1mP4PJRXtqTActh2CRK8U', thumb: 'KvNvXc_b_xU', n: 12,
    title: { ko: '2026 승리의 딮터뷰', en: '2026 Victory · DK Interview', ja: '2026 勝利のディクインタビュー', zh: '2026 胜利专访', 'vi': '2026 Chiến thắng · phỏng vấn DK'} },
  { id: 'PLqP9PZoXicPXPp7ovbHc5b1aB61PyARoV', thumb: '0CBrpQTp_so', n: 21,
    title: { ko: '2025 승리의 딮터뷰', en: '2025 Victory · DK Interview', ja: '2025 勝利のディクインタビュー', zh: '2025 胜利专访', 'vi': '2025 Chiến thắng · phỏng vấn DK'} }
];

/* 디플러스 기아 공식 채널 영상(5인과 무관한 팀 단위) — 2026-11-27 재생목록·채널에서 확인 */
const DK_VIDEOS = [
  { id: 'XEXtPYNkPWg', len: '8:10', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs MKOI 스위스 3R', en: 'DK Interview · vs MKOI Swiss R3', ja: 'ディクインタビュー vs MKOI スイス3R', zh: 'DK 专访 · vs MKOI 瑞士轮 3R', 'vi': 'Phỏng vấn DK · vs MKOI Thụy Sĩ vòng 3'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '더 높은 곳으로 — MKOI전 승리 직후', en: 'Higher still — right after beating MKOI', ja: 'もっと高い場所へ — MKOI戦勝利直後', zh: '向更高处 — 战胜 MKOI 之后', 'vi': 'Cao hơn nữa — ngay sau khi thắng MKOI'} },
  { id: 'CPVhODNOp7E', len: '24:21', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs T1 스위스 2R', en: 'DK Interview · vs T1 Swiss R2', ja: 'ディクインタビュー vs T1 スイス2R', zh: 'DK 专访 · vs T1 瑞士轮 2R', 'vi': 'Phỏng vấn DK · vs T1 Thụy Sĩ vòng 2'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '역전을 위한 최선의 수 — T1전', en: 'The best move to turn it around — vs T1', ja: '逆転のための最善手 — T1戦', zh: '逆转的最优解 — 对阵 T1', 'vi': 'Nước đi tốt nhất để lật ngược — gặp T1'} },
  { id: 'uZFyMa0gUek', len: '7:51', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '딮터뷰 · vs G2 스위스 1R', en: 'DK Interview · vs G2 Swiss R1', ja: 'ディクインタビュー vs G2 スイス1R', zh: 'DK 专访 · vs G2 瑞士轮 1R', 'vi': 'Phỏng vấn DK · vs G2 Thụy Sĩ vòng 1'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '절망 속에서도 — G2전', en: 'Even in despair — vs G2', ja: '絶望の中でも — G2戦', zh: '即使在绝望中 — 对阵 G2', 'vi': 'Ngay cả trong tuyệt vọng — gặp G2'} },
  { id: 'hoFn9DSsdTQ', len: '4:14', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '월즈 녹아웃 티저 촬영기', en: 'Worlds knockout teaser — behind the shoot', ja: 'ワールズ決勝Tティザー撮影記', zh: '世界赛淘汰赛预告拍摄记', 'vi': 'Hậu trường quay teaser vòng loại trực tiếp Worlds'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '티저 한 편에 담긴 촬영 현장', en: 'The shoot behind one teaser', ja: 'ティザー1本の撮影現場', zh: '一支预告的拍摄现场', 'vi': 'Hiện trường quay sau một teaser'} },
  { id: 'vPqoNL7W_HM', len: '6:29', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: '테크체크 비하인드', en: 'Tech check behind', ja: 'テックチェック舞台裏', zh: '设备检查花絮', 'vi': 'Hậu trường kiểm tra kỹ thuật'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '월즈 생존신고 — 장비 점검 비하인드', en: 'Reporting live from Worlds — gear check', ja: 'ワールズ生存報告 — 機材チェック舞台裏', zh: '世界赛报到 — 装备检查花絮', 'vi': 'Báo tin từ Worlds — hậu trường kiểm tra thiết bị'} },
  { id: 'HO5CPhBrYlM', len: '3:49', cat: 'behind', channel: 'Dplus Kia', team: 'DK', year: 2026, player: 'smash',
    match: { ko: '텍사스는 바베큐다', en: 'Texas is barbecue', ja: 'テキサスはバーベキューだ', zh: '德州就是烧烤', 'vi': 'Texas là BBQ'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '텍사스 바베큐 먹방 — 신금재', en: 'A Texas barbecue mukbang with Smash', ja: 'テキサスBBQモッパン — シン・クムジェ', zh: '德州烧烤吃播 — 申金宰', 'vi': 'Ăn Texas BBQ cùng Smash'} },
  { id: 'QJIaTC-p8pg', len: '7:19', cat: 'highlight', channel: 'Dplus Kia', team: 'DK', year: 2026, champ: ['kaisa'],
    match: { ko: '카이사 올려놓기 장인', en: "A Kai'Sa carry specialist", ja: 'カイ＝サ育成の名人', zh: '卡莎带飞达人', 'vi': 'Bậc thầy đưa Kai\'Sa lên đỉnh'},
    event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'},
    point: { ko: '카이사 하나로 게임을 올려놓는 법', en: "How to lift a game on Kai'Sa alone", ja: 'カイ＝サ1本で試合を上げる方法', zh: '用卡莎一人带起全场', 'vi': 'Cách một con Kai\'Sa lật cả ván đấu'} },
  { id: 'MZhN9B-TUF0', len: '6:26', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs T1', en: 'the Moment · vs T1', ja: 'the Moment · vs T1', zh: 'the Moment · vs T1', 'vi': 'the Moment · vs T1'},
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'},
    point: { ko: '솔리드한 원딜의 순간', en: 'The moment of a rock-solid bot laner', ja: 'ソリッドなADCの瞬間', zh: '稳健射手的瞬间', 'vi': 'Khoảnh khắc của xạ thủ vững chắc'} },
  { id: 'FkoP2DBhFTk', len: '6:48', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs GEN', en: 'the Moment · vs GEN', ja: 'the Moment · vs GEN', zh: 'the Moment · vs GEN', 'vi': 'the Moment · vs GEN'},
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'},
    point: { ko: '악어는 협곡을 지배한다', en: 'The crocodile rules the Rift', ja: 'ワニはリフトを支配する', zh: '鳄鱼统治峡谷', 'vi': 'Cá sấu thống trị Rift'} },
  { id: 'eXx3B3BZUHw', len: '4:01', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026, player: 'showmaker',
    match: { ko: 'the Moment · vs BRO', en: 'the Moment · vs BRO', ja: 'the Moment · vs BRO', zh: 'the Moment · vs BRO', 'vi': 'the Moment · vs BRO'},
    event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'},
    point: { ko: '허허~ 쇼메이커ㄹrrrrr', en: 'Heh — ShowMakerrrrr', ja: 'ふふ〜ショーメイカーrrrr', zh: '呵呵 — ShowMakerrrrr', 'vi': 'Hơ hơ~ ShowMakerrrrrr'} },
  { id: 'qhC6sonTgAA', len: '6:46', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'the Moment · vs T1 플레이오프', en: 'the Moment · vs T1 Playoffs', ja: 'the Moment · vs T1 プレーオフ', zh: 'the Moment · vs T1 季后赛', 'vi': 'the Moment · vs T1 Playoffs'},
    event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'},
    point: { ko: '루시드 = 강타의 신', en: 'Lucid = god of Smite', ja: 'ルシード＝スマイトの神', zh: 'Lucid = 惩戒之神', 'vi': 'Lucid = thần Trừng Phạt'} },
  { id: 'sWtO3OSF1k4', len: '3:35', cat: 'madmovie', channel: 'Dplus Kia', team: 'DK', year: 2026,
    match: { ko: 'Worlds 2026 RECAP', en: 'Worlds 2026 RECAP', ja: 'Worlds 2026 RECAP', zh: 'Worlds 2026 RECAP', 'vi': 'TỔNG KẾT Worlds 2026'},
    event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'},
    point: { ko: '2026 월즈 3분 요약', en: 'Worlds 2026 in three minutes', ja: '2026 ワールズ 3分まとめ', zh: '2026 世界赛三分钟回顾', 'vi': 'Worlds 2026 trong ba phút'} },
      { id: '2qBeeX0Yr1c', len: '5:43', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: '8강전의 각오', en: 'Quarterfinal resolve', ja: '準々決勝への覚悟', zh: '八强战的决心', 'vi': 'Quyết tâm trước trận tứ kết'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'behind', point: { ko: '올해 더 오래', en: 'Longer this year', ja: '今年はもっと長く', zh: '今年走得更远', 'vi': 'Năm nay đi xa hơn'} },
      { id: '4TBsieLM6p8', len: '5:53', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Worlds 2026 vs MKOI', en: 'Worlds 2026 vs MKOI', ja: 'Worlds 2026 vs MKOI', zh: 'Worlds 2026 vs MKOI', 'vi': 'Worlds 2026 vs MKOI'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'behind', point: { ko: 'cvMax의 시선 — MKOI전', en: 'cvMax\'s view — vs MKOI', ja: 'cvMaxの視点 — MKOI戦', zh: 'cvMax 的视角 — 对阵 MKOI', 'vi': 'Góc nhìn của cvMax — gặp MKOI'} },
      { id: 'VVifvKabX2o', len: '13:34', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'behind', point: { ko: '우리가 담고 싶은 한 장의 사진', en: 'The photo we wanted to capture', ja: '僕たちが収めたかった一枚', zh: '我们想留下的一张照片', 'vi': 'Bức ảnh chúng tôi muốn lưu lại'} },
      { id: 'XLHo3AGRFFo', len: '9:02', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Worlds 2026', en: 'Worlds 2026', ja: 'Worlds 2026', zh: 'Worlds 2026', 'vi': 'Worlds 2026'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'behind', point: { ko: '비상', en: 'Take flight', ja: '飛翔', zh: '起飞', 'vi': 'Cất cánh'} },
      { id: 'oHHKuHevgqY', len: '10:44', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Dplus Kia', en: 'Dplus Kia', ja: 'Dplus Kia', zh: 'Dplus Kia', 'vi': 'Dplus Kia'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['olaf'], point: { ko: '올라프의 신이야', en: 'He is the god of Olaf', ja: 'オラフの神だ', zh: '他就是奥拉夫之神', 'vi': 'Thần Olaf đây rồi'} },
      { id: '8qCCO2ria9Q', len: '9:55', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Dplus Kia', en: 'Dplus Kia', ja: 'Dplus Kia', zh: 'Dplus Kia', 'vi': 'Dplus Kia'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['nasus'], point: { ko: '나서스 장인을 꿈꾼다', en: 'Dreaming of becoming a Nasus master', ja: 'ナサスの達人を夢見る', zh: '梦想成为内瑟斯大师', 'vi': 'Mơ thành bậc thầy Nasus'} },
      { id: 'GRD1DpMqoSE', len: '9:23', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Dplus Kia', en: 'Dplus Kia', ja: 'Dplus Kia', zh: 'Dplus Kia', 'vi': 'Dplus Kia'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'highlight', champ: ['kled'], point: { ko: '클레드=시우', en: 'Kled = Siwoo', ja: 'クレッド＝シウ', zh: '克烈＝时雨', 'vi': 'Kled = Siwoo'} },
      { id: 'xKWUGuS9Ly0', len: '3:37', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'madmovie', point: { ko: '이 모든 노력들이 모였을 때', en: 'When all this effort comes together', ja: 'この努力がすべて重なったとき', zh: '当所有努力汇聚之时', 'vi': 'Khi mọi nỗ lực này hội tụ'} },
      { id: 'L0AZFNqGqq4', len: '52:23', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'Dplus Kia', en: 'Dplus Kia', ja: 'Dplus Kia', zh: 'Dplus Kia', 'vi': 'Dplus Kia'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'madmovie', point: { ko: 'Dplus Kia의 심장, 그가 꿈꾸는 무대', en: 'The heart of Dplus Kia, the stage he dreams of', ja: 'Dplus Kiaの心、彼が見る夢の舞台', zh: 'Dplus Kia 的心脏，他梦想的舞台', 'vi': 'Trái tim của Dplus Kia, sân khấu anh hằng mơ'} },
      { id: 'MX_D9Dma5zc', len: '7:32', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'T1전 복기', en: 'Reviewing the T1 series', ja: 'T1戦の復習', zh: '复盘 T1 之战', 'vi': 'Xem lại loạt trận với T1'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: '상승을 위한 리마인드', en: 'A reminder to climb', ja: '上昇のためのリマインド', zh: '为上升而复盘', 'vi': 'Lời nhắc để vươn lên'} },
      { id: 'xs8v6jZPpV8', len: '9:47', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: '2026 EWC vs GEN', en: '2026 EWC vs GEN', ja: '2026 EWC vs GEN', zh: '2026 EWC vs GEN', 'vi': 'EWC 2026 vs GEN'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'behind', point: { ko: 'GEN전 밴픽 비하인드', en: 'Behind the draft vs GEN', ja: 'GEN戦ドラフトの舞台裏', zh: '对阵 GEN 的 BP 花絮', 'vi': 'Hậu trường cấm chọn gặp GEN'} },
      { id: 'e3RyJXpwLPg', len: '6:51', channel: 'Dplus Kia', team: 'DK', year: 2025, match: { ko: '2025 워크숍 스케치', en: '2025 workshop sketch', ja: '2025 ワークショップスケッチ', zh: '2025 研讨会花絮', 'vi': 'Ký họa buổi workshop 2025'}, event: { ko: 'Dplus Kia 공식 유튜브', en: 'Dplus Kia official YouTube', ja: 'Dplus Kia 公式YouTube', zh: 'Dplus Kia 官方 YouTube', 'vi': 'YouTube chính thức Dplus Kia'}, tags: [], cat: 'behind', point: { ko: '케스파컵 워크숍 비하인드', en: 'KeSPA Cup workshop behind', ja: 'KeSPAカップ ワークショップ舞台裏', zh: 'KeSPA 杯研讨会花絮', 'vi': 'Hậu trường workshop KeSPA Cup'} },
      { id: 'LaM1No-TI2E', len: '23:27', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs HLE · GEN R4', en: 'vs HLE · GEN R4', ja: 'vs HLE · GEN R4', zh: 'vs HLE · GEN R4', 'vi': 'vs HLE · GEN vòng 4'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: '플레이오프를 향해', en: 'Toward the playoffs', ja: 'プレーオフに向かって', zh: '向着季后赛', 'vi': 'Hướng tới playoffs'} },
      { id: 'ppVsMRqpOF4', len: '20:02', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs KT R3', en: 'vs KT R3', ja: 'vs KT R3', zh: 'vs KT R3', 'vi': 'vs KT vòng 3'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: '정규 시즌 R3를 마치며', en: 'Closing out regular season round 3', ja: 'レギュラーR3を終えて', zh: '常规赛第三轮收官', 'vi': 'Khép lại vòng 3 mùa thường'} },
      { id: 'hIllcAXbSww', len: '14:01', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs T1 R4', en: 'vs T1 R4', ja: 'vs T1 R4', zh: 'vs T1 R4', 'vi': 'vs T1 vòng 4'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: 'cvMax가 경기력 칭찬하는 14분', en: 'Fourteen minutes of cvMax praising the team', ja: 'cvMaxが戦いぶりを褒める14分', zh: 'cvMax 夸赞队伍的十四分钟', 'vi': '14 phút cvMax khen màn trình diễn'} },
      { id: 'PkuGPs18zLo', len: '25:41', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs T1 R4', en: 'vs T1 R4', ja: 'vs T1 R4', zh: 'vs T1 R4', 'vi': 'vs T1 vòng 4'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: '라이브러리 메이커', en: 'Library Maker', ja: 'ライブラリーメーカー', zh: '图书馆 Maker', 'vi': 'Library Maker'} },
      { id: 'M7fLebmE9KE', len: '10:28', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs KT R2', en: 'vs KT R2', ja: 'vs KT R2', zh: 'vs KT R2', 'vi': 'vs KT vòng 2'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'behind', point: { ko: '기본으로 돌아가기', en: 'Back to basics', ja: '基本に立ち返る', zh: '回归基本功', 'vi': 'Trở về với điều cơ bản'} },
      { id: 'VpwEO3OH3YE', len: '29:51', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs KT P.O.', en: 'vs KT P.O.', ja: 'vs KT P.O.', zh: 'vs KT P.O.', 'vi': 'vs KT Playoffs'}, event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'}, tags: [], cat: 'behind', point: { ko: '가장 큰 목표를 향해', en: 'Toward the biggest goal', ja: '最大の目標へ', zh: '向着最大的目标', 'vi': 'Hướng tới mục tiêu lớn nhất'} },
      { id: 'jjJhw_s06ww', len: '11:05', channel: 'Dplus Kia', team: 'DK', year: 2026, match: { ko: 'vs DRX 플레이오프', en: 'vs DRX playoffs', ja: 'vs DRX プレーオフ', zh: 'vs DRX 季后赛', 'vi': 'vs DRX Playoffs'}, event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'}, tags: [], cat: 'behind', point: { ko: 'Better Than Yesterday', en: 'Better than yesterday', ja: '昨日より良い自分', zh: '比昨天更好', 'vi': 'Tốt hơn chính mình hôm qua'} },
      { id: '1i-7BEu3EOc', len: '4:52', channel: 'LCK', team: 'DK', year: 2026, match: { ko: '스위스 Day1-4 매드무비', en: 'Swiss Day 1-4 montage', ja: 'スイス Day1-4 マッドムービー', zh: '瑞士轮 Day1-4 剪辑', 'vi': 'Montage Thụy Sĩ ngày 1-4'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'madmovie', point: { ko: '디플러스 한방기아', en: 'One-shot KIA', ja: 'Dplus 一撃KIA', zh: 'Dplus 一击KIA', 'vi': 'Dplus một đòn hạ gục'} },
      { id: 'mJYUy1SK_N8', len: '14:19', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs T1 · 스위스 Day2', en: 'DK vs T1 · Swiss Day 2', ja: 'DK vs T1 スイス Day2', zh: 'DK vs T1 · 瑞士轮 Day2', 'vi': 'DK vs T1 · Thụy Sĩ ngày 2'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '월즈 스위스, DK vs T1', en: 'Worlds Swiss: DK vs T1', ja: 'ワールズ スイス DK vs T1', zh: '世界赛瑞士轮 DK vs T1', 'vi': 'Thụy Sĩ Worlds: DK vs T1'} },
      { id: 's634hzsM2M4', len: '11:38', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs G2 · 스위스 Day1', en: 'DK vs G2 · Swiss Day 1', ja: 'DK vs G2 スイス Day1', zh: 'DK vs G2 · 瑞士轮 Day1', 'vi': 'DK vs G2 · Thụy Sĩ ngày 1'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '월즈 첫 경기, DK vs G2', en: 'Worlds opener: DK vs G2', ja: 'ワールズ初戦 DK vs G2', zh: '世界赛首战 DK vs G2', 'vi': 'Trận mở màn Worlds: DK vs G2'} },
      { id: 'KtSUQSaAgQg', len: '31:12', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'MKOI vs DK · 스위스 Day3', en: 'MKOI vs DK · Swiss Day 3', ja: 'MKOI vs DK スイス Day3', zh: 'MKOI vs DK · 瑞士轮 Day3', 'vi': 'MKOI vs DK · Thụy Sĩ ngày 3'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: 'MKOI전 3세트 승부', en: 'A three-game battle with MKOI', ja: 'MKOI戦 3試合の勝負', zh: '与 MKOI 的三局鏖战', 'vi': 'Trận chiến ba ván với MKOI'} },
      { id: 'q4T4DD_SXVg', len: '8:06', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'MKOI vs DK · 2세트', en: 'MKOI vs DK · Game 2', ja: 'MKOI vs DK 第2試合', zh: 'MKOI vs DK · 第2局', 'vi': 'MKOI vs DK · Ván 2'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '서늘하고 묵직한 한 방', en: 'A cool, heavy blow', ja: '冷たく重い一撃', zh: '冷静而沉重的一击', 'vi': 'Một đòn lạnh và nặng'} },
      { id: 'NbvXmaYKLDI', len: '45:18', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BLG vs DK · 8강 Day3', en: 'BLG vs DK · Quarters Day 3', ja: 'BLG vs DK 準々決勝 Day3', zh: 'BLG vs DK · 八强 Day3', 'vi': 'BLG vs DK · Tứ kết ngày 3'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '8강 BLG전, 마지막까지', en: 'Quarterfinal vs BLG, to the last', ja: '準々決勝 BLG戦、最後まで', zh: '八强对阵 BLG，战斗到底', 'vi': 'Tứ kết gặp BLG, đến phút cuối'} },
      { id: 'lyhJoGKKaOc', len: '11:53', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BLG vs DK · 1세트', en: 'BLG vs DK · Game 1', ja: 'BLG vs DK 第1試合', zh: 'BLG vs DK · 第1局', 'vi': 'BLG vs DK · Ván 1'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '갈! — BLG전 1세트', en: 'Go! — game 1 vs BLG', ja: 'ゴー！— BLG戦第1試合', zh: '冲！— 对阵 BLG 第一局', 'vi': 'Tiến lên! — ván 1 gặp BLG'} },
      { id: 'Ob_bvHQ8kgA', len: '10:06', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BLG vs DK · 2세트', en: 'BLG vs DK · Game 2', ja: 'BLG vs DK 第2試合', zh: 'BLG vs DK · 第2局', 'vi': 'BLG vs DK · Ván 2'}, event: { ko: '2026 월드 챔피언십', en: 'Worlds 2026', ja: '2026 ワールズ', zh: '2026 世界赛', 'vi': 'Worlds 2026'}, tags: [], cat: 'highlight', point: { ko: '노룩 스킬샷 — BLG전 2세트', en: 'No-look skillshot — game 2 vs BLG', ja: 'ノールックスキルショット — BLG戦第2試合', zh: '盲视野技能 — 对阵 BLG 第二局', 'vi': 'Chiêu không nhìn — ván 2 gặp BLG'} },
      { id: 'ZYP5QHpxPVQ', len: '10:10', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'BFX vs DK · 5세트', en: 'BFX vs DK · Game 5', ja: 'BFX vs DK 第5試合', zh: 'BFX vs DK · 第5局', 'vi': 'BFX vs DK · Ván 5'}, event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'}, tags: [], cat: 'highlight', point: { ko: 'BFX전 5세트, 복수 성공', en: 'Game 5 vs BFX: revenge delivered', ja: 'BFX戦第5試合、リベンジ成功', zh: '对阵 BFX 第五局，复仇成功', 'vi': 'Ván 5 gặp BFX: phục thù thành công'} },
      { id: 'FAQi_3yUqqc', len: '12:57', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'T1 vs DK · 1세트', en: 'T1 vs DK · Game 1', ja: 'T1 vs DK 第1試合', zh: 'T1 vs DK · 第1局', 'vi': 'T1 vs DK · Ván 1'}, event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'}, tags: [], cat: 'highlight', point: { ko: '원콤맨 — T1전 1세트', en: 'One-combo man — game 1 vs T1', ja: 'ワンコンボマン — T1戦第1試合', zh: '一套带走 — 对阵 T1 第一局', 'vi': 'One-combo man — ván 1 gặp T1'} },
      { id: 'DqRhieiuBH8', len: '10:40', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'KT vs DK · 1세트', en: 'KT vs DK · Game 1', ja: 'KT vs DK 第1試合', zh: 'KT vs DK · 第1局', 'vi': 'KT vs DK · Ván 1'}, event: { ko: '2026 LCK 플레이오프', en: '2026 LCK Playoffs', ja: '2026 LCK プレーオフ', zh: '2026 LCK 季后赛', 'vi': 'Playoffs LCK 2026'}, tags: [], cat: 'highlight', point: { ko: 'KT전 1세트', en: 'Game 1 vs KT', ja: 'KT戦第1試合', zh: '对阵 KT 第一局', 'vi': 'Ván 1 gặp KT'} },
      { id: 'rRz9GG-h96o', len: '13:12', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'DK vs HLE · 1세트', en: 'DK vs HLE · Game 1', ja: 'DK vs HLE 第1試合', zh: 'DK vs HLE · 第1局', 'vi': 'DK vs HLE · Ván 1'}, event: { ko: '2026 LCK', en: '2026 LCK', ja: '2026 LCK', zh: '2026 LCK', 'vi': 'LCK 2026'}, tags: [], cat: 'highlight', point: { ko: '오직 원딜만 — HLE전 1세트', en: 'Only the ADC — game 1 vs HLE', ja: 'ADCだけ — HLE戦第1試合', zh: '只靠射手 — 对阵 HLE 第一局', 'vi': 'Chỉ xạ thủ — ván 1 gặp HLE'} },
      { id: 'yX9hjlJAS8w', len: '9:34', channel: 'LCK', team: 'DK', year: 2026, match: { ko: 'T1 vs DK · 5세트', en: 'T1 vs DK · Game 5', ja: 'T1 vs DK 第5試合', zh: 'T1 vs DK · 第5局', 'vi': 'T1 vs DK · Ván 5'}, event: { ko: '2026 LCK 컵 플레이오프', en: '2026 LCK Cup Playoffs', ja: '2026 LCKカップ プレーオフ', zh: '2026 LCK 杯 季后赛', 'vi': 'Playoffs LCK Cup 2026'}, tags: [], cat: 'highlight', point: { ko: '강타의 신 — T1전 5세트', en: 'God of Smite — game 5 vs T1', ja: 'スマイトの神 — T1戦第5試合', zh: '惩戒之神 — 对阵 T1 第五局', 'vi': 'Thần Trừng Phạt — ván 5 gặp T1'} },
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
    title: { ko: '2026 LCK 어워드', en: '2026 LCK Awards', ja: '2026 LCKアワード', zh: '2026 LCK 颁奖礼', 'vi': 'Lễ trao giải LCK 2026'},
    sub: {
      ko: '치지직 롤파크 · CHZZK·SOOP 생중계',
      en: 'CHZZK LoL Park, Seoul · live on CHZZK & SOOP',
      ja: 'CHZZK LoL Park・CHZZK/SOOP 生中継',
      zh: 'CHZZK LoL Park · CHZZK/SOOP 直播', 'vi': 'CHZZK LoL Park, Seoul · phát trực tiếp trên CHZZK & SOOP'},
    note: {
      ko: 'DK 스매쉬 신인왕 · 팬 팀 투표 11.26 마감',
      en: 'DK Smash took Rookie of the Year · fan vote closed 11/26',
      ja: 'DK スマッシュ新人王・ファン投票は11/26終了',
      zh: 'DK Smash 最佳新人 · 粉丝投票 11/26 截止', 'vi': 'Smash (DK) đoạt Tân binh xuất sắc nhất · bình chọn fan kết thúc 26/11'},
    url: 'https://lolesports.com/ko-KR/news/2026-lck-awards-voting-method-and-criteria'
  },
  {
    id: 'lck-cup-2027',
    date: '2027-01-14',
    tentative: true,
    kind: 'season',
    title: { ko: '2027 LCK 컵', en: '2027 LCK Cup', ja: '2027 LCKカップ', zh: '2027 LCK 杯', 'vi': 'LCK Cup 2027'},
    sub: {
      ko: '개막일 미발표 · 1월 중순 예상',
      en: 'Opening day not announced · mid-January',
      ja: '開幕日未発表・1月中旬の見込み',
      zh: '开幕日未公布 · 预计1月中旬', 'vi': 'Chưa công bố ngày khai mạc · dự kiến giữa tháng 1'},
    note: {
      ko: '2026 시즌은 1월 14일 개막 · 확정되면 알려드려요',
      en: 'The 2026 season opened Jan 14 · updates when confirmed',
      ja: '2026シーズンは1月14日開幕・確定次第更新',
      zh: '2026 赛季 1月14日开幕 · 确定后更新', 'vi': 'Mùa 2026 khai mạc ngày 14/1 · sẽ báo khi có xác nhận'},
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
