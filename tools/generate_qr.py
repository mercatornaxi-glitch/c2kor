"""
Generate QR code PNGs for every page listed in tools/config.json.
Requires: pip install qrcode[pil]

Usage:
    python tools/generate_qr.py

Re-run this after tools/config.json's "base_url" is set to the real
hosting address, so the printed QR codes point to live pages.
"""
import json
from pathlib import Path

import qrcode

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "tools" / "config.json"
OUTPUT_DIR = ROOT / "assets" / "qr"


def main():
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    base_url = config["base_url"].rstrip("/")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if "YOUR-DOMAIN-HERE" in base_url:
        print("[warning] base_url in tools/config.json is still a placeholder.")
        print("          QR codes will be generated but will not resolve until you set the real URL.\n")

    for page in config["pages"]:
        slug = page["slug"]
        path = page["path"]
        url = f"{base_url}/{path}"

        img = qrcode.make(url)
        out_path = OUTPUT_DIR / f"{slug}.png"
        img.save(out_path)
        print(f"  {slug:<20} -> {out_path.relative_to(ROOT)}  ({url})")

    print(f"\nDone. Generated {len(config['pages'])} QR codes in {OUTPUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
