import os
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA


# ============================================================
# DATASET PATH
# ============================================================

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "smart_mobility_traffic.csv"
)


# ============================================================
# LOAD AND PREPARE HISTORICAL TRAFFIC DATA
# ============================================================

def load_traffic_data():
    """
    Load historical traffic data and convert the
    15-minute congestion observations into hourly averages.
    """

    df = pd.read_csv(
        DATA_PATH,
        usecols=["timestamp", "congestion_index"]
    )

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["congestion_index"] = pd.to_numeric(
        df["congestion_index"],
        errors="coerce"
    )

    # Remove invalid rows
    df = df.dropna(subset=["timestamp", "congestion_index"])

    # Sort chronologically
    df = df.sort_values("timestamp")

    # Make timestamp the index
    df = df.set_index("timestamp")

    # Convert 15-minute data → hourly average
    hourly_data = df["congestion_index"].resample("1h").mean()

    # Fill any missing hourly values
    hourly_data = hourly_data.interpolate(method="linear")

    # Keep values within traffic-index range
    hourly_data = hourly_data.clip(0, 100)

    return hourly_data


# ============================================================
# ARIMA FORECAST
# ============================================================

def generate_24h_arima_forecast(
    current_hour=12,
    start_lat=None,
    start_lon=None,
    dest_lat=None,
    dest_lon=None
):
    """
    Generate a 24-hour traffic congestion forecast
    using a real ARIMA(2,1,1) model trained on
    historical smart mobility traffic data.

    Coordinates are retained for API compatibility
    with the existing application.
    """

    try:

        # ----------------------------------------------------
        # 1. Load historical data
        # ----------------------------------------------------

        historical_data = load_traffic_data()

        if len(historical_data) < 30:
            raise ValueError(
                "Not enough historical traffic data for ARIMA forecasting."
            )

        # ----------------------------------------------------
        # 2. Fit REAL ARIMA(2,1,1)
        # ----------------------------------------------------

        model = ARIMA(
            historical_data,
            order=(2, 1, 1)
        )

        fitted_model = model.fit()

        # ----------------------------------------------------
        # 3. Forecast next 24 hours
        # ----------------------------------------------------

        forecast_result = fitted_model.get_forecast(steps=24)

        forecast_values = forecast_result.predicted_mean

        # Real 95% confidence interval
        confidence_interval = forecast_result.conf_int(alpha=0.05)

        # ----------------------------------------------------
        # 4. Build frontend-friendly response
        # ----------------------------------------------------

        forecast_data = []

        for i in range(24):

            timestamp = forecast_values.index[i]

            prediction = float(forecast_values.iloc[i])

            lower = float(confidence_interval.iloc[i, 0])
            upper = float(confidence_interval.iloc[i, 1])

            # Keep congestion index within 0–100
            prediction = float(np.clip(prediction, 0, 100))
            lower = float(np.clip(lower, 0, 100))
            upper = float(np.clip(upper, 0, 100))

            # Traffic classification
            if prediction > 75:
                traffic_tier = "Severe"
            elif prediction > 40:
                traffic_tier = "Moderate"
            else:
                traffic_tier = "Smooth"

            forecast_data.append({
                "hour_label": timestamp.strftime("%H:%M"),

                "arima_congestion_index": round(
                    prediction, 1
                ),

                "upper_bound_95ci": round(
                    upper, 1
                ),

                "lower_bound_95ci": round(
                    lower, 1
                ),

                "traffic_tier": traffic_tier
            })

        # ----------------------------------------------------
        # 5. Return result
        # ----------------------------------------------------

        return {
            "model": "ARIMA(2,1,1) Time-Series Forecast",
            "horizon": "24 Hours Ahead",
            "current_hour": forecast_values.index[0].strftime("%H:%M"),

            "historical_records": int(len(historical_data)),

            "training_start": historical_data.index[0].strftime(
                "%Y-%m-%d %H:%M"
            ),

            "training_end": historical_data.index[-1].strftime(
                "%Y-%m-%d %H:%M"
            ),

            "forecast": forecast_data
        }

    except Exception as e:

        print("ARIMA forecasting error:", str(e))

        return {
            "model": "ARIMA(2,1,1) Time-Series Forecast",
            "horizon": "24 Hours Ahead",
            "current_hour": f"{current_hour:02d}:00",
            "forecast": [],
            "error": str(e)
        }