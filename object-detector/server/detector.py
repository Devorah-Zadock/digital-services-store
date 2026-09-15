"""
לוגיקת הזיהוי:
1. "חלון נע" (sliding window) - סורק את התמונה במלבנים בגדלים שונים.
2. מסווג כל חלון בנפרד לפי קרבה (kNN) לתמונות האימון.
3. non-max suppression - מאחד חלונות חופפים שזיהו את אותו אובייקט
   ממש, כדי לא לספור אובייקט אחד כמה פעמים.

הכל בנוי עם numpy ו-PIL בלבד, ללא OpenCV וללא YOLO.
"""

import os
import numpy as np
from PIL import Image, ImageDraw

from config import (
    MODEL_PATH,
    WINDOW_SCALES,
    WINDOW_STEP_RATIO,
    KNN_NEIGHBORS,
    MAX_DISTANCE_THRESHOLD,
    NMS_IOU_THRESHOLD,
    MIN_CONFIDENCE,
    BACKGROUND_LABELS,
)
from features import extract_features

BOX_COLORS = [
    (220, 30, 30), (30, 160, 30), (30, 90, 220), (230, 140, 0),
    (170, 30, 170), (0, 160, 160), (120, 60, 160), (120, 80, 40),
]


class Detector:
    def __init__(self, model_path: str = MODEL_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"לא נמצא מודל מאומן בנתיב {model_path}.\n"
                f"קודם יש להריץ: python train_model.py"
            )
        data = np.load(model_path, allow_pickle=True)
        self.X = data["X"]
        self.y = data["y"]
        self.mean = data["mean"]
        self.std = data["std"]
        self.class_names = list(data["class_names"])

        if MAX_DISTANCE_THRESHOLD is not None:
            self.distance_threshold = float(MAX_DISTANCE_THRESHOLD)
        else:
            self.distance_threshold = float(data["recommended_distance_threshold"])

    # ---------- סיווג חלון בודד ----------

    def _normalize(self, feat: np.ndarray) -> np.ndarray:
        return (feat - self.mean) / self.std

    def _classify_window(self, feat_norm: np.ndarray):
        """מחזיר (שם_קטגוריה, רמת_ביטחון) או (None, 0.0) אם אין זיהוי ברור."""
        dists = np.sqrt(((self.X - feat_norm) ** 2).sum(axis=1))
        k = min(KNN_NEIGHBORS, len(dists))
        nearest_idx = np.argsort(dists)[:k]
        nearest_labels = self.y[nearest_idx]
        nearest_dists = dists[nearest_idx]

        best_dist = float(nearest_dists[0])
        if best_dist > self.distance_threshold:
            return None, 0.0

        labels, counts = np.unique(nearest_labels, return_counts=True)
        best_label = labels[np.argmax(counts)]
        if str(best_label).lower() in BACKGROUND_LABELS:
            return None, 0.0
        vote_ratio = counts.max() / k

        closeness = max(0.0, 1.0 - (best_dist / self.distance_threshold))
        confidence = 0.5 * vote_ratio + 0.5 * closeness

        return str(best_label), float(confidence)

    # ---------- חלון נע ----------

    @staticmethod
    def _sliding_windows(width: int, height: int):
        boxes = []
        for size in WINDOW_SCALES:
            win = min(size, width, height)
            if win < 16:
                continue
            step = max(1, int(win * WINDOW_STEP_RATIO))

            xs = list(range(0, max(1, width - win) + 1, step))
            ys = list(range(0, max(1, height - win) + 1, step))
            if xs[-1] != width - win:
                xs.append(width - win)
            if ys[-1] != height - win:
                ys.append(height - win)

            for y in ys:
                for x in xs:
                    boxes.append((x, y, x + win, y + win))
        return boxes

    # ---------- non-max suppression ----------

    @staticmethod
    def _iou(box_a, box_b) -> float:
        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b
        inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
        inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)
        inter_w = max(0, inter_x2 - inter_x1)
        inter_h = max(0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h
        if inter_area == 0:
            return 0.0
        area_a = (ax2 - ax1) * (ay2 - ay1)
        area_b = (bx2 - bx1) * (by2 - by1)
        union = area_a + area_b - inter_area
        return inter_area / union if union > 0 else 0.0

    def _non_max_suppression(self, detections):
        by_class = {}
        for det in detections:
            by_class.setdefault(det["class"], []).append(det)

        final = []
        for _, dets in by_class.items():
            dets = sorted(dets, key=lambda d: d["confidence"], reverse=True)
            kept = []
            while dets:
                best = dets.pop(0)
                kept.append(best)
                dets = [d for d in dets if self._iou(best["box"], d["box"]) < NMS_IOU_THRESHOLD]
            final.extend(kept)
        return final

    # ---------- API ראשי ----------

    def detect(self, image: Image.Image):
        image = image.convert("RGB")
        width, height = image.size

        detections = []
        for box in self._sliding_windows(width, height):
            crop = image.crop(box)
            feat = extract_features(crop)
            feat_norm = self._normalize(feat)
            label, confidence = self._classify_window(feat_norm)
            if label is not None and confidence >= MIN_CONFIDENCE:
                detections.append({"class": label, "confidence": confidence, "box": box})

        return self._non_max_suppression(detections)

    def detect_and_draw(self, image: Image.Image):
        """מריץ זיהוי ומחזיר (תמונה_מסומנת, רשימת_זיהויים, ספירה_לפי_סוג)."""
        detections = self.detect(image)

        annotated = image.convert("RGB").copy()
        draw = ImageDraw.Draw(annotated)

        class_color = {}
        for det in detections:
            c = det["class"]
            if c not in class_color:
                class_color[c] = BOX_COLORS[len(class_color) % len(BOX_COLORS)]
            color = class_color[c]

            x1, y1, x2, y2 = det["box"]
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

            label_text = f"{c} ({det['confidence']:.0%})"
            text_w = 7 * len(label_text) + 6
            label_y = max(0, y1 - 16)
            draw.rectangle([x1, label_y, x1 + text_w, label_y + 16], fill=color)
            draw.text((x1 + 3, label_y + 1), label_text, fill=(255, 255, 255))

        counts = {}
        for det in detections:
            counts[det["class"]] = counts.get(det["class"], 0) + 1

        return annotated, detections, counts
