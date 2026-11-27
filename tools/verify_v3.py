"""딮기 시그널 v3 검증 — 다국어(KO/EN/JA/ZH) · 영상 탭 · 방송국 링크 · 기존 기능 회귀.

  python3 tools/verify_v3.py

dev_server 를 8765 포트에 띄우고 390x844 모바일 뷰포트에서 확인합니다.
스크린샷은 /workspace/downloads/dk-signal-v3 에 남깁니다.
"""
import asyncio
import json
import pathlib
import re
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

# 디플러스 기아 공식 유튜브 재생목록 (2026-11-27 채널에서 확인)
PLAYLISTS = ["PLRG5G_CO1tlo", "PLfgIi8amvN7A", "PLqP9PZoXicPWtVT29eT2YRw2T9btvz9J7",
             "PLqP9PZoXicPVvy4J6jfCqPzhmfgttDwXK", "PLqP9PZoXicPV1mP4PJRXtqTActh2CRK8U",
             "PLqP9PZoXicPXPp7ovbHc5b1aB61PyARoV"]
PLAYLIST_COUNTS = ["3편", "7편", "28편", "7편", "12편", "21편"]

# 영상 아카이브 — data.js 에서 그대로 읽어 기대값을 만듭니다 (편수가 늘어도 검증이 따라갑니다)
PLAYER_KEYS = ["doran", "kanavi", "showmaker", "smash", "delight"]
ARCHIVE = {}

ARCHIVE_JS = """
const vm = require('vm');
const fs = require('fs');
const d = vm.runInNewContext(fs.readFileSync('data.js', 'utf8') + ';({PLAYERS: PLAYERS, DK: DK_VIDEOS, T: HL_TAGS})',
                            {}, { timeout: 3000 });
const by = {}, cats = {}, champs = {}, all = [], pcount = {};
let champCards = 0;
function add(h, key) {
  (by[key] = by[key] || []).push(h.id);
  const c = h.cat || 'highlight';
  (cats[c] = cats[c] || []).push(h.id);
  (h.champ || []).forEach(function (k) { (champs[k] = champs[k] || []).push(h.id); });
  if ((h.champ || []).length) champCards++;
  all.push(h.id);
}
d.PLAYERS.forEach(function (p) { pcount[p.key] = (p.highlights || []).length; (p.highlights || []).forEach(function (h) { add(h, p.key); }); });
d.DK.forEach(function (h) { add(h, h.player || 'dk'); });
console.log(JSON.stringify({ by: by, cats: cats, champs: champs, all: all, tags: Object.keys(d.T), champCards: champCards, pcount: pcount, dkcount: d.DK.length }));
"""


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def load_archive():
    out = subprocess.run([node_bin(), "-e", ARCHIVE_JS], cwd=str(ROOT), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def archive_globals():
    global ARCHIVE, PLAYER_VIDEOS, CATEGORY_VIDEOS, ALL_VIDEO_IDS, TOTAL_VIDEOS, CHAMPION_VIDEOS, TAGS, DK_ONLY_VIDEOS, CHAMP_CARDS
    data = load_archive()
    ARCHIVE = data
    by = dict(data["by"])
    DK_ONLY_VIDEOS = by.pop("dk", [])
    PLAYER_VIDEOS = {k: by.get(k, []) for k in PLAYER_KEYS}
    CATEGORY_VIDEOS = data["cats"]
    CHAMPION_VIDEOS = data["champs"]
    ALL_VIDEO_IDS = set(data["all"])
    TAGS = data["tags"]
    CHAMP_CARDS = int(data.get("champCards") or 0)
    TOTAL_VIDEOS = len(ALL_VIDEO_IDS)


PLAYER_VIDEOS = {}
CATEGORY_VIDEOS = {}
ALL_VIDEO_IDS = set()
CHAMPION_VIDEOS = {}
TAGS = []
DK_ONLY_VIDEOS = []
CHAMP_CARDS = 0
TOTAL_VIDEOS = 0


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(detail)) if detail else ""))


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


async def launch(p):
    chrome = pathlib.Path("/workspace/.pw-browsers/chromium-1255/chrome-linux64/chrome")
    opts = {"args": ["--force-color-profile=srgb", "--font-render-hinting=none"]}
    if chrome.exists():
        opts["executable_path"] = str(chrome)
    return await p.chromium.launch(**opts)


async def main():
    archive_globals()
    print("archive:", TOTAL_VIDEOS, "videos |", {k: len(v) for k, v in PLAYER_VIDEOS.items()})
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

            # ---------- 이벤트 · D-DAY 스트립 ----------
            check("event strip visible", await page.is_visible("#eventStrip"))
            ev_text = await page.inner_text("#eventStrip")
            check("event awards card", "2026 LCK 어워드" in ev_text and "D-" in ev_text, ev_text[:100])
            check("event awards dday number", "D-19" in ev_text, ev_text[:60])
            check("event lck cup tentative", "2027 LCK 컵" in ev_text and "예상" in ev_text, ev_text[:200])
            check("event birthday card", "생일" in ev_text, ev_text[-60:])
            ev_links = await page.eval_on_selector_all("#eventStrip a.ev-card", "e=>e.map(x=>x.href)")
            check("event official links", len(ev_links) == 2 and all("lolesports.com" in h for h in ev_links), ev_links)
            ev_cards = await page.eval_on_selector_all("#eventStrip .ev-card", "e=>e.length")
            check("event strip 3 cards", ev_cards == 3, ev_cards)
            await page.screenshot(path=str(OUT / "30-events-ko.png"))

            # ---------- 인게임 레이더 (DK_INGAME_FAKE=1) ----------
            await page.click('.tile[data-player="doran"]')
            await page.wait_for_timeout(350)
            pick_text = await page.inner_text("#pickBanner")
            check("pick in-game badge", "게임 중" in pick_text and "야스오" in pick_text, pick_text[:140])
            check("pick matchup chip", ("내전" in pick_text or "듀오" in pick_text), pick_text[-80:])
            tiles_live = await page.eval_on_selector_all(".tile .t-live.is-live", "e=>e.map(x=>x.textContent)")
            check("two tiles in game", len(tiles_live) == 2, tiles_live)
            check("tile live has champion + minutes", any("야스오" in t and "분" in t for t in tiles_live), tiles_live)
            tile_mu = await page.eval_on_selector_all(".tile .t-mu .mu", "e=>e.map(x=>x.textContent)")
            check("tile matchup chips", len(tile_mu) >= 4, tile_mu)

            await page.click("#pickBanner .pick-live")
            await page.wait_for_timeout(700)
            check("in-game sheet opens", await page.is_visible("#lgModal"))
            sheet = await page.inner_text("#lgBody")
            check("sheet teams = 2", await page.eval_on_selector_all(".lg-team", "e=>e.length") == 2)
            check("sheet players = 10", await page.eval_on_selector_all(".lg-team .lg-p", "e=>e.length") == 10)
            check("sheet dk labels", "DK 도란" in sheet and "DK 카나비" in sheet and "DK 쇼메이커" in sheet, sheet[:200])
            check("sheet pro labels", "T1 페이커" in sheet and "GEN 쵸비" in sheet)
            check("sheet matchup badges", "내전" in sheet and "듀오" in sheet and "with 페이커" in sheet)
            champs = await page.eval_on_selector_all(".lg-p .lg-pc b", "e=>e.map(x=>x.textContent)")
            check("sheet champion names localized", "야스오" in champs and "아지르" in champs, champs)
            spell_imgs = await page.eval_on_selector_all(".lg-spell-ico", "e=>e.filter(x=>x.naturalWidth>0).length")
            check("sheet spell icons load", spell_imgs == 20, spell_imgs)
            champ_imgs = await page.eval_on_selector_all(".lg-ch", "e=>e.filter(x=>x.naturalWidth>0).length")
            check("sheet champion icons load", champ_imgs == 10, champ_imgs)
            await page.screenshot(path=str(OUT / "31-ingame-sheet-ko.png"))
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)
            check("sheet closes with Esc", await page.get_attribute("#lgModal", "hidden") is not None)

            # 라이브 타일은 배지가 정보용이고, 타일을 누르면 그 선수로 전환됩니다(시트는 MY PICK 에서)
            await page.click('.tile[data-player="kanavi"]')
            await page.wait_for_timeout(400)
            check("tile click keeps sheet closed", await page.get_attribute("#lgModal", "hidden") is not None)
            check("tile click switches my pick", await page.get_attribute('.tile[data-player="kanavi"]', "aria-pressed") == "true")
            check("kanavi pick shows live row", "게임 중" in await page.inner_text("#pickBanner"))
            await page.click("#pickBanner .pick-live")
            await page.wait_for_timeout(500)
            check("kanavi live sheet opens", await page.is_visible("#lgModal"))
            await page.click("#lgClose")
            await page.wait_for_timeout(300)
            check("sheet closes with button", await page.get_attribute("#lgModal", "hidden") is not None)
            # 원래 상태(도란 · 내 최애)로 되돌려 뒤 검사에 영향을 주지 않게 합니다.
            await page.click('.tile[data-player="doran"]')
            await page.wait_for_timeout(300)
            if "미리보기" in await page.inner_text("#pickBanner"):
                await page.click('[data-pin]')
                await page.wait_for_timeout(300)
            check("restored my pick doran", await page.get_attribute('.tile[data-player="doran"]', "aria-pressed") == "true")

            # 경기로그 표에도 같은 판 매치업 배지
            await page.click('[data-tab="solo"]')
            await page.wait_for_timeout(500)
            log_mu = await page.eval_on_selector_all("#soloTable2 .mu-row .mu", "e=>e.map(x=>x.textContent)")
            check("matchlog matchup chips", len(log_mu) > 0, log_mu[:3])
            await page.screenshot(path=str(OUT / "32-matchlog-mu-ko.png"))
            await page.click('[data-tab="feed"]')
            await page.wait_for_timeout(400)

            # 다국어: 새 문구가 EN/JA/ZH 로도 나오는지
            await page.click('[data-lang="en"]')
            await page.wait_for_timeout(700)
            en_feed = await page.inner_text("#panel-feed")
            check("en in-game badge", "In game" in en_feed, en_feed[:120])
            check("en event strip", "2026 LCK Awards" in await page.inner_text("#eventStrip"))
            en_mu = await page.eval_on_selector_all("#pickBanner .mu", "e=>e.map(x=>x.textContent)")
            check("en matchup words", any(("duo" in t or "same game" in t or "with" in t or "vs" in t) for t in en_mu), en_mu)
            await page.click('[data-lang="ja"]')
            await page.wait_for_timeout(700)
            ja_feed = await page.inner_text("#panel-feed")
            check("ja in-game badge", "ゲーム中" in ja_feed, ja_feed[:120])
            check("ja event strip", "2026 LCKアワード" in await page.inner_text("#eventStrip"))
            await page.click('[data-lang="zh"]')
            await page.wait_for_timeout(700)
            zh_feed = await page.inner_text("#panel-feed")
            check("zh in-game badge", "游戏中" in zh_feed, zh_feed[:120])
            check("zh event strip", "2026 LCK 颁奖礼" in await page.inner_text("#eventStrip"))
            await page.click("#pickBanner .pick-live")
            await page.wait_for_timeout(600)
            zh_sheet = await page.inner_text("#lgBody")
            check("zh sheet labels", "友方" in zh_sheet and "敌方" in zh_sheet, zh_sheet[:120])
            await page.screenshot(path=str(OUT / "33-ingame-sheet-zh.png"))
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)
            await page.click('[data-lang="ko"]')
            await page.wait_for_timeout(700)

            # ---------- 영상 탭: 생중계 · 재생목록 · 아카이브 (3번 시안) ----------
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(700)
            check("video panel visible", await page.is_visible("#panel-video"))
            check("video panel title", await page.inner_text("#panel-video .panel-title") == "영상")
            chan = await page.eval_on_selector_all("#videoChannels .chan", "e=>e.map(x=>x.href)")
            check("video official channels", chan == [LCK_CHZZK, LCK_SOOP, LCK_YT, DK_YT], chan)
            check("video dk channel link",
                  await page.get_attribute("#dkYtOpen", "href") == "https://www.youtube.com/@DplusKia_LOL")
            st_rows = await page.eval_on_selector_all("#videoStations .st-row", "e=>e.length")
            check("video stations = 5", st_rows == 5, st_rows)

            # 유튜브 재생목록 (실제 존재하는 공식 재생목록 6종)
            pl_ids = await page.eval_on_selector_all("#plGrid .pl-item", "e=>e.map(x=>x.dataset.playlist)")
            check("playlist grid = 6 official playlists", pl_ids == PLAYLISTS, pl_ids)
            pl_counts = await page.eval_on_selector_all("#plGrid .pl-n", "e=>e.map(x=>x.textContent)")
            check("playlist counts from channel", pl_counts == PLAYLIST_COUNTS, pl_counts)
            pl_titles = await page.eval_on_selector_all("#plGrid .pl-title", "e=>e.map(x=>x.textContent.trim())")
            check("playlist titles localized", pl_titles[0] == "2026 Worlds 딮터뷰" and len(pl_titles) == 6, pl_titles)
            pl_thumbs = await page.eval_on_selector_all(
                "#plGrid .pl-thumb img", "e=>e.map(x=>[x.complete, x.naturalWidth])")
            check("playlist thumbs render", pl_thumbs and all(w > 0 for _, w in pl_thumbs), pl_thumbs)
            await page.evaluate("document.querySelector('#plGrid').scrollIntoView({block:'center'})")
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(OUT / "20-playlists-ko.png"))

            # 아카이브: 칩 3줄 + 카드
            champ_chips = await page.eval_on_selector_all("#videoChampChips .tag-chip", "e=>e.map(x=>x.textContent)")
            check("champion chips start with the six picks",
                  champ_chips[:6] == ["#암베사", "#나르", "#아지르", "#카이사", "#르블랑", "#제이스"], champ_chips[:6])
            check("champion chips expanded (10+)", len(champ_chips) == len([t for t in TAGS if t in CHAMPION_VIDEOS]) and len(champ_chips) >= 10,
                  champ_chips)
            cat_chips = await page.eval_on_selector_all("#videoCats .chip", "e=>e.map(x=>x.textContent)")
            check("category chips (with saved chip)", cat_chips == ["전체", "★ 찜 0", "하이라이트", "매드무비", "딮터뷰·비하인드", "쇼츠"], cat_chips)
            chips = await page.eval_on_selector_all("#videoFilters .chip", "e=>e.map(x=>x.textContent)")
            check("video filter chips", chips == ["전체", "도란", "카나비", "쇼메이커", "스매쉬", "딜라이트"], chips)

            total_items = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length")
            check(f"archive cards = {TOTAL_VIDEOS}", total_items == TOTAL_VIDEOS, total_items)
            check("archive count badge", await page.inner_text("#videoCount") == f"{TOTAL_VIDEOS}편",
                  await page.inner_text("#videoCount"))
            check("archive cards are in-app buttons",
                  await page.eval_on_selector_all("#videoList .vc-item", "e=>e.filter(x=>x.tagName==='BUTTON' && x.dataset.play).length") == TOTAL_VIDEOS)
            play_ids = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("archive ids complete", set(play_ids) == set(ALL_VIDEO_IDS), sorted(set(ALL_VIDEO_IDS) - set(play_ids)))
            check("archive ids unique", len(set(play_ids)) == len(play_ids), len(play_ids))

            groups = await page.eval_on_selector_all(".hl-group .hl-g-name", "e=>e.map(x=>x.firstChild.textContent.trim())")
            check("archive groups = 5 players + Dplus Kia",
                  groups == ["도란", "카나비", "쇼메이커", "스매쉬", "딜라이트", "Dplus Kia"], groups)
            arcs = await page.eval_on_selector_all(".hl-group .hl-g-arc", "e=>e.map(x=>x.textContent)")
            check("group team arc", arcs[0] == "T1 · Gen.G · HLE · DRX → DK 2027" and arcs[2] == "DK 2027", arcs)
            group_counts = await page.eval_on_selector_all(".hl-group .hl-g-n", "e=>e.map(x=>x.textContent)")
            want_counts = [f"{ARCHIVE['pcount'][k]}편" for k in PLAYER_KEYS] + [f"{ARCHIVE['dkcount']}편"]
            check("group counts", group_counts == want_counts, group_counts)
            no_len = await page.eval_on_selector_all(
                "#videoList .vc-len", "e=>e.map(x=>x.textContent).filter(t=>!t.includes(':'))")
            check("every card shows a duration", no_len == [], no_len)
            years = [int(y) for y in await page.eval_on_selector_all("#videoList .vc-yr", "e=>e.map(x=>x.textContent)")]
            check("every card shows a year", years and all(y >= 2019 for y in years), years[:6])
            cats = await page.eval_on_selector_all("#videoList .vc-cat", "e=>e.map(x=>x.textContent)")
            check("every card shows a category badge", len(cats) == TOTAL_VIDEOS, len(cats))
            per_group = await page.eval_on_selector(
                "#videoList",
                "root=>{const groups=[];let cur=null;Array.from(root.children).forEach(el=>{"
                "if(el.classList.contains('hl-group')){cur=[];groups.push(cur);return;}"
                "const y=el.querySelector('.vc-yr');if(cur&&y)cur.push(Number(y.textContent));});return groups;}")
            check("years descend inside each group",
                  all(ys == sorted(ys, reverse=True) for ys in per_group if ys), per_group)
            teams = await page.eval_on_selector_all("#videoList .vc-team", "e=>e.map(x=>x.textContent)")
            check("team badge on every card", len(teams) == TOTAL_VIDEOS, len(teams))
            points = await page.eval_on_selector_all("#videoList .vc-title", "e=>e.map(x=>x.textContent.trim())")
            check("every card has a one-line point", points and all(len(t) >= 2 for t in points), points[:3])
            champ_cards = await page.eval_on_selector_all("#videoList .vc-champ", "e=>e.map(x=>x.textContent.trim())")
            check("champion tag on cards", len(champ_cards) == CHAMP_CARDS, (len(champ_cards), CHAMP_CARDS))
            check("hint under archive", "아카이브" in await page.inner_text("#videoArchiveHint"),
                  await page.inner_text("#videoArchiveHint"))
            await page.evaluate("document.querySelector('#videoCats').scrollIntoView({block:'center'})")
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(OUT / "21-archive-ko.png"))

            # 최신순 정렬
            await page.click('[data-video-sort="recent"]')
            await page.wait_for_timeout(300)
            check("recent sort removes groups", await page.eval_on_selector_all(".hl-group", "e=>e.length") == 0)
            recent_years = [int(y) for y in await page.eval_on_selector_all("#videoList .vc-yr", "e=>e.map(x=>x.textContent)")]
            check("recent sort newest first", recent_years == sorted(recent_years, reverse=True), recent_years[:8])
            check("recent sort keeps player label",
                  await page.eval_on_selector_all("#videoList .vc-who", "e=>e.length") == TOTAL_VIDEOS)
            await page.click('[data-video-sort="player"]')
            await page.wait_for_timeout(300)
            check("back to player sort", await page.eval_on_selector_all(".hl-group", "e=>e.length") == 6)

            # 선수 필터
            for key, ids in PLAYER_VIDEOS.items():
                await page.click(f'#videoFilters [data-video-filter="{key}"]')
                await page.wait_for_timeout(220)
                got = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
                check(f"{key} filter", set(got) == set(ids), got)
                check(f"{key} filter keeps one group", await page.eval_on_selector_all(".hl-group", "e=>e.length") == 1)
                thumbs = await page.eval_on_selector_all(
                    "#videoList .vc-thumb img", "e=>e.map(x=>[x.complete, x.naturalWidth])")
                check(f"{key} thumbs render", thumbs and all(w > 0 for _, w in thumbs), thumbs)
                lens = await page.eval_on_selector_all("#videoList .vc-len", "e=>e.map(x=>x.textContent)")
                check(f"{key} durations", all(l.count(":") == 1 for l in lens) and len(lens) == len(ids), lens)
            await page.click('#videoFilters [data-video-filter="all"]')
            await page.wait_for_timeout(200)

            # 종류 필터
            for key, ids in CATEGORY_VIDEOS.items():
                await page.click(f'#videoCats [data-video-cat="{key}"]')
                await page.wait_for_timeout(220)
                got = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
                check(f"category {key} = {len(ids)}", set(got) == set(ids), got)
            await page.click('#videoCats [data-video-cat="all"]')
            await page.wait_for_timeout(200)

            # 챔피언 칩 (요청한 5종이 실제 영상과 연결되는지)
            for key, ids in CHAMPION_VIDEOS.items():
                await page.click(f'#videoChampChips [data-video-champ="{key}"]')
                await page.wait_for_timeout(220)
                got = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
                check(f"champion chip {key} = {len(ids)}", set(got) == set(ids), got)
                check(f"champion chip {key} active",
                      await page.get_attribute(f'#videoChampChips [data-video-champ="{key}"]', "aria-pressed") == "true")
                await page.click(f'#videoChampChips [data-video-champ="{key}"]')
                await page.wait_for_timeout(180)
            check("champion chip toggles off",
                  await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length") == TOTAL_VIDEOS)

            # 검색 (챔피언 · 대회 · 해시태그 · 한국어 IME)
            await page.fill("#videoSearch", "펜타킬")
            await page.wait_for_timeout(300)
            hits = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("video search 펜타킬", hits == ["2JCbasoSUrY"], hits)
            check("video search count", await page.inner_text("#videoCount") == "1편", await page.inner_text("#videoCount"))
            await page.fill("#videoSearch", "Worlds")
            await page.wait_for_timeout(300)
            worlds = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length")
            check("video search Worlds (영문 키워드)", worlds >= 5, worlds)
            await page.fill("#videoSearch", "아지르")
            await page.wait_for_timeout(300)
            azir = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("video search 아지르 (챔피언)", set(azir) == {"JT8H1izxnL8", "poQBzdCFlY4"}, azir)
            await page.fill("#videoSearch", "#암베사")
            await page.wait_for_timeout(300)
            amb = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("video search #암베사 (해시태그)", set(amb) == {"FDos-nzB8HE", "7wZxtaNDCTI"}, amb)
            await page.fill("#videoSearch", "카이사")
            await page.wait_for_timeout(300)
            kaisa = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("video search 카이사 (챔피언)", kaisa == ["QJIaTC-p8pg"], kaisa)
            await page.fill("#videoSearch", "딮터뷰")
            await page.wait_for_timeout(300)
            behind = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length")
            check("video search 딮터뷰 (종류 이름)", behind >= 3, behind)

            # 한국어 IME: 조합 중에는 목록을 다시 그리지 않고, 조합이 끝나면 한 번에 반영
            ime = await page.evaluate("""() => {
              const box = document.querySelector('#videoSearch');
              const before = document.querySelectorAll('#videoList .vc-item').length;
              box.value = '암';
              box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
              box.dispatchEvent(new Event('input', { bubbles: true }));
              const during = document.querySelectorAll('#videoList .vc-item').length;
              box.value = '암베사';
              box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
              const after = [...document.querySelectorAll('#videoList .vc-item')].map(x => x.dataset.play);
              return { before, during, after };
            }""")
            check("IME keeps list steady while composing", ime["during"] == ime["before"], ime)
            check("IME applies query on compositionend", set(ime["after"]) == {"FDos-nzB8HE", "7wZxtaNDCTI"}, ime["after"])

            await page.fill("#videoSearch", "없는검색어zzz")
            await page.wait_for_timeout(300)
            empty = await page.inner_text("#videoList")
            check("video search empty state", "없는검색어zzz" in empty, empty[:60])
            check("video search clear button", await page.is_visible("#videoSearchClear"))
            await page.click("#videoSearchClear")
            await page.wait_for_timeout(300)
            check("video search cleared",
                  await page.eval_on_selector_all("#videoList .vc-item", "e=>e.length") == TOTAL_VIDEOS)
            check("video search clear hidden", not await page.is_visible("#videoSearchClear"))

            # ---------- 인앱 유튜브 플레이어 ----------
            await page.click('#videoList .vc-item')
            await page.wait_for_timeout(900)
            check("player modal opens", await page.is_visible("#vpModal"))
            src = await page.get_attribute("#vpFrame", "src")
            check("player loads youtube embed",
                  src.startswith("https://www.youtube.com/embed/") and "autoplay=1" in src and "rel=0" in src, src)
            check("player title from card",
                  (await page.inner_text("#vpTitle")).strip() != "", await page.inner_text("#vpTitle"))
            check("player youtube link",
                  (await page.get_attribute("#vpOpen", "href")).startswith("https://www.youtube.com/watch?v="),
                  await page.get_attribute("#vpOpen", "href"))
            check("player embed note", len(await page.inner_text("#vpNote")) > 10)
            check("body scroll locked while playing",
                  "vp-locked" in (await page.get_attribute("body", "class") or ""))
            await page.screenshot(path=str(OUT / "22-player-ko.png"))
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(400)
            check("player closes on ESC", await page.is_hidden("#vpModal"))
            check("player stops audio on close", await page.get_attribute("#vpFrame", "src") == "about:blank",
                  await page.get_attribute("#vpFrame", "src"))
            check("body scroll restored", "vp-locked" not in (await page.get_attribute("body", "class") or ""))
            # 배경 클릭으로도 닫힘
            await page.click('#videoList .vc-item')
            await page.wait_for_timeout(500)
            await page.click("#vpVeil", position={"x": 8, "y": 8})
            await page.wait_for_timeout(350)
            check("player closes on backdrop", await page.is_hidden("#vpModal"))
            # 재생목록은 videoseries 로 재생
            await page.click("#plGrid .pl-item")
            await page.wait_for_timeout(700)
            pl_src = await page.get_attribute("#vpFrame", "src")
            check("playlist opens in player",
                  pl_src.startswith("https://www.youtube.com/embed/videoseries?list=PLRG5G_CO1tlo")
                  and "autoplay=1" in pl_src and "enablejsapi=1" in pl_src, pl_src)
            check("playlist youtube link",
                  await page.get_attribute("#vpOpen", "href") == "https://www.youtube.com/playlist?list=PLRG5G_CO1tlo",
                  await page.get_attribute("#vpOpen", "href"))
            await page.click("#vpClose")
            await page.wait_for_timeout(300)
            check("player close button works", await page.is_hidden("#vpModal"))

            # ---------- ② 찜(★) & 연속 재생 (localStorage dk.signal.favs) ----------
            await page.evaluate("localStorage.removeItem('dk.signal.favs')")
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(700)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(500)
            check("saved chip starts at 0", "★ 찜 0" in await page.inner_text("#videoCats"))
            check("saved bar hidden with no favs", await page.is_hidden("#favBar"))
            await page.click('#videoCats [data-video-cat="fav"]')
            await page.wait_for_timeout(300)
            check("empty saved list message", "찜한 영상이 없어요" in await page.inner_text("#videoList"),
                  (await page.inner_text("#videoList"))[:80])
            await page.click('#videoCats [data-video-cat="all"]')
            await page.wait_for_timeout(300)

            for fid in ["FDos-nzB8HE", "7wZxtaNDCTI", "J8XPHKlTBLM"]:
                await page.click(f'[data-fav="{fid}"]')
                await page.wait_for_timeout(160)
            check("saved chip counts", "★ 찜 3" in await page.inner_text("#videoCats"),
                  await page.inner_text("#videoCats"))
            check("star shows pressed state",
                  await page.get_attribute('[data-fav="FDos-nzB8HE"]', "aria-pressed") == "true")
            check("star glyph filled",
                  (await page.inner_text('[data-fav="FDos-nzB8HE"]')).strip() == "★")
            saved_raw = await page.evaluate("localStorage.getItem('dk.signal.favs')")
            check("favs stored in localStorage only", json.loads(saved_raw) ==
                  ["FDos-nzB8HE", "7wZxtaNDCTI", "J8XPHKlTBLM"], saved_raw)
            check("saved bar shows count", "3편" in await page.inner_text("#favBar"),
                  await page.inner_text("#favBar"))

            await page.click('#videoCats [data-video-cat="fav"]')
            await page.wait_for_timeout(350)
            fav_ids = await page.eval_on_selector_all("#videoList .vc-item", "e=>e.map(x=>x.dataset.play)")
            check("saved filter keeps save order", fav_ids == ["FDos-nzB8HE", "7wZxtaNDCTI", "J8XPHKlTBLM"], fav_ids)
            check("saved filter count", await page.inner_text("#videoCount") == "3편",
                  await page.inner_text("#videoCount"))
            await page.screenshot(path=str(OUT / "51-live-saved-ko.png"))

            # 찜 목록에서 연속 재생
            await page.click("#favPlay")
            await page.wait_for_timeout(700)
            check("player opens from saved list", await page.is_visible("#vpModal"))
            check("queue counter 1 / 3", await page.inner_text("#vpPos") == "1 / 3",
                  await page.inner_text("#vpPos"))
            check("queue mode label", "연속 재생 중" in await page.inner_text("#vpMode"),
                  await page.inner_text("#vpMode"))
            check("player star on for saved video",
                  await page.get_attribute("#vpStar", "aria-pressed") == "true")
            check("next preview shows second video", "도란의 암베사 깎기 1일차" in await page.inner_text("#vpNext"),
                  (await page.inner_text("#vpNext"))[:80])
            check("MY LIST rows = 3", await page.eval_on_selector_all("#vpQueueList .vp-qitem", "e=>e.length") == 3)
            check("MY LIST current row highlighted",
                  await page.eval_on_selector_all("#vpQueueList .vp-qitem.is-now", "e=>e.length") == 1)
            qsrc = await page.get_attribute("#vpFrame", "src")
            check("queue starts at first saved video", "FDos-nzB8HE" in qsrc, qsrc)
            await page.screenshot(path=str(OUT / "51-live-player-saved-ko.png"))

            await page.click("#vpNextBtn")
            await page.wait_for_timeout(600)
            check("next advances queue", await page.inner_text("#vpPos") == "2 / 3", await page.inner_text("#vpPos"))
            nsrc = await page.get_attribute("#vpFrame", "src")
            check("next loads second video", "7wZxtaNDCTI" in nsrc, nsrc)
            await page.click("#vpStar")
            await page.wait_for_timeout(250)
            check("player star toggles off", await page.get_attribute("#vpStar", "aria-pressed") == "false")
            check("un-saved removes from MY LIST",
                  await page.eval_on_selector_all("#vpQueueList .vp-qitem", "e=>e.length") == 2)
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(350)
            check("saved chip after un-save", "★ 찜 2" in await page.inner_text("#videoCats"))
            check("saved bar after un-save", "2편" in await page.inner_text("#favBar"))

            # 새로고침해도 찜은 이 기기에 남습니다
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(700)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(500)
            check("favs survive reload", "★ 찜 2" in await page.inner_text("#videoCats"),
                  await page.inner_text("#videoCats"))
            check("star state survives reload",
                  await page.get_attribute('[data-fav="FDos-nzB8HE"]', "aria-pressed") == "true")
            check("un-saved star stays empty",
                  await page.get_attribute('[data-fav="7wZxtaNDCTI"]', "aria-pressed") == "false")
            await page.click('#videoCats [data-video-cat="all"]')
            await page.wait_for_timeout(300)
            # 검증 뒤에는 찜을 지워 다음 구간(언어별 칩 확인)을 깨끗한 상태로
            await page.evaluate("localStorage.removeItem('dk.signal.favs')")
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(700)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(400)

            # ---------- 모바일 폭 3종 가로 넘침 0 ----------
            for w in (360, 390, 430):
                await page.set_viewport_size({"width": w, "height": 860})
                await page.wait_for_timeout(350)
                over = await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(f"no horizontal overflow (ko video {w}px)", over <= 1, over)
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.wait_for_timeout(250)
            # 디플러스 기아 공식 유튜브 (/api/dk-youtube)
            try:
                await page.wait_for_function(
                    "document.querySelectorAll('#dkYtGrid .dy-item').length >= 6", timeout=8000)
            except Exception as e:
                print("dk youtube grid not ready:", e)
            dk_items = await page.eval_on_selector_all("#dkYtGrid .dy-item", "e=>e.length")
            check("dk youtube videos", dk_items == 10, dk_items)
            check("dk youtube count badge", await page.inner_text("#dkYtCount") == "10편",
                  await page.inner_text("#dkYtCount"))
            dk_ids = await page.eval_on_selector_all("#dkYtGrid .dy-item", "e=>e.map(x=>x.dataset.play)")
            check("dk youtube cards play in app",
                  all(v and len(v) == 11 for v in dk_ids) and len(set(dk_ids)) == len(dk_ids), dk_ids[:3])
            dk_titles = await page.eval_on_selector_all("#dkYtGrid .dy-title", "e=>e.map(x=>x.textContent.trim())")
            check("dk youtube titles", all(len(t) > 3 for t in dk_titles), dk_titles[:2])
            dk_thumbs = await page.eval_on_selector_all(
                "#dkYtGrid .dy-thumb img", "e=>e.map(x=>[x.complete, x.naturalWidth])")
            check("dk youtube thumbs render", dk_thumbs and all(w > 0 for _, w in dk_thumbs), dk_thumbs[:3])
            dk_note = await page.inner_text("#dkYtNote")
            check("dk youtube note", "유튜브" in dk_note and ":" in dk_note, dk_note)
            check("dk youtube open button",
                  await page.get_attribute("#dkYtOpen", "href") == "https://www.youtube.com/@DplusKia_LOL")
            # 선수 방송국 링크 (영상 탭 5인)
            st_links = await page.eval_on_selector_all("#videoStations .st-links a", "e=>e.map(x=>x.href)")
            want_streams = []
            for key in ["doran", "kanavi", "showmaker", "smash", "delight"]:
                want_streams += PLAYER_STREAMS[key]
            check("video stations links", st_links == want_streams, st_links)

            # ---------- ③ LIVE NOW · 선수 방송 히어로 (/api/live) ----------
            check("live hero visible", await page.is_visible("#liveHero"))
            try:
                await page.wait_for_function(
                    "document.querySelectorAll('#liveHero .lh-card').length > 0", timeout=6000)
            except Exception:
                pass
            hero = await page.inner_text("#liveHero")
            check("live hero label", "LIVE NOW" in hero and "선수 방송" in hero, hero[:80])
            check("live hero title", "솔랭 빠짐없이 갑니다" in hero, hero[:120])
            check("live hero platform badge", "SOOP" in hero, hero[:120])
            check("live hero viewers", "4,820명 시청 중" in hero, hero[:160])
            check("live hero elapsed clock", bool(re.search(r"\d{2}:\d{2}", hero)), hero[:160])
            check("live hero watch button",
                  await page.get_attribute("#liveHero .lh-go", "href") == "https://ch.sooplive.co.kr/choi15778",
                  await page.get_attribute("#liveHero .lh-go", "href"))
            hero_thumb = await page.eval_on_selector("#liveHero .lh-thumb img", "e=>[e.complete, e.naturalWidth]")
            check("live hero thumbnail renders", hero_thumb and hero_thumb[1] > 0, hero_thumb)
            hero_off = await page.eval_on_selector_all("#liveHero .lh-off i:not(.is-live)", "e=>e.map(x=>x.textContent)")
            check("live hero shows offline players", hero_off == ["카나비", "쇼메이커", "스매쉬"], hero_off)
            check("live hero shows other live player", "딜라이트" in hero, hero[-80:])
            check("live hero auto-check label", "1분마다" in await page.inner_text("#liveHeroTimer"),
                  await page.inner_text("#liveHeroTimer"))
            await page.screenshot(path=str(OUT / "50-live-hero-ko.png"))

            # 전원 오프라인일 때: 컴팩트 오프라인 바 + 방송국 칩
            offline_body = {
                "ok": True, "at": "2026-11-27T09:00:00.000Z", "servedFrom": "test", "liveCount": 0,
                "players": {k: {"key": k, "live": False} for k in PLAYER_KEYS},
            }
            await page.route("**/api/live*", lambda route: route.fulfill(
                status=200, content_type="application/json", body=json.dumps(offline_body)))
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(700)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(500)
            off_text = await page.inner_text("#liveHero")
            check("offline hero message", "지금은 5명 모두 오프라인이에요" in off_text, off_text[:80])
            check("offline hero interval", "5분마다" in off_text and "5분마다" in await page.inner_text("#liveHeroTimer"), off_text[:120])
            check("offline hero station chips", await page.eval_on_selector_all("#liveHero .lh-chip", "e=>e.length") == 5,
                  await page.eval_on_selector_all("#liveHero .lh-chip", "e=>e.map(x=>x.textContent)"))
            check("offline hero has no live card", await page.eval_on_selector_all("#liveHero .lh-card", "e=>e.length") == 0)
            check("offline hero channel links",
                  (await page.eval_on_selector_all("#liveHero .lh-chip", "e=>e.map(x=>x.href)")) ==
                  ["https://ch.sooplive.co.kr/choi15778",
                   "https://chzzk.naver.com/e351edbd85f1ebf4eb975c21179a4c43",
                   "https://ch.sooplive.co.kr/showmakerr",
                   "https://ch.sooplive.co.kr/tlsrmawo",
                   "https://chzzk.naver.com/59dd654778e3d0b64f3ed06baece805d"],
                  await page.eval_on_selector_all("#liveHero .lh-chip", "e=>e.map(x=>x.href)"))
            await page.screenshot(path=str(OUT / "50-live-hero-offline-ko.png"))
            await page.unroute("**/api/live*")
            await page.reload(wait_until="networkidle")
            await page.wait_for_timeout(800)
            await page.click('[data-tab="video"]')
            await page.wait_for_timeout(600)

            onair_rows = await page.eval_on_selector_all("#videoStations .st-row.is-onair", "e=>e.length")
            check("live station rows", onair_rows == 2, onair_rows)
            check("live station badge", "LIVE" in await page.inner_text("#videoStations"))
            check("live stream title", "솔랭 빠짐없이 갑니다" in await page.inner_text("#videoStations"))
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
            check("en video tab", "Video archive" in video and "Official LCK" in video and "Player streams" in video, video[:120])
            check("en playlist section", "YouTube playlists" in video and "D plus KIA · Official" in video, video[:160])
            check("en category chips",
                  await page.eval_on_selector_all("#videoCats .chip", "e=>e.map(x=>x.textContent)") ==
                  ["All", "★ Saved 0", "Highlights", "Montage", "Interview & behind", "Shorts"])
            check("en champion chips",
                  (await page.eval_on_selector_all("#videoChampChips .tag-chip", "e=>e.map(x=>x.textContent)"))[:6] ==
                  ["#Ambessa", "#Gnar", "#Azir", "#Kai'Sa", "#LeBlanc", "#Jayce"])
            check("en video filters",
                  await page.eval_on_selector_all("#videoFilters .chip", "e=>e.map(x=>x.textContent)") ==
                  ["All", "Doran", "Kanavi", "ShowMaker", "Smash", "Delight"])
            check("en video vod card", "Recent official replays" in video)
            check("en dk youtube section", "Dplus KIA official YouTube" in video)
            check("en dk youtube note", "Dplus KIA YouTube" in await page.inner_text("#dkYtNote"),
                  await page.inner_text("#dkYtNote"))
            check("en archive hint", "Official channel playlists on top" in video)
            check("en search placeholder",
                  await page.get_attribute("#videoSearch", "placeholder") == "Search champion, event, keyword",
                  await page.get_attribute("#videoSearch", "placeholder"))
            check("en highlight tags", "Playoffs" in video or "Worlds" in video, video[:120])
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
            check("ja video tab", "ライブ・公式チャンネル" in ja_video and "動画アーカイブ" in ja_video and "LCK公式" in ja_video)
            check("ja category chips",
                  await page.eval_on_selector_all("#videoCats .chip", "e=>e.map(x=>x.textContent)") ==
                  ["すべて", "★お気に入り 0", "ハイライト", "マッドムービー", "インタビュー・舞台裏", "ショート"])
            check("ja dk youtube section", "Dplus KIA 公式YouTube" in ja_video)
            check("ja search placeholder",
                  await page.get_attribute("#videoSearch", "placeholder") == "チャンピオン・大会・キーワード検索")
            check("ja dk note", "YouTubeチャンネルから" in await page.inner_text("#dkYtNote"),
                  await page.inner_text("#dkYtNote"))
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
            check("zh video titles", "第4局" in zh_video and "视频档案" in zh_video, zh_video[:120])
            check("zh dk youtube section", "Dplus KIA 官方 YouTube" in zh_video)
            check("zh search placeholder",
                  await page.get_attribute("#videoSearch", "placeholder") == "搜索英雄、赛事、关键词")
            check("zh dk note", "Dplus KIA YouTube" in await page.inner_text("#dkYtNote"),
                  await page.inner_text("#dkYtNote"))
            check("zh highlight count", await page.inner_text("#videoCount") == f"{TOTAL_VIDEOS}支",
                  await page.inner_text("#videoCount"))
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
