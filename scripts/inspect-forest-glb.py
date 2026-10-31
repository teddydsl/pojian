#!/usr/bin/env python3
"""Inspect untextured source GLBs and render quick orthographic contact sheets."""

from collections import defaultdict
from pathlib import Path
import json
import math
import struct

from PIL import Image, ImageDraw

SOURCE_DIR = Path('/Users/ted/Downloads/物料/黑客松/模型素材')
OUT_DIR = Path(__file__).resolve().parents[1] / 'reviews'


def read_glb(path):
    b = path.read_bytes()
    assert struct.unpack_from('<4sI', b) == (b'glTF', 2)
    jlen = struct.unpack_from('<I', b, 12)[0]
    doc = json.loads(b[20:20 + jlen])
    boff = 20 + jlen
    blen, kind = struct.unpack_from('<I4s', b, boff)
    assert kind == b'BIN\0'
    data = b[boff + 8:boff + 8 + blen]

    def accessor(ai):
        a = doc['accessors'][ai]
        v = doc['bufferViews'][a['bufferView']]
        fmt, width = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2), 5121: ('B', 1)}[a['componentType']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        stride = v.get('byteStride', n * width)
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * n, data, off + i * stride) for i in range(a['count'])]

    prim = doc['meshes'][0]['primitives'][0]
    return doc, accessor(prim['attributes']['POSITION']), accessor(prim['attributes']['NORMAL']), [x[0] for x in accessor(prim['indices'])]


def components(vertices, indices):
    parent = list(range(len(vertices)))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def join(a, b):
        a, b = find(a), find(b)
        if a != b: parent[b] = a
    for i in range(0, len(indices), 3):
        a, b, c = indices[i:i + 3]
        join(a, b); join(a, c)
    groups = defaultdict(list)
    for i in range(0, len(indices), 3):
        groups[find(indices[i])].append(i // 3)
    records = []
    for root, faces in groups.items():
        ids = set(indices[3 * f + q] for f in faces for q in range(3))
        lo = tuple(min(vertices[i][k] for i in ids) for k in range(3))
        hi = tuple(max(vertices[i][k] for i in ids) for k in range(3))
        center = tuple((lo[k] + hi[k]) / 2 for k in range(3))
        records.append((len(faces), len(ids), center, lo, hi, root))
    records.sort(reverse=True)
    return records


def render(name, positions, indices):
    views = [('front', (0, 0, 1)), ('back', (0, 0, -1)), ('right', (1, 0, 0)), ('top', (0, 1, 0))]
    panel = (500, 500)
    sheet = Image.new('RGB', (panel[0] * 4, panel[1]), '#e7dfd3')
    lo = [min(p[k] for p in positions) for k in range(3)]
    hi = [max(p[k] for p in positions) for k in range(3)]
    scale = 420 / max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    mid = [(lo[k] + hi[k]) / 2 for k in range(3)]
    for vi, (title, eye) in enumerate(views):
        im = Image.new('RGB', panel, '#e7dfd3')
        draw = ImageDraw.Draw(im)
        triangles = []
        for i in range(0, len(indices), 3):
            p = [positions[indices[i + q]] for q in range(3)]
            ax, ay, az = [p[1][k] - p[0][k] for k in range(3)]
            bx, by, bz = [p[2][k] - p[0][k] for k in range(3)]
            normal = (ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx)
            mag = math.sqrt(sum(x*x for x in normal)) or 1
            normal = tuple(x / mag for x in normal)
            if sum(normal[k] * eye[k] for k in range(3)) < .01: continue
            depth = sum(sum(q[k] * eye[k] for k in range(3)) for q in p) / 3
            shade = .63 + .37 * max(0, normal[0] * .3 + normal[1] * .8 + normal[2] * .5)
            triangles.append((depth, p, tuple(round(c * shade) for c in (160, 157, 145))))
        triangles.sort(key=lambda x: x[0])
        for _, p, color in triangles:
            xy = []
            for q in p:
                if title == 'front': x, y = q[0] - mid[0], q[1] - mid[1]
                elif title == 'back': x, y = mid[0] - q[0], q[1] - mid[1]
                elif title == 'right': x, y = mid[2] - q[2], q[1] - mid[1]
                else: x, y = q[0] - mid[0], mid[2] - q[2]
                xy.append((250 + x * scale, 250 - y * scale))
            draw.polygon(xy, fill=color)
        draw.text((12, 12), f'{name} {title}', fill='#242424')
        sheet.paste(im, (vi * panel[0], 0))
    path = OUT_DIR / f'{name}-source-views.png'
    sheet.save(path)
    return path


if __name__ == '__main__':
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, label in [('fantasy forest 3d model.glb', 'forest'), ('mushroom cluster 3d model.glb', 'mushroom')]:
        doc, pos, nrm, ind = read_glb(SOURCE_DIR / filename)
        comps = components(pos, ind)
        print(label, 'vertices', len(pos), 'triangles', len(ind)//3, 'components', len(comps))
        for i, (nf, nv, c, lo, hi, root) in enumerate(comps[:25]):
            print(i, 'faces', nf, 'verts', nv, 'center', tuple(round(x,3) for x in c), 'bounds', tuple(round(x,3) for x in lo), tuple(round(x,3) for x in hi), 'root', root)
        print('preview', render(label, pos, ind))
