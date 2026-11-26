"""단일 파일 프리뷰 빌드 (CSS/JS/폰트/아이콘 인라인).
htmlpreview 같은 정적 뷰어에서 바로 렌더되도록 만든 보조 산출물입니다.
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
data = (root / 'data.js').read_text(encoding='utf-8')
app = (root / 'app.js').read_text(encoding='utf-8')

font = base64.b64encode((root / 'fonts/inter-var-latin.woff2').read_bytes()).decode()
icon = base64.b64encode((root / 'icons/icon-192.png').read_bytes()).decode()
badge = base64.b64encode((root / 'icons/badge-96.png').read_bytes()).decode()

css = css.replace("url('./fonts/inter-var-latin.woff2')",
                  "url('data:font/woff2;base64,%s')" % font)
data = data.replace("'./icons/icon-192.png'", "'data:image/png;base64,%s'" % icon)
data = data.replace("'./icons/badge-96.png'", "'data:image/png;base64,%s'" % badge)
app = app.replace("'./icons/icon-192.png'", "'data:image/png;base64,%s'" % icon)
app = app.replace("'./icons/badge-96.png'", "'data:image/png;base64,%s'" % badge)

html = html.replace('<link rel="stylesheet" href="./styles.css">',
                    '<style>\n' + css + '\n</style>')
html = html.replace('<link rel="manifest" href="./manifest.webmanifest">', '')
html = html.replace('<link rel="icon" href="./icons/favicon-32.png" sizes="32x32">', '')
html = html.replace('<link rel="icon" href="./icons/icon.svg" type="image/svg+xml">', '')
html = html.replace('<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">',
                    '<link rel="apple-touch-icon" href="data:image/png;base64,%s">' % icon)
html = html.replace('<img src="./icons/icon-192.png" alt="">',
                    '<img src="data:image/png;base64,%s" alt="">' % icon)
html = html.replace('<script src="./data.js"></script>\n<script src="./app.js"></script>',
                    '<script>\n' + data + '\n</script>\n<script>\n' + app + '\n</script>')

# 프리뷰에서는 서비스워커/설치 프롬프트가 의미 없으므로 조용히 실패시킵니다.
html = html.replace('<head>', '<head>\n<!-- 단일 파일 프리뷰 빌드 (자동 생성) -->')

out = root / 'preview' / 'dk-radar-preview.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, round(len(html) / 1024), 'KB')
