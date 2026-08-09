"""Extract the generated radio background contact sheet into app assets.

The source sheet contains rounded preview cards on an ivory canvas. This script
crops just inside each card edge, preserving the full visible composition while
removing the canvas and rounded corners.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFilter


@dataclass(frozen=True)
class Row:
    y0: int
    y1: int
    spans: tuple[tuple[int, int], ...]


ROWS = (
    Row(25, 169, ((34, 249), (260, 460), (471, 660), (672, 864), (874, 1065), (1077, 1272), (1283, 1500))),
    Row(174, 298, ((34, 250), (260, 461), (471, 660), (672, 864), (874, 1066), (1077, 1272), (1283, 1501))),
    Row(303, 412, ((34, 250), (260, 484), (496, 835), (846, 1066))),
    Row(417, 521, ((33, 249), (260, 485), (496, 754), (764, 1008), (1018, 1272))),
    Row(525, 630, ((34, 249), (260, 485), (496, 753), (764, 1008), (1018, 1273))),
    Row(633, 733, ((33, 250), (260, 484), (496, 663), (673, 864), (875, 1009), (1017, 1139), (1147, 1273))),
    Row(738, 845, ((34, 249), (260, 558), (569, 761), (772, 960), (970, 1164), (1174, 1360))),
    Row(848, 937, ((34, 249), (260, 529), (540, 761), (772, 960), (970, 1193))),
    Row(941, 1018, ((34, 274), (285, 529), (541, 767), (778, 1057), (1068, 1337))),
)

# The generator produced four bonus concepts: one Greek contemporary, one
# Laiko, and two Chill. Keeping them gives the app 51 choices in total.
GROUPS = (
    ("greek-contemporary", 7),
    ("laiko", 7),
    ("traditional", 4),
    ("rock", 5),
    ("dance-electronic", 5),
    ("jazz-lounge", 4),
    ("news-talk", 3),
    ("sports", 3),
    ("international-pop", 6),
    ("chill", 7),
)


def palette(image: Image.Image, count: int = 5) -> list[str]:
    sample = image.convert("RGB")
    sample.thumbnail((160, 160), Image.Resampling.LANCZOS)
    quantized = sample.quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    raw = quantized.getpalette() or []
    ranked = sorted(quantized.getcolors() or [], reverse=True)
    colors: list[str] = []
    for _, index in ranked[:count]:
        offset = index * 3
        red, green, blue = raw[offset : offset + 3]
        colors.append(f"#{red:02x}{green:02x}{blue:02x}")
    return colors


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--long-edge", type=int, default=1280)
    parser.add_argument("--quality", type=int, default=88)
    parser.add_argument("--inset", type=int, default=10)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGB")
    if source.size != (1536, 1024):
        raise ValueError(f"Expected a 1536x1024 contact sheet, got {source.size}")

    boxes = [
        (x0 + args.inset, row.y0 + args.inset, x1 - args.inset + 1, row.y1 - args.inset + 1)
        for row in ROWS
        for x0, x1 in row.spans
    ]
    expected = sum(count for _, count in GROUPS)
    if len(boxes) != expected:
        raise RuntimeError(f"Found {len(boxes)} crops, expected {expected}")

    args.output.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []
    cursor = 0

    for genre, count in GROUPS:
        for variant in range(1, count + 1):
            crop = source.crop(boxes[cursor])
            width, height = crop.size
            scale = args.long_edge / max(width, height)
            output_size = (round(width * scale), round(height * scale))
            resized = crop.resize(output_size, Image.Resampling.LANCZOS)
            resized = resized.filter(ImageFilter.UnsharpMask(radius=0.6, percent=30, threshold=4))

            identifier = f"{slug(genre)}-{variant:02d}"
            filename = f"{identifier}.webp"
            destination = args.output / filename
            resized.save(destination, "WEBP", quality=args.quality, method=6)

            manifest.append(
                {
                    "id": identifier,
                    "genre": genre,
                    "variant": variant,
                    "src": f"/backgrounds/{filename}",
                    "width": output_size[0],
                    "height": output_size[1],
                    "palette": palette(crop),
                }
            )
            cursor += 1

    document = {
        "version": 1,
        "count": len(manifest),
        "format": "webp",
        "source": "AI-generated radio master artwork contact sheet",
        "backgrounds": manifest,
    }
    (args.output / "manifest.json").write_text(
        json.dumps(document, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(manifest)} backgrounds to {args.output}")


if __name__ == "__main__":
    main()
