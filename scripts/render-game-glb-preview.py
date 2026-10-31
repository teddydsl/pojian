#!/usr/bin/env python3
"""Render a quick four-view contact sheet for a single textured GLB."""

from io import BytesIO
from pathlib import Path
import argparse
import json
import math
import struct

from PIL import Image, ImageDraw


def load(path):
    raw = path.read_bytes()
    jlen = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + jlen])
    binary_start = 28 + jlen
    primitive = doc['meshes'][0]['primitives'][0]

    def accessor(number):
        a = doc['accessors'][number]
        v = doc['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        fmt, width = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2)}[a['componentType']]
        off = binary_start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride', n * width)
        result = [struct.unpack_from('<' + fmt * n, raw, off + i * stride) for i in range(a['count'])]
        if a.get('normalized') and a['componentType'] == 5123:
            result = [tuple(value / 65535 for value in item) for item in result]
        return result

    positions = accessor(primitive['attributes']['POSITION'])
    uvs = accessor(primitive['attributes']['TEXCOORD_0'])
    indices = [i[0] for i in accessor(primitive['indices'])]
    mat = doc['materials'][primitive['material']]
    tex = mat['pbrMetallicRoughness']['baseColorTexture']['index']
    image = doc['images'][doc['textures'][tex]['source']]
    view = doc['bufferViews'][image['bufferView']]
    start = binary_start + view.get('byteOffset', 0)
    atlas = Image.open(BytesIO(raw[start:start + view['byteLength']])).convert('RGB')
    return positions, uvs, indices, atlas, mat.get('doubleSided', False)


def render(source, output):
    positions, uvs, indices, atlas, double_sided = load(source)
    pixel = atlas.load()
    lo = [min(p[k] for p in positions) for k in range(3)]
    hi = [max(p[k] for p in positions) for k in range(3)]
    mid = [(lo[k] + hi[k]) / 2 for k in range(3)]
    size = 520
    scale = 450 / max(hi[k] - lo[k] for k in range(3))
    views = [
        ('front +Z', (0, 0, 1), lambda p: (p[0] - mid[0], p[1] - mid[1])),
        ('right +X', (1, 0, 0), lambda p: (mid[2] - p[2], p[1] - mid[1])),
        ('back -Z', (0, 0, -1), lambda p: (mid[0] - p[0], p[1] - mid[1])),
        ('top +Y', (0, 1, 0), lambda p: (p[0] - mid[0], p[2] - mid[2])),
    ]
    sheet = Image.new('RGB', (size * 4, size), '#eee9df')
    for vi, (name, eye, project) in enumerate(views):
        im = Image.new('RGB', (size, size), '#eee9df')
        draw = ImageDraw.Draw(im)
        triangles = []
        for face in range(0, len(indices), 3):
            ids = indices[face:face + 3]
            p = [positions[i] for i in ids]
            ab = [p[1][k] - p[0][k] for k in range(3)]
            ac = [p[2][k] - p[0][k] for k in range(3)]
            normal = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
            facing = sum(normal[k] * eye[k] for k in range(3))
            if not double_sided and facing <= 0:
                continue
            depth = sum(sum(q[k] * eye[k] for k in range(3)) for q in p) / 3
            u = sum(uvs[i][0] for i in ids) / 3
            v = sum(uvs[i][1] for i in ids) / 3
            x = max(0, min(atlas.width - 1, round((u % 1) * (atlas.width - 1))))
            y = max(0, min(atlas.height - 1, round((v % 1) * (atlas.height - 1))))
            base = pixel[x, y]
            mag = math.sqrt(sum(q*q for q in normal)) or 1
            light = .70 + .30 * max(0, sum(normal[k] * (.4, .8, .4)[k] for k in range(3)) / mag)
            triangles.append((depth, p, tuple(round(c * light) for c in base)))
        triangles.sort(key=lambda t: t[0])
        for _, p, color in triangles:
            xy = []
            for q in p:
                x, y = project(q)
                xy.append((size / 2 + x * scale, size / 2 - y * scale))
            draw.polygon(xy, fill=color)
        draw.text((16, 16), name, fill='#36332e')
        sheet.paste(im, (vi * size, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    render(args.source, args.output)
