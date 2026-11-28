"""딮기 시그널 v3.13 검증 — 10개국어 언어 메뉴 · 번역 누락 · 가로 넘침.

  python3 tools/verify_lang10.py

- dev_server 를 8767 포트에 띄우고, 10개 언어 × 5개 탭 × (360·390·430) 에서
  가로 스크롤이 0건인지, 번역 키가 그대로 노출되지 않는지, 언어 메뉴(🌐 팝오버)가
  키보드·마우스로 제대로 동작하는지 확인합니다. 데스크톱(1440×900)도 같이 봅니다.
- 스크린샷: /workspace/downloads/dk-signal-v3/lang10-<code>-<width>.png
"""
import asyncio
import os
import pathlib
import re
import shutil
import subprocess
import time
import urllib.request

from playwright.async_api import async_playwright

PORT = 8767
BASE = f"http://127.0.0.1:{PORT}/index.html"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path("/workspace/downloads/dk-signal-v3")

LANGS = [("ko", "ko"), ("en", "en"), ("ja", "ja"), ("zh", "zh-CN"), ("tw", "zh-TW"),
         ("vi", "vi"), ("es", "es"), ("pt", "pt"), ("th", "th"), ("id", "id")]
CODES = [c for c, _ in LANGS]
TABS = ["feed", "official", "video", "solo", "records"]
WIDTHS = [360, 390, 430]
# 화면에 날 것의 번역 키가 새어 나오는지 보는 표본 (i18n 키는 전부 'aaa.bbb' 꼴)
RAW_KEY = re.compile(r"\b(?:tab|install|notify|video|solo|records|official|cal|mine|summary|pick|vote|"
                     r"lang|brand|theme|board|cheer|live|link|links|foot|ingame|mu|hl|event|result|time|"
                     r"roster|banner|day|tier|pos|app|nav)\.[a-zA-Z][a-zA-Z0-9]\b")

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
    out = proc.stdout.read() if proc.stdout else b""
    proc.terminate()
    raise RuntimeError("server failed: " + out.decode("utf-8", "replace")[:2000])


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


async def launch(p):
    chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
    opts = {"args": ["--force-color-profile=srgb", "--font-render-hinting=none",
                     "--disable-dev-shm-usage", "--disable-gpu"]}
    if chrome.exists():
        opts["executable_path"] = str(chrome)
    return await p.chromium.launch(**opts)


async def hide_vote_pop(ctx):
    """v3.12 첫 화면 투표 팝업이 검증을 가리지 않게 '오늘 하루 보지 않기'로 시작합니다."""
    await ctx.add_init_script("""
      try {
        var d = new Date();
        var t = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        localStorage.setItem('dk.signal.votePop.hide', t);
      } catch (e) {}
    """)


async def open_menu(page):
    if not await page.is_visible("#langPop"):
        await page.click("#langBtn")
        await page.wait_for_timeout(220)


async def pick(page, code):
    await open_menu(page)
    await page.click(f'#langPop [data-lang="{code}"]')
    await page.wait_for_timeout(420)


async def overflow(page):
    return await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = start_server()
    try:
        async with async_playwright() as p:
            browser = await launch(p)
            ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                            device_scale_factor=2, locale="ko-KR",
                                            permissions=["notifications"], color_scheme="dark")
            await hide_vote_pop(ctx)
            page = await ctx.new_page()
            logs = []
            page.on("console", lambda m: logs.append((m.type, m.text)))
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(900)

            # ---------- 1. 메뉴 자체 ----------
            check("trigger 하나만 (🌐 + 코드 + 화살표)",
                  await page.eval_on_selector_all("#langSwitch > *", "e=>e.length") == 1)
            check("처음엔 닫혀 있음", not await page.is_visible("#langPop"))
            await page.click("#langBtn")
            await page.wait_for_timeout(260)
            check("누르면 열림", await page.is_visible("#langPop"))
            items = await page.eval_on_selector_all("#langPop .lp-item", "e=>e.map(x=>[x.dataset.lang,x.innerText])")
            check("10개국어 항목", len(items) == 10, len(items))
            check("항목 코드 순서", [i[0] for i in items] == CODES, [i[0] for i in items])
            cols = await page.evaluate("getComputedStyle(document.querySelector('.lp-grid')).gridTemplateColumns.split(' ').length")
            check("2열 그리드", cols == 2, cols)
            check("현재 언어만 체크 표시",
                  await page.eval_on_selector_all("#langPop .lp-item.is-on", "e=>e.map(x=>x.dataset.lang)") == ["ko"])
            # 키보드: Esc 닫기, ↑↓ 이동
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(200)
            check("Esc 로 닫힘", not await page.is_visible("#langPop"))
            await page.focus("#langBtn")
            await page.keyboard.press("ArrowDown")
            await page.wait_for_timeout(200)
            focused = await page.evaluate("document.activeElement.dataset.lang || ''")
            check("ArrowDown 으로 열고 현재 항목 포커스", focused == "ko", focused)
            await page.keyboard.press("ArrowDown")
            await page.wait_for_timeout(120)
            focused2 = await page.evaluate("document.activeElement.dataset.lang || ''")
            check("ArrowDown 으로 다음 항목", focused2 == "en", focused2)
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(200)
            check("Esc 후 트리거로 포커스 복귀", await page.evaluate("document.activeElement.id") == "langBtn")
            # 바깥 클릭으로 닫기
            await page.click("#langBtn")
            await page.wait_for_timeout(200)
            await page.mouse.click(20, 700)
            await page.wait_for_timeout(220)
            check("바깥 클릭으로 닫힘", not await page.is_visible("#langPop"))
            # 좁은 화면(390)에서는 헤더 아래 시트
            await open_menu(page)
            sheet = await page.evaluate("document.querySelector('#langPop').classList.contains('is-sheet')")
            check("390px 은 시트 모드", sheet)
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(150)

            # ---------- 2. 10개국어 전환 ----------
            for code, html_lang in LANGS:
                await pick(page, code)
                check(f"{code} html lang {html_lang}", await page.get_attribute("html", "lang") == html_lang,
                      await page.get_attribute("html", "lang"))
                check(f"{code} 저장", await page.evaluate("localStorage.getItem('dk.signal.lang')") == code)
                code_label = await page.inner_text("#langBtn .ls-code")
                check(f"{code} 트리거 코드", code_label == code.upper(), code_label)
                check(f"{code} 메뉴 체크 이동",
                      await page.evaluate("document.querySelector('#langPop .lp-item.is-on')?.dataset.lang") == code)

            # ---------- 3. 언어 × 탭 × 폭 ----------
            for code, _ in LANGS:
                await pick(page, code)
                for w in WIDTHS:
                    await page.set_viewport_size({"width": w, "height": 844})
                    await page.wait_for_timeout(220)
                    for tab in TABS:
                        await page.click(f'[data-tab="{tab}"]')
                        await page.wait_for_timeout(320)
                        ov = await overflow(page)
                        check(f"{code} {tab} @{w} 가로 넘침 없음", ov <= 0, ov)
                        if tab in ("feed", "video"):
                            txt = await page.inner_text(f"#panel-{tab}")
                            hit = RAW_KEY.search(txt)
                            check(f"{code} {tab} @{w} 번역 키 노출 없음", hit is None, hit.group(0) if hit else "")
                    if code in ("th", "tw", "es"):
                        await page.screenshot(path=str(OUT / f"lang10-{code}-{w}.png"))
                await page.set_viewport_size({"width": 390, "height": 844})
                await page.wait_for_timeout(200)

            # ---------- 4. 언어별 대표 문구 (실제 번역이 들어갔는지) ----------
            expect = {
                "ko": "홈", "en": "Home", "ja": "ホーム", "zh": "首页", "tw": "首頁",
                "vi": "Trang chủ", "es": "Inicio", "pt": "Início", "th": "หน้าแรก", "id": "Beranda",
            }
            for code, want in expect.items():
                await pick(page, code)
                got = await page.inner_text('[data-tab="feed"] span')
                check(f"{code} 홈 탭 문구", got.strip() == want, got)
            # 챔피언 이름: 솔로랭크 표 첫 줄의 챔피언 칸이 언어별로 바뀌는지
            await pick(page, "tw")
            await page.click('[data-tab="solo"]')
            await page.wait_for_timeout(500)
            tw_champ = (await page.inner_text("#panel-solo .c-champ")).strip()
            check("tw 챔피언 이름 번체 한자", bool(re.search(r"[\u4e00-\u9fff]", tw_champ)), tw_champ)
            await pick(page, "ko")
            await page.click('[data-tab="solo"]')
            await page.wait_for_timeout(500)
            ko_champ = (await page.inner_text("#panel-solo .c-champ")).strip()
            check("ko 챔피언 이름 한글", bool(re.search(r"[가-힣]", ko_champ)), ko_champ)
            await pick(page, "en")
            await page.wait_for_timeout(400)
            en_champ = (await page.inner_text("#panel-solo .c-champ")).strip()
            check("en 챔피언 이름 라틴", bool(re.search(r"[A-Za-z]", en_champ)), en_champ)
            check("같은 경기 · 언어별 표기가 다름", len({tw_champ, ko_champ, en_champ}) >= 2, (tw_champ, ko_champ, en_champ))

            # ---------- 5. 데스크톱 ----------
            ctx2 = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1,
                                             locale="ko-KR", color_scheme="dark")
            await hide_vote_pop(ctx2)
            page2 = await ctx2.new_page()
            page2.on("console", lambda m: logs.append((m.type, m.text)))
            page2.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
            await page2.goto(BASE, wait_until="networkidle")
            await page2.wait_for_timeout(900)
            await page2.click("#langBtn")
            await page2.wait_for_timeout(320)
            check("데스크톱 팝오버는 시트 아님",
                  not await page2.evaluate("document.querySelector('#langPop').classList.contains('is-sheet')"))
            check("데스크톱 팝오버가 화면 안",
                  await page2.evaluate("(()=>{const r=document.querySelector('#langPop').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"))
            await page2.screenshot(path=str(OUT / "lang10-desktop-menu.png"))
            for code, _ in LANGS:
                await pick(page2, code)
                for tab in TABS:
                    await page2.click(f'[data-tab="{tab}"]')
                    await page2.wait_for_timeout(260)
                    ov = await overflow(page2)
                    check(f"desktop {code} {tab} 가로 넘침 없음", ov <= 0, ov)
            await pick(page2, "th")
            await page2.click('[data-tab="feed"]')
            await page2.wait_for_timeout(400)
            await page2.screenshot(path=str(OUT / "lang10-desktop-th.png"))
            await ctx2.close()

            errors = [l for l in logs if l[0] == "pageerror"]
            check("no page errors", not errors, errors[:3])
            skip = ("favicon", "Permissions policy violation")
            console_err = [l for l in logs if l[0] == "error" and not any(k in l[1] for k in skip)]
            check("no console errors", not console_err, console_err[:3])
            await browser.close()
    finally:
        server.terminate()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n== summary == {ok}/{len(results)} passed")
    fails = [r for r in results if not r[1]]
    if fails:
        print("\n실패 목록:")
        for name, _, detail in fails[:40]:
            print(" -", name, "::", detail)
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
