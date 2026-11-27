"""data.js 하이라이트 아카이브의 모든 영상이 YouTube에서 실제로 재생되는지 확인합니다.

  python3 tools/verify_highlights.py

- data.js 의 PLAYERS[].highlights 를 node 로 읽어 id 목록을 뽑고
- YouTube oEmbed(https://www.youtube.com/oembed?url=...&format=json) 로 200 응답을 확인합니다.
- 실패가 하나라도 있으면 종료 코드 1. (영상이 내려가면 여기서 먼저 걸립니다)
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

JS = """
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('data.js', 'utf8');
const d = vm.runInNewContext(src + ';({ PLAYERS: PLAYERS, TAGS: HL_TAGS })', {}, { timeout: 3000 });
const out = [];
d.PLAYERS.forEach(function (p) {
  (p.highlights || []).forEach(function (h) {
    out.push({ player: p.key, id: h.id, len: h.len, channel: h.channel, year: h.year,
               tags: h.tags, match: h.match, event: h.event });
  });
});
console.log(JSON.stringify(out));
"""


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def load_items():
    out = subprocess.run([node_bin(), "-e", JS], cwd=str(ROOT), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def oembed(vid):
    url = ("https://www.youtube.com/oembed?url="
           + urllib.parse.quote("https://www.youtube.com/watch?v=" + vid, safe="") + "&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.load(res)


def main():
    items = load_items()
    print("highlights:", len(items))
    failures = []
    for it in items:
        try:
            info = oembed(it["id"])
            title = info.get("title", "")
            author = info.get("author_name", "")
            ok = True
        except Exception as e:
            title, author, ok = str(e), "", False
        if ok:
            print("OK   %-9s %s | %s | %s" % (it["player"], it["id"], author, title[:70]))
        else:
            failures.append(it["id"])
            print("FAIL %-9s %s | %s" % (it["player"], it["id"], title[:90]))
        time.sleep(0.15)

    players = {}
    for it in items:
        players.setdefault(it["player"], []).append(it["id"])
    dupes = [v for k, v in players.items() if len(v) != len(set(v))]
    print("\nper player:", {k: len(v) for k, v in players.items()})
    if failures:
        print("dead links:", failures)
        return 1
    print("all %d videos play (oEmbed 200)" % len(items))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
