# DK 웹앱 UI 시안 3종 (HTML 소스 + 스크린샷)

`work/dk-radar`(DK 레이더)와 **다른 방향의 모바일 UI 시안 3종**입니다.
배포 파일·GitHub 저장소(`schl410-hub/dk-radar`)는 건드리지 않았고, 이 폴더는 시안 원본만 담습니다.

- 뷰포트: **390 × 844** (모바일), 스크린샷은 3배 해상도 → 1170 × 2532 PNG
- 폰트: Pretendard Variable (`fonts/PretendardVariable.woff2`, 셀프호스트) → 한국어 깨짐 없음
- 로고: **디플러스 기아 공식 로고** (`logo/dpluskia.svg`, 출처 commons.wikimedia.org / dpluskia.gg)

| 시안 | 앱 이름 | 파일(HTML) | 스크린샷 |
|---|---|---|---|
| 1 | **MINT.GG** — 화이트 + 민트 `#00C49A` | `concept-1-white-mint.html` | `downloads/dk-radar/concept-1-white-mint.png` |
| 2 | **DK PING** — 딥 다크 + 네온 민트 `#00F5C4` | `concept-2-dark-mint.html` | `downloads/dk-radar/concept-2-dark-mint.png` |
| 3 | **MINT LOG** — 소프트 민트 글래스 | `concept-3-soft-glass.html` | `downloads/dk-radar/concept-3-soft-glass.png` |

## 공통 요소

- 상단 **DK 5인 로스터 보드**: 도란(최현준)·카나비(서진혁)·쇼메이커(허수)·스매쉬(신금재)·딜라이트(유환중)의 상태(인게임/대기/오프라인)와 최근 5경기 승패 표시
- 디플러스 기아 민트 기반 팔레트, 앱마다 다른 레이아웃 언어
- 하단 내비게이션 + 상태바 포함 실제 앱 화면 비율

## 다시 뽑는 방법

```bash
export TMPDIR=/workspace/tmp/pw PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers \
       LD_LIBRARY_PATH=/workspace/.libs/usr/lib/x86_64-linux-gnu
python3 work/dk-radar/concepts/_shot.py \
  work/dk-radar/concepts/concept-1-white-mint.html \
  downloads/dk-radar/concept-1-white-mint.png 3
```

(Chromium은 `python3 -m playwright install chromium` 으로 `PLAYWRIGHT_BROWSERS_PATH`에 설치)

## 데이터에 대해

- 전적·티어·LP·라이엇 ID: `work/dk-radar/data.js` 값(2026-11-26 KO.LOL·OP.GG·u.gg 확인분)을 그대로 사용
- **시안용 임시값**(실제 확인 아님): 인게임/대기 상태, 접속 표시, 피드 문구, "한 줄 응원" 참여 수, 알림 문구
- "다음 공식 경기 · 미정"은 Worlds 2026 8강 종료 후 일정 미발표 상태를 반영
