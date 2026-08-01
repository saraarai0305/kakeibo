"""Generate the PWA icons with the stdlib only (no Pillow)."""
import os
import struct
import zlib

BG = (0x12, 0x15, 0x1C)
BARS = [(0x5F, 0x6B, 0x81), (0x7A, 0xA7, 0xF0), (0x5E, 0xCF, 0xA0)]


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(v for px in row for v in px) for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", header))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))


def render(size):
    """Three ascending bars, sized off the canvas so every icon looks identical."""
    u = size / 32.0
    base = size - 7 * u          # bars sit on this line
    heights = [8 * u, 13 * u, 19 * u]
    width = 5 * u
    gap = 2.5 * u
    total = 3 * width + 2 * gap
    left = (size - total) / 2.0

    spans = []
    for i, h in enumerate(heights):
        x0 = left + i * (width + gap)
        spans.append((x0, x0 + width, base - h, base, BARS[i]))

    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            px = BG
            for x0, x1, y0, y1, color in spans:
                if x0 <= x < x1 and y0 <= y < y1:
                    px = color
                    break
            row.append(px)
        rows.append(row)
    return rows


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for size in (180, 192, 512):
        path = os.path.normpath(os.path.join(out, "icon-%d.png" % size))
        write_png(path, size, render(size))
        print("wrote", path)


if __name__ == "__main__":
    main()
