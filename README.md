# Smart Traffic Management System

An AI/ML-powered traffic management platform combining real-time congestion prediction, accident hotspot clustering, dynamic route optimization, time-series traffic forecasting, an LLM-powered traffic assistant, and emergency vehicle dispatch — all served through a FastAPI backend with a React frontend.

## Features

- **Congestion Prediction** — Predicts a 0–100 congestion index from live inputs (hour, weather, road type, incidents, etc.) using benchmarked ML/DL models (XGBoost, Random Forest, LightGBM, and a Deep Neural Network), automatically selecting the best performer.
- **Accident Hotspot Clustering** — Uses DBSCAN spatial clustering along a route to identify and rank accident-prone zones, with real street/area names via OpenStreetMap reverse geocoding.
- **Route Optimization** — Computes congestion-weighted shortest paths between two coordinates using a custom Dijkstra implementation over a dynamically generated road-arc graph.
- **24-Hour Traffic Forecasting** — Generates an ARIMA(2,1,1)-based congestion forecast for the next 24 hours, adjusted for route distance and geographic zone.
- **AI Traffic Copilot** — A conversational assistant (Google Gemini) that answers traffic, weather, and prediction queries in natural language, backed by live weather (wttr.in) and live model predictions.
- **Emergency Dispatch** — Finds and dispatches the nearest hospital, fire station, or police unit to an incident location using live OpenStreetMap facility data, with ETA estimation.
- **Geocoding** — Resolves place names to coordinates, with a built-in database for common Hyderabad/India locations and a live fallback via Open-Meteo's geocoding API.

## Tech Stack

**Backend:** FastAPI, Python, scikit-learn, XGBoost, LightGBM, joblib, NumPy, Pandas
**Frontend:** React (JSX)
**External APIs:** Google Gemini (GenAI), OpenStreetMap / Nominatim, Open-Meteo Geocoding, wttr.in

## Project Structure

```
.
├── backend/
│   ├── main.py                  # FastAPI app & all API routes
│   └── ml/
│       ├── data_loader.py       # Loads or generates the traffic dataset
│       ├── preprocess.py        # Builds & fits the sklearn preprocessing pipeline
│       ├── train_models.py      # Trains & benchmarks RF / XGBoost / LightGBM / DNN
│       ├── predictor.py         # Loads trained model & serves predictions
│       ├── cluster_hotspots.py  # DBSCAN accident hotspot clustering
│       ├── dijkstra_routing.py  # Congestion-weighted Dijkstra routing
│       ├── arima_forecast.py    # 24h ARIMA-based congestion forecast
│       ├── artifacts/           # Trained models & metrics (generated, gitignored)
│       └── data/                # Dataset CSV (generated, gitignored)
└── frontend/
    └── src/
        └── components/
            ├── AITrafficAssistant.jsx
            ├── AnalyticsDashboard.jsx
            └── EmergencyDispatch.jsx
```

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Train the ML models (only needed once, or whenever the dataset changes):

```bash
cd ml
python train_models.py
```

This generates `artifacts/best_model.pkl`, `artifacts/dl_model.pkl`, `artifacts/preprocessor.pkl`, and `artifacts/metrics.json`.

Run the API server:

```bash
cd backend
python main.py
```

The API will be available at `http://127.0.0.1:8000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/geocode` | Resolve a place name to coordinates |
| POST | `/api/predict` | Predict congestion index for given conditions |
| GET | `/api/analytics` | Retrieve model benchmark metrics |
| GET / POST | `/api/hotspots` | Get accident hotspot clusters along a route |
| POST | `/api/routing/dijkstra` | Compute the optimal congestion-weighted route |
| GET | `/api/forecast/arima` | Get a 24-hour congestion forecast |
| POST | `/api/assistant/chat` | Chat with the AI traffic assistant |
| POST | `/api/emergency/dispatch` | Dispatch the nearest emergency unit to an incident |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key, used by `/api/assistant/chat`. Without it, the assistant falls back to canned responses. |

## Notes

- If `backend/ml/artifacts/` is not present, run `python train_models.py` first — `predictor.py` will raise `FileNotFoundError` on startup otherwise.
- If `backend/ml/data/` has no dataset, `data_loader.py` automatically generates a realistic synthetic fallback dataset.
- OpenStreetMap/Nominatim requests are rate-limited (~1 req/sec) — avoid high-frequency polling of `/api/hotspots` or `/api/emergency/dispatch` in production.
