# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
"""
Generates brand-consistent, high-resolution PNG icons and Chrome Web Store
promo tiles from the official TiltCheck master artwork (apps/web/public/icon.png).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MASTER_ICON = os.path.join(ROOT_DIR, 'apps', 'web', 'public', 'icon.png')
ICONS_DIR = os.path.join(os.path.dirname(__file__), 'src', 'icons')
PROMO_DIR = os.path.join(os.path.dirname(__file__), 'promo')

os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(PROMO_DIR, exist_ok=True)

if not os.path.exists(MASTER_ICON):
    print(f"Master icon not found at {MASTER_ICON}")
    sys.exit(1)

src = Image.open(MASTER_ICON).convert('RGBA')
cx, cy = 522.5, 509.5

def render_icon(size, box_size, radius_pct, contrast=1.0, sharpness=1.0):
    crop_box = (
        int(cx - box_size / 2),
        int(cy - box_size / 2),
        int(cx + box_size / 2),
        int(cy + box_size / 2)
    )
    cropped = src.crop(crop_box)
    resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
    if contrast != 1.0:
        resized = ImageEnhance.Contrast(resized).enhance(contrast)
    if sharpness != 1.0:
        resized = ImageEnhance.Sharpness(resized).enhance(sharpness)
        
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    r = max(2, int(size * radius_pct))
    draw.rounded_rectangle([0, 0, size, size], radius=r, fill=255)
    
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)
    return out

# 1. Generate Extension Icons
i16 = render_icon(16, 580, 0.22, contrast=1.2, sharpness=1.5)
i48 = render_icon(48, 640, 0.22, contrast=1.1, sharpness=1.3)
i128 = render_icon(128, 660, 0.22, contrast=1.05, sharpness=1.1)

i16.save(os.path.join(ICONS_DIR, 'icon16.png'))
i48.save(os.path.join(ICONS_DIR, 'icon48.png'))
i128.save(os.path.join(ICONS_DIR, 'icon128.png'))
print("Generated icon16.png, icon48.png, icon128.png in src/icons/")

# 2. Generate Small Promo Tile (440x280)
promo_small = Image.new('RGBA', (440, 280), (9, 14, 20, 255))
shield_150 = render_icon(150, 660, 0.22)
promo_small.paste(shield_150, (int((440 - 150) / 2), 24), shield_150)

draw_small = ImageDraw.Draw(promo_small)
try:
    font_title = ImageFont.truetype('arialbd.ttf', 26)
    font_sub = ImageFont.truetype('arial.ttf', 13)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

title_text = 'TILTCHECK'
sub_text = 'NON-CUSTODIAL CASINO GUARDRAILS'

tb_title = draw_small.textbbox((0, 0), title_text, font=font_title)
w_title = tb_title[2] - tb_title[0]
draw_small.text((int((440 - w_title) / 2), 190), title_text, fill=(255, 255, 255, 255), font=font_title)

tb_sub = draw_small.textbbox((0, 0), sub_text, font=font_sub)
w_sub = tb_sub[2] - tb_sub[0]
draw_small.text((int((440 - w_sub) / 2), 226), sub_text, fill=(23, 195, 178, 255), font=font_sub)
draw_small.rounded_rectangle([2, 2, 437, 277], radius=8, outline=(23, 195, 178, 80), width=1)

promo_small.save(os.path.join(PROMO_DIR, 'promo-small-440x280.png'))
print("Generated promo-small-440x280.png in promo/")

# 3. Generate Marquee Promo Tile (1400x560)
marquee = Image.new('RGBA', (1400, 560), (9, 14, 20, 255))
draw_m = ImageDraw.Draw(marquee)
draw_m.rounded_rectangle([4, 4, 1395, 555], radius=16, outline=(23, 195, 178, 60), width=2)

shield_360 = render_icon(360, 660, 0.22)
marquee.paste(shield_360, (100, 100), shield_360)

try:
    font_brand = ImageFont.truetype('arialbd.ttf', 72)
    font_tagline = ImageFont.truetype('arialbd.ttf', 28)
    font_body = ImageFont.truetype('arial.ttf', 22)
except Exception:
    font_brand = ImageFont.load_default()
    font_tagline = ImageFont.load_default()
    font_body = ImageFont.load_default()

draw_m.text((520, 110), 'TILTCHECK', fill=(255, 255, 255, 255), font=font_brand)
draw_m.text((525, 205), 'NON-CUSTODIAL CASINO GUARDRAILS', fill=(23, 195, 178, 255), font=font_tagline)

bullets = [
    '• 2-Second Spin Pace Brake & Autoplay Restraint',
    '• Client Seed Manager: On-Device CSPRNG & Shannon Entropy Hygiene',
    '• Reverse-Withdrawal Interceptor & Profit Lock Ratchet',
    '• On-Chain Solana Cooldown Timelocks & SusLink Phishing Guard'
]

y_pos = 265
for b in bullets:
    draw_m.text((525, y_pos), b, fill=(200, 210, 220, 255), font=font_body)
    y_pos += 42

marquee.save(os.path.join(PROMO_DIR, 'promo-marquee-1400x560.png'))
print("Generated promo-marquee-1400x560.png in promo/")
