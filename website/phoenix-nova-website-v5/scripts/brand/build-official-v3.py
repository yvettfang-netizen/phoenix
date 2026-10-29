"""Deterministic extraction of Founder-supplied raster artwork; never redraws.

Requires Pillow and numpy. Run from any cwd. The original is never overwritten.
No font substitution, generative model, hue adjustment or vector tracing is used.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

SITE = Path(__file__).resolve().parents[2]
OUT = SITE / "public/brand/official/v3"
SOURCE = OUT / "phoenix-nova-primary-original.png"
SOURCE_SHA = "A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E"
VERSION = "3.0-review-candidate"
DATE = "2026-10-30"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bbox(mask, y0=0):
    ys, xs = np.where(mask)
    return (int(xs.min()), int(ys.min()) + y0, int(xs.max()) + 1, int(ys.max()) + y0 + 1)


def pad_box(box, pad=8):
    x0, y0, x1, y1 = box
    return (max(0, x0-pad), max(0, y0-pad), min(1254, x1+pad), min(1254, y1+pad))


def save(image, name, usage, **metadata):
    target = OUT / name
    image.save(target, optimize=True)
    entries.append({"file": name, "usage": usage, "sha256": sha(target),
                    "width": image.width, "height": image.height,
                    "transparent_background": image.mode == "RGBA" and image.getextrema()[3][0] == 0,
                    "source_sha256": SOURCE_SHA, "version": VERSION, "date": DATE, **metadata})


def icon(symbol, size):
    # Fit the complete composite; no crop or simplification at any size.
    usable = max(1, round(size * .88))
    scale = usable / max(symbol.size)
    fitted = symbol.resize((max(1, round(symbol.width*scale)), max(1, round(symbol.height*scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(fitted, ((size-fitted.width)//2, (size-fitted.height)//2))
    assert np.asarray(canvas)[0, :, 3].max() == 0 and np.asarray(canvas)[-1, :, 3].max() == 0
    return canvas


assert sha(SOURCE) == SOURCE_SHA, "Founder master mismatch: stop rather than process a different logo"
original = Image.open(SOURCE)
assert original.mode == "RGB" and original.size == (1254, 1254)
rgb = np.asarray(original)
chroma = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
# Inspected blank-canvas strips have channel spread <=2. Coloured foreground is
# separated from this near-neutral white matte. RGB stays byte-identical; only
# alpha is derived. Flattened-source antialias colours cannot be fully unmatted
# without changing RGB; dark previews expose that limitation for Founder review.
alpha = np.clip((chroma.astype(np.float32) - 3) / 12, 0, 1)
alpha = np.rint(alpha * 255).astype(np.uint8)
rgba = Image.fromarray(np.dstack((rgb, alpha)), "RGBA")
assert np.array_equal(np.asarray(rgba)[:, :, :3], rgb)
assert np.all(alpha[chroma >= 15] == 255)
full_box = pad_box(bbox(alpha > 0), 16)
symbol_box = pad_box(bbox(alpha[:845] > 0), 8)
wordmark_box = pad_box(bbox(alpha[845:1010] > 0, 845), 4)
symbol_box = (*symbol_box[:3], min(845, symbol_box[3]))
wordmark_box = (wordmark_box[0], max(845, wordmark_box[1]), *wordmark_box[2:])
assert not np.any(alpha[839:849]), "Expected blank extraction gap is no longer blank"
symbol = rgba.crop(symbol_box)
wordmark = rgba.crop(wordmark_box)
entries = [{"file": SOURCE.name, "usage": "Immutable Founder master / brand archive", "sha256": SOURCE_SHA,
            "width": 1254, "height": 1254, "transparent_background": False,
            "source_sha256": SOURCE_SHA, "version": VERSION, "date": DATE}]
trimmed = original.crop(full_box)
assert np.array_equal(np.asarray(trimmed), rgb[full_box[1]:full_box[3], full_box[0]:full_box[2]])
save(trimmed, "phoenix-nova-primary-trimmed.png", "Complete primary lockup, lossless rectangular trim", source_crop=list(full_box), rgb_exact_source_crop=True)
save(rgba, "phoenix-nova-primary-transparent.png", "Complete primary lockup, full original canvas with candidate alpha", rgb_exact_source_canvas=True)
save(symbol, "phoenix-nova-symbol-transparent.png", "Complete phoenix + globe + star composite", source_crop=list(symbol_box), rgb_exact_source_crop=True)
save(wordmark, "phoenix-nova-wordmark-extracted.png", "Internal source part for reproducible header arrangement; not a separate approved brand version", source_crop=list(wordmark_box), rgb_exact_source_crop=True)

# 2x is created directly from native source parts, not by enlarging the 1x file.
symbol_h = 280
symbol_scaled = symbol.resize((round(symbol.width*symbol_h/symbol.height), symbol_h), Image.Resampling.LANCZOS)
wordmark_w = 730
wordmark_scaled = wordmark.resize((wordmark_w, round(wordmark.height*wordmark_w/wordmark.width)), Image.Resampling.LANCZOS)
header = Image.new("RGBA", (1040, 320))
gap = 40
left = (1040-symbol_scaled.width-gap-wordmark_scaled.width)//2
header.alpha_composite(symbol_scaled, (left, (320-symbol_scaled.height)//2))
header.alpha_composite(wordmark_scaled, (left+symbol_scaled.width+gap, (320-wordmark_scaled.height)//2))
save(header, "phoenix-nova-header@2x.png", "Horizontal header, native-source 2x for a 520x160 CSS box", layout="Unmodified extracted composite at left; extracted Phoenix Nova TM wordmark at right")
save(header.resize((520, 160), Image.Resampling.LANCZOS), "phoenix-nova-header.png", "Horizontal header, 1x", display_ratio="13:4")
for size in (512, 192, 48, 32, 16):
    save(icon(symbol, size), f"phoenix-nova-symbol-{size}.png", "Application icon" if size >= 192 else "Favicon review candidate",
         readability="Review at actual size; no simplification" if size >= 48 else "Fine globe/star details are limited; not approved for automatic website use")
ico = OUT / "favicon-review.ico"
icon(symbol, 512).save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
entries.append({"file": ico.name, "usage": "Multi-resolution review-only favicon; not referenced by site", "sha256": sha(ico), "sizes": [16, 32, 48], "transparent_background": True, "source_sha256": SOURCE_SHA, "version": VERSION, "date": DATE})
manifest = {"version": VERSION, "date": DATE, "approval": "FOUNDER_REVIEW_PENDING", "source_file": SOURCE.name,
            "source_sha256": SOURCE_SHA, "method": "Original-pixel extraction, alpha matte and aspect-preserving Lanczos resampling; no generative modification or vector tracing",
            "alpha_rule": "alpha=round(clamp((maxRGB-minRGB-3)/12,0,1)*255); source RGB unchanged before resampling",
            "limitations": ["Flattened RGB source has no original alpha or vector paths. White-matted edge RGB is preserved; faint pale fringes can remain on dark backgrounds.",
                             "Small 16/32px complete composite loses fine detail. All icons remain Founder-review candidates.",
                             "No SVG or second-batch colour variants are manufactured."], "assets": entries}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
assert sha(SOURCE) == SOURCE_SHA
print(json.dumps({"assets": len(entries), "symbol_crop": symbol_box, "wordmark_crop": wordmark_box, "full_crop": full_box, "master_sha256": SOURCE_SHA}))
