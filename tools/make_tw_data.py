"""data.js 의 중국어(간체) 문구를 대만 번체(tw)로 한 벌 더 만들어 넣습니다.

  pip install opencc-python-reimplemented
  python3 tools/make_tw_data.py           # tw 가 없는 zh 항목에만 추가
  python3 tools/make_tw_data.py --force   # 기존 tw 를 지우고 전부 다시 만듬

data.js 의 문장형 내용은 원래 ko·en·ja·zh·vi 5개 언어만 있었습니다.
10개국어 화면에서 대만 번체(tw)가 간체를 그대로 보여 주지 않도록, zh 문구를
OpenCC(s2twp: 간체 → 대만 정체)로 옮겨 tw 항목을 나란히 둡니다.
용어 몇 개(盃·例行賽 등)는 대만 표기에 맞게 따로 손봅니다.
"""
import pathlib
import re
import sys

try:
    from opencc import OpenCC
except ImportError:
    raise SystemExit('opencc 가 없습니다: pip install opencc-python-reimplemented')

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.js'
cc = OpenCC('s2twp')

# OpenCC 가 그대로 두거나 달리 옮기는 대만(번체) 표기 손보정
PHRASES = [
    ('LCK 杯', 'LCK 盃'),
    ('KeSPA 杯', 'KeSPA 盃'),
    ('常規賽', '例行賽'),
    ('世界賽', '世界大賽'),
    ('賬號', '帳號'),
    ('高光', '精華'),
    ('短片', '短影音'),
    ('帶飛', 'Carry'),
    ('卡莎', '凱莎'),
    ('克桑提', '卡桑帝'),
    ('克烈', '克雷德'),
]

VALUE = r"'((?:[^'\\]|\\.)*)'"


def to_tw(text):
    out = cc.convert(text)
    for a, b in PHRASES:
        out = out.replace(a, b)
    return out


def unescape(s):
    return s.replace("\\'", "'").replace('\\\\', '\\')


def escape(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")


def main():
    force = '--force' in sys.argv
    src = DATA.read_text(encoding='utf-8')
    if force:
        src = re.sub(r",\s*tw:\s*" + VALUE, '', src)

    out, pos, added = [], 0, 0
    for m in re.finditer(r"zh:\s*" + VALUE, src):
        tail = src[m.end():m.end() + 40]
        if re.match(r"\s*,\s*tw:", tail):
            continue
        tw = escape(to_tw(unescape(m.group(1))))
        out.append(src[pos:m.end()])
        out.append(", tw: '" + tw + "'")
        pos = m.end()
        added += 1
    out.append(src[pos:])
    DATA.write_text(''.join(out), encoding='utf-8')
    print('added tw to %d zh strings' % added)


if __name__ == '__main__':
    main()
