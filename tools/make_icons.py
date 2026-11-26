"""DK RADAR app icons - mint acorn + radar rings, drawn with Pillow."""
import math
from PIL import Image, ImageDraw

S = 2048          # supersampled canvas
U = S / 1024.0    # scale from design units (1024) to canvas

MINT_L = (18, 223, 176)
MINT_D = (0, 186, 145)
INK = (9, 140, 119)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient(size, c1, c2):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(0, size, 4):
            t = (x / size * 0.55 + y / size * 0.45)
            c = lerp(c1, c2, t)
            for dx in range(4):
                if x + dx < size:
                    px[x + dx, y] = c
    return img


def dome(pts, cx, top, w, h, side=1):
    """Half-ellipse dome, built by horizontal slices (0 at top -> w at base)."""
    steps = 90
    rng = range(steps + 1) if side > 0 else range(steps, -1, -1)
    for i in rng:
        t = i / steps
        y = top + h * t
        half = (w / 2) * math.sqrt(max(0.0, 1 - (1 - t) ** 2))
        pts.append((cx + side * half, y))


def egg(pts, cx, top, w, h, side=1):
    """Egg silhouette: narrower at the top, rounded bottom."""
    steps = 140
    for i in range(steps + 1):
        t = i / steps
        y = top + h * t
        base = math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
        half = (w / 2) * base * (0.80 + 0.20 * t)
        pts.append((cx + side * half, y))


def acorn(d, cx, cy, scale=1.0, body=(255, 255, 255, 255), cap=(255, 255, 255, 255),
          accent=INK, gap=4):
    w = 470 * scale
    h = 620 * scale
    top = cy - h * 0.5
    cap_h = h * 0.27
    cap_w = w * 0.92
    body_w = w * 0.86
    body_h = h * 0.60
    body_top = top + cap_h + gap * scale

    # stem
    sw = 44 * scale
    d.rounded_rectangle([cx - sw / 2, top - 66 * scale, cx + sw / 2, top + 40 * scale],
                        radius=18 * scale, fill=cap)

    # body: widest just under the cap, tapering to a small tip at the bottom
    pts = []
    steps = 120
    for i in range(steps + 1):
        t = i / steps
        base = math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
        half = (body_w / 2) * base * (0.74 + 0.26 * (1 - t) ** 0.7)
        pts.append((cx + half, body_top + body_h * t))
    for i in range(steps + 1):
        t = i / steps
        base = math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
        half = (body_w / 2) * base * (0.74 + 0.26 * (1 - t) ** 0.7)
        pts.append((cx - half, body_top + body_h * (1 - t)))
    d.polygon(pts, fill=body)

    # cap: shallow dome, slightly wider than the body
    pts = []
    dome(pts, cx, top, cap_w, cap_h, side=1)
    dome(pts, cx, top, cap_w, cap_h, side=-1)
    d.polygon(pts, fill=cap)

    # cap texture: thin mint arcs
    if accent:
        for k in (0.34, 0.66):
            y = top + cap_h * (0.16 + 0.72 * k)
            t = (y - top) / cap_h
            half = (cap_w / 2) * math.sqrt(max(0.0, 1 - (1 - t) ** 2)) * 0.88
            if half > 6:
                d.line([(cx - half, y), (cx + half, y)],
                       fill=accent + (90,), width=max(2, int(5 * scale)))


def rings(d, cx, cy, color):
    for r, wd, al in ((300, 15, 30), (470, 13, 22), (640, 11, 16)):
        d.ellipse([cx - r * U, cy - r * U, cx + r * U, cy + r * U],
                  outline=color + (al,), width=int(wd * U))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def render(path, size, rounded=False, pad=1.0):
    base = gradient(S, MINT_L, MINT_D).convert("RGBA")
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rings(d, 512 * U, 700 * U, (255, 255, 255))
    acorn(d, 512 * U, 600 * U, 1.05 * pad * U)
    base.alpha_composite(layer)
    if rounded:
        base.putalpha(rounded_mask(S, int(S * 0.235)))
    base.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print("wrote", path)


def render_badge(path, size=96):
    big = size * 4
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    acorn(d, big * 0.5, big * 0.56, big / 1024.0 * 1.02, accent=None,
          body=(255, 255, 255, 255), cap=(255, 255, 255, 255))
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print("wrote", path)


if __name__ == "__main__":
    render("icons/icon-192.png", 192, rounded=True)
    render("icons/icon-512.png", 512, rounded=True)
    render("icons/icon-maskable-512.png", 512, pad=0.80)
    render("icons/apple-touch-icon.png", 180)
    render("icons/favicon-32.png", 32, rounded=True)
    render_badge("icons/badge-96.png", 96)
