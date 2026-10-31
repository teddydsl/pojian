#!/usr/bin/env python3
"""Render a front, angled, and overhead QA sheet from the combined GLB."""

from pathlib import Path
import json
import math
import struct

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'public/assets/models/felt-forest-with-mushrooms.glb'
OUT = ROOT / 'reviews/felt-forest-with-mushrooms-preview.png'
b = PATH.read_bytes()
jl = struct.unpack_from('<I', b, 12)[0]
d = json.loads(b[20:20+jl])
blen = struct.unpack_from('<I', b, 20+jl)[0]
data = b[28+jl:28+jl+blen]


def acc(ai):
    a = d['accessors'][ai]
    v = d['bufferViews'][a['bufferView']]
    fmt, size = {5126: ('f', 4), 5125: ('I', 4), 5121: ('B', 1)}[a['componentType']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = v.get('byteStride', width * size)
    return [struct.unpack_from('<' + fmt * width, data, off + i * stride) for i in range(a['count'])]


triangles = []
for node in d['nodes']:
    if 'mesh' not in node:
        continue
    tr = node.get('translation', [0, 0, 0])
    sc = node.get('scale', [1, 1, 1])
    q = node.get('rotation', [0, 0, 0, 1])
    ang = 2 * math.atan2(q[1], q[3])
    co, si = math.cos(ang), math.sin(ang)
    for pr in d['meshes'][node['mesh']]['primitives']:
        pos = acc(pr['attributes']['POSITION'])
        col = acc(pr['attributes']['COLOR_0'])
        idx = [x[0] for x in acc(pr['indices'])]
        world = []
        for x, y, z in pos:
            x, y, z = x*sc[0], y*sc[1], z*sc[2]
            world.append((x*co + z*si + tr[0], y + tr[1], -x*si + z*co + tr[2]))
        for i in range(0, len(idx), 3):
            ids = idx[i:i+3]
            p = [world[j] for j in ids]
            c = tuple(sum(col[j][k] for j in ids) / 3 for k in range(3))
            triangles.append((p, c))


def sub(a, b): return tuple(a[i]-b[i] for i in range(3))
def dot(a, b): return sum(a[i]*b[i] for i in range(3))
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def unit(a):
    n = math.sqrt(dot(a, a)) or 1
    return tuple(x/n for x in a)


W, H = 640, 580
sheet = Image.new('RGB', (W*3, H), '#e8dfd1')
views = [
    ('FRONT', unit((0, .25, 1)), lambda p: (p[0], p[1])),
    ('ANGLE', unit((.95, .85, 1.3)), lambda p: ((p[0]-p[2])*.75, p[1] - (p[0]+p[2])*.25)),
    ('TOP', (0, 1, 0), lambda p: (p[0], -p[2])),
]
light = unit((-.3, .9, 1))
for vi, (title, eye, project) in enumerate(views):
    im = Image.new('RGB', (W, H), '#e8dfd1')
    draw = ImageDraw.Draw(im)
    items = []
    for p, color in triangles:
        n = unit(cross(sub(p[1], p[0]), sub(p[2], p[0])))
        if dot(n, eye) <= .005:
            continue
        depth = sum(dot(q, eye) for q in p)/3
        shade = .67 + .30*max(0, dot(n, light))
        color = tuple(min(255, round(c*shade)) for c in color)
        items.append((depth, p, color))
    items.sort(key=lambda t: t[0])
    for _, p, color in items:
        xy = []
        for q in p:
            x, y = project(q)
            if title == 'TOP': xy.append((W/2+x*520, H/2-y*520))
            else: xy.append((W/2+x*520, H-70-y*520))
        draw.polygon(xy, fill=color)
    draw.text((18, 18), title, fill='#302f2d')
    sheet.paste(im, (vi*W, 0))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT)
print(OUT)
