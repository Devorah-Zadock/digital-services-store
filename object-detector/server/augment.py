"""
יצירת גרסאות "מקולקלות" מלאכותית מתמונת אימון אחת: קצת זום/הזזה,
סיבוב קל, שינוי בהירות, טשטוש ורעש. המטרה כפולה:

1. להגדיל את כמות דוגמאות האימון בלי לדרוש עוד תמונות מהמשתמש.
2. ללמד את המודל איך אותו אובייקט נראה גם ב"איכות נמוכה" ולא רק
   בתמונה המקורית הנקייה - כי בדיוק מזה מורכבות תמונות אמיתיות
   ו"חלונות" שנבדקים בתוך תמונה גדולה (שלעולם לא מיושרים בול
   כמו תמונת האימון המקורית).

הכל עם PIL ו-numpy בלבד.
"""

import random
import numpy as np
from PIL import Image, ImageFilter


def _random_crop_zoom(img: Image.Image) -> Image.Image:
    w, h = img.size
    ratio = random.uniform(0.82, 1.0)
    cw, ch = max(1, int(w * ratio)), max(1, int(h * ratio))
    x0 = random.randint(0, w - cw)
    y0 = random.randint(0, h - ch)
    return img.crop((x0, y0, x0 + cw, y0 + ch)).resize((w, h))


def _random_rotate(img: Image.Image) -> Image.Image:
    angle = random.uniform(-12, 12)
    return img.rotate(angle, resample=Image.BILINEAR, fillcolor=(128, 128, 128))


def _random_brightness_contrast(img: Image.Image) -> Image.Image:
    arr = np.asarray(img, dtype=np.float32)
    brightness = random.uniform(0.7, 1.3)
    contrast = random.uniform(0.85, 1.15)
    arr = (arr - 128.0) * contrast + 128.0 * brightness
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def _random_blur(img: Image.Image) -> Image.Image:
    if random.random() < 0.7:
        radius = random.uniform(0.5, 2.2)
        return img.filter(ImageFilter.GaussianBlur(radius=radius))
    return img


def _random_noise(img: Image.Image) -> Image.Image:
    arr = np.asarray(img, dtype=np.int16)
    level = random.randint(5, 30)
    noise = np.random.randint(-level, level, arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def make_augmented_variants(img: Image.Image, count: int) -> list:
    """מחזיר רשימה של `count` גרסאות מעוותות/מקולקלות של img (RGB)."""
    img = img.convert("RGB")
    variants = []
    for _ in range(count):
        variant = img
        variant = _random_crop_zoom(variant)
        variant = _random_rotate(variant)
        variant = _random_brightness_contrast(variant)
        variant = _random_blur(variant)
        variant = _random_noise(variant)
        variants.append(variant)
    return variants
