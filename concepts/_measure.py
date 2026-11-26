import sys, asyncio, json
from playwright.async_api import async_playwright

async def main():
    src = sys.argv[1]
    sels = sys.argv[2].split('|')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=1)
        await pg.goto("file://"+src)
        await pg.wait_for_timeout(400)
        res = await pg.evaluate("""(sels)=>sels.map(s=>{const e=document.querySelector(s); if(!e) return [s,null]; const r=e.getBoundingClientRect(); return [s, {t:Math.round(r.top), b:Math.round(r.bottom), h:Math.round(r.height)}];})""", sels)
        for s, r in res: print(s, r)
        print("body scrollHeight", await pg.evaluate("document.body.scrollHeight"))
        await b.close()
asyncio.run(main())
