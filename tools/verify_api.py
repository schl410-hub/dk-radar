"""자동 갱신 연동 검증 — /api/* 가 붙은 화면이 실제로 바뀌는지 확인.

  python3 tools/verify_api.py

이 스크립트가 tools/dev_server.js 를 고정 픽스처로 띄워
  1) 다음 경기가 공개된 경우 NEXT 카드가 자동으로 바뀌는지 (fixture next)
  2) 공개 전이면 2027 LCK 컵 안내로 남는지 (fixture none)
  3) /api/solo 실시간 응답을 화면이 티어·인게임·전적에 반영하는지 (응답 가로채기)
  4) 서버에 못 붙어도 화면이 살아 있는지
를 확인하고 downloads/dk-radar/signal-official-auto.png 등을 남깁니다.
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

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path("/workspace/downloads/dk-radar")
NODE = os.environ.get("NODE_BIN") or ("/workspace/.node/bin/node" if pathlib.Path("/workspace/.node/bin/node").exists() else (shutil.which("node") or "node"))

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


def start(fixture, port):
    env = dict(os.environ)
    env["PORT"] = str(port)
    env["DK_FIXTURE"] = fixture
    env["DK_ALLOW_MEMORY_STORE"] = "1"
    env["PATH"] = os.path.dirname(NODE) + os.pathsep + env.get("PATH", "")
    proc = subprocess.Popen([NODE, str(ROOT / "tools" / "dev_server.js")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(120):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=1)
            return proc
        except Exception:
            time.sleep(0.15)
    proc.terminate()
    raise SystemExit(f"dev server (fixture {fixture}) did not start")


SOLO_FIXTURE = {
    "ok": True,
    "source": "riot",
    "status": "live",
    "message": "Riot API에서 실시간으로 받아온 전적이에요.",
    "fetchedAt": "2026-11-26T22:40:00+09:00",
    "serverTime": "2026-11-26T22:40:00+09:00",
    "players": [
        {"key": "doran", "nameKo": "도란", "riotId": "어리고싶다#KR1", "status": "ok",
         "tier": "챌린저", "lp": "1,204 LP", "record": "812승 668패 · 승률 55%", "inGame": False,
         "matches": [
             {"matchId": "KR_9", "d": "11.26.", "t": "22:31", "champ": "크산테", "role": "탑", "win": True,
              "kda": "6/1/11", "dur": "27:14", "perfect": False},
             {"matchId": "KR_8", "d": "11.26.", "t": "21:02", "champ": "레넥톤", "role": "탑", "win": False,
              "kda": "5/9/0", "dur": "21:12", "perfect": False}
         ]},
        {"key": "kanavi", "nameKo": "카나비", "riotId": "vinaka#KR1", "status": "ok",
         "tier": "마스터", "lp": "612 LP", "record": "350승 274패 · 승률 56%", "inGame": True, "matches": []},
        {"key": "showmaker", "nameKo": "쇼메이커", "riotId": "DK ShowMaker#KR1", "status": "ok",
         "tier": "마스터", "lp": "381 LP", "record": "375승 308패 · 승률 55%", "inGame": False, "matches": []},
        {"key": "smash", "nameKo": "스매쉬", "riotId": "DK Smash#KR7", "status": "ok",
         "tier": "마스터", "lp": "489 LP", "record": "458승 409패 · 승률 53%", "inGame": False, "matches": []},
        {"key": "delight", "nameKo": "딜라이트", "riotId": "플레이리스트겨울#KR1", "status": "ok",
         "tier": "마스터", "lp": "873 LP", "record": "439승 381패 · 승률 54%", "inGame": False, "matches": []}
    ]
}


async def open_page(ctx, port):
    page = await ctx.new_page()
    logs = []
    page.on("console", lambda m: logs.append((m.type, m.text)))
    page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
    await page.goto(f"http://127.0.0.1:{port}/index.html", wait_until="networkidle")
    await page.wait_for_timeout(700)
    return page, logs


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
    launch = {"args": ["--force-color-profile=srgb", "--font-render-hinting=none",
                        "--disable-dev-shm-usage", "--disable-gpu"]}
    if chrome.exists():
        launch["executable_path"] = str(chrome)

    next_srv = start("next", 8766)
    none_srv = start("none", 8767)

    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch)
        ctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                        locale="ko-KR", permissions=["notifications"], color_scheme="dark")

        # ---------- 1) 다음 경기가 공개된 경우 ----------
        page, logs = await open_page(ctx, 8766)
        await page.click('[data-tab="official"]')
        await page.wait_for_timeout(600)

        next_date = await page.inner_text("#nextDate")
        next_body = await page.inner_text("#nextBody")
        next_sync = await page.inner_text("#nextSync")
        check("next date = 12. 3. (목) 17:00", next_date == "12. 3. (목) 17:00", next_date)
        check("next title DK vs BLG", "DK" in next_body and "BLG" in next_body, next_body.splitlines()[:2])
        check("next sub tournament/round/bo", all(k in next_body for k in ["LCK", "1라운드", "Bo5"]), next_body)
        check("next teams shows opponent", "BLG" in await page.inner_text("#nextBody .next-teams"),
              await page.inner_text("#nextBody .next-teams"))
        check("next sync shows fetched clock", "LoL Esports에서" in next_sync and "확인" in next_sync, next_sync)
        check("next sync says auto refresh", "다음 경기가 잡히면" in next_sync, next_sync)
        check("live chip visible", await page.is_visible("#officialChip"))
        recent_rows = await page.eval_on_selector_all("#officialRecent .path-row", "e=>e.map(x=>x.innerText)")
        check("official recent rows (auto)", len(recent_rows) >= 4, len(recent_rows))
        check("official recent first row BLG 0:3", "BLG" in recent_rows[0] and "0 : 3" in recent_rows[0], recent_rows[0])
        check("official recent note auto", "받아온 결과" in await page.inner_text("#officialRecentNote"),
              await page.inner_text("#officialRecentNote"))
        check("next card in default tab state not stale", "2027 LCK 컵" not in next_date, next_date)
        no_overflow = await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
        check("no overflow with next card", no_overflow)
        await page.screenshot(path=str(OUT / "signal-official-auto.png"))
        await page.click('[data-tab="feed"]')
        await page.wait_for_timeout(400)
        live_chip = await page.is_visible("#liveChip")
        check("home live chip visible", live_chip)
        await page.screenshot(path=str(OUT / "signal-home-live.png"))
        errs = [l for l in logs if l[0] == "pageerror"]
        check("no page errors (next fixture)", not errs, errs)
        await page.close()

        # ---------- 2) 다음 경기 미공개 ----------
        page, logs = await open_page(ctx, 8767)
        await page.click('[data-tab="official"]')
        await page.wait_for_timeout(600)
        check("fallback date 2027 LCK 컵", await page.inner_text("#nextDate") == "2027 LCK 컵",
              await page.inner_text("#nextDate"))
        body = await page.inner_text("#nextBody")
        check("fallback keeps LCK 컵 guide", "LCK 컵" in body and "TBD" in body, body.splitlines()[:2])
        check("fallback explains not announced", "아직 올라오지 않았어요" in body, body)
        check("fallback sync note", "다음 경기 공개 전" in await page.inner_text("#nextSync"),
              await page.inner_text("#nextSync"))
        await page.screenshot(path=str(OUT / "signal-official-dark.png"))
        await page.close()

        # ---------- 3) 실시간 솔로랭크 응답 반영 ----------
        page, logs = await open_page(ctx, 8767)
        await page.route("**/api/solo*", lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps(SOLO_FIXTURE, ensure_ascii=False)))
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(900)
        tier_row = await page.inner_text("#tierRow")
        check("solo tier merged into card", "챌린저" in tier_row and "1,204 LP" in tier_row, tier_row)
        tile = await page.inner_text('.tile[data-player="doran"]')
        check("solo tier merged into tile", "챌린저" in tile, tile.replace("\n", " | "))
        meta = await page.inner_text("#soloMeta")
        check("solo meta marks realtime", "Riot API 실시간" in meta, meta)
        check("solo live line shows message", "실시간으로 받아온" in await page.inner_text("#soloLive"),
              await page.inner_text("#soloLive"))
        table = await page.inner_text("#soloTable")
        check("solo table shows new match", "크산테" in table and "6/1/11" in table, table.splitlines()[:3])
        ingame = await page.eval_on_selector_all(".tile .t-live", "e=>e.length")
        check("in-game badge on kanavi", ingame == 1, ingame)
        check("in-game badge text", "인게임" in await page.inner_text('.tile[data-player="kanavi"]'),
              await page.inner_text('.tile[data-player="kanavi"]'))
        await page.click('[data-tab="solo"]')
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT / "signal-solo-live.png"))
        errs = [l for l in logs if l[0] == "pageerror"]
        check("no page errors (solo merge)", not errs, errs)
        await page.close()

        # ---------- 4) 서버에 못 붙는 경우 ----------
        page = await ctx.new_page()
        logs = []
        page.on("pageerror", lambda e: logs.append(str(e)))
        await page.route("**/api/**", lambda route: route.abort())
        await page.goto("http://127.0.0.1:8767/index.html", wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        check("offline keeps 5 tiles", await page.eval_on_selector_all(".tile", "e=>e.length") == 5)
        check("offline keeps snapshot tier", "다이아" in await page.inner_text('.tile[data-player="doran"]'),
              await page.inner_text('.tile[data-player="doran"]'))
        sync = await page.inner_text("#nextSync") if await page.is_visible("#panel-official") else ""
        await page.click('[data-tab="official"]')
        await page.wait_for_timeout(400)
        check("offline explains connection", "연결하지 못했어요" in await page.inner_text("#nextSync"),
              await page.inner_text("#nextSync"))
        check("offline keeps fallback card", "2027 LCK 컵" in await page.inner_text("#nextDate"))
        check("offline no page error", not logs, logs)
        await page.close()

        await browser.close()

    next_srv.terminate()
    none_srv.terminate()

    print("\n== summary ==")
    failed = [r for r in results if not r[1]]
    print(f"{len(results) - len(failed)}/{len(results)} passed")
    pathlib.Path("/workspace/tmp").mkdir(parents=True, exist_ok=True)
    json.dump([{"name": n, "ok": o, "detail": str(d)} for n, o, d in results],
              open("/workspace/tmp/dk-verify-api.json", "w"), ensure_ascii=False, indent=1)
    if failed:
        raise SystemExit(1)


asyncio.run(main())
