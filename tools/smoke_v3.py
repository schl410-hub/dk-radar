"""로컬 스모크: 서버를 띄우고 화면을 열어 기본 동작·언어 전환·영상/방송국 링크를 확인합니다.
빠른 점검용(스크린샷 없음). 전체 검증은 tools/verify_v3.py.
"""
import asyncio
import os
import pathlib
import shutil
import subprocess
import time
import urllib.request

from playwright.async_api import async_playwright

PORT = 8777
BASE = f"http://127.0.0.1:{PORT}/index.html"
ROOT = pathlib.Path(__file__).resolve().parent.parent


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
    for _ in range(120):
        try:
            urllib.request.urlopen(BASE, timeout=1)
            return proc
        except Exception:
            time.sleep(0.2)
    out = proc.stdout.read() if proc.stdout else b""
    proc.terminate()
    raise RuntimeError("server failed: " + out.decode("utf-8", "replace")[:2000])


async def pick_lang(page, code):
    """헤더의 [🌐 KO ▾] 를 열어 언어를 고릅니다 (v3.13 10개국어 팝오버)."""
    if not await page.is_visible("#langPop"):
        await page.click("#langBtn")
        await page.wait_for_timeout(220)
    await page.click(f'#langPop [data-lang="{code}"]')


async def main():
    server = start_server()
    try:
        async with async_playwright() as p:
            chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
            launch = {"args": ["--force-color-profile=srgb"]}
            if chrome.exists():
                launch["executable_path"] = str(chrome)
            browser = await p.chromium.launch(**launch)
            ctx = await browser.new_context(viewport={"width": 390, "height": 844}, locale="ko-KR")
            # v3.12 투표 팝업이 탭 클릭을 가리지 않게 '오늘 하루 보지 않기' 상태로 시작합니다.
            await ctx.add_init_script("""
              try {
                var d = new Date();
                var t = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
                localStorage.setItem('dk.signal.votePop.hide', t);
              } catch (e) {}
            """)
            page = await ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" else None)
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(700)
            print("title:", await page.title())
            print("lang items:", await page.eval_on_selector_all("#langPop .lp-item", "e=>e.map(x=>x.textContent)"))
            print("pick:", (await page.inner_text("#pickBanner"))[:200].replace("\n", " | "))
            print("links:", await page.eval_on_selector_all("#pickBanner .link-chip", "e=>e.map(x=>x.textContent+'→'+x.href)"))
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(1200)
            print("videos:", await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.href)"))
            print("dk youtube:", await page.eval_on_selector_all("#dkYtGrid .dy-item", "e=>e.map(x=>x.href).slice(0,4)"))
            print("highlight count:", await page.inner_text("#videoCount"), "/", await page.inner_text("#dkYtCount"))
            await page.fill("#videoSearch", "펜타킬")
            await page.wait_for_timeout(350)
            print("search 펜타킬:", await page.inner_text("#videoCount"),
                  await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.getAttribute('data-video'))"))
            await page.click("#videoSearchClear")
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(400)
            print("watch:", await page.eval_on_selector_all("#nextWatch a", "e=>e.map(x=>x.textContent+'→'+x.href)"))
            print("recent rows:", await page.eval_on_selector_all("#officialRecent .path-row", "e=>e.length"))
            print("vid chips:", await page.eval_on_selector_all("#officialRecent .vid-chip", "e=>e.map(x=>x.textContent+'→'+x.href).slice(0,4)"))

            await pick_lang(page, "en")
            await page.wait_for_timeout(700)
            print("EN title:", await page.title())
            print("EN tabs:", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)"))
            print("EN pick:", (await page.inner_text("#pickBanner"))[:220].replace("\n", " | "))
            print("EN tiles:", (await page.inner_text("#statusGrid"))[:160].replace("\n", " | "))
            print("EN highlight:", (await page.inner_text("#highlightCard"))[:160].replace("\n", " | "))
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(1000)
            print("EN video:", (await page.inner_text("#panel-video"))[:200].replace("\n", " | "))
            print("EN dk youtube:", (await page.inner_text(".dy-card"))[:160].replace("\n", " | "))
            print("EN search:", (await page.inner_text(".video-card"))[:160].replace("\n", " | "))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(300)

            await pick_lang(page, "ja")
            await page.wait_for_timeout(600)
            print("JA tabs:", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)"))
            print("JA pick:", (await page.inner_text("#pickBanner"))[:200].replace("\n", " | "))

            # 새로고침 후 언어 유지
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(600)
            print("after reload lang:", await page.get_attribute("html", "lang"))

            # 다른 탭
            for tab in ["official", "solo", "records"]:
                await page.click(f'[data-tab="{tab}"]')
                await page.wait_for_timeout(500)
                print(tab, "visible:", await page.is_visible(f"#panel-{tab}"),
                      "|", (await page.inner_text(f"#panel-{tab} .panel-title")))
            print("errors:", errors[:5])
            await browser.close()
    finally:
        server.terminate()


asyncio.run(main())
