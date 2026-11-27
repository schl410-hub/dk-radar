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
            page = await ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" else None)
            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(700)
            print("title:", await page.title())
            print("lang buttons:", await page.eval_on_selector_all(".lang-btn", "e=>e.map(x=>x.textContent)"))
            print("pick:", (await page.inner_text("#pickBanner"))[:200].replace("\n", " | "))
            print("links:", await page.eval_on_selector_all("#pickBanner .link-chip", "e=>e.map(x=>x.textContent+'→'+x.href)"))
            print("videos:", await page.eval_on_selector_all("#videoCard .vc-item", "e=>e.map(x=>x.href)"))
            print("watch:", await page.eval_on_selector_all("#nextWatch a", "e=>e.map(x=>x.textContent+'→'+x.href)"))
            print("recent rows:", await page.eval_on_selector_all("#officialRecent .path-row", "e=>e.length"))
            print("vid chips:", await page.eval_on_selector_all("#officialRecent .vid-chip", "e=>e.map(x=>x.textContent+'→'+x.href).slice(0,4)"))

            await page.click('[data-lang="en"]')
            await page.wait_for_timeout(700)
            print("EN title:", await page.title())
            print("EN tabs:", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)"))
            print("EN pick:", (await page.inner_text("#pickBanner"))[:220].replace("\n", " | "))
            print("EN tiles:", (await page.inner_text("#statusGrid"))[:160].replace("\n", " | "))
            print("EN highlight:", (await page.inner_text("#highlightCard"))[:160].replace("\n", " | "))
            print("EN video:", (await page.inner_text("#videoCard"))[:200].replace("\n", " | "))

            await page.click('[data-lang="ja"]')
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
