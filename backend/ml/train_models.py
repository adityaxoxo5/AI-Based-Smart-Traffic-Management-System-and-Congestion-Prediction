import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

from preprocess import prepare_data

def evaluate_model(model, X_test, y_test):
    """Calculates MAE, RMSE, and R2 metrics for a trained model."""
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    return round(float(mae), 4), round(float(rmse), 4), round(float(r2), 4)

def train_and_benchmark():
    """Trains RF, XGBoost, LightGBM, and Deep Neural Network, benchmarks performance, and saves best model."""
    print("[ML/DL] Starting Model Training & Benchmarking Engine...\n")
    X_train, X_test, y_train, y_test, feature_names = prepare_data()
    
    models = {
        'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'XGBoost': XGBRegressor(n_estimators=100, learning_rate=0.08, random_state=42, n_jobs=-1),
        'LightGBM': LGBMRegressor(n_estimators=100, learning_rate=0.08, random_state=42, verbose=-1),
        'DeepNeuralNetwork': MLPRegressor(hidden_layer_sizes=(128, 64, 32), activation='relu', max_iter=300, random_state=42)
    }
    
    results = {}
    best_model_name = None
    best_r2 = -float('inf')
    best_model_obj = None

    print("-" * 65)
    print(f"{'MODEL NAME':<18} | {'MAE':<10} | {'RMSE':<10} | {'R2 SCORE':<10}")
    print("-" * 65)

    for name, model in models.items():
        # Fit Model
        model.fit(X_train, y_train)
        
        # Evaluate
        mae, rmse, r2 = evaluate_model(model, X_test, y_test)
        results[name] = {'MAE': mae, 'RMSE': rmse, 'R2_Score': r2}
        
        print(f"{name:<18} | {mae:<10} | {rmse:<10} | {r2:<10}")
        
        # Check if winner
        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            best_model_obj = model

    print("-" * 65)
    print(f"\n[WINNER] WINNING MODEL: {best_model_name} with R2 Score of {best_r2}!")

    # Save Best Model & Metrics Report
    artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    
    model_save_path = os.path.join(artifacts_dir, 'best_model.pkl')
    metrics_save_path = os.path.join(artifacts_dir, 'metrics.json')
    
    joblib.dump(best_model_obj, model_save_path)
    joblib.dump(models['DeepNeuralNetwork'], os.path.join(artifacts_dir, 'dl_model.pkl'))
    
    report = {
        'best_model': best_model_name,
        'benchmarks': results
    }
    with open(metrics_save_path, 'w') as f:
        json.dump(report, f, indent=4)

    print(f"[SAVED] Best model saved at: {model_save_path}")
    print(f"[SAVED] Benchmark report saved at: {metrics_save_path}")

if __name__ == '__main__':
    train_and_benchmark()