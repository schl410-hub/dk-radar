"""단일 파일 프리뷰 빌드 (CSS/JS/폰트/로고/아이콘 인라인).
htmlpreview 같은 정적 뷰어에서 바로 렌더되도록 만든 보조 산출물입니다.
"""
import base64
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
desktop = (root / 'desktop.css').read_text(encoding='utf-8')
langmenu = (root / 'langmenu.css').read_text(encoding='utf-8')
thai_css = (root / 'fonts/notothai.css').read_text(encoding='utf-8')
i18n = (root / 'i18n.js').read_text(encoding='utf-8')
data = (root / 'data.js').read_text(encoding='utf-8')
app = (root / 'app.js').read_text(encoding='utf-8')

font = base64.b64encode((root / 'fonts/pretendard-subset.woff2').read_bytes()).decode()
thai_font = base64.b64encode((root / 'fonts/notosansthai.woff2').read_bytes()).decode()
logo = base64.b64encode((root / 'logo/dpluskia.svg').read_bytes()).decode()
icon = base64.b64encode((root / 'icons/icon-192.png').read_bytes()).decode()
badge = base64.b64encode((root / 'icons/badge-96.png').read_bytes()).decode()

css = css.replace("url('./fonts/pretendard-subset.woff2')",
                  "url('data:font/woff2;base64,%s')" % font)
thai_css = thai_css.replace("url('./notosansthai.woff2')",
                            "url('data:font/woff2;base64,%s')" % thai_font)
data = data.replace("'./icons/icon-192.png'", "'data:image/png;base64,%s'" % icon)
data = data.replace("'./icons/badge-96.png'", "'data:image/png;base64,%s'" % badge)
app = app.replace("'./icons/icon-192.png'", "'data:image/png;base64,%s'" % icon)
app = app.replace("'./icons/badge-96.png'", "'data:image/png;base64,%s'" % badge)

html = html.replace('<link rel="stylesheet" href="./styles.css">',
                    '<style>\n' + css + '\n</style>')
html = html.replace('<link rel="stylesheet" href="./desktop.css">',
                    '<style>\n' + desktop + '\n</style>')
html = html.replace('<link rel="stylesheet" href="./fonts/notothai.css">',
                    '<style>\n' + thai_css + '\n</style>')
html = html.replace('<link rel="stylesheet" href="./langmenu.css">',
                    '<style>\n' + langmenu + '\n</style>')
html = re.sub(r'<!-- GitHub Pages[^\n]*\n', '', html)
html = re.sub(r'<link rel="manifest"[^>]*>', '', html)
html = html.replace('<link rel="icon" href="./icons/favicon-32.png" sizes="32x32">', '')
html = html.replace('<link rel="icon" href="./icons/icon.svg" type="image/svg+xml">', '')
html = html.replace('<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">',
                    '<link rel="apple-touch-icon" href="data:image/png;base64,%s">' % icon)
html = html.replace('<img src="./icons/icon-192.png" alt="">',
                    '<img src="data:image/png;base64,%s" alt="">' % icon)
html = html.replace('./logo/dpluskia.svg', 'data:image/svg+xml;base64,%s' % logo)
html = html.replace(
    '<script src="./i18n.js"></script>\n<script src="./data.js"></script>\n<script src="./app.js"></script>',
    '<script>\n' + i18n + '\n</script>\n<script>\n' + data + '\n</script>\n<script>\n' + app + '\n</script>')

# 프리뷰에서는 서비스워커 등록을 건너뜁니다.
html = html.replace('<head>', '<head>\n<!-- 단일 파일 프리뷰 빌드 (자동 생성) -->\n<script>window.__DK_PREVIEW__ = true;</script>')

out = root / 'preview' / 'dk-radar-preview.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, round(len(html) / 1024), 'KB')
