#!/usr/bin/env python3
"""Keep one figure from the triptych and restore a modeled red backpack.

The source GLB has no texture, UVs, or vertex colors. This makes a separate
review asset, leaving the game model and the original file untouched.
"""

import json
import math
import struct
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/models/hedgehog-plush-original.glb"
OUTPUT = ROOT / "public/assets/models/hedgehog-plush-backpack-review.glb"
SHEET = ROOT / "reviews/hedgehog-plush-backpack-review.png"


def load_glb(path):
    raw = path.read_bytes()
    if raw[:4] != b"glTF":
        raise ValueError("Source is not a binary glTF file")
    offset = 12
    chunks = {}
    while offset < len(raw):
        length, kind = struct.unpack_from("<II", raw, offset)
        chunks[kind] = raw[offset + 8:offset + 8 + length]
        offset += 8 + length
    doc = json.loads(chunks[0x4E4F534A])
    binary = chunks[0x004E4942]

    def read_accessor(index):
        acc = doc["accessors"][index]
        view = doc["bufferViews"][acc["bufferView"]]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        component_count = {"SCALAR": 1, "VEC3": 3}[acc["type"]]
        fmt = {5126: "f", 5125: "I", 5123: "H"}[acc["componentType"]]
        data = struct.unpack_from("<" + fmt * (acc["count"] * component_count), binary, start)
        if component_count == 1:
            return data
        return [data[i:i + component_count] for i in range(0, len(data), component_count)]

    prim = doc["meshes"][0]["primitives"][0]
    return (read_accessor(prim["attributes"]["POSITION"]),
            read_accessor(prim["attributes"]["NORMAL"]),
            read_accessor(prim["indices"]))


positions, normals, indices = load_glb(SOURCE)
# The figures are separate in X. No triangle crosses this cut.
front_triangles = [tuple(indices[i:i + 3]) for i in range(0, len(indices), 3)
                   if all(positions[v][0] < -0.2 for v in indices[i:i + 3])]
assert len(front_triangles) == 3409, "The source triptych geometry changed"

parent = list(range(len(positions)))


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


for a, b, c in front_triangles:
    parent[find(b)] = find(a)
    parent[find(c)] = find(a)
sizes = defaultdict(set)
for tri in front_triangles:
    for v in tri:
        sizes[find(v)].add(v)
component_ids = {root: number for number, (root, _) in
                 enumerate(sorted(sizes.items(), key=lambda item: -len(item[1])))}


def clamp(value):
    return max(0, min(255, round(value)))


def shade_color(rgb, variation=0):
    return tuple(clamp(channel * variation) for channel in rgb)


def color_triangle(tri, component):
    cx, cy, cz = (sum(positions[v][axis] for v in tri) / 3 for axis in range(3))
    # The single figure is centered around x=-0.359. x is deliberately kept
    # in source coordinates here so thresholds can be compared with the source.
    dx = abs(cx + 0.359)
    base = (201, 163, 120)
    if component == 1:
        base = (174, 37, 40)  # straps and scarf edges
    elif component == 2:
        base = (228, 219, 201)  # off-white goggle frame
    elif component in (3, 4):
        base = (45, 61, 70)  # dark elastic goggle band
    elif component in (5, 6, 7, 8):
        base = (111, 68, 48)  # paws / boot details
    elif component in (9, 10):
        base = (36, 31, 29)  # small facial marks
    else:
        # Main contiguous surface includes face, belly, quills, arms and pack.
        # Visible forward skin at z>0 changes from cream to warm beige at paws.
        if cz > 0.148 and 0.218 < cy < 0.25 and dx < 0.012:
            base = (42, 32, 31)  # nose
        elif 0.117 < cy < 0.207 and cz > 0.044 and dx < min(0.076, (cy - 0.117) * 0.94):
            base = (173, 37, 43)  # scarf's triangular front
        elif cz > 0.065 and cy > 0.205 and dx < 0.105:
            base = (243, 223, 196)  # face
        elif cz > 0.035 and 0.035 < cy <= 0.215 and dx < 0.09:
            base = (238, 222, 199)  # fuzzy belly
        elif cz > 0.042 and 0.16 < cy < 0.27 and dx > 0.069:
            base = (211, 156, 128)  # ears / cheeks
        elif cz > 0.05 and cy < 0.15 and dx > 0.052:
            base = (183, 133, 102)  # little arms
        elif cy < 0.047:
            base = (126, 83, 56)  # feet
        elif cz < -0.115 and 0.08 < cy < 0.24 and dx < 0.07:
            base = (157, 44, 38)  # red backpack
        else:
            # Staggered warm-brown quills. Deterministic per-triangle color.
            value = (tri[0] * 13 + tri[1] * 7 + tri[2] * 3) % 11
            base = (159 + value * 3, 109 + value * 2, 71 + value)
    return base


def make_vertices():
    points, surface_normals, colors, faces = [], [], [], []
    def add_triangle(a, b, c, color):
        ab = tuple(b[k] - a[k] for k in range(3))
        ac = tuple(c[k] - a[k] for k in range(3))
        normal = (ab[1]*ac[2] - ab[2]*ac[1], ab[2]*ac[0] - ab[0]*ac[2], ab[0]*ac[1] - ab[1]*ac[0])
        magnitude = math.sqrt(sum(value*value for value in normal)) or 1
        start = len(points)
        points.extend((a, b, c))
        surface_normals.extend([tuple(value/magnitude for value in normal)] * 3)
        colors.extend([(*color, 255)] * 3)
        faces.append((start, start + 1, start + 2))

    def rounded_panel(cx, cy, width, height, radius, z_front, z_back, color):
        outline = []
        for ox, oy, first in ((width/2-radius, height/2-radius, 0),
                              (-width/2+radius, height/2-radius, 90),
                              (-width/2+radius, -height/2+radius, 180),
                              (width/2-radius, -height/2+radius, 270)):
            for step in range(5):
                angle = math.radians(first + step * 90/4)
                outline.append((cx + ox + radius*math.cos(angle),
                                cy + oy + radius*math.sin(angle)))
        n = len(outline)
        for i in range(n):
            x0, y0 = outline[i]
            x1, y1 = outline[(i + 1) % n]
            # Viewer-facing cap is on the negative Z side of the character.
            add_triangle((cx, cy, z_front), (x1, y1, z_front), (x0, y0, z_front), color)
            add_triangle((cx, cy, z_back), (x0, y0, z_back), (x1, y1, z_back), color)
            side = tuple(max(0, round(v * .79)) for v in color)
            add_triangle((x0, y0, z_front), (x1, y1, z_front), (x1, y1, z_back), side)
            add_triangle((x0, y0, z_front), (x1, y1, z_back), (x0, y0, z_back), side)

    for tri in front_triangles:
        component = component_ids[find(tri[0])]
        color = color_triangle(tri, component)
        start = len(points)
        for vertex in tri:
            x, y, z = positions[vertex]
            points.append((x + 0.359, y, z))
            surface_normals.append(normals[vertex])
            colors.append((*color, 255))
        faces.append((start, start + 1, start + 2))
    def add_disc(x_center, y_center, z, rx, ry, color, steps=24):
        """Add a colored face to an untextured sculpted detail."""
        for step in range(steps):
            angles = (2 * math.pi * step / steps, 2 * math.pi * (step + 1) / steps)
            new_points = [(x_center, y_center, z)]
            new_points += [(x_center + math.cos(angle) * rx,
                            y_center + math.sin(angle) * ry, z)
                           for angle in angles]
            start = len(points)
            points.extend(new_points)
            surface_normals.extend([(0, 0, 1)] * 3)
            colors.extend([(*color, 255)] * 3)
            faces.append((start, start + 1, start + 2))

    # The original mesh has open goggle frames but no glass surfaces. These
    # inset faces sit behind the sculpted frames, with round inset eyes below.
    for x_center in (-0.037, 0.037):
        add_disc(x_center, 0.315, 0.111, 0.021, 0.015, (29, 92, 140))
        add_disc(x_center, 0.245, 0.114, 0.0074, 0.009, (31, 27, 27))
        add_disc(x_center - 0.002, 0.248, 0.115, 0.0018, 0.0022, (248, 242, 229), steps=12)

    # The triptych's front figure has only straps and a flat back patch. The
    # backpack body is fused into the back figure's main shell, so rebuild its
    # rounded volume and attach the actual separate pocket/handle hardware.
    rounded_panel(0, .166, .158, .172, .016, -.254, -.156, (210, 51, 45))
    rounded_panel(0, .218, .154, .070, .012, -.272, -.252, (225, 55, 48))
    rounded_panel(0, .178, .150, .008, .003, -.274, -.269, (126, 31, 29))

    back_triangles = [tuple(indices[i:i + 3]) for i in range(0, len(indices), 3)
                      if all(positions[v][0] > .2 for v in indices[i:i + 3])]
    back_parent = {v: v for tri in back_triangles for v in tri}
    def back_find(x):
        while back_parent[x] != x:
            back_parent[x] = back_parent[back_parent[x]]
            x = back_parent[x]
        return x
    for a, b, c in back_triangles:
        back_parent[back_find(b)] = back_find(a)
        back_parent[back_find(c)] = back_find(a)
    back_groups = defaultdict(set)
    for tri in back_triangles:
        for v in tri:
            back_groups[back_find(v)].add(v)
    back_ids = {root: number for number, (root, _) in
                enumerate(sorted(back_groups.items(), key=lambda item: -len(item[1])))}
    detail_colors = {3: (216, 52, 46), 4: (154, 38, 34),
                     5: (172, 116, 65), 6: (172, 116, 65)}
    for tri in back_triangles:
        component = back_ids[back_find(tri[0])]
        if component not in detail_colors:
            continue
        transformed = [(positions[v][0] - .306, positions[v][1],
                        -positions[v][2] - .130) for v in tri]
        # Mirroring Z reverses winding; recover the outward-facing surface.
        add_triangle(transformed[0], transformed[2], transformed[1], detail_colors[component])
    return points, surface_normals, colors, faces


points, surface_normals, colors, faces = make_vertices()


def append_buffer(binary, chunk):
    while len(binary) % 4:
        binary.append(0)
    start = len(binary)
    binary.extend(chunk)
    return start, len(chunk)


def write_glb():
    binary = bytearray()
    pos_offset, pos_length = append_buffer(binary, b"".join(struct.pack("<3f", *p) for p in points))
    normal_offset, normal_length = append_buffer(binary, b"".join(struct.pack("<3f", *n) for n in surface_normals))
    color_offset, color_length = append_buffer(binary, b"".join(bytes(c) for c in colors))
    index_offset, index_length = append_buffer(binary, b"".join(struct.pack("<I", n) for face in faces for n in face))
    mins = [min(p[k] for p in points) for k in range(3)]
    maxs = [max(p[k] for p in points) for k in range(3)]
    document = {
        "asset": {"version": "2.0", "generator": "Pojian local single-character color review"},
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Single colored hedgehog"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2}, "indices": 3, "material": 0, "mode": 4}]}],
        "materials": [{"name": "hand colored felt review", "pbrMetallicRoughness": {
            "baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 1}, "doubleSided": True}],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(points), "type": "VEC3", "min": mins, "max": maxs},
            {"bufferView": 1, "componentType": 5126, "count": len(points), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5121, "normalized": True, "count": len(points), "type": "VEC4"},
            {"bufferView": 3, "componentType": 5125, "count": len(faces) * 3, "type": "SCALAR"}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_offset, "byteLength": pos_length, "target": 34962},
            {"buffer": 0, "byteOffset": normal_offset, "byteLength": normal_length, "target": 34962},
            {"buffer": 0, "byteOffset": color_offset, "byteLength": color_length, "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": index_length, "target": 34963}],
        "buffers": [{"byteLength": len(binary)}],
    }
    js = json.dumps(document, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary.extend(b"\x00" * (-len(binary) % 4))
    content = struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(binary), 0x004E4942) + binary
    OUTPUT.write_bytes(struct.pack("<III", 0x46546C67, 2, len(content) + 12) + content)


def render_sheet(path, diagnostic=False):
    width, height = 430, 545
    bg = (240, 232, 218)
    sheet = Image.new("RGB", (width * 4, height), bg)
    font = ImageFont.load_default()
    views = [("FRONT", lambda p: (p[0], p[1]), (0, 0, 1)),
             ("RIGHT", lambda p: (-p[2], p[1]), (1, 0, 0)),
             ("BACK", lambda p: (-p[0], p[1]), (0, 0, -1)),
             ("TOP", lambda p: (p[0], -p[2]), (0, 1, 0))]
    palette = [(193, 193, 193), (236, 69, 70), (250, 228, 63),
               (59, 177, 239), (55, 77, 240), (230, 94, 211),
               (24, 190, 146), (255, 153, 65), (112, 218, 76),
               (40, 36, 38), (118, 64, 141)]
    for vi, (name, project, eye) in enumerate(views):
        image = Image.new("RGB", (width, height), bg)
        draw = ImageDraw.Draw(image)
        shapes = []
        source_faces = front_triangles if diagnostic else faces
        source_points = positions if diagnostic else points
        for index, tri in enumerate(source_faces):
            pa, pb, pc = (source_points[v] for v in tri)
            ab = (pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2])
            ac = (pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2])
            cross = (ab[1] * ac[2] - ab[2] * ac[1],
                     ab[2] * ac[0] - ab[0] * ac[2],
                     ab[0] * ac[1] - ab[1] * ac[0])
            magnitude = math.sqrt(sum(c * c for c in cross)) or 1
            normal = tuple(c / magnitude for c in cross)
            if sum(normal[k] * eye[k] for k in range(3)) <= 0.01:
                continue
            depth = sum((pa[k] + pb[k] + pc[k]) * eye[k] / 3 for k in range(3))
            group = component_ids[find(tri[0])] if diagnostic else None
            base = palette[group] if diagnostic else colors[index * 3][:3]
            light = 0.72 + 0.28 * max(0, normal[0] * 0.35 + normal[1] * 0.7 + normal[2] * 0.65)
            color = tuple(clamp(c * light) for c in base)
            shapes.append((depth, (pa, pb, pc), color))
        shapes.sort(key=lambda shape: shape[0])
        for _, triangle, color in shapes:
            corners = []
            for p in triangle:
                x, y = project((p[0] + (0.359 if diagnostic else 0), p[1], p[2]))
                if name == "TOP":
                    corners.append((width / 2 + x * 970, height / 2 - y * 970))
                else:
                    corners.append((width / 2 + x * 970, height - 60 - y * 970))
            draw.polygon(corners, fill=color)
        draw.text((16, 15), name, fill=(57, 48, 44), font=font)
        sheet.paste(image, (vi * width, 0))
    sheet.save(path)


write_glb()
render_sheet(SHEET)
print(f"{OUTPUT} ({OUTPUT.stat().st_size:,} bytes, {len(faces):,} triangles, 1 character)")
print(SHEET)
