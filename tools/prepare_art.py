"""Crops concept art to its visible pixels and exports game-sized 512x512 WebP files.

Usage: python3 tools/prepare_art.py <art-root>
<art-root> is the project's art folder (with paragons/ and acolytes/).
"""
import sys
from pathlib import Path

from PIL import Image

# Creature id -> concept art file. Pyrelle and Nivaris were generated as "Solenne" and "Hollow".
SOURCES = {
    'basaltor': 'paragons/fire-basaltor-final.png',
    'pyrelle': 'paragons/fire-solenne-final.png',
    'kyrael': 'paragons/ice-kyrael-final.png',
    'nivaris': 'paragons/ice-hollow-final.png',
    'spire-golem': 'acolytes/starter-spire-golem-v4.png',
    'spire-mender': 'acolytes/starter-spire-mender-v2.png',
    'frostguard': 'acolytes/ice-frostguard-v3.png',
    'rime-mystic': 'acolytes/ice-rime-mystic-v1.png',
    'spark-monk': 'acolytes/thunder-spark-monk-v1.png',
    'relic-archer': 'acolytes/starter-relic-archer-v1.png',
}
MAX_SIZE = 512
OUT = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'creatures'


def main(root: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for creature, source in SOURCES.items():
        image = Image.open(root / source).convert('RGBA')
        # Ignore faint alpha noise around the figure when cropping.
        image = image.crop(image.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())
        image.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
        # Square power-of-two canvas, figure standing on the bottom edge: lets WebGL build mipmaps
        # for smooth downscaling and keeps every creature on the same ground line.
        canvas = Image.new('RGBA', (MAX_SIZE, MAX_SIZE), (0, 0, 0, 0))
        canvas.paste(image, ((MAX_SIZE - image.size[0]) // 2, MAX_SIZE - image.size[1]))
        image = canvas
        target = OUT / f'{creature}.webp'
        image.save(target, 'WEBP', quality=85, method=6)
        print(f'{creature}: {image.size[0]}x{image.size[1]}, {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
