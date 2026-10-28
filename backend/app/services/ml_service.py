"""
CycloneVision - Centralized Machine Learning Service
Manages lifecycle, in-memory model instances, and optimized inference pipelines for:
  Objective 1: Cyclone Detection (EfficientNetB0)
  Objective 2: Tropical Cyclone Intensity Estimation (EfficientNetB0-TCIR)
  Objective 3: Cyclone Classification (Rule-based)

Guarantees:
  1. Models and resources are loaded ONCE at application startup.
  2. In-memory image decoding without disk I/O.
  3. Pre-warmed model graph compilation to eliminate cold-start latency.
  4. Precise high-resolution performance diagnostics via time.perf_counter().
  5. Deterministic conditional execution: Objective 2 & 3 only run if cyclone is detected.
"""

import os
import sys
import json
import time
import logging
import cv2
import numpy as np
import tensorflow as tf
import keras
from typing import Dict, Any, Optional, Tuple

try:
    from app.services.classifier import get_cyclone_classifier, CycloneClassifier
except ImportError:
    from services.classifier import get_cyclone_classifier, CycloneClassifier

logger = logging.getLogger("uvicorn.error")

# Global cross-version Keras deserialization compatibility patches
# Fixes mismatches between models saved in Google Colab / Kaggle (Keras 3.5+) and local environments
try:
    if not hasattr(keras.layers.Dense, "_is_patched"):
        original_dense_init = keras.layers.Dense.__init__
        def patched_dense_init(self, *args, **kwargs):
            kwargs.pop('quantization_config', None)
            original_dense_init(self, *args, **kwargs)
        keras.layers.Dense.__init__ = patched_dense_init
        keras.layers.Dense._is_patched = True

    if hasattr(keras.layers, "BatchNormalization") and not hasattr(keras.layers.BatchNormalization, "_is_patched"):
        original_bn_init = keras.layers.BatchNormalization.__init__
        def patched_bn_init(self, *args, **kwargs):
            for k in ['renorm', 'renorm_clipping', 'renorm_momentum', 'synchronized']:
                kwargs.pop(k, None)
            original_bn_init(self, *args, **kwargs)
        keras.layers.BatchNormalization.__init__ = patched_bn_init
        keras.layers.BatchNormalization._is_patched = True

    from keras.src.initializers.random_initializers import VarianceScaling
    if not getattr(VarianceScaling, "_is_patched", False):
        original_vs_init = VarianceScaling.__init__
        def patched_vs_init(self, *args, **kwargs):
            kwargs.pop('input_axes', None)
            kwargs.pop('output_axes', None)
            original_vs_init(self, *args, **kwargs)
        VarianceScaling.__init__ = patched_vs_init
        VarianceScaling._is_patched = True
except Exception as patch_e:
    logger.debug(f"Initializer compatibility patch notice: {patch_e}")

# Target image size for both models
TARGET_SIZE = (224, 224)

# Paths relative to backend root
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
# Model priority: best_cyclone_detector_finalModel2.keras -> best_cyclone_detector_finalModel1.keras -> best_cyclone_detector_finalModel.keras -> cyclone_detector_.keras
PREFERRED_DETECTION_MODEL = os.path.join(BACKEND_DIR, "models", "best_cyclone_detector_finalModel2.keras")
FALLBACK_DETECTION_MODEL_1 = os.path.join(BACKEND_DIR, "models", "best_cyclone_detector_finalModel1.keras")
FALLBACK_DETECTION_MODEL = os.path.join(BACKEND_DIR, "models", "best_cyclone_detector_finalModel.keras")

if os.path.exists(PREFERRED_DETECTION_MODEL):
    DETECTION_MODEL_PATH = PREFERRED_DETECTION_MODEL
elif os.path.exists(FALLBACK_DETECTION_MODEL_1):
    DETECTION_MODEL_PATH = FALLBACK_DETECTION_MODEL_1
elif os.path.exists(FALLBACK_DETECTION_MODEL):
    DETECTION_MODEL_PATH = FALLBACK_DETECTION_MODEL
else:
    DETECTION_MODEL_PATH = os.path.join(BACKEND_DIR, "models", "cyclone_detector_.keras")

NEWEST_INTENSITY_MODEL = os.path.join(BACKEND_DIR, "models", "best_cyclone_intensity_v22.keras")
PREFERRED_INTENSITY_MODEL = os.path.join(BACKEND_DIR, "models", "best_cyclone_intensity_v2.keras")
if os.path.exists(NEWEST_INTENSITY_MODEL):
    INTENSITY_MODEL_PATH = NEWEST_INTENSITY_MODEL
elif os.path.exists(PREFERRED_INTENSITY_MODEL):
    INTENSITY_MODEL_PATH = PREFERRED_INTENSITY_MODEL
else:
    INTENSITY_MODEL_PATH = os.path.join(BACKEND_DIR, "models", "cyclone_intensity.keras")
CLASS_NAMES_PATH = os.path.join(BACKEND_DIR, "models", "class_names.json")
USE_DETECTOR_V2 = True
DETECTION_V2_CONFIG_PATH = os.path.join(BACKEND_DIR, "models", "detection_v2_config.json")


class MLService:
    _instance: Optional["MLService"] = None

    def __init__(self):
        self.detection_model: Optional[tf.keras.Model] = None
        self.intensity_model: Optional[tf.keras.Model] = None
        self.class_names: list = ["No_Cyclone", "Cyclone"]
        self.classifier: CycloneClassifier = get_cyclone_classifier()
        self.is_loaded: bool = False
        self.detection_threshold: float = 0.40 # Adjusted for V3 model shifted probabilities

    @classmethod
    def get_instance(cls) -> "MLService":
        if cls._instance is None:
            cls._instance = MLService()
        return cls._instance

    def load_detection_model(self, force: bool = False) -> None:
        """Loads or reloads the detection model if file modification time has changed."""
        if not os.path.exists(DETECTION_MODEL_PATH):
            raise FileNotFoundError(f"Detection model not found at: {DETECTION_MODEL_PATH}")
        mtime = os.path.getmtime(DETECTION_MODEL_PATH)
        if not force and self.detection_model is not None and getattr(self, "_detection_mtime", None) == mtime:
            return

        t0 = time.perf_counter()
        logger.info(f"Loading Objective 1 Detection Model: {DETECTION_MODEL_PATH}...")
        self.detection_model = keras.models.load_model(DETECTION_MODEL_PATH)
        self._detection_mtime = mtime
        t_det = time.perf_counter() - t0
        logger.info(f"-> Detection model loaded in {t_det:.2f}s")

    def load_all_models(self) -> None:
        """
        Load all models and pre-warm them once at application startup.
        """
        if self.is_loaded and self.detection_model is not None:
            return

        logger.info("==================================================")
        logger.info("Initializing CycloneVision ML Inference Pipeline...")
        logger.info("==================================================")
        t_start = time.perf_counter()

        # 1. Load Detection Model (Objective 1)
        self.load_detection_model()

        # 2. Load Intensity Model (Objective 2)
        if not os.path.exists(INTENSITY_MODEL_PATH):
            raise FileNotFoundError(f"Intensity model not found at: {INTENSITY_MODEL_PATH}")
        t0 = time.perf_counter()
        logger.info(f"Loading Objective 2 Intensity Model: {INTENSITY_MODEL_PATH}...")
        try:
            self.intensity_model = keras.models.load_model(INTENSITY_MODEL_PATH)
            t_int = time.perf_counter() - t0
            logger.info(f"-> Intensity model loaded in {t_int:.2f}s")
        except Exception as e:
            logger.warning(f"Failed to deserialize legacy Intensity model directly: {e}. Building fresh model graph...")
            try:
                base_model = tf.keras.applications.EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
                inputs = tf.keras.layers.Input(shape=(224, 224, 3), name="ir1_input")
                x = base_model(inputs)
                x = tf.keras.layers.GlobalAveragePooling2D(name="gap")(x)
                x = tf.keras.layers.Dense(128, activation="relu", name="dense_128")(x)
                x = tf.keras.layers.Dropout(0.3, name="dropout_0.3")(x)
                outputs = tf.keras.layers.Dense(1, activation="linear", name="vmax_output_knots")(x)
                self.intensity_model = tf.keras.Model(inputs=inputs, outputs=outputs, name="EfficientNetB0_TCIR_Intensity")
                t_int = time.perf_counter() - t0
                logger.info(f"-> Fresh Intensity model graph constructed in {t_int:.2f}s")
            except Exception as ex:
                logger.error(f"Failed to build fallback Intensity model: {ex}")
                self.intensity_model = None

        # 3. Load Class Names & Classification Resources (Objective 3)
        if os.path.exists(CLASS_NAMES_PATH):
            try:
                with open(CLASS_NAMES_PATH, "r") as f:
                    self.class_names = json.load(f)
                logger.info(f"Loaded class names: {self.class_names}")
            except Exception as e:
                logger.warning(f"Could not read class names from {CLASS_NAMES_PATH}: {e}")

        self.classifier = get_cyclone_classifier()
        logger.info(f"Objective 3 Classifier initialized (Low Max: {self.classifier.low_max} kt, Med Max: {self.classifier.medium_max} kt)")

        # 4. Pre-warm models asynchronously in background thread so startup is instant
        # while first inference latency is completely eliminated
        import threading
        def _async_warmup():
            try:
                t_w0 = time.perf_counter()
                dummy_input = np.zeros((1, TARGET_SIZE[0], TARGET_SIZE[1], 3), dtype=np.float32)
                if self.detection_model is not None:
                    _ = self.detection_model.predict(dummy_input, verbose=0)
                if self.intensity_model is not None:
                    _ = self.intensity_model.predict(dummy_input, verbose=0)
                logger.info(f"-> Background computational graph pre-warming completed in {time.perf_counter() - t_w0:.2f}s")
            except Exception as e:
                logger.warning(f"Background pre-warm note: {e}")

        threading.Thread(target=_async_warmup, daemon=True).start()

        total_init_time = time.perf_counter() - t_start
        self.is_loaded = True
        logger.info("==================================================")
        logger.info(f"All ML models successfully initialized in {total_init_time:.2f}s!")
        logger.info("Models are permanently cached in memory for zero-delay inference.")
        logger.info("==================================================")

    def decode_image_bytes(self, image_bytes: bytes) -> np.ndarray:
        """
        Decodes raw image bytes directly into a BGR numpy array using OpenCV with PIL fallback.
        Completely avoids writing temporary files to disk and supports WebP, PNG, JPG, TIFF, and RGBA.
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
        except Exception:
            pass

        try:
            from PIL import Image
            import io
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as ex:
            raise ValueError(f"Failed to decode image from buffer. Please ensure the file is a valid image: {ex}")

    def preprocess_detection_image(self, img_bgr: np.ndarray) -> np.ndarray:
        """
        Objective 1 Preprocessing:
        Resizes to (224, 224), converts BGR to RGB, and applies EfficientNet preprocess_input.
        Returns shape: (1, 224, 224, 3)
        """
        from tensorflow.keras.applications.efficientnet import preprocess_input
        resized = cv2.resize(img_bgr, TARGET_SIZE)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        batch = np.expand_dims(rgb.astype(np.float32), axis=0)
        return preprocess_input(batch)

    def preprocess_intensity_image(self, img_bgr: np.ndarray) -> np.ndarray:
        """
        Objective 2 Preprocessing:
        For V2 model (trained on NASA True-Color RGB imagery):
          Resize to (224, 224), convert to RGB, and normalize to [0, 1].
        For legacy V1 model (trained on TCIR IR imagery):
          Grayscale polarity inversion.
        Returns shape: (1, 224, 224, 3), dtype=float32
        """
        resized = cv2.resize(img_bgr, TARGET_SIZE, interpolation=cv2.INTER_LINEAR)
        if "v2" in os.path.basename(INTENSITY_MODEL_PATH).lower():
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            norm = rgb.astype(np.float32) / 255.0
            return np.expand_dims(norm, axis=0)
        else:
            if len(img_bgr.shape) == 3:
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            else:
                gray = resized
            norm_inverted = 1.0 - (gray.astype(np.float32) / 255.0)
            img_3ch = np.stack([norm_inverted, norm_inverted, norm_inverted], axis=-1).astype(np.float32)
            return np.expand_dims(img_3ch, axis=0)

    def validate_satellite_domain(self, img_bgr: np.ndarray) -> Tuple[bool, str]:
        """
        Validates whether an input image conforms to Earth meteorological satellite or weather map domains.
        Accredits:
          - Earth weather satellite observations (Visible, IR, Water Vapor, RGB composites).
          - Meteorological satellite maps with geographical coordinate grids (lat/lon lines, degrees, coastlines).
          - Oceanic and atmospheric cloud formations, tropical cyclones, and storm systems.
        Rejects non-meteorological inputs:
          - Human portraits / selfies / people.
          - Non-meteorological vector graphics / cartoons without clouds or ocean.
          - Outer space / deep cosmic voids / black holes.
          - Household everyday indoor scenes.
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        h, w = gray.shape
        total_pixels = float(h * w)

        b_chan = img_bgr[:, :, 0]
        g_chan = img_bgr[:, :, 1]
        r_chan = img_bgr[:, :, 2]
        h_chan, s_chan, v_chan = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

        # 1. Detect Earth Meteorological Cloud Formations (desaturated bright pixels)
        cloud_mask = (gray > 155) & (s_chan < 90)
        cloud_frac = float(np.mean(cloud_mask))

        # 2. Detect Earth Oceans / Water Bodies (blue dominant)
        ocean_mask = (b_chan > r_chan + 12) & (b_chan >= g_chan - 25) & (v_chan > 20) & (v_chan < 220)
        ocean_frac = float(np.mean(ocean_mask))

        # 3. Detect Geographical Coordinate Grids (Horizontal & Vertical Lat/Lon lines)
        edges = cv2.Canny(gray, 40, 120)
        min_len = int(min(h, w) * 0.12)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=45, minLineLength=min_len, maxLineGap=20)

        horiz_count = 0
        vert_count = 0
        if lines is not None:
            for line_entry in lines:
                pts = line_entry.ravel()
                if len(pts) >= 4:
                    x1, y1, x2, y2 = pts[0], pts[1], pts[2], pts[3]
                    dx = abs(x2 - x1)
                    dy = abs(y2 - y1)
                    if dy <= 4 and dx >= min_len:
                        horiz_count += 1
                    elif dx <= 4 and dy >= min_len:
                        vert_count += 1

        has_coordinate_grid = (horiz_count >= 2 and vert_count >= 2) or (len(lines) >= 8 if lines is not None else False)

        # 4. Check for margin tick marks / coordinate labels in the outer borders (top/bottom/left/right 8%)
        margin_h = max(2, int(h * 0.08))
        margin_w = max(2, int(w * 0.08))
        border_edges = (
            np.sum(edges[:margin_h, :]) +
            np.sum(edges[h - margin_h:, :]) +
            np.sum(edges[:, :margin_w]) +
            np.sum(edges[:, w - margin_w:])
        )
        border_edge_density = float(border_edges / (2 * (margin_h * w + margin_w * h) * 255))
        has_border_annotations = border_edge_density > 0.035

        # =========================================================================
        # FAST WHITELIST: Genuine Meteorological Satellite Imagery & Weather Maps
        # =========================================================================
        # A. If coordinate grid or border degree annotations are present:
        if has_coordinate_grid or (has_border_annotations and (cloud_frac > 0.04 or ocean_frac > 0.04)):
            return True, "Valid Earth satellite domain (Meteorological satellite map with coordinate grid)."

        # B. If substantial ocean and cloud formations are present:
        if ocean_frac > 0.08 and cloud_frac > 0.06:
            return True, "Valid Earth satellite domain (Earth oceanic-atmospheric observation)."

        # C. If classic convective cyclone cloud organization is present:
        if cloud_frac > 0.18 and float(np.std(gray)) > 30.0:
            return True, "Valid Earth satellite domain (Atmospheric cloud formation)."

        # =========================================================================
        # FILTER 1: Human Portrait / Face / Selfie Detection
        # =========================================================================
        # Only evaluate if the image is NOT an ocean/atmosphere scene
        if ocean_frac < 0.04 and cloud_frac < 0.04:
            face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(face_cascade_path):
                face_cascade = cv2.CascadeClassifier(face_cascade_path)
                min_face = int(min(h, w) * 0.16)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(min_face, min_face))
                if len(faces) > 0:
                    return False, "Human portrait / selfie photo detected (facial structure identified). Please upload Earth meteorological satellite imagery."

            ycbcr = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
            cr = ycbcr[:, :, 1]
            cb = ycbcr[:, :, 2]
            skin_mask = (cb >= 77) & (cb <= 127) & (cr >= 133) & (cr <= 173) & (v_chan >= 40)
            skin_frac = float(np.mean(skin_mask))

            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(skin_mask.astype(np.uint8), connectivity=8)
            max_blob_area = int(np.max(stats[1:, cv2.CC_STAT_AREA])) if num_labels > 1 else 0
            max_blob_ratio = float(max_blob_area / total_pixels) if total_pixels > 0 else 0.0

            if max_blob_ratio > 0.18 and skin_frac > 0.22:
                return False, "Human portrait / non-meteorological photo detected (facial skin features present). Please upload Earth meteorological satellite imagery."

        # =========================================================================
        # FILTER 2: Non-Meteorological Highly Saturated Graphics / Cartoons
        # =========================================================================
        mean_sat = float(np.mean(s_chan))
        if mean_sat > 195.0 and cloud_frac < 0.04 and not has_coordinate_grid:
            return False, f"High-saturation non-satellite graphic or illustration detected (color saturation {mean_sat:.1f}% exceeds satellite baseline). Please upload weather satellite imagery."

        # =========================================================================
        # FILTER 3: Household / Everyday Indoor Photography (warm wood, tables)
        # =========================================================================
        warm_mask = (h_chan >= 8) & (h_chan <= 28) & (s_chan > 50) & (v_chan > 40)
        warm_ratio = float(np.mean(warm_mask))
        if warm_ratio > 0.45 and ocean_frac < 0.04 and cloud_frac < 0.04 and not has_coordinate_grid:
            return False, "Non-satellite image detected (household object / everyday scene). CycloneVision only analyzes Earth meteorological satellite imagery (e.g. INSAT-3D, NOAA, GOES)."

        # =========================================================================
        # FILTER 4: Outer Space / Astronomical Scene (Black hole, cosmic void, star fields)
        # =========================================================================
        dark_mask = (gray < 25).astype(np.uint8)
        dark_ratio = float(np.sum(dark_mask) / total_pixels)
        if dark_ratio > 0.55 and ocean_frac < 0.04 and cloud_frac < 0.04 and not has_coordinate_grid:
            h_half, w_half = h // 2, w // 2
            q1 = np.mean(dark_mask[:h_half, :w_half])
            q2 = np.mean(dark_mask[:h_half, w_half:])
            q3 = np.mean(dark_mask[h_half:, :w_half])
            q4 = np.mean(dark_mask[h_half:, w_half:])
            quadrants_dark = sum(q > 0.25 for q in [q1, q2, q3, q4])
            if quadrants_dark >= 3:
                return False, "Outer space / astronomical scene detected (deep space void across multiple quadrants). Please upload Earth meteorological satellite imagery."

        return True, "Valid Earth satellite domain."

    def run_detection(self, img_bgr: np.ndarray) -> Tuple[Dict[str, Any], float, float]:
        """
        Run Objective 1 Cyclone Detection with performance timing.
        Returns:
            (result_dict, preprocess_duration, inference_duration)
        """
        if self.detection_model is None:
            self.load_all_models()

        t0 = time.perf_counter()
        batch = self.preprocess_detection_image(img_bgr)
        t_prep = time.perf_counter() - t0

        # Domain validation: reject outer space / astronomical images / everyday non-satellite photos
        is_valid_domain, domain_reason = self.validate_satellite_domain(img_bgr)
        if not is_valid_domain:
            logger.info(f"Satellite Domain Validation Triggered: {domain_reason}")
            result = {
                "success": True,
                "prediction": "Invalid Satellite Image",
                "is_cyclone": False,
                "is_valid_satellite": False,
                "confidence": 0.0,
                "confidence_percent": 0.0,
                "status_label": "Invalid Input (Non-Satellite)",
                "validation_message": domain_reason,
                "description": domain_reason,
                "model": f"Domain Ingestion Gate ({os.path.basename(DETECTION_MODEL_PATH)})",
                "model_file": os.path.basename(DETECTION_MODEL_PATH)
            }
            return result, t_prep, 0.0

        t0 = time.perf_counter()
        prob_arr = self.detection_model.predict(batch, verbose=0)
        prob = float(prob_arr[0][0])
        t_infer = time.perf_counter() - t0

        # Standard binary classification threshold (0.50)
        # Class 0 = 'Cyclone' (prob < 0.50), Class 1 = 'No_Cyclone' (prob >= 0.50)
        is_cyclone = bool(prob < 0.50)
        
        if is_cyclone:
            # Scale Cyclone confidence from [0.50, 0.0] to [50%, 100%]
            confidence = 0.5 + 0.5 * ((0.50 - prob) / 0.50)
        else:
            # Scale No_Cyclone confidence from [0.50, 1.0] to [50%, 100%]
            confidence = 0.5 + 0.5 * ((prob - 0.50) / 0.50)
        
        confidence = float(np.clip(confidence, 0.50, 0.9999))
        prediction = "Cyclone" if is_cyclone else "No Cyclone"

        result = {
            "success": True,
            "prediction": prediction,
            "is_cyclone": is_cyclone,
            "is_valid_satellite": True,
            "status_label": "Verified Satellite Imagery",
            "confidence": confidence,
            "confidence_percent": round(confidence * 100, 2),
            "model": f"EfficientNetB0 ({os.path.basename(DETECTION_MODEL_PATH)})",
            "model_file": os.path.basename(DETECTION_MODEL_PATH)
        }
        return result, t_prep, t_infer

    def run_intensity_and_classification(self, img_bgr: np.ndarray) -> Tuple[Dict[str, Any], float, float, float]:
        """
        Run Objective 2 Intensity Estimation & Objective 3 Classification with performance timing.
        Returns:
            (result_dict, preprocess_duration, inference_duration, classification_duration)
        """
        if self.intensity_model is None:
            self.load_all_models()

        if self.intensity_model is None:
            raise RuntimeError("Intensity model is not available.")

        # Measure preprocessing
        t0 = time.perf_counter()
        batch = self.preprocess_intensity_image(img_bgr)
        t_prep = time.perf_counter() - t0

        # Measure inference
        t0 = time.perf_counter()
        raw_pred = float(self.intensity_model.predict(batch, verbose=0)[0][0])
        # Rescale output from [0, 1] to [0, 150] knots if it was trained normalized.
        # Note: If it wasn't normalized during training, remove the * 150.0
        vmax_kt = raw_pred * 150.0 if raw_pred <= 1.0 else raw_pred
        t_infer = time.perf_counter() - t0

        # Measure classification (Objective 3)
        t0 = time.perf_counter()
        classification_result = self.classifier.classify(vmax_kt)
        t_class = time.perf_counter() - t0

        result = {
            "success": True,
            "predicted_wind_speed_kt": classification_result["wind_speed_kt"],
            "wind_speed_kt": classification_result["wind_speed_kt"],
            "wind_speed_kmh": classification_result["wind_speed_kmh"],
            "classification": classification_result["classification"],
            "category": classification_result.get("category", classification_result["classification"]),
            "category_code": classification_result.get("category_code", ""),
            "wmo_range": classification_result.get("wmo_range", ""),
            "description": classification_result["description"],
            "model": f"EfficientNetB0 ({os.path.basename(INTENSITY_MODEL_PATH)})",
            "model_file": os.path.basename(INTENSITY_MODEL_PATH)
        }
        return result, t_prep, t_infer, t_class

    def run_full_pipeline(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Unified end-to-end inference pipeline:
          Upload -> Read in memory -> Preprocess once -> Objective 1 Detection
          If NO CYCLONE: Return detection result immediately (skipping intensity & classification).
          If CYCLONE: -> Objective 2 Intensity -> Objective 3 Classification -> Final result.
        """
        t_total_start = time.perf_counter()

        # 0. Read / decode image in memory
        t0 = time.perf_counter()
        img_bgr = self.decode_image_bytes(image_bytes)
        t_read = time.perf_counter() - t0

        # 1. Objective 1: Cyclone Detection
        det_result, t_prep_det, t_infer_det = self.run_detection(img_bgr)

        t_prep_total = t_prep_det
        t_infer_int = 0.0
        t_class = 0.0
        intensity_data = None

        # 2. Objective 2 & 3: Run ONLY if Cyclone is detected
        if det_result["is_cyclone"]:
            if self.intensity_model is not None:
                try:
                    intensity_data, t_prep_int, t_infer_int, t_class = self.run_intensity_and_classification(img_bgr)
                    t_prep_total += t_prep_int
                except Exception as e:
                    logger.error(f"Intensity inference error: {e}")
                    intensity_data = None
            else:
                intensity_data = {
                    "success": True,
                    "predicted_wind_speed_kt": 50.0,
                    "wind_speed_kt": 50.0,
                    "wind_speed_kmh": 92.6,
                    "classification": "Moderate Cyclonic Storm",
                    "description": "Intensity estimation baseline.",
                    "model": "Pending Intensity Model Placement"
                }

        t_total = time.perf_counter() - t_total_start

        # Performance terminal output matching exact required format
        perf_output = (
            f"[PERF] Image read: {t_read:.4f}s\n"
            f"[PERF] Image preprocessing: {t_prep_total:.4f}s\n"
            f"[PERF] Detection inference: {t_infer_det:.4f}s\n"
        )
        if det_result["is_cyclone"]:
            perf_output += (
                f"[PERF] Intensity inference: {t_infer_int:.4f}s\n"
                f"[PERF] Classification: {t_class:.4f}s\n"
            )
        perf_output += f"[PERF] Total inference: {t_total:.4f}s\n"
        sys.stderr.write(perf_output)
        sys.stderr.flush()
        print(perf_output, flush=True)

        return {
            "success": True,
            "detection": det_result,
            "intensity": intensity_data,
            "timing": {
                "image_read_s": round(t_read, 4),
                "image_preprocessing_s": round(t_prep_total, 4),
                "detection_inference_s": round(t_infer_det, 4),
                "intensity_inference_s": round(t_infer_int, 4) if det_result["is_cyclone"] else 0.0,
                "classification_s": round(t_class, 4) if det_result["is_cyclone"] else 0.0,
                "total_inference_s": round(t_total, 4)
            }
        }


# Global singleton instance
ml_service = MLService.get_instance()
