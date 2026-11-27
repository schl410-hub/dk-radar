"""딮기 시그널 v3 검증 — 다국어(KO/EN/JA/ZH) · 영상 탭 · 방송국 링크 · 기존 기능 회귀.

  python3 tools/verify_v3.py

dev_server 를 8765 포트에 띄우고 390x844 모바일 뷰포트에서 확인합니다.
스크린샷은 /workspace/downloads/dk-signal-v3 에 남깁니다.
"""
import asyncio
import pathlib
import shutil
import subprocess
import time
import urllib.request
import os

from playwright.async_api import async_playwright

PORT = 8765
BASE = f"http://127.0.0.1:{PORT}/index.html"
OUT = pathlib.Path("/workspace/downloads/dk-signal-v3")
ROOT = pathlib.Path(__file__).resolve().parent.parent
SETTLE = 450

results = []

# 확인된 공식 채널 (2026-11-27)
LCK_CHZZK = "https://chzzk.naver.com/9381e7d6816e6d915a44a13c0195b202"
LCK_SOOP = "https://ch.sooplive.co.kr/aflol"
LCK_YT = "https://www.youtube.com/@LCK"
DK_YT = "https://www.youtube.com/@DplusKia_LOL"

PLAYER_STREAMS = {
    "doran": ["https://ch.sooplive.co.kr/choi15778", "https://chzzk.naver.com/20e11539e1afa21fc959dd3f4ff2332c"],
    "kanavi": ["https://chzzk.naver.com/e351edbd85f1ebf4eb975c21179a4c43"],
    "showmaker": ["https://ch.sooplive.co.kr/showmakerr", "https://chzzk.naver.com/07a040b24eb497dc36c31d82bc06ccc2"],
    "smash": ["https://ch.sooplive.co.kr/tlsrmawo", "https://chzzk.naver.com/44aa27b0df5175323fac934acdff1ed5"],
    "delight": ["https://chzzk.naver.com/59dd654778e3d0b64f3ed06baece805d"],
}

PLAYER_VIDEOS = {
    "doran": ["uzkulCX1cvw", "zmt-dT7garg"],
    "kanavi": ["Ws93_VsEx-s", "fOUtkqYy1VE"],
    "showmaker": ["FG8VNBFemDg", "SqKdQydiZKs"],
    "smash": ["uxnXy7SFMsY", "BxU5zVPnMiU"],
    "delight": ["COviyhL_fxc", "OT-19WY8HFI"],
}


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


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


async def launch(p):
    chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
    opts = {"args": ["--force-color-profile=srgb", "--font-render-hinting=none"]}
    if chrome.exists():
        opts["executable_path"] = str(chrome)
    return await p.chromium.launch(**opts)


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = start_server()
    try:
        async with async_playwright() as p:
            browser = await launch(p)
            ctx = await browser.new_context(
                viewport={"width": 390, "height": 844}, device_scale_factor=2,
                locale="ko-KR", permissions=["notifications"], color_scheme="dark")
            page = await ctx.new_page()
            logs = []
            page.on("console", lambda m: logs.append((m.type, m.text)))
            page.on("pageerror", lambda e: logs.append(("pageerror", str(e))))

            # ---------- 정적 자산 ----------
            for path in ["index.html", "styles.css", "i18n.js", "data.js", "app.js", "sw.js"]:
                code = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/{path}").status
                check("asset " + path, code == 200, code)

            await page.goto(BASE, wait_until="networkidle")
            await page.wait_for_timeout(900)

            # ---------- KO 기준선 ----------
            check("default lang ko", await page.get_attribute("html", "lang") == "ko")
            check("brand = 딮기 시그널", await page.inner_text(".brand-sub") == "딮기 시그널", await page.inner_text(".brand-sub"))
            check("five tabs", await page.eval_on_selector_all(".tab", "e=>e.length") == 5)
            check("five tiles", await page.eval_on_selector_all(".tile", "e=>e.length") == 5)
            check("ko tabs", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)") ==
                  ["홈", "공식일정", "영상", "경기로그", "기록실"])
            check("no horizontal overflow (ko)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))

            # ---------- 선수별 방송국·전적 링크 ----------
            for key, expect in PLAYER_STREAMS.items():
                await page.click(f'.tile[data-player="{key}"]')
                await page.wait_for_timeout(260)
                hrefs = await page.eval_on_selector_all("#pickBanner .pick-links a", "e=>e.map(x=>x.href)")
                got = [h for h in hrefs if "op.gg" not in h and "u.gg" not in h]
                check(f"{key} stream links", got == expect, got)

            # ---------- 영상 탭: 생중계 · 방송국 · 하이라이트 10편 ----------
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(600)
            check("video panel visible", await page.is_visible("#panel-video"))
            check("video panel title", await page.inner_text("#panel-video .panel-title") == "영상")
            chan = await page.eval_on_selector_all("#videoChannels .chan", "e=>e.map(x=>x.href)")
            check("video official channels", chan == [LCK_CHZZK, LCK_SOOP, LCK_YT, DK_YT], chan)
            check("video dk youtube ghost button",
                  await page.get_attribute("#videoMore", "href") == DK_YT)
            st_rows = await page.eval_on_selector_all("#videoStations .st-row", "e=>e.length")
            check("video stations = 5", st_rows == 5, st_rows)
            chips = await page.eval_on_selector_all("#videoFilters .chip", "e=>e.map(x=>x.textContent)")
            check("video filter chips", chips == ["전체", "도란", "카나비", "쇼메이커", "스매쉬", "딜라이트"], chips)
            total_items = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length")
            check("video highlights = 10", total_items == 10, total_items)
            all_hrefs = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.href)")
            want_all = []
            for key in ["doran", "kanavi", "showmaker", "smash", "delight"]:
                want_all += [f"https://www.youtube.com/watch?v={i}" for i in PLAYER_VIDEOS[key]]
            check("video highlights order (all)", all_hrefs == want_all, all_hrefs[:3])
            for key, ids in PLAYER_VIDEOS.items():
                await page.click(f'#videoFilters [data-video-filter="{key}"]')
                await page.wait_for_timeout(220)
                hrefs = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.href)")
                want = [f"https://www.youtube.com/watch?v={i}" for i in ids]
                check(f"{key} highlight filter", hrefs == want, hrefs)
                thumbs = await page.eval_on_selector_all(
                    "#videoList .vc-thumb img", "e=>e.map(x=>[x.complete, x.naturalWidth])")
                check(f"{key} highlight thumbs render", thumbs and all(w > 0 for _, w in thumbs), thumbs)
                lens = await page.eval_on_selector_all("#videoList .vc-len", "e=>e.map(x=>x.textContent)")
                check(f"{key} highlight durations", all(l.count(":") == 1 for l in lens) and len(lens) == 2, lens)
            await page.click('#videoFilters [data-video-filter="all"]')
            await page.wait_for_timeout(250)
            check("video filter back to all",
                  await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length") == 10)
            # 선수 방송국 링크 (영상 탭 5인)
            st_links = await page.eval_on_selector_all("#videoStations .st-links a", "e=>e.map(x=>x.href)")
            want_streams = []
            for key in ["doran", "kanavi", "showmaker", "smash", "delight"]:
                want_streams += PLAYER_STREAMS[key]
            check("video stations links", st_links == want_streams, st_links)

            # ---------- 라이브 방송 배지 (/api/live) ----------
            check("live on-air row", await page.is_visible("#videoOnAir"))
            check("live on-air names", "도란" in await page.inner_text("#videoOnAir"),
                  await page.inner_text("#videoOnAir"))
            onair_rows = await page.eval_on_selector_all("#videoStations .st-row.is-onair", "e=>e.length")
            check("live station rows", onair_rows == 2, onair_rows)
            check("live station badge", "LIVE" in await page.inner_text("#videoStations"))
            check("live stream title", "솔랭 가즈아" in await page.inner_text("#videoStations"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(500)
            tiles = await page.eval_on_selector_all(".tile", "e=>e.filter(x=>x.querySelector('.t-onair')).map(x=>x.dataset.player)")
            check("live tile badges", tiles == ["doran", "delight"], tiles)
            check("live pick badge", await page.is_visible("#pickBanner .pick-onair"))
            check("live alert toggle on", await page.get_attribute("[data-live-toggle]", "aria-checked") == "true")
            check("live alert summary with live", "3개" in await page.inner_text("#notifySummary"),
                  await page.inner_text("#notifySummary"))
            await page.click("[data-live-toggle]")
            await page.wait_for_timeout(250)
            check("live alert toggle off", await page.get_attribute("[data-live-toggle]", "aria-checked") == "false")
            check("live alert saved", await page.evaluate("localStorage.getItem('dk.signal.live')") == "0")
            check("live alert summary counts", "2개" in await page.inner_text("#notifySummary"),
                  await page.inner_text("#notifySummary"))
            await page.click("[data-live-toggle]")
            await page.wait_for_timeout(250)
            check("live alert toggle back on", await page.get_attribute("[data-live-toggle]", "aria-checked") == "true")
            await page.screenshot(path=str(OUT / "13-live-badges-ko.png"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(350)
            await page.click('.tile[data-player="doran"]')
            await page.wait_for_timeout(300)

            # ---------- 공식일정: 생중계·VOD·하이라이트 ----------
            await page.click('[data-tab="official"]')
            await page.wait_for_timeout(900)
            # 서버 응답(공식 일정+영상)이 도착할 때까지 기다립니다.
            try:
                await page.wait_for_function(
                    "document.querySelectorAll('#officialRecent .path-row.has-vid').length >= 4", timeout=8000)
            except Exception as e:
                print("live official rows not ready:", e)
            check("official tab links to video tab",
                  await page.get_attribute("#officialVideoLink", "data-tab") == "video")
            rows = await page.eval_on_selector_all("#officialRecent .path-row", "e=>e.length")
            check("recent official rows", 4 <= rows <= 5, rows)
            hl_links = await page.eval_on_selector_all("#officialRecent .vid-chip.is-hl", "e=>e.map(x=>x.href)")
            check("recent rows -> youtube highlight search",
                  len(hl_links) >= 4 and all("youtube.com/results?search_query=" in h for h in hl_links),
                  hl_links[:2])
            vod_links = await page.eval_on_selector_all("#officialRecent .vid-chip.is-vod", "e=>e.map(x=>x.href)")
            check("official VOD links use real providers",
                  len(vod_links) >= 1 and all(
                      ("youtube.com/watch?v=" in h) or ("vod.sooplive.com/player/" in h) or ("twitch.tv/videos/" in h)
                      for h in vod_links),
                  vod_links[:3])
            await page.screenshot(path=str(OUT / "03-official-ko-dark.png"))
            # 영상 탭 최근 공식 경기 다시보기 (VOD/하이라이트)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(700)
            vod_rows = await page.eval_on_selector_all("#videoVodList .path-row", "e=>e.length")
            check("video vod rows", vod_rows >= 4, vod_rows)
            vod_hrefs = await page.eval_on_selector_all("#videoVodList .vid-chip.is-vod", "e=>e.map(x=>x.href)")
            check("video vod chips use real providers",
                  len(vod_hrefs) >= 1 and all(
                      ("youtube.com/watch?v=" in h) or ("vod.sooplive.com/player/" in h) or ("twitch.tv/videos/" in h)
                      for h in vod_hrefs), vod_hrefs[:3])
            hl_hrefs = await page.eval_on_selector_all("#videoVodList .vid-chip.is-hl", "e=>e.map(x=>x.href)")
            check("video vod rows -> highlight search",
                  len(hl_hrefs) >= 4 and all("youtube.com/results?search_query=" in h for h in hl_hrefs),
                  hl_hrefs[:2])
            await page.screenshot(path=str(OUT / "08-video-ko-dark.png"))
            await page.screenshot(path=str(OUT / "08-video-ko-dark-full.png"), full_page=True)

            # ---------- EN 전환: UI 전체가 바뀌는지 ----------
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(400)
            await page.click('[data-lang="en"]')
            await page.wait_for_timeout(2400)
            check("html lang en", await page.get_attribute("html", "lang") == "en")
            check("title en", (await page.title()) == "DK SIGNAL", await page.title())
            check("lang saved", await page.evaluate("localStorage.getItem('dk.signal.lang')") == "en")
            check("en tabs", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)") ==
                  ["Home", "Schedule", "Videos", "Match log", "Records"])
            check("en brand", await page.inner_text(".brand-sub") == "Dplus KIA tracker")
            check("en panel aria labels",
                  await page.eval_on_selector_all(".panel", "e=>e.map(x=>x.getAttribute('aria-label'))") ==
                  ["Home", "Schedule", "Videos", "Match log", "Records"],
                  await page.eval_on_selector_all(".panel", "e=>e.map(x=>x.getAttribute('aria-label'))"))
            check("en theme label", (await page.inner_text("#themeTxt")) in ("Dark", "Soft"), await page.inner_text("#themeTxt"))
            check("en board title", "Squad status board" in await page.inner_text("#panel-feed"))
            pick = await page.inner_text("#pickBanner")
            check("en pick banner", "MY PICK" in pick and "Doran" in pick and "Last 5" in pick and "승률" not in pick, pick[:80])
            grid_text = await page.inner_text("#statusGrid")
            check("en tile names", all(n in grid_text for n in ["Doran", "Kanavi", "ShowMaker", "Smash", "Delight"]))
            hl = await page.inner_text("#highlightCard")
            check("en highlight card", "Last 5 win rate" in hl and "KDA" in hl and "games" in hl, hl[:60])
            check("en champion names", "Renekton" in hl and "레넥톤" not in hl, hl[:120])
            notify = await page.inner_text(".notify-card")
            check("en notify card", "Alerts" in notify and "Send a test alert" in notify and "Solo queue" not in notify, notify[:60])
            check("en notify summary", "on" in await page.inner_text("#notifySummary") or "off" in await page.inner_text("#notifySummary"))
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(600)
            video = await page.inner_text("#panel-video")
            check("en video tab", "Signature highlights" in video and "Official LCK" in video and "Player streams" in video, video[:120])
            check("en video filters",
                  await page.eval_on_selector_all("#videoFilters .chip", "e=>e.map(x=>x.textContent)") ==
                  ["All", "Doran", "Kanavi", "ShowMaker", "Smash", "Delight"])
            check("en video vod card", "Recent official replays" in video)
            check("en live note", "CHZZK and SOOP" in video, [l for l in video.splitlines() if "CHZZK" in l][:2])
            await page.screenshot(path=str(OUT / "09-video-en-dark.png"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(400)
            check("en cheer", "One-line cheer" in await page.inner_text(".cheer-card"))
            check("en roster", "Dplus KIA’s five for 2027" in await page.inner_text(".roster-card"))
            check("no korean leftovers in home chrome",
                  "5인 상태 보드" not in await page.inner_text("#panel-feed"))
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT / "01-home-en-dark.png"))
            await page.screenshot(path=str(OUT / "01-home-en-dark-full.png"), full_page=True)

            # EN 상태에서 표·일정·기록
            await page.click('[data-tab="solo"]')
            await page.wait_for_timeout(700)
            solo = await page.inner_text("#panel-solo")
            check("en match log", "Time (KST)" in solo and "Champion" in solo and "Wins" in solo and "패배" not in solo, solo[:80])
            check("en panel meta", "last" in await page.inner_text("#soloPanelMeta"))
            await page.screenshot(path=str(OUT / "05-matchlog-en-dark.png"))
            await page.click('[data-tab="official"]')
            await page.wait_for_timeout(1400)
            off = await page.inner_text("#panel-official")
            check("en schedule", "Schedule" in off and "2027 season calendar" in off and "Live & replays are in Videos" in off)
            check("en next date fallback", "2027 LCK 컵" not in off and "2027 LCK Cup" in off,
                  [l for l in off.splitlines() if "2027" in l][:2])
            check("en stage names", "스위스" not in off and "8강" not in off,
                  [l for l in off.splitlines() if "Quarter" in l or "Swiss" in l][:2])
            await page.screenshot(path=str(OUT / "04-official-en-dark.png"))
            await page.click('[data-tab="records"]')
            await page.wait_for_timeout(600)
            rec = await page.inner_text("#panel-records")
            check("en records", "2026 season" in rec and "Semifinals" in rec and "Rounds 1" in rec, rec[:80])
            await page.screenshot(path=str(OUT / "06-records-en-dark.png"))

            # EN 에서 넓은 글씨가 넘치지 않는지
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(500)
            check("no horizontal overflow (en)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))

            # ---------- JA 전환 ----------
            await page.click('[data-lang="ja"]')
            await page.wait_for_timeout(800)
            check("html lang ja", await page.get_attribute("html", "lang") == "ja")
            check("ja tabs", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)") ==
                  ["ホーム", "公式日程", "動画", "試合ログ", "記録室"])
            ja = await page.inner_text("#panel-feed")
            check("ja board", "5人のステータスボード" in ja)
            check("ja video jump", "ライブ・ハイライト" in ja)
            check("ja champion", "レネクトン" in await page.inner_text("#highlightCard"))
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(600)
            ja_video = await page.inner_text("#panel-video")
            check("ja video tab", "ライブ・公式チャンネル" in ja_video and "代表ハイライト" in ja_video and "LCK公式" in ja_video)
            check("no horizontal overflow (ja video)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            await page.screenshot(path=str(OUT / "10-video-ja-dark.png"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(300)
            check("ja cheer", "ひとこと応援" in ja)
            check("no horizontal overflow (ja)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT / "02-home-ja-dark.png"))
            await page.screenshot(path=str(OUT / "02-home-ja-dark-full.png"), full_page=True)

            # ---------- 새로고침 후 언어 유지 ----------
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(800)
            check("lang persists after reload", await page.get_attribute("html", "lang") == "ja")

            # ---------- 테마 회귀 (JA + 소프트) ----------
            await page.click("#themeBtn")
            await page.wait_for_timeout(700)
            check("theme mint in ja", await page.get_attribute("html", "data-theme") == "mint")
            check("theme persists", await page.evaluate("localStorage.getItem('dk.signal.theme')") == "mint")
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT / "07-home-ja-mint.png"))
            await page.screenshot(path=str(OUT / "07-home-ja-mint-full.png"), full_page=True)
            await page.click("#themeBtn")
            await page.wait_for_timeout(500)
            check("back to dark", await page.get_attribute("html", "data-theme") == "dark")

            # ---------- 알림·응원 회귀 (JA) ----------
            await page.click('[data-solo-toggle="kanavi"]')
            await page.wait_for_timeout(250)
            check("ja alert summary", "件オン" in await page.inner_text("#notifySummary"), await page.inner_text("#notifySummary"))
            check("alert saved", await page.evaluate("localStorage.getItem('dk.signal.solo.kanavi')") == "1")
            await page.fill("#cheerInput", "ドラン ファイティン！")
            await page.click(".cheer-send")
            await page.wait_for_timeout(300)
            check("ja cheer added", await page.eval_on_selector_all("#cheerList .cheer-item", "e=>e.length") == 1)

            # ---------- KO 복귀 ----------
            await page.click('[data-lang="ko"]')
            await page.wait_for_timeout(1200)
            check("back to ko", await page.get_attribute("html", "lang") == "ko")
            check("ko restored", "5인 상태 보드" in await page.inner_text("#panel-feed"))
            # 스크린샷용 정리: 테스트로 남긴 응원 삭제 · 맨 위로
            if await page.eval_on_selector_all("#cheerList .cx", "e=>e.length"):
                await page.click("#cheerList .cx")
                await page.wait_for_timeout(250)
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(OUT / "00-home-ko-dark.png"))
            await page.screenshot(path=str(OUT / "00-home-ko-dark-full.png"), full_page=True)

            # ---------- ZH(중국어 간체) 전환 ----------
            await page.click('[data-lang="zh"]')
            await page.wait_for_timeout(900)
            check("html lang zh-CN", await page.get_attribute("html", "lang") == "zh-CN")
            check("zh title", (await page.title()) == "DK SIGNAL · 迪普基信号", await page.title())
            check("zh stored", await page.evaluate("localStorage.getItem('dk.signal.lang')") == "zh")
            check("zh tabs", await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)") ==
                  ["首页", "官方赛程", "视频", "对局记录", "记录室"],
                  await page.eval_on_selector_all(".tab", "e=>e.map(x=>x.innerText)"))
            check("zh panel aria labels",
                  await page.eval_on_selector_all(".panel", "e=>e.map(x=>x.getAttribute('aria-label'))") ==
                  ["首页", "官方赛程", "视频", "对局记录", "记录室"])
            zh_home = await page.inner_text("#panel-feed")
            check("zh board", "五人状态板" in zh_home)
            check("zh pick banner", "今天的 多兰" in zh_home and "我的最爱" in zh_home, zh_home[:120])
            zh_grid = await page.inner_text("#statusGrid")
            check("zh player names", all(n in zh_grid for n in ["多兰", "卡纳维", "秀梅克", "斯马什", "迪莱特"]),
                  zh_grid[:60])
            check("zh champion names", "荒漠屠夫" in await page.inner_text("#highlightCard"),
                  await page.inner_text("#highlightCard"))
            check("zh notify", "通知设置" in await page.inner_text(".notify-card"))
            check("zh cheer", "一句应援" in await page.inner_text(".cheer-card"))
            check("no horizontal overflow (zh)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(300)
            await page.screenshot(path=str(OUT / "11-home-zh-dark.png"))
            await page.screenshot(path=str(OUT / "11-home-zh-dark-full.png"), full_page=True)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(700)
            zh_video = await page.inner_text("#panel-video")
            check("zh video tab", "直播 · 官方频道" in zh_video and "选手个人直播间" in zh_video and "最近官方比赛回放" in zh_video)
            check("zh video filters",
                  await page.eval_on_selector_all("#videoFilters .chip", "e=>e.map(x=>x.textContent)") ==
                  ["全部", "多兰", "卡纳维", "秀梅克", "斯马什", "迪莱特"])
            check("zh video titles", "第4局" in zh_video and "集锦" in zh_video, zh_video[:120])
            check("no horizontal overflow (zh video)",
                  await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  await page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            await page.screenshot(path=str(OUT / "12-video-zh-dark.png"))
            await page.screenshot(path=str(OUT / "12-video-zh-dark-full.png"), full_page=True)
            await page.click('[data-tab="official"]')
            await page.wait_for_timeout(1400)
            zh_off = await page.inner_text("#panel-official")
            check("zh schedule", "官方赛程" in zh_off and "2027 赛季日历" in zh_off, zh_off[:80])
            await page.click('[data-tab="records"]')
            await page.wait_for_timeout(500)
            check("zh records", "2026 赛季" in await page.inner_text("#panel-records"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(400)

            # ---------- ?lang= 로 들어와 바꾼 언어가 새로고침 후에도 유지 ----------
            await page.goto(BASE + "?lang=ko", wait_until="networkidle")
            await page.wait_for_timeout(700)
            check("url lang applies", await page.get_attribute("html", "lang") == "ko")
            await page.click('[data-lang="en"]')
            await page.wait_for_timeout(700)
            check("url lang follows switch", "lang=en" in page.url, page.url)
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(700)
            check("lang kept after reload (?lang=)", await page.get_attribute("html", "lang") == "en")

            # ---------- 브라우저 언어 자동 감지 (저장값 없는 새 컨텍스트) ----------
            for loc, want in [("en-US", "en"), ("ja-JP", "ja"), ("zh-CN", "zh-CN"), ("zh-TW", "zh-CN"), ("fr-FR", "ko")]:
                ctx2 = await browser.new_context(viewport={"width": 390, "height": 844}, locale=loc)
                pg = await ctx2.new_page()
                await pg.goto(BASE, wait_until="networkidle")
                await pg.wait_for_timeout(600)
                got = await pg.get_attribute("html", "lang")
                check(f"auto lang for {loc} -> {want}", got == want, got)
                await ctx2.close()

            errors = [l for l in logs if l[0] == "pageerror"]
            check("no page errors", not errors, errors[:3])
            console_err = [l for l in logs if l[0] == "error" and "favicon" not in l[1]]
            check("no console errors", not console_err, console_err[:3])

            await browser.close()
    finally:
        server.terminate()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n== summary == {ok}/{len(results)} passed")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
