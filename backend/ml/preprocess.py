import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from data_loader import load_traffic_data

NUMERICAL_FEATURES = [
    'hour', 'is_weekend', 'speed_limit', 
    'temperature', 'humidity', 'incident_flag', 'vehicle_volume'
]
CATEGORICAL_FEATURES = ['day_of_week', 'road_type', 'weather']
TARGET_COLUMN = 'congestion_index'

def build_preprocessor():
    """Creates scikit-learn ColumnTransformer pipeline."""
    numeric_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, NUMERICAL_FEATURES),
            ('cat', categorical_transformer, CATEGORICAL_FEATURES)
        ]
    )
    return preprocessor

def prepare_data(test_size=0.2, random_state=42):
    """
    Loads raw dataset, fits preprocessor, splits Train/Test, and saves artifacts.
    """
    df = load_traffic_data()
    
    X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET_COLUMN]
    
    # Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    
    # Fit Preprocessor on Training Data
    preprocessor = build_preprocessor()
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)
    
    # Get feature names after one-hot encoding
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_cols = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    feature_names = NUMERICAL_FEATURES + encoded_cat_cols
    
    # Save preprocessor artifact
    artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    joblib.dump(preprocessor, os.path.join(artifacts_dir, 'preprocessor.pkl'))
    joblib.dump(feature_names, os.path.join(artifacts_dir, 'feature_names.pkl'))
    
    print("\n[PREPROCESS] Data Preprocessing Complete!")
    print(f"* X_train shape: {X_train_scaled.shape}")
    print(f"* X_test shape:  {X_test_scaled.shape}")
    print(f"* Preprocessor saved at: {os.path.join(artifacts_dir, 'preprocessor.pkl')}")
    
    return X_train_scaled, X_test_scaled, y_train, y_test, feature_names

if __name__ == '__main__':
    prepare_data()