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
from typing import Dict, Any, Optional, Tuple

from services.classifier import get_cyclone_classifier, CycloneClassifier

logger = logging.getLogger("uvicorn.error")

# Target image size for both models
TARGET_SIZE = (224, 224)

# Paths relative to backend root
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DETECTION_MODEL_PATH = os.path.join(BACKEND_DIR, "models", "cyclone_detector.keras")
INTENSITY_MODEL_PATH = os.path.join(BACKEND_DIR, "models", "cyclone_intensity.keras")
CLASS_NAMES_PATH = os.path.join(BACKEND_DIR, "models", "class_names.json")


class MLService:
    _instance: Optional["MLService"] = None

    def __init__(self):
        self.detection_model: Optional[tf.keras.Model] = None
        self.intensity_model: Optional[tf.keras.Model] = None
        self.class_names: list = ["No_Cyclone", "Cyclone"]
        self.classifier: CycloneClassifier = get_cyclone_classifier()
        self.is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "MLService":
        if cls._instance is None:
            cls._instance = MLService()
        return cls._instance

    def load_all_models(self) -> None:
        """
        Load all models and pre-warm them once at application startup.
        """
        if self.is_loaded:
            logger.info("MLService models are already loaded in memory.")
            return

        logger.info("==================================================")
        logger.info("Initializing CycloneVision ML Inference Pipeline...")
        logger.info("==================================================")
        t_start = time.perf_counter()

        # 1. Load Detection Model (Objective 1)
        if not os.path.exists(DETECTION_MODEL_PATH):
            raise FileNotFoundError(f"Detection model not found at: {DETECTION_MODEL_PATH}")
        t0 = time.perf_counter()
        logger.info(f"Loading Objective 1 Detection Model: {DETECTION_MODEL_PATH}...")
        self.detection_model = tf.keras.models.load_model(DETECTION_MODEL_PATH)
        t_det = time.perf_counter() - t0
        logger.info(f"-> Detection model loaded in {t_det:.2f}s")

        # 2. Load Intensity Model (Objective 2)
        if not os.path.exists(INTENSITY_MODEL_PATH):
            raise FileNotFoundError(f"Intensity model not found at: {INTENSITY_MODEL_PATH}")
        t0 = time.perf_counter()
        logger.info(f"Loading Objective 2 Intensity Model: {INTENSITY_MODEL_PATH}...")
        self.intensity_model = tf.keras.models.load_model(INTENSITY_MODEL_PATH)
        t_int = time.perf_counter() - t0
        logger.info(f"-> Intensity model loaded in {t_int:.2f}s")

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
        t0 = time.perf_counter()
        logger.info("Pre-warming models to eliminate cold-start inference latency...")
        dummy_input = np.zeros((1, TARGET_SIZE[0], TARGET_SIZE[1], 3), dtype=np.float32)
        _ = self.detection_model.predict(dummy_input, verbose=0)
        _ = self.intensity_model.predict(dummy_input, verbose=0)
        t_warmup = time.perf_counter() - t0
        logger.info(f"-> Computational graphs pre-warmed in {t_warmup:.2f}s")

        total_init_time = time.perf_counter() - t_start
        self.is_loaded = True
        logger.info("==================================================")
        logger.info(f"All ML models successfully initialized in {total_init_time:.2f}s!")
        logger.info("Models are permanently cached in memory for zero-delay inference.")
        logger.info("==================================================")

    def decode_image_bytes(self, image_bytes: bytes) -> np.ndarray:
        """
        Decodes raw image bytes directly into a BGR numpy array using OpenCV in memory.
        Completely avoids writing temporary files to disk.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from buffer. Please ensure the file is a valid image.")
        return img

    def preprocess_detection_image(self, img_bgr: np.ndarray) -> np.ndarray:
        """
        Objective 1 Preprocessing:
        Resizes to (224, 224) and converts from BGR to RGB.
        Returns shape: (1, 224, 224, 3)
        """
        resized = cv2.resize(img_bgr, TARGET_SIZE)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        return np.expand_dims(rgb, axis=0)

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

    def run_detection(self, img_bgr: np.ndarray) -> Tuple[Dict[str, Any], float, float]:
        """
        Run Objective 1 Cyclone Detection with performance timing.
        Returns:
            (result_dict, preprocess_duration, inference_duration)
        """
        if self.detection_model is None:
            self.load_all_models()

        # Measure preprocessing
        t0 = time.perf_counter()
        batch = self.preprocess_detection_image(img_bgr)
        t_prep = time.perf_counter() - t0

        # Measure inference
        t0 = time.perf_counter()
        prob_arr = self.detection_model.predict(batch, verbose=0)
        prob = float(prob_arr[0][0])
        t_infer = time.perf_counter() - t0

        is_cyclone = bool(prob > 0.5)
        confidence = float(prob if is_cyclone else (1.0 - prob))
        prediction = "Cyclone" if is_cyclone else "No Cyclone"

        result = {
            "success": True,
            "prediction": prediction,
            "is_cyclone": is_cyclone,
            "confidence": confidence,
            "confidence_percent": round(confidence * 100, 2),
            "model": "EfficientNetB0"
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

        # Measure preprocessing
        t0 = time.perf_counter()
        batch = self.preprocess_intensity_image(img_bgr)
        t_prep = time.perf_counter() - t0

        # Measure inference
        t0 = time.perf_counter()
        raw_pred = float(self.intensity_model.predict(batch, verbose=0)[0][0])
        t_infer = time.perf_counter() - t0

        # Measure classification (Objective 3)
        t0 = time.perf_counter()
        classification_result = self.classifier.classify(raw_pred)
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
            int_result, t_prep_int, t_infer_int, t_class = self.run_intensity_and_classification(img_bgr)
            t_prep_total += t_prep_int
            intensity_data = int_result

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
