#!/usr/bin/env python3
"""Color the exported forest and integrate one mushroom cluster into one GLB.

Uses only Python's standard library and the two untouched source GLBs in
reviews/source-glb.  The output uses vertex colors and glTF PBR materials, with
one forest mesh and one reusable mushroom mesh under a single scene root.
"""

from collections import defaultdict
from pathlib import Path
import json
import math
import runpy
import struct

ROOT = Path(__file__).resolve().parents[1]
READ = runpy.run_path(str(Path(__file__).with_name('inspect-forest-glb.py')))['read_glb']
FOREST = ROOT / 'reviews/source-glb/forest-uncolored.glb'
MUSHROOM = ROOT / 'reviews/source-glb/mushroom-sheet-uncolored.glb'
OUT = ROOT / 'public/assets/models/felt-forest-with-mushrooms.glb'


def components(positions, indices):
    parent = list(range(len(positions)))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a
    for i in range(0, len(indices), 3):
        a, b, c = indices[i:i + 3]
        union(a, b)
        union(a, c)
    faces = defaultdict(list)
    verts = defaultdict(set)
    for i in range(0, len(indices), 3):
        root = find(indices[i])
        faces[root].append(i)
        verts[root].update(indices[i:i + 3])
    info = {}
    for root, vi in verts.items():
        lo = tuple(min(positions[i][j] for i in vi) for j in range(3))
        hi = tuple(max(positions[i][j] for i in vi) for j in range(3))
        info[root] = {'faces': len(faces[root]), 'lo': lo, 'hi': hi}
    return [find(i) for i in range(len(positions))], info


def rgb(code):
    return tuple(int(code[i:i+2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(a[i] * (1-t) + b[i] * t for i in range(3))


def noise(p, salt=0):
    x, y, z = p
    f = math.sin(x * 271.91 + y * 197.37 + z * 349.21 + salt * 47.17) * 43758.5453
    return f - math.floor(f)


def rgba(base, p, amount=.09, salt=0):
    factor = 1 + (noise(p, salt) - .5) * 2 * amount
    return tuple(max(0, min(255, round(c * factor))) for c in base) + (255,)


def forest_colors(pos, normals, roots, info):
    ground = max(info, key=lambda r: info[r]['faces'])
    out = []
    for i, (p, n, root) in enumerate(zip(pos, normals, roots)):
        x, y, z = p
        ny = n[1]
        bounds = info[root]
        size = tuple(bounds['hi'][j] - bounds['lo'][j] for j in range(3))
        if root == ground and y < .045:
            color = rgb('#514838')  # slab side / dark earth
        elif root == ground and y < .13 and ny > .25:
            path_center = .035 + .22 * (z - .10)
            path = max(0, 1 - abs(x - path_center) / .17)
            color = mix(rgb('#56694d'), rgb('#a68f6b'), path * .76)
            if noise(p, 3) > .73:
                color = mix(color, rgb('#738056'), .27)
        elif root == ground and y < .12:
            color = rgb('#504937')
        elif root != ground and size[1] < .18 and max(size[0], size[2]) < .10:
            color = rgb('#66735a') if i % 7 else rgb('#817d68')
        elif root != ground and size[1] < .21 and max(size[0], size[2]) > .10:
            color = rgb('#695443')  # fallen timber
            color = mix(color, rgb('#566649'), max(0, (y - .10) * 1.6))
        else:
            # Bark colors follow the original warm-grey, mossy dead forest.
            if x < -.20:
                color = rgb('#665b4d')
            elif x < .13:
                color = rgb('#706551')
            elif x < .29:
                color = rgb('#687067')
            else:
                color = rgb('#665548')
            if y < .23:
                color = mix(color, rgb('#506348'), max(0, (.23-y)/.23) * .54)
            if ny > .55 and y < .30:
                color = mix(color, rgb('#6b7453'), .12)
        out.append(rgba(color, p, .105, i % 23))
    return out


def extract_one_mushroom_cluster(pos, normals, indices):
    roots, info = components(pos, indices)
    chosen = {r for r, d in info.items()
              if d['lo'][0] > -.18 and d['hi'][0] < .18 and d['hi'][1] < .30}
    assert len(chosen) == 10, f'Expected 5 caps and 5 stems, got {len(chosen)} parts'
    selected_faces = [i for i in range(0, len(indices), 3) if roots[indices[i]] in chosen]
    used = sorted({indices[i+j] for i in selected_faces for j in range(3)})
    remap = {old: new for new, old in enumerate(used)}
    lo = tuple(min(pos[i][k] for i in used) for k in range(3))
    hi = tuple(max(pos[i][k] for i in used) for k in range(3))
    cx = (lo[0] + hi[0]) / 2
    cz = (lo[2] + hi[2]) / 2
    new_pos = [(pos[i][0]-cx, pos[i][1]-lo[1], pos[i][2]-cz) for i in used]
    new_nrm = [normals[i] for i in used]
    new_idx = [remap[indices[i+j]] for i in selected_faces for j in range(3)]
    colors = []
    for old, p in zip(used, new_pos):
        r = roots[old]
        if info[r]['faces'] > 300:  # the cap is a separate connected surface
            cap_lo, cap_hi = info[r]['lo'][1], info[r]['hi'][1]
            height = (pos[old][1]-cap_lo) / max(.001, cap_hi-cap_lo)
            color = mix(rgb('#bfc5b6'), rgb('#e9e9d8'), height * .82 + .10)
            if normals[old][1] < -.3:
                color = mix(color, rgb('#a7b3a9'), .35)
        else:
            color = rgb('#d5daca')
            if p[1] < .025:
                color = mix(color, rgb('#829477'), .32)
        colors.append(rgba(color, p, .045, old % 31))
    return new_pos, new_nrm, new_idx, colors


def ground_height(pos, indices, x, z):
    found = []
    for i in range(0, len(indices), 3):
        a, b, c = (pos[indices[i+j]] for j in range(3))
        if min(a[1], b[1], c[1]) > .13:
            continue
        den = (b[2]-c[2])*(a[0]-c[0]) + (c[0]-b[0])*(a[2]-c[2])
        if abs(den) < 1e-10:
            continue
        u = ((b[2]-c[2])*(x-c[0]) + (c[0]-b[0])*(z-c[2])) / den
        v = ((c[2]-a[2])*(x-c[0]) + (a[0]-c[0])*(z-c[2])) / den
        w = 1-u-v
        if min(u, v, w) >= -1e-5:
            y = u*a[1] + v*b[1] + w*c[1]
            if y <= .13:
                found.append(y)
    assert found, f'No ground at {(x, z)}'
    return max(found)


class GLB:
    def __init__(self):
        self.data = bytearray()
        self.views = []
        self.accessors = []
        self.meshes = []

    def view(self, data, target):
        self.data += b'\0' * ((-len(self.data)) % 4)
        offset = len(self.data)
        self.data += data
        self.views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(data), 'target': target})
        return len(self.views)-1

    def accessor(self, view, component, count, kind, **other):
        self.accessors.append({'bufferView': view, 'componentType': component, 'count': count, 'type': kind, **other})
        return len(self.accessors)-1

    def mesh(self, name, pos, normals, indices, colors, material):
        assert len(pos) == len(normals) == len(colors)
        assert max(indices) < len(pos) and len(indices) % 3 == 0
        pv = self.view(struct.pack('<'+'f'*(3*len(pos)), *(x for p in pos for x in p)), 34962)
        nv = self.view(struct.pack('<'+'f'*(3*len(normals)), *(x for n in normals for x in n)), 34962)
        cv = self.view(bytes(x for c in colors for x in c), 34962)
        iv = self.view(struct.pack('<'+'I'*len(indices), *indices), 34963)
        pa = self.accessor(pv, 5126, len(pos), 'VEC3', min=[min(p[k] for p in pos) for k in range(3)], max=[max(p[k] for p in pos) for k in range(3)])
        na = self.accessor(nv, 5126, len(normals), 'VEC3')
        ca = self.accessor(cv, 5121, len(colors), 'VEC4', normalized=True)
        ia = self.accessor(iv, 5125, len(indices), 'SCALAR')
        self.meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': pa, 'NORMAL': na, 'COLOR_0': ca}, 'indices': ia, 'material': material, 'mode': 4}]})
        return len(self.meshes)-1

    def save(self, path, nodes):
        d = {
            'asset': {'version': '2.0', 'generator': 'Codex forest scene compositor'},
            'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes, 'meshes': self.meshes,
            'materials': [
                {'name': 'colored_felt_forest', 'pbrMetallicRoughness': {'baseColorFactor': [1,1,1,1], 'metallicFactor': 0, 'roughnessFactor': .96}},
                {'name': 'ivory_felt_mushrooms', 'pbrMetallicRoughness': {'baseColorFactor': [1,1,1,1], 'metallicFactor': 0, 'roughnessFactor': .94}},
            ],
            'buffers': [{'byteLength': len(self.data)}], 'bufferViews': self.views, 'accessors': self.accessors,
        }
        jb = json.dumps(d, separators=(',', ':')).encode()
        jb += b' ' * ((-len(jb)) % 4)
        self.data += b'\0' * ((-len(self.data)) % 4)
        total = 12+8+len(jb)+8+len(self.data)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('wb') as f:
            f.write(struct.pack('<4sII', b'glTF', 2, total))
            f.write(struct.pack('<I4s', len(jb), b'JSON'))
            f.write(jb)
            f.write(struct.pack('<I4s', len(self.data), b'BIN\0'))
            f.write(self.data)
        return d


def build():
    _, fp, fn, fi = READ(FOREST)
    _, mp, mn, mi = READ(MUSHROOM)
    roots, info = components(fp, fi)
    fc = forest_colors(fp, fn, roots, info)
    mp, mn, mi, mc = extract_one_mushroom_cluster(mp, mn, mi)
    glb = GLB()
    glb.mesh('forest_colored', fp, fn, fi, fc, 0)
    glb.mesh('five_mushrooms_colored', mp, mn, mi, mc, 1)
    placements = [(-.36, .235, .54, -.35), (-.055, .215, .55, .4), (.405, .175, .43, -.7)]
    nodes = [{'name': 'forest_scene', 'children': [1, 2, 3, 4]}, {'name': 'forest_terrain_trees_logs', 'mesh': 0}]
    for i, (x, z, scale, angle) in enumerate(placements, 1):
        y = ground_height(fp, fi, x, z) + .003
        nodes.append({'name': f'mushroom_cluster_{i}', 'mesh': 1, 'translation': [x, y, z], 'rotation': [0, math.sin(angle/2), 0, math.cos(angle/2)], 'scale': [scale, scale, scale]})
    doc = glb.save(OUT, nodes)
    return {'path': str(OUT), 'bytes': OUT.stat().st_size, 'forest_triangles': len(fi)//3, 'mushroom_triangles_each': len(mi)//3, 'mushroom_clusters': len(placements), 'scene_nodes': len(doc['nodes'])}


if __name__ == '__main__':
    print(json.dumps(build(), ensure_ascii=False))
