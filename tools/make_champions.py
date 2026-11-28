"""data.js 의 CHAMPIONS 표를 Riot Data Dragon 에서 다시 만듭니다.

  python3 tools/make_champions.py            # 최신 버전
  python3 tools/make_champions.py 16.23.1    # 버전 고정

챔피언 이름은 게임 언어마다 다르고(레넥톤 / Renekton / レネクトン / 雷克顿 / 雷珂煞),
Riot API 는 영어 이름을 줍니다. 10개 언어를 한 표에 두어 화면에서 바로 바꿔 씁니다.

표의 칸 순서(app.js CHAMP_COL 과 같아야 함):
  ko · en · ja · zh(간체) · tw(번체) · vi · es · pt · th · id
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.js'
BASE = 'https://ddragon.leagueoflegends.com'
LOCALES = [
    ('ko', 'ko_KR'), ('en', 'en_US'), ('ja', 'ja_JP'), ('zh', 'zh_CN'), ('tw', 'zh_TW'),
    ('vi', 'vi_VN'), ('es', 'es_ES'), ('pt', 'pt_BR'), ('th', 'th_TH'), ('id', 'id_ID'),
]


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'dk-signal/3.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    version = sys.argv[1] if len(sys.argv) > 1 else get(BASE + '/api/versions.json')[0]
    tables = {}
    for short, loc in LOCALES:
        data = get('%s/cdn/%s/data/%s/champion.json' % (BASE, version, loc))['data']
        tables[short] = {cid: row['name'] for cid, row in data.items()}

    ids = sorted(tables['ko'].keys())
    esc = lambda s: s.replace('\\', '\\\\').replace("'", "\\'")
    lines = []
    lines.append('/* 챔피언 이름 (Riot Data Dragon %s · %s)' % (version, ' · '.join(loc for _, loc in LOCALES)))
    lines.append(' * data.js 는 한국어 이름을 쓰고, Riot API 는 영어 이름을 주기 때문에 10개 언어를 한 표에 둡니다.')
    lines.append(' * 칸 순서: ko · en · ja · zh · tw · vi · es · pt · th · id (app.js CHAMP_COL 과 같아야 함).')
    lines.append(' * tools/make_champions.py 로 다시 만들 수 있습니다. */')
    lines.append('const CHAMPIONS = {')
    for cid in ids:
        names = []
        for short, _ in LOCALES:
            names.append(tables[short].get(cid) or tables['en'].get(cid) or tables['ko'].get(cid, cid))
        lines.append("  '%s': [%s]," % (cid, ', '.join("'%s'" % esc(n) for n in names)))
    lines.append('};')
    block = '\n'.join(lines) + '\n'

    src = DATA.read_text(encoding='utf-8')
    if 'const CHAMPIONS = {' in src:
        src = re.sub(r'/\* 챔피언 이름.*?\*/\nconst CHAMPIONS = \{.*?\n\};\n?', block, src, flags=re.S)
    else:
        src = src.rstrip('\n') + '\n\n' + block
    DATA.write_text(src, encoding='utf-8')
    print('wrote %d champions (%s) into %s' % (len(ids), version, DATA.name))


if __name__ == '__main__':
    main()
