"""딮기 관리자(DK Admin) PWA 아이콘 생성.

메인 '딮기 시그널' 아이콘과 같은 검정 + 민트 팔레트를 쓰되,
방패 · 열쇠 구멍 · 'ADMIN' 표기로 관리자 앱임을 분명히 합니다.

  PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers python3 tools/make_admin_icons.py

만드는 파일
  icons/admin-icon.svg
  icons/admin-192.png
  icons/admin-512.png
  icons/admin-maskable-512.png
"""
import asyncio
import base64
import pathlib

from PIL import Image
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
TMP = ROOT / ".icon-build"
FONT = ROOT / "fonts" / "pretendard-subset.woff2"

MINT = "#00F5C4"
MINT_2 = "#00C49A"
MINT_LIGHT = "#7CFFE4"


def font_face():
    if not FONT.exists():
        return ""
    b64 = base64.b64encode(FONT.read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:'Pretendard';font-style:normal;font-weight:45 920;"
        f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
    )


def icon_svg(inner_ratio=1.0, rounded=True):
    radius = 116 if rounded else 0
    scale = inner_ratio
    body = f"""
  <g transform="translate(256 256) scale({scale:.4f}) translate(-256 -256)">
    <path d="M256 98 L382 149 V268 C382 340 322 392 256 416 C190 392 130 340 130 268 V149 Z"
          fill="rgba(0,245,196,.09)" stroke="url(#mint)" stroke-width="13" stroke-linejoin="round"/>
    <path d="M256 98 L382 149 V268 C382 340 322 392 256 416 C190 392 130 340 130 268 V149 Z"
          fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2" stroke-linejoin="round"
          transform="translate(0 3)"/>
    <circle cx="256" cy="232" r="27" fill="url(#mint)"/>
    <path d="M244 250 h24 l7 58 a19 19 0 0 1 -38 0 Z" fill="url(#mint)"/>
    <text x="256" y="470" text-anchor="middle" fill="{MINT}"
          font-family="Pretendard, Liberation Sans, Arial, sans-serif"
          font-size="33" font-weight="700" letter-spacing="9">ADMIN</text>
  </g>"""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="#0A131C"/>
      <stop offset="0.55" stop-color="#070D15"/>
      <stop offset="1" stop-color="#04070B"/>
    </linearGradient>
    <radialGradient id="glow" cx="86%" cy="-8%" r="82%">
      <stop offset="0" stop-color="{MINT}" stop-opacity=".26"/>
      <stop offset="1" stop-color="{MINT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mint" x1="130" y1="98" x2="382" y2="416" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{MINT_LIGHT}"/>
      <stop offset="0.5" stop-color="{MINT}"/>
      <stop offset="1" stop-color="{MINT_2}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="{radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="{radius}" fill="url(#glow)"/>
  <g fill="none" stroke="{MINT}" stroke-opacity=".14">
    <circle cx="256" cy="300" r="168" stroke-width="3"/>
    <circle cx="256" cy="300" r="214" stroke-width="2"/>
  </g>
  {body}
</svg>"""


def page_html(svg):
    return (
        "<!doctype html><html><head><meta charset='utf-8'><style>"
        + font_face()
        + "html,body{margin:0;width:512px;height:512px;background:transparent;overflow:hidden}"
        "svg{display:block}</style></head><body>" + svg + "</body></html>"
    )


async def render(svg, out):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=2)
        await pg.set_content(page_html(svg))
        await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": 512, "height": 512}, omit_background=True)
        await b.close()


def resize(src, size, dest):
    im = Image.open(src).convert("RGBA")
    im.resize((size * 2, size * 2), Image.LANCZOS).resize((size, size), Image.LANCZOS).save(dest, optimize=True)


async def main():
    ICONS.mkdir(exist_ok=True)
    TMP.mkdir(exist_ok=True)

    main_svg = icon_svg(1.0, rounded=True)
    mask_svg = icon_svg(0.78, rounded=False)
    (ICONS / "admin-icon.svg").write_text(main_svg, encoding="utf-8")

    await render(main_svg, TMP / "admin.png")
    await render(mask_svg, TMP / "admin-mask.png")

    resize(TMP / "admin.png", 512, ICONS / "admin-512.png")
    resize(TMP / "admin.png", 192, ICONS / "admin-192.png")
    resize(TMP / "admin-mask.png", 512, ICONS / "admin-maskable-512.png")
    print("admin icons written:", sorted(p.name for p in ICONS.glob("admin-*.png")))


asyncio.run(main())
