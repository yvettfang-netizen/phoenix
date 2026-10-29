"""Read-only checks for the raster-source Logo V3 review deliverables."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "public/brand/official/v3"
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
source = np.asarray(Image.open(ROOT / manifest["source_file"]))
expected = "A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E"
checks = []


def check(condition, name):
    assert condition, name
    checks.append(name)


check(manifest["source_sha256"] == expected, "Founder source identity")
check(manifest["approval"] == "FOUNDER_REVIEW_PENDING", "No implied approval")
check(len(manifest["assets"]) == 13, "All 13 source and derived asset records")
for item in manifest["assets"]:
    path = ROOT / item["file"]
    check(hashlib.sha256(path.read_bytes()).hexdigest().upper() == item["sha256"], item["file"] + " SHA-256")
    image = Image.open(path)
    if path.suffix == ".ico":
        check(image.ico.sizes() == {(16, 16), (32, 32), (48, 48)}, "ICO contains actual 16/32/48 frames")
        continue
    check(image.size == (item["width"], item["height"]), item["file"] + " dimensions")
    if "source_crop" in item:
        x0, y0, x1, y1 = item["source_crop"]
        check(np.array_equal(np.asarray(image.convert("RGB")), source[y0:y1, x0:x1]), item["file"] + " unchanged source RGB")
    if item["file"] == "phoenix-nova-primary-transparent.png":
        check(np.array_equal(np.asarray(image)[:, :, :3], source), "Full transparent version retains every source RGB pixel")
    if item["transparent_background"]:
        check(image.mode == "RGBA" and image.getextrema()[3][0] == 0, item["file"] + " real alpha transparency")
        a = np.asarray(image)[:, :, 3]
        check(a.max() > 0 and not a[0].any() and not a[-1].any() and not a[:, 0].any() and not a[:, -1].any(), item["file"] + " content and unclipped transparent border")
check(hashlib.sha256((ROOT / manifest["source_file"]).read_bytes()).hexdigest().upper() == expected, "Original file preserved byte for byte")
check(not list(ROOT.glob("*.svg")), "No fabricated vector source")
check(Image.open(ROOT / "phoenix-nova-header@2x.png").size == (1040, 320), "Header 2x dimensions")
check(Image.open(ROOT / "phoenix-nova-header.png").size == (520, 160), "Header 1x dimensions")
chroma = source.max(2).astype(np.int16) - source.min(2).astype(np.int16)
check(not (chroma[839:849] > 3).any(), "Extraction gap contains no symbol or wordmark strokes")
report = {"status": "PASS", "checks_passed": len(checks), "checks": checks,
          "limitations": manifest["limitations"], "master_sha256": expected}
print(json.dumps(report, ensure_ascii=False, indent=2))
