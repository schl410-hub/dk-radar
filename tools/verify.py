"""딮기 시그널 로컬 검증 + 스크린샷.

  (python3 -m http.server 8765 &) ; python3 tools/verify.py

390x844 모바일 뷰포트에서 4개 탭, 선수 전환, 테마 전환(다크/소프트),
선수별·경기 알림 토글, 테스트 푸시, 응원 저장을 확인하고
downloads/dk-radar/*.png 로 스크린샷을 남깁니다.
"""
import asyncio
import json
import pathlib
import urllib.request

from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8765/index.html"
OUT = pathlib.Path("/workspace/downloads/dk-radar")
SETTLE = 450

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


async def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # 정적 자산 상태
    for path in ["index.html", "styles.css", "app.js", "data.js", "manifest.json",
                 "sw.js", "logo/dpluskia.svg", "icons/icon-192.png", "icons/icon-512.png",
                 "icons/icon-maskable-512.png", "icons/badge-96.png", "icons/favicon-32.png",
                 "icons/icon.svg", "fonts/pretendard-subset.woff2"]:
        code = urllib.request.urlopen("http://127.0.0.1:8765/" + path).status
        check("asset " + path, code == 200, code)

    async with async_playwright() as p:
        # headless shell 은 알림 권한을 항상 거부하므로 풀 Chromium(신형 headless)으로 실행합니다.
        chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
        launch = {"args": ["--force-color-profile=srgb", "--font-render-hinting=none"]}
        if chrome.exists():
            launch["executable_path"] = str(chrome)
        browser = await p.chromium.launch(**launch)
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=2,
            locale="ko-KR", permissions=["notifications"], color_scheme="dark")
        page = await ctx.new_page()
        logs = []
        page.on("console", lambda m: logs.append((m.type, m.text)))
        page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))

        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(600)

        check("default theme dark", await page.get_attribute("html", "data-theme") == "dark")
        check("four tabs", await page.eval_on_selector_all(".tab", "e=>e.length") == 4)
        check("five tiles", await page.eval_on_selector_all(".tile", "e=>e.length") == 5)
        check("no horizontal overflow",
              await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
              await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
        await page.screenshot(path=str(OUT / "signal-home-dark.png"))
        await page.screenshot(path=str(OUT / "signal-home-dark-full.png"), full_page=True)

        # ---- 선수 전환 ----
        for key, name in [("kanavi", "카나비"), ("showmaker", "쇼메이커"), ("smash", "스매쉬"),
                          ("delight", "딜라이트"), ("doran", "도란")]:
            await page.click(f'.tile[data-player="{key}"]')
            await page.wait_for_timeout(220)
            pick = await page.inner_text("#pickBanner")
            active = await page.eval_on_selector_all(".tile.is-active", "e=>e.map(x=>x.dataset.player)")
            check(f"select {name}", name in pick and active == [key], active)
        await page.click('.tile[data-player="kanavi"]')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / "signal-tile-kanavi-dark.png"))
        await page.click('.tile[data-player="doran"]')
        await page.wait_for_timeout(300)

        # ---- 탭 4개 ----
        for tab, label in [("official", "공식일정"), ("solo", "경기로그"), ("records", "기록실")]:
            await page.click(f'[data-tab="{tab}"]')
            await page.wait_for_timeout(SETTLE)
            visible = await page.is_visible(f"#panel-{tab}")
            title = await page.inner_text(f"#panel-{tab} .panel-title")
            check(f"tab {label}", visible and title == label, title)
            await page.screenshot(path=str(OUT / f"signal-{tab}-dark.png"))
        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(SETTLE)

        # ---- 필터 ----
        await page.click('[data-tab="solo"]')
        await page.wait_for_timeout(SETTLE)
        wins = await page.eval_on_selector_all("#soloTable2 tbody tr", "e=>e.length")
        await page.click('[data-filter="win"]')
        await page.wait_for_timeout(200)
        win_rows = await page.eval_on_selector_all("#soloTable2 tbody tr", "e=>e.length")
        loses_badges = await page.eval_on_selector_all("#soloTable2 .badge.lose", "e=>e.length")
        check("win filter", win_rows < wins and loses_badges == 0, f"{wins}->{win_rows}, lose badges {loses_badges}")
        await page.click('[data-filter="all"]')
        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(SETTLE)

        # ---- 알림 설정: 초기 상태 ----
        summary = await page.inner_text("#notifySummary")
        doran_on = await page.get_attribute('[data-solo-toggle="doran"]', "aria-checked")
        kanavi_on = await page.get_attribute('[data-solo-toggle="kanavi"]', "aria-checked")
        official_on = await page.get_attribute('#panel-feed [data-official-toggle]', "aria-checked")
        check("initial alerts", summary.startswith("2개") and doran_on == "true" and kanavi_on == "false" and official_on == "true",
              f"{summary} doran={doran_on} kanavi={kanavi_on} official={official_on}")

        # 선수별 토글 + 저장
        await page.click('[data-solo-toggle="kanavi"]')
        await page.wait_for_timeout(200)
        check("kanavi alert on", await page.get_attribute('[data-solo-toggle="kanavi"]', "aria-checked") == "true",
              await page.evaluate("localStorage.getItem('dk.signal.solo.kanavi')"))
        check("summary counts 3", (await page.inner_text("#notifySummary")).startswith("3개"),
              await page.inner_text("#notifySummary"))

        # 공식 경기 알림은 홈/공식일정 두 곳 동기화
        await page.click('#panel-feed [data-official-toggle]')
        await page.wait_for_timeout(200)
        official_home = await page.get_attribute('#panel-feed [data-official-toggle]', "aria-checked")
        official_tab = await page.get_attribute('#panel-official [data-official-toggle]', "aria-checked")
        check("official toggle synced off", official_home == "false" and official_tab == "false",
              f"{official_home}/{official_tab}")
        await page.click('[data-tab="official"]')
        await page.wait_for_timeout(SETTLE)
        await page.click('#panel-official [data-official-toggle]')
        await page.wait_for_timeout(200)
        check("official toggle from tab syncs home",
              await page.get_attribute('#panel-feed [data-official-toggle]', "aria-checked") == "true")
        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(SETTLE)

        # ---- 테스트 푸시 (서비스 워커 알림) ----
        sw_ready = await page.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)")
        check("service worker active", sw_ready)
        await page.click("#testBtn")
        await page.wait_for_timeout(900)
        note = await page.inner_text("#testNote")
        notes = await page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.getNotifications()).then(l=>l.map(n=>({title:n.title,body:n.body})))")
        check("test push shown", len(notes) > 0, notes)
        check("test note reports solo alert", "테스트" in note, note)
        await page.screenshot(path=str(OUT / "signal-notify-push.png"))
        await page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.getNotifications()).then(l=>l.forEach(n=>n.close()))")

        # 모든 알림 끄면 테스트가 막히는지
        for key in ["doran", "kanavi", "showmaker", "smash", "delight"]:
            if await page.get_attribute(f'[data-solo-toggle="{key}"]', "aria-checked") == "true":
                await page.click(f'[data-solo-toggle="{key}"]')
                await page.wait_for_timeout(120)
        await page.click('#panel-feed [data-official-toggle]')
        await page.wait_for_timeout(200)
        check("all alerts off", (await page.inner_text("#notifySummary")) == "모두 꺼짐",
              await page.inner_text("#notifySummary"))
        await page.click("#testBtn")
        await page.wait_for_timeout(500)
        check("blocked test when all off", "없어요" in (await page.inner_text("#testNote")),
              await page.inner_text("#testNote"))
        banner_visible = await page.is_visible("#pushBanner")
        check("fallback banner shown", banner_visible)
        if banner_visible:
            await page.screenshot(path=str(OUT / "signal-push-banner.png"))
            await page.click("#pbClose")
            await page.wait_for_timeout(300)

        # 다시 켜고 저장 확인
        await page.click('[data-solo-toggle="doran"]')
        await page.click('#panel-feed [data-official-toggle]')
        await page.wait_for_timeout(250)

        # ---- 한 줄 응원 ----
        await page.fill("#cheerInput", "오늘도 화이팅! 도란 🩵")
        await page.click(".cheer-send")
        await page.wait_for_timeout(250)
        cheer_count = await page.eval_on_selector_all("#cheerList .cheer-item", "e=>e.length")
        check("cheer added", cheer_count == 1, await page.inner_text("#cheerList"))
        await page.evaluate("(()=>{const el=document.querySelector('.notify-card'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 88)})()")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / "signal-notify-dark.png"))

        # ---- 테마 전환 + 저장 ----
        await page.evaluate("window.scrollTo(0, 0)")
        await page.click("#themeBtn")
        await page.wait_for_timeout(700)
        check("theme mint", await page.get_attribute("html", "data-theme") == "mint")
        check("theme saved", await page.evaluate("localStorage.getItem('dk.signal.theme')") == "mint")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / "signal-home-mint.png"))
        await page.screenshot(path=str(OUT / "signal-home-mint-full.png"), full_page=True)
        await page.click('[data-tab="solo"]')
        await page.wait_for_timeout(SETTLE)
        await page.screenshot(path=str(OUT / "signal-matchlog-mint.png"))
        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(SETTLE)

        # 새로고침 후 유지 (테마 + 알림 + 응원)
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(600)
        check("theme persists after reload", await page.get_attribute("html", "data-theme") == "mint")
        check("alerts persist after reload",
              await page.get_attribute('[data-solo-toggle="doran"]', "aria-checked") == "true"
              and await page.get_attribute('#panel-feed [data-official-toggle]', "aria-checked") == "true")
        check("cheer persists after reload",
              await page.eval_on_selector_all("#cheerList .cheer-item", "e=>e.length") == 1)
        await page.evaluate("(()=>{const el=document.querySelector('.notify-card'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 88)})()")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / "signal-notify-mint.png"))
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(200)

        # 다크로 되돌리기 (기본값)
        await page.click("#themeBtn")
        await page.wait_for_timeout(600)
        check("back to dark", await page.get_attribute("html", "data-theme") == "dark")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(400)
        check("dark persists", await page.get_attribute("html", "data-theme") == "dark")

        # 딥링크
        await page.goto(BASE + "?tab=records", wait_until="networkidle")
        await page.wait_for_timeout(400)
        check("deep link tab", await page.is_visible("#panel-records"))

        # 콘솔
        bad = [l for l in logs if l[0] in ("error", "pageerror")]
        check("no console errors", not bad, bad)

        await browser.close()

    print("\n== summary ==")
    failed = [r for r in results if not r[1]]
    print(f"{len(results) - len(failed)}/{len(results)} passed")
    json.dump([{"name": n, "ok": o, "detail": str(d)} for n, o, d in results],
              open("/workspace/tmp/dk-verify.json", "w"), ensure_ascii=False, indent=1)
    if failed:
        raise SystemExit(1)


asyncio.run(main())
