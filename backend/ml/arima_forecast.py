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


# ---------------------------------------------------------
# Distance calculation
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Load traffic data
# ---------------------------------------------------------

def load_dataset():

    df = pd.read_csv(DATA_PATH)

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"]
    )


    # Continuous congestion calculation

    congestion = (

        0.45 *
        df["Road_Occupancy_%"]

        +

        0.35 *
        df["Vehicle_Count"]

        -

        0.20 *
        df["Traffic_Speed_kmh"]

    )


    # Normalize 0-100

    df["congestion_index"] = (

        (congestion - congestion.min())

        /

        (congestion.max()-congestion.min())

    ) * 100


    return df



# ---------------------------------------------------------
# Route based historical extraction
# ---------------------------------------------------------

def get_route_history(
        df,
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
):


    mid_lat = (
        start_lat + dest_lat
    ) / 2


    mid_lon = (
        start_lon + dest_lon
    ) / 2



    df["distance"] = df.apply(

        lambda row:

        haversine(
            mid_lat,
            mid_lon,
            row["Latitude"],
            row["Longitude"]
        ),

        axis=1
    )


    nearby = df[
        df["distance"] <= 10
    ]


    return nearby



# ---------------------------------------------------------
# Create route profile when no sensors exist
# ---------------------------------------------------------

def create_route_profile(
        distance_km,
        current_hour
):


    hours = pd.date_range(

        start=datetime.now()
        .replace(minute=0,second=0),

        periods=120,

        freq="h"

    )


    values=[]


    for t in hours:


        hour=t.hour


        # Peak traffic behaviour

        peak_factor = 0


        if 7 <= hour <= 10:
            peak_factor = 25


        elif 17 <= hour <= 21:
            peak_factor = 35



        # Distance effect

        distance_factor = min(
            distance_km*1.5,
            30
        )


        # Base urban congestion

        value = (

            30

            +

            peak_factor

            +

            distance_factor

        )


        noise = np.random.normal(
            0,
            5
        )


        values.append(
            np.clip(
                value+noise,
                0,
                100
            )
        )



    return pd.Series(
        values,
        index=hours
    )



# ---------------------------------------------------------
# ARIMA FORECAST
# ---------------------------------------------------------

def generate_24h_arima_forecast(
        current_hour,
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
):


    df = load_dataset()



    distance = haversine(
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
    )



    nearby = get_route_history(
        df,
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
    )



    if len(nearby) >= 50:


        print(
            "[ARIMA] Using nearby historical traffic"
        )


        series=(

            nearby
            .sort_values("Timestamp")
            .set_index("Timestamp")
            ["congestion_index"]
            .resample("1h")
            .mean()
            .interpolate()

        )


    else:


        print(
            "[ARIMA] No sensors nearby. Using route behaviour model"
        )


        series=create_route_profile(
            distance,
            current_hour
        )



    # ARIMA

    model=ARIMA(
        series,
        order=(2,1,1)
    )


    fitted=model.fit()



    forecast=fitted.get_forecast(
        steps=24
    )


    values=forecast.predicted_mean

    interval=forecast.conf_int()



    result=[]


    for i,val in enumerate(values):


        val=float(
            np.clip(
                val,
                0,
                100
            )
        )


        result.append({

            "hour_label":
            values.index[i]
            .strftime("%H:%M"),


            "arima_congestion_index":
            round(val,1),


            "upper_bound_95ci":
            round(
                float(interval.iloc[i,1]),
                1
            ),


            "lower_bound_95ci":
            round(
                float(interval.iloc[i,0]),
                1
            ),


            "traffic_tier":

            "Severe"
            if val>75

            else

            "Moderate"
            if val>40

            else

            "Smooth"

        })



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