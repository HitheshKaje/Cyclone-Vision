# 1. Update cloud_vision_service.py
path_cv = r"backend/app/services/cloud_vision_service.py"
with open(path_cv, "r", encoding="utf-8") as f:
    text_cv = f.read()

# Update Rule 1 in prompt
old_rule_1 = """            "CRITICAL DOMAIN CHECK (RULE 1):\\n"
            "First, strictly inspect whether this image is a genuine Earth meteorological weather satellite capture (e.g. INSAT-3D, GOES, NOAA, Himawari, Meteosat, weather radar scan, or meteorological map with coordinate grids).\\n"
            "- If the image is a chart, plot, graph, bar chart, line graph, diagram, table, spreadsheet, document, or presentation slide:\\n"
            "  -> You MUST set is_valid_satellite = false, is_cyclone = false, and validation_message = 'Chart, graph, or diagram detected (not a satellite image).'\\n" """

new_rule_1 = """            "CRITICAL DOMAIN CHECK (RULE 1):\\n"
            "First, inspect whether this image is a genuine Earth meteorological weather satellite capture (e.g. INSAT-3D, GOES, NOAA, Himawari, Meteosat, synoptic weather satellite maps, or satellite captures with coordinate grid lines / map projections).\\n"
            "- CRITICAL RULE FOR SATELLITE MAPS: Earth meteorological satellite observations frequently display latitude/longitude coordinate grid lines (e.g. 80°E, 82°E, 20°N, 18°N), coastal boundaries, or synoptic map overlays. These ARE 100% VALID Earth meteorological satellite observations! You MUST set is_valid_satellite = true.\\n"
            "- If the image is a non-meteorological business chart, financial bar/line graph, spreadsheet, table, document, or presentation slide:\\n"
            "  -> You MUST set is_valid_satellite = false, is_cyclone = false, and validation_message = 'Non-meteorological chart or document detected.'\\n" """

# Update non-satellite keyword check in detect_with_gemini
old_post_check = """            # Scan Gemini text fields for non-satellite keywords (catches when Gemini identified it as a chart, portrait, cup, or graphic in reasoning)
            combined_text = f"{parsed.get('reasoning', '')} {parsed.get('validation_message', '')} {parsed.get('features_observed', '')} {parsed.get('pattern_detected', '')}".lower()
            non_sat_indicators = [
                "not a meteorological", "not a satellite", "not satellite", "portrait", "person", "selfie", "human",
                "facial", "coffee cup", "tea cup", "cup rim", "cup handle", "tableware", "creative manipulation",
                "non-meteorological", "everyday object", "illustration", "whirlpool", "graphic", "drawing", "artwork",
                "not real-world meteorological", "does not contain real-world meteorological", "superimposed",
                "chart", "graph", "diagram", "table", "plot", "spreadsheet", "document", "lake", "pond", "park",
                "foliage", "landscape photo", "ground-level", "animal", "pet", "vehicle", "car", "room interior"
            ]
            if any(ind in combined_text for ind in non_sat_indicators):
                is_valid_sat = False
                val_msg = parsed.get("reasoning") or parsed.get("validation_message") or "Non-satellite image detected. CycloneVision only analyzes Earth meteorological satellite imagery." """

new_post_check = """            # Scan Gemini text fields for non-satellite keywords
            combined_text = f"{parsed.get('reasoning', '')} {parsed.get('validation_message', '')} {parsed.get('features_observed', '')} {parsed.get('pattern_detected', '')}".lower()

            # Check for authentic cyclone / meteorological system evidence (including coordinate grids)
            has_cyclone_evidence = bool(
                parsed.get("is_cyclone") or
                any(k in combined_text for k in [
                    "cyclone", "cyclonic", "vortex", "eye wall", "eye of the storm", "curved band",
                    "tropical storm", "tropical depression", "convective bands", "spiral bands",
                    "dvorak", "meteorological satellite", "satellite observation", "satellite imagery",
                    "satellite view", "coordinate grid", "lat/lon", "synoptic map", "weather satellite"
                ])
            )

            strict_non_sat_indicators = [
                "not a meteorological", "not a satellite", "not satellite", "portrait", "person", "selfie", "human",
                "facial", "coffee cup", "tea cup", "cup rim", "cup handle", "tableware", "creative manipulation",
                "non-meteorological everyday", "household object", "illustration", "whirlpool graphic",
                "drawing of a whirlpool", "cartoon", "meme", "not real-world meteorological",
                "does not contain real-world meteorological", "spreadsheet", "business presentation",
                "financial chart", "bar chart", "line graph", "lake photo", "pond foliage", "park foliage",
                "ground-level photo", "animal", "pet", "dog", "cat", "vehicle", "car photo", "room interior"
            ]

            is_everyday_non_sat = any(ind in combined_text for ind in strict_non_sat_indicators)

            if has_cyclone_evidence:
                # Authentic cyclone / satellite map observation - always valid
                is_valid_sat = True
                val_msg = parsed.get("validation_message") or "Valid Earth meteorological satellite observation."
            elif is_everyday_non_sat or parsed.get("is_valid_satellite") is False:
                is_valid_sat = False
                val_msg = parsed.get("reasoning") or parsed.get("validation_message") or "Non-satellite image detected. CycloneVision only analyzes Earth meteorological satellite imagery."
            else:
                is_valid_sat = True """

assert old_rule_1.strip() in text_cv, "old_rule_1 not found in cloud_vision_service.py"
assert old_post_check.strip() in text_cv, "old_post_check not found in cloud_vision_service.py"

text_cv = text_cv.replace(old_rule_1.strip(), new_rule_1.strip())
text_cv = text_cv.replace(old_post_check.strip(), new_post_check.strip())

with open(path_cv, "w", encoding="utf-8") as f:
    f.write(text_cv)
print("SUCCESS: cloud_vision_service.py updated!")

# 2. Update ml_service.py
path_ml = r"backend/app/services/ml_service.py"
with open(path_ml, "r", encoding="utf-8") as f:
    text_ml = f.read()

# Filter 1 update: don't reject satellite maps / intense cyclones with cloud_std > 10
old_filter_1 = """        # =========================================================================
        # FILTER 1: Charts, Plots, Graphs, Diagrams, Tables, White Canvas Documents
        # =========================================================================
        if pure_white_frac > 0.35:
            return False, "Chart, plot, or document detected (white canvas/background). CycloneVision only analyzes Earth meteorological satellite imagery." """

new_filter_1 = """        # =========================================================================
        # FILTER 1: Charts, Plots, Graphs, Diagrams, Tables, White Canvas Documents
        # =========================================================================
        if pure_white_frac > 0.35 and cloud_std < 10.0 and ocean_frac < 0.05:
            return False, "Chart, plot, or document detected (white canvas/background). CycloneVision only analyzes Earth meteorological satellite imagery." """

# Whitelist C update: allow coordinate grid lines with cloud/ocean texture
old_whitelist_c = """        # C. Meteorological Satellite Map with Lat/Lon Grid lines over clouds/ocean
        if line_count >= 4 and (cloud_frac > 0.05 or ocean_frac > 0.05):
            return True, "Valid Earth satellite domain (Meteorological map with coordinate grid)." """

new_whitelist_c = """        # C. Meteorological Satellite Map with Lat/Lon Grid lines over clouds/ocean
        if line_count >= 4 and (cloud_frac > 0.03 or ocean_frac > 0.03 or cloud_std > 10.0):
            return True, "Valid Earth satellite domain (Meteorological map with coordinate grid)." """

# General rejection update: exempt coordinate grid maps
old_general_rej = """        # =========================================================================
        # GENERAL REJECTION: Any other random everyday image
        # (pets, cars, indoor furniture, rooms, appliances, street photos)
        # =========================================================================
        if cloud_frac < 0.08 and ocean_frac < 0.05:
            return False, "Non-satellite image detected. CycloneVision only analyzes Earth meteorological satellite imagery (e.g. INSAT-3D, NOAA, GOES)." """

new_general_rej = """        # =========================================================================
        # GENERAL REJECTION: Any other random everyday image
        # (pets, cars, indoor furniture, rooms, appliances, street photos)
        # =========================================================================
        if line_count >= 4 and (cloud_frac > 0.03 or ocean_frac > 0.03 or cloud_std > 10.0):
            return True, "Valid Earth satellite domain (Meteorological map with coordinate grid)."

        if cloud_frac < 0.08 and ocean_frac < 0.05:
            return False, "Non-satellite image detected. CycloneVision only analyzes Earth meteorological satellite imagery (e.g. INSAT-3D, NOAA, GOES)." """

assert old_filter_1.strip() in text_ml, "old_filter_1 not found in ml_service.py"
assert old_whitelist_c.strip() in text_ml, "old_whitelist_c not found in ml_service.py"
assert old_general_rej.strip() in text_ml, "old_general_rej not found in ml_service.py"

text_ml = text_ml.replace(old_filter_1.strip(), new_filter_1.strip())
text_ml = text_ml.replace(old_whitelist_c.strip(), new_whitelist_c.strip())
text_ml = text_ml.replace(old_general_rej.strip(), new_general_rej.strip())

with open(path_ml, "w", encoding="utf-8") as f:
    f.write(text_ml)
print("SUCCESS: ml_service.py updated!")
