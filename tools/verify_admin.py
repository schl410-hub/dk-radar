"""딮기 관리자(/admin) 검증 — 디자인·집계·관리자 동작·메인 앱 한 줄 공지.

  LD_LIBRARY_PATH=/workspace/.libs/usr/lib/x86_64-linux-gnu \\
  PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers python3 tools/verify_admin.py

세 부분을 확인합니다.
  1) 화면: 잠금·PIN·대시보드 카드(구독자·7일·인기·언어·발송기록·공지·전체알림) 렌더링
     — /api/config GET 은 고정 응답, POST 는 가로채서 실제 발송 없이 요청 내용만 확인합니다.
  2) API: dev_server(메모리 저장소)에 구독을 심어 실제 집계·증감·공지 저장·점검 실행을 확인
  3) 메인 앱: 공지를 켜면 index.html 상단에 한 줄 공지가 뜨고, 끄면 사라지는지 확인

전체 알림(broadcast)은 dry 미리보기로만 호출합니다. 실제 기기로 나가는 발송은 하지 않습니다.
"""
import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request

from playwright.async_api import async_playwright

PORT = 8793
BASE = f"http://127.0.0.1:{PORT}"
PORT_EMPTY = 8794
BASE_EMPTY = f"http://127.0.0.1:{PORT_EMPTY}"
ROOT = pathlib.Path(__file__).resolve().parent.parent
PIN_HASH = "98cbd8bfd02876a7aabefc23e9cf760528b125688f06290512bef47d40c1fc45"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" · " + str(detail)) if detail and not ok else ""))


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def http_json(method, path, body=None, headers=None, timeout=20):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


def subscribe(n, solo, lang="", official=True, live=True):
    import base64
    endpoint = f"https://fcm.googleapis.com/wp/verify-admin-{n}"
    body = {
        "subscription": {"endpoint": endpoint,
                         "keys": {"p256dh": base64.b64encode(os.urandom(32)).decode().rstrip("="),
                                  "auth": base64.b64encode(os.urandom(8)).decode().rstrip("=")}},
        "prefs": {"solo": solo, "official": official, "live": live},
        "ua": "verify-admin",
    }
    if lang:
        body["lang"] = lang
    return http_json("POST", "/api/subscribe", body)


CONFIG = {
    "ok": True, "version": "3.10.0", "serverTime": "2026-11-28T12:30:27.000Z",
    "official": {"source": "lolesports"},
    "solo": {"source": "riot"},
    "push": {"ready": True, "publicKey": "test"},
    "store": {"backend": "redis", "durable": True},
    "check": {"secret": True, "lastRun": {
        "at": "2026-11-28T12:25:18.125Z", "tookMs": 3659, "dry": False, "pushed": 2, "pruned": 1,
        "targets": {"total": 441, "official": 421, "solo": 1095, "live": 435, "notice": 441},
        "pushReady": True,
        "official": {"status": "no_upcoming", "next": None, "pushes": []},
        "live": {"status": "checked", "liveCount": 1, "players": [
            {"key": "doran", "live": True, "was": False, "platform": "soop"},
            {"key": "kanavi", "live": False, "was": False, "platform": None},
            {"key": "showmaker", "live": False, "was": False, "platform": None},
            {"key": "smash", "live": False, "was": False, "platform": None},
            {"key": "delight", "live": False, "was": False, "platform": None}], "pushes": []},
        "ingame": {"status": "checked", "inGameCount": 1, "players": [
            {"key": "doran", "inGame": False, "was": False, "notified": False},
            {"key": "kanavi", "inGame": True, "was": False, "notified": False},
            {"key": "showmaker", "inGame": False, "was": False, "notified": False},
            {"key": "smash", "inGame": False, "was": False, "notified": False},
            {"key": "delight", "inGame": False, "was": False, "notified": False}], "pushes": []},
        "notices": {"status": "checked", "seeded": 0, "newCount": 0, "players": [
            {"key": "doran", "status": "ok", "titleNo": 202801017, "title": "T1 LoL 선수단 방송국 구독 안내"},
            {"key": "showmaker", "status": "ok", "titleNo": 213808933, "title": "11월 29일 방송공지"},
            {"key": "smash", "status": "ok", "titleNo": 183948431, "title": "[SOOP 구독 이어주기 관련 공지]"}], "pushes": []},
        "solo": {"status": "checked", "players": [
            {"key": "doran", "status": "ok", "latestId": "KR_8474642879", "isNew": False},
            {"key": "kanavi", "status": "ok", "latestId": "KR_8376541639", "isNew": False},
            {"key": "showmaker", "status": "ok", "latestId": "KR_8419501041", "isNew": False},
            {"key": "smash", "status": "ok", "latestId": "KR_8423352612", "isNew": False},
            {"key": "delight", "status": "ok", "latestId": "KR_8421721565", "isNew": False}], "pushes": []}
    }},
    "subsTotal": 441,
    "subs": {"total": 441, "official": 421, "live": 435, "notice": 441, "solo": 1095},
    "playerStats": [
        {"key": "doran", "name": "도란", "pos": "탑", "solo": 312, "ingame": 186},
        {"key": "kanavi", "name": "카나비", "pos": "정글", "solo": 186, "ingame": 64},
        {"key": "showmaker", "name": "쇼메이커", "pos": "미드", "solo": 251, "ingame": 121},
        {"key": "smash", "name": "스매쉬", "pos": "원딜", "solo": 214, "ingame": 98},
        {"key": "delight", "name": "딜라이트", "pos": "서폿", "solo": 132, "ingame": 41},
    ],
    "langStats": {"lang": ["ko", "en", "ja", "zh", "vi"],
                  "counts": {"ko": 236, "en": 92, "ja": 48, "zh": 27, "vi": 16, "unknown": 22},
                  "total": 441},
    "pushLog": [
        {"at": "2026-11-28T12:25:18.125Z", "type": "solo", "title": "도란 · 새 솔로랭크 경기", "sent": 118, "targets": 312},
        {"at": "2026-11-28T11:02:44.000Z", "type": "live", "title": "🔴 쇼메이커 · SOOP 방송 시작", "sent": 96, "targets": 435},
        {"at": "2026-11-28T09:41:02.000Z", "type": "ingame", "title": "🔴 카나비 · 게임 시작", "sent": 64, "targets": 186},
        {"at": "2026-11-28T07:00:12.000Z", "type": "notice", "title": "📢 도란 방송 공지: 11월 29일 방송공지", "sent": 441, "targets": 441},
        {"at": "2026-11-27T23:12:51.000Z", "type": "broadcast", "title": "DK vs T1 · 오늘 22시", "sent": 428, "targets": 436},
        {"at": "2026-11-27T20:31:07.000Z", "type": "solo", "title": "스매쉬 · 솔로랭크 2경기", "sent": 74, "targets": 214},
        {"at": "2026-11-27T18:20:33.000Z", "type": "official", "title": "DK 새 공식 경기 일정", "sent": 421, "targets": 421},
        {"at": "2026-11-27T14:05:19.000Z", "type": "live", "title": "🔴 딜라이트 · CHZZK 방송 시작", "sent": 51, "targets": 435},
        {"at": "2026-11-27T09:00:02.000Z", "type": "solo", "title": "쇼메이커 · 새 솔로랭크 경기", "sent": 103, "targets": 251},
        {"at": "2026-11-26T21:48:40.000Z", "type": "test", "title": "딮기 시그널 · 테스트 푸시", "sent": 1, "targets": 1},
    ],
    "daily": {"date": "2026-11-28", "baseline": 435, "current": 441, "delta": 6},
    "dailyDelta": 6,
    "dailyHistory": [
        {"date": "2026-11-22", "total": 398},
        {"date": "2026-11-23", "total": None},
        {"date": "2026-11-24", "total": 412},
        {"date": "2026-11-25", "total": 421},
        {"date": "2026-11-26", "total": None},
        {"date": "2026-11-27", "total": 435},
        {"date": "2026-11-28", "total": 441},
    ],
    "banner": {"enabled": True, "text": "오늘 22시 DK vs T1 · 응원 와 주세요", "updatedAt": "2026-11-28T10:00:00.000Z"},
}


def start_server(port=PORT):
    env = dict(os.environ)
    env["PORT"] = str(port)
    env.setdefault("DK_ALLOW_MEMORY_STORE", "1")
    env.setdefault("DK_FIXTURE", "none")
    env["PATH"] = os.path.dirname(node_bin()) + os.pathsep + env.get("PATH", "")
    env.pop("VAPID_PRIVATE_KEY", None)
    env.pop("VAPID_PUBLIC_KEY", None)
    proc = subprocess.Popen([node_bin(), str(ROOT / "tools" / "dev_server.js")], env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(150):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/admin", timeout=1)
            return proc
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("dev_server did not start")


async def unlock(page):
    for d in "1215":
        await page.click(f'.key[data-key="{d}"]')
        await page.wait_for_timeout(70)
    await page.wait_for_selector("#dash:not([hidden])", timeout=8000)


async def page_tests(browser):
    posts = []

    async def route_config(route):
        req = route.request
        if req.method == "POST":
            try:
                body = req.post_data_json
            except Exception:
                body = None
            posts.append({"body": body, "pin": req.headers.get("x-admin-pin", "")})
            action = (body or {}).get("action")
            if action == "runCheck":
                resp = {"ok": True, "action": "runCheck", "tookMs": 3210, "pushed": 1, "targets": {"total": 441},
                        "summary": {"tookMs": 3210, "pushed": 1, "dry": False, "targets": {"total": 441}}}
            elif action == "setBanner":
                resp = {"ok": True, "action": "setBanner",
                        "banner": {"enabled": bool((body or {}).get("enabled")), "text": (body or {}).get("text", ""),
                                   "updatedAt": "2026-11-28T13:00:00.000Z"}}
            elif action == "broadcast":
                resp = {"ok": True, "action": "broadcast", "dryRun": True, "targets": 441, "sent": 0}
            else:
                resp = {"ok": False, "error": "unknown_action"}
            await route.fulfill(status=200, content_type="application/json", body=json.dumps(resp))
            return
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(CONFIG))

    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, locale="ko-KR", timezone_id="Asia/Seoul",
        service_workers="block")
    page = await ctx.new_page()
    await page.route("**/api/config*", route_config)
    await page.goto(BASE + "/admin", wait_until="domcontentloaded")
    await page.wait_for_timeout(500)

    check("/admin 이 admin.html 로 열린다", await page.title() and "관리자" in await page.title(), await page.title())
    check("잠금 화면이 먼저 뜬다", await page.is_visible("#keypad"))
    check("대시보드는 처음에 숨겨져 있다", await page.is_hidden("#dash"))
    check("숫자 키패드 0~9 + 지우기 (11개)", await page.locator(".key[data-key]").count() == 11)
    check("PIN 자리 표시 4개", await page.locator("#pinDots i").count() == 4)
    check("manifest 링크 없음(WebAPK 덮어쓰기 방지)", await page.locator('link[rel="manifest"]').count() == 0,
          await page.locator('link[rel="manifest"]').count())
    check("admin.html 이 manifest-admin.json 을 참조하지 않는다",
          "manifest-admin.json" not in (await page.content()).split("<body")[0])
    check("테마 전환 버튼 없음(단일 민트 테마)", await page.locator("[data-theme], #themeBtn, .theme-btn").count() == 0)
    lock_bg = await page.evaluate("() => getComputedStyle(document.body).backgroundColor")
    key_color = await page.evaluate("() => getComputedStyle(document.querySelector('.key')).color")
    check("잠금 화면 글자가 민트 계열 밝은 색", key_color.startswith("rgb(234, 246, 243)"), key_color)

    # 잘못된 PIN
    for d in "1213":
        await page.click(f'.key[data-key="{d}"]')
    await page.wait_for_timeout(600)
    msg = (await page.text_content("#lockMsg") or "").strip()
    check("틀린 PIN 은 잠금을 풀지 않는다", await page.is_visible("#keypad") and "맞지 않아요" in msg, msg)
    check("틀린 뒤 자리 표시가 비워진다", await page.locator("#pinDots i.on").count() == 0)

    # 맞는 PIN
    await unlock(page)
    await page.wait_for_timeout(400)

    accent = await page.evaluate("() => getComputedStyle(document.getElementById('subTotal')).color")
    check("큰 숫자가 민트(#00F5C4)로 보인다", accent == "rgb(0, 245, 196)", accent)

    check("PIN 1215 로 대시보드가 열린다", await page.is_visible("#dash"))
    check("총 구독자 441", (await page.text_content("#subTotal")).strip() == "441", await page.text_content("#subTotal"))
    check("오늘 증감 배지 '오늘 +6명'", (await page.text_content("#subDelta")).strip() == "오늘 +6명",
          await page.text_content("#subDelta"))
    note = await page.text_content("#dailyNote")
    check("증감 기준(435 → 441) 안내", "435" in note and "441" in note, note)
    check("미니 합계 421/435/441/1,095",
          [(await page.text_content(f"#{i}")).strip() for i in ["subOfficial", "subLive", "subNotice", "subSolo"]]
          == ["421", "435", "441", "1,095"],
          [(await page.text_content(f"#{i}")).strip() for i in ["subOfficial", "subLive", "subNotice", "subSolo"]])

    # 7일 그래프
    cols = page.locator("#dailyChart .c7-col")
    check("최근 7일 막대 7개", await cols.count() == 7, await cols.count())
    check("기록 없는 날은 비어 있음(2일)", await page.locator("#dailyChart .c7-bar.none").count() == 2,
          await page.locator("#dailyChart .c7-bar.none").count())
    check("오늘 막대 강조", await page.locator("#dailyChart .c7-bar.today").count() == 1)
    vals = await page.locator("#dailyChart .c7-val").all_text_contents()
    check("7일 값 표기(398 · – · … · 441)", vals == ["398", "–", "412", "421", "–", "435", "441"], vals)
    widths = await page.evaluate(
        "() => Array.from(document.querySelectorAll('#dailyChart .c7-bar:not(.none)')).map(b => parseFloat(b.style.height))")
    check("막대 높이가 값에 따라 커진다", widths == sorted(widths) and widths[-1] > widths[0], widths)

    # 선수별 인기
    rows = page.locator("#rankList .rk-row")
    check("선수 5명 순위", await rows.count() == 5, await rows.count())
    names = await page.locator("#rankList .rk-name").all_text_contents()
    check("1위 도란", names[0].startswith("도란"), names)
    nums = await page.locator("#rankList .rk-num").all_text_contents()
    check("순위 숫자 내림차순", nums[0].startswith("312") and nums[1].startswith("251") and nums[4].startswith("132"), nums)
    bars = await page.evaluate("() => Array.from(document.querySelectorAll('#rankList .rk-bar i')).map(i => parseFloat(i.style.width))")
    check("비율 막대(1위 100%)", bars[0] == 100 and bars == sorted(bars, reverse=True), bars)
    check("인기 카드 태그에 총 픽 수", "1,095" in (await page.text_content("#rankTag")), await page.text_content("#rankTag"))

    # 언어별
    lrows = page.locator("#langList li")
    check("언어 5개 + 미기록 6줄", await lrows.count() == 6, await lrows.count())
    ko_text = await lrows.nth(0).text_content()
    check("KO 236명 · 54%", "KO" in ko_text and "236" in ko_text and "54%" in ko_text, ko_text)
    unk_text = await lrows.nth(5).text_content()
    check("미기록 구분 표시", "미기록" in unk_text and "22" in unk_text, unk_text)
    check("언어 비율 막대 5색 이상", await page.locator("#langBar i").count() >= 5,
          await page.locator("#langBar i").count())

    # 시스템
    check("마지막 점검 KST 21:25", "21:25" in (await page.text_content("#sysLast")), await page.text_content("#sysLast"))
    check("소요 시간 3.7초", "3.7초" in (await page.text_content("#sysTook")), await page.text_content("#sysTook"))
    check("저장소 Redis", "Redis" in (await page.text_content("#sysStore")))
    check("앱 버전 v3.10.0", "3.10.0" in (await page.text_content("#sysVersion")), await page.text_content("#sysVersion"))
    check("'지금 바로 점검' 버튼", await page.is_visible("#runCheckBtn") and
          "지금 바로 점검" in (await page.text_content("#runCheckBtn")))

    # 발송 기록
    logs = page.locator("#pushLog .plog-row")
    check("발송 기록 10건", await logs.count() == 10, await logs.count())
    first = await logs.nth(0).text_content()
    check("최신 기록: 시간·종류·제목·건수", "21:25" in first and "솔랭" in first and "도란" in first and "118" in first, first)
    types = await page.locator("#pushLog .ptype").all_text_contents()
    check("종류 라벨(솔랭·방송·인게임·공지·전체)", all(t in types for t in ["솔랭", "방송", "인게임", "공지", "전체"]), types)

    # 공지
    check("공지 문구가 입력칸에 채워짐", "DK vs T1" in (await page.input_value("#bannerText")), await page.input_value("#bannerText"))
    check("공지 스위치 켜짐", await page.is_checked("#bannerOn"))
    check("공지 상태 '표시 중'", (await page.text_content("#bannerState")).strip() == "표시 중")

    # 설치 안내가 본문 맨 아래
    pos = await page.evaluate("() => getComputedStyle(document.getElementById('installHint')).position")
    order = await page.evaluate("""() => {
        const hint = document.getElementById('installHint');
        const players = document.getElementById('playersList');
        return hint.offsetTop > players.offsetTop && hint.parentElement.className.indexOf('body') > -1;
    }""")
    check("설치 안내가 화면을 덮지 않는다(고정 아님)", pos == "static", pos)
    check("설치 안내가 본문 맨 아래에 있다", order)

    # 전체 알림: 빈 입력 → 모달 없음
    await page.click("#broadcastBtn")
    await page.wait_for_timeout(250)
    check("제목·내용이 비면 확인 창을 열지 않는다", await page.is_hidden("#confirmModal"))
    await page.fill("#pushTitle", "DK vs T1 · 오늘 22시")
    await page.fill("#pushBody", "경기 30분 전입니다. 놓치지 마세요!")
    await page.click("#broadcastBtn")
    await page.wait_for_selector("#confirmModal:not([hidden])", timeout=4000)
    ct = await page.text_content("#confirmText")
    check("확인 창에 '정말 전체 구독자 441명'", "정말 전체 구독자" in ct and "441" in ct, ct)
    check("확인 창에 보낼 내용 미리보기", "DK vs T1" in (await page.text_content("#confirmPreviewTitle")))
    await page.click("#confirmCancel")
    await page.wait_for_timeout(250)
    check("취소하면 발송하지 않는다", await page.is_hidden("#confirmModal") and not any(
        (p["body"] or {}).get("action") == "broadcast" for p in posts))

    await page.click("#broadcastBtn")
    await page.wait_for_selector("#confirmModal:not([hidden])", timeout=4000)
    await page.click("#confirmSend")
    await page.wait_for_timeout(900)
    bc = [p for p in posts if (p["body"] or {}).get("action") == "broadcast"]
    check("확인 후에만 broadcast 요청이 나간다", len(bc) == 1, len(bc))
    check("broadcast 요청에 제목·내용", bc and bc[0]["body"].get("title") == "DK vs T1 · 오늘 22시"
          and "놓치지 마세요" in (bc[0]["body"].get("body") or ""), bc and bc[0]["body"])
    check("관리자 요청에 PIN 해시 헤더", bc and bc[0]["pin"] == PIN_HASH, bc and bc[0]["pin"])
    check("발송 후 모달이 닫힌다", await page.is_hidden("#confirmModal"))
    toast = (await page.text_content("#toast") or "").strip()
    check("미리보기 안내 토스트", "미리보기" in toast or "발송" in toast, toast)

    # 공지 저장
    await page.fill("#bannerText", "12월 3일 DK vs BLG · 17시")
    await page.click("#bannerSave")
    await page.wait_for_timeout(800)
    sb = [p for p in posts if (p["body"] or {}).get("action") == "setBanner"]
    check("공지 저장 요청(setBanner)", len(sb) == 1 and sb[0]["body"].get("text").startswith("12월 3일"), sb and sb[0]["body"])
    check("공지 저장 요청에 enabled=true", sb and sb[0]["body"].get("enabled") is True, sb and sb[0]["body"])

    # 지금 바로 점검
    await page.click("#runCheckBtn")
    await page.wait_for_timeout(1200)
    rc = [p for p in posts if (p["body"] or {}).get("action") == "runCheck"]
    check("'지금 바로 점검' 이 runCheck 를 호출", len(rc) == 1, len(rc))
    note2 = await page.text_content("#runNote")
    check("점검 결과를 카드에 표시", "점검 완료" in (note2 or "") and "발송 1건" in (note2 or ""), note2)

    # 새로고침·잠금
    await page.click("#refreshBtn")
    await page.wait_for_timeout(500)
    check("새로고침 후에도 값 유지", (await page.text_content("#subTotal")).strip() == "441")
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_timeout(700)
    check("다시 열면 PIN 없이 대시보드", await page.is_visible("#dash") and await page.is_hidden("#keypad"))
    await page.click("#lockBtn")
    await page.wait_for_timeout(300)
    check("잠금 버튼이 키패드를 되돌린다", await page.is_visible("#keypad") and await page.is_hidden("#dash"))

    # 401 → 다시 잠금
    async def route_401(route):
        if route.request.method == "POST":
            await route.fulfill(status=401, content_type="application/json",
                                body=json.dumps({"ok": False, "error": "pin_required",
                                                 "message": "관리자 PIN 확인이 필요해요. 잠근 뒤 PIN 으로 다시 열어 주세요."}))
            return
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(CONFIG))

    page2 = await ctx.new_page()
    await page2.route("**/api/config*", route_401)
    await page2.goto(BASE + "/admin", wait_until="domcontentloaded")
    await page2.wait_for_timeout(400)
    await unlock(page2)
    await page2.wait_for_timeout(300)
    await page2.click("#runCheckBtn")
    await page2.wait_for_timeout(1600)
    check("PIN 이 맞지 않으면 다시 잠근다", await page2.is_visible("#keypad"))
    t2 = (await page2.text_content("#toast") or "").strip()
    check("PIN 확인 안내 토스트", "PIN" in t2, t2)

    await ctx.close()


async def no_admin_sw_tests(browser):
    """관리자 페이지가 서비스 워커(/admin-sw.js)를 등록하지 않는지 — 실제 SW 허용 컨텍스트에서 확인."""
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, locale="ko-KR", timezone_id="Asia/Seoul")
    page = await ctx.new_page()
    requested = []
    page.on("request", lambda r: requested.append(r.url))
    await page.goto(BASE + "/admin", wait_until="domcontentloaded")
    await page.wait_for_timeout(1200)
    regs = await page.evaluate(
        "() => navigator.serviceWorker.getRegistrations().then(r => r.map(x => "
        "((x.active || x.installing || x.waiting || {}).scriptURL) || ''))")
    check("관리자 페이지가 서비스 워커를 등록하지 않는다", regs == [], regs)
    check("admin-sw.js 를 요청하지 않는다", not any("admin-sw.js" in u for u in requested),
          [u for u in requested if "admin-sw" in u])
    man = await page.evaluate("() => document.querySelectorAll('link[rel=\"manifest\"]').length")
    check("브라우저가 볼 manifest 가 없다(SW 허용 상태)", man == 0, man)
    await ctx.close()


async def empty_state_tests(browser, base=BASE_EMPTY):
    """구독·기록이 하나도 없을 때의 빈 상태 (실제 API 응답 그대로)."""
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, locale="ko-KR", timezone_id="Asia/Seoul",
        service_workers="block")
    page = await ctx.new_page()
    await page.goto(base + "/admin", wait_until="domcontentloaded")
    await page.wait_for_timeout(400)
    await unlock(page)
    await page.wait_for_timeout(900)
    check("기록이 없으면 빈 상태 안내", await page.is_visible("#pushLogEmpty"))
    empty_text = await page.text_content("#pushLogEmpty")
    check("빈 상태 문구 그대로", "오늘 이후 나가는 알림부터 여기에 기록돼요" in empty_text, empty_text)
    check("선수 순위도 빈 상태 안내", "아직 집계된" in (await page.text_content("#rankList")),
          await page.text_content("#rankList"))
    check("오늘 증감은 숨김(구독 0)", await page.is_hidden("#subDelta"))
    check("언어는 집계 전", "집계 전" in (await page.text_content("#langTag")), await page.text_content("#langTag"))
    await ctx.close()


def api_tests():
    st, _ = subscribe(1, ["doran", "smash"], "ko")
    check("구독 1 저장", st == 200, st)
    subscribe(2, ["doran"], "ja")
    subscribe(3, [], "en")
    subscribe(4, ["showmaker", "doran"], "zh")
    subscribe(5, ["kanavi"], "vi")
    subscribe(6, ["smash"], "xx")  # 알 수 없는 언어 → unknown

    st, cfg = http_json("GET", "/api/config")
    check("config 200", st == 200 and cfg.get("ok") is True, st)
    check("구독 합계 6", cfg.get("subsTotal") == 6, cfg.get("subsTotal"))
    players = {p["key"]: p for p in cfg.get("playerStats", [])}
    check("선수별 집계(도란 3 · 스매쉬 2 · 카나비 1)",
          players["doran"]["solo"] == 3 and players["smash"]["solo"] == 2 and players["kanavi"]["solo"] == 1,
          {k: v["solo"] for k, v in players.items()})
    check("선수 이름·포지션 포함", players["delight"]["name"] == "딜라이트" and players["delight"]["pos"] == "서폿")
    counts = cfg["langStats"]["counts"]
    check("언어 분포(각 1 · 미기록 1)", counts == {"ko": 1, "en": 1, "ja": 1, "zh": 1, "vi": 1, "unknown": 1}, counts)
    check("집계에 총 기기 수", cfg["langStats"]["total"] == 6)
    check("오늘 기준값 = 6, 증감 0", cfg["daily"]["baseline"] == 6 and cfg["dailyDelta"] == 0, cfg.get("daily"))
    hist = cfg.get("dailyHistory", [])
    check("최근 7일 기록(7칸)", len(hist) == 7, len(hist))
    check("오늘 칸 = 6, 이전 날은 비어 있음", hist[-1]["total"] == 6 and all(h["total"] is None for h in hist[:-1]),
          [h["total"] for h in hist])
    check("발송 기록 없음", cfg.get("pushLog") == [])
    raw = json.dumps(cfg, ensure_ascii=False)
    check("응답에 endpoint·키가 없다", ("fcm.googleapis" not in raw) and ("p256dh" not in raw) and ("endpoint" not in raw))

    subscribe(7, ["delight"], "ko")
    st, cfg2 = http_json("GET", "/api/config")
    check("구독이 늘면 오늘 증감 +1", cfg2["dailyDelta"] == 1 and cfg2["daily"]["current"] == 7, cfg2.get("daily"))
    check("7일 그래프 오늘 칸도 7", cfg2["dailyHistory"][-1]["total"] == 7)

    st, bad = http_json("POST", "/api/config", {"action": "setBanner", "text": "x", "enabled": True})
    check("PIN 없이는 401", st == 401 and bad.get("error") == "pin_required", st)
    st, bad2 = http_json("POST", "/api/config", {"action": "setBanner", "text": "x", "enabled": True},
                         {"X-Admin-Pin": "b" * 64})
    check("틀린 PIN 해시는 401", st == 401, st)
    st, unk = http_json("POST", "/api/config", {"action": "nope"}, {"X-Admin-Pin": PIN_HASH})
    check("모르는 action 은 400", st == 400, st)

    st, saved = http_json("POST", "/api/config", {"action": "setBanner", "text": "오늘 22시 DK vs T1 응원 와 주세요", "enabled": True},
                          {"X-Admin-Pin": PIN_HASH})
    check("PIN 해시로 공지 저장", st == 200 and saved.get("banner", {}).get("enabled") is True, st)
    st, cfg3 = http_json("GET", "/api/config")
    check("GET 에 공지가 실린다", cfg3["banner"]["enabled"] and "DK vs T1" in cfg3["banner"]["text"], cfg3.get("banner"))
    check("공지 길이 제한(120자)", len(cfg3["banner"]["text"]) <= 120)

    # 전체 알림은 반드시 dry 로만
    st, bc = http_json("POST", "/api/config",
                       {"action": "broadcast", "title": "검증용 전체 알림", "body": "실제로 보내지 않습니다", "dry": True},
                       {"X-Admin-Pin": PIN_HASH})
    check("전체 알림 dry 미리보기", st == 200 and bc.get("dryRun") is True and bc.get("sent") == 0 and bc.get("targets") == 7,
          bc)
    st, cfg4 = http_json("GET", "/api/config")
    check("dry 발송은 기록을 남기지 않는다", cfg4.get("pushLog") == [], cfg4.get("pushLog"))

    # 지금 바로 점검 (공식 일정만 · 고정 픽스처라 외부 호출 없음)
    st, run = http_json("POST", "/api/config", {"action": "runCheck", "only": "official"}, {"X-Admin-Pin": PIN_HASH})
    check("관리자 점검 실행 200", st == 200 and run.get("action") == "runCheck", st)
    check("점검 요약 반환", bool(run.get("summary")) and "tookMs" in (run.get("summary") or {}))
    st, cfg5 = http_json("GET", "/api/config")
    check("점검 뒤 check.lastRun 갱신", bool(cfg5["check"] and cfg5["check"].get("lastRun")), cfg5["check"])
    check("점검 뒤에도 구독 수·오늘 증감 유지", cfg5["subsTotal"] == 7 and cfg5["daily"]["current"] == 7,
          [cfg5.get("subsTotal"), cfg5.get("daily")])

    # 언어가 바뀌면 갱신
    subscribe(2, ["doran"], "en")
    st, cfg6 = http_json("GET", "/api/config")
    check("언어 변경이 집계에 반영", cfg6["langStats"]["counts"]["en"] == 2 and cfg6["langStats"]["counts"]["ja"] == 0,
          cfg6["langStats"]["counts"])

    # 메인 앱 한 줄 공지
    st, off = http_json("POST", "/api/config", {"action": "setBanner", "text": "", "enabled": False},
                        {"X-Admin-Pin": PIN_HASH})
    check("공지 끄기", st == 200 and off.get("banner", {}).get("enabled") is False, st)


async def main_app_tests(browser):
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, locale="ko-KR", timezone_id="Asia/Seoul",
        service_workers="block")
    page = await ctx.new_page()
    await page.goto(BASE + "/", wait_until="networkidle")
    await page.wait_for_timeout(900)
    check("공지가 꺼져 있으면 배너 없음", await page.is_hidden("#lineNotice"))

    http_json("POST", "/api/config", {"action": "setBanner", "text": "오늘 22시 DK vs T1 · 응원 와 주세요", "enabled": True},
              {"X-Admin-Pin": PIN_HASH})
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(1100)
    check("공지를 켜면 메인 상단에 한 줄 공지", await page.is_visible("#lineNotice"))
    txt = (await page.text_content("#lineNoticeText") or "").strip()
    check("공지 문구 그대로 표시", txt == "오늘 22시 DK vs T1 · 응원 와 주세요", txt)
    box = await page.locator("#lineNotice").bounding_box()
    check("공지가 화면 맨 위(헤더 아래)에 붙는다", box and box["y"] < 260, box)
    check("한 줄로 말줄임 처리", await page.evaluate(
        "() => getComputedStyle(document.querySelector('#lineNoticeText')).textOverflow") == "ellipsis")

    http_json("POST", "/api/config", {"action": "setBanner", "text": "오늘 22시 DK vs T1 · 응원 와 주세요", "enabled": False},
              {"X-Admin-Pin": PIN_HASH})
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(900)
    check("공지를 끄면 다시 사라진다", await page.is_hidden("#lineNotice"))
    await ctx.close()


def source_tests():
    css = (ROOT / "admin.css").read_text(encoding="utf-8")
    check("관리자 CSS 에 앰버 색이 남아 있지 않다", "FFC24B" not in css.upper() and "FF9F1C" not in css.upper())
    check("관리자 CSS 가 민트(#00F5C4)를 쓴다", "#00F5C4" in css)
    check("관리자 CSS 팔레트가 메인 앱과 같다", "--bg: #05090F" in css and "--ink: #EAF6F3" in css)
    check("설치 안내가 fixed 가 아니다", ".install-hint" in css and "position: fixed" not in
          css.split(".install-hint {")[1].split("}")[0])

    html = (ROOT / "admin.html").read_text(encoding="utf-8")
    check("admin.html 에 테마 전환 버튼이 없다", "data-theme" not in html and "themeBtn" not in html and "테마 전환" not in html)
    check("admin.html 이 설치 안내를 본문 안에 둔다", html.index('id="installHint"') > html.index('id="playersList"'))
    check("admin.html 에 관리자 외 정보 없음", "schl410" not in html)
    check("admin.html 에 manifest 링크가 없다", '<link rel="manifest"' not in html)
    check("admin.html 이 manifest-admin.json 을 참조하지 않는다", "manifest-admin.json" not in html)
    check("설치 안내가 '홈 화면에 추가(바로가기)' · 별도 아이콘 안내",
          "홈 화면에 추가(바로가기)" in html and "별도 아이콘" in html and "기존 딮기 시그널 앱" in html)
    js = (ROOT / "admin.js").read_text(encoding="utf-8")
    check("admin.js 가 admin-sw.js 를 등록하지 않는다", "serviceWorker.register" not in js and "register('/admin-sw.js'" not in js)
    check("admin.js 가 남은 admin-sw 등록을 해제한다",
          "getRegistrations" in js and "unregister()" in js and "/admin-sw.js" in js)
    check("admin.html 인라인으로도 admin-sw 를 해제한다",
          "unregister()" in html and "getRegistrations" in html)

    icon_svg = (ROOT / "icons" / "admin-icon.svg").read_text(encoding="utf-8")
    check("아이콘이 민트색", "#00F5C4" in icon_svg)
    check("아이콘에 ADMIN 표기", "ADMIN" in icon_svg)
    check("아이콘에 방패", icon_svg.count("M256 98") >= 1)
    gen = (ROOT / "tools" / "make_admin_icons.py").read_text(encoding="utf-8")
    check("아이콘 생성기도 민트·방패·ADMIN", "MINT" in gen and "M256 98" in gen and "ADMIN" in gen)
    man = json.loads((ROOT / "manifest-admin.json").read_text(encoding="utf-8"))
    check("manifest start_url=/admin", man["start_url"] == "/admin")
    check("manifest id=/admin", man.get("id") == "/admin")
    check("manifest 테마색이 검정", man["theme_color"].upper() == "#05090F", man["theme_color"])
    for f in ["icons/admin-192.png", "icons/admin-512.png", "icons/admin-maskable-512.png", "icons/admin-icon.svg"]:
        check(f"{f} 존재", (ROOT / f).exists())

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    check("메인 sw.js 가 /admin 을 가로채지 않는다", "'/admin'" in sw)
    check("메인 sw.js 캐시 버전 올림", "dk-signal-v18" in sw)
    check("메인 페이지에 관리자 링크 없음", "admin" not in (ROOT / "index.html").read_text(encoding="utf-8").lower())

    main_man = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    tab_labels = dict(re.findall(r'data-i18n="tab\.(\w+)">([^<]+)</span>',
                                 (ROOT / "index.html").read_text(encoding="utf-8")))
    check("메인 manifest 숏컷 4개", len(main_man.get("shortcuts", [])) == 4, main_man.get("shortcuts"))
    check("숏컷 이름이 탭 이름과 같다(캘린더·영상·경기로그·기록실)",
          [s.get("name") for s in main_man.get("shortcuts", [])]
          == [tab_labels.get(k) for k in ["official", "video", "solo", "records"]],
          [s.get("name") for s in main_man.get("shortcuts", [])])
    check("숏컷 첫 항목이 '캘린더'(옛 '공식일정' 아님)",
          (main_man.get("shortcuts") or [{}])[0].get("name") == "캘린더",
          (main_man.get("shortcuts") or [{}])[0].get("name"))
    check("manifest.webmanifest 도 같은 숏컷 이름",
          [s.get("name") for s in json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))["shortcuts"]]
          == [s.get("name") for s in main_man.get("shortcuts", [])])

    cfg = (ROOT / "api" / "config.js").read_text(encoding="utf-8")
    check("config.js 는 기존 파일을 확장만 한다", cfg.count("module.exports") == 1 and "exports.runCheck" not in cfg)
    check("PIN 은 해시로만 비교", "PIN_HASH" in cfg and "safeEqual" in cfg)
    chk = (ROOT / "api" / "check.js").read_text(encoding="utf-8")
    check("check.js 가 실제 발송만 기록", "if (sent.length)" in chk and "pushlog.record" in chk)
    check("check.js 가 7일 통계를 갱신", "stats.observe" in chk)
    sub = (ROOT / "api" / "subscribe.js").read_text(encoding="utf-8")
    check("subscribe 가 lang 을 저장", "existing.lang = lang" in sub and "row.lang = lang" in sub)
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    check("메인 앱이 lang 을 함께 보낸다", "lang: lang()" in app)
    check("메인 앱이 공지를 그린다", "renderLineNotice" in app)

    api_files = sorted(p.name for p in (ROOT / "api").glob("*.js"))
    check("API 함수 파일 8개 그대로(새 파일 없음)", len(api_files) == 8, api_files)
    check("api/_lib 에만 새 모듈을 둔다",
          (ROOT / "api" / "_lib" / "stats.js").exists() and (ROOT / "api" / "_lib" / "pushlog.js").exists())
    vj = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    check("vercel.json 함수 설정 8개(config 포함)", len(vj["functions"]) == 8, list(vj["functions"]))
    check("config.js 함수 시간 제한 60초", vj["functions"].get("api/config.js", {}).get("maxDuration") == 60)
    check("/admin rewrite 유지", any(r.get("source") == "/admin" for r in vj.get("rewrites", [])))


async def main():
    proc = start_server()
    proc_empty = start_server(PORT_EMPTY)
    try:
        source_tests()

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            # 빈 저장소 상태를 먼저 본다 (아래 api_tests 가 구독을 심습니다)
            await empty_state_tests(browser)
            await no_admin_sw_tests(browser)
            await page_tests(browser)
            await browser.close()

        api_tests()

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            await main_app_tests(browser)
            await browser.close()
    finally:
        proc.terminate()
        proc_empty.terminate()

    ok = sum(1 for _, o, _ in results if o)
    print(f"\n{ok}/{len(results)} checks passed")
    if ok != len(results):
        raise SystemExit(1)


asyncio.run(main())
