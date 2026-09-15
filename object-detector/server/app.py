"""
שרת האתר (Flask) - צד השרת (server-side).

מריצים כך (מתוך תיקיית server):

    python app.py

ואז נכנסים בדפדפן לכתובת: http://127.0.0.1:5000
דף ה-HTML שהדפדפן מקבל (צד הלקוח) נמצא בתיקיית client/ לצד server/.

חשוב: לפני שמריצים את זה בפעם הראשונה צריך לאמן מודל
(אחרת תופיע הודעת שגיאה שמסבירה מה לעשות):

    python train_model.py
"""

import os
import io
import base64

from flask import Flask, request, render_template
from PIL import Image

from config import UPLOAD_DIR, MODEL_PATH, MAX_UPLOAD_DIMENSION
from detector import Detector

# תיקיית client (צד הלקוח: HTML/CSS) יושבת לצד תיקיית server, אחות שלה.
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(SERVER_DIR, "..", "client")

app = Flask(
    __name__,
    template_folder=os.path.join(CLIENT_DIR, "templates"),
    static_folder=os.path.join(CLIENT_DIR, "static"),
)
os.makedirs(UPLOAD_DIR, exist_ok=True)

_detector = None


def get_detector() -> Detector:
    """טוען את המודל פעם אחת בלבד ושומר אותו בזיכרון (lazy singleton)."""
    global _detector
    if _detector is None:
        _detector = Detector(MODEL_PATH)
    return _detector


def _resize_if_needed(image: Image.Image) -> Image.Image:
    width, height = image.size
    scale = min(1.0, MAX_UPLOAD_DIMENSION / max(width, height))
    if scale < 1.0:
        image = image.resize((int(width * scale), int(height * scale)))
    return image


def _image_to_base64_png(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", result=None, error=None)


@app.route("/predict", methods=["POST"])
def predict():
    uploaded = request.files.get("image")
    if uploaded is None or uploaded.filename == "":
        return render_template("index.html", result=None, error="לא נבחרה תמונה")

    try:
        image = Image.open(uploaded.stream)
        image.load()
    except Exception:
        return render_template("index.html", result=None, error="קובץ התמונה לא תקין")

    image = _resize_if_needed(image)

    try:
        detector = get_detector()
    except FileNotFoundError as exc:
        return render_template("index.html", result=None, error=str(exc))

    annotated, detections, counts = detector.detect_and_draw(image)

    result = {
        "image_b64": _image_to_base64_png(annotated),
        "counts": sorted(counts.items(), key=lambda item: item[1], reverse=True),
        "total": len(detections),
    }

    return render_template("index.html", result=result, error=None)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
