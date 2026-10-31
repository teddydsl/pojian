#!/usr/bin/env python3
"""Build a compact, original needle-felt hedgehog GLB from the supplied views.

No Tripo data or network access is used.  Coordinates: Y up, face toward +Z,
feet on Y=0.  Run from anywhere with Python 3.10+.
"""

from __future__ import annotations

import json
import math
import random
import struct
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "public/assets/models/hedgehog-felt.glb"
RNG = random.Random(20261030)


def add3(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub3(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul3(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def norm(a):
    d = math.sqrt(dot(a, a)) or 1
    return mul3(a, 1 / d)


def col(hex_color, variance=0):
    h = hex_color.lstrip("#")
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    if variance:
        delta = RNG.uniform(-variance, variance)
        rgb = [max(0, min(255, round(v * (1 + delta)))) for v in rgb]
    return (*rgb, 255)


MATERIALS = [
    ("felt_cream", "#f0dfc8", .94, 0),
    ("felt_face", "#f4e2ca", .96, 0),
    ("felt_brown", "#947052", .94, 0),
    ("quills_brown", "#9a6946", .96, 0),
    ("quills_tips", "#d5af86", .96, 0),
    ("scarf_red", "#c9261e", .91, 0),
    ("backpack_red", "#ba3029", .88, 0),
    ("backpack_dark", "#8b211d", .93, 0),
    ("leather_tan", "#be7d44", .87, 0),
    ("leather_dark", "#603a2e", .88, 0),
    ("goggle_white", "#e9e3da", .65, 0),
    ("goggle_rubber", "#252937", .88, 0),
    ("goggle_lens", "#117fbd", .16, .12),
    ("eye_black", "#120f12", .10, 0),
    ("eye_white", "#fff8ea", .25, 0),
    ("cheek_pink", "#d68c7d", .96, 0),
    ("metal", "#b9b2aa", .35, .7),
    ("mouth", "#6c3c30", .90, 0),
]
MID = {m[0]: i for i, m in enumerate(MATERIALS)}


class Mesh:
    def __init__(self):
        self.groups = [dict(p=[], n=[], c=[], i=[]) for _ in MATERIALS]

    def vertex(self, material, p, n, color=None, variation=0):
        g = self.groups[MID[material]]
        idx = len(g["p"])
        g["p"].append(p)
        g["n"].append(norm(n))
        g["c"].append(col(color or MATERIALS[MID[material]][1], variation))
        return idx

    def tri(self, material, a, b, c):
        self.groups[MID[material]]["i"].extend((a, b, c))

    def ellipsoid(self, material, center, radii, color=None, rows=16, cols=28, variation=0):
        grid = []
        for i in range(rows + 1):
            theta = math.pi * i / rows
            line = []
            for j in range(cols + 1):
                phi = 2 * math.pi * j / cols
                u = (math.sin(theta) * math.cos(phi), math.cos(theta), math.sin(theta) * math.sin(phi))
                p = add3(center, (radii[0] * u[0], radii[1] * u[1], radii[2] * u[2]))
                n = (u[0] / radii[0], u[1] / radii[1], u[2] / radii[2])
                line.append(self.vertex(material, p, n, color, variation))
            grid.append(line)
        for i in range(rows):
            for j in range(cols):
                a, b, c, d = grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1]
                self.tri(material, a, c, b)
                self.tri(material, c, d, b)

    def rounded_box(self, material, center, half, radius, color=None, variation=0, steps=7):
        for axis in range(3):
            other = [q for q in range(3) if q != axis]
            for sign in (-1, 1):
                grid = []
                for i in range(steps + 1):
                    line = []
                    for j in range(steps + 1):
                        q = [0.0, 0.0, 0.0]
                        q[axis] = sign * half[axis]
                        q[other[0]] = (i / steps * 2 - 1) * half[other[0]]
                        q[other[1]] = (j / steps * 2 - 1) * half[other[1]]
                        inner = [max(-half[k] + radius, min(half[k] - radius, q[k])) for k in range(3)]
                        delta = sub3(q, inner)
                        p = add3(center, add3(inner, mul3(norm(delta), radius)))
                        n = norm(delta)
                        line.append((self.vertex(material, p, n, color, variation), p))
                    grid.append(line)
                for i in range(steps):
                    for j in range(steps):
                        a, b, c, d = grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1]
                        outward = [0, 0, 0]
                        outward[axis] = sign
                        if dot(cross(sub3(b[1], a[1]), sub3(c[1], a[1])), outward) > 0:
                            self.tri(material, a[0], b[0], c[0])
                            self.tri(material, c[0], b[0], d[0])
                        else:
                            self.tri(material, a[0], c[0], b[0])
                            self.tri(material, c[0], d[0], b[0])

    def tube(self, material, points, radius, color=None, sides=8, variation=0):
        grid = []
        for i, p in enumerate(points):
            tangent = norm(sub3(points[min(i + 1, len(points) - 1)], points[max(i - 1, 0)]))
            helper = (0, 0, 1) if abs(dot(tangent, (0, 0, 1))) < .85 else (0, 1, 0)
            u = norm(cross(tangent, helper))
            v = norm(cross(tangent, u))
            ring = []
            for j in range(sides + 1):
                ang = 2 * math.pi * j / sides
                n = add3(mul3(u, math.cos(ang)), mul3(v, math.sin(ang)))
                ring.append(self.vertex(material, add3(p, mul3(n, radius)), n, color, variation))
            grid.append(ring)
        for i in range(len(grid) - 1):
            for j in range(sides):
                a, b, c, d = grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1]
                self.tri(material, a, c, b)
                self.tri(material, c, d, b)

    def torus_xy(self, material, center, major, minor, color=None, segments=32, sides=8):
        grid = []
        for i in range(segments + 1):
            u = 2 * math.pi * i / segments
            line = []
            for j in range(sides + 1):
                v = 2 * math.pi * j / sides
                radial = major + minor * math.cos(v)
                p = (center[0] + radial * math.cos(u), center[1] + radial * math.sin(u), center[2] + minor * math.sin(v))
                n = (math.cos(u) * math.cos(v), math.sin(u) * math.cos(v), math.sin(v))
                line.append(self.vertex(material, p, n, color))
            grid.append(line)
        for i in range(segments):
            for j in range(sides):
                a, b, c, d = grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1]
                self.tri(material, a, b, c)
                self.tri(material, c, b, d)

    def tapered_spine(self, base, direction, length, width, brown):
        direction = norm(direction)
        helper = (0, 1, 0) if abs(direction[1]) < .92 else (1, 0, 0)
        u = norm(cross(direction, helper))
        v = norm(cross(direction, u))
        tip = add3(base, mul3(direction, length))
        sections = [(.0, width, "quills_brown", brown), (.18, width * .83, "quills_brown", brown), (.76, width * .28, "quills_brown", brown), (1, .005, "quills_tips", None)]
        rings = []
        for t, r, material, color in sections:
            center = add3(base, mul3(direction, length * t))
            ring = []
            for j in range(7):
                a = 2 * math.pi * j / 6
                n = norm(add3(mul3(u, math.cos(a)), mul3(v, math.sin(a))))
                ring.append((center, n, r, material, color))
            rings.append(ring)
        for k in range(3):
            material = "quills_tips" if k == 2 else "quills_brown"
            color = None if k == 2 else brown
            for j in range(6):
                a = rings[k][j]
                b = rings[k][j + 1]
                c = rings[k + 1][j]
                d = rings[k + 1][j + 1]
                p1 = add3(a[0], mul3(a[1], a[2]))
                p2 = add3(b[0], mul3(b[1], b[2]))
                p3 = add3(c[0], mul3(c[1], c[2]))
                p4 = add3(d[0], mul3(d[1], d[2]))
                ia = self.vertex(material, p1, a[1], color, .08)
                ib = self.vertex(material, p2, b[1], color, .08)
                ic = self.vertex(material, p3, c[1], color, .08)
                id_ = self.vertex(material, p4, d[1], color, .08)
                if dot(cross(sub3(p2, p1), sub3(p3, p1)), a[1]) > 0:
                    self.tri(material, ia, ib, ic)
                    self.tri(material, ib, id_, ic)
                else:
                    self.tri(material, ia, ic, ib)
                    self.tri(material, ib, ic, id_)


mesh = Mesh()

# Plush body and back shell.  The belly and face are separate rounded volumes.
mesh.ellipsoid("felt_brown", (0, 1.16, -.19), (.68, 1.00, .63), rows=24, cols=40, variation=.028)
mesh.ellipsoid("felt_cream", (0, .99, .34), (.58, .68, .43), rows=20, cols=36, variation=.025)
mesh.ellipsoid("felt_face", (0, 1.78, .43), (.53, .47, .47), rows=22, cols=40, variation=.022)
mesh.ellipsoid("felt_face", (0, 1.61, .79), (.36, .19, .23), rows=12, cols=28, variation=.018)

# Short legs, rounded paws, and three tiny toes on each side.
for s in (-1, 1):
    x = s * .36
    mesh.ellipsoid("felt_brown", (x, .27, .03), (.19, .27, .20), rows=12, cols=20, variation=.025)
    mesh.ellipsoid("felt_brown", (x, .105, .18), (.23, .105, .24), rows=10, cols=20, variation=.025)
    for k in (-1, 0, 1):
        mesh.ellipsoid("felt_brown", (x + k * .095, .075, .36), (.065, .065, .10), rows=7, cols=12)
    mesh.ellipsoid("felt_brown", (s * .60, 1.05, .42), (.20, .37, .21), rows=15, cols=24, variation=.025)
    mesh.ellipsoid("felt_face", (s * .55, .82, .55), (.14, .16, .14), rows=11, cols=18)

# Ears: warm outer wool and recessed pink centers.
for s in (-1, 1):
    mesh.ellipsoid("felt_brown", (s * .57, 1.89, .43), (.18, .22, .13), rows=13, cols=22)
    mesh.ellipsoid("cheek_pink", (s * .585, 1.89, .536), (.105, .14, .028), rows=10, cols=18)

# A dense crown and back half of tapered, individually modeled felt quills.
shell_c = (0, 1.43, -.32)
shell_r = (.70, .94, .57)
spine_palette = ["#875b3d", "#9a6b48", "#aa7954", "#785136", "#b4845d"]
for row in range(15):
    theta = .10 + (math.pi - .20) * row / 14
    count = max(7, round(15 * math.sin(theta) + 7))
    for j in range(count):
        phi = 2 * math.pi * (j + (row % 2) * .5) / count
        x = math.sin(theta) * math.cos(phi)
        y = math.cos(theta)
        z = math.sin(theta) * math.sin(phi)
        if z > .22 and y < .50:
            continue  # keep the face and belly clear
        p = add3(shell_c, (shell_r[0] * x, shell_r[1] * y, shell_r[2] * z))
        jitter = (RNG.uniform(-.025, .025), RNG.uniform(-.025, .025), RNG.uniform(-.025, .025))
        p = add3(p, jitter)
        d = norm((x * .87 + RNG.uniform(-.12, .12), y * .75 + .17, z * .95 - .18))
        length = RNG.uniform(.21, .37) * (.88 if row > 11 else 1)
        width = RNG.uniform(.055, .078)
        mesh.tapered_spine(p, d, length, width, RNG.choice(spine_palette))

# Large, glossy eyes with ivory rims, glints, brows, and rosy cheeks.
for s in (-1, 1):
    x = s * .245
    mesh.ellipsoid("eye_white", (x, 1.91, .823), (.145, .166, .073), rows=13, cols=24)
    mesh.ellipsoid("eye_black", (x, 1.91, .882), (.098, .130, .074), rows=13, cols=24)
    mesh.ellipsoid("eye_white", (x - .027, 1.965, .946), (.036, .042, .012), rows=8, cols=12)
    mesh.ellipsoid("cheek_pink", (s * .36, 1.68, .842), (.11, .073, .021), rows=10, cols=18)
    mesh.tube("mouth", [(s * .18, 2.105, .835), (s * .235, 2.135, .817), (s * .29, 2.115, .795)], .015)
mesh.ellipsoid("eye_black", (0, 1.68, 1.03), (.105, .077, .09), rows=13, cols=24)
mesh.tube("mouth", [(-.20, 1.54, .914), (-.12, 1.505, .960), (0, 1.485, .982), (.12, 1.505, .960), (.20, 1.54, .914)], .012)
for s in (-1, 1):
    mesh.ellipsoid("eye_white", (s * .145, 1.54, .947), (.035, .045, .017), rows=7, cols=12)

# White ski goggles with blue lenses, dark rubber seals and charcoal band.
for s in (-1, 1):
    x = s * .22
    mesh.ellipsoid("goggle_lens", (x, 2.246, .743), (.174, .125, .032), rows=12, cols=24)
    mesh.torus_xy("goggle_rubber", (x, 2.246, .768), .157, .051)
    mesh.torus_xy("goggle_white", (x, 2.246, .802), .161, .039)
    mesh.tube("goggle_rubber", [(s * .37, 2.25, .70), (s * .55, 2.23, .52), (s * .67, 2.19, .20), (s * .65, 2.16, -.28)], .052)
    mesh.rounded_box("goggle_white", (s * .575, 2.226, .44), (.050, .080, .027), .018, steps=4)
mesh.tube("goggle_white", [(-.075, 2.25, .80), (0, 2.275, .81), (.075, 2.25, .80)], .045)

# Red scarf: folded collar and a soft triangular front bib.
mesh.ellipsoid("scarf_red", (0, 1.46, .54), (.52, .16, .34), rows=12, cols=30, variation=.02)
mesh.ellipsoid("scarf_red", (0, 1.405, .77), (.47, .12, .16), rows=11, cols=28, variation=.02)
v = [(-.45, 1.44, .874), (0, 1.07, .847), (.45, 1.44, .874), (-.45, 1.44, .82), (0, 1.07, .80), (.45, 1.44, .82)]
ids = [mesh.vertex("scarf_red", p, (0, 0, 1), variation=.02) for p in v]
mesh.tri("scarf_red", ids[0], ids[1], ids[2])
mesh.tri("scarf_red", ids[3], ids[5], ids[4])
mesh.tube("backpack_dark", [(-.44, 1.45, .881), (0, 1.075, .854), (.44, 1.45, .881)], .010)

# Leather shoulder straps cross the shoulders and end in metal buckles.
for s in (-1, 1):
    mesh.tube("leather_tan", [(s * .35, 1.66, -.54), (s * .61, 1.55, -.22), (s * .68, 1.36, .20), (s * .69, .93, .34)], .068, sides=9)
    mesh.tube("leather_dark", [(s * .70, .91, .33), (s * .70, .72, .21), (s * .66, .71, -.15), (s * .56, .80, -.59)], .060)
    mesh.rounded_box("metal", (s * .70, .79, .26), (.065, .042, .017), .010, steps=4)

# Back pack: red felt body, dark piping, roll flap, outer pocket, handle and stitch line.
mesh.rounded_box("backpack_red", (0, 1.22, -.97), (.47, .53, .22), .12, variation=.025)
mesh.rounded_box("backpack_dark", (0, 1.55, -1.207), (.48, .18, .036), .05, steps=5)
mesh.rounded_box("backpack_red", (0, 1.58, -1.252), (.46, .19, .057), .07, variation=.02, steps=6)
mesh.rounded_box("backpack_dark", (0, 1.06, -1.205), (.32, .22, .039), .05, steps=5)
mesh.rounded_box("backpack_red", (0, 1.07, -1.248), (.30, .21, .05), .05, variation=.02, steps=6)
mesh.tube("backpack_dark", [(-.33, .84, -1.30), (-.34, 1.27, -1.30), (.34, 1.27, -1.30), (.33, .84, -1.30)], .013)
mesh.tube("backpack_dark", [(-.42, 1.54, -1.318), (-.38, 1.40, -1.318), (0, 1.385, -1.318), (.38, 1.40, -1.318), (.42, 1.54, -1.318)], .012)
mesh.tube("backpack_dark", [(-.25, 1.09, -1.31), (-.22, .92, -1.31), (.22, .92, -1.31), (.25, 1.09, -1.31)], .011)
mesh.tube("backpack_dark", [(-.14, 1.79, -1.11), (-.13, 1.91, -1.12), (0, 1.95, -1.12), (.13, 1.91, -1.12), (.14, 1.79, -1.11)], .048)

# Side satchel shown in the profile view; its tan panel is edged in red.
mesh.rounded_box("backpack_red", (-.78, 1.18, -.38), (.16, .43, .29), .075, steps=6)
mesh.rounded_box("leather_tan", (-.91, 1.18, -.37), (.045, .38, .25), .035, steps=6, variation=.025)
mesh.rounded_box("leather_dark", (-.960, .96, -.24), (.017, .12, .09), .018, steps=5)
mesh.rounded_box("leather_tan", (-.980, .97, -.24), (.013, .11, .08), .015, steps=5)
mesh.rounded_box("metal", (-.996, .95, -.18), (.015, .035, .023), .009, steps=4)


def write_glb(path):
    blob = bytearray()
    views = []
    accessors = []
    primitives = []

    def append(data, target):
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(data)
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(data), "target": target})
        return len(views) - 1

    for mat_id, g in enumerate(mesh.groups):
        if not g["i"]:
            continue
        positions = [v for p in g["p"] for v in p]
        normals = [v for n in g["n"] for v in n]
        colors = [v for c in g["c"] for v in c]
        minp = [min(p[k] for p in g["p"]) for k in range(3)]
        maxp = [max(p[k] for p in g["p"]) for k in range(3)]
        pv = append(struct.pack("<" + "f" * len(positions), *positions), 34962)
        nv = append(struct.pack("<" + "f" * len(normals), *normals), 34962)
        cv = append(bytes(colors), 34962)
        iv = append(struct.pack("<" + "I" * len(g["i"]), *g["i"]), 34963)

        def acc(view, component, count, kind, **kw):
            accessors.append({"bufferView": view, "componentType": component, "count": count, "type": kind, **kw})
            return len(accessors) - 1

        pacc = acc(pv, 5126, len(g["p"]), "VEC3", min=minp, max=maxp)
        nacc = acc(nv, 5126, len(g["n"]), "VEC3")
        cacc = acc(cv, 5121, len(g["c"]), "VEC4", normalized=True)
        iacc = acc(iv, 5125, len(g["i"]), "SCALAR")
        primitives.append({"attributes": {"POSITION": pacc, "NORMAL": nacc, "COLOR_0": cacc}, "indices": iacc, "material": mat_id, "mode": 4})

    gltf = {
        "asset": {"version": "2.0", "generator": "Codex procedural felt hedgehog"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "hedgehog_single_character", "mesh": 0}],
        "meshes": [{"name": "felt_hedgehog", "primitives": primitives}],
        "materials": [{"name": n, "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": metal, "roughnessFactor": rough}, "doubleSided": False} for n, _, rough, metal in MATERIALS],
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": views,
        "accessors": accessors,
    }
    jb = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    jb += b" " * ((-len(jb)) % 4)
    blob += b"\0" * ((-len(blob)) % 4)
    total = 12 + 8 + len(jb) + 8 + len(blob)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(jb), b"JSON"))
        f.write(jb)
        f.write(struct.pack("<I4s", len(blob), b"BIN\0"))
        f.write(blob)
    return gltf


if __name__ == "__main__":
    doc = write_glb(OUT)
    tris = sum(len(g["i"]) // 3 for g in mesh.groups)
    verts = sum(len(g["p"]) for g in mesh.groups)
    print(json.dumps({"file": str(OUT), "bytes": OUT.stat().st_size, "triangles": tris, "vertices": verts, "materials": len(MATERIALS), "primitives": len(doc["meshes"][0]["primitives"])}, ensure_ascii=False))
