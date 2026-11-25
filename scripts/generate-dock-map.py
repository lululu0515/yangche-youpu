"""Bake displacement and edge lighting for the two stadiums in the supplied dock demo."""
from math import copysign, hypot
from pathlib import Path
from struct import pack
from zlib import compress, crc32

DEST = Path(__file__).resolve().parents[1] / "src"


def smooth(low, high, value):
    t = max(0, min(1, (value - low) / (high - low)))
    return t * t * (3 - 2 * t)


def chunk(kind, data):
    return pack(">I", len(data)) + kind + data + pack(">I", crc32(kind + data))


def write_png(name, width, height, color_type, pixels):
    header = pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    data = chunk(b"IHDR", header) + chunk(b"IDAT", compress(pixels, 9)) + chunk(b"IEND", b"")
    (DEST / name).write_bytes(b"\x89PNG\r\n\x1a\n" + data)


def bake(width, height, lens):
    density = 2
    offsets, lighting = bytearray(), bytearray()
    for row in range(height * density):
        offsets.append(0)
        lighting.append(0)
        for column in range(width * density):
            x, y = (column + .5) / density - width / 2, (row + .5) / density - height / 2
            side = copysign(max(0, abs(x) - (width - height) / 2), x)
            radius = hypot(side, y)
            nx, ny = side / (radius or 1), y / (radius or 1)
            d = radius - height / 2
            rim = smooth(-20 if lens else -22, 0, d)
            bend = rim ** (1.85 if lens else 1.78) * .105 * (310 if lens else 255 * 1.25)
            ox = -nx * bend - x * (.075 if lens else .010 * 1.25)
            oy = -ny * bend - y * (.075 if lens else .082 * 1.25)
            offsets.extend((round(127.5 + ox * 255 / 88), round(127.5 + oy * 255 / 88), 128))

            # Store the directional rim, depth band and highlights as one transparent layer.
            # Composite premultiplied colors on transparent black, then encode straight RGBA.
            color = [0., 0., 0., 0.]
            def over(rgb, alpha):
                for i in range(3):
                    color[i] = color[i] * (1 - alpha) + rgb[i] * alpha
                color[3] += (1 - color[3]) * alpha

            over((.994, .997, 1.), .10 if lens else .15)
            caustic = smooth(-9, -1.3, d) * (1 - smooth(-1.3, .4, d))
            over((.78 + .22 * nx, .92, .85 - .15 * nx), caustic * .16)
            dome = smooth(.5, -.95, y / (height / 2) + (.0 if lens else .18 * x / (width / 2)))
            over((1, 1, 1), dome * (.055 if lens else .085))
            depth = smooth(-6.5, -2.6, d) * (1 - smooth(-2.6, -.75, d))
            over((.28, .41, .61), depth * (.085 if lens else .13))
            light = .48 + .52 * max(0, -.86 * ny - .38 * nx)
            bounce = .46 * max(0, .84 * ny + .42 * nx)
            over((1, 1, 1), min(1, rim ** 2.7 * (.52 * light + bounce) * (1 if lens else 1.25)))
            line = smooth(-2.3, -.55, d) * (1 - smooth(-.55, .45, d))
            over((1, 1, 1), line * (.68 + .32 * light))
            contour = smooth(-1.1, -.1, d) * (1 - smooth(-.1, .85, d))
            over((.68, .73, .80), contour * .44)
            lighting.extend([round(c / color[3] * 255) for c in color[:3]] +
                            [round(color[3] * 255 * (1 - smooth(-.4, .4, d)))])
    w, h = width * density, height * density
    write_png("dock-refraction.png" if lens else "dock-body-map.png", w, h, 2, offsets)
    write_png("dock-lens-light.png" if lens else "dock-body-light.png", w, h, 6, lighting)


bake(364, 68, False)
bake(94, 80, True)
