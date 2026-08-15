import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def get_data_filepath():
    """Returns absolute path to the dataset CSV file."""
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, 'smart_mobility_traffic.csv')

def generate_fallback_dataset(filepath, num_rows=10000, random_seed=42):
    """
    Generates a realistic urban traffic dataset if no Kaggle dataset is present.
    """
    print("[DATA] Kaggle CSV not found. Generating fallback traffic dataset...")
    np.random.seed(random_seed)
    
    start_date = datetime(2026, 6, 1, 0, 0, 0)
    timestamps = [start_date + timedelta(minutes=15 * i) for i in range(num_rows)]
    
    road_types = ['Highway', 'Arterial', 'Downtown', 'Residential']
    weathers = ['Clear', 'Rainy', 'Foggy', 'Heavy Rain']
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    data = []
    for ts in timestamps:
        hour = ts.hour
        day_name = days[ts.weekday()]
        is_weekend = 1 if ts.weekday() >= 5 else 0
        road = np.random.choice(road_types, p=[0.3, 0.3, 0.25, 0.15])
        weather = np.random.choice(weathers, p=[0.65, 0.20, 0.10, 0.05])
        
        speed_limits = {'Highway': 100, 'Arterial': 70, 'Downtown': 50, 'Residential': 30}
        speed_limit = speed_limits[road]
        
        temp = np.random.uniform(15.0, 35.0)
        humidity = np.random.uniform(40.0, 90.0)
        
        incident = np.random.choice([0, 1], p=[0.95, 0.05])
        is_peak = (8 <= hour <= 10 or 17 <= hour <= 19) and (is_weekend == 0)
        
        base_vol = 1400 if is_peak else (700 if 6 <= hour <= 22 else 200)
        cap_mult = {'Highway': 1.8, 'Arterial': 1.2, 'Downtown': 1.0, 'Residential': 0.5}
        volume = int(np.random.normal(base_vol * cap_mult[road], 120))
        volume = max(50, volume)
        base_cg = (volume / (2200 * cap_mult[road])) * 50
        w_penalty = {'Clear': 0, 'Rainy': 12, 'Foggy': 18, 'Heavy Rain': 28}[weather]
        p_penalty = 22 if is_peak else 0
        i_penalty = 35 if incident == 1 else 0
        
        raw_index = base_cg + w_penalty + p_penalty + i_penalty + np.random.normal(0, 3)
        congestion_index = round(float(np.clip(raw_index, 0.0, 100.0)), 2)
        
        data.append({
            'timestamp': ts.strftime('%Y-%m-%d %H:%M:%S'),
            'hour': hour,
            'day_of_week': day_name,
            'is_weekend': is_weekend,
            'road_type': road,
            'speed_limit': speed_limit,
            'weather': weather,
            'temperature': round(temp, 1),
            'humidity': round(humidity, 1),
            'incident_flag': incident,
            'vehicle_volume': volume,
            'congestion_index': congestion_index
        })
        
    df = pd.DataFrame(data)
    df.to_csv(filepath, index=False)
    print(f"[DATA] Generated dataset saved to: {filepath}")
    return df

def load_traffic_data():
    """
    Loads traffic dataset from CSV or generates fallback.
    """
    filepath = get_data_filepath()
    if not os.path.exists(filepath):
        df = generate_fallback_dataset(filepath)
    else:
        print(f"[DATA] Loading dataset from: {filepath}")
        df = pd.read_csv(filepath)
        
    print(f"\n[DATA SUMMARY]:")
    print(f"* Total Rows: {len(df)}")
    print(f"* Columns: {list(df.columns)}")
    print("\nDataset Preview:")
    print(df.head(3))
    return df

if __name__ == '__main__':
    load_traffic_data()