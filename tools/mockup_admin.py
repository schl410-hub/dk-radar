"""관리자 앱 스크린샷 — 잠금 화면 + 대시보드 (모바일 세로 390x844).

  LD_LIBRARY_PATH=/workspace/.libs/usr/lib/x86_64-linux-gnu \\
  PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers python3 tools/mockup_admin.py

기본값은 실제 배포본(https://dk-signal.vercel.app/admin)을 그대로 찍습니다.
  BASE=http://127.0.0.1:8791 LOCAL=1   # 로컬 서버를 띄워 찍기
  PREFIX=admin-mint-                   # 파일 이름 앞부분 (기본 live-admin-)

※ 이 스크립트는 잠금을 풀고 화면만 찍습니다. 점검 실행·전체 알림 같은 동작은 절대 누르지 않습니다.
"""
import asyncio
import os
import pathlib

from playwright.async_api import async_playwright

OUT = pathlib.Path(os.environ.get("OUT_DIR") or "/workspace/downloads/dk-signal-v3")
PREFIX = os.environ.get("PREFIX", "live-admin-")
BASE = os.environ.get("BASE", "https://dk-signal.vercel.app")
SHOT_W, SHOT_H = 390, 844


async def main():
    OUT.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=[
            "--force-color-profile=srgb", "--font-render-hinting=none",
            "--disable-dev-shm-usage", "--disable-gpu",
        ])
        ctx = await browser.new_context(
            viewport={"width": SHOT_W, "height": SHOT_H},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            service_workers="block",
            color_scheme="dark",
        )
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE + "/admin", wait_until="domcontentloaded")
        await page.wait_for_timeout(1600)

        # 1) 잠금 화면
        await page.screenshot(path=str(OUT / (PREFIX + "lock.png")))
        print("lock:", OUT / (PREFIX + "lock.png"))

        # 2) PIN 1215 → 대시보드
        for d in "1215":
            await page.click(f'.key[data-key="{d}"]')
            await page.wait_for_timeout(90)
        await page.wait_for_selector("#dash:not([hidden])", timeout=10000)
        await page.wait_for_function(
            "() => { const el = document.getElementById('subTotal'); return el && el.textContent.trim() !== '–'; }",
            timeout=15000,
        )
        await page.wait_for_timeout(1400)

        await page.screenshot(path=str(OUT / (PREFIX + "dashboard.png")))
        await page.screenshot(path=str(OUT / (PREFIX + "dashboard-full.png")), full_page=True)
        print("dashboard:", OUT / (PREFIX + "dashboard.png"))
        print("dashboard-full:", OUT / (PREFIX + "dashboard-full.png"))

        # 보고용 요약
        summary = {}
        summary["total"] = (await page.text_content("#subTotal") or "").strip()
        summary["delta"] = (await page.text_content("#subDelta") or "").strip()
        summary["week_values"] = await page.locator("#dailyChart .c7-val").all_text_contents()
        summary["rank"] = [r.strip() for r in await page.locator("#rankList .rk-row").all_text_contents()][:5]
        summary["langs"] = [r.strip() for r in await page.locator("#langList li").all_text_contents()]
        summary["pushlog_rows"] = await page.locator("#pushLog .plog-row").count()
        summary["pushlog_empty"] = await page.is_visible("#pushLogEmpty")
        summary["banner_state"] = (await page.text_content("#bannerState") or "").strip()
        summary["version"] = (await page.text_content("#sysVersion") or "").strip()
        summary["sync"] = (await page.text_content("#syncLine") or "").strip()
        summary["height"] = await page.evaluate("() => document.documentElement.scrollHeight")
        summary["errors"] = errors[:5]
        print("SUMMARY " + repr(summary))

        # 3) 전체 알림 확인 팝업 (확인 버튼은 절대 누르지 않습니다 — Esc 로 닫음)
        if os.environ.get("SHOT_MODAL", "1") == "1":
            await page.fill("#pushTitle", "DK vs T1 · 오늘 22시")
            await page.fill("#pushBody", "경기 30분 전이에요. 놓치지 마세요!")
            await page.click("#broadcastBtn")
            await page.wait_for_selector("#confirmModal:not([hidden])", timeout=5000)
            await page.wait_for_timeout(350)
            await page.screenshot(path=str(OUT / (PREFIX + "broadcast-confirm.png")))
            print("modal:", OUT / (PREFIX + "broadcast-confirm.png"))
            print("modal text:", (await page.text_content("#confirmText") or "").strip())
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)
            print("modal closed without sending:", await page.is_hidden("#confirmModal"))

        await browser.close()


asyncio.run(main())
