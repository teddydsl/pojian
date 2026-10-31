#!/usr/bin/env python3
"""Cluster dense Tripo geometry before meshoptimizer simplification.

This lossily removes tiny disconnected fiber geometry while retaining the
original PBR material and all three embedded textures. Output is an
intermediate GLB; run glTF Transform's simplify/reorder/resize afterward.
"""

from array import array
from pathlib import Path
import argparse
import copy
import json
import math
import struct
import sys


def read_glb(path):
    raw = path.read_bytes()
    if raw[:4] != b'glTF' or struct.unpack_from('<I', raw, 4)[0] != 2:
        raise ValueError('Expected glTF 2.0 GLB')
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    binary_start = 28 + length
    return raw, doc, binary_start


def accessor_data(raw, doc, binary_start, accessor_id):
    accessor = doc['accessors'][accessor_id]
    view = doc['bufferViews'][accessor['bufferView']]
    offset = binary_start + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    return accessor, offset, view.get('byteStride')


def append_chunk(binary, data, target=None):
    binary.extend(b'\0' * (-len(binary) % 4))
    view = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)}
    if target is not None:
        view['target'] = target
    binary.extend(data)
    return view


def build(source, output, grid, uv_grid):
    raw, doc, binary_start = read_glb(source)
    if len(doc['meshes']) != 1 or len(doc['meshes'][0]['primitives']) != 1:
        raise ValueError('Expected one mesh primitive')
    primitive = doc['meshes'][0]['primitives'][0]
    attrs = primitive['attributes']
    pos, pos_off, pos_stride = accessor_data(raw, doc, binary_start, attrs['POSITION'])
    norm, norm_off, norm_stride = accessor_data(raw, doc, binary_start, attrs['NORMAL'])
    uv, uv_off, uv_stride = accessor_data(raw, doc, binary_start, attrs['TEXCOORD_0'])
    idx, idx_off, idx_stride = accessor_data(raw, doc, binary_start, primitive['indices'])
    if not (pos['count'] == norm['count'] == uv['count'] and idx['componentType'] in (5123, 5125)):
        raise ValueError('Unsupported attribute layout')
    index_width = 2 if idx['componentType'] == 5123 else 4
    if idx_stride not in (None, index_width):
        raise ValueError('Unsupported index stride')
    pos_stride = pos_stride or 12
    norm_stride = norm_stride or 12
    uv_stride = uv_stride or 8
    lo = pos['min']
    hi = pos['max']
    span = [max(hi[k] - lo[k], 1e-9) for k in range(3)]

    cells = {}
    sums = []
    remap = array('I')
    for i in range(pos['count']):
        x, y, z = struct.unpack_from('<3f', raw, pos_off + i * pos_stride)
        nx, ny, nz = struct.unpack_from('<3f', raw, norm_off + i * norm_stride)
        u, v = struct.unpack_from('<2f', raw, uv_off + i * uv_stride)
        key = (
            math.floor((x - lo[0]) / span[0] * grid),
            math.floor((y - lo[1]) / span[1] * grid),
            math.floor((z - lo[2]) / span[2] * grid),
            math.floor(u * uv_grid), math.floor(v * uv_grid),
        )
        j = cells.get(key)
        if j is None:
            j = len(sums)
            cells[key] = j
            sums.append([0.0] * 9)
        s = sums[j]
        s[0] += x; s[1] += y; s[2] += z
        s[3] += nx; s[4] += ny; s[5] += nz
        s[6] += u; s[7] += v; s[8] += 1.0
        remap.append(j)

    positions = array('f')
    normals = array('f')
    uvs = array('f')
    for s in sums:
        count = s[8]
        positions.extend((s[0] / count, s[1] / count, s[2] / count))
        mag = math.sqrt(s[3] ** 2 + s[4] ** 2 + s[5] ** 2) or 1.0
        normals.extend((s[3] / mag, s[4] / mag, s[5] / mag))
        uvs.extend((s[6] / count, s[7] / count))

    faces = array('I')
    end = idx_off + idx['count'] * index_width
    face_format = '<HHH' if index_width == 2 else '<III'
    for a, b, c in struct.iter_unpack(face_format, memoryview(raw)[idx_off:end]):
        a, b, c = remap[a], remap[b], remap[c]
        if a != b and b != c and a != c:
            faces.extend((a, b, c))

    out_binary = bytearray()
    views = [
        append_chunk(out_binary, positions.tobytes(), 34962),
        append_chunk(out_binary, normals.tobytes(), 34962),
        append_chunk(out_binary, uvs.tobytes(), 34962),
        append_chunk(out_binary, faces.tobytes(), 34963),
    ]
    images = copy.deepcopy(doc.get('images', []))
    for img in images:
        source_view = doc['bufferViews'][img['bufferView']]
        start = binary_start + source_view.get('byteOffset', 0)
        end = start + source_view['byteLength']
        img['bufferView'] = len(views)
        views.append(append_chunk(out_binary, raw[start:end]))

    mins = [min(positions[k::3]) for k in range(3)]
    maxs = [max(positions[k::3]) for k in range(3)]
    result = {
        'asset': {'version': '2.0', 'generator': 'Pojian geometry cluster'},
        'scene': doc.get('scene', 0),
        'scenes': copy.deepcopy(doc['scenes']),
        'nodes': copy.deepcopy(doc['nodes']),
        'meshes': [{'name': doc['meshes'][0].get('name', source.stem),
                    'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2},
                                    'indices': 3, 'material': primitive['material'], 'mode': 4}]}],
        'materials': copy.deepcopy(doc['materials']),
        'images': images,
        'textures': copy.deepcopy(doc['textures']),
        'samplers': copy.deepcopy(doc.get('samplers', [])),
        'buffers': [{'byteLength': len(out_binary)}],
        'bufferViews': views,
        'accessors': [
            {'bufferView': 0, 'componentType': 5126, 'count': len(sums), 'type': 'VEC3', 'min': mins, 'max': maxs},
            {'bufferView': 1, 'componentType': 5126, 'count': len(sums), 'type': 'VEC3'},
            {'bufferView': 2, 'componentType': 5126, 'count': len(sums), 'type': 'VEC2'},
            {'bufferView': 3, 'componentType': 5125, 'count': len(faces), 'type': 'SCALAR'},
        ],
    }
    encoded = json.dumps(result, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    out_binary.extend(b'\0' * (-len(out_binary) % 4))
    payload = struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
    payload += struct.pack('<II', len(out_binary), 0x004E4942) + out_binary
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(struct.pack('<III', 0x46546C67, 2, len(payload) + 12) + payload)
    print(json.dumps({'source': str(source), 'output': str(output),
                      'source_triangles': idx['count'] // 3,
                      'clustered_triangles': len(faces) // 3,
                      'clustered_vertices': len(sums), 'bytes': output.stat().st_size}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--grid', type=int, default=96)
    parser.add_argument('--uv-grid', type=int, default=48)
    args = parser.parse_args()
    build(args.source, args.output, args.grid, args.uv_grid)
