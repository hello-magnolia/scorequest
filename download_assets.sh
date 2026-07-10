#!/usr/bin/env bash
# Localize the Higgsfield-generated assets so the site works fully offline
# and survives any CDN link expiry. Run once from the project root:
#   bash download_assets.sh
set -e
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01"
mkdir -p assets/realms

echo "Hero video (Seedance 2.0, 1080p 16:9)…"
curl -fsSL "$BASE/hf_20260707_160337_73e7a3e7-612c-49f7-ab6a-4f7920599476.mp4" -o assets/hero.mp4

echo "Realm images (Nano Banana 2, 21:9)…"
curl -fsSL "$BASE/hf_20260707_165708_74c8247e-041b-46c6-bd60-b5688daafbd5.png" -o assets/realms/info.png
curl -fsSL "$BASE/hf_20260707_165718_a044cd59-5803-4574-93c3-b300e750af85.png" -o assets/realms/craft.png
curl -fsSL "$BASE/hf_20260707_165729_db1609c5-3aad-4569-8936-e642eba5a300.png" -o assets/realms/expression.png
curl -fsSL "$BASE/hf_20260707_165740_bc2485ab-42d9-4045-bb54-e82d95728861.png" -o assets/realms/conventions.png
curl -fsSL "$BASE/hf_20260707_165752_549328bb-f73a-4925-891a-bd7faf12c8fc.png" -o assets/realms/algebra.png
curl -fsSL "$BASE/hf_20260707_165803_fc6057f0-685d-41e9-867c-ed1d6a29bc8c.png" -o assets/realms/advmath.png
curl -fsSL "$BASE/hf_20260707_165813_9e52c7c4-1383-4165-aac2-f41833390df3.png" -o assets/realms/data.png
curl -fsSL "$BASE/hf_20260707_165823_2af1d8d8-4219-46aa-b0c1-9a34f1f3a217.png" -o assets/realms/geometry.png

echo "Intro cinematic stills (Nano Banana 2, 16:9 2k)..."
mkdir -p assets/intro
curl -fsSL "$BASE/hf_20260710_022711_060638fc-4e28-4089-86a6-574270306697.png" -o assets/intro/bedroom.png
curl -fsSL "$BASE/hf_20260710_022725_20fbc722-18c9-46d9-8c01-5b1feaa77e0f.png" -o assets/intro/summons.png
curl -fsSL "$BASE/hf_20260710_022743_7503496a-a6fa-41cc-9a12-670db63ec102.png" -o assets/intro/portal.png

echo "Intro cinematic animations (Seedance 2.0, 1080p 16:9, 8s loops)..."
curl -fsSL "$BASE/hf_20260710_030436_8fa96d4e-b1e5-42d4-8f27-0ee298d74ee1.mp4" -o assets/intro/bedroom.mp4
curl -fsSL "$BASE/hf_20260710_030446_a850f884-0043-4564-aa70-c16ef902f9b3.mp4" -o assets/intro/summons.mp4
curl -fsSL "$BASE/hf_20260710_030454_ebf2faec-0853-418a-9e97-077e9ab60527.mp4" -o assets/intro/portal.mp4

echo "Intro scenes 4-5: valley + trailhead (stills and animations)..."
curl -fsSL "$BASE/hf_20260710_031648_c3a3adf6-e139-4eb9-8133-bb4300eb70e8.png" -o assets/intro/valley.png
curl -fsSL "$BASE/hf_20260710_031658_471211c6-8f1d-44bf-9be5-34202b7bf548.png" -o assets/intro/trailhead.png
curl -fsSL "$BASE/hf_20260710_031810_ba42ad70-10bb-42cd-a792-be9f5f68a562.mp4" -o assets/intro/valley.mp4
curl -fsSL "$BASE/hf_20260710_031832_0d6df14e-d0d8-480b-9abf-5ca6cc8a6243.mp4" -o assets/intro/trailhead.mp4

echo "Intro v2: the glowing orange lands (Seedance 2.0)..."
curl -fsSL "$BASE/hf_20260710_191040_75ffe146-5a89-48d9-9bfb-22c90a1c63a3.mp4" -o assets/intro/orange.mp4
# onsen.mp4, snatch.mp4, and onsen.png ship committed in assets/intro/ —
# scenes 4-5 were authored off-CDN, so there is nothing to download for them.

echo "Done. The page automatically prefers these local files over the CDN."
