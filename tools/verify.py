"""딮기 시그널 로컬 검증 + 스크린샷.

  python3 tools/verify.py

이 스크립트가 tools/dev_server.js (정적 파일 + /api/*) 를 8765 포트에 직접 띄우고,
390x844 모바일 뷰포트에서 4개 탭, 선수 전환, MY PICK 선택·고정·새로고침 유지,
테마 전환(다크/소프트), 선수별·경기 알림 토글, 테스트 푸시, 응원 저장, 자동 갱신 상태 표시를
확인하고 downloads/dk-radar/*.png 로 스크린샷을 남깁니다.

  - 이미 서버가 떠 있으면 그대로 씁니다(DK_VERIFY_SERVER=external).
  - 공식 일정은 DK_FIXTURE(기본 none)로 고정해서 씁니다.
"""
import asyncio
import json
import os
import pathlib
import shutil
import subprocess
import time
import urllib.request

from playwright.async_api import async_playwright

PORT = 8765
BASE = f"http://127.0.0.1:{PORT}/index.html"
OUT = pathlib.Path("/workspace/downloads/dk-radar")
ROOT = pathlib.Path(__file__).resolve().parent.parent
SETTLE = 450

results = []


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def start_server():
    if os.environ.get("DK_VERIFY_SERVER") == "external":
        return None
    env = dict(os.environ)
    env["PORT"] = str(PORT)
    env.setdefault("DK_FIXTURE", "none")
    env.setdefault("DK_ALLOW_MEMORY_STORE", "1")
    env["PATH"] = os.path.dirname(node_bin()) + os.pathsep + env.get("PATH", "")
    proc = subprocess.Popen([node_bin(), str(ROOT / "tools" / "dev_server.js")], env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(100):
        try:
            urllib.request.urlopen(BASE, timeout=1)
            print(f"dev server up on :{PORT} (fixture {env['DK_FIXTURE']})")
            return proc
        except Exception:
            time.sleep(0.15)
    out = b""
    try:
        proc.terminate()
        out = proc.stdout.read() if proc.stdout else b""
    except Exception:
        pass
    raise SystemExit("dev server did not start: " + out.decode(errors="replace"))


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = start_server()

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
        check("five tabs", await page.eval_on_selector_all(".tab", "e=>e.length") == 5)
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
        for tab, label in [("official", "공식일정"), ("video", "영상"), ("solo", "경기로그"), ("records", "기록실")]:
            await page.click(f'[data-tab="{tab}"]')
            await page.wait_for_timeout(SETTLE)
            visible = await page.is_visible(f"#panel-{tab}")
            title = await page.inner_text(f"#panel-{tab} .panel-title")
            check(f"tab {label}", visible and title == label, title)
            await page.screenshot(path=str(OUT / f"signal-{tab}-dark.png"))
        # ---- 영상 탭 디벨롭: LIVE NOW · 아카이브 100편+ · 찜 ----
        await page.click('[data-tab="video"]')
        await page.wait_for_timeout(SETTLE + 400)
        check("video live hero visible", await page.is_visible("#liveHero"))
        check("video live hero label", "LIVE NOW" in await page.inner_text("#liveHero"),
              (await page.inner_text("#liveHero"))[:60])
        check("video live hero body rendered",
              await page.eval_on_selector_all("#liveHero .lh-card, #liveHero .lh-offbar", "e=>e.length") == 1)
        count_text = await page.inner_text("#videoCount")
        check("video archive 100+", count_text.endswith("편") and int(count_text.replace("편", "")) >= 100, count_text)
        check("video saved chip", "★ 찜" in await page.inner_text("#videoCats"),
              await page.inner_text("#videoCats"))
        await page.click('[data-fav="FDos-nzB8HE"]')
        await page.wait_for_timeout(250)
        check("video fav stored locally",
              "FDos-nzB8HE" in (await page.evaluate("localStorage.getItem('dk.signal.favs')") or ""))
        await page.evaluate("localStorage.removeItem('dk.signal.favs')")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(SETTLE + 300)

        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(SETTLE)

        # ---- 공식일정: 2027 시즌 명칭·캘린더 ----
        await page.click('[data-tab="official"]')
        await page.wait_for_timeout(SETTLE)
        official = await page.inner_text("#panel-official")
        season_rows = await page.eval_on_selector_all(
            "#seasonPath .season-row", "e=>e.map(x=>x.innerText.replaceAll(String.fromCharCode(10),' | '))")
        check("next card uses 2027 LCK 컵",
              "2027 LCK 컵" in official and "2027 LCK 스프링" not in official, official.splitlines()[:4])
        check("season roadmap = 5 stages", len(season_rows) == 5, season_rows)
        check("roadmap official names",
              all(k in official for k in ["LCK 컵", "First Stand: All In", "LCK 정규 시즌", "MSI 2027", "월즈 2027"]))
        check("roadmap hosts",
              all(k in official for k in ["중국", "발렌시아", "나고야", "수원", "서울"]))
        check("no spring split promo", "LCK 스프링" not in await page.inner_text("body"))
        check("no old split labels", "Rounds" not in await page.inner_text("body"))
        await page.click('[data-tab="records"]')
        await page.wait_for_timeout(SETTLE)
        check("records relabeled to 정규 라운드",
              "LCK 2026 정규 1-2라운드" in await page.inner_text("#recordsList"),
              await page.inner_text("#recordsList"))
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
        live_on = await page.get_attribute("[data-live-toggle]", "aria-checked")
        check("initial alerts", summary.startswith("3개") and doran_on == "true" and kanavi_on == "false" and official_on == "true" and live_on == "true",
              f"{summary} doran={doran_on} kanavi={kanavi_on} official={official_on} live={live_on}")

        # 선수별 토글 + 저장
        await page.click('[data-solo-toggle="kanavi"]')
        await page.wait_for_timeout(200)
        check("kanavi alert on", await page.get_attribute('[data-solo-toggle="kanavi"]', "aria-checked") == "true",
              await page.evaluate("localStorage.getItem('dk.signal.solo.kanavi')"))
        check("summary counts 4", (await page.inner_text("#notifySummary")).startswith("4개"),
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
        if await page.get_attribute("[data-live-toggle]", "aria-checked") == "true":
            await page.click("[data-live-toggle]")
            await page.wait_for_timeout(150)
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
        await page.click("[data-live-toggle]")
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
              and await page.get_attribute('#panel-feed [data-official-toggle]', "aria-checked") == "true"
              and await page.get_attribute("[data-live-toggle]", "aria-checked") == "true")
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

        # ---- MY PICK 선택 · 최애 고정 ----
        await page.goto(BASE, wait_until="networkidle")
        await page.evaluate("localStorage.removeItem('dk.signal.mypick')")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(600)
        pick_text = await page.inner_text("#pickBanner")
        check("mypick default doran", "MY PICK · 오늘의 도란" in pick_text, pick_text.splitlines()[0])
        check("mypick chips = 5", await page.eval_on_selector_all("#pickBanner .psw", "e=>e.length") == 5)
        check("mypick pin pressed by default",
              await page.get_attribute("#pickBanner .pin-btn", "aria-pressed") == "true")
        check("mypick fav star on doran chip",
              await page.eval_on_selector_all("#pickBanner .psw.is-fav", "e=>e.map(x=>x.dataset.player)") == ["doran"])
        check("no horizontal overflow after mypick",
              await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
              await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
        check("pick banner content fits",
              await page.evaluate("""(()=>{const b=document.getElementById('pickBanner');const r=b.getBoundingClientRect();return [...b.children].every(el=>el.getBoundingClientRect().right<=r.right-1+1)})()"""),
              await page.evaluate("""(()=>{const b=document.getElementById('pickBanner');const r=b.getBoundingClientRect();return [...b.children].map(el=>[String(el.className),Math.round(el.getBoundingClientRect().right),Math.round(r.right)])})()"""))
        check("pick switch not scrollable",
              await page.evaluate("(()=>{const s=document.querySelector('.pick-switch');return s.scrollWidth<=s.clientWidth+1})()"),
              await page.evaluate("(()=>{const s=document.querySelector('.pick-switch');return [s.scrollWidth,s.clientWidth]})()"))

        # 배너 안 퀵 스위처로 카나비 보기 (아직 최애는 도란)
        await page.click('#pickBanner .psw[data-player="kanavi"]')
        await page.wait_for_timeout(280)
        pick_text = await page.inner_text("#pickBanner")
        check("chip selects kanavi", "미리보기 · 카나비" in pick_text, pick_text.splitlines()[0])
        check("browsing keeps saved mypick",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')") is None,
              await page.evaluate("localStorage.getItem('dk.signal.mypick')"))
        check("pin invites while browsing",
              await page.get_attribute("#pickBanner .pin-btn", "aria-pressed") == "false"
              and await page.is_visible("#pickBanner .pick-hint"))
        check("tile follows banner chip",
              await page.eval_on_selector_all(".tile.is-active", "e=>e.map(x=>x.dataset.player)") == ["kanavi"])
        check("banner player data switched", "서진혁" in await page.inner_text("#pickBanner"))
        await page.screenshot(path=str(OUT / "signal-mypick-browse-dark.png"))

        # 최애로 고정
        await page.click("#pickBanner .pin-btn")
        await page.wait_for_timeout(400)
        check("pin saves kanavi",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')") == "kanavi",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')"))
        check("pinned label", "MY PICK · 오늘의 카나비" in await page.inner_text("#pickBanner"))
        check("pin button on", await page.get_attribute("#pickBanner .pin-btn", "aria-pressed") == "true")
        check("pin toast shown",
              "show" in (await page.get_attribute("#appToast", "class") or "")
              and "고정했어요" in await page.inner_text("#appToast"),
              await page.inner_text("#appToast"))
        await page.screenshot(path=str(OUT / "signal-mypick-pinned-dark.png"))

        # 5인 보드 타일로 다른 선수 구경 후 그 선수를 고정
        await page.click('.tile[data-player="showmaker"]')
        await page.wait_for_timeout(280)
        check("tile browse shows preview", "미리보기 · 쇼메이커" in await page.inner_text("#pickBanner"))
        check("browsed tile shows pin invite", await page.is_visible("#pickBanner .pick-hint"))
        await page.click("#pickBanner .pin-btn")
        await page.wait_for_timeout(350)
        check("pin from tile browse",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')") == "showmaker",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')"))

        # 새로고침해도 저장된 최애가 첫 화면
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(600)
        check("mypick first screen after reload",
              "MY PICK · 오늘의 쇼메이커" in await page.inner_text("#pickBanner"),
              (await page.inner_text("#pickBanner")).splitlines()[0])
        check("mypick fav chip after reload",
              await page.eval_on_selector_all("#pickBanner .psw.is-fav", "e=>e.map(x=>x.dataset.player)") == ["showmaker"])
        check("mypick pin pressed after reload",
              await page.get_attribute("#pickBanner .pin-btn", "aria-pressed") == "true")
        check("mypick saved value after reload",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')") == "showmaker")
        await page.screenshot(path=str(OUT / "signal-mypick-reload-dark.png"))

        # 민트 테마에서도 같은 화면
        await page.click("#themeBtn")
        await page.wait_for_timeout(700)
        check("mypick in mint theme",
              await page.is_visible("#pickBanner .pick-switch .psw.is-active")
              and await page.is_visible("#pickBanner .pin-btn"))
        check("mypick mint no overflow",
              await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
        await page.screenshot(path=str(OUT / "signal-mypick-mint.png"))

        # 이미 최애인 선수의 별을 다시 누르면 안내만
        await page.click("#pickBanner .pin-btn")
        await page.wait_for_timeout(300)
        check("already pinned toast", "이미 내 최애" in await page.inner_text("#appToast"),
              await page.inner_text("#appToast"))
        check("already pinned keeps value",
              await page.evaluate("localStorage.getItem('dk.signal.mypick')") == "showmaker")

        # 알 수 없는 저장값은 기본값(도란)으로
        await page.evaluate("localStorage.setItem('dk.signal.mypick','nobody')")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(500)
        check("invalid mypick falls back to doran",
              "MY PICK · 오늘의 도란" in await page.inner_text("#pickBanner"))

        # 도란으로 되돌리고 다크 테마 기본 화면
        await page.evaluate("localStorage.setItem('dk.signal.mypick','doran')")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(500)
        check("doran pinned again", "MY PICK · 오늘의 도란" in await page.inner_text("#pickBanner"))
        check("theme persists across mypick reload",
              await page.get_attribute("html", "data-theme") == "mint")
        await page.click("#themeBtn")
        await page.wait_for_timeout(700)
        check("back to dark after mypick", await page.get_attribute("html", "data-theme") == "dark")
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / "signal-home-dark.png"))
        await page.screenshot(path=str(OUT / "signal-home-dark-full.png"), full_page=True)

        # 콘솔
        bad = [l for l in logs if l[0] in ("error", "pageerror")]
        check("no console errors", not bad, bad)

        await browser.close()

    if server:
        server.terminate()

    print("\n== summary ==")
    failed = [r for r in results if not r[1]]
    print(f"{len(results) - len(failed)}/{len(results)} passed")
    pathlib.Path("/workspace/tmp").mkdir(parents=True, exist_ok=True)
    json.dump([{"name": n, "ok": o, "detail": str(d)} for n, o, d in results],
              open("/workspace/tmp/dk-verify.json", "w"), ensure_ascii=False, indent=1)
    if failed:
        raise SystemExit(1)


asyncio.run(main())
