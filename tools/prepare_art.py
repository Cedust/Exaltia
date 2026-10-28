"""Exports the concept art in game sizes as WebP.

Usage: python3 tools/prepare_art.py <art-root>
<art-root> is the project's art folder (with paragons/, acolytes/, characters/ and map/).

- Creatures: cropped to their visible pixels, 512x512, standing on the bottom edge.
- Characters: cropped, 512 px tall, for story portraits.
- World map: 1536x1024 plus one square backdrop per region (cropped from the map) for battles.
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

# Creature id -> concept art file. Pyrelle, Nivaris and Pelagon were generated as Solenne, Hollow and Okeanos.
CREATURES = {
    # Paragons
    'solvane': 'paragons/radiance-solvane-v2.png',
    'lumion': 'paragons/radiance-purifier-dragon-v1.png',
    'sirocco': 'paragons/wind-duelist-fox-v1.png',
    'lunelle': 'paragons/wind-enchanter-moth-v1.png',
    'fenric': 'paragons/thunder-fenric-final.png',
    'nimbara': 'paragons/thunder-nimbara-final.png',
    'basaltor': 'paragons/fire-basaltor-final.png',
    'pyrelle': 'paragons/fire-solenne-v3.png',
    'umbrok': 'paragons/umbra-guardian-bear-v1.png',
    'velune': 'paragons/umbra-hexer-jellyfish-v1.png',
    'terrak': 'paragons/earth-terrak-final.png',
    'eldwyn': 'paragons/earth-eldwyn-v3.png',
    'pelagon': 'paragons/water-okeanos-final.png',
    'maressa': 'paragons/water-healer-seadragon-v1.png',
    'kyrael': 'paragons/ice-kyrael-final.png',
    'nivaris': 'paragons/ice-hollow-final.png',
    # Starter Acolytes
    'spire-golem': 'acolytes/starter-spire-golem-v4.png',
    'ruin-scout': 'acolytes/starter-ruin-scout-v1.png',
    'spire-mender': 'acolytes/starter-spire-mender-v2.png',
    'relic-archer': 'acolytes/starter-relic-archer-v1.png',
    # Regional Acolytes
    'dawn-sentinel': 'acolytes/radiance-dawn-sentinel-v2.png',
    'lumen-wisp': 'acolytes/radiance-lumen-wisp-v1.png',
    'gale-dancer': 'acolytes/wind-gale-dancer-v1.png',
    'zephyr-sprite': 'acolytes/wind-zephyr-sprite-v1.png',
    'spark-monk': 'acolytes/thunder-spark-monk-v1.png',
    'storm-chanter': 'acolytes/thunder-storm-chanter-v1.png',
    'cinder-knight': 'acolytes/fire-cinder-knight-v2.png',
    'ember-sage': 'acolytes/fire-ember-sage-v1.png',
    'duskblade': 'acolytes/umbra-duskblade-v1.png',
    'veil-weaver': 'acolytes/umbra-veil-weaver-v1.png',
    'rootbound-sentinel': 'acolytes/earth-rootbound-sentinel-v1.png',
    'shardcaller': 'acolytes/earth-shardcaller-v1.png',
    'tide-lancer': 'acolytes/water-tide-lancer-v1.png',
    'brook-nymph': 'acolytes/water-brook-nymph-v1.png',
    'frostguard': 'acolytes/ice-frostguard-v3.png',
    'rime-mystic': 'acolytes/ice-rime-mystic-v1.png',
}

CHARACTERS = {
    'sigilbearer': 'characters/sigilbearer-v1.png',
    'tessa': 'characters/tessa-v1.png',
    'hesper': 'characters/hesper-v1.png',
    'cassian': 'characters/cassian-v1.png',
}

MAP = 'map/world-map-v2.png'
# Region centers on the 1536x1024 map, matching src/data/world.ts.
REGION_CENTERS = {
    'spire': (770, 380),
    'radiance': (790, 130),
    'wind': (1150, 230),
    'thunder': (1290, 380),
    'fire': (1240, 620),
    'umbra': (800, 730),
    'earth': (390, 620),
    'water': (200, 390),
    'ice': (400, 190),
}
BACKDROP_CROP = 520
BACKDROP_SIZE = 768

OUT = Path(__file__).resolve().parent.parent / 'public' / 'art'


def crop_visible(image: Image.Image) -> Image.Image:
    # Ignore faint alpha noise around the figure when cropping.
    return image.crop(image.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())


def save(image: Image.Image, target: Path, quality: int = 85) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=quality, method=6)
    print(f'{target.relative_to(OUT)}: {image.size[0]}x{image.size[1]}, {target.stat().st_size // 1024} KB')


def creatures(root: Path) -> None:
    size = 512
    for creature, source in CREATURES.items():
        image = crop_visible(Image.open(root / source).convert('RGBA'))
        image.thumbnail((size, size), Image.LANCZOS)
        # Square power-of-two canvas, figure standing on the bottom edge: lets WebGL build mipmaps
        # for smooth downscaling and keeps every creature on the same ground line.
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        canvas.paste(image, ((size - image.size[0]) // 2, size - image.size[1]))
        save(canvas, OUT / 'creatures' / f'{creature}.webp')


def characters(root: Path) -> None:
    for character, source in CHARACTERS.items():
        image = crop_visible(Image.open(root / source).convert('RGBA'))
        image.thumbnail((512, 768), Image.LANCZOS)
        save(image, OUT / 'characters' / f'{character}.webp')


def world(root: Path) -> None:
    image = Image.open(root / MAP).convert('RGB')
    save(image, OUT / 'map' / 'world.webp', quality=80)
    half = BACKDROP_CROP // 2
    for region, (x, y) in REGION_CENTERS.items():
        x = min(max(x, half), image.width - half)
        y = min(max(y, half), image.height - half)
        crop = image.crop((x - half, y - half, x + half, y + half)).resize((BACKDROP_SIZE, BACKDROP_SIZE), Image.LANCZOS)
        crop = crop.filter(ImageFilter.GaussianBlur(3))
        crop = ImageEnhance.Brightness(crop).enhance(0.55)
        save(crop, OUT / 'backdrops' / f'{region}.webp', quality=75)


def main(root: Path) -> None:
    creatures(root)
    characters(root)
    world(root)


if __name__ == '__main__':
    main(Path(sys.argv[1]))
