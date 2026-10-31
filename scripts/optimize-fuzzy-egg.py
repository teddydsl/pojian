#!/usr/bin/env python3
"""Reduce the dense cocoon mesh while retaining its embedded felt texture."""

from array import array
from io import BytesIO
from pathlib import Path
import json
import struct

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'reviews/source-glb/fuzzy-egg-original.glb'
OUTPUT = ROOT / 'public/assets/models/fuzzy-egg-game.glb'
PREVIEW = ROOT / 'reviews/fuzzy-egg-game-preview.png'
GRID = 96


raw = SOURCE.read_bytes()
if raw[:4] != b'glTF':
    raise ValueError('Expected a GLB source')
json_length = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + json_length])
binary_start = 28 + json_length
primitive = doc['meshes'][0]['primitives'][0]


def data_view(accessor_id):
    accessor = doc['accessors'][accessor_id]
    view = doc['bufferViews'][accessor['bufferView']]
    offset = binary_start + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    return accessor, offset


position_accessor, position_offset = data_view(primitive['attributes']['POSITION'])
uv_accessor, uv_offset = data_view(primitive['attributes']['TEXCOORD_0'])
index_accessor, index_offset = data_view(primitive['indices'])
assert position_accessor['count'] == uv_accessor['count']
assert index_accessor['componentType'] == 5125

texture_index = doc['materials'][primitive['material']]['pbrMetallicRoughness']['baseColorTexture']['index']
image_index = doc['textures'][texture_index]['source']
image_view = doc['bufferViews'][doc['images'][image_index]['bufferView']]
image_start = binary_start + image_view.get('byteOffset', 0)
image_end = image_start + image_view['byteLength']
image_bytes = raw[image_start:image_end]
atlas = Image.open(BytesIO(image_bytes)).convert('RGB')
pixel = atlas.load()


# Keep UV islands apart while clustering positions. This retains the supplied
# high-resolution fiber atlas and avoids blending different felt patches.
cells = {}
samples = []
remap = array('I')
for index in range(position_accessor['count']):
    x, y, z = struct.unpack_from('<fff', raw, position_offset + index * 12)
    u, v = struct.unpack_from('<ff', raw, uv_offset + index * 8)
    key = (int((x + .45) * GRID), int(y * GRID), int((z + .46) * GRID),
           int(u * 64), int(v * 64))
    target = cells.get(key)
    if target is None:
        target = len(samples)
        cells[key] = target
        samples.append([0.0] * 6)
    item = samples[target]
    item[0] += x; item[1] += y; item[2] += z
    item[3] += u; item[4] += v; item[5] += 1
    remap.append(target)

positions = []
uvs = []
for item in samples:
    count = item[5]
    positions.append(tuple(item[k] / count for k in range(3)))
    uvs.append((item[3] / count, item[4] / count))

faces = []
end = index_offset + index_accessor['count'] * 4
for a, b, c in struct.iter_unpack('<III', memoryview(raw)[index_offset:end]):
    a, b, c = remap[a], remap[b], remap[c]
    if a != b and b != c and a != c:
        faces.append((a, b, c))


def chunk(buffer, data):
    buffer.extend(b'\0' * (-len(buffer) % 4))
    offset = len(buffer)
    buffer.extend(data)
    return offset, len(data)


binary = bytearray()
position_view = chunk(binary, b''.join(struct.pack('<3f', *p) for p in positions))
uv_view = chunk(binary, b''.join(struct.pack('<2f', *uv) for uv in uvs))
index_view = chunk(binary, b''.join(struct.pack('<3I', *f) for f in faces))
image_binary_view = chunk(binary, image_bytes)
views = []
for i, (offset, length) in enumerate((position_view, uv_view, index_view, image_binary_view)):
    view = {'buffer': 0, 'byteOffset': offset, 'byteLength': length}
    if i < 3: view['target'] = 34963 if i == 2 else 34962
    views.append(view)
mins = [min(p[k] for p in positions) for k in range(3)]
maxs = [max(p[k] for p in positions) for k in range(3)]
game = {
    'asset': {'version': '2.0', 'generator': 'Pojian local cocoon optimizer'},
    'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': 'fuzzy_egg_cocoon', 'mesh': 0}],
    'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'TEXCOORD_0': 1},
                               'indices': 2, 'material': 0, 'mode': 4}]}],
    'materials': [{'name': 'textured_felt_cocoon', 'pbrMetallicRoughness': {
        'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': 0},
        'metallicFactor': 0, 'roughnessFactor': 1},
        'doubleSided': True}],
    'images': [{'bufferView': 3, 'mimeType': 'image/jpeg'}],
    'textures': [{'source': 0, 'sampler': 0}],
    'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
    'buffers': [{'byteLength': len(binary)}], 'bufferViews': views,
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3', 'min': mins, 'max': maxs},
        {'bufferView': 1, 'componentType': 5126, 'count': len(uvs), 'type': 'VEC2'},
        {'bufferView': 2, 'componentType': 5125, 'count': len(faces) * 3, 'type': 'SCALAR'},
    ],
}
encoded = json.dumps(game, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
binary.extend(b'\0' * (-len(binary) % 4))
payload = struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(binary), 0x004E4942) + binary
OUTPUT.write_bytes(struct.pack('<III', 0x46546C67, 2, len(payload) + 12) + payload)


def render_preview():
    width, height = 500, 560
    sheet = Image.new('RGB', (width * 4, height), '#efe8de')
    views = [
        ('FRONT +Z', (0, 0, 1), lambda p: (p[0], p[1])),
        ('RIGHT +X', (1, 0, 0), lambda p: (-p[2], p[1])),
        ('BACK -Z', (0, 0, -1), lambda p: (-p[0], p[1])),
        ('TOP +Y', (0, 1, 0), lambda p: (p[0], -p[2])),
    ]
    for vi, (label, eye, project) in enumerate(views):
        image = Image.new('RGB', (width, height), '#efe8de')
        draw = ImageDraw.Draw(image)
        triangles = []
        for a, b, c in faces:
            pa, pb, pc = positions[a], positions[b], positions[c]
            ab = tuple(pb[k] - pa[k] for k in range(3))
            ac = tuple(pc[k] - pa[k] for k in range(3))
            normal = (ab[1]*ac[2] - ab[2]*ac[1], ab[2]*ac[0] - ab[0]*ac[2], ab[0]*ac[1] - ab[1]*ac[0])
            if sum(normal[k] * eye[k] for k in range(3)) <= 0:
                continue
            center = tuple((pa[k] + pb[k] + pc[k]) / 3 for k in range(3))
            depth = sum(center[k] * eye[k] for k in range(3))
            u = sum(uvs[index][0] for index in (a, b, c)) / 3
            v = sum(uvs[index][1] for index in (a, b, c)) / 3
            color = pixel[max(0, min(atlas.width - 1, round((u % 1) * (atlas.width - 1)))),
                          max(0, min(atlas.height - 1, round((v % 1) * (atlas.height - 1))))]
            triangles.append((depth, (pa, pb, pc), color))
        triangles.sort(key=lambda value: value[0])
        for _, points, color in triangles:
            xy = []
            for p in points:
                x, y = project(p)
                xy.append((width / 2 + x * 430, (height / 2 - y * 430) if label.startswith('TOP') else height - 50 - y * 430))
            draw.polygon(xy, fill=color)
        draw.text((16, 16), label, fill='#554c42')
        sheet.paste(image, (vi * width, 0))
    sheet.save(PREVIEW)


render_preview()
print(json.dumps({'output': str(OUTPUT), 'bytes': OUTPUT.stat().st_size,
                  'source_triangles': index_accessor['count'] // 3, 'game_triangles': len(faces),
                  'game_vertices': len(positions), 'bounds': [mins, maxs]}))
