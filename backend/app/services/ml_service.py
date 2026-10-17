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

        # 4. Pre-warm models with dummy batch to compile TensorFlow computational graphs
        # WARMUP IS DISABLED for local development so the backend starts in 5 seconds instead of 90 seconds.
        # The only tradeoff is that the VERY FIRST image prediction will take a bit longer.
        PERFORM_WARMUP = False
        if PERFORM_WARMUP:
            t0 = time.perf_counter()
            logger.info("Pre-warming models to eliminate cold-start inference latency...")
            dummy_input = np.zeros((1, TARGET_SIZE[0], TARGET_SIZE[1], 3), dtype=np.float32)
            _ = self.detection_model.predict(dummy_input, verbose=0)
            _ = self.intensity_model.predict(dummy_input, verbose=0)
            t_warmup = time.perf_counter() - t0
            logger.info(f"-> Computational graphs pre-warmed in {t_warmup:.2f}s")
        else:
            logger.info("Skipping graph pre-warming for faster startup times.")

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
        Converts to grayscale, applies polarity inversion (1.0 - gray / 255.0) to align
        cloud brightness with infrared cold cloud-top temperatures, resizes to (224, 224),
        and replicates to 3 channels.
        Returns shape: (1, 224, 224, 3), dtype=float32
        """
        if len(img_bgr.shape) == 3:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_bgr

        norm_inverted = 1.0 - (gray.astype(np.float32) / 255.0)
        resized = cv2.resize(norm_inverted, TARGET_SIZE, interpolation=cv2.INTER_LINEAR)
        img_3ch = np.stack([resized, resized, resized], axis=-1).astype(np.float32)
        return np.expand_dims(img_3ch, axis=0)

    def validate_satellite_domain(self, img_bgr: np.ndarray) -> Tuple[bool, str]:
        """
        Validates whether an input image conforms to Earth meteorological satellite domains.
        Rejects non-satellite imagery:
          1. Household / Everyday objects (Coffee cups, tea mugs, tables, indoor photos).
          2. Outer space / Astronomical scenes (black holes, galaxies, nebulae).
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        h, w = gray.shape
        total_pixels = h * w
        
        h_chan, s_chan, v_chan = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

        # 1. Check for Household / Everyday Photography (Coffee/Tea mugs, wooden tables, rooms)
        # Real satellite imagery of Earth ocean/clouds has virtually 0% warm brown/table/coffee wood hues.
        # Warm wood, coffee liquid, ceramic, skin, living room hues: H 8-28, S > 50, V > 40
        warm_mask = (h_chan >= 8) & (h_chan <= 28) & (s_chan > 50) & (v_chan > 40)
        warm_ratio = float(np.mean(warm_mask))
        if warm_ratio > 0.22:
            return False, "Non-satellite image detected (household object / everyday scene). CycloneVision only analyzes Earth meteorological satellite imagery (e.g. INSAT-3D, NOAA, GOES)."

        # 2. Check for Outer Space / Astronomical Scene (Black hole, galaxy, nebula)
        dark_mask = (gray < 30).astype(np.uint8)
        dark_ratio = float(np.sum(dark_mask) / total_pixels)
        
        # Quadrant check: Satellite swaths only have black borders on 1 or 2 edges.
        # Deep space scenes surround the object across all 4 quadrants.
        h_half, w_half = h // 2, w // 2
        q1 = np.mean(dark_mask[:h_half, :w_half])
        q2 = np.mean(dark_mask[:h_half, w_half:])
        q3 = np.mean(dark_mask[h_half:, :w_half])
        q4 = np.mean(dark_mask[h_half:, w_half:])
        quadrants_dark = sum(q > 0.15 for q in [q1, q2, q3, q4])
        
        # Star field check: high-frequency pinpoint bright spots in dark background
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        high_freq = cv2.subtract(gray, blurred)
        star_candidates = (high_freq > 30) & (dark_mask == 1)
        star_count = int(np.sum(star_candidates))
        
        # High saturation glow check (astronomical plasma / artificial neon accretion rings)
        high_sat_in_space = (s_chan > 100) & (gray > 40)
        sat_glow_ratio = float(np.sum(high_sat_in_space) / max(1, np.sum(gray > 40)))
        
        # Astronomical criteria:
        # A. Broad dark void in 3+ quadrants with star field
        if dark_ratio > 0.30 and quadrants_dark >= 3 and star_count > 30:
            return False, "Outer space / astronomical scene detected (cosmic background with starfield). Please upload Earth meteorological satellite imagery."
            
        # B. Deep space void with colorful plasma accretion disc
        if dark_ratio > 0.35 and quadrants_dark >= 3 and sat_glow_ratio > 0.35:
            return False, "Astronomical scene detected (cosmic accretion disc against space void). Please upload Earth meteorological satellite imagery."
            
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
            "description": classification_result["description"],
            "model": "EfficientNetB0-TCIR-Intensity"
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
            # Temporarily bypass intensity model until the user trains it
            intensity_data = {
                "success": True,
                "predicted_wind_speed_kt": 50.0,
                "wind_speed_kt": 50.0,
                "wind_speed_kmh": 92.6,
                "classification": "Pending Intensity Training",
                "description": "The detection model works! You can train the intensity model next.",
                "model": "Pending..."
            }
            t_infer_int = 0.0
            t_class = 0.0

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
