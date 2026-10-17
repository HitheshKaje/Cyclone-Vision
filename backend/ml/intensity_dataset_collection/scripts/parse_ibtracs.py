"""
Module for parsing IBTrACS CSV dataset and generating candidate cyclone observation targets
for Objective 2: Tropical Cyclone Intensity Estimation.
"""
import os
import csv
from typing import List, Dict, Any

def parse_ibtracs_file(csv_path: str, min_year: int = 2000) -> List[Dict[str, Any]]:
    """
    Parses an IBTrACS CSV file and extracts observations that have verified wind speeds
    during the modern satellite era (min_year onwards).
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"IBTrACS file not found: {csv_path}")

    candidates = []
    
    with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        header1 = next(reader)
        header2 = next(reader)
        
        # Build column index lookup
        col_idx = {col.strip(): i for i, col in enumerate(header1)}
        
        for row in reader:
            if len(row) < 15:
                continue
                
            season_str = row[col_idx.get('SEASON', 1)].strip()
            if not season_str.isdigit() or int(season_str) < min_year:
                continue
                
            sid = row[col_idx.get('SID', 0)].strip()
            name = row[col_idx.get('NAME', 5)].strip()
            basin = row[col_idx.get('BASIN', 3)].strip()
            iso_time = row[col_idx.get('ISO_TIME', 6)].strip()
            lat_str = row[col_idx.get('LAT', 8)].strip()
            lon_str = row[col_idx.get('LON', 9)].strip()
            
            if not lat_str or not lon_str or lat_str == ' ' or lon_str == ' ':
                continue
                
            try:
                lat = float(lat_str)
                lon = float(lon_str)
            except ValueError:
                continue
                
            # Determine wind speed and source agency
            wind_speed = None
            agency = None
            source_field = None
            
            # 1. Check New Delhi (IMD) for North Indian Ocean
            nd_wind_idx = col_idx.get('NEWDELHI_WIND')
            if nd_wind_idx is not None and nd_wind_idx < len(row):
                val = row[nd_wind_idx].strip()
                if val and val.replace('.', '', 1).isdigit() and float(val) > 0:
                    wind_speed = float(val)
                    agency = "IMD (India Meteorological Department)"
                    source_field = "NEWDELHI_WIND"
                    
            # 2. Check WMO standardized wind
            if wind_speed is None:
                wmo_idx = col_idx.get('WMO_WIND')
                if wmo_idx is not None and wmo_idx < len(row):
                    val = row[wmo_idx].strip()
                    if val and val.replace('.', '', 1).isdigit() and float(val) > 0:
                        wind_speed = float(val)
                        agency = "WMO Standard"
                        source_field = "WMO_WIND"
                        
            # 3. Check USA (JTWC / NHC)
            if wind_speed is None:
                usa_idx = col_idx.get('USA_WIND')
                if usa_idx is not None and usa_idx < len(row):
                    val = row[usa_idx].strip()
                    if val and val.replace('.', '', 1).isdigit() and float(val) > 0:
                        wind_speed = float(val)
                        agency = "JTWC/NHC"
                        source_field = "USA_WIND"
                        
            # If no verified wind speed available, skip according to strict guidelines
            if wind_speed is None:
                continue
                
            candidates.append({
                "storm_id": sid,
                "name": name if name else "UNNAMED",
                "basin": basin,
                "iso_time": iso_time,
                "lat": lat,
                "lon": lon,
                "wind_speed_knots": wind_speed,
                "label_agency": agency,
                "label_source": source_field
            })
            
    return candidates

if __name__ == "__main__":
    test_path = r"D:\Dowloads\ibtracs.NI.list.v04r01.csv"
    if os.path.exists(test_path):
        res = parse_ibtracs_file(test_path, min_year=2000)
        print(f"Extracted {len(res):,} verified observation candidates from {test_path}")
        if res:
            print("Sample record:", res[0])
