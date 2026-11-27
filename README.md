# 딮기 시그널 (DK SIGNAL)

도란과 디플러스 기아 2027 로스터 5인의 **공식 경기 · 솔로랭크**를 한 화면에서 보는 팬 대시보드 PWA입니다.

- 라이브: https://dk-signal.vercel.app (Vercel · `/api/*` 서버 함수 포함)
- 저장소: https://github.com/schl410-hub/dk-radar
- 단일 파일 미리보기: `preview/dk-radar-preview.html`
- 테마: **다크 네온 민트**(기본, `#05090F` + `#00F5C4`) ↔ **소프트 민트 글래스**(파스텔 민트 + 화이트 글래스)

## 지금 동작하는 것

- **자동 갱신 (서버)**
  - **DK 공식 경기**: LoL Esports 공개 일정에서 DK 경기를 90초 캐시로 받아, 다음 경기가 공개되면 공식일정 `NEXT` 카드(상대 팀·대회명·라운드·Bo·한국 시간)를 자동으로 바꿉니다. 아직 공개 전이면 **2027 LCK 컵** 안내를 그대로 유지합니다.
  - **최근 DK 공식 경기**: 같은 응답의 최근 결과(점수·상대·라운드)를 자동으로 채웁니다. 서버에 못 붙으면 저장해 둔 월즈 2026 기록으로 대체합니다.
  - **솔로랭크**: `RIOT_API_KEY` 가 있으면 5인 티어·LP·시즌 전적·인게임 여부·최근 5경기를 실시간으로 받아 화면(타일·배너·전적표)에 반영하고, 없으면 `data.js` 스냅샷(2026-11-26)으로 안전하게 대체하며 상태 문구를 표시합니다.
  - 앱을 열어 둔 동안 90초마다 자동 확인하고, 상단에 `실시간` / `자동 갱신` 칩과 마지막 확인 시각을 보여 줍니다.
- **웹 푸시 (VAPID)**: 선수별 솔랭 ON/OFF + DK 공식 경기 ON/OFF 설정이 서버 구독 정보와 함께 저장됩니다. 서버가 5분마다 새 랭크 게임(챔피언·KDA·승패)과 새 공식 일정·경기 시작 40분 전을 감지해 구독 기기로 보냅니다. 준비가 안 된 상태에서는 화면에 무엇이 빠졌는지 그대로 표시합니다.
- **다국어 (KO · EN · JA · ZH)**: 헤더 `KO · EN · JA · ZH` 세그먼트로 즉시 전환. 탭·배지·선수명/실명/포지션/티어·공식 일정·경기표·영상 탭·알림 문구·테스트 알림·날짜 표기·챔피언 이름(Data Dragon zh_CN)까지 화면 전체와 `document.title`·`<html lang>`(zh-CN)·미리보기 문구가 함께 바뀝니다. `localStorage`(`dk.signal.lang`) 저장값 → 없으면 `navigator.language`(zh 계열→zh, ja/en/ko) → 기본 `ko`.
- **실시간 테마 전환**: 헤더 우측 `다크 / 소프트` 버튼. 선택은 `localStorage`에 저장되고 첫 페인트 전에 적용됩니다.
- **탭 5개**: 홈 / 공식일정 / 영상 / 경기로그 / 기록실 (360~430px 모바일에서도 한 줄 유지)
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
- **🏆 이벤트 · D-DAY 스트립**: MY PICK 아래에 2026 LCK 어워드(12/16 치지직 롤파크 · D-19), 2027 LCK 컵(개막일 미발표 · 1월 중순 예상), 다음 선수 생일을 D-day 카드로 보여 줍니다. 지난 일정은 자동으로 사라지고, 날짜는 `data.js` 의 `EVENTS` 한 곳만 고치면 됩니다.
- **알림 설정**: 선수별 솔랭 알림(기본 도란만 ON), DK 공식 경기 알림(일정·시작), **선수 라이브 방송 알림**(기본 ON). 홈·공식일정 두 곳 동기화, 서버 구독 정보와 자동 연동.
  - **테스트 알림**은 현재 선수의 솔랭 알림 → 경기 알림 순서로 켜진 설정을 골라 실제 서비스워커 알림을 보냅니다.
- **한 줄 응원**: 선택 선수에게 응원 한 줄을 남기고 기기에 저장(최대 5줄, 삭제 가능)
- **솔로랭크 카드**: 티어/LP·시즌 전적·최근 경기 표(챔피언, 포지션, 승패, K/D/A, 시간)
- **경기로그 탭**: 승/패 필터
- **공식일정 탭**: NEXT 카드(자동 갱신·경기 알림 토글·영상 탭 링크), 최근 DK 공식 경기, **2027 시즌 캘린더**(LCK 컵 → First Stand: All In(중국) → LCK 정규 시즌 → MSI 2027(발렌시아) → 월즈 2027(나고야·수원·서울)), 선수별 최근 공식 경기
- **기록실 탭**: 2026 시즌 대회별 세트 전적, 월즈 결과
- **PWA**: manifest + 서비스 워커 오프라인 캐시(`/api/*` 는 캐시하지 않음), 푸시·알림 클릭·구독 갱신 핸들러, 로고 기반 아이콘

## 서버 함수 (`/api/*`)

| 경로 | 하는 일 |
| --- | --- |
| `GET /api/official` | DK 다음 경기 + 최근 결과 + 경기별 VOD 링크 (LoL Esports 공개 API, 90초 캐시 · `?lang=ko\|en\|ja\|zh`) |
| `GET /api/solo` | 5인 티어·LP·전적·인게임·최근 5경기 + `liveGames`(인게임 양 팀 챔피언·스펠·DK/프로) + `matchups`(같은 판 듀오·내전·프로) (Riot API, 45초 캐시) · 키 없으면 스냅샷 |
| `GET /api/live` | 5인 라이브 방송 상태 — 방제·썸네일·시청자 수·카테고리·시작 시각 포함(값이 없으면 키 생략) (SOOP station API · CHZZK live-status, 45초 캐시) |
| `GET /api/dk-youtube` | 디플러스 기아 공식 유튜브(@DplusKia_LOL) 최신 영상 10편 (채널 RSS, 10분 캐시 · 실패 시 마지막 확인본 스냅샷) |
| `GET /api/config` | 프론트가 쓰는 공개 상태값(푸시 공개키·저장소·솔로 소스·마지막 점검) |
| `POST /api/subscribe` | 기기 푸시 구독 + 알림 설정 저장 (`DELETE` 해지, `GET ?endpoint=` 확인) |
| `GET /api/check` | 주기 점검 — 새 랭크 게임 / 새 일정 / 시작 임박 / **새 인게임**(`dk:state.ingame` 으로 중복 방지, `?only=ingame`) 감지 후 푸시 (`?dry=1` 미리보기, `?test=1` 구독 기기로 테스트 푸시) |

```bash
BASE=https://dk-signal.vercel.app
curl -s $BASE/api/official | head -c 400
curl -s $BASE/api/solo | head -c 300
curl -s $BASE/api/config
curl -s $BASE/api/dk-youtube | head -c 400
curl -s "$BASE/api/check?dry=1&token=$CHECK_SECRET"
curl -s "$BASE/api/check?test=1&token=$CHECK_SECRET"   # 잠금화면 알림 확인
```

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

## 환경변수 (Vercel → Settings → Environment Variables)

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `RIOT_API_KEY` | 솔로랭크 실시간 | Riot 개발자 포털 키(`RGAPI-…`). 개발용 키는 **24시간마다 만료**됩니다. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 | `node tools/make_vapid.js` 로 생성. 공개키는 프론트가 `/api/config` 로 받습니다. |
| `VAPID_SUBJECT` | 선택 | 기본 `https://dk-signal.vercel.app` (mailto: 또는 https URL) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 웹 푸시 | Vercel Marketplace 에서 Upstash Redis(무료) 연결하면 자동 주입. 구독·마지막 상태 저장용. |
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
styles.css            듀얼 테마 토큰 + 컴포넌트 스타일 (+ 언어·영상·링크 UI)
i18n.js               KO·EN·JA·ZH 사전 + 날짜/요일 표기 + 언어 저장·전환
data.js               선수·경기·대회 기록 (2026-11-26) · 방송국 · 영상 아카이브 45편 + DK 공식 재생목록 6종(태그·챔피언 사전 포함) · 챔피언 이름 4개 언어
app.js                탭/선수·MY PICK·테마·알림·언어, 서버 실시간 연동·푸시 구독
sw.js                 서비스 워커 (캐시 v10 + 웹 푸시 + 구독 갱신)
api/_lib/ingame.js    Spectator-V5 → 양 팀 챔피언·스펠·DK/프로 참가자·배지 계산
api/_lib/pros.js      타 팀 프로 계정 표(21명) + PUUID 미리 받기(30일 캐시 · 못 찾으면 24시간 건너뜀)
api/_lib/matchups.js  끝난 경기 참가자 비교로 듀오/내전/프로 매치업 판정
api/_lib/champions.js Riot 숫자 id → 챔피언·스펠 영어 이름 (tools/make_riot_names.js 로 생성)
manifest.json         PWA 설정 (manifest.webmanifest 와 동일 내용)
api/official.js       DK 공식 일정
api/solo.js           솔로랭크
api/config.js         프론트용 공개 설정
api/subscribe.js      푸시 구독 저장/해지
api/check.js          주기 점검·푸시 발송 (공식 경기·솔랭·라이브 방송)
api/live.js           선수 라이브 방송 상태(SOOP·CHZZK)
api/_lib/             공식 일정·Riot·저장소·푸시·HTTP 유틸, 스냅샷(자동 생성)
vercel.json           Cron(하루 1회) · 함수 실행시간 · /api 캐시 금지 헤더
package.json          의존성(web-push)
tools/dev_server.js   로컬 서버(정적 + /api) · 픽스처 모드 · DK_LIVE_FAKE 라이브 배지 검증
tools/fixtures/       검증용 고정 일정(다음 경기 없음/있음)
tools/api_smoke.js    /api 함수 동작 검증(실 API·YouTube RSS 1회 + 가짜 Riot/Redis/SOOP/CHZZK)
tools/verify.py       390×844 브라우저 회귀 검증 87항목 + 스크린샷
tools/verify_v3.py    다국어·재생목록·영상 아카이브·인앱 플레이어·라이브 배지 검증 233항목 + 스크린샷(downloads/dk-signal-v3)
tools/smoke_v3.py     빠른 화면 점검(스크린샷 없음)
tools/make_champions.py  Riot Data Dragon → data.js 챔피언 이름 표 재생성
tools/verify_api.py   자동 갱신·실시간 반영·오프라인 검증 + 스크린샷
tools/make_snapshot.js data.js → api/_lib/snapshot.js
tools/make_vapid.js   VAPID 키 생성
tools/make_dk_youtube_snapshot.js  /api/dk-youtube 폴백 스냅샷 생성
tools/make_preview.py 단일 파일 프리뷰 빌드
tools/make_icons.py   아이콘 생성
tools/make_font.py    Pretendard 서브셋 생성
```

## 검증

```bash
python3 tools/verify_highlights.py          # 아카이브 45편 + 재생목록 6종 oEmbed 재생 확인
node tools/api_smoke.js                    # 서버 함수 89항목 (실제 LoL Esports API·YouTube RSS 1회 + 가짜 SOOP/CHZZK)

LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify.py       # 87/87
LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify_api.py   # 31/31
LD_LIBRARY_PATH=... python3 tools/verify_v3.py                                 # 233/233 (다국어·재생목록·아카이브·인앱 플레이어·라이브)
```

- `verify_highlights.py` 는 `data.js` 의 영상 45편과 재생목록 6종을 YouTube oEmbed 로 하나씩 확인하고, 챔피언 태그 정합성·한 줄 포인트 4개 국어·중복 ID 까지 봅니다(영상이 내려가면 여기서 먼저 걸립니다).
- `verify.py` 는 `tools/dev_server.js`(픽스처 `none`)를 직접 띄워 5탭, 5인 전환, 테마 저장, MY PICK, 알림 동기화, 테스트 푸시, 응원 저장, 콘솔 에러를 확인하고 `downloads/dk-radar/signal-*.png` 를 갱신합니다.
- `verify_api.py` 는 다음 경기가 공개된 픽스처로 NEXT 카드 자동 갱신, 미공개 시 2027 LCK 컵 fallback, 실시간 솔로랭크 응답의 티어·인게임·전적 반영, 서버 미연결 시 화면 유지를 확인합니다.
- `verify_v3.py` 는 KO/EN/JA/ZH 전환(탭·배너·타일·하이라이트·표·일정·기록·알림·응원·영상 탭), 새로고침 후 언어 유지, 브라우저 언어 자동 감지(en-US→EN, ja-JP→JA, zh-CN/zh-TW→ZH, 그 외→KO), 영상 탭 공식 채널 4곳·방송국 5인·재생목록 6종(카운트·썸네일·재생)·아카이브 45편(선수/종류/챔피언 필터·검색·해시태그·한국어 IME·썸네일·길이·연도)·인앱 플레이어(임베드 URL·닫기·소리 정지·배경 클릭)·디플러스 기아 공식 유튜브 10편(/api/dk-youtube)·VOD 링크, 라이브 배지(타일·MY PICK·영상 탭·방송국 카드·토글), 네 언어권에서의 가로 넘침, 콘솔 에러를 확인하고 `downloads/dk-signal-v3/*.png` 를 갱신합니다.
- 로컬에서 눈으로 보기: `node tools/dev_server.js` → http://127.0.0.1:8765
