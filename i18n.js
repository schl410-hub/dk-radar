/* 딮기 시그널 · 다국어 (KO · EN · JA)
 * UI 문구·날짜 표기·포지션/티어 이름을 한 곳에서 관리합니다.
 * app.js 는 I18N.t('key', {vars}) 로 문구를 가져오고, 언어가 바뀌면 renderAll() 을 다시 돌립니다.
 */
(function (global) {
  'use strict';

  var LANG_KEY = 'dk.signal.lang';

  var LANGS = [
    { code: 'ko', label: 'KO', name: '한국어', htmlLang: 'ko' },
    { code: 'en', label: 'EN', name: 'English', htmlLang: 'en' },
    { code: 'ja', label: 'JA', name: '日本語', htmlLang: 'ja' }
  ];

  var DICT = {
    /* ================= 한국어 ================= */
    ko: {
      'app.title': '딮기 시그널 · DK SIGNAL',
      'app.short': '딮기 시그널',
      'app.desc': '도란과 디플러스 기아 5인의 공식 경기·솔로랭크를 한눈에 보는 딮기 시그널. 다크 네온 민트 / 소프트 민트 글래스 테마 지원.',
      'brand.sub': '딮기 시그널',
      'brand.home': '딮기 시그널 홈',
      'lang.label': '언어',
      'theme.dark': '다크',
      'theme.mint': '소프트',
      'theme.toDark': '다크 네온 민트 테마로 전환',
      'theme.toMint': '소프트 민트 테마로 전환',
      'theme.title': '다크 / 소프트 테마 전환',
      'install': '설치',
      'nav.aria': '화면 선택',
      'tab.feed': '홈',
      'tab.official': '공식일정',
      'tab.solo': '경기로그',
      'tab.records': '기록실',

      'live': '실시간',
      'autoUpdate': '자동 갱신',
      'now': '지금',
      'updatedAt': '{time} 갱신',
      'checkedAt': '{time} 확인',

      'pos.TOP': '탑',
      'pos.JGL': '정글',
      'pos.MID': '미드',
      'pos.BOT': '원딜',
      'pos.SUP': '서폿',
      'tier.IRON': '아이언',
      'tier.BRONZE': '브론즈',
      'tier.SILVER': '실버',
      'tier.GOLD': '골드',
      'tier.PLATINUM': '플래티넘',
      'tier.EMERALD': '에메랄드',
      'tier.DIAMOND': '다이아몬드',
      'tier.MASTER': '마스터',
      'tier.GRANDMASTER': '그랜드마스터',
      'tier.CHALLENGER': '챌린저',
      'tier.UNRANKED': '언랭크',
      'tier.short.DIAMOND': '다이아',

      'day.today': '오늘',
      'day.yesterday': '어제',
      'winrate': '승률 {r}%',
      'board.title': '5인 상태 보드',
      'board.sub': '타일을 눌러 둘러보기 · 별로 최애 고정',
      'board.note.riot': '솔로랭크 · Riot API 실시간 ({stamp} 갱신)',
      'board.note.offline': '최근 솔로랭크 기록 기준 · 2026-11-26 확인(오프라인)',
      'board.note.pending': '최근 솔로랭크 기록 기준 · 2026-11-26 확인(자동 갱신 준비 중)',

      'pick.mypick': 'MY PICK · 오늘의 {name}',
      'pick.preview': '미리보기 · {name}',
      'pick.pin': '최애 고정',
      'pick.pinned': '내 최애',
      'pick.pinAriaOn': '내 최애로 고정됨',
      'pick.pinAriaOff': '이 선수를 내 최애로 고정',
      'pick.recent5': '최근 5경기',
      'pick.wl': '{w}승 {l}패',
      'pick.inGame': '인게임',
      'pick.hint': '내 최애는 <b>{fav}</b> · 별을 누르면 <b>{name}</b>{obj} 최애로 고정해요',
      'pick.viewAria': '{name} 보기',
      'pick.favSuffix': ' (내 최애)',
      'pick.switchAria': 'MY PICK 선수 빠른 선택',
      'pick.toastNew': '★ {name}{obj} 내 최애(MY PICK)로 고정했어요.',
      'pick.toastSame': '★ {name}{topic} 이미 내 최애로 고정돼 있어요.',
      'pick.lastGame': '{d} {t} <b>{champ}</b> {kda} · {result}',
      'pick.viewProfile': '선수 프로필 ↗',

      'result.win': '승',
      'result.lose': '패',
      'result.w': 'W',
      'result.l': 'L',

      'hl.last5Rate': '최근 5경기 승률',
      'hl.kda': 'KDA',
      'hl.total': '{n}경기 합계',
      'hl.allStats': '전체 전적 ↗',

      'links.title': '방송국 · 전적',
      'links.stream': '방송국',
      'links.stats': '전적',
      'links.watch': '관전 · 전적',
      'links.note': '선수 개인 방송국과 전적 사이트로 바로 갑니다.',
      'links.noStream': '개인 방송국 확인 중',

      'video.title': '대표 하이라이트',
      'video.sub': '{name} 선수의 시그니처 장면을 유튜브에서 바로 봐요.',
      'video.badge': 'LCK 공식',
      'video.watch': '유튜브에서 보기 ↗',
      'video.channel': 'LCK 공식 유튜브',
      'video.more': 'Dplus KIA 유튜브 ↗',
      'video.empty': '하이라이트를 준비 중이에요.',
      'video.len': '영상 길이 {len}',

      'notify.title': '알림 설정',
      'notify.summaryOn': '{n}개 켜짐',
      'notify.summaryOff': '모두 꺼짐',
      'notify.soloHead': '선수 솔랭 알림',
      'notify.soloSub': '선수마다 따로 켜고 꺼요',
      'notify.soloRow': '최근 5경기 {w}승 {l}패',
      'notify.official': 'DK 공식 경기 알림',
      'notify.officialSub': '경기 일정·시작 소식',
      'notify.toggleOn': '{name} 솔로랭크 알림 끄기',
      'notify.toggleOff': '{name} 솔로랭크 알림 켜기',
      'notify.officialToggleOn': 'DK 공식 경기 알림 끄기',
      'notify.officialToggleOff': 'DK 공식 경기 알림 켜기',
      'notify.test': '테스트 알림 보내기',
      'notify.statusBoth': '{name} 솔랭 · 경기 알림 켜짐',
      'notify.statusSolo': '{name} 솔랭 알림만 켜짐',
      'notify.statusOfficial': '경기 알림만 켜짐',
      'notify.statusNone': '켜진 알림이 없어요',
      'notify.pushPreview': '미리보기 파일이라 서버 알림은 꺼져 있어요.',
      'notify.pushOffline': '자동 갱신 서버에 연결되지 않아 알림은 앱을 열었을 때만 확인돼요.',
      'notify.pushChecking': '서버 상태 확인 중…',
      'notify.pushNoVapid': '웹 푸시 준비 전(VAPID 키 미등록) · 지금은 앱을 열어 둔 동안만 자동으로 확인해요.',
      'notify.pushNoStore': '구독 저장소(Upstash Redis) 연결 전 · 저장소를 붙이면 잠금화면 알림이 켜져요.',
      'notify.pushDenied': '브라우저 알림 권한이 꺼져 있어요. 사이트 설정에서 알림을 허용해 주세요.',
      'notify.pushSubscribed': '웹 푸시 켜짐 · 앱을 닫아도 새 전적·경기 소식이 잠금화면에 도착해요.',
      'notify.pushUnsubscribed': '푸시 구독을 해지했어요. 알림을 다시 켜면 잠금화면으로 알려드려요.',
      'notify.pushIdle': '알림을 켜면 잠금화면으로도 알려드려요.',
      'notify.noteOn': '앱을 닫아 둬도 서버가 5분마다 확인해서 새 소식을 보내드려요.',
      'notify.noteOff': '지금은 앱을 열어 둔 동안 자동으로 새 전적을 확인해요. 서버 푸시를 켜면 앱을 닫아도 알림이 옵니다.',

      'cheer.title': '한 줄 응원',
      'cheer.count': '{n}줄',
      'cheer.placeholder': '{name}에게 한 줄 응원을 남겨보세요',
      'cheer.aria': '한 줄 응원 입력',
      'cheer.send': '응원 남기기',
      'cheer.empty': '아직 남긴 응원이 없어요. 첫 한 줄을 남겨보세요.',
      'cheer.note': '이 기기에만 저장돼요.',
      'cheer.delete': '응원 삭제',
      'time.just': '방금',
      'time.min': '{n}분 전',
      'time.hour': '{n}시간 전',
      'time.day': '{n}일 전',
      'time.old': '이전',

      'solo.title': '최근 솔로랭크 전적',
      'solo.meta': '{riotId} · 최근 {n}경기 {w}승 {l}패 · {stamp} 확인{src}',
      'solo.srcRiot': ' · Riot API 실시간',
      'solo.srcSnapshot': ' · 스냅샷',
      'solo.moreOpgg': 'OP.GG에서 전체 전적 보기 ↗',
      'solo.moreUgg': 'u.gg에서 전체 전적 보기 ↗',
      'solo.more': '전체 전적 보기 ↗',
      'solo.panelMeta': '{name} 선수의 최근 {n}경기예요. 승·패만 골라 볼 수 있어요.',
      'solo.pickerAria': '선수 선택',
      'solo.filter.all': '전체',
      'solo.filter.win': '승리',
      'solo.filter.lose': '패배',
      'solo.empty': '해당하는 경기가 없어요.',
      'solo.thWhen': '시각 (KST)',
      'solo.thChamp': '챔피언',
      'solo.thRole': '포지션',
      'solo.thResult': '결과',
      'solo.thKda': 'K / D / A',
      'solo.thDur': '시간',
      'solo.perfect': '퍼펙트 게임',
      'solo.live': 'Riot API 실시간 · {n}경기까지 자동 갱신',
      'solo.footerLive': '솔로랭크 기록은 Riot API에서 {time}에 받아왔어요. 최근 5경기까지 자동으로 갱신됩니다.',
      'solo.footerSnapshot': '솔로랭크 기록은 각 선수 계정의 공개 전적을 2026-11-26에 확인한 값이에요. 서버에 Riot API 키를 넣으면 자동 갱신됩니다.',
      'solo.msgRateLimited': 'Riot API 호출 한도를 잠깐 넘었어요. 잠시 뒤에 다시 확인합니다.',
      'solo.msgError': 'Riot API 응답을 받지 못했어요. 잠시 뒤 다시 시도합니다.',
      'solo.msgPartial': '일부 선수 전적을 받지 못했어요.',
      'solo.msgNoKey': 'RIOT_API_KEY 가 없어서 2026-11-26 스냅샷을 보여줘요. Vercel 환경변수에 키를 넣으면 자동으로 실시간 전적이 됩니다.',

      'roster.eyebrow': 'DPLUS KIA · 2027 ROSTER',
      'roster.title': '도카쇼스딜',
      'roster.meta': '2027 시즌 디플러스 기아 로스터 5인. 이름을 눌러 선수를 바꿀 수 있어요.',

      'foot.about': '<b>딮기 시그널</b> · 공식 경기는 LoL Esports에서 자동으로 받아 오고, 솔로랭크는 공개 전적(KO.LOL·OP.GG·u.gg)을 기준값으로 두고 있어요. 아래 \'자동 갱신\' 안내를 확인해 주세요.',
      'foot.disclaimer': '이 앱은 팬이 만든 비공식 대시보드이며 디플러스 기아·라이엇 게임즈와 무관합니다.',
      'foot.official': '경기 일정·결과는 LoL Esports 공개 일정에서 자동으로 받아옵니다.',
      'foot.solo': '솔로랭크 기록은 각 선수 계정의 공개 전적을 기준으로 표시합니다.',
      'foot.records': '2026 시즌 대회 기록은 KO.LOL 공개 데이터를 옮겼어요. 우승·준우승 표기는 확인된 대회만 적었습니다.',

      'official.title': '공식일정',
      'official.sub': '다음 일정과 최근 공식 경기를 모아 봤어요.',
      'official.next': 'NEXT',
      'official.nextDateFallback': '2027 LCK 컵',
      'official.nextTitleFallback': 'DK 2027 첫 경기',
      'official.nextSubFallback': '2027 시즌도 <b>LCK 컵</b>으로 시작해요. LCK가 2027 대회 방식과 일정을 확정하면 DK 첫 경기를 이 카드에 바로 띄울게요.',
      'official.nextNoUpcoming': '지금은 LoL Esports에 다음 경기가 아직 올라오지 않았어요.',
      'official.nextError': '일정을 잠시 못 받아왔어요. 화면은 마지막으로 확인된 안내로 보여드려요.',
      'official.syncPreview': '단일 파일 미리보기라 자동 갱신은 꺼져 있어요. 실제 앱(dk-signal.vercel.app)에서 갱신됩니다.',
      'official.syncOffline': '자동 갱신 서버에 연결하지 못했어요. 저장된 기록으로 보여드려요.',
      'official.syncOk': 'LoL Esports에서 {time} 확인 · {next}',
      'official.syncOkNext': '다음 경기가 잡히면 바로 바뀝니다',
      'official.syncOkNoNext': '다음 경기 공개 전',
      'official.syncFail': '일정을 불러오지 못했어요. 잠시 뒤 다시 확인합니다.',
      'official.syncLoading': 'LoL Esports 일정 확인 중…',
      'official.alertTitle': '경기 알림',
      'official.alertSub': 'DK 공식 경기 일정·시작 소식',
      'official.scheduleLink': 'LoL Esports 일정 확인 ↗',
      'official.recent': '최근 DK 공식 경기',
      'official.recentFallbackNote': '서버에서 일정을 받기 전이라 마지막으로 확인한 월즈 2026 기록을 보여드려요.',
      'official.recentNote': 'LoL Esports 공개 일정에서 {time}에 받아온 결과예요 · 자동 수집',
      'official.seasonEyebrow': '2027 SEASON ROADMAP',
      'official.seasonTitle': '2027 시즌 캘린더',
      'official.seasonMeta': 'LCK는 2025년부터 스프링·서머 스플릿을 없애고 <b>LCK 컵 → 단일 정규 시즌</b>으로 치러요. 2027년은 여기에 <b>First Stand: All In</b>이 시즌 첫 국제 대회로 붙습니다.',
      'official.seasonNote': '2027 국제 대회 개최지는 2026-11-13 LoL e스포츠 발표 기준 · LCK 2027 세부 일정은 추후 공지',
      'official.lastTitle': '선수별 최근 공식 경기',

      'video.liveTitle': '생중계 · 영상',
      'video.liveNow': '지금 볼 수 있는 곳',
      'video.chzzk': 'CHZZK',
      'video.soop': 'SOOP',
      'video.youtube': 'YouTube',
      'video.chzzkAria': 'CHZZK LCK 공식 생중계 열기',
      'video.soopAria': 'SOOP LCK 공식 생중계 열기',
      'video.youtubeAria': 'LCK 유튜브 채널 열기 (해외 시청)',
      'video.liveNote': 'LCK 국내 생중계는 CHZZK·SOOP 공식 채널에서, 해외는 LCK 유튜브에서 볼 수 있어요.',
      'video.vod': '풀영상 VOD',
      'video.highlight': '하이라이트',
      'video.highlightSearch': '유튜브에서 이 경기 하이라이트 찾기',
      'video.vodSearch': '유튜브에서 이 경기 풀영상 찾기',
      'video.dkChannel': 'DK 유튜브',
      'video.searchNote': '공식 VOD가 확인되지 않은 경기는 유튜브 검색으로 연결합니다.',
      'video.match': '{league} · {date}',
      'video.gameNo': '{n}세트',

      'records.title': '기록실',
      'records.sub': '2026 시즌 기준 공개 기록이에요. 오른쪽 숫자는 세트 승·패입니다.',
      'records.season': '2026 시즌',
      'records.who': '{name} · 2026 시즌',
      'records.worlds': '2026 월즈 결과',
      'records.result.CHAMP': '우승',
      'records.result.RUNNER': '준우승',
      'records.result.SEMI': '4강',
      'records.result.QF': '8강',
      'records.result.R5': '5라운드',
      'records.result.R3': '3라운드',
      'records.set': '{w}승 {l}패',

      'banner.testTitle': '{name} · 테스트 알림',
      'banner.testOfficial': 'DK 공식 경기 · 딮기 시그널',
      'banner.testSoloBody': '테스트 알림이에요. {name} 새 솔로랭크 경기가 잡히면 이렇게 도착해요.',
      'banner.testOfficialBody': '테스트 알림이에요. DK 다음 공식 경기 일정이 잡히면 이렇게 도착해요.',
      'banner.soloDone': '{name} 솔랭 알림으로 테스트를 보냈어요.',
      'banner.officialDone': '경기 알림으로 테스트를 보냈어요.',
      'banner.doneSuffix': ' 잠금화면에서 확인해 보세요.',
      'banner.noneTitle': '딮기 시그널',
      'banner.noneBody': '켜진 알림이 없어요. 알림 설정에서 켜고 테스트해 보세요.',
      'banner.noneNote': '켜진 알림이 없어요. 먼저 알림을 켜 주세요.',
      'banner.fallbackNote': '앱 안 알림으로 대신 보여드렸어요.',
      'banner.bgText': '새 솔로랭크 소식이 이렇게 도착해요.',
      'banner.installTitle': '홈 화면에 추가',
      'banner.installBody': '브라우저 메뉴의 "홈 화면에 추가"를 눌러도 설치할 수 있어요.',
      'banner.online': '다시 연결됐어요.',
      'banner.close': '알림 닫기',
      'banner.now': '지금'
    },

    /* ================= English ================= */
    en: {
      'app.title': 'DK SIGNAL',
      'app.short': 'DK SIGNAL',
      'app.desc': 'DK SIGNAL — Dplus KIA 2027 and Doran at a glance: official match schedule, live & highlight videos, solo queue, and every player’s stream. Dark neon mint and soft mint glass themes.',
      'brand.sub': 'Dplus KIA tracker',
      'brand.home': 'DK SIGNAL home',
      'lang.label': 'Language',
      'theme.dark': 'Dark',
      'theme.mint': 'Soft',
      'theme.toDark': 'Switch to the dark neon mint theme',
      'theme.toMint': 'Switch to the soft mint glass theme',
      'theme.title': 'Toggle dark / soft theme',
      'install': 'Install',
      'nav.aria': 'Choose a screen',
      'tab.feed': 'Home',
      'tab.official': 'Schedule',
      'tab.solo': 'Match log',
      'tab.records': 'Records',

      'live': 'LIVE',
      'autoUpdate': 'Auto-updated',
      'now': 'now',
      'updatedAt': 'Updated {time}',
      'checkedAt': 'Checked {time}',

      'pos.TOP': 'Top',
      'pos.JGL': 'Jungle',
      'pos.MID': 'Mid',
      'pos.BOT': 'Bot',
      'pos.SUP': 'Support',
      'tier.IRON': 'Iron',
      'tier.BRONZE': 'Bronze',
      'tier.SILVER': 'Silver',
      'tier.GOLD': 'Gold',
      'tier.PLATINUM': 'Platinum',
      'tier.EMERALD': 'Emerald',
      'tier.DIAMOND': 'Diamond',
      'tier.MASTER': 'Master',
      'tier.GRANDMASTER': 'Grandmaster',
      'tier.CHALLENGER': 'Challenger',
      'tier.UNRANKED': 'Unranked',
      'tier.short.DIAMOND': 'Dia',

      'day.today': 'today',
      'day.yesterday': 'yesterday',
      'winrate': '{r}% WR',
      'board.title': 'Squad status board',
      'board.sub': 'Tap a tile to explore · ★ pins your favorite',
      'board.note.riot': 'Solo queue · live from Riot API (updated {stamp})',
      'board.note.offline': 'Based on the latest solo queue snapshot · checked 2026-11-26 (offline)',
      'board.note.pending': 'Based on the latest solo queue snapshot · checked 2026-11-26 (auto refresh pending)',

      'pick.mypick': 'MY PICK · {name} today',
      'pick.preview': 'Preview · {name}',
      'pick.pin': 'Pin favorite',
      'pick.pinned': 'My favorite',
      'pick.pinAriaOn': 'Pinned as your favorite',
      'pick.pinAriaOff': 'Pin this player as your favorite',
      'pick.recent5': 'Last 5',
      'pick.wl': '{w}W {l}L',
      'pick.inGame': 'In game',
      'pick.hint': 'Your favorite is <b>{fav}</b> · tap the star to pin <b>{name}</b>',
      'pick.viewAria': 'View {name}',
      'pick.favSuffix': ' (favorite)',
      'pick.switchAria': 'Quick MY PICK switch',
      'pick.toastNew': '★ Pinned {name} as your MY PICK.',
      'pick.toastSame': '★ {name} is already your favorite.',
      'pick.lastGame': '{d} {t} <b>{champ}</b> {kda} · {result}',
      'pick.viewProfile': 'Player profile ↗',

      'result.win': 'Win',
      'result.lose': 'Loss',
      'result.w': 'W',
      'result.l': 'L',

      'hl.last5Rate': 'Last 5 win rate',
      'hl.kda': 'KDA',
      'hl.total': '{n} games',
      'hl.allStats': 'Full record ↗',

      'links.title': 'Stream & stats',
      'links.stream': 'Stream',
      'links.stats': 'Stats',
      'links.watch': 'Stats & watch',
      'links.note': 'Jump straight to the player’s own stream and stats.',
      'links.noStream': 'Stream being confirmed',

      'video.title': 'Signature highlights',
      'video.sub': 'Watch {name}’s signature moments on YouTube.',
      'video.badge': 'Official LCK',
      'video.watch': 'Watch on YouTube ↗',
      'video.channel': 'LCK official YouTube',
      'video.more': 'Dplus KIA on YouTube ↗',
      'video.empty': 'Highlights coming soon.',
      'video.len': '{len} long',

      'notify.title': 'Alerts',
      'notify.summaryOn': '{n} on',
      'notify.summaryOff': 'All off',
      'notify.soloHead': 'Player solo queue alerts',
      'notify.soloSub': 'Turn each player on or off',
      'notify.soloRow': 'Last 5: {w}W {l}L',
      'notify.official': 'DK official match alerts',
      'notify.officialSub': 'Schedule and match start',
      'notify.toggleOn': 'Turn off solo queue alerts for {name}',
      'notify.toggleOff': 'Turn on solo queue alerts for {name}',
      'notify.officialToggleOn': 'Turn off DK official match alerts',
      'notify.officialToggleOff': 'Turn on DK official match alerts',
      'notify.test': 'Send a test alert',
      'notify.statusBoth': '{name} solo queue · match alerts on',
      'notify.statusSolo': 'Only {name} solo queue alerts on',
      'notify.statusOfficial': 'Only match alerts on',
      'notify.statusNone': 'No alerts on',
      'notify.pushPreview': 'This is a single-file preview, so server alerts are off.',
      'notify.pushOffline': 'The auto-update server is unreachable, so alerts only work while the app is open.',
      'notify.pushChecking': 'Checking server status…',
      'notify.pushNoVapid': 'Web push not ready yet (no VAPID key) · for now the app checks while it is open.',
      'notify.pushNoStore': 'Subscription storage (Upstash Redis) not connected · connect it to get lock-screen alerts.',
      'notify.pushDenied': 'Browser notifications are blocked. Allow notifications for this site in your browser settings.',
      'notify.pushSubscribed': 'Web push is on · new games and match news arrive on your lock screen even when the app is closed.',
      'notify.pushUnsubscribed': 'Push subscription removed. Turn alerts back on to get lock-screen news again.',
      'notify.pushIdle': 'Turn alerts on to get lock-screen news too.',
      'notify.noteOn': 'The server checks every 5 minutes and sends news even while the app is closed.',
      'notify.noteOff': 'For now the app checks for new games while it is open. Turn on server push to get alerts with the app closed.',

      'cheer.title': 'One-line cheer',
      'cheer.count': '{n}',
      'cheer.placeholder': 'Leave a one-line cheer for {name}',
      'cheer.aria': 'One-line cheer input',
      'cheer.send': 'Post cheer',
      'cheer.empty': 'No cheers yet. Leave the first one.',
      'cheer.note': 'Saved on this device only.',
      'cheer.delete': 'Delete cheer',
      'time.just': 'just now',
      'time.min': '{n}m ago',
      'time.hour': '{n}h ago',
      'time.day': '{n}d ago',
      'time.old': 'earlier',

      'solo.title': 'Recent solo queue',
      'solo.meta': '{riotId} · last {n} games {w}W {l}L · checked {stamp}{src}',
      'solo.srcRiot': ' · live Riot API',
      'solo.srcSnapshot': ' · snapshot',
      'solo.moreOpgg': 'See the full record on OP.GG ↗',
      'solo.moreUgg': 'See the full record on u.gg ↗',
      'solo.more': 'Full record ↗',
      'solo.panelMeta': '{name}’s last {n} games. Filter by win or loss.',
      'solo.pickerAria': 'Choose a player',
      'solo.filter.all': 'All',
      'solo.filter.win': 'Wins',
      'solo.filter.lose': 'Losses',
      'solo.empty': 'No games match this filter.',
      'solo.thWhen': 'Time (KST)',
      'solo.thChamp': 'Champion',
      'solo.thRole': 'Role',
      'solo.thResult': 'Result',
      'solo.thKda': 'K / D / A',
      'solo.thDur': 'Length',
      'solo.perfect': 'Perfect game',
      'solo.live': 'Live Riot API · last {n} games auto-updated',
      'solo.footerLive': 'Solo queue data came from the Riot API at {time}. The last 5 games update automatically.',
      'solo.footerSnapshot': 'Solo queue values are each player’s public record as of 2026-11-26. Add a Riot API key on the server to auto-update.',
      'solo.msgRateLimited': 'The Riot API rate limit was briefly exceeded. Checking again shortly.',
      'solo.msgError': 'Could not reach the Riot API. Retrying shortly.',
      'solo.msgPartial': 'Some players’ records could not be loaded.',
      'solo.msgNoKey': 'No RIOT_API_KEY yet, so this is the 2026-11-26 snapshot. Add the key on Vercel for live records.',

      'roster.eyebrow': 'DPLUS KIA · 2027 ROSTER',
      'roster.title': 'Doka-Syo-Sdil',
      'roster.meta': 'Dplus KIA’s five for 2027. Tap a name to switch players.',

      'foot.about': '<b>DK SIGNAL</b> · Official matches come automatically from LoL Esports; solo queue starts from public records (KO.LOL, OP.GG, u.gg). See the \'auto refresh\' note below.',
      'foot.disclaimer': 'A fan-made, unofficial dashboard. Not affiliated with Dplus KIA or Riot Games.',
      'foot.official': 'Match schedule and results come automatically from the public LoL Esports schedule.',
      'foot.solo': 'Solo queue records come from each player’s public match history.',
      'foot.records': '2026 tournament records are carried over from public KO.LOL data. Titles and runner-up marks are listed only where confirmed.',

      'official.title': 'Schedule',
      'official.sub': 'The next match and DK’s latest official games.',
      'official.next': 'NEXT',
      'official.nextDateFallback': '2027 LCK Cup',
      'official.nextTitleFallback': 'DK’s first 2027 match',
      'official.nextSubFallback': 'The 2027 season starts with the <b>LCK Cup</b> again. As soon as LCK confirms the format and dates, DK’s first match appears right here.',
      'official.nextNoUpcoming': 'LoL Esports has no upcoming match listed yet.',
      'official.nextError': 'Could not load the schedule just now. Showing the last confirmed information.',
      'official.syncPreview': 'Auto refresh is off in this single-file preview. The live app (dk-signal.vercel.app) updates it.',
      'official.syncOffline': 'Could not reach the auto-update server. Showing saved records.',
      'official.syncOk': 'Checked on LoL Esports at {time} · {next}',
      'official.syncOkNext': 'this card changes as soon as a match is set',
      'official.syncOkNoNext': 'next match not published yet',
      'official.syncFail': 'Could not load the schedule. Checking again shortly.',
      'official.syncLoading': 'Checking the LoL Esports schedule…',
      'official.alertTitle': 'Match alerts',
      'official.alertSub': 'DK official schedule and match start',
      'official.scheduleLink': 'Open the LoL Esports schedule ↗',
      'official.recent': 'Latest DK official matches',
      'official.recentFallbackNote': 'Showing the last confirmed Worlds 2026 run until the server returns a schedule.',
      'official.recentNote': 'Fetched from the public LoL Esports schedule at {time} · auto-collected',
      'official.seasonEyebrow': '2027 SEASON ROADMAP',
      'official.seasonTitle': '2027 season calendar',
      'official.seasonMeta': 'Since 2025 LCK has dropped spring and summer splits for an <b>LCK Cup → single regular season</b> format. In 2027, <b>First Stand: All In</b> joins as the first international event of the year.',
      'official.seasonNote': 'International venues per the LoL Esports announcement of 2026-11-13 · LCK 2027 details to be announced',
      'official.lastTitle': 'Latest official match by player',

      'video.liveTitle': 'Live & video',
      'video.liveNow': 'Where to watch',
      'video.chzzk': 'CHZZK',
      'video.soop': 'SOOP',
      'video.youtube': 'YouTube',
      'video.chzzkAria': 'Open the official LCK live stream on CHZZK',
      'video.soopAria': 'Open the official LCK live stream on SOOP',
      'video.youtubeAria': 'Open the LCK YouTube channel (viewers outside Korea)',
      'video.liveNote': 'In Korea, LCK live streams run on the official CHZZK and SOOP channels; outside Korea, use LCK on YouTube.',
      'video.vod': 'Full-match VOD',
      'video.highlight': 'Highlights',
      'video.highlightSearch': 'Find this match’s highlights on YouTube',
      'video.vodSearch': 'Find this match’s full VOD on YouTube',
      'video.dkChannel': 'DK on YouTube',
      'video.searchNote': 'Matches without a confirmed official VOD open a YouTube search instead.',
      'video.match': '{league} · {date}',
      'video.gameNo': 'Game {n}',

      'records.title': 'Records',
      'records.sub': 'Public records for the 2026 season. The number on the right is sets won and lost.',
      'records.season': '2026 season',
      'records.who': '{name} · 2026 season',
      'records.worlds': 'Worlds 2026 results',
      'records.result.CHAMP': 'Champion',
      'records.result.RUNNER': 'Runner-up',
      'records.result.SEMI': 'Semifinals',
      'records.result.QF': 'Quarterfinals',
      'records.result.R5': 'Round 5',
      'records.result.R3': 'Round 3',
      'records.set': '{w}W {l}L',

      'banner.testTitle': '{name} · test alert',
      'banner.testOfficial': 'DK official match · DK SIGNAL',
      'banner.testSoloBody': 'This is a test alert. When {name} starts a new solo queue game, it arrives like this.',
      'banner.testOfficialBody': 'This is a test alert. When DK’s next official match is set, it arrives like this.',
      'banner.soloDone': 'Sent a test with {name}’s solo queue alert.',
      'banner.officialDone': 'Sent a test with the match alert.',
      'banner.doneSuffix': ' Check your lock screen.',
      'banner.noneTitle': 'DK SIGNAL',
      'banner.noneBody': 'No alerts are on. Turn one on in alerts and try again.',
      'banner.noneNote': 'No alerts are on. Turn an alert on first.',
      'banner.fallbackNote': 'Shown inside the app instead.',
      'banner.bgText': 'New solo queue news arrives like this.',
      'banner.installTitle': 'Add to home screen',
      'banner.installBody': 'You can also install from your browser menu’s "Add to home screen".',
      'banner.online': 'Back online.',
      'banner.close': 'Close alert',
      'banner.now': 'now'
    },

    /* ================= 日本語 ================= */
    ja: {
      'app.title': 'ディプギ・シグナル · DK SIGNAL',
      'app.short': 'ディプギ・シグナル',
      'app.desc': 'ドランとDplus KIA 2027の5人を一画面で。公式戦の日程・ライブ／ハイライト動画・ソロランク・各選手の配信をまとめたディプギ・シグナル。ダークネオンミント／ソフトミントテーマ対応。',
      'brand.sub': 'ディプギ・シグナル',
      'brand.home': 'ディプギ・シグナル ホーム',
      'lang.label': '言語',
      'theme.dark': 'ダーク',
      'theme.mint': 'ソフト',
      'theme.toDark': 'ダークネオンミントテーマに切り替え',
      'theme.toMint': 'ソフトミントテーマに切り替え',
      'theme.title': 'ダーク／ソフトテーマ切替',
      'install': 'インストール',
      'nav.aria': '画面を選択',
      'tab.feed': 'ホーム',
      'tab.official': '公式日程',
      'tab.solo': '試合ログ',
      'tab.records': '記録室',

      'live': 'ライブ',
      'autoUpdate': '自動更新',
      'now': '今',
      'updatedAt': '{time} 更新',
      'checkedAt': '{time} 確認',

      'pos.TOP': 'トップ',
      'pos.JGL': 'ジャングル',
      'pos.MID': 'ミッド',
      'pos.BOT': 'ADC',
      'pos.SUP': 'サポート',
      'tier.IRON': 'アイアン',
      'tier.BRONZE': 'ブロンズ',
      'tier.SILVER': 'シルバー',
      'tier.GOLD': 'ゴールド',
      'tier.PLATINUM': 'プラチナ',
      'tier.EMERALD': 'エメラルド',
      'tier.DIAMOND': 'ダイヤモンド',
      'tier.MASTER': 'マスター',
      'tier.GRANDMASTER': 'グランドマスター',
      'tier.CHALLENGER': 'チャレンジャー',
      'tier.UNRANKED': 'アンランク',
      'tier.short.DIAMOND': 'ダイヤ',

      'day.today': '今日',
      'day.yesterday': '昨日',
      'winrate': '勝率{r}%',
      'board.title': '5人のステータスボード',
      'board.sub': 'タイルをタップして切り替え · ★で推しを固定',
      'board.note.riot': 'ソロランク · Riot API リアルタイム（{stamp} 更新）',
      'board.note.offline': '最新ソロランク記録ベース · 2026-11-26 確認（オフライン）',
      'board.note.pending': '最新ソロランク記録ベース · 2026-11-26 確認（自動更新準備中）',

      'pick.mypick': 'MY PICK · 今日の{name}',
      'pick.preview': 'プレビュー · {name}',
      'pick.pin': '推しに固定',
      'pick.pinned': 'マイ推し',
      'pick.pinAriaOn': '推しに固定済み',
      'pick.pinAriaOff': 'この選手を推しに固定',
      'pick.recent5': '直近5試合',
      'pick.wl': '{w}勝{l}敗',
      'pick.inGame': 'ゲーム中',
      'pick.hint': 'あなたの推しは<b>{fav}</b> · ★を押すと<b>{name}</b>を推しに固定します',
      'pick.viewAria': '{name}を見る',
      'pick.favSuffix': '（推し）',
      'pick.switchAria': 'MY PICK クイック切替',
      'pick.toastNew': '★ {name}をマイ推し（MY PICK）に固定しました。',
      'pick.toastSame': '★ {name}はすでに推しに固定されています。',
      'pick.lastGame': '{d} {t} <b>{champ}</b> {kda} · {result}',
      'pick.viewProfile': '選手プロフィール ↗',

      'result.win': '勝',
      'result.lose': '敗',
      'result.w': 'W',
      'result.l': 'L',

      'hl.last5Rate': '直近5試合の勝率',
      'hl.kda': 'KDA',
      'hl.total': '{n}試合合計',
      'hl.allStats': '全記録 ↗',

      'links.title': '配信・戦績',
      'links.stream': '配信',
      'links.stats': '戦績',
      'links.watch': '戦績・観戦',
      'links.note': '選手本人の配信と戦績サイトへ直接移動します。',
      'links.noStream': '配信を確認中',

      'video.title': '代表ハイライト',
      'video.sub': '{name}選手のシグネチャー場面をYouTubeですぐに。',
      'video.badge': 'LCK公式',
      'video.watch': 'YouTubeで見る ↗',
      'video.channel': 'LCK公式YouTube',
      'video.more': 'Dplus KIA YouTube ↗',
      'video.empty': 'ハイライトを準備中です。',
      'video.len': '長さ {len}',

      'notify.title': '通知設定',
      'notify.summaryOn': '{n}件オン',
      'notify.summaryOff': 'すべてオフ',
      'notify.soloHead': '選手ソロランク通知',
      'notify.soloSub': '選手ごとにオン・オフ',
      'notify.soloRow': '直近5試合 {w}勝{l}敗',
      'notify.official': 'DK公式戦通知',
      'notify.officialSub': '試合日程・開始のお知らせ',
      'notify.toggleOn': '{name}のソロランク通知をオフ',
      'notify.toggleOff': '{name}のソロランク通知をオン',
      'notify.officialToggleOn': 'DK公式戦通知をオフ',
      'notify.officialToggleOff': 'DK公式戦通知をオン',
      'notify.test': 'テスト通知を送る',
      'notify.statusBoth': '{name} ソロランク・試合通知オン',
      'notify.statusSolo': '{name} ソロランク通知のみオン',
      'notify.statusOfficial': '試合通知のみオン',
      'notify.statusNone': 'オンの通知はありません',
      'notify.pushPreview': '単一ファイルのプレビューなのでサーバー通知はオフです。',
      'notify.pushOffline': '自動更新サーバーに接続できないため、通知はアプリを開いている間だけ確認できます。',
      'notify.pushChecking': 'サーバー状態を確認中…',
      'notify.pushNoVapid': 'Webプッシュ準備前（VAPIDキー未登録）· 今はアプリを開いている間だけ自動確認します。',
      'notify.pushNoStore': '購読ストレージ（Upstash Redis）未接続 · 接続するとロック画面通知がオンになります。',
      'notify.pushDenied': 'ブラウザの通知権限がオフです。サイト設定で通知を許可してください。',
      'notify.pushSubscribed': 'Webプッシュオン · アプリを閉じても新しい戦績・試合情報がロック画面に届きます。',
      'notify.pushUnsubscribed': 'プッシュ購読を解除しました。通知を再度オンにするとロック画面でお知らせします。',
      'notify.pushIdle': '通知をオンにするとロック画面でもお知らせします。',
      'notify.noteOn': 'アプリを閉じていても、サーバーが5分ごとに確認して新着を届けます。',
      'notify.noteOff': '今はアプリを開いている間だけ新しい戦績を確認します。サーバープッシュをオンにするとアプリを閉じても通知が届きます。',

      'cheer.title': 'ひとこと応援',
      'cheer.count': '{n}件',
      'cheer.placeholder': '{name}へひとこと応援をどうぞ',
      'cheer.aria': 'ひとこと応援の入力',
      'cheer.send': '応援を送る',
      'cheer.empty': 'まだ応援がありません。最初のひとことをどうぞ。',
      'cheer.note': 'この端末にのみ保存されます。',
      'cheer.delete': '応援を削除',
      'time.just': 'たった今',
      'time.min': '{n}分前',
      'time.hour': '{n}時間前',
      'time.day': '{n}日前',
      'time.old': '以前',

      'solo.title': '最近のソロランク',
      'solo.meta': '{riotId} · 直近{n}試合 {w}勝{l}敗 · {stamp} 確認{src}',
      'solo.srcRiot': ' · Riot API リアルタイム',
      'solo.srcSnapshot': ' · スナップショット',
      'solo.moreOpgg': 'OP.GGで全記録を見る ↗',
      'solo.moreUgg': 'u.ggで全記録を見る ↗',
      'solo.more': '全記録 ↗',
      'solo.panelMeta': '{name}選手の直近{n}試合です。勝ち・負けで絞り込めます。',
      'solo.pickerAria': '選手を選択',
      'solo.filter.all': 'すべて',
      'solo.filter.win': '勝利',
      'solo.filter.lose': '敗北',
      'solo.empty': '該当する試合がありません。',
      'solo.thWhen': '時刻（KST）',
      'solo.thChamp': 'チャンピオン',
      'solo.thRole': 'ポジション',
      'solo.thResult': '結果',
      'solo.thKda': 'K / D / A',
      'solo.thDur': '時間',
      'solo.perfect': 'パーフェクトゲーム',
      'solo.live': 'Riot API リアルタイム · 直近{n}試合を自動更新',
      'solo.footerLive': 'ソロランク記録はRiot APIから{time}に取得しました。直近5試合まで自動更新されます。',
      'solo.footerSnapshot': 'ソロランク記録は各選手アカウントの公開戦績を2026-11-26に確認した値です。サーバーにRiot APIキーを設定すると自動更新されます。',
      'solo.msgRateLimited': 'Riot APIの呼び出し上限を一時的に超えました。少し後で再確認します。',
      'solo.msgError': 'Riot APIの応答を受け取れませんでした。少し後で再試行します。',
      'solo.msgPartial': '一部選手の戦績を取得できませんでした。',
      'solo.msgNoKey': 'RIOT_API_KEYがないため2026-11-26のスナップショットを表示しています。Vercelの環境変数にキーを入れるとリアルタイムになります。',

      'roster.eyebrow': 'DPLUS KIA · 2027 ROSTER',
      'roster.title': 'ドカショスディル',
      'roster.meta': '2027シーズンDplus KIAの5人。名前をタップして選手を切り替えられます。',

      'foot.about': '<b>ディプギ・シグナル</b> · 公式戦はLoL Esportsから自動取得し、ソロランクは公開戦績（KO.LOL・OP.GG・u.gg）を基準値にしています。下の「自動更新」の案内をご確認ください。',
      'foot.disclaimer': 'ファン制作の非公式ダッシュボードです。Dplus KIA・Riot Gamesとは関係ありません。',
      'foot.official': '試合日程・結果はLoL Esportsの公開日程から自動取得します。',
      'foot.solo': 'ソロランク記録は各選手アカウントの公開戦績を基準に表示します。',
      'foot.records': '2026シーズンの大会記録はKO.LOLの公開データを移したものです。優勝・準優勝は確認できた大会のみ記載しています。',

      'official.title': '公式日程',
      'official.sub': '次の試合と直近の公式戦をまとめました。',
      'official.next': 'NEXT',
      'official.nextDateFallback': '2027 LCKカップ',
      'official.nextTitleFallback': 'DK 2027 初戦',
      'official.nextSubFallback': '2027シーズンも<b>LCKカップ</b>から始まります。LCKが2027の方式と日程を確定すれば、DKの初戦をこのカードに表示します。',
      'official.nextNoUpcoming': '現在、LoL Esportsに次の試合はまだ登録されていません。',
      'official.nextError': '日程を一時的に取得できませんでした。最後に確認した案内を表示しています。',
      'official.syncPreview': '単一ファイルのプレビューなので自動更新はオフです。実際のアプリ（dk-signal.vercel.app）で更新されます。',
      'official.syncOffline': '自動更新サーバーに接続できませんでした。保存された記録を表示しています。',
      'official.syncOk': 'LoL Esportsで{time}に確認 · {next}',
      'official.syncOkNext': '次の試合が決まればすぐに切り替わります',
      'official.syncOkNoNext': '次の試合の公開前',
      'official.syncFail': '日程を読み込めませんでした。少し後で再確認します。',
      'official.syncLoading': 'LoL Esportsの日程を確認中…',
      'official.alertTitle': '試合通知',
      'official.alertSub': 'DK公式戦の日程・開始のお知らせ',
      'official.scheduleLink': 'LoL Esportsの日程を見る ↗',
      'official.recent': '直近のDK公式戦',
      'official.recentFallbackNote': 'サーバーから日程を取得するまでの間、最後に確認したWorlds 2026の記録を表示しています。',
      'official.recentNote': 'LoL Esportsの公開日程から{time}に取得した結果です · 自動収集',
      'official.seasonEyebrow': '2027 SEASON ROADMAP',
      'official.seasonTitle': '2027シーズンカレンダー',
      'official.seasonMeta': 'LCKは2025年からスプリング・サマースプリットを廃止し、<b>LCKカップ → 単一レギュラーシーズン</b>で行います。2027年はここに<b>First Stand: All In</b>が年内最初の国際大会として加わります。',
      'official.seasonNote': '2027国際大会の開催地は2026-11-13のLoL eスポーツ発表基準 · LCK 2027の詳細日程は追って発表',
      'official.lastTitle': '選手別の直近公式戦',

      'video.liveTitle': 'ライブ・動画',
      'video.liveNow': '視聴できる場所',
      'video.chzzk': 'CHZZK',
      'video.soop': 'SOOP',
      'video.youtube': 'YouTube',
      'video.chzzkAria': 'CHZZKのLCK公式ライブを開く',
      'video.soopAria': 'SOOPのLCK公式ライブを開く',
      'video.youtubeAria': 'LCKのYouTubeチャンネルを開く（海外向け）',
      'video.liveNote': '韓国国内のLCKライブはCHZZK・SOOPの公式チャンネル、海外はLCKのYouTubeで視聴できます。',
      'video.vod': 'フルマッチVOD',
      'video.highlight': 'ハイライト',
      'video.highlightSearch': 'YouTubeでこの試合のハイライトを探す',
      'video.vodSearch': 'YouTubeでこの試合のフルVODを探す',
      'video.dkChannel': 'DK YouTube',
      'video.searchNote': '公式VODが確認できない試合はYouTube検索につなぎます。',
      'video.match': '{league} · {date}',
      'video.gameNo': '第{n}試合',

      'records.title': '記録室',
      'records.sub': '2026シーズン基準の公開記録です。右の数字はセット勝敗です。',
      'records.season': '2026シーズン',
      'records.who': '{name} · 2026シーズン',
      'records.worlds': 'Worlds 2026 結果',
      'records.result.CHAMP': '優勝',
      'records.result.RUNNER': '準優勝',
      'records.result.SEMI': 'ベスト4',
      'records.result.QF': 'ベスト8',
      'records.result.R5': '第5ラウンド',
      'records.result.R3': '第3ラウンド',
      'records.set': '{w}勝{l}敗',

      'banner.testTitle': '{name} · テスト通知',
      'banner.testOfficial': 'DK公式戦 · ディプギ・シグナル',
      'banner.testSoloBody': 'テスト通知です。{name}の新しいソロランクが始まるとこのように届きます。',
      'banner.testOfficialBody': 'テスト通知です。DKの次の公式戦が決まるとこのように届きます。',
      'banner.soloDone': '{name}のソロランク通知でテストを送りました。',
      'banner.officialDone': '試合通知でテストを送りました。',
      'banner.doneSuffix': ' ロック画面で確認してください。',
      'banner.noneTitle': 'ディプギ・シグナル',
      'banner.noneBody': 'オンの通知がありません。通知設定でオンにしてから試してください。',
      'banner.noneNote': 'オンの通知がありません。まず通知をオンにしてください。',
      'banner.fallbackNote': 'アプリ内通知で代わりに表示しました。',
      'banner.bgText': '新しいソロランク情報はこのように届きます。',
      'banner.installTitle': 'ホーム画面に追加',
      'banner.installBody': 'ブラウザメニューの「ホーム画面に追加」からもインストールできます。',
      'banner.online': '再接続しました。',
      'banner.close': '通知を閉じる',
      'banner.now': '今'
    }
  };

  /* 표시용 날짜·시간 */
  var MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = {
    ko: ['일', '월', '화', '수', '목', '금', '토'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ja: ['日', '月', '火', '水', '木', '金', '土']
  };

  var listeners = [];
  var lang = 'ko';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (saved && DICT[saved]) return saved;
    var nav = '';
    try { nav = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase(); } catch (e) {}
    if (nav.indexOf('ja') === 0) return 'ja';
    if (nav.indexOf('en') === 0) return 'en';
    if (nav.indexOf('ko') === 0) return 'ko';
    return 'ko';
  }

  function t(key, vars) {
    var table = DICT[lang] || DICT.ko;
    var out = table[key];
    if (out == null) out = DICT.ko[key];
    if (out == null) return key;
    if (!vars) return out;
    return out.replace(/\{(\w+)\}/g, function (m, name) {
      return vars[name] == null ? m : String(vars[name]);
    });
  }

  function isEn() { return lang === 'en'; }

  /* '11. 25.' 같은 경기 날짜 표기 → 언어별 */
  function matchDate(str) {
    var m = /^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*$/.exec(str || '');
    if (!m) return str || '';
    var mo = Number(m[1]);
    var d = Number(m[2]);
    if (lang === 'en') return MONTH_EN[mo - 1] + ' ' + d;
    if (lang === 'ja') return mo + '月' + d + '日';
    return mo + '. ' + d + '.';
  }

  /* 요일 이름 */
  function weekday(date) {
    var list = WD[lang] || WD.ko;
    return list[date.getDay()];
  }

  /* 2026.11.27 (금) / Fri, Nov 27, 2026 / 2026年11月27日(金) */
  function feedDate(date) {
    var y = date.getFullYear();
    var mo = date.getMonth() + 1;
    var d = date.getDate();
    if (lang === 'en') return weekday(date) + ', ' + MONTH_EN[mo - 1] + ' ' + d + ', ' + y;
    if (lang === 'ja') return y + '年' + mo + '月' + d + '日(' + weekday(date) + ')';
    return y + '.' + pad(mo) + '.' + pad(d) + ' (' + weekday(date) + ')';
  }

  /* 2026.11.26 17:07 / Nov 26, 2026 17:07 / 2026.11.26 17:07 */
  function stamp(date) {
    if (!date || isNaN(date.getTime())) return '';
    var y = date.getFullYear();
    var mo = date.getMonth() + 1;
    var d = date.getDate();
    var hm = pad(date.getHours()) + ':' + pad(date.getMinutes());
    if (lang === 'en') return MONTH_EN[mo - 1] + ' ' + d + ', ' + y + ' ' + hm;
    if (lang === 'ja') return y + '.' + pad(mo) + '.' + pad(d) + ' ' + hm;
    return y + '.' + pad(mo) + '.' + pad(d) + ' ' + hm;
  }

  function clock(date) {
    if (!date || isNaN(date.getTime())) return '';
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  /* 'YYYY-MM-DD' 또는 ISO → 짧은 날짜 */
  function shortDate(value) {
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    var mo = date.getMonth() + 1;
    var d = date.getDate();
    if (lang === 'en') return MONTH_EN[mo - 1] + ' ' + d;
    if (lang === 'ja') return mo + '月' + d + '日';
    return mo + '. ' + d + '.';
  }

  function setLang(code, opts) {
    if (!DICT[code]) code = 'ko';
    lang = code;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    var meta = LANGS.filter(function (l) { return l.code === code; })[0];
    document.documentElement.setAttribute('lang', meta ? meta.htmlLang : 'ko');
    document.title = t('app.title');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('app.desc'));
    if (!opts || opts.silent !== true) {
      listeners.forEach(function (fn) { try { fn(code); } catch (e) {} });
    }
  }

  function onChange(fn) { listeners.push(fn); }

  lang = detect();

  global.I18N = {
    LANGS: LANGS,
    get lang() { return lang; },
    t: t,
    setLang: setLang,
    onChange: onChange,
    detect: detect,
    matchDate: matchDate,
    weekday: weekday,
    feedDate: feedDate,
    stamp: stamp,
    clock: clock,
    shortDate: shortDate,
    pad: pad
  };
})(window);
