import sys, asyncio
from playwright.async_api import async_playwright

async def main():
    src, out = sys.argv[1], sys.argv[2]
    scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--force-color-profile=srgb","--font-render-hinting=none","--disable-lcd-text"])
        pg = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=scale)
        await pg.goto("file://"+src)
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=out, clip={"x":0,"y":0,"width":390,"height":844})
        await b.close()

asyncio.run(main())
