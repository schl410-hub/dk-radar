"""UI에 실제로 쓰인 글자만 골라 Pretendard 가변폰트를 서브셋합니다.

  python3 tools/make_font.py

원본: concepts/fonts/PretendardVariable.woff2 (2.0MB)
결과: fonts/pretendard-subset.woff2  (UI 텍스트 + ASCII)
사용자가 직접 입력한 응원 문구 중 서브셋에 없는 글자는 시스템 한글 폰트로 자연스럽게 대체됩니다.
"""
import pathlib
import string

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "concepts" / "fonts" / "PretendardVariable.woff2"
OUT = ROOT / "fonts" / "pretendard-subset.woff2"

chars = set(string.printable)
chars |= set("·–—‘’“”…→↗↑↓★☆♥♡✓×％℃")
for name in ("index.html", "app.js", "data.js"):
    chars |= set((ROOT / name).read_text(encoding="utf-8"))
# 자주 쓰는 응원 문구용 글자 몇 개를 미리 넣어 둡니다.
chars |= set("응원 화이팅 오늘도 힘내세요 최고 사랑해요 딮기 시그널 도란 카나비 쇼메이커 스매쉬 딜라이트")

text = "".join(sorted(c for c in chars if c.isprintable() or c in "\n\t"))
OUT.parent.mkdir(exist_ok=True)
subset.main([
    str(SRC),
    f"--text={text}",
    "--flavor=woff2",
    "--layout-features=*",
    "--no-hinting",
    "--desubroutinize",
    f"--output-file={OUT}",
])
print("wrote", OUT, round(OUT.stat().st_size / 1024, 1), "KB")
