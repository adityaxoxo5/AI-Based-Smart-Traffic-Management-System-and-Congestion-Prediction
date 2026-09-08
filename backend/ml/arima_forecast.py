import os
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime


DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "smart_mobility_dataset.csv"
)


def haversine(lat1, lon1, lat2, lon2):

    R = 6371

    dlat = radians(lat2-lat1)
    dlon = radians(lon2-lon1)

    a = (
        sin(dlat/2)**2 +
        cos(radians(lat1)) *
        cos(radians(lat2)) *
        sin(dlon/2)**2
    )

    return R * 2 * atan2(
        sqrt(a),
        sqrt(1-a)
    )


def load_dataset():

    df = pd.read_csv(DATA_PATH)

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"]
    )

    df["congestion_index"] = (
        df["Traffic_Condition"]
        .map({
            "Low":25,
            "Medium":55,
            "High":85
        })
    )


    return df



def generate_24h_arima_forecast(
        current_hour,
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
):

    df = load_dataset()


    # midpoint of route
    route_lat = (
        start_lat + dest_lat
    ) / 2

    route_lon = (
        start_lon + dest_lon
    ) / 2



    # Find nearby historical traffic
    df["distance"] = df.apply(
        lambda x:
        haversine(
            route_lat,
            route_lon,
            x["Latitude"],
            x["Longitude"]
        ),
        axis=1
    )


    nearby = df[
        df["distance"] <= 10
    ]



    # If no local sensors exist
    # use complete historical traffic behaviour

    if len(nearby) < 50:

        print(
        "[ARIMA] No local sensors. Using global traffic profile"
        )

        nearby = df



    # hourly aggregation

    nearby = nearby.sort_values(
        "Timestamp"
    )

    series = (
        nearby
        .set_index("Timestamp")
        ["congestion_index"]
        .resample("1h")
        .mean()
        .interpolate()
    )


    # Train ARIMA

    model = ARIMA(
        series,
        order=(2,1,1)
    )


    fitted = model.fit()



    forecast = fitted.get_forecast(
        steps=24
    )


    values = forecast.predicted_mean

    confidence = forecast.conf_int()



    result=[]


    for i,value in enumerate(values):

        value=float(
            np.clip(
                value,
                0,
                100
            )
        )


        result.append({

            "hour_label":
            values.index[i].strftime("%H:%M"),


            "arima_congestion_index":
            round(value,1),


            "upper_bound_95ci":
            round(
            float(
            confidence.iloc[i,1]
            ),
            1),


            "lower_bound_95ci":
            round(
            float(
            confidence.iloc[i,0]
            ),
            1),


            "traffic_tier":
            (
            "Severe"
            if value>75
            else
            "Moderate"
            if value>40
            else
            "Smooth"
            )

        })



    distance = haversine(
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
    )



    return {


        "model":
        "Location Adaptive ARIMA(2,1,1)",


        "route_distance_km":
        round(distance,2),


        "historical_records_used":
        int(len(nearby)),


        "forecast":
        result

    }