"""
סקריפט האימון.

מריצים אותו כך:
    python train_model.py

הוא סורק את תיקיית IMAGES_DIR (ר' config.py), טוען את כל התמונות
מכל תת-תיקייה (=סוג אובייקט), מחלץ מהן features, ושומר הכל
לקובץ model/model.npz. את קובץ ה-model הזה טוען app.py בזמן ריצה.

*** לא חובה שתמונות האימון יכילו כמה אובייקטים ביחד! ***
המערכת משתמשת בשיטת "חלון נע" (sliding window) בזמן הזיהוי -
כלומר בזמן שמזהים תמונה חדשה, המערכת בעצמה בודקת המון "חלונות"
(אזורים) בגדלים שונים בתוך התמונה, ומסווגת כל חלון בנפרד.
ככה אפשר לספור כמה אובייקטים בתמונה אחת, גם אם באימון כל
תמונה הכילה רק אובייקט בודד אחד.

המלצה (לא חובה): מומלץ להוסיף גם תיקייה בשם BACKGROUND עם
כמה תמונות רקע "ריקות" (שמיים, קיר, דשא בלי כלום וכו') - זה
עוזר למודל להבין מה *לא* אובייקט, ומצמצם זיהויי-שווא.
"""

import os
import numpy as np
from PIL import Image

from config import IMAGES_DIR, MODEL_PATH, AUGMENTATIONS_PER_IMAGE
from features import extract_features
from augment import make_augmented_variants

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def load_dataset():
    if not os.path.isdir(IMAGES_DIR):
        raise SystemExit(
            f"תיקיית האימון לא נמצאה בנתיב:\n  {IMAGES_DIR}\n"
            f"צור תיקייה בשם 'images' לצד הסקריפטים (או שנה את הנתיב "
            f"במשתנה IMAGES_DIR בקובץ config.py), ובתוכה תת-תיקייה לכל "
            f"סוג אובייקט שברצונך לזהות."
        )

    class_names = sorted(
        d for d in os.listdir(IMAGES_DIR)
        if os.path.isdir(os.path.join(IMAGES_DIR, d))
    )

    if not class_names:
        raise SystemExit(
            f"לא נמצאו תתי-תיקיות (=סוגי אובייקטים) בתוך:\n  {IMAGES_DIR}"
        )

    features_list = []
    labels_list = []

    for class_name in class_names:
        class_dir = os.path.join(IMAGES_DIR, class_name)
        image_files = [
            f for f in os.listdir(class_dir)
            if f.lower().endswith(VALID_EXTENSIONS)
        ]

        if not image_files:
            print(f"אזהרה: אין תמונות בתיקייה '{class_name}', מדלג עליה.")
            continue

        print(f"טוען {len(image_files)} תמונות עבור הקטגוריה '{class_name}'...")

        for fname in image_files:
            fpath = os.path.join(class_dir, fname)
            try:
                img = Image.open(fpath).convert("RGB")
                feat = extract_features(img)
                features_list.append(feat)
                labels_list.append(class_name)

                if AUGMENTATIONS_PER_IMAGE > 0:
                    for variant in make_augmented_variants(img, AUGMENTATIONS_PER_IMAGE):
                        features_list.append(extract_features(variant))
                        labels_list.append(class_name)
            except Exception as exc:
                print(f"  שגיאה בטעינת {fpath}: {exc}")

    if not features_list:
        raise SystemExit("לא נטענה אף תמונה תקינה. בדוק את תיקיית ה-images.")

    X = np.stack(features_list)
    y = np.array(labels_list)
    return X, y, class_names


def _calibrate_distance_threshold(X_norm: np.ndarray, y: np.ndarray) -> float:
    """
    מחשב סף מרחק סביר אוטומטית: עבור כל תמונת אימון (או מדגם מהן, אם
    יש הרבה), מוצא כמה רחוקה תמונת האימון הכי דומה לה *מאותה קטגוריה*
    (leave-one-out), ולוקח אחוזון גבוה (90) מכל המרחקים האלה, עם קצת
    "רווח ביטחון" - כדי שתמונות חדשות ודומות (אך לא זהות) עדיין יעברו.
    """
    n = len(X_norm)
    max_samples = 300
    if n > max_samples:
        sample_idx = np.random.choice(n, size=max_samples, replace=False)
    else:
        sample_idx = np.arange(n)

    same_class_nearest = []
    for i in sample_idx:
        dists = np.sqrt(((X_norm - X_norm[i]) ** 2).sum(axis=1))
        dists[i] = np.inf
        same_mask = (y == y[i])
        same_mask[i] = False
        if same_mask.any():
            same_class_nearest.append(dists[same_mask].min())

    if not same_class_nearest:
        return 3.0  # ברירת מחדל סבירה אם אין מספיק דוגמאות להשוואה

    same_class_nearest = np.array(same_class_nearest)
    threshold = float(np.percentile(same_class_nearest, 90) * 1.6)
    return max(threshold, 0.5)


def main():
    X, y, class_names = load_dataset()

    # נירמול (z-score): כדי שכל המאפיינים ישפיעו בערך באותה מידה
    # על חישוב המרחק בין תמונות (kNN), ולא רק המאפיינים עם ערכים גדולים.
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    std[std < 1e-6] = 1.0  # מניעת חלוקה באפס
    X_norm = (X - mean) / std

    recommended_threshold = _calibrate_distance_threshold(X_norm, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    np.savez(
        MODEL_PATH,
        X=X_norm.astype(np.float32),
        y=y,
        mean=mean.astype(np.float32),
        std=std.astype(np.float32),
        class_names=np.array(class_names),
        recommended_distance_threshold=np.float32(recommended_threshold),
    )

    print("\nהאימון הושלם בהצלחה!")
    print(f"סה\"כ {len(y)} דוגמאות אימון (כולל הגדלה מלאכותית), "
          f"{len(class_names)} סוגי אובייקטים:")
    for c in class_names:
        count = int((y == c).sum())
        print(f"  - {c}: {count} דוגמאות")
    print(f"\nהמודל נשמר בקובץ: {MODEL_PATH}")
    print(f"סף מרחק שחושב אוטומטית: {recommended_threshold:.3f} "
          f"(אפשר לדרוס ידנית ב-config.py, MAX_DISTANCE_THRESHOLD)")
    print("עכשיו אפשר להריץ: python app.py")


if __name__ == "__main__":
    main()
