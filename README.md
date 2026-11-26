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
- **실시간 테마 전환**: 헤더 우측 `다크 / 소프트` 버튼. 선택은 `localStorage`에 저장되고 첫 페인트 전에 적용됩니다.
- **탭 4개**: 홈 / 공식일정 / 경기로그 / 기록실
- **5인 상태 보드**: 도란 · 카나비 · 쇼메이커 · 스매쉬 · 딜라이트 타일을 누르면 최애 포커스 배너·하이라이트·전적표가 함께 바뀝니다. 인게임이면 `인게임` 배지가 붙습니다(키 설정 시).
- **최애 포커스 배너 + MY PICK 고정**
  - 배너 안 **선수 퀵 스위처**(도란·카나비·쇼메이커·스매쉬·딜라이트 칩)로 바로 선수를 바꿔 볼 수 있습니다.
  - **★ 최애 고정** 버튼을 누르면 그 선수가 **내 최애(MY PICK)** 로 `localStorage`(`dk.signal.mypick`)에 저장됩니다.
  - 앱을 새로고침하거나 다시 열면 **저장된 MY PICK 선수가 첫 화면**에 뜨고, 기본값은 도란입니다.
  - 다른 선수를 구경하는 동안에는 배너가 `미리보기 · 카나비` 처럼 표시되고, 그 상태에서 별을 누르면 그 선수가 새 MY PICK이 됩니다.
- **최근 5경기 하이라이트**: 대형 W–L, 승률, KDA(합계·평균), 경기별 챔피언/KDA 카드
- **알림 설정**: 선수별 솔랭 알림(기본 도란만 ON), DK 공식 경기 알림(일정·시작). 홈·공식일정 두 곳 동기화, 서버 구독 정보와 자동 연동.
  - **테스트 알림**은 현재 선수의 솔랭 알림 → 경기 알림 순서로 켜진 설정을 골라 실제 서비스워커 알림을 보냅니다.
- **한 줄 응원**: 선택 선수에게 응원 한 줄을 남기고 기기에 저장(최대 5줄, 삭제 가능)
- **솔로랭크 카드**: 티어/LP·시즌 전적·최근 경기 표(챔피언, 포지션, 승패, K/D/A, 시간)
- **경기로그 탭**: 승/패 필터
- **공식일정 탭**: NEXT 카드(자동 갱신·경기 알림 토글), 최근 DK 공식 경기, **2027 시즌 캘린더**(LCK 컵 → First Stand: All In(중국) → LCK 정규 시즌 → MSI 2027(발렌시아) → 월즈 2027(나고야·수원·서울)), 선수별 최근 공식 경기
- **기록실 탭**: 2026 시즌 대회별 세트 전적, 월즈 결과
- **PWA**: manifest + 서비스 워커 오프라인 캐시(`/api/*` 는 캐시하지 않음), 푸시·알림 클릭·구독 갱신 핸들러, 로고 기반 아이콘

## 서버 함수 (`/api/*`)

| 경로 | 하는 일 |
| --- | --- |
| `GET /api/official` | DK 다음 경기 + 최근 결과 (LoL Esports 공개 API, 90초 캐시) |
| `GET /api/solo` | 5인 티어·LP·전적·인게임·최근 5경기 (Riot API, 45초 캐시) · 키 없으면 스냅샷 |
| `GET /api/config` | 프론트가 쓰는 공개 상태값(푸시 공개키·저장소·솔로 소스·마지막 점검) |
| `POST /api/subscribe` | 기기 푸시 구독 + 알림 설정 저장 (`DELETE` 해지, `GET ?endpoint=` 확인) |
| `GET /api/check` | 주기 점검 — 새 랭크 게임 / 새 일정 / 시작 임박 감지 후 푸시 (`?dry=1` 미리보기, `?test=1` 구독 기기로 테스트 푸시) |

```bash
BASE=https://dk-signal.vercel.app
curl -s $BASE/api/official | head -c 400
curl -s $BASE/api/solo | head -c 300
curl -s $BASE/api/config
curl -s "$BASE/api/check?dry=1&token=$CHECK_SECRET"
curl -s "$BASE/api/check?test=1&token=$CHECK_SECRET"   # 잠금화면 알림 확인
```

## 배포 상태 (2026-11-27 기준)

| 항목 | 상태 |
| --- | --- |
| 공식 경기 자동 수집 (`/api/official`) | **켜짐** — LoL Esports에서 실제 응답 확인 |
| 솔로랭크 실시간 (`/api/solo`) | **켜짐** — `RIOT_API_KEY`(개발용 키) 등록 → `source: "riot"`. 개발용 키는 발급 후 24시간마다 만료되므로 만료되면 스냅샷으로 자동 대체 |
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

2027 시즌 표기는 2025년부터 바뀐 LCK 체제(스프링·서머 스플릿 폐지, **LCK 컵 → 단일 정규 시즌**)를 따르고, 국제 대회 개최지는 **LoL e스포츠 2026-11-13 발표** 기준입니다.

## 파일

```
index.html            화면 뼈대 (테마 부트스트랩 포함)
styles.css            듀얼 테마 토큰 + 컴포넌트 스타일
data.js               선수·경기·대회 기록 (2026-11-26 스냅샷)
app.js                탭/선수·MY PICK·테마·알림, 서버 실시간 연동·푸시 구독
sw.js                 서비스 워커 (캐시 + 웹 푸시 + 구독 갱신)
manifest.json         PWA 설정 (manifest.webmanifest 와 동일 내용)
api/official.js       DK 공식 일정
api/solo.js           솔로랭크
api/config.js         프론트용 공개 설정
api/subscribe.js      푸시 구독 저장/해지
api/check.js          주기 점검·푸시 발송
api/_lib/             공식 일정·Riot·저장소·푸시·HTTP 유틸, 스냅샷(자동 생성)
vercel.json           Cron(하루 1회) · 함수 실행시간 · /api 캐시 금지 헤더
package.json          의존성(web-push)
tools/dev_server.js   로컬 서버(정적 + /api) · 픽스처 모드
tools/fixtures/       검증용 고정 일정(다음 경기 없음/있음)
tools/api_smoke.js    /api 함수 동작 검증(실 API 1회 + 가짜 Riot/Redis)
tools/verify.py       390×844 브라우저 회귀 검증 86항목 + 스크린샷
tools/verify_api.py   자동 갱신·실시간 반영·오프라인 검증 + 스크린샷
tools/make_snapshot.js data.js → api/_lib/snapshot.js
tools/make_vapid.js   VAPID 키 생성
tools/make_preview.py 단일 파일 프리뷰 빌드
tools/make_icons.py   아이콘 생성
tools/make_font.py    Pretendard 서브셋 생성
```

## 검증

```bash
node tools/api_smoke.js                    # 서버 함수 58항목 (실제 LoL Esports API 1회 포함)

LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify.py       # 86/86
LD_LIBRARY_PATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/verify_api.py   # 31/31
```

- `verify.py` 는 `tools/dev_server.js`(픽스처 `none`)를 직접 띄워 4탭, 5인 전환, 테마 저장, MY PICK, 알림 동기화, 테스트 푸시, 응원 저장, 콘솔 에러를 확인하고 `downloads/dk-radar/signal-*.png` 를 갱신합니다.
- `verify_api.py` 는 다음 경기가 공개된 픽스처로 NEXT 카드 자동 갱신, 미공개 시 2027 LCK 컵 fallback, 실시간 솔로랭크 응답의 티어·인게임·전적 반영, 서버 미연결 시 화면 유지를 확인합니다.
- 로컬에서 눈으로 보기: `node tools/dev_server.js` → http://127.0.0.1:8765
