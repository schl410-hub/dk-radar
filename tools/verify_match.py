"""딮기 시그널 v3.14 검증 — 경기로그 '공식 경기'(진영·밴픽·K/D/A·딜 비중) · 세트별 요약 카드.

  python3 tools/verify_match.py

- tools/fixtures/match-detail.json (실제 LoL Esports + Leaguepedia 응답을 저장한 것)을
  dev_server 가 /api/match 로 돌려주게 하고(DK_MATCH_FIXTURE=1), /api/official 은
  화면 시나리오(오늘 경기 없음 / 오늘 경기 전 / 오늘 경기 결과)에 맞춰 바꿔 끼웁니다.
- 확인하는 것
  1) 경기로그 탭의 `솔로랭크 | 공식 경기` 전환 · 최근 경기 목록 · 스코어 바
  2) 세트 탭(승/패 · 블루/레드 진영) · 양 팀 밴 5:5 · DK 5인 K/D/A·딜 비중
  3) 데스크톱 2열(경기 목록·밴 | 세트·5인 스탯) · 팀 오브젝트 요약
  4) 캘린더의 공식 경기 → 경기로그 공식 경기로 바로 이동
  5) 요약 카드: 경기 전(MATCH DAY) / 경기 결과(1·2·3세트 선택 저장) 1080×1350
  6) 10개국어 문구(번역 키 노출 0건) · 좁은 화면 가로 넘침 0건
- 스크린샷: /workspace/downloads/dk-signal-v3/match-*.png
"""
import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import time
import urllib.request
import datetime

from playwright.async_api import async_playwright

PORT = 8769
BASE = f"http://127.0.0.1:{PORT}/index.html"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path("/workspace/downloads/dk-signal-v3")
FIXTURE = ROOT / "tools" / "fixtures" / "match-detail.json"

CODES = ["ko", "en", "ja", "zh", "tw", "vi", "es", "pt", "th", "id"]
WIDTHS = [360, 390, 430]
RAW_KEY = re.compile(r"\b(?:mt|summary|cal|tab|solo|official|foot|pos)\.[a-zA-Z][a-zA-Z0-9]\b")

results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f" :: {detail}" if detail else ""))


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def start_server():
    env = dict(os.environ)
    env["PORT"] = str(PORT)
    env.setdefault("DK_FIXTURE", "none")
    env.setdefault("DK_MATCH_FIXTURE", "1")
    env.setdefault("DK_ALLOW_MEMORY_STORE", "1")
    env.setdefault("DK_LIVE_FAKE", "1")
    env.setdefault("DK_INGAME_FAKE", "1")
    env["PATH"] = os.path.dirname(node_bin()) + os.pathsep + env.get("PATH", "")
    proc = subprocess.Popen([node_bin(), str(ROOT / "tools" / "dev_server.js")], env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(140):
        try:
            urllib.request.urlopen(BASE, timeout=1)
            print(f"dev server up on :{PORT}")
            return proc
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("dev server did not start")


async def launch(p):
    chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
    args = ["--force-color-profile=srgb", "--font-render-hinting=none",
            "--disable-dev-shm-usage", "--disable-gpu"]
    kwargs = {"args": args}
    if chrome.exists():
        kwargs["executable_path"] = str(chrome)
    return await p.chromium.launch(**kwargs)


async def hide_vote_pop(ctx):
    await ctx.add_init_script("""
      try {
        var d = new Date();
        var t = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        localStorage.setItem('dk.signal.votePop.hide', t);
      } catch (e) {}
    """)


def today_iso(hour=17):
    d = datetime.datetime.now()
    return d.strftime("%Y-%m-%d") + f"T{hour:02d}:00:00+09:00", d


def official_body(mode, detail):
    """화면 시나리오별 /api/official 응답 (실제 응답 모양 그대로)."""
    now = datetime.datetime.now()
    base = {
        "ok": True, "source": "lolesports", "status": "scheduled",
        "fetchedAt": now.isoformat() + "Z", "note": "",
        "next": None, "upcoming": [], "recent": []
    }
    entry = {
        "id": detail["id"], "state": "completed", "type": "match",
        "startTime": detail["startIso"], "startIso": detail["startIso"],
        "date": detail["date"], "dateLabel": detail["date"], "dayLabel": detail["date"],
        "time": detail["time"], "weekday": detail["weekday"], "epoch": 0,
        "relative": "", "league": detail["league"], "block": detail["block"],
        "bo": detail["bo"], "score": detail["score"], "win": detail["win"],
        "dk": detail["dk"], "opponent": detail["opponent"], "streams": 0
    }
    iso, d = today_iso()
    if mode == "result":
        entry = json.loads(json.dumps(entry))
        entry.update({"startIso": iso, "date": d.strftime("%Y.%m.%d"), "time": "17:00",
                      "weekday": ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]})
        base["recent"] = [entry]
        base["status"] = "no_upcoming"
        base["note"] = "다음 공식 경기가 아직 공개되지 않았어요"
    elif mode == "matchday":
        nxt = json.loads(json.dumps(entry))
        nxt.update({"state": "unstarted", "startIso": iso, "date": d.strftime("%Y.%m.%d"),
                    "time": "17:00", "score": "", "win": None, "block": "1라운드", "bo": 3,
                    "weekday": ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]})
        base["next"] = nxt
        base["upcoming"] = [nxt]
    else:
        old = json.loads(json.dumps(entry))
        old.update({"startIso": "2026-11-06T07:00:00+09:00", "date": "2026.11.06", "time": "07:00"})
        base["recent"] = [old]
        base["status"] = "no_upcoming"
    return base


async def route_official(ctx, body):
    payload = json.dumps(body)
    await ctx.route("**/api/official*", lambda route: route.fulfill(
        status=200, content_type="application/json; charset=utf-8", body=payload))


async def open_official(page):
    await page.click('[data-tab="solo"]')
    await page.wait_for_timeout(250)
    await page.click('[data-match-view="official"]')
    await page.wait_for_timeout(900)


async def overflow(page):
    return await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")


async def pick_lang(page, code):
    await page.click("#langBtn")
    await page.wait_for_timeout(200)
    await page.click(f'#langPop [data-lang="{code}"]')
    await page.wait_for_timeout(400)


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    detail = json.loads(FIXTURE.read_text(encoding="utf-8"))
    server = start_server()
    try:
        async with async_playwright() as p:
            browser = await launch(p)
            ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                            device_scale_factor=2, locale="ko-KR",
                                            permissions=["notifications"], color_scheme="dark")
            await hide_vote_pop(ctx)
            await route_official(ctx, official_body("plain", detail))
            page = await ctx.new_page()
            logs = []
            page.on("console", lambda m: logs.append((m.type, m.text)))
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(900)

            # ---------- 1. 솔로랭크 | 공식 경기 전환 ----------
            await page.click('[data-tab="solo"]')
            await page.wait_for_timeout(300)
            check("경기로그에 2단 전환 있음", await page.is_visible("#matchSwitch"))
            check("처음엔 솔로랭크", await page.is_visible("#soloPane") and not await page.is_visible("#officialPane"))
            await page.click('[data-match-view="official"]')
            await page.wait_for_timeout(1200)
            check("공식 경기 패널 열림", await page.is_visible("#officialPane"))
            check("솔로랭크 패널 숨김", not await page.is_visible("#soloPane"))
            check("전환 상태 저장", await page.evaluate("localStorage.getItem('dk.signal.matchView')") == "official")
            check("패널 설명이 공식 경기용",
                  "밴픽" in await page.inner_text("#soloPanelMeta"), await page.inner_text("#soloPanelMeta"))

            # ---------- 2. 목록 · 스코어 바 ----------
            cards = await page.eval_on_selector_all(".om-mc", "e=>e.length")
            check("최근 공식 경기 카드", cards >= 1, cards)
            check("선택 카드 강조", await page.eval_on_selector_all(".om-mc.is-on", "e=>e.length") == 1)
            bar = await page.inner_text(".om-bar")
            check("스코어 바에 DK·상대·스코어", "DK" in bar and ":" in bar, bar.replace("\n", " "))
            check("스코어 바 캡션에 라운드·BO", "BO" in bar, bar.replace("\n", " "))

            # ---------- 3. 세트 탭 · 진영 ----------
            sets = await page.eval_on_selector_all(".om-set", "e=>e.length")
            check("세트 탭 3개", sets == len(detail["sets"]), sets)
            set_txt = await page.eval_on_selector_all(".om-set", "e=>e.map(x=>x.innerText)")
            check("세트 승/패 표시", all(("승" in t or "패" in t) for t in set_txt), set_txt)
            check("블루/레드 진영 배지", all(("블루" in t or "레드" in t) for t in set_txt), set_txt)
            check("기본 선택은 마지막 세트",
                  await page.eval_on_selector_all(".om-set.is-on", "e=>e.length") == 1)

            # ---------- 4. 밴 5:5 ----------
            bans = await page.eval_on_selector_all(".om-ban em", "e=>e.map(x=>x.innerText)")
            check("양 팀 밴 10개", len(bans) == 10, bans)
            check("밴 아이콘 10개", await page.eval_on_selector_all(".om-ban-img", "e=>e.length") == 10)
            check("밴 사선 표시", await page.eval_on_selector_all(".om-ban .om-sl", "e=>e.length") == 10)
            check("밴 출처 표기", "Leaguepedia" in await page.inner_text(".om-ban-card"),
                  await page.inner_text(".om-ban-card"))

            # ---------- 5. DK 5인 스탯 ----------
            rows = await page.eval_on_selector_all(".om-row", "e=>e.length")
            check("5인 행", rows == 5, rows)
            row_txt = await page.eval_on_selector_all(".om-row", "e=>e.map(x=>x.innerText.replace(/\\n/g,' '))")
            check("챔피언·포지션", all("·" in t for t in row_txt), row_txt[0])
            check("K/D/A", await page.eval_on_selector_all(".om-kda", "e=>e.length") == 5)
            share = await page.eval_on_selector_all(".om-dmg b", "e=>e.map(x=>x.innerText)")
            check("팀 내 딜 비중 %", all("%" in s for s in share), share)
            check("딜 비중 바", await page.eval_on_selector_all(".om-dbar i", "e=>e.length") == 5)
            check("선수 이름 (MY PICK 포함)",
                  any("쇼메이커" in t for t in row_txt) and any("스매쉬" in t for t in row_txt), row_txt[:2])
            check("소스 표기", "LoL Esports" in await page.inner_text(".om-src-foot"),
                  await page.inner_text(".om-src-foot"))

            # ---------- 6. 세트를 바꾸면 밴·스탯이 바뀐다 ----------
            first_bans = await page.eval_on_selector_all(".om-ban em", "e=>e.map(x=>x.innerText)")
            await page.click('[data-om-set="1"]')
            await page.wait_for_timeout(400)
            second_bans = await page.eval_on_selector_all(".om-ban em", "e=>e.map(x=>x.innerText)")
            check("세트를 바꾸면 밴이 바뀐다", first_bans != second_bans, (first_bans[:2], second_bans[:2]))
            check("세트 탭 선택 이동",
                  await page.eval_on_selector('[data-om-set="1"]', "e=>e.getAttribute('aria-selected')") == "true")
            check("세트 기준 문구", "1세트" in await page.inner_text(".om-board-hd"),
                  await page.inner_text(".om-board-hd"))

            # ---------- 7. 경기 선택 ----------
            if cards >= 2:
                other = await page.eval_on_selector_all(".om-mc", "e=>e.map(x=>x.dataset.omMatch)")
                await page.click(f'[data-om-match="{other[1]}"]')
                await page.wait_for_timeout(700)
                check("다른 경기 선택", other[1] == await page.evaluate("localStorage.getItem('dk.signal.matchId')"))
                await page.click(f'[data-om-match="{other[0]}"]')
                await page.wait_for_timeout(700)

            # ---------- 8. 좁은 화면 가로 넘침 ----------
            for w in WIDTHS:
                await page.set_viewport_size({"width": w, "height": 844})
                await page.wait_for_timeout(280)
                ov = await overflow(page)
                check(f"공식 경기 @{w} 가로 넘침 없음", ov <= 0, ov)

            await page.set_viewport_size({"width": 390, "height": 844})
            await page.wait_for_timeout(200)
            await page.screenshot(path=str(OUT / "match-official-mobile.png"))
            await page.screenshot(path=str(OUT / "match-official-mobile-full.png"), full_page=True)

            # ---------- 9. 10개국어 ----------
            for code in CODES:
                await pick_lang(page, code)
                await page.wait_for_timeout(250)
                txt = await page.inner_text("#panel-solo")
                hit = RAW_KEY.search(txt)
                check(f"{code} 번역 키 노출 없음", hit is None, hit.group(0) if hit else "")
                ov = await overflow(page)
                check(f"{code} 공식 경기 넘침 없음", ov <= 0, ov)
            await pick_lang(page, "ko")
            await page.wait_for_timeout(250)
            check("ko 로 돌아옴", "공식 경기" in await page.inner_text("#matchSwitch"))

            # ---------- 10. 캘린더 → 경기로그 ----------
            await page.click('[data-tab="official"]')
            await page.wait_for_timeout(400)
            await page.click('[data-official-view="list"]')
            await page.wait_for_timeout(400)
            list_btn = page.locator("#officialRecent [data-om-open]").first
            check("리스트의 최근 경기에 '밴픽 보기'", await list_btn.count() > 0)
            if await list_btn.count():
                await list_btn.click()
                await page.wait_for_timeout(800)
                check("리스트에서 경기로그 공식 경기로 이동", await page.is_visible("#officialPane"))
                await page.click('[data-tab="official"]')
                await page.wait_for_timeout(400)
            await page.click('[data-official-view="calendar"]')
            await page.wait_for_timeout(400)
            # 픽스처 경기(2026.11.06)가 있는 날을 골라 연다 (필요하면 달을 거슬러 올라간다)
            day = "2026-11-06"
            for _ in range(4):
                if await page.locator(f'#calGrid [data-cal-day="{day}"]').count():
                    break
                await page.click("#calPrev")
                await page.wait_for_timeout(320)
            cell = page.locator(f'#calGrid [data-cal-day="{day}"]').first
            check("캘린더에 그 날짜 칸", await cell.count() > 0)
            await cell.click()
            await page.wait_for_timeout(400)
            day_btn = page.locator("#calDayList [data-om-open]").first
            check("캘린더 날짜 모달에 '밴픽 보기'", await day_btn.count() > 0 and await day_btn.is_visible(),
                  await page.eval_on_selector_all("#calDayList [data-om-open]", "e=>e.length"))
            if await day_btn.count() and await day_btn.is_visible():
                await page.screenshot(path=str(OUT / "match-calendar-link.png"))
                await day_btn.click()
                await page.wait_for_timeout(900)
                check("캘린더에서 공식 경기로 이동", await page.is_visible("#officialPane"))
                check("경기로그 탭 활성", await page.evaluate("document.querySelector('[data-tab=solo]').classList.contains('is-active')"))
            await ctx.close()

            # ---------- 11. 데스크톱 2열 ----------
            ctx = await browser.new_context(viewport={"width": 1440, "height": 900},
                                            locale="ko-KR", color_scheme="dark")
            await hide_vote_pop(ctx)
            await route_official(ctx, official_body("plain", detail))
            page = await ctx.new_page()
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(900)
            await open_official(page)
            cols = await page.evaluate("""() => {
              const a = document.querySelector('.om-col-a'), b = document.querySelector('.om-col-b');
              if (!a || !b) return null;
              const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
              return { leftOf: ra.right <= rb.left + 2, top: Math.abs(ra.top - rb.top) < 40 };
            }""")
            check("데스크톱 2열 (왼쪽 목록 / 오른쪽 세트·스탯)", bool(cols and cols["leftOf"] and cols["top"]), cols)
            check("데스크톱 팀 오브젝트 요약", await page.is_visible(".om-strip"),
                  await page.eval_on_selector_all(".om-cell", "e=>e.map(x=>x.innerText.replace(/\\n/g,' '))"))
            row_text = await page.inner_text(".om-row")
            check("데스크톱 킬관여·CS/골드", "킬관여" in row_text and "CS" in row_text, row_text.replace("\n", " "))
            await page.screenshot(path=str(OUT / "match-official-desktop.png"))
            await ctx.close()

            # ---------- 12. 요약 카드: 경기 결과(세트 선택) ----------
            ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                            device_scale_factor=2, locale="ko-KR", color_scheme="dark")
            await hide_vote_pop(ctx)
            await route_official(ctx, official_body("result", detail))
            page = await ctx.new_page()
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.click("#summaryBtn")
            await page.wait_for_timeout(2200)
            buttons = await page.eval_on_selector_all(".sc-set", "e=>e.map(x=>x.innerText.replace(/\\n/g,' '))")
            check("세트 선택 버튼 3개", len(buttons) == 3, buttons)
            size = await page.eval_on_selector("#scImg", "e=>[e.naturalWidth, e.naturalHeight]")
            check("결과 카드 1080×1350", size == [1080, 1350], size)
            check("세트 선택 안내 문구", "세트" in await page.inner_text("#scNote"), await page.inner_text("#scNote"))
            await page.click('[data-sc-set="1"]')
            await page.wait_for_timeout(1200)
            check("2세트 카드로 교체 (선택 표시)",
                  await page.eval_on_selector('[data-sc-set="1"]', "e=>e.classList.contains('is-on')"))
            await page.screenshot(path=str(OUT / "match-summary-set2.png"))
            url = await page.eval_on_selector("#scImg", "e=>e.src")
            data_url = url
            import base64
            (OUT / "match-summary-set2-card.png").write_bytes(base64.b64decode(data_url.split(",", 1)[1]))
            await page.click("#summaryClose")
            await page.wait_for_timeout(300)
            check("요약 카드 닫힘", not await page.is_visible("#summaryModal"))
            await ctx.close()

            # ---------- 13. 요약 카드: 경기 전 (MATCH DAY) ----------
            ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                            device_scale_factor=2, locale="ko-KR", color_scheme="dark")
            await hide_vote_pop(ctx)
            await route_official(ctx, official_body("matchday", detail))
            page = await ctx.new_page()
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.click("#summaryBtn")
            await page.wait_for_timeout(2200)
            check("경기 전엔 세트 선택 없음", not await page.is_visible(".sc-set"))
            size = await page.eval_on_selector("#scImg", "e=>[e.naturalWidth, e.naturalHeight]")
            check("경기 전 카드 1080×1350", size == [1080, 1350], size)
            await page.screenshot(path=str(OUT / "match-summary-matchday.png"))
            url = await page.eval_on_selector("#scImg", "e=>e.src")
            import base64
            (OUT / "match-summary-matchday-card.png").write_bytes(base64.b64decode(url.split(",", 1)[1]))
            await ctx.close()

            # ---------- 14. 요약 카드: 경기 없는 날 (기존 5인 카드 유지) ----------
            ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                            device_scale_factor=2, locale="ko-KR", color_scheme="dark")
            await hide_vote_pop(ctx)
            await route_official(ctx, official_body("plain", detail))
            page = await ctx.new_page()
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(900)
            await page.click("#summaryBtn")
            await page.wait_for_timeout(2200)
            check("경기 없는 날엔 세트 선택 없음", not await page.is_visible(".sc-set"))
            size = await page.eval_on_selector("#scImg", "e=>[e.naturalWidth, e.naturalHeight]")
            check("5인 요약 카드 1080×1350 유지", size == [1080, 1350], size)
            await ctx.close()

            # ---------- 15. 콘솔 오류 ----------
            errs = [l for l in logs if l[0] in ("error", "pageerror")]
            check("콘솔 오류 없음", not errs, errs[:4])
            await browser.close()
    finally:
        server.terminate()

    ok = sum(1 for r in results if r)
    print(f"\n== match == {ok}/{len(results)} passed")
    bad = [i for i, r in enumerate(results) if not r]
    if bad:
        print("failed items:", bad)
        raise SystemExit(1)


asyncio.run(main())
