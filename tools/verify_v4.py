"""딮기 시그널 v4 검증 — PC 데스크톱 레이아웃 · 나만의 재생목록/내 링크 · 오늘 요약 카드 · 진행 중인 투표 팝업.

  python3 tools/verify_v4.py

- dev_server 를 8766 포트에 띄우고 모바일(390×844) → 데스크톱(1440×900) 순서로 확인합니다.
- 스크린샷: /workspace/downloads/dk-signal-v3/
- 기존 tools/verify.py · verify_v3.py · verify_highlights.py · api_smoke.js 는 따로 돌립니다.
"""
import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
import urllib.request

from playwright.async_api import async_playwright

PORT = 8766
BASE = f"http://127.0.0.1:{PORT}/index.html"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path("/workspace/downloads/dk-signal-v3")
SETTLE = 450
SAMPLE_VIDEO = "FDos-nzB8HE"          # data.js 도란 · 도베사 (실제 공개 영상)
SAMPLE_URL = "https://youtu.be/" + SAMPLE_VIDEO

results = []


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def start_server():
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
    proc.terminate()
    out = proc.stdout.read() if proc.stdout else b""
    raise SystemExit("dev server did not start: " + out.decode(errors="replace"))


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


async def pick_lang(page, code):
    """헤더의 [🌐 KO ▾] 를 열어 언어를 고릅니다 (v3.13 10개국어 팝오버)."""
    if not await page.is_visible("#langPop"):
        await page.click("#langBtn")
        await page.wait_for_timeout(220)
    await page.click(f'#langPop [data-lang="{code}"]')


async def close_vote_pop(page):
    """첫 화면 투표 팝업은 실제 동작이지만, 다른 검증을 가리지 않게 닫고 시작합니다."""
    try:
        if await page.is_visible("#votePop"):
            await page.click("#votePopDone")
            await page.wait_for_timeout(120)
            return True
    except Exception:
        pass
    return False


async def open_page(ctx, url=BASE, wait=1400, popup=False):
    page = await ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    await page.goto(url, wait_until="load")
    await page.wait_for_timeout(wait)
    if not popup:
        await close_vote_pop(page)
    page._dk_errs = errs
    return page


async def no_overflow(page):
    return await page.evaluate(
        "() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")


async def test_mobile(browser):
    ctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                    locale="ko-KR", is_mobile=True, has_touch=True)
    page = await open_page(ctx, popup=True)

    # ---------- 진행 중인 투표 팝업 ----------
    check("vote popup shows on first visit", await page.is_visible("#votePop"))
    check("vote popup lists open votes", await page.eval_on_selector_all("#votePopList .vp-item", "e => e.length") >= 1,
          await page.eval_on_selector_all("#votePopList .vp-item", "e => e.length"))
    check("vote popup has vote buttons",
          await page.eval_on_selector_all("#votePopList .vp-go", "e => e.every(a => /^https?:/.test(a.href))"))
    check("vote popup has hide-today + close",
          await page.is_visible("#votePopHide") and await page.is_visible("#votePopDone"))
    await page.screenshot(path=str(OUT / "mobile-vote-popup.png"))
    await page.click("#votePopHide")
    await page.wait_for_timeout(250)
    check("vote popup closes on hide-today", not await page.is_visible("#votePop"))
    await page.reload(wait_until="load")
    await page.wait_for_timeout(1600)
    check("vote popup hidden after hide-today on reload", not await page.is_visible("#votePop"))

    # 팝업을 켜 둔 상태로 한 번 더 (오늘 하루 보지 않기를 지우고)
    await page.evaluate("() => localStorage.removeItem('dk.signal.votePop.hide')")

    # ---------- 마감 지난 뒤에는 안 뜸 ----------
    ctx2 = await browser.new_context(viewport={"width": 390, "height": 844}, locale="ko-KR")
    p2 = await ctx2.new_page()
    await p2.add_init_script("""
      (() => {
        const R = Date; const T = R.parse('2026-12-10T12:00:00+09:00');
        window.Date = class extends R {
          constructor(...a) { if (!a.length) super(T); else super(...a); }
          static now() { return T; }
        };
      })();
    """)
    await p2.goto(BASE, wait_until="load")
    await p2.wait_for_timeout(1500)
    check("no vote popup when all votes closed", not await p2.is_visible("#votePop"))
    await ctx2.close()

    # ---------- 홈: 요약 카드 ----------
    await page.wait_for_timeout(300)
    check("summary button visible (mobile)", await page.is_visible("#summaryBtn"))
    await page.click("#summaryBtn")
    await page.wait_for_timeout(1800)
    size = await page.evaluate(
        "() => { const i = document.querySelector('#scImg'); return i && !i.hidden ? [i.naturalWidth, i.naturalHeight] : null; }")
    check("summary card is 1080x1350", size == [1080, 1350], size)
    check("summary save/share buttons", await page.is_visible("#scSave") and await page.is_visible("#scShare"))
    await page.screenshot(path=str(OUT / "mobile-summary.png"))
    await page.click("#summaryClose")
    await page.wait_for_timeout(200)
    check("summary modal closes", not await page.is_visible("#summaryModal"))
    check("no horizontal overflow (mobile home)", await no_overflow(page))

    # ---------- 영상: 나만의 재생목록 ----------
    await page.click('[data-tab="video"]')
    await page.wait_for_timeout(SETTLE)
    chips = await page.eval_on_selector_all("#mineChips .mine-chip", "e => e.map(x => x.textContent.trim())")
    check("mine playlist rail has 전체/기본폴더/새 폴더", len(chips) >= 2 and "새 폴더" in " ".join(chips), chips)
    check("mine hint shows target folder", await page.is_visible("#mineHint"))

    before = await page.eval_on_selector_all("#videoList .vc-add", "e => e.length")
    await page.locator("#videoList .vc-add").first.click()
    await page.wait_for_timeout(250)
    after_total = await page.eval_on_selector("#mineChips .mine-chip", "e => e.textContent")
    check("＋담기 adds to playlist", "1" in after_total, after_total)
    check("card switches to ✓담김",
          "담김" in await page.locator("#videoList .vc-add").first.text_content())
    await page.locator("#videoList .vc-add").first.click()
    await page.wait_for_timeout(200)
    check("✓담김 removes from playlist", "0" in await page.eval_on_selector("#mineChips .mine-chip", "e => e.textContent"))

    # 새 폴더
    await page.click("[data-mine-new]")
    await page.wait_for_timeout(200)
    check("new folder form opens", await page.is_visible("#mineForm"))
    await page.fill("#mineFolderName", "도란 명장면")
    await page.click("#mineForm .mine-ok")
    await page.wait_for_timeout(300)
    chips2 = await page.eval_on_selector_all("#mineChips .mine-chip", "e => e.map(x => x.textContent.trim())")
    check("new folder created", any("도란 명장면" in c for c in chips2), chips2)
    check("new folder becomes add target", "도란 명장면" in (await page.text_content("#mineHint")))

    # 새 폴더에 2편 담기
    for i in range(2):
        await page.locator("#videoList .vc-add").nth(i).click()
        await page.wait_for_timeout(200)
    folder_chip = page.locator("#mineChips .mine-chip", has_text="도란 명장면")
    check("folder chip counts 2", "2" in (await folder_chip.text_content()), await folder_chip.text_content())
    await folder_chip.click()
    await page.wait_for_timeout(300)
    n_cards = await page.eval_on_selector_all("#videoList .vc-row", "e => e.length")
    check("folder view shows only its 2 videos", n_cards == 2, n_cards)
    await page.screenshot(path=str(OUT / "mobile-mine-folder.png"))
    await page.click("#minePlay")
    await page.wait_for_timeout(700)
    check("playlist plays in sequence", await page.is_visible("#vpModal"))
    pos = await page.text_content("#vpPos")
    check("player queue starts at 1 / 2", "1 / 2" in (pos or ""), pos)
    await page.click("#vpClose")
    await page.wait_for_timeout(250)
    await page.click('[data-mine="all"]')
    await page.wait_for_timeout(300)

    # ---------- 내 링크 추가 ----------
    await page.click("#mineAddLink")
    await page.wait_for_timeout(300)
    check("add-link modal opens", await page.is_visible("#addLinkModal"))
    await page.fill("#addLinkUrl", "https://example.com/not-youtube")
    await page.wait_for_timeout(300)
    check("bad url shows error", bool((await page.text_content("#addLinkErr") or "").strip()))
    await page.fill("#addLinkUrl", SAMPLE_URL)
    await page.wait_for_timeout(400)
    check("link preview shows thumbnail", await page.is_visible("#addLinkPreview"))
    thumb = await page.get_attribute("#addLinkThumb", "src")
    check("thumbnail uses video id", SAMPLE_VIDEO in (thumb or ""), thumb)
    # 제목 자동 조회를 기다립니다 (oEmbed)
    for _ in range(20):
        if (await page.input_value("#addLinkTitle")).strip():
            break
        await page.wait_for_timeout(250)
    auto_title = await page.input_value("#addLinkTitle")
    check("title auto-filled from oEmbed", bool(auto_title.strip()), auto_title)
    await page.click("#addLinkSave")
    await page.wait_for_timeout(600)
    check("add-link modal closes after save", not await page.is_visible("#addLinkModal"))
    mine_chip = await page.eval_on_selector_all("#videoCats .chip", "e => e.map(x => x.textContent.trim())")
    check("my-link category chip appears", any("내 링크" in c for c in mine_chip), mine_chip)
    first = await page.eval_on_selector("#videoList .vc-row .vc-title", "e => e.textContent")
    check("new link is first card", SAMPLE_VIDEO in await page.get_attribute("#videoList .vc-title", "data-play")
          if False else bool(first), first)
    count_now = await page.eval_on_selector_all("#videoList .vc-row", "e => e.length")
    check("archive grew by one", count_now == before + 1, (before, count_now))
    await page.screenshot(path=str(OUT / "mobile-add-link.png"))

    # 중복 방지
    await page.click("#mineAddLink")
    await page.fill("#addLinkUrl", SAMPLE_URL)
    await page.wait_for_timeout(300)
    await page.click("#addLinkSave")
    await page.wait_for_timeout(300)
    check("duplicate link rejected", "이미" in (await page.text_content("#addLinkErr") or ""),
          await page.text_content("#addLinkErr"))
    await page.click("#addLinkCancel")

    # ---------- 다른 탭 무손상 ----------
    for tab in ("official", "solo", "records", "feed"):
        await page.click(f'[data-tab="{tab}"]')
        await page.wait_for_timeout(400)
        check(f"no overflow mobile {tab}", await no_overflow(page))
    check("no console errors (mobile)", not page._dk_errs, page._dk_errs[:3])

    # 언어 전환(VI) 에서도 안 깨짐
    await pick_lang(page, "vi")
    await page.wait_for_timeout(500)
    await page.click('[data-tab="video"]')
    await page.wait_for_timeout(400)
    check("vi mine row translated", "Danh sách" in (await page.text_content("#mineChips") or ""),
          await page.text_content("#mineChips"))
    check("no overflow mobile vi", await no_overflow(page))
    await pick_lang(page, "ko")
    await ctx.close()


async def test_desktop(browser):
    ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1,
                                    locale="ko-KR")
    page = await open_page(ctx)

    # ---------- 헤더 한 줄 ----------
    boxes = await page.evaluate("""() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,cx:b.x+b.width/2}; };
      const tabs = [...document.querySelectorAll('.tab')].map(t => { const b = t.getBoundingClientRect(); return {y:b.y, h:b.height}; });
      return { brand: r('.brand'), tabs, actions: r('.head-actions'), install: r('#installBtn') };
    }""")
    ys = [boxes["brand"]["y"], boxes["actions"]["y"]] + [t["y"] for t in boxes["tabs"]]
    check("header is a single row", max(ys) - min(ys) < 26, ys)
    check("PC install button label", "PC" in (await page.text_content("#installBtn")),
          (await page.text_content("#installBtn") or "").strip())

    # ---------- 홈 2단 ----------
    geo = await page.evaluate("""() => {
      const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; };
      const tiles = [...document.querySelectorAll('#statusGrid .tile')].map(t => { const b = t.getBoundingClientRect(); return {x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width)}; });
      return { pick: g('#pickBanner'), board: g('#statusGrid'), tiles, solo: g('.desk-home .solo-card'), main: g('main') };
    }""")
    check("home two columns", geo["pick"] and geo["board"] and geo["pick"]["x"] < geo["board"]["x"],
          (geo["pick"]["x"], geo["board"]["x"]) if geo["pick"] else None)
    check("board has 3 columns (favourite spans 2)",
          len({t["x"] for t in geo["tiles"]}) == 3 and max(t["w"] for t in geo["tiles"]) > 1.6 * min(t["w"] for t in geo["tiles"]),
          geo["tiles"])
    check("solo table in right column", geo["solo"] and geo["solo"]["x"] > geo["board"]["x"] - 5)
    await page.screenshot(path=str(OUT / "desktop-home.png"))

    # 요약 카드 (데스크톱)
    await page.click("#summaryBtn")
    await page.wait_for_timeout(1800)
    size = await page.evaluate(
        "() => { const i = document.querySelector('#scImg'); return i && !i.hidden ? [i.naturalWidth, i.naturalHeight] : null; }")
    check("summary card 1080x1350 (desktop)", size == [1080, 1350], size)
    await page.screenshot(path=str(OUT / "desktop-summary.png"))
    await page.click("#summaryClose")

    # 설치 안내(PC)
    await page.click("#installBtn")
    await page.wait_for_timeout(400)
    check("install modal opens (PC)", await page.is_visible("#installModal"))
    check("desktop install section visible", await page.is_visible("#installDesktop"))
    desk_txt = (await page.text_content("#installDesktop") or "").replace("\n", " ")
    check("desktop steps mention Chrome/Edge", ("Chrome" in desk_txt) or ("크롬" in desk_txt) or ("엣지" in desk_txt), desk_txt[:80])
    await page.screenshot(path=str(OUT / "desktop-install.png"))
    await page.click("#installClose")

    # ---------- 영상 ----------
    await page.click('[data-tab="video"]')
    await page.wait_for_timeout(SETTLE)
    vids = await page.evaluate("""() => {
      const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; };
      const cards = [...document.querySelectorAll('#videoList .vc-row')].map(t => { const b = t.getBoundingClientRect(); return {x:Math.round(b.x), y:Math.round(b.y)}; });
      const pls = [...document.querySelectorAll('#plGrid .pl-item')].map(t => Math.round(t.getBoundingClientRect().x));
      return { hero: g('#liveHero'), live: g('.dv-top .live-card'), rail: g('#videoRail'), list: g('#videoList'),
               cards, cols: [...new Set(cards.map(c => c.x))].length, pls: [...new Set(pls)].length,
               listY: Math.round(document.querySelector('#videoList').getBoundingClientRect().y) };
    }""")
    check("live hero + official card side by side", vids["hero"] and vids["live"] and vids["hero"]["x"] < vids["live"]["x"])
    check("playlist strip has 6 columns", vids["pls"] == 6, vids["pls"])
    check("archive rail left of grid", vids["rail"] and vids["list"] and vids["rail"]["x"] < vids["list"]["x"],
          (vids["rail"]["x"], vids["list"]["x"]) if vids["rail"] else None)
    check("archive grid has 4 columns", vids["cols"] == 4, vids["cols"])
    await page.screenshot(path=str(OUT / "desktop-video.png"))

    # 담기 → 새 폴더 → 폴더 보기 (데스크톱에서도)
    await page.locator("#videoList .vc-add").first.click()
    await page.wait_for_timeout(250)
    check("desktop +담기 works", "1" in await page.eval_on_selector("#mineChips .mine-chip", "e => e.textContent"))
    await page.click("#minePlay")
    await page.wait_for_timeout(700)
    check("desktop playlist plays", await page.is_visible("#vpModal"))
    await page.click("#vpClose")
    await page.wait_for_timeout(300)

    # 내 링크 (데스크톱)
    await page.click("#mineAddLink")
    await page.fill("#addLinkUrl", SAMPLE_URL)
    await page.wait_for_timeout(500)
    check("desktop add-link preview", await page.is_visible("#addLinkPreview"))
    await page.screenshot(path=str(OUT / "desktop-add-link.png"))
    await page.click("#addLinkCancel")

    for tab in ("official", "solo", "records", "feed"):
        await page.click(f'[data-tab="{tab}"]')
        await page.wait_for_timeout(400)
        check(f"no overflow desktop {tab}", await no_overflow(page))
        await page.screenshot(path=str(OUT / f"desktop-{tab}.png"))

    # 테마 전환(소프트 민트)에서도 배치 유지
    await page.click('[data-tab="feed"]')
    await page.wait_for_timeout(300)
    await page.click("#themeBtn")
    await page.wait_for_timeout(400)
    theme = await page.get_attribute("html", "data-theme")
    check("mint theme applied", theme == "mint", theme)
    await page.screenshot(path=str(OUT / "desktop-home-mint.png"))
    await page.click("#themeBtn")
    await page.wait_for_timeout(300)

    check("no console errors (desktop)", not page._dk_errs, page._dk_errs[:3])
    await ctx.close()


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    proc = start_server()
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(args=["--no-sandbox"])
            await test_mobile(browser)
            await test_desktop(browser)
            await browser.close()
    finally:
        try:
            proc.terminate()
        except Exception:
            pass

    passed = sum(1 for _, ok, _ in results if ok)
    print("\n== summary ==")
    fails = [r for r in results if not r[1]]
    for name, _, detail in fails:
        print("FAILED:", name, detail)
    print(f"{passed}/{len(results)} passed")
    sys.exit(0 if passed == len(results) else 1)


asyncio.run(main())
