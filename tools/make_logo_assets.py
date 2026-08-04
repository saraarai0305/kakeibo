# -*- coding: utf-8 -*-
"""AE用のロゴ素材を書き出す（stdlibのみ・RGBA対応）。

出力: design/ に 2048px の全体版と、バー3本の個別透過PNG。
ジオメトリは icons/ を生成した make_icons.py と同一。
"""
import os
import struct
import zlib

BG = (0x12, 0x15, 0x1C, 255)
BARS = [
    ("gray",  (0x5F, 0x6B, 0x81, 255)),
    ("blue",  (0x7A, 0xA7, 0xF0, 255)),
    ("green", (0x5E, 0xCF, 0xA0, 255)),
]
CLEAR = (0, 0, 0, 0)


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(v for px in row for v in px) for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # color type 6 = RGBA
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", header))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))


def spans(size):
    """make_icons.py と同じ配置。(x0,x1,y0,y1,color,name) を返す"""
    u = size / 32.0
    base = size - 7 * u
    heights = [8 * u, 13 * u, 19 * u]
    width = 5 * u
    gap = 2.5 * u
    left = (size - (3 * width + 2 * gap)) / 2.0
    out = []
    for i, (name, color) in enumerate(BARS):
        x0 = left + i * (width + gap)
        out.append((x0, x0 + width, base - heights[i], base, color, name))
    return out


def render(size, include, background):
    sp = [s for s in spans(size) if s[5] in include]
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            px = background
            for x0, x1, y0, y1, color, _ in sp:
                if x0 <= x < x1 and y0 <= y < y1:
                    px = color
                    break
            row.append(px)
        rows.append(row)
    return rows


def main():
    out = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "design"))
    os.makedirs(out, exist_ok=True)
    size = 2048

    write_png(os.path.join(out, "logo_full_2048.png"), size,
              render(size, {"gray", "blue", "green"}, BG))
    for name, _ in BARS:
        write_png(os.path.join(out, f"bar_{name}_2048.png"), size,
                  render(size, {name}, CLEAR))
    print("done:", out)


if __name__ == "__main__":
    main()
