"""
חילוץ "features" (מאפיינים מספריים) מתוך תמונה.

חשוב: הפונקציה הזו משמשת גם בזמן האימון (על כל תמונת אימון)
וגם בזמן הזיהוי (על כל "חלון" שנבדק בתוך תמונה גדולה) - חייבים
להשתמש באותה פונקציה בדיוק בשני המקומות כדי שההשוואה תהיה הוגנת.

אין כאן שימוש ב-OpenCV או ב-YOLO - רק numpy ו-PIL.
"""

import numpy as np
from PIL import Image

from config import FEATURE_IMAGE_SIZE


def _color_histogram(img_rgb: Image.Image, bins: int = 8) -> np.ndarray:
    """היסטוגרמת צבע (RGB) - נותנת מושג כללי על צבעי האובייקט."""
    arr = np.asarray(img_rgb, dtype=np.float32) / 255.0
    channels_hist = []
    for ch in range(3):
        channel = arr[:, :, ch].ravel()
        hist, _ = np.histogram(channel, bins=bins, range=(0.0, 1.0))
        hist = hist.astype(np.float32)
        hist /= (hist.sum() + 1e-6)
        channels_hist.append(hist)
    return np.concatenate(channels_hist)


def _edge_orientation_histogram(gray: np.ndarray, bins: int = 9) -> np.ndarray:
    """
    היסטוגרמת כיווני קצוות (בהשראת HOG), מחושבת רק עם numpy.gradient.
    נותנת מושג כללי על ה"צורה" של האובייקט (למשל: עץ מלא בקצוות
    מרובי-כיוונים, שמיים ריקים כמעט בלי קצוות).
    """
    gy, gx = np.gradient(gray.astype(np.float32))
    magnitude = np.sqrt(gx ** 2 + gy ** 2)
    angle = (np.degrees(np.arctan2(gy, gx))) % 180.0

    bin_width = 180.0 / bins
    bin_idx = np.clip((angle // bin_width).astype(int), 0, bins - 1)

    hist = np.zeros(bins, dtype=np.float32)
    for b in range(bins):
        hist[b] = magnitude[bin_idx == b].sum()

    total = hist.sum()
    if total > 0:
        hist /= total
    return hist


def _spatial_grid_features(img_rgb: Image.Image, gray: np.ndarray, grid: int = 4) -> np.ndarray:
    """
    מחלק את התמונה לרשת של grid x grid תאים, ולכל תא מחשב צבע ממוצע
    (R,G,B) ו"עוצמת קצוות" ממוצעת. זה תופס את המבנה הגס של האובייקט
    (למשל: ירוק למעלה וחום למטה בעץ) בלי להיות רגיש לכל פיקסל -
    ולכן הרבה יותר עמיד לטשטוש, רעש ולהזזות קלות של החלון הנבדק
    מאשר השוואת פיקסלים גולמיים.
    """
    arr = np.asarray(img_rgb, dtype=np.float32) / 255.0
    h, w, _ = arr.shape
    ys = np.linspace(0, h, grid + 1).astype(int)
    xs = np.linspace(0, w, grid + 1).astype(int)

    gy, gx = np.gradient(gray)
    magnitude = np.sqrt(gx ** 2 + gy ** 2)

    color_cells = []
    edge_cells = []
    for i in range(grid):
        for j in range(grid):
            cell = arr[ys[i]:ys[i + 1], xs[j]:xs[j + 1], :]
            color_cells.append(cell.reshape(-1, 3).mean(axis=0))
            edge_cell = magnitude[ys[i]:ys[i + 1], xs[j]:xs[j + 1]]
            edge_cells.append(edge_cell.mean())

    return np.concatenate([np.array(color_cells).ravel(), np.array(edge_cells)]).astype(np.float32)


def extract_features(img: Image.Image) -> np.ndarray:
    """
    מקבל תמונת PIL בכל גודל, ומחזיר וקטור numpy באורך קבוע.
    שילוב של: היסטוגרמת צבע גלובלית + היסטוגרמת כיווני-קצוות +
    רשת מרחבית גסה של צבע/קצוות. במכוון לא משתמשים בפיקסלים
    גולמיים בפירוט גבוה, כדי שהזיהוי יהיה עמיד לתמונות באיכות נמוכה,
    טשטוש, רעש והזזות קלות.
    """
    img_rgb = img.convert("RGB").resize(FEATURE_IMAGE_SIZE)
    gray = np.asarray(img_rgb.convert("L"), dtype=np.float32) / 255.0

    color_hist = _color_histogram(img_rgb, bins=8)                    # 24 ערכים
    edge_hist = _edge_orientation_histogram(gray, bins=9)              # 9 ערכים
    spatial = _spatial_grid_features(img_rgb, gray, grid=4)            # 48 + 16 = 64 ערכים

    features = np.concatenate([color_hist, edge_hist, spatial]).astype(np.float32)
    return features
