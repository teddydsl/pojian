#!/usr/bin/env python3
"""Offline material comparison; not a substitute for the WebGL review page."""
from pathlib import Path
import importlib.util
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('preview', root / 'scripts/render-game-glb-preview.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)
positions, uvs, indices, atlas, _ = preview.load(root / 'public/assets/models/stylized-tree-game.glb')
pixels = atlas.load()
low = min(p[1] for p in positions)
height = max(p[1] for p in positions) - low
output = Image.new('RGB', (1040, 640), '#ebe7dd')

def linear(value):
    value /= 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

def srgb(value):
    value = 12.92 * value if value <= .0031308 else 1.055 * value ** (1 / 2.4) - .055
    return round(max(0, min(1, value)) * 255)

for panel, tinted in enumerate([False, True]):
    draw = ImageDraw.Draw(output)
    faces = []
    for i in range(0, len(indices), 3):
        ids = indices[i:i + 3]
        points = [positions[j] for j in ids]
        ab = [points[1][k] - points[0][k] for k in range(3)]
        ac = [points[2][k] - points[0][k] for k in range(3)]
        if ab[0] * ac[1] - ab[1] * ac[0] <= 0:
            continue
        u = sum(uvs[j][0] for j in ids) / 3
        v = sum(uvs[j][1] for j in ids) / 3
        color = pixels[min(atlas.width - 1, int(u * atlas.width)), min(atlas.height - 1, int(v * atlas.height))]
        mask = 0
        if tinted:
            for point in points:
                t = max(0, min(1, ((point[1] - low) / height - .56) / .14))
                mask += t * t * (3 - 2 * t) / 3
        factors = [1 - .56 * mask, 1 + .18 * mask, 1 - .59 * mask]
        color = tuple(srgb(linear(c) * factor) for c, factor in zip(color, factors))
        faces.append((sum(p[2] for p in points) / 3, points, color))
    for _, points, color in sorted(faces):
        draw.polygon([(panel * 520 + 260 + p[0] * 520, 590 - (p[1] - low) * 520) for p in points], fill=color)
    draw.text((panel * 520 + 20, 20), 'GREEN CROWN / ORIGINAL BARK' if tinted else 'ORIGINAL TEXTURE (CORRECT UV)', fill='#3e4d39')
output.save(root / 'reviews/tree-crown-tint-preview.png')
print('Rendered offline tree material comparison')
