import os
import joblib
import pandas as pd
import numpy as np

class TrafficPredictor:
    def __init__(self):
        artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
        model_path = os.path.join(artifacts_dir, 'best_model.pkl')
        dl_path = os.path.join(artifacts_dir, 'dl_model.pkl')
        prep_path = os.path.join(artifacts_dir, 'preprocessor.pkl')

        if not os.path.exists(model_path) or not os.path.exists(prep_path):
            raise FileNotFoundError("ML Model artifacts missing! Run train_models.py first.")

        self.model = joblib.load(model_path)
        self.preprocessor = joblib.load(prep_path)
        if os.path.exists(dl_path):
            self.dl_model = joblib.load(dl_path)
        else:
            self.dl_model = None
        # Load LightGBM model if present
        lgb_path = os.path.join(artifacts_dir, 'lgb_best.pkl')
        self.lgb_model = joblib.load(lgb_path) if os.path.exists(lgb_path) else None
        # Load RandomForest model if present
        rf_path = os.path.join(artifacts_dir, 'rf_best.pkl')
        self.rf_model = joblib.load(rf_path) if os.path.exists(rf_path) else None
        print("[ML/Ensemble] LightGBM and RandomForest models loaded (if present).")
        print("[ML/DL] TrafficPredictor loaded trained XGBoost & Deep Neural Network models successfully!")

    def predict(self, hour, day_of_week, is_weekend, road_type, speed_limit, weather, temp, humidity, incident, volume, model_type="xgb"):
        """
        Takes raw feature inputs, scales/encodes them, and predicts Congestion Index (0-100) using ML or Deep Neural Network.
        """
        input_data = pd.DataFrame([{
            'hour': int(hour),
            'day_of_week': str(day_of_week),
            'is_weekend': int(is_weekend),
            'road_type': str(road_type),
            'speed_limit': int(speed_limit),
            'weather': str(weather),
            'temperature': float(temp),
            'humidity': float(humidity),
            'incident_flag': int(incident),
            'vehicle_volume': int(volume)
        }])

        # Transform inputs
        X_scaled = self.preprocessor.transform(input_data)
        
        # Select target model based on model_type
        if model_type == "dl" and self.dl_model is not None:
            target_model = self.dl_model
            model_label = "Multi-Layer Perceptron DNN (MLP-DNN)"
        elif model_type == "lgb" and self.lgb_model is not None:
            target_model = self.lgb_model
            model_label = "LightGBM (ML)"
        elif model_type == "rf" and self.rf_model is not None:
            target_model = self.rf_model
            model_label = "Random Forest (ML)"
        else:
            target_model = self.model
            model_label = "XGBoost (ML)"

        prediction = target_model.predict(X_scaled)[0]
        
        # Clip score between 0.0 and 100.0
        congestion_score = round(float(np.clip(prediction, 0.0, 100.0)), 1)

        # Categorical Tier
        if congestion_score < 30.0:
            status = 'Smooth'
        elif congestion_score < 60.0:
            status = 'Moderate'
        elif congestion_score < 80.0:
            status = 'Heavy Traffic'
        else:
            status = 'Severe Congestion'

        return {
            'congestion_index': congestion_score,
            'status': status,
            'model_used': model_label
        }

# Global singleton predictor instance
predictor = TrafficPredictor()