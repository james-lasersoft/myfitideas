from pathlib import Path
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "svg"
PNG = ROOT / "png"
PDF = ROOT / "pdf"
ICONS = ROOT / "icons"
for directory in (PNG, PDF, ICONS):
    directory.mkdir(parents=True, exist_ok=True)

EXPORTS = {
    "myfitideas-symbol.svg": [1024, 512, 256, 192, 180, 128, 64, 48, 32, 16],
    "myfitideas-logo-stacked.svg": [1600, 1200, 800, 400],
    "myfitideas-logo-stacked-no-tagline.svg": [1200, 800, 400],
    "myfitideas-logo-horizontal.svg": [1800, 1200, 800],
    "myfitideas-logo-horizontal-no-tagline.svg": [1600, 1000, 600],
    "myfitideas-logo-reversed.svg": [1200, 800, 400],
    "myfitideas-symbol-monochrome-green.svg": [1024, 512, 256],
    "myfitideas-symbol-white.svg": [1024, 512, 256],
}

for filename, widths in EXPORTS.items():
    source = SVG / filename
    stem = source.stem
    for width in widths:
        cairosvg.svg2png(url=str(source), write_to=str(PNG / f"{stem}-{width}px.png"), output_width=width)
    cairosvg.svg2pdf(url=str(source), write_to=str(PDF / f"{stem}.pdf"))

symbol = Image.open(PNG / "myfitideas-symbol-1024px.png").convert("RGBA")
white = Image.open(PNG / "myfitideas-symbol-white-1024px.png").convert("RGBA")
for size in (1024, 512, 192, 180, 144, 96, 72, 48, 32, 16):
    for name, background, source in (
        ("light", (255, 255, 255, 255), symbol),
        ("green", (13, 143, 67, 255), white),
    ):
        canvas = Image.new("RGBA", (size, size), background)
        target_width = int(size * 0.82)
        mark = source.resize((target_width, int(target_width * 0.7)), Image.Resampling.LANCZOS)
        canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
        canvas.save(ICONS / f"app-icon-{name}-{size}.png")

favicon_images = [Image.open(ICONS / f"app-icon-light-{size}.png").convert("RGBA") for size in (16, 32, 48)]
favicon_images[0].save(ICONS / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=favicon_images[1:])
