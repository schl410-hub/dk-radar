"""딮기 시그널 안드로이드 숏컷 아이콘 4종 + 미리보기 시안 생성.

홈 화면 앱 아이콘을 길게 눌렀을 때 뜨는 숏컷(캘린더·영상·경기로그·기록실)의
앞 아이콘이 하얀 네모로 보이는 문제를 없애기 위한 192x192 PNG 4종을 만듭니다.
글리프는 index.html 탭 바의 SVG 와 같은 모양·같은 민트(#00F5C4)를 씁니다.

  PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers python3 tools/make_shortcut_icons.py

만드는 파일
  icons/shortcut-calendar-192.png
  icons/shortcut-video-192.png
  icons/shortcut-solo-192.png
  icons/shortcut-records-192.png
  downloads/dk-signal-v3/shortcut-icons-preview.png  (갤럭시 숏컷 팝업 느낌 시안)
"""
import asyncio
import base64
import pathlib

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
SHOTS = pathlib.Path("/workspace/downloads/dk-signal-v3")
TMP = ROOT / ".icon-build"
FONT = ROOT / "fonts" / "pretendard-subset.woff2"

MINT = "#00F5C4"
DARK = "#05090F"

# index.html 탭 바와 같은 24x24 글리프
GLYPHS = {
    "calendar": (
        '<rect x="3.5" y="5" width="17" height="15" rx="3"/>'
        '<path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
        1.7,
    ),
    "video": (
        '<rect x="3.2" y="5.6" width="17.6" height="12.8" rx="3.2"/>'
        '<path d="M10.3 9.4v5.2l4.3-2.6-4.3-2.6Z" fill="currentColor"/>',
        1.7,
    ),
    "solo": (
        '<path d="M4 19.5V13M9.3 19.5V8.5M14.7 19.5v-7M20 19.5V5"/>',
        2,
    ),
    "records": (
        '<path d="M8 4h8v2.5a4 4 0 0 1-8 0V4z"/>'
        '<path d="M8 5H5v1.5A3.5 3.5 0 0 0 8.5 10M16 5h3v1.5A3.5 3.5 0 0 1 15.5 10"/>'
        '<path d="M12 10.5V15M9 19.5h6M10.5 15h3l.6 4.5h-4.2L10.5 15z"/>',
        1.7,
    ),
}

NAMES = {
    "calendar": ("캘린더", "shortcut-calendar-192.png"),
    "video": ("영상", "shortcut-video-192.png"),
    "solo": ("경기로그", "shortcut-solo-192.png"),
    "records": ("기록실", "shortcut-records-192.png"),
}


def tile_svg(key: str, size: int = 192) -> str:
    body, width = GLYPHS[key]
    pad = size * 0.25
    scale = (size - pad * 2) / 24
    radius = size * 0.23
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:{size}px;height:{size}px;background:transparent}}
</style></head><body>
<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0C2430"/>
      <stop offset="1" stop-color="{DARK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.15" r="0.9">
      <stop offset="0" stop-color="{MINT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="{MINT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="{size}" height="{size}" rx="{radius}" fill="url(#bg)"/>
  <rect x="0" y="0" width="{size}" height="{size}" rx="{radius}" fill="url(#glow)"/>
  <rect x="1" y="1" width="{size-2}" height="{size-2}" rx="{radius-1}"
        fill="none" stroke="{MINT}" stroke-opacity="0.45" stroke-width="{max(2, size/64)}"/>
  <g transform="translate({pad},{pad}) scale({scale})" fill="none" stroke="{MINT}"
     stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" color="{MINT}">
     {body}
  </g>
</svg></body></html>"""


def popup_html(before: bool) -> str:
    """갤럭시(One UI) 홈 화면 아이콘 길게 누르기 팝업 느낌."""
    rows = []
    for key in ["calendar", "video", "solo", "records"]:
        label = NAMES[key][0]
        if before:
            icon = '<span class="si si-empty"></span>'
        else:
            data = base64.b64encode((ICONS / NAMES[key][1]).read_bytes()).decode()
            icon = f'<span class="si"><img src="data:image/png;base64,{data}" alt=""></span>'
        rows.append(f'<div class="sc-row">{icon}<span class="sc-label">{label}</span></div>')
    app_icon = base64.b64encode((ICONS / "icon-192.png").read_bytes()).decode()
    return f"""
    <div class="panel">
      <div class="panel-title">{'지금 (아이콘 없음 → 흰 네모)' if before else '적용 후 (민트 아이콘 4종)'}</div>
      <div class="popup {'old' if before else 'new'}">
        <div class="pu-head">
          <img class="pu-app" src="data:image/png;base64,{app_icon}" alt="">
          <div class="pu-name">딮기 시그널</div>
        </div>
        <div class="pu-actions">
          <div class="act"><span class="bubble">i</span><span>앱 정보</span></div>
          <div class="act"><span class="bubble">✎</span><span>앱 수정</span></div>
          <div class="act"><span class="bubble">🗑</span><span>앱 삭제</span></div>
        </div>
        <div class="pu-div"></div>
        <div class="pu-list">{''.join(rows)}</div>
      </div>
    </div>"""


def preview_html() -> str:
    font = base64.b64encode(FONT.read_bytes()).decode() if FONT.exists() else ""
    strip = []
    for key in ["calendar", "video", "solo", "records"]:
        label, fn = NAMES[key]
        data = base64.b64encode((ICONS / fn).read_bytes()).decode()
        strip.append(f'<div class="chip"><img src="data:image/png;base64,{data}" alt="">'
                     f'<b>{label}</b><code>icons/{fn}</code></div>')
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{{font-family:P;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:100 900}}
*{{box-sizing:border-box}}
body{{margin:0;width:1180px;padding:44px 48px 40px;background:#0A0F14;color:#EAF6F3;
     font-family:P,'Apple SD Gothic Neo',sans-serif}}
h1{{margin:0 0 6px;font-size:34px;letter-spacing:-.5px}}
h1 em{{color:{MINT};font-style:normal}}
.sub{{margin:0 0 28px;font-size:17px;color:#8FA6A0;line-height:1.5}}
.row{{display:flex;gap:28px}}
.panel{{flex:1}}
.panel-title{{font-size:16px;font-weight:700;color:#9FB6B0;margin:0 0 12px;letter-spacing:.2px}}
.popup{{border-radius:30px;padding:22px 20px 18px;box-shadow:0 18px 40px rgba(0,0,0,.45)}}
.popup.old{{background:#1B1C1E;border:1px solid #2A2C2F}}
.popup.new{{background:linear-gradient(180deg,#12222A,#0C1418);border:1px solid rgba(0,245,196,.35)}}
.pu-head{{display:flex;align-items:center;gap:14px;margin-bottom:18px}}
.pu-app{{width:58px;height:58px;border-radius:16px}}
.pu-name{{font-size:21px;font-weight:700}}
.pu-actions{{display:flex;gap:26px;justify-content:center;margin-bottom:16px}}
.act{{display:flex;flex-direction:column;align-items:center;gap:7px;font-size:13px;color:#B9C7C3}}
.bubble{{width:48px;height:48px;border-radius:50%;background:#2B2D30;display:flex;align-items:center;
        justify-content:center;font-size:19px}}
.new .bubble{{background:rgba(0,245,196,.14);color:{MINT}}}
.pu-div{{height:1px;background:#2E3134;margin:0 2px 8px}}
.pu-list{{display:flex;flex-direction:column}}
.sc-row{{display:flex;align-items:center;gap:16px;padding:13px 6px}}
.sc-label{{font-size:19px;font-weight:600}}
.si{{width:44px;height:44px;border-radius:13px;overflow:hidden;display:block;flex:0 0 auto}}
.si img{{width:100%;height:100%;display:block}}
.si-empty{{background:#F2F3F4;border-radius:12px}}
.chips{{display:flex;gap:22px;margin-top:34px;padding-top:26px;border-top:1px solid #1D2A31}}
.chip{{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px}}
.chip img{{width:92px;height:92px;border-radius:20px}}
.chip b{{font-size:16px}}
.chip code{{font-size:11.5px;color:#7E938E}}
.note{{margin-top:26px;font-size:14px;color:#8FA6A0;line-height:1.6}}
.note b{{color:#CFEDE6}}
</style></head><body>
<h1>딮기 시그널 · 홈 화면 <em>숏컷 아이콘</em> 시안</h1>
<p class="sub">앱 아이콘을 길게 눌렀을 때 나오는 숏컷 4개 앞의 <b style="color:#EAF6F3">흰 네모</b>를 민트 아이콘으로 바꾸는 안입니다. (아직 배포 전 · 승인 후 manifest 에 연결)</p>
<div class="row">{popup_html(True)}{popup_html(False)}</div>
<div class="chips">{''.join(strip)}</div>
<p class="note">· 크기 <b>192×192 PNG</b>, 배경은 앱과 같은 딥네이비(#05090F) + 민트 테두리, 글리프는 앱 탭 바와 같은 모양이라 홈·탭과 이어져 보입니다.<br>
· 이름은 <b>캘린더 · 영상 · 경기로그 · 기록실</b>(앱 탭 이름과 동일). 숏컷 이름의 옛 '공식일정'은 '캘린더'로 이미 정정했습니다.</p>
</body></html>"""


async def main():
    ICONS.mkdir(exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--force-color-profile=srgb", "--disable-gpu"])

        for key in NAMES:
            html_path = TMP / f"shortcut-{key}.html"
            html_path.write_text(tile_svg(key), encoding="utf-8")
            page = await browser.new_page(viewport={"width": 192, "height": 192}, device_scale_factor=1)
            await page.goto("file://" + str(html_path))
            await page.wait_for_timeout(120)
            await page.screenshot(path=str(ICONS / NAMES[key][1]), omit_background=True)
            await page.close()

        pv = TMP / "shortcut-preview.html"
        pv.write_text(preview_html(), encoding="utf-8")
        page = await browser.new_page(viewport={"width": 1180, "height": 900}, device_scale_factor=2)
        await page.goto("file://" + str(pv))
        await page.wait_for_timeout(400)
        height = await page.evaluate("Math.ceil(document.body.getBoundingClientRect().height)")
        await page.set_viewport_size({"width": 1180, "height": height})
        await page.wait_for_timeout(200)
        await page.screenshot(path=str(SHOTS / "shortcut-icons-preview.png"))
        await page.close()
        await browser.close()

    for key in NAMES:
        print("icon", ICONS / NAMES[key][1])
    print("preview", SHOTS / "shortcut-icons-preview.png")


asyncio.run(main())
