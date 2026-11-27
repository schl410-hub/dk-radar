"""data.js 영상 아카이브 · 재생목록이 YouTube에서 실제로 살아 있는지 확인합니다.

  python3 tools/verify_highlights.py

- data.js 의 PLAYERS[].highlights(5인) + DK_VIDEOS(DK 공식) + DK_PLAYLISTS 를 node 로 읽어 id 목록을 뽑고
- YouTube oEmbed(https://www.youtube.com/oembed?url=...&format=json) 로 200 응답을 확인합니다.
- 챔피언 태그가 붙은 영상이 실제로 있는지, 추천 챔피언 5종이 모두 1편 이상과 연결되는지도 함께 봅니다.
- 실패가 하나라도 있으면 종료 코드 1. (영상이 내려가면 여기서 먼저 걸립니다)
"""
import json
import os
import pathlib
import shutil
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

REQUIRED_CHAMPIONS = ["ambessa", "gnar", "azir", "kaisa", "leblanc"]

JS = """
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('data.js', 'utf8');
const d = vm.runInNewContext(src + ';({ PLAYERS: PLAYERS, TAGS: HL_TAGS, CATS: HL_CATS, DK: DK_VIDEOS, PL: DK_PLAYLISTS })',
                            {}, { timeout: 3000 });
const out = [];
d.PLAYERS.forEach(function (p) {
  (p.highlights || []).forEach(function (h) {
    out.push({ player: p.key, id: h.id, len: h.len, year: h.year, cat: h.cat || 'highlight',
               champ: h.champ || [], tags: h.tags, point: h.point, match: h.match, event: h.event });
  });
});
d.DK.forEach(function (h) {
  out.push({ player: h.player || 'dk', id: h.id, len: h.len, year: h.year, cat: h.cat || 'highlight',
             champ: h.champ || [], tags: h.tags, point: h.point, match: h.match, event: h.event });
});
console.log(JSON.stringify({ items: out, playlists: d.PL, tags: Object.keys(d.TAGS) }));
"""


def node_bin():
    for cand in [os.environ.get("NODE_BIN"), "/workspace/.node/bin/node", shutil.which("node")]:
        if cand and pathlib.Path(cand).exists():
            return str(cand)
    return "node"


def load():
    out = subprocess.run([node_bin(), "-e", JS], cwd=str(ROOT), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def oembed(kind, key):
    url = ("https://www.youtube.com/oembed?url="
           + urllib.parse.quote(f"https://www.youtube.com/{kind}?{'v' if kind == 'watch' else 'list'}=" + key, safe="")
           + "&format=json")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.load(res)


def main():
    data = load()
    items = data["items"]
    tags = set(data["tags"])
    print("archive videos:", len(items), "| playlists:", len(data["playlists"]))
    failures = []

    # 1) 영상이 실제로 있는지
    for it in items:
        try:
            info = oembed("watch", it["id"])
            title, author, ok = info.get("title", ""), info.get("author_name", ""), True
        except Exception as e:
            title, author, ok = str(e), "", False
        if ok:
            print("OK   %-9s %-8s %s | %s | %s" % (it["player"], it["cat"], it["id"], author, title[:60]))
        else:
            failures.append(it["id"])
            print("FAIL %-9s %-8s %s | %s" % (it["player"], it["cat"], it["id"], title[:80]))
        time.sleep(0.12)

    # 2) 재생목록 + 재생목록 썸네일(첫 영상)이 실제로 있는지
    for pl in data["playlists"]:
        try:
            info = oembed("playlist", pl["id"])
            print("PL OK %s | %s | %s" % (pl["id"], pl["n"], info.get("title", "")))
        except Exception as e:
            failures.append(pl["id"])
            print("PL FAIL %s | %s" % (pl["id"], e))
        try:
            oembed("watch", pl["thumb"])
        except Exception as e:
            failures.append(pl["thumb"])
            print("THUMB FAIL %s | %s" % (pl["thumb"], e))
        time.sleep(0.12)

    # 3) 챔피언 태그 정합성: 태그 키가 HL_TAGS 에 있고, 요청한 5종이 모두 최소 1편과 연결
    by_champ = {}
    for it in items:
        for key in it["champ"]:
            if key not in tags:
                failures.append("tag:" + key)
                print("FAIL unknown champion tag", key, "on", it["id"])
            by_champ.setdefault(key, []).append(it["id"])
    print("\nchampion tags:", {k: len(v) for k, v in by_champ.items()})
    for key in REQUIRED_CHAMPIONS:
        if not by_champ.get(key):
            failures.append("champ:" + key)
            print("FAIL no video for champion", key)
        else:
            print("CHAMP OK %-8s -> %s" % (key, ", ".join(by_champ[key])))

    # 4) 포인트(한 줄)와 4개 언어가 모든 항목에 있는지
    for it in items:
        pt = it.get("point") or {}
        if not all(pt.get(l) for l in ("ko", "en", "ja", "zh")):
            failures.append("point:" + it["id"])
            print("FAIL missing 4-language point", it["id"])

    dupes = len(items) - len(set(it["id"] for it in items))
    if dupes:
        failures.append("dupe:%d" % dupes)
        print("FAIL duplicate video ids:", dupes)

    if failures:
        print("\nfailures:", failures)
        return 1
    print("\nall %d videos and %d playlists live (oEmbed 200)" % (len(items), len(data["playlists"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
