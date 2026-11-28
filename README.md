# 딮기 시그널 (DK SIGNAL)

도란과 디플러스 기아 2027 로스터 5인의 **공식 경기 · 솔로랭크**를 한 화면에서 보는 팬 대시보드 PWA입니다.

- 라이브: https://dk-signal.vercel.app (Vercel · `/api/*` 서버 함수 포함)
- 저장소: https://github.com/schl410-hub/dk-radar
- 단일 파일 미리보기: `preview/dk-radar-preview.html`
- 테마: **다크 네온 민트**(기본, `#05090F` + `#00F5C4`) ↔ **소프트 민트 글래스**(파스텔 민트 + 화이트 글래스)

## 지금 동작하는 것

### v3.14 (2026-11-29) 새로 추가 — 경기로그 '공식 경기' · 세트별 요약 카드
- **경기로그 2단 전환 `솔로랭크 | 공식 경기`**: 경기로그 탭 상단 토글. `공식 경기`를 고르면 최근 DK 공식 경기 카드 목록 → 스코어 바(DK : 상대, DK WIN/LOSS) → **1·2·3세트 탭**으로 이어집니다. 선택은 `localStorage`(`dk.signal.matchView`·`dk.signal.matchId`)에 남습니다.
- **세트별 진영 · 밴픽 · K/D/A · 딜 비중**: 세트 탭에 `승/패` 와 `🔵 블루(선픽)` / `🔴 레드` 배지를 함께 표시하고, 양 팀 **밴 5:5**(흑백 + 붉은 사선), DK 5인의 챔피언·K/D/A·**팀 내 딜 비중 %** 바를 보여 줍니다. 데이터는 LoL Esports `livestats`(window·details) + **Leaguepedia Cargo**(밴·세트 승리 팀)에서 서버가 합쳐 내려 줍니다.
- **데스크톱 2열**: 왼쪽 = 경기 목록·스코어·밴(목록은 카드 안에서 스크롤) / 오른쪽 = 세트 탭·5인 스탯(+ KDA·킬관여·CS/골드, 팀 오브젝트 `KILL·GOLD·DRAGON·BARON` 요약).
- **캘린더 → 경기로그 연결**: 리스트/모달의 공식 경기 항목에 `밴픽 보기` 버튼이 생겨 그 경기의 공식 경기 화면으로 바로 이동합니다.
- **오늘의 요약 카드 3종**: 경기 없는 날은 기존 5인 카드, **경기 있는 날(경기 전)** 은 `MATCH DAY` 카드(D-DAY·시간·상대·WATCH·남은 시간 + 오늘의 5인 솔랭), **경기 결과**는 모달에서 **1·2·3세트를 골라** 그 세트의 진영·양 팀 밴·DK 5인 픽·K/D/A·딜 비중이 담긴 **1080×1350 PNG** 를 각각 저장합니다(파일명 `dk-signal-YYYYMMDD-s2.png`).
- **서버**: `api/match.js` + `api/_lib/matchdetail.js` — 세트 하나를 window 2회 + details 1회로 읽고, 밴은 Leaguepedia(`api.php` → 실패 시 `Special:CargoExport`)로 채웁니다. 종료된 경기는 7일, 밴이 비었으면 30분 뒤 다시 시도합니다. `vercel.json` `maxDuration: 30`.
- 새 검증 `tools/verify_match.py`(69항목): 전환·목록·스코어 바·세트 진영·밴 10개·5인 스탯·세트 전환·캘린더 이동·데스크톱 2열·세트별 카드 1080×1350·10개국어 문구·가로 넘침 0건. `tools/api_smoke.js` 에 `/api/match` 검사 13항목 추가. `sw.js` 캐시 **v22**, `package.json`·`api/config.js` 3.14.0.

### v3.13 (2026-11-28) 새로 추가 — 10개국어 언어 메뉴
- **상단 언어 메뉴 `[🌐 KO ▾]`**: 헤더에 흩어져 있던 5개 국어 버튼을 **알약 버튼 하나 + 2열 × 5줄 팝오버**로 바꿨습니다(`langmenu.css` · `app.js` `renderLangSwitch()`). 좁은 화면(≤520px)에서는 헤더 바로 아래 시트로, 넓은 화면에서는 버튼에 꼬리가 붙은 팝오버로 펼쳐지고 화면 아래로 넘치면 위로 뜹니다. Esc·바깥 클릭·스크롤로 닫히고 ↑↓·Home·End 로 이동, 선택한 줄만 민트 카드 + 체크입니다. 다크·소프트 두 테마 모두 대응.
- **10개국어 전체 번역**: 기존 5개국어(KO/EN/JA/ZH/VI)에 **대만 번체(TW) · 스페인어(ES) · 포르투갈어(PT) · 태국어(TH) · 인도네시아어(ID)** 를 더해 `i18n.js` 사전 545개 문구를 10개 언어로 채웠습니다(데스크톱 레이아웃·재생목록·내 링크·오늘 요약 카드·투표 팝업 포함). 날짜·요일·달 이름 표기도 언어별로 나눴습니다(es `27 nov 2026 (vie)`, pt `27 nov 2026 (sex)`, th `27 พ.ย. 2026 (ศ.)`, id `27 Nov 2026 (Jum)`, tw `2026年11月27日 (週五)`).
- **챔피언 이름 173종 × 10개 언어**: `tools/make_champions.py` 가 Riot Data Dragon 10개 로캘(ko_KR·en_US·ja_JP·zh_CN·zh_TW·vi_VN·es_ES·pt_BR·th_TH·id_ID)을 받아 `CHAMPIONS` 표를 10칸으로 다시 만들고, `app.js` `CHAMP_COL` 이 현재 언어 칸을 고릅니다(번체는 厄薩斯·阿璃·卡桑帝 처럼 대만 표기).
- **태국어 폰트**: Pretendard 서브셋에 태국 글리프가 없어 **Noto Sans Thai 서브셋**(`fonts/notosansthai.woff2`, 26KB · `fonts/notothai.css`)을 넣고 `body` 글꼴 스택에서 태국 글자만 대체합니다. 태국어는 띄어쓰기가 없어 `word-break: normal` 로 단어 중간 줄바꿈을 허용하고, `font-feature-settings: "locl" 0` 으로 연도·날짜 숫자가 태국 숫자(๒๐๒๖)로 바뀌지 않게 했습니다.
- **data.js 문장도 번체로**: 영상 제목·경기명·대회명처럼 `data.js` 안에 간체(zh)만 있던 문구 518개에 **tw 문구를 나란히 추가**했습니다(`tools/make_tw_data.py`, OpenCC s2twp + 대만 용어 보정 — 世界大賽·LCK 盃·例行賽·季後賽·負於). 스페인어·포르투갈어·태국어·인도네시아어는 그런 문장형 데이터가 아직 없어 영어로 대체합니다(`app.js` `pickLang()`).
- 서버 언어 목록(`api/config.js`·`api/subscribe.js`)도 10개로 늘려 관리자 대시보드 언어 비율·테스트 알림이 새 언어를 받습니다. `sw.js` 캐시 **v21**(`langmenu.css`·태국어 폰트 포함), `package.json` 3.13.0.
- 새 검증 `tools/verify_lang10.py`: **10개 언어 × 5탭 × 360/390/430 + 데스크톱(1440)** 에서 가로 넘침 0건, 번역 키 노출 0건, 메뉴 열기/닫기·키보드 이동·저장값·`<html lang>`·언어별 홈 탭 문구·챔피언 표기를 421항목으로 확인합니다.

### v3.12 (2026-11-28) 새로 추가
- **PC 데스크톱 레이아웃** (`desktop.css`, 1024px 이상): 헤더 한 줄(로고·5탭·언어·테마·`PC 앱 설치`), 홈은 **좌 MY PICK·설치·하이라이트·응원 / 우 5인 보드(최애 타일 2칸)·최근 솔랭** 2단, 영상 탭은 **LIVE NOW + 생중계·공식 채널 2단 → 공식 재생목록 6열 → 아카이브(왼쪽 필터 레일 + 4열 카드 그리드)**. 모바일(390×844) 화면과 캘린더·경기로그·기록실 탭은 그대로입니다.
- **★ 나만의 재생목록**: 아카이브 카드의 `＋ 담기 / ✓ 담김` 으로 폴더에 담고, 레일의 `전체 / 내 폴더 / ＋ 새 폴더` 칩으로 모아 봅니다. `▶ 연속 재생` 은 담은 순서대로 인앱 플레이어 대기열을 만듭니다. `localStorage` `dk.signal.mine` 에만 저장(로그인 없음).
- **＋ 내 링크 추가**: 유튜브 주소(`watch`·`youtu.be`·`shorts`·`embed`·`live`)를 붙여넣으면 **videoId 추출 → 썸네일 자동 연결 → 제목 oEmbed 자동 조회** 후 아카이브 맨 앞에 추가합니다. `dk.signal.links` 저장, 중복 주소는 막습니다.
- **오늘의 DK 요약 카드**: 홈 5인 보드 옆 `오늘 요약 카드` 버튼 → 실시간 5인 데이터(티어·LP·최근 5경기·KDA·MY PICK·다음 공식 경기·최신 공지)로 **1080×1350 PNG** 를 캔버스에서 생성해 미리보기·이미지 저장·공유합니다.
- **진행 중인 투표 팝업**: 접속 시(그리고 `오늘 하루 보지 않기` 가 오늘 날짜로 저장돼 있지 않을 때) 마감 전 투표를 모달로 띄웁니다 — 대회·종목·후보·기간·D-day·`투표하기 ↗`, 마감이 지나 0건이면 뜨지 않습니다.
- 5개 국어(KO/EN/JA/ZH/VI) 문구 추가, `sw.js` 캐시 v19, `tools/verify_v4.py`(모바일·데스크톱·재생목록·내 링크·요약 카드·투표 팝업 63개 검사) 추가.

- **자동 갱신 (서버)**
  - **DK 공식 경기**: LoL Esports 공개 일정에서 DK 경기를 90초 캐시로 받아, 다음 경기가 공개되면 공식일정 `NEXT` 카드(상대 팀·대회명·라운드·Bo·한국 시간)를 자동으로 바꿉니다. 아직 공개 전이면 **2027 LCK 컵** 안내를 그대로 유지합니다.
  - **최근 DK 공식 경기**: 같은 응답의 최근 결과(점수·상대·라운드)를 자동으로 채웁니다. 서버에 못 붙으면 저장해 둔 월즈 2026 기록으로 대체합니다.
  - **솔로랭크**: `RIOT_API_KEY` 가 있으면 5인 티어·LP·시즌 전적·인게임 여부·최근 5경기를 실시간으로 받아 화면(타일·배너·전적표)에 반영하고, 없으면 `data.js` 스냅샷(2026-11-26)으로 안전하게 대체하며 상태 문구를 표시합니다.
  - 앱을 열어 둔 동안 90초마다 자동 확인하고, 상단에 `실시간` / `자동 갱신` 칩과 마지막 확인 시각을 보여 줍니다.
- **웹 푸시 (VAPID)**: 선수별 솔랭 ON/OFF + DK 공식 경기 ON/OFF 설정이 서버 구독 정보와 함께 저장됩니다. 서버가 5분마다 새 랭크 게임(챔피언·KDA·승패)과 새 공식 일정·경기 시작 40분 전을 감지해 구독 기기로 보냅니다. 준비가 안 된 상태에서는 화면에 무엇이 빠졌는지 그대로 표시합니다.
- **다국어 10개국어 (KO · EN · JA · ZH · TW · VI · ES · PT · TH · ID)**: 헤더 `[🌐 KO ▾]` 메뉴(v3.13)로 즉시 전환. 탭·배지·선수명/실명/포지션/티어·공식 일정·경기표·영상 탭·알림 문구·테스트 알림·날짜 표기·챔피언 이름(Data Dragon 10개 로캘)까지 화면 전체와 `document.title`·`<html lang>`(zh-CN·zh-TW)·미리보기 문구가 함께 바뀝니다. `localStorage`(`dk.signal.lang`) 저장값 → 없으면 `navigator.language`(zh-TW·zh-Hant→TW, th/id/es/pt/vi/ja/zh/en), 기본 `ko`.
- **실시간 테마 전환**: 헤더 우측 `다크 / 소프트` 버튼. 선택은 `localStorage`에 저장되고 첫 페인트 전에 적용됩니다.
- **운영자 한 줄 공지**: 관리자 앱(`dk-signal-admin.vercel.app`)에서 문구를 켜면 `/api/config` 의 `banner` 로 내려와 메인 상단에 한 줄 공지가 뜹니다(끄면 사라짐). 관리자 대시보드는 구독자·7일 추이·선수 인기·언어 비율·발송 기록·전체 알림까지 한 화면에서 다룹니다.
- **탭 5개**: 홈 / **캘린더** / 영상 / 경기로그 / 기록실 (360~430px 모바일에서도 한 줄 유지), 캘린더 안은 **리스트 · 캘린더 · 투표** 3단 전환
- **5인 상태 보드**: 도란 · 카나비 · 쇼메이커 · 스매쉬 · 딜라이트 타일을 누르면 최애 포커스 배너·하이라이트·전적표가 함께 바뀝니다. 인게임이면 `인게임` 배지가 붙습니다(키 설정 시).
- **최애 포커스 배너 + MY PICK 고정**
  - 배너 안 **선수 퀵 스위처**(도란·카나비·쇼메이커·스매쉬·딜라이트 칩)로 바로 선수를 바꿔 볼 수 있습니다.
  - **★ 최애 고정** 버튼을 누르면 그 선수가 **내 최애(MY PICK)** 로 `localStorage`(`dk.signal.mypick`)에 저장됩니다.
  - 앱을 새로고침하거나 다시 열면 **저장된 MY PICK 선수가 첫 화면**에 뜨고, 기본값은 도란입니다.
  - 다른 선수를 구경하는 동안에는 배너가 `미리보기 · 카나비` 처럼 표시되고, 그 상태에서 별을 누르면 그 선수가 새 MY PICK이 됩니다.
- **최근 5경기 하이라이트**: 대형 W–L, 승률, KDA(합계·평균), 경기별 챔피언/KDA 카드
- **영상 탭 (3번 시안 구조)**: ① **`LIVE NOW · 선수 방송`** — `/api/live` 가 방송 중이라고 하면 16:9 히어로 카드에 **썸네일·`● LIVE`·플랫폼 배지(SOOP/CHZZK)·방제·카테고리·경과 시간·시청자 수**를 보여 주고 `방송 보러가기 ↗` 로 바로 연결합니다. 나머지 선수는 오프라인 칩으로. 전원 오프라인이면 같은 자리에 `지금은 5명 모두 오프라인이에요 · 5분마다 자동 확인` 컴팩트 바와 5인 방송국 칩을 둡니다(방송 중 1분 · 오프라인 5분 폴링). ② 생중계·공식 채널(LCK CHZZK·SOOP·YouTube, Dplus KIA YouTube) + 다음 경기 안내 ③ **유튜브 재생목록** — 디플러스 기아 공식 채널의 실제 재생목록 6종을 **가로 1줄 컴팩트 카드**로(누르면 재생목록이 앱 안에서 이어서 재생) ④ **영상 아카이브 116편** — 5인 + 디플러스 기아 공식 채널·LCK·T1·한화생명·LoL Esports 에서 확인한 실제 영상(제목·챔피언이 확인되는 것만 챔피언 태그). 검색창(4개 국어 동시 검색·한국어 IME 안전) 옆에 **`YouTube에서 ‘{검색어}’ 바로 검색 ↗`** 원클릭 보조 링크, 추천 챔피언 칩 16종(앞 6종 `#암베사 #나르 #아지르 #카이사 #르블랑 #제이스` 고정 순서 + 탈리야·요네·조이·클레드·크산테·나서스·올라프·럼블·신드라·오공), 종류 칩(`전체 / ★ 찜 N / 하이라이트 / 매드무비 / 딮터뷰·비하인드 / 쇼츠`), 선수 칩, `선수별`/`최신순` 정렬. ⑤ **찜(⭐) & 연속 재생** — 카드 우측 상단 ★ 토글로 `localStorage`(`dk.signal.favs`)에만 저장, `★ 찜 N` 필터, **`▶ 찜 목록 연속 재생`** 바. **인앱 플레이어**는 `연속 재생 중 1 / N` + `⭐ 찜됨` 토글, **`다음 영상` 미리보기 + `다음 ▶`**(YouTube iframe 의 재생 종료 신호로 자동 넘김), **MY LIST 찜 목록 대기열**(현재 곡 이퀄라이저·순번·길이), `YouTube에서 열기 ↗` 를 제공합니다. ⑥ 디플러스 기아 공식 유튜브 최신 10편(`/api/dk-youtube`) ⑦ 선수별 개인 방송국 ⑧ 최근 공식 경기 다시보기(VOD·하이라이트).
- **방송국 · 전적 바로가기**: 배너·경기로그·기록실에서 선수 개인 방송국(CHZZK / SOOP)과 OP.GG(u.gg)로 바로 이동합니다. 확인된 채널만 연결했습니다 — 도란 SOOP·CHZZK, 카나비 CHZZK, 쇼메이커 CHZZK, 스매쉬 SOOP·CHZZK, 딜라이트 CHZZK.
- **공식 경기 영상·생중계**: 생중계 채널은 영상 탭에 모았고, 홈에는 `영상 보러가기` 버튼만 둡니다. 공식일정 `NEXT` 카드는 영상 탭으로 이동하는 링크만 남겼습니다. 종료된 경기는 LoL Esports `getEventDetails`의 VOD 정보로 **언어별 풀영상**(한국어 SOOP, 해외 유튜브/트위치)과 **유튜브 하이라이트 검색**을 붙입니다(공식 VOD가 없으면 검색으로만 안내).
- **선수 라이브 방송 감지 · 알림**: `/api/live` 가 5인의 SOOP·CHZZK 공개 API 를 조회해 방송 중인 선수를 알려 줍니다(45초 캐시). 방송 중이면 홈 5인 보드 타일·MY PICK·영상 탭 방송국 카드에 **LIVE** 배지와 방송 제목이 뜨고, 영상 탭 상단에 `지금 방송 중` 줄이 생깁니다. `/api/check` 는 5분마다 상태를 확인해 꺼져 있다가 켜진 방송은 구독 기기로 `🔴 [도란] SOOP 방송 시작` 푸시를 보내고(클릭하면 방송국으로 이동) Upstash Redis 에 상태를 남겨 중복 발송을 막습니다. 첫 점검은 기준값만 저장합니다.
- **🔴 인게임 레이더 (`Spectator-V5`)**: 5인 중 누가 솔랭·자랭을 하는 중이면 MY PICK 배너에 `🔴 게임 중 · 야스오 · 13분` 줄이 생기고 5인 보드 타일에도 같은 배지가 붙습니다(경과 시간은 서버 호출 없이 1분마다 다시 계산). 배너의 그 줄을 누르면 **양 팀 5:5 챔피언 아이콘·소환사 주문·같은 판에 잡힌 DK 동료/타 팀 프로 선수**를 아래에서 올라오는 시트로 보여 줍니다(Esc·✕·배경으로 닫기, 챔피언·스펠 이름은 4개 국어). 닉네임이 공개되지 않는 참가자는 챔피언만 표시합니다.
- **🔥 내전 · 듀오 · 타 팀 프로 매치업**: 최근 경기 참가자를 비교해 DK 5인끼리 같은 판이면 아군 `🤝 도란·카나비 듀오` / 적군 `🔥 도란 vs 쇼메이커 내전!`, 타 팀 프로 선수가 있으면 `🤝 with 페이커 (T1)` / `⚔️ vs 쵸비 (GEN)` 배지를 홈(MY PICK·타일)과 경기로그 표에 붙입니다. 끝난 경기는 Match-V5 참가자의 `Riot ID`를, 인게임은 미리 받아 둔 `PUUID`를 **정확히 일치**시켜 판정합니다(닉네임 부분 일치 같은 추측 없음).
- **🏆 일정 · D-DAY 는 캘린더 탭에서**: 홈은 `MY PICK` · 설치 배너 다음에 바로 **5인 상태 보드**로 이어집니다(홈 D-DAY 스트립은 뺐습니다). **2026 하이원 e스포츠 대상 투표**(12/04 마감 · 마이원픽 1일 1회 무료 · 인기상 쇼메이커 / 신인상 스매쉬), 2026 LCK 어워드(12/16 치지직 롤파크), 2027 LCK 컵(개막일 미발표 · 1월 중순 예상), 선수 생일·데뷔 기념일은 **캘린더 탭**(리스트 · 월간 캘린더 · 투표 세 가지 보기)에서 모두 볼 수 있습니다. 날짜는 `data.js` 의 `EVENTS` 한 곳만 고치면 됩니다.
- **알림 설정**: 선수별 솔랭 알림(기본 도란만 ON), DK 공식 경기 알림(일정·시작), **선수 라이브 방송 알림**(기본 ON), **방송국 공지 알림**(기본 ON). 홈·캘린더 두 곳 동기화, 서버 구독 정보와 자동 연동.
  - **테스트 알림**은 현재 선수의 솔랭 알림 → 경기 알림 순서로 켜진 설정을 골라 실제 서비스워커 알림을 보냅니다.
- **한 줄 응원**: 선택 선수에게 응원 한 줄을 남기고 기기에 저장(최대 5줄, 삭제 가능)
- **솔로랭크 카드**: 티어/LP·시즌 전적·최근 경기 표(챔피언, 포지션, 승패, K/D/A, 시간)
- **경기로그 탭**: 승/패 필터
- **캘린더 탭 (구 공식일정)**: `📋 리스트 | 📅 캘린더 | 🗳️ 투표 (2)` 3단 전환 — 3등분된 전환 바에서 진행 중 투표 개수를 배지로 보여 주고, 360·390·430px 어느 폭에서도 5개 국어가 한 줄에 들어갑니다(400px 이하에서는 간격·글자를 살짝 줄임). 리스트는 NEXT 카드(자동 갱신·경기 알림 토글·영상 탭 링크), 최근 DK 공식 경기, **2027 시즌 로드맵**(LCK 컵 → First Stand: All In(중국) → LCK 정규 시즌 → MSI 2027(발렌시아) → 월즈 2027(나고야·수원·서울)), 선수별 최근 공식 경기를 보여 줍니다.
  - **📅 월간 캘린더**: 달 이동·`오늘`·`전체 | ● 경기 | ● 기념일 | ● 투표 | ● 방송` 필터. 기념일은 `PLAYERS` 의 생일·데뷔일에서 그 해 기준으로 자동 계산(데뷔 N주년), 경기는 `MATCH_LOG` + `/api/official`(다음·최근), 투표는 `VOTES`(시작일~마감일), 방송은 `EVENTS`·`CAL_EXTRA`(12/17 하이원 시상식)·SOOP 방송국 공지. 날짜를 누르면 `SELECTED DAY` 상세와 `THIS MONTH` 목록이 함께 갱신되고, 5개 국어로 표시됩니다. 달력·선택한 날·이번 달 목록만 남기고 투표 블록은 🗳️ 투표 보기로 옮겼습니다.
  - **🗳️ 투표**: 전환 바 바로 아래에 **투표 모아보기**가 스크롤 없이 뜹니다 — `진행 중`은 마감이 가까운 순(하이원 인기상 쇼메이커 · 신인상 스매쉬), 이어서 `마감됨`(업비트 ALL-TIME HIGH 팀 상)을 한 카드에 모으고, 각 항목에서 바로 투표·공지로 이동합니다. 진행 중 투표가 없으면 배지는 숨김.
- **📢 선수 SOOP 방송국 공지 알림**: `/api/check` 가 `chapi.sooplive.co.kr/api/{id}/home` 의 `boards`(공지사항)를 읽어 Redis `dk:state.notices` 의 마지막 `title_no` 와 비교하고, 새 공지가 올라오면 `📢 {선수} 방송 공지: {제목}` 푸시(클릭 시 `ch.sooplive.co.kr/{id}/post/{title_no}`)를 보냅니다. **처음 보는 방송국은 기존 공지를 보내지 않고 최신 `title_no` 만 저장(시딩)** 한 뒤 다음 공지부터 알립니다.
- **기록실 탭**: 2026 시즌 대회별 세트 전적, 월즈 결과
- **PWA**: manifest + 서비스 워커 오프라인 캐시(`/api/*` 는 캐시하지 않음), 푸시·알림 클릭·구독 갱신 핸들러, 로고 기반 아이콘
- **홈 화면 숏컷 4개**: 아이콘 길게 누르기 → `캘린더`·`영상`·`경기로그`·`기록실`(`?tab=` 딥링크). 각 숏컷에 전용 **192×192 PNG**(`icons/shortcut-*-192.png`, 앱과 같은 딥네이비+민트·탭 바와 같은 글리프)를 달아 안드로이드에서 뜨던 **하얀 네모 아이콘**을 없앴습니다(`tools/make_shortcut_icons.py` 로 재생성).

## 서버 함수 (`/api/*`)

| 경로 | 하는 일 |
| --- | --- |
| `GET /api/official` | DK 다음 경기 + 최근 결과 + 경기별 VOD 링크 (LoL Esports 공개 API, 90초 캐시 · `?lang=ko\|en\|ja\|zh`) |
| `GET /api/solo` | 5인 티어·LP·전적·인게임·최근 5경기 + `liveGames`(인게임 양 팀 챔피언·스펠·DK/프로) + `matchups`(같은 판 듀오·내전·프로) (Riot API, 45초 캐시) · 키 없으면 스냅샷 |
| `GET /api/live` | 5인 라이브 방송 상태 — 방제·썸네일·시청자 수·카테고리·시작 시각 포함(값이 없으면 키 생략) (SOOP station API · CHZZK live-status, 45초 캐시) |
| `GET /api/dk-youtube` | 디플러스 기아 공식 유튜브(@DplusKia_LOL) 최신 영상 10편 (채널 RSS, 10분 캐시 · 실패 시 마지막 확인본 스냅샷) |
| `GET /api/notices` | 선수 SOOP 방송국 최신 공지(`dk:state.notices` 캐시, `?refresh=1` 새로 조회) — 캘린더 방송 일정 |
| `GET /api/config` | 프론트 공개 상태값(푸시 공개키·저장소·솔로 소스·마지막 점검) + 관리자 집계(`playerStats` 선수별 알림 기기 수 · `langStats` 언어 분포 · `pushLog` 최근 발송 10건 · `daily`/`dailyDelta`/`dailyHistory` 오늘 증감·최근 7일 · `banner` 한 줄 공지) |
| `POST /api/config` | 관리자 전용(`X-Admin-Pin` = PIN SHA-256) — `runCheck` 점검 1회 실행 · `setBanner` 한 줄 공지 저장 · `broadcast` 전체 구독자 알림 발송(`dry:true` 미리보기) |
| `POST /api/subscribe` | 기기 푸시 구독 + 알림 설정 + 언어(`lang`) 저장 (`DELETE` 해지, `GET ?endpoint=` 확인) |
| `GET /api/check` | 주기 점검 — 새 랭크 게임 / 새 일정 / 시작 임박 / **새 인게임**(`dk:state.ingame`) / **새 방송국 공지**(`dk:state.notices`, `?only=notices`) 감지 후 푸시 (`?dry=1` 미리보기, `?test=1` 구독 기기로 테스트 푸시) |

```bash
BASE=https://dk-signal.vercel.app
curl -s $BASE/api/official | head -c 400
curl -s $BASE/api/solo | head -c 300
curl -s $BASE/api/config
curl -s $BASE/api/dk-youtube | head -c 400
curl -s "$BASE/api/check?dry=1&token=$CHECK_SECRET"
curl -s "$BASE/api/check?test=1&token=$CHECK_SECRET"   # 잠금화면 알림 확인
```

## v3.11 (2026-11-28) — 관리자 앱 독립 사이트 분리

- 관리자 앱을 **별도 저장소 · 별도 도메인**(`dk-signal-admin.vercel.app`)의 독립 PWA 로 분리했습니다. 메인 앱과 오리진이 달라 서비스 워커·캐시·홈 화면 설치가 섞이지 않습니다.
- 이 저장소에서 `admin.html`·`admin.css`·`admin.js`·`manifest-admin.json`·`admin-sw.js` 와 `vercel.json` 의 `/admin` rewrite 를 제거했습니다. 예전 `/admin` 은 **404** 입니다.
- `api/config.js` 에 관리자 오리진 전용 CORS 를 넣었습니다 — 허용 오리진(`ADMIN_ORIGINS`)만 preflight/POST 를 통과하고, 다른 오리진 POST 는 `403 forbidden_origin`, PIN 은 그대로 `X-Admin-Pin` 검증.
- 메인 `sw.js`·`tools/dev_server.js` 에서 `/admin` 특례를 지웠습니다.

## v3.10 (2026-11-28) — 관리자 대시보드 (민트 테마 · 인기 순위 · 7일 추이 · 언어 비율 · 발송 기록 · 공지 · 전체 알림)

- 관리자 앱을 메인 앱과 같은 **검정 + 민트** 테마로 통일하고, 설치 안내를 화면 하단(본문 맨 아래)으로 옮겼습니다.
- 새 카드 7종: 선수별 알림 인기 순위 · 최근 7일 구독자 그래프 · 오늘 구독자 증감 배지 · 언어별(KO/EN/JA/ZH/VI/미기록) 비율 · 최근 알림 발송 기록 · 한 줄 공지 켜고 끄기 · 전체 알림 보내기(확인 팝업).
- `/api/config` 하나로 집계를 내려주고(새 Vercel 함수 없음), `POST /api/config` 로 점검 실행·공지 저장·전체 발송을 PIN 검증 뒤에 처리합니다.
- `POST /api/subscribe` 가 앱 언어(`lang`)를 함께 저장해 언어 분포를 셀 수 있습니다.
- `dk:pushlog`(실제 발송만, 최대 15건) · `dk:stats:daily`(오늘 기준값 + 최근 7일) · `dk:banner`(한 줄 공지) 키 추가.

## v3.9.2 (2026-11-28) — 아이폰·갤럭시 공통 서버 경유 테스트 알림

| 변경 | 내용 |
| --- | --- |
| 📮 서버 경유 테스트 푸시 | `POST /api/subscribe` 에 `{action:'test'}` 분기를 넣었습니다(새 함수 파일 없이 → Vercel 함수 12개 제한 그대로). 클라이언트가 **자기 기기의 `PushSubscription` 1건**을 보내면 서버가 `delayMs`(기본 3000ms·최대 5000ms) 만큼 기다렸다가 **그 구독 1건에만** 알림을 한 번 보냅니다. 저장된 구독 목록(`dk:subs`)은 읽지도 쓰지도 않습니다(브로드캐스트 금지). 같은 기기 연타는 `dk:test:{id}` TTL 15초로 429. |
| 📱 아이폰 안내 | iOS인데 `isStandalone()` 이 false(Safari 탭·인앱 브라우저)면 `아이폰은 Safari → 공유 → "홈 화면에 추가"로 만든 앱에서 열어야 알림이 와요.` 를 띄우고 설치 가이드를 엽니다. |
| ⏱️ 3초 지연 안내 | 구독이 있으면(아이폰 홈 화면 앱·갤럭시 공통) 서버에 테스트를 부탁하고 **"3초 뒤 서버에서 알림이 도착해요! 화면을 잠그거나 홈으로 나가서 확인해 보세요."** 를 보여 줍니다. ios 는 앱을 보고 있으면 배너가 묻히기 때문에 그 3초 동안 홈·잠금화면으로 나갈 수 있게 했습니다. 구독 전이면 권한 요청 → 구독 → 테스트까지 이어서 하고, 서버가 없으면 기존 기기 알림·인앱 배너로 폴백합니다. |
| 🔔 iOS `push` 호환 | `sw.js` `push` 핸들러에서 `event.data` null 가드, 빈 제목 방지, `showNotification` 실패 시 최소 옵션으로 1회 재시도(iOS는 표시 실패가 반복되면 구독이 해지될 수 있음). `tag`·`data`·`icon`·`badge`·`renotify` 는 iOS가 무시할 뿐 문제되지 않습니다. |
| ✅ 검증 | `api_smoke.js` 에 테스트 푸시 8건 추가(200·지연 반영·브로드캐스트 아님·구독 목록 불변·http 거절·구독 누락·5초 클램프·기기별 429·VAPID 없음 503) → **145 통과**. `verify.py` 104 · `verify_v3.py` 512 통과. 가짜 `PushSubscription` 으로 갤럭시(구독 있음/처음)·아이폰 Safari 3가지 흐름을 로컬에서 확인. `sw.js` 캐시 `dk-signal-v16`. |

## v3.9.1 (2026-11-28) — 캘린더 데뷔 배지에 선수 이름

| 변경 | 내용 |
| --- | --- |
| 🏷️ 데뷔 배지에 선수 이름 | 캘린더 셀에 `🎉 데뷔 9주년` 으로만 보여 누구 데뷔인지 알 수 없던 문제 수정 — 이제 `쇼메이커 데뷔 9주년` 처럼 **이름이 먼저** 나오고, 45px 남짓한 한 칸에서 `쇼메이커 / 데뷔 9주년` 두 줄로 읽힙니다. 생일 배지 `🎂 카나비` 는 그대로. |
| 🌐 5개 국어 배지 문구 | `cal.debutBar` 를 이름 인자와 함께 다시 씀 — ko `{name} 데뷔 {n}주년` · en `{name} {o}`(1st/2nd/3rd/9th 서수) · ja·zh `{name} {n}周年` · vi `{name} {n} năm`. 일본어 배지는 카타카나(ショウメイカー)가 한 칸을 넘어 라틴 표기(ShowMaker)를 씁니다. |
| ✂️ 긴 라틴 이름 | `ShowMaker` 는 좁은 칸에서 `Show` / `Maker` 로 끊기도록 대문자 앞에 `<wbr>` 를 넣었습니다. 기념일 배지만 좌우 여백 3px 로 줄여 360px 에서도 `데뷔 9주년` 이 잘리지 않습니다. |
| ✅ 검증 | `verify.py` 104 · `verify_v3.py` 512 · `api_smoke.js` 136 통과, 360/390/430px × 5개 국어에서 **선수 이름 잘림 0**(좁은 화면에서 `ShowMaker` 의 주년 표기만 …로 줄어듦). 배지에 선수 이름이 들어가는지 검증 2건 추가. `sw.js` 캐시 `dk-signal-v15`. |

## v3.9 (2026-11-28) — 캘린더 3단 전환(리스트·캘린더·투표) · 안드로이드 배지 아이콘

| 변경 | 내용 |
| --- | --- |
| 🗳️ 캘린더 탭 3단 전환 | `📋 리스트 \| 📅 캘린더` → **`📋 리스트 \| 📅 캘린더 \| 🗳️ 투표 (2)`**. 세 버튼이 1/3씩 나눠 갖고, 진행 중 투표 개수를 민트 배지로 표시합니다. `localStorage`(`dk.signal.officialView`)에 고른 보기를 저장하고, `official.viewVotes` 문구를 5개 국어로 추가. 400px 이하에서는 간격 3px·글자 9.5px로 줄여 한 줄 유지. |
| 🗳️ 투표 보기 분리 | 캘린더 보기 맨 아래·리스트 보기 아래에 중복으로 있던 **투표 모아보기**를 `🗳️ 투표` 보기 하나로 모았습니다. 전환 바 바로 아래에 카드가 바로 뜨고(390×844에서 스크롤 없이 진행 중 2 · 마감됨 1 확인), 각 항목에서 투표·공지로 이동합니다. |
| 🔔 안드로이드 상태바 배지 | `icons/badge-96.png` 가 어두운 배경을 꽉 채우고 있어 상태바에 흰 네모(■)로 보이던 문제 수정 — 96×96 RGBA, 배경 Alpha 0, 가운데 **DK** 글자만 순백(#FFFFFF). `tools/make_icons.py` 에 PIL 로 그리는 `draw_badge()` 와 `BUILD=badge` 선택 빌드를 넣어 다시 만들 수 있게 했습니다. `sw.js` 캐시 `dk-signal-v14` 로 올려 설치된 앱에도 반영. |

## v3.8 (2026-11-28) — 홈 D-DAY 스트립 정리 · 캘린더 확대

| 변경 | 내용 |
| --- | --- |
| 홈 D-DAY 스트립 제거 | 첫 화면이 `MY PICK` → 설치 배너 → 5인 상태 보드로 바로 이어집니다. `renderEvents()` 는 남겨 두어 `index.html` 의 `#eventStrip` 한 줄만 되살리면 복구됩니다. 일정·투표는 캘린더 탭에 그대로 있습니다. |
| 캘린더 확대 | `.cal-card` 좌우 여백 축소(6px), 셀 높이 30px·주 행 28px, 날짜 11px·배지 8px(두 줄 클램프), 월 제목 15px — 390px 화면에서 한눈에 읽힙니다. |

## v3.6 (2026-11-27) — 데뷔일 D-DAY · 베트남어(VI) · 초간단 설치 가이드

| 기능 | 내용 |
| --- | --- |
| 선수 데뷔일 | `data.js` `PLAYERS[].debut` + `debutNote`(데뷔 무대). 리그피디아(Leaguepedia) `ScoreboardPlayers` 첫 1군 공식전 기준 — 도란 2019-07-20(LCK 서머·Griffin), 카나비 2019-06-09(LPL 서머·JDG), 쇼메이커 2017-11-22(KeSPA Cup·DAMWON), 스매쉬 2025-01-24(LCK 컵·T1 1군), 딜라이트 2021-01-15(LCK 스프링·Fredit BRION) |
| 데뷔 기념일 D-DAY | 홈 이벤트 스트립에 `🎉 {선수} 데뷔 N주년 D-XX` 카드를 가까운 두 명까지 함께 계산·노출(최대 5장) |
| 기록실 프로필 | 선수 카드에 🎂 생일(만 나이·D-DAY) / 🎉 데뷔(YYYY-MM-DD·데뷔 N일째·데뷔 무대·N주년 D-XX) 표시 |
| 베트남어(VI) | `i18n.js` 409키 × 5개 언어(ko/en/ja/zh/vi) 100% 일치, `data.js` 447개 문구(포인트·경기명·대회명)에 `vi`, 챔피언 173종 `vi_VN`(Data Dragon 16.23.1), `/api/official?lang=vi`·lolesports `hl=vi-VN` |
| 설치 가이드 | 헤더 `📲 앱 설치` 버튼 + 홈 설치 배너가 **스탠드얼론이 아니면 항상** 보임. 모달에서 ① 안드로이드 원터치(`beforeinstallprompt`) ② 크롬·삼성 인터넷 수동 메뉴 ③ 아이폰 Safari 3단계 ④ 카톡·X·인스타 인앱 브라우저 경고를 지금 기기 순서로 정렬. 5개 국어 번역 |

헤더는 360·390·430px에서 줄바꿈·가로 넘침 없이(오버플로 0) 언어 5개 + 테마 + 설치 버튼이 한 줄에 들어갑니다. 서버리스 함수는 그대로 **7개**입니다.

## v3.5 (2026-11-27) — 영상 탭 디벨롭 (LIVE NOW · 찜 · 연속 재생)

| 기능 | 서버 | 화면 |
| --- | --- | --- |
| ③ 선수 방송 히어로 | `/api/live` 가 `thumb`(SOOP `broad_thumb` / CHZZK `liveImageUrl` 템플릿 해석)·`category`(`broad_cate` / `liveCategoryValue`)를 추가 반환. 없으면 항목 자체를 생략 | `LIVE NOW · 선수 방송` 16:9 카드(방제·플랫폼·경과·시청자) / 전원 오프라인이면 컴팩트 바 + 방송국 칩 |
| ① 아카이브 확충 | — (정적) | 45편 → **116편**(도란 20·카나비 12·쇼메이커 20·스매쉬 10·딜라이트 10·DK 공식/LCK 팀 영상 44), 챔피언 태그 6종 → **16종** |
| ① 검색 보조 | — | 검색어 입력 시 `YouTube에서 ‘{q}’ 바로 검색 ↗` 링크 |
| ① 재생목록 컴팩트 | — | 2열 카드 → **가로 1줄 스크롤 미니 카드**(108px) |
| ② 찜(⭐) | — (`localStorage` `dk.signal.favs`) | 카드 ★ 토글, `★ 찜 N` 필터, `▶ 찜 목록 연속 재생` 바 |
| ② 연속 재생 | — | 플레이어 `연속 재생 중 1/N`·`⭐ 찜됨`, `다음 영상` 미리보기·`다음 ▶`, MY LIST 대기열, 자동 넘김(재생 종료 신호) |

서버리스 함수는 그대로 **7개**입니다 — Vercel Hobby 12개 한도 안에서 기존 `/api/live` 응답만 확장했습니다. 추가한 모든 영상 ID는 `tools/verify_highlights.py`로 YouTube oEmbed 200을 전수 확인했고, 챔피언 태그는 제목에서 챔피언이 명확한 영상에만 붙였습니다.

## v3.4 (2026-11-27) — 인게임 레이더 · 매치업 · D-DAY

| 기능 | 서버 | 화면 |
| --- | --- | --- |
| 인게임 레이더 | `/api/solo` 가 `Spectator-V5` 응답을 `liveGames` 로 정리(양 팀 5명·챔피언id/스펠id·gameStartTime) | MY PICK `🔴 게임 중 · 챔피언 · N분` → 누르면 5:5 시트 |
| 내전/듀오 | `matchups` — 참가자 PUUID 비교(DK 5인) | 홈 배지 + 경기로그 표 칩 |
| 타 팀 프로 | `pros.js` 표(21명)의 Riot ID 로 PUUID 를 미리 받아 PUUID 정확 일치 | `⚔️ vs` / `🤝 with` 배지 |
| 인게임 푸시 | `/api/check` `checkIngame` — `dk:state.ingame` 게임 id 로 중복 방지 | 솔랭 알림을 켠 기기로 `🔴 도란 · 게임 시작` |
| 이벤트 D-DAY | — (정적) | `data.js` `EVENTS` + 선수 생일 → 홈 스트립 |

서버리스 함수는 그대로 **7개**(`official`·`solo`·`live`·`config`·`subscribe`·`check`·`dk-youtube`)로, Vercel Hobby 12개 한도 안에서 기존 `/api/solo`·`/api/check` 응답을 확장했습니다.

**프로 계정 표 갱신**: `api/_lib/pros.js` 의 `PROS` 배열만 고치면 됩니다. 2026-11-27 JJANG.GG 프로게이머 솔랭 목록(현역 57명 · 팀·포지션·Riot ID)과 선수 공개 프로필에 같은 아이디가 적힌 것을 함께 확인해 21명을 넣었습니다. 계정을 못 찾으면(닉네임 변경·404) 그 선수만 조용히 빠지고 잘못 표시되지는 않습니다.

**이벤트·생일 근거(2026-11-27 확인)**: 2026 LCK 어워드는 12월 16일(수) 치지직 롤파크 개최·CHZZK/SOOP 생중계(라이엇 게임즈 11-05 발표), 팬 팀 투표(업비트 ALL-TIME HIGH)는 11-26 23:59 마감, 올해의 선수·포지션별 선수는 선정단 투표로 시상식 당일 공개. 2027 LCK 컵 개막일은 아직 미발표(1~2월 예정)라 2026 시즌 개막일(1/14)을 기준으로 **예상** 카운트다운만 표시합니다. 선수 생일은 위키백과·Sheep Esports 등에서 5인 전원 확인했습니다 — 도란·쇼메이커 2000-07-22, 카나비 2000-11-02, 딜라이트 2002-09-12, 스매쉬 2006-07-20.

## 배포 상태 (2026-11-27 기준)

| 항목 | 상태 |
| --- | --- |
| 공식 경기 자동 수집 (`/api/official`) | **켜짐** — LoL Esports에서 실제 응답 확인 |
| 솔로랭크 실시간 (`/api/solo`) | **켜짐** — `RIOT_API_KEY`(Riot 개인용 키 · App 913497 `DK Signal`, 만료 없음) 등록 → `source: "riot"`. 키가 없으면 스냅샷으로 자동 대체 |
| 웹 푸시 VAPID 키 | **등록됨** (Production) — `/api/config` 의 `push.ready: true` |
| 푸시 구독 저장소 | **연결됨** — Vercel Marketplace Upstash for Redis(Free) `dk-signal-kv` (iad1). 환경변수는 `KV_REST_API_URL`·`KV_REST_API_TOKEN` 으로 자동 주입 |
| `/api/check` 보호 토큰 | **켜짐** (`CHECK_SECRET`·`CRON_SECRET`) — 토큰 없이 부르면 401 |
| Vercel Cron | 하루 1회(07:00 KST) `/api/check` |

`curl -s https://dk-signal.vercel.app/api/config` 로 언제든 현재 상태를 확인할 수 있습니다.

## 관리자 앱 — 별도 사이트·별도 PWA로 분리 (`dk-signal-admin.vercel.app`)

운영 상태를 보고 알림·공지를 직접 다루는 **관리자 전용 앱**은 이 저장소에서 나가 **독립 저장소·독립 도메인**으로 분리했습니다
(2026-11-28). 메인 앱과 오리진·서비스 워커·설치가 완전히 달라, 홈 화면에 각각 다른 앱으로 설치됩니다.

- **주소**: `https://dk-signal-admin.vercel.app` · **저장소**: `github.com/schl410-hub/dk-signal-admin`
- **이 저장소에는 `/admin` 경로가 없습니다** — `admin.html`·`admin.css`·`admin.js`·`manifest-admin.json`·`admin-sw.js` 와 `vercel.json` 의 `/admin` rewrite 를 모두 제거했고, 예전 `/admin` 주소는 **404** 입니다. 메인 앱 화면 어디에도 관리자 링크는 없습니다.
- **데이터**: 관리자 앱은 이 서버의 `https://dk-signal.vercel.app/api/config` 를 직접 부릅니다(60초 자동 갱신).
- **대시보드 카드**: 구독자 현황(오늘 +N명) · 최근 7일 구독자 · 선수별 알림 인기 · 언어별 구독자 · 시스템·크론 상태(지금 바로 점검) · 최근 알림 발송 기록 · 전체 알림 보내기(확인 창) · 메인 화면 한 줄 공지 · 선수별 최신 수집 현황
- **저장 키**: `dk:subs`(구독) · `dk:pushlog`(최근 15건, GET 은 10건) · `dk:stats:daily`(오늘 기준값 + 최근 7일) · `dk:banner`(한 줄 공지)
- **잠금**: 4자리 PIN(숫자 키패드, SHA-256 해시 비교). 해제 상태는 관리자 앱 오리진의 `localStorage`(`dk.admin.auth.v1`)에 저장됩니다.
  ※ 공개 주소 + 4자리 PIN 이라 화면 잠금은 강한 인증이 아닙니다. 개인 운영용 전제이고, 더 조이려면 `ADMIN_PIN_HASH` 로 더 긴 PIN 해시를 쓰세요.

### 관리자 앱 CORS (이 서버 쪽)

관리자 앱은 다른 오리진이라, `api/config.js` 가 관리자 오리진에만 CORS 헤더를 답합니다.

- **허용 오리진**: `https://dk-signal-admin.vercel.app`, `https://dk-signal.vercel.app` (기본값) — `ADMIN_ORIGINS` 환경변수(쉼표 구분)로 바꾸거나 추가합니다.
- **preflight**(`OPTIONS`): 허용 오리진에만 `Access-Control-Allow-Origin`(그 오리진) · `Allow-Methods: GET, POST, OPTIONS` · `Allow-Headers: Content-Type, X-Admin-Pin` · `Max-Age: 86400`.
- **POST**: `Origin` 이 허용 목록 밖이면 **403 `forbidden_origin`** 으로 PIN 검사 전에 끊고, 통과해도 `X-Admin-Pin`(PIN SHA-256)이 맞아야 실행됩니다(`ADMIN_PIN_HASH` 로 교체 가능).
- **GET**: 공개 집계(숫자)라 어떤 오리진에서도 읽히지만, 관리자 오리진에는 그 오리진으로 ACAO 를 답합니다.
- 로컬 개발(Vercel 이 아닌 환경)은 `http://127.0.0.1:*`·`http://localhost:*` 를 허용합니다.

## 환경변수 (Vercel → Settings → Environment Variables)

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `RIOT_API_KEY` | 솔로랭크 실시간 | Riot 개발자 포털 키(`RGAPI-…`). 개발용 키는 **24시간마다 만료**됩니다. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 | `node tools/make_vapid.js` 로 생성. 공개키는 프론트가 `/api/config` 로 받습니다. |
| `VAPID_SUBJECT` | 선택 | 기본 `https://dk-signal.vercel.app` (mailto: 또는 https URL) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 웹 푸시 | Vercel Marketplace 에서 Upstash Redis(무료) 연결하면 자동 주입. 구독·마지막 상태 저장용. |
| `ADMIN_PIN_HASH` | 선택 | 관리자 액션(`POST /api/config`) 검증용 PIN SHA-256. 넣지 않으면 앱에 들어 있는 기본 해시(4자리 PIN) 사용 |
| `CHECK_SECRET` (또는 `CRON_SECRET`) | 권장 | `/api/check` 보호 토큰. Vercel Cron 은 `CRON_SECRET` 을 자동으로 Bearer 로 보냅니다. |
| `LOLESPORTS_API_KEY` | 선택 | LoL Esports 공개 키가 바뀌었을 때 덮어쓰기 |
| `PUSH_DRY_RUN=1` | 선택 | 실제 발송 없이 로그만(로컬 검증) |

`vercel.json` 의 Cron 은 **하루 1회**(무료 플랜 한도) `/api/check` 를 부릅니다. 실시간에 가깝게 돌리려면 무료 외부 크론(cron-job.org 등)에서 5분 간격으로
`https://dk-signal.vercel.app/api/check?token=<CHECK_SECRET>` 를 호출하세요.

로컬 사본: 저장소에 커밋되지 않는 `.env.local` 에 위 값이 들어 있습니다(비밀키 백업용).

## 데이터

`data.js`의 5인 솔로랭크·대회 기록은 **2026-11-26에 확인한 KO.LOL · OP.GG · u.gg 공개 전적**이며, 서버 키가 없을 때의 기준값입니다.
`api/_lib/snapshot.js` 는 `node tools/make_snapshot.js` 로 data.js 에서 자동 생성합니다(직접 수정 금지).

방송국 링크는 2026-11-27에 CHZZK 채널 API·SOOP 스테이션 API로 실제 존재와 이름을 확인했습니다. 영상 아카이브 45편(5인 33편 + DK 공식 12편)과 재생목록 6종은 2026-11-27 디플러스 기아 공식 채널·LCK 공식 유튜브·LoL Esports에서 확인해 YouTube oEmbed로 재생 가능 여부(200)를 확인한 것만 넣었고, 챔피언 태그는 영상 제목이나 썸네일에서 실제로 확인된 경우에만 붙였습니다(추천 챔피언 5종은 `tools/verify_highlights.py` 가 1편 이상 연결되는지 검사). 디플러스 기아 공식 유튜브 최신 영상은 `/api/dk-youtube` 가 채널 RSS에서 받아 옵니다(RSS 사본은 `node tools/make_dk_youtube_snapshot.js` 로 갱신). 챔피언 이름 표는 Riot Data Dragon 16.23.1(ko_KR·en_US·ja_JP)에서 `tools/make_champions.py` 로 생성합니다.

2027 시즌 표기는 2025년부터 바뀐 LCK 체제(스프링·서머 스플릿 폐지, **LCK 컵 → 단일 정규 시즌**)를 따르고, 국제 대회 개최지는 **LoL e스포츠 2026-11-13 발표** 기준입니다.

## 파일

```
index.html            화면 뼈대 (테마·언어 부트스트랩 포함, data-i18n 마커)
styles.css            듀얼 테마 토큰 + 컴포넌트 스타일 (+ 언어·영상·링크 UI · 태국어 줄바꿈/숫자 처리)
langmenu.css          헤더 언어 버튼(🌐 KO ▾) + 10개국어 2열 팝오버·시트 스타일 (v3.13)
fonts/notothai.css    태국어 폰트(Noto Sans Thai 서브셋) @font-face
fonts/notosansthai.woff2  태국 글리프 서브셋 26KB
i18n.js               10개국어 사전(KO·EN·JA·ZH·TW·VI·ES·PT·TH·ID) + 날짜/요일/달 이름 + 언어 저장·전환
data.js               선수·경기·대회 기록 (2026-11-26) · 방송국 · 영상 아카이브 45편 + DK 공식 재생목록 6종(태그·챔피언 사전 포함) · 챔피언 이름 10개 언어 · 문장형 문구 ko/en/ja/zh/tw/vi
app.js                탭/선수·MY PICK·테마·알림·언어, 서버 실시간 연동·푸시 구독
sw.js                 서비스 워커 (캐시 v21 · 언어 메뉴·태국어 폰트 포함 + 웹 푸시 + 구독 갱신)
api/_lib/ingame.js    Spectator-V5 → 양 팀 챔피언·스펠·DK/프로 참가자·배지 계산
api/_lib/pros.js      타 팀 프로 계정 표(21명) + PUUID 미리 받기(30일 캐시 · 못 찾으면 24시간 건너뜀)
api/_lib/matchups.js  끝난 경기 참가자 비교로 듀오/내전/프로 매치업 판정
api/_lib/champions.js Riot 숫자 id → 챔피언·스펠 영어 이름 (tools/make_riot_names.js 로 생성)
manifest.json         PWA 설정 (manifest.webmanifest 와 동일 내용)
icons/shortcut-*-192.png  홈 화면 숏컷 4종 아이콘(tools/make_shortcut_icons.py)
api/official.js       DK 공식 일정
api/match.js          공식 경기 한 경기의 세트별 진영·밴픽·K/D/A·딜 비중
api/_lib/matchdetail.js  LoL Esports livestats + Leaguepedia(밴) 합치기 · 7일/30분 캐시
api/solo.js           솔로랭크
api/config.js         프론트용 공개 설정 + 관리자 집계(GET) + 관리자 동작(POST · PIN 검증)
api/subscribe.js      푸시 구독 저장/해지
api/check.js          주기 점검·푸시 발송 (공식 경기·솔랭·라이브 방송)
api/live.js           선수 라이브 방송 상태(SOOP·CHZZK)
api/_lib/stats.js     구독자 일별 통계(dk:stats:daily · 오늘 기준값 + 최근 7일)
api/_lib/pushlog.js   실제 발송 기록(dk:pushlog · 최대 15건 · 개인정보 없음)
api/_lib/             공식 일정·Riot·저장소·푸시·HTTP 유틸, 스냅샷(자동 생성)
vercel.json           Cron(하루 1회) · 함수 실행시간 · /api 캐시 금지 헤더 (관리자 /admin rewrite 제거됨)
package.json          의존성(web-push)
tools/dev_server.js   로컬 서버(정적 + /api) · 픽스처 모드 · DK_LIVE_FAKE 라이브 배지 검증
tools/fixtures/       검증용 고정 일정(다음 경기 없음/있음) · 공식 경기 상세(match-detail.json)
tools/api_smoke.js    /api 함수 동작 검증(실 API·YouTube RSS 1회 + 가짜 Riot/Redis/SOOP/CHZZK)
tools/verify.py       390×844 브라우저 회귀 검증 87항목 + 스크린샷
tools/verify_v3.py    다국어·재생목록·영상 아카이브·인앱 플레이어·라이브 배지 검증 233항목 + 스크린샷(downloads/dk-signal-v3)
tools/smoke_v3.py     빠른 화면 점검(스크린샷 없음)
tools/make_champions.py  Riot Data Dragon 10개 로캘 → data.js 챔피언 이름 표(10칸) 재생성
tools/make_tw_data.py  data.js 의 간체(zh) 문구 → 대만 번체(tw) 생성(OpenCC s2twp + 용어 보정)
tools/verify_lang10.py  10개국어 언어 메뉴·번역·가로 넘침 검증 421항목 + 스크린샷
tools/verify_match.py  경기로그 공식 경기(진영·밴픽·스탯)·세트별 요약 카드 검증 69항목 + 스크린샷
tools/verify_api.py   자동 갱신·실시간 반영·오프라인 검증 + 스크린샷
tools/make_snapshot.js data.js → api/_lib/snapshot.js
tools/make_vapid.js   VAPID 키 생성
tools/make_dk_youtube_snapshot.js  /api/dk-youtube 폴백 스냅샷 생성
tools/make_preview.py 단일 파일 프리뷰 빌드
tools/make_icons.py   아이콘 생성
(관리자 앱 자산·검증 도구는 분리된 `dk-signal-admin` 저장소의 tools/ 로 옮겼습니다)
tools/make_font.py    Pretendard 서브셋 생성
```

## 검증

```bash
python3 tools/verify_highlights.py          # 아카이브 116편 + 재생목록 6종 oEmbed · 5개 국어 포인트 확인
node tools/api_smoke.js                    # 서버 함수 164항목 (실제 LoL Esports API·YouTube RSS 1회 + 가짜 SOOP/CHZZK)

LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify.py       # 104/104
LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify_api.py   # 31/31
LD_LIBRARY_PATH=... python3 tools/verify_v3.py                                 # 614/614 (다국어 10종·재생목록·아카이브·인앱 플레이어·라이브·설치 가이드)
LD_LIBRARY_PATH=... python3 tools/verify_lang10.py                             # 421/421 (10개 언어 × 5탭 × 360/390/430·데스크톱 가로 넘침 0)
LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify_v4.py    # 63/63 (PC 레이아웃·재생목록·요약 카드·투표 팝업)
# 관리자 앱(독립 사이트) 검증은 별도 저장소에서:
#   python3 tools/verify_standalone.py   # 라이브 헤더·manifest·SW·CORS·잠금/대시보드
#   python3 tools/local_check.py         # 로컬 서버 + 실제 API 로 잠금→대시보드 확인
```

- `verify_highlights.py` 는 `data.js` 의 영상 45편과 재생목록 6종을 YouTube oEmbed 로 하나씩 확인하고, 챔피언 태그 정합성·한 줄 포인트·경기명·대회명 5개 국어(ko/en/ja/zh/vi)·중복 ID 까지 봅니다(영상이 내려가면 여기서 먼저 걸립니다).
- `verify.py` 는 `tools/dev_server.js`(픽스처 `none`)를 직접 띄워 5탭, 5인 전환, 테마 저장, MY PICK, 알림 동기화, 테스트 푸시, 응원 저장, 콘솔 에러를 확인하고 `downloads/dk-radar/signal-*.png` 를 갱신합니다.
- `verify_api.py` 는 다음 경기가 공개된 픽스처로 NEXT 카드 자동 갱신, 미공개 시 2027 LCK 컵 fallback, 실시간 솔로랭크 응답의 티어·인게임·전적 반영, 서버 미연결 시 화면 유지를 확인합니다.
- `verify_lang10.py` 는 헤더 언어 메뉴(🌐) 자체(항목 10개·2열·체크 표시·Esc/바깥 클릭/↑↓ 이동·시트/팝오버)와 **10개 언어 전체**를 돌며 `<html lang>`·저장값·트리거 코드·홈 탭 문구·챔피언 표기(ko 한글 / tw 번체 / en 라틴)를 확인하고, 10개 언어 × 5탭 × 360·390·430px + 데스크톱 1440px 에서 **가로 넘침 0건·번역 키 노출 0건**을 검사합니다(스크린샷 `downloads/dk-signal-v3/lang10-*.png`).
- `verify_v3.py` 는 KO/EN/JA/ZH/TW/VI/ES/PT/TH/ID 전환(탭·배너·타일·하이라이트·표·일정·기록·알림·응원·영상 탭), 새로고침 후 언어 유지, 브라우저 언어 자동 감지(en-US→EN, ja-JP→JA, zh-CN→ZH, zh-TW→TW, vi-VN→VI, es-ES→ES, pt-BR→PT, th-TH→TH, id-ID→ID, 그 외→KO), 헤더 한 줄(360/390/430)·설치 버튼·설치 안내(아이폰/카톡/안드로이드/스탠드얼론), 영상 탭 공식 채널 4곳·방송국 5인·재생목록 6종(카운트·썸네일·재생)·아카이브 45편(선수/종류/챔피언 필터·검색·해시태그·한국어 IME·썸네일·길이·연도)·인앱 플레이어(임베드 URL·닫기·소리 정지·배경 클릭)·디플러스 기아 공식 유튜브 10편(/api/dk-youtube)·VOD 링크, 라이브 배지(타일·MY PICK·영상 탭·방송국 카드·토글), 네 언어권에서의 가로 넘침, 콘솔 에러를 확인하고 `downloads/dk-signal-v3/*.png` 를 갱신합니다.
- 로컬에서 눈으로 보기: `node tools/dev_server.js` → http://127.0.0.1:8765
