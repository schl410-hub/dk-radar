"""딮기 시그널 앱 아이콘 생성.

디플러스 기아 공식 로고(logo/dpluskia.svg)를 다크 배경 위 화이트로 얹어
PWA 아이콘(192/512/maskable/apple-touch/favicon/badge)과 icon.svg 를 만듭니다.
Playwright(Chromium)로 렌더링한 뒤 Pillow로 리사이즈합니다.

  PLAYWRIGHT_BROWSERS_PATH=/workspace/.pw-browsers python3 tools/make_icons.py
"""
import asyncio
import pathlib
import re

from PIL import Image
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOGO = ROOT / "logo" / "dpluskia.svg"
ICONS = ROOT / "icons"
TMP = ROOT / ".icon-build"

DARK = "#05090F"
MINT = "#00F5C4"


def logo_paths():
    svg = LOGO.read_text(encoding="utf-8")
    paths = re.findall(r"<path\b[^>]*?d=\"([^\"]+)\"[^>]*?/?>", svg, re.S)
    clean = [re.sub(r"\s+", " ", p).strip() for p in paths]
    assert len(clean) == 3, f"expected 3 logo paths, got {len(clean)}"
    return clean


def tile_svg(width_ratio=0.66, rounded=True, bg_rings=True, monogram=None):
    """512 사각 아이콘 SVG."""
    paths = logo_paths()
    s = (512 * width_ratio) / 484.0
    logo_w, logo_h = 484 * s, 205 * s
    tx, ty = (512 - logo_w) / 2, (512 - logo_h) / 2
    radius = 116 if rounded else 0
    ring = ""
    if bg_rings:
        ring = (
            '<g fill="none" stroke="#00F5C4" stroke-opacity=".16">'
            '<circle cx="256" cy="300" r="150" stroke-width="3"/>'
            '<circle cx="256" cy="300" r="205" stroke-width="2"/>'
            "</g>"
        )
    if monogram:
        body = (
            f'<text x="256" y="256" fill="#FFFFFF" font-family="Pretendard, sans-serif" '
            f'font-size="236" font-weight="800" text-anchor="middle" dominant-baseline="central" '
            f'letter-spacing="-8">{monogram}</text>'
        )
    else:
        body = (
            f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})" fill="#FFFFFF">'
            + "".join(f'<path d="{p}"/>' for p in paths)
            + "</g>"
        )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="glow" cx="86%" cy="-8%" r="82%">
      <stop offset="0" stop-color="{MINT}" stop-opacity=".26"/>
      <stop offset="1" stop-color="{MINT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#0A131C"/>
      <stop offset="1" stop-color="{DARK}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="{radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="{radius}" fill="url(#glow)"/>
  {ring}
  {body}
</svg>"""


def page_html(svg, bg="transparent"):
    return (
        "<!doctype html><html><head><meta charset='utf-8'><style>"
        f"html,body{{margin:0;width:512px;height:512px;background:{bg};overflow:hidden}}"
        "svg{display:block}</style></head><body>" + svg + "</body></html>"
    )


async def render(svg, out, bg="transparent"):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=2)
        await pg.set_content(page_html(svg, bg))
        await pg.wait_for_timeout(120)
        await pg.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": 512, "height": 512}, omit_background=(bg == "transparent"))
        await b.close()


def resize(src, size, dest):
    im = Image.open(src).convert("RGBA")
    im.resize((size * 2, size * 2), Image.LANCZOS).resize((size, size), Image.LANCZOS).save(dest, optimize=True)


async def main():
    ICONS.mkdir(exist_ok=True)
    TMP.mkdir(exist_ok=True)

    main_svg = tile_svg(0.66, rounded=True)
    mask_svg = tile_svg(0.52, rounded=False)
    mono_svg = tile_svg(0.0, rounded=True, bg_rings=False, monogram="DK")
    badge_svg = tile_svg(0.0, rounded=False, bg_rings=False, monogram="DK")

    (ICONS / "icon.svg").write_text(main_svg, encoding="utf-8")

    shots = {
        "main": (main_svg, "transparent"),
        "mask": (mask_svg, "transparent"),
        "mono": (mono_svg, "transparent"),
        "badge": (badge_svg, "transparent"),
    }
    for name, (svg, bg) in shots.items():
        await render(svg, TMP / f"{name}.png", bg)

    resize(TMP / "main.png", 512, ICONS / "icon-512.png")
    resize(TMP / "main.png", 192, ICONS / "icon-192.png")
    resize(TMP / "main.png", 180, ICONS / "apple-touch-icon.png")
    resize(TMP / "main.png", 32, ICONS / "favicon-32.png")
    resize(TMP / "mask.png", 512, ICONS / "icon-maskable-512.png")
    resize(TMP / "badge.png", 96, ICONS / "badge-96.png")
    print("icons written:", sorted(p.name for p in ICONS.glob("*.png")))


asyncio.run(main())
