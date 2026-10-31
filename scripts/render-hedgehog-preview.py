#!/usr/bin/env python3
"""Fast orthographic QA sheet for the procedural GLB source geometry."""

from pathlib import Path
import math
import runpy

from PIL import Image, ImageDraw, ImageFont


src = runpy.run_path(str(Path(__file__).with_name("generate-hedgehog-glb.py")))
mesh = src["mesh"]
dot = src["dot"]
cross = src["cross"]
sub3 = src["sub3"]
norm = src["norm"]

W, H = 440, 530
views = [
    ("FRONT", lambda p: (p[0], p[1]), (0, 0, 1)),
    ("RIGHT", lambda p: (-p[2], p[1]), (1, 0, 0)),
    ("BACK", lambda p: (-p[0], p[1]), (0, 0, -1)),
    ("TOP", lambda p: (p[0], -p[2]), (0, 1, 0)),
]
sheet = Image.new("RGB", (W * 4, H), (239, 230, 218))
font = ImageFont.load_default()
light = norm((.42, .84, 1.0))

for vi, (title, project, eye) in enumerate(views):
    im = Image.new("RGB", (W, H), (239, 230, 218))
    draw = ImageDraw.Draw(im)
    if title != "TOP":
        draw.line((0, H - 50, W, H - 50), fill=(210, 193, 176), width=2)
    triangles = []
    for group in mesh.groups:
        p, c, ii = group["p"], group["c"], group["i"]
        for k in range(0, len(ii), 3):
            a, b, d = ii[k:k + 3]
            pa, pb, pc = p[a], p[b], p[d]
            face_n = norm(cross(sub3(pb, pa), sub3(pc, pa)))
            if dot(face_n, eye) <= .01:
                continue
            center = tuple((pa[q] + pb[q] + pc[q]) / 3 for q in range(3))
            raw = tuple((c[a][q] + c[b][q] + c[d][q]) / 3 for q in range(3))
            shade = .67 + .32 * max(0, dot(face_n, light))
            color = tuple(max(0, min(255, round(v * shade))) for v in raw)
            triangles.append((dot(center, eye), (pa, pb, pc), color))
    triangles.sort(key=lambda t: t[0])
    for _, pts, color in triangles:
        projected = []
        for p in pts:
            x, y = project(p)
            if title == "TOP":
                projected.append((W / 2 + x * 167, H / 2 - y * 167))
            else:
                projected.append((W / 2 + x * 167, H - 50 - y * 167))
        draw.polygon(projected, fill=color)
    draw.text((18, 18), title, fill=(55, 47, 44), font=font, stroke_width=0)
    sheet.paste(im, (vi * W, 0))

out = Path(__file__).resolve().parents[1] / "reviews/hedgehog-felt-preview.png"
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(out)
