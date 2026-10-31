#!/usr/bin/env python3
"""Extract the 3 x 5 felt UI icon sheet without regenerating its artwork."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "reviews" / "felt-icon-sheet-source.png"
DEST = ROOT / "public" / "assets" / "icons"

# The supplied 582 x 784 sheet has three 151 px wide crops and five rows.
X = (21, 218, 415)
Y = (9, 166, 322, 478, 633)
SIZE = 151
ICONS = (
    ("map", "map"),
    ("weather", "weather-clear"),
    ("weather", "weather-cloudy"),
    ("weather", "weather-rain"),
    ("weather", "weather-fog"),
    ("weather", "weather-wind"),
    ("data", "data"),
    ("data", "profile"),
    ("data", "history"),
    ("data", "friends"),
    ("quest", "quests"),
    ("quest", "find-people"),
    ("quest", "quest-complete"),
    ("quest", "rookie-badge"),
    ("message", "messages"),
)


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    if sheet.size != (582, 784):
        raise ValueError(f"Expected a 582 x 784 sheet, got {sheet.size}")

    for index, (group, name) in enumerate(ICONS):
        x, y = X[index % 3], Y[index // 3]
        tile = sheet.crop((x, y, x + SIZE, y + SIZE))

        # Keep the felt card and its soft edge, removing only the sheet's
        # inter-card background. The light feather prevents jagged corners.
        mask = Image.new("L", (SIZE, SIZE), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((3, 3, 148, 148), radius=18, fill=255)
        tile.putalpha(mask.filter(ImageFilter.GaussianBlur(1.2)))

        output = DEST / group / f"{name}.png"
        output.parent.mkdir(parents=True, exist_ok=True)
        tile.save(output, optimize=True)
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
