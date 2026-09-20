"""
Unit and Integration Tests for Objective 3: Cyclone Classification
Tests rule-based classification logic, boundary transitions, nulls/missing values,
and API route handlers.
"""

import sys
import os
import unittest

# Ensure backend/app is on path
APP_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app'))
if APP_PATH not in sys.path:
    sys.path.insert(0, APP_PATH)

from services.classifier import CycloneClassifier

class TestCycloneClassifier(unittest.TestCase):
    def setUp(self):
        # Initialize with standard test thresholds: 34.0 kt and 64.0 kt
        self.classifier = CycloneClassifier(low_max=34.0, medium_max=64.0)

    def test_low_range_intensity(self):
        """Test low intensity classification (Vmax < LOW_MAX)."""
        result = self.classifier.classify(25.0)
        self.assertEqual(result["classification"], "LOW")
        self.assertEqual(result["wind_speed_kt"], 25.0)
        self.assertEqual(result["wind_speed_kmh"], 46.3)
        self.assertIn("Low-intensity", result["description"])

    def test_medium_range_intensity(self):
        """Test medium intensity classification (LOW_MAX <= Vmax < MEDIUM_MAX)."""
        result = self.classifier.classify(50.0)
        self.assertEqual(result["classification"], "MEDIUM")
        self.assertEqual(result["wind_speed_kt"], 50.0)
        self.assertEqual(result["wind_speed_kmh"], 92.6)
        self.assertIn("Moderate-intensity", result["description"])

    def test_severe_range_intensity(self):
        """Test severe intensity classification (Vmax >= MEDIUM_MAX)."""
        result = self.classifier.classify(84.8)
        self.assertEqual(result["classification"], "SEVERE")
        self.assertEqual(result["wind_speed_kt"], 84.8)
        self.assertEqual(result["wind_speed_kmh"], 157.0)
        self.assertIn("High-intensity", result["description"])

    def test_boundary_values(self):
        """Test exact boundary transitions."""
        # 1. Below LOW_MAX (33.9 kt) -> LOW
        res_below_low = self.classifier.classify(33.9)
        self.assertEqual(res_below_low["classification"], "LOW")

        # 2. Exactly at LOW_MAX (34.0 kt) -> MEDIUM (since LOW_MAX <= Vmax < MEDIUM_MAX)
        res_at_low = self.classifier.classify(34.0)
        self.assertEqual(res_at_low["classification"], "MEDIUM")

        # 3. Below MEDIUM_MAX (63.9 kt) -> MEDIUM
        res_below_med = self.classifier.classify(63.9)
        self.assertEqual(res_below_med["classification"], "MEDIUM")

        # 4. Exactly at MEDIUM_MAX (64.0 kt) -> SEVERE (since Vmax >= MEDIUM_MAX)
        res_at_med = self.classifier.classify(64.0)
        self.assertEqual(res_at_med["classification"], "SEVERE")

    def test_missing_and_null_intensity(self):
        """Test that None or empty input raises ValueError."""
        with self.assertRaises(ValueError):
            self.classifier.classify(None)

    def test_invalid_string_intensity(self):
        """Test that non-numeric input raises ValueError."""
        with self.assertRaises(ValueError):
            self.classifier.classify("invalid_vmax")

    def test_negative_intensity(self):
        """Test that negative wind speeds are rejected."""
        with self.assertRaises(ValueError):
            self.classifier.classify(-10.0)

    def test_custom_thresholds(self):
        """Test classifier initialized with custom thresholds (e.g. 40.0 kt and 70.0 kt)."""
        custom_clf = CycloneClassifier(low_max=40.0, medium_max=70.0)
        self.assertEqual(custom_clf.classify(39.9)["classification"], "LOW")
        self.assertEqual(custom_clf.classify(40.0)["classification"], "MEDIUM")
        self.assertEqual(custom_clf.classify(69.9)["classification"], "MEDIUM")
        self.assertEqual(custom_clf.classify(70.0)["classification"], "SEVERE")

    def test_invalid_threshold_order(self):
        """Test that low_max >= medium_max raises ValueError."""
        with self.assertRaises(ValueError):
            CycloneClassifier(low_max=60.0, medium_max=50.0)

class TestClassificationRouteLogic(unittest.TestCase):
    """
    Test API route handler behavior directly.
    """
    def setUp(self):
        try:
            from routes.classification import classify_intensity, ClassificationRequest
            from fastapi import HTTPException
            self.classify_intensity = classify_intensity
            self.ClassificationRequest = ClassificationRequest
            self.HTTPException = HTTPException
            self.fastapi_available = True
        except ImportError:
            self.fastapi_available = False

    def test_route_successful_classification(self):
        if not self.fastapi_available:
            self.skipTest("FastAPI not installed in current environment")
        req = self.ClassificationRequest(wind_speed_kt=84.8, is_cyclone=True)
        resp = self.classify_intensity(req)
        self.assertEqual(resp["wind_speed_kt"], 84.8)
        self.assertEqual(resp["wind_speed_kmh"], 157.0)
        self.assertEqual(resp["classification"], "SEVERE")

    def test_route_no_cyclone_guard(self):
        if not self.fastapi_available:
            self.skipTest("FastAPI not installed in current environment")
        req = self.ClassificationRequest(wind_speed_kt=84.8, is_cyclone=False)
        with self.assertRaises(self.HTTPException) as cm:
            self.classify_intensity(req)
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("no cyclone was detected", cm.exception.detail.lower())

    def test_route_missing_wind_speed(self):
        if not self.fastapi_available:
            self.skipTest("FastAPI not installed in current environment")
        req = self.ClassificationRequest(wind_speed_kt=None, is_cyclone=True)
        with self.assertRaises(self.HTTPException) as cm:
            self.classify_intensity(req)
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("required", cm.exception.detail.lower())

if __name__ == "__main__":
    unittest.main()
