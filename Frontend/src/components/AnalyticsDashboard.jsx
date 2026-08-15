import React, { useState, useEffect } from 'react';
import { Award, Zap, Sliders, Car, ShieldAlert, Cpu, CheckCircle2, Brain, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = ({ startCoords, destCoords }) => {
  const [metrics, setMetrics] = useState(null);
  const [arimaData, setArimaData] = useState([]);
  
  // Interactive Sandbox Input States
  const [hour, setHour] = useState(8);
  const [volume, setVolume] = useState(1400);
  const [weather, setWeather] = useState('Clear');
  const [roadType, setRoadType] = useState('Downtown');
  const [incident, setIncident] = useState(0);
  const [modelType, setModelType] = useState('xgb'); // 'xgb' (ML) or 'dl' (Deep Neural Net)

  // Prediction Result State
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch model benchmarks on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/analytics')
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Error loading metrics:", err));
      
    // Run initial baseline prediction
    handleRunPrediction('xgb');
  }, []);

  // Fetch ARIMA forecast whenever route coordinates change
  useEffect(() => {
    const now = new Date().getHours();
    let arimaUrl = `http://127.0.0.1:8000/api/forecast/arima?hour=${now}`;
    if (startCoords && destCoords) {
      arimaUrl += `&start_lat=${startCoords.lat}&start_lon=${startCoords.lon}&dest_lat=${destCoords.lat}&dest_lon=${destCoords.lon}`;
    }
    fetch(arimaUrl)
      .then((res) => res.json())
      .then((data) => setArimaData(data.forecast || []))
      .catch((err) => console.error("ARIMA error:", err));
  }, [startCoords, destCoords]);

  const handleRunPrediction = async (selectedModel = modelType) => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hour: parseInt(hour),
          day_of_week: "Wednesday",
          is_weekend: 0,
          road_type: roadType,
          speed_limit: roadType === 'Highway' ? 100 : 50,
          weather: weather,
          temperature: 28.0,
          humidity: 65.0,
          incident_flag: incident,
          vehicle_volume: parseInt(volume),
          model_type: selectedModel
        })
      });
      const data = await response.json();
      setPredictionResult(data);
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const benchmarkData = metrics
    ? Object.keys(metrics.benchmarks).map((key) => ({
        name: key === 'DeepNeuralNetwork' ? 'MLP-DNN (DL)' : key,
        R2: metrics.benchmarks[key].R2_Score,
        MAE: metrics.benchmarks[key].MAE,
      }))
    : [];

  return (
    <div className="w-[420px] bg-[#0d121d]/95 backdrop-blur-md border-r border-slate-800 p-5 z-10 overflow-y-auto text-slate-200 space-y-6 select-none font-sans">
      
      {/* 1. Header Banner */}
      <div>
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold uppercase mb-1">
          <Cpu className="w-4 h-4" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Analytics & Prediction Sandbox</h2>
      </div>

      {/* 2. Interactive Prediction Sandbox */}
      <div className="bg-[#131a28] border border-slate-800 p-4 rounded-xl shadow-lg relative">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Interactive Model Simulator</span>
          </span>
        </div>

        {/* Model Architecture Switcher (ML vs DL) */}
        <div className="mb-4">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">
            Select Active Inference Engine:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setModelType('xgb');
                handleRunPrediction('xgb');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 border ${
                modelType === 'xgb'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-[#0d121d] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>XGBoost (ML)</span>
            </button>

            <button
              onClick={() => {
                setModelType('dl');
                handleRunPrediction('dl');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 border ${
                modelType === 'dl'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-[#0d121d] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>MLP-DNN (DL)</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Volume Slider */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono">
              <span className="flex items-center space-x-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Vehicle Volume:</span>
              </span>
              <span className="text-slate-200 font-bold">{volume} vehicles/hr</span>
            </div>
            <input
              type="range"
              min="100"
              max="2500"
              step="50"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hour Slider */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono">
              <span>Time of Day:</span>
              <span className="text-slate-200 font-bold">{hour}:00 hrs ({hour >= 8 && hour <= 10 || hour >= 17 && hour <= 19 ? 'Peak Hour' : 'Off-Peak'})</span>
            </div>
            <input
              type="range"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Weather & Road Dropdowns */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono">Weather Condition</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full bg-[#182132] border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="Clear">Clear Sky</option>
                <option value="Rainy">Light Rain</option>
                <option value="Foggy">Heavy Fog</option>
                <option value="Heavy Rain">Heavy Rainstorm</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono">Road Category</label>
              <select
                value={roadType}
                onChange={(e) => setRoadType(e.target.value)}
                className="w-full bg-[#182132] border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="Highway">Highway Expressway</option>
                <option value="Arterial">Arterial Road</option>
                <option value="Downtown">Downtown Junction</option>
                <option value="Residential">Residential Street</option>
              </select>
            </div>
          </div>

          {/* Incident Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Accident</span>
            </span>
            <button
              onClick={() => setIncident(incident === 1 ? 0 : 1)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                incident === 1
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {incident === 1 ? 'ACCIDENT ACTIVE' : 'NO ACCIDENT'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleRunPrediction(modelType)}
            disabled={loading}
            className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center space-x-2 text-xs uppercase cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{loading ? 'COMPUTING INFERENCE...' : `RUN ${modelType === 'dl' ? 'DEEP LEARNING' : 'ML'} PREDICTION`}</span>
          </button>
        </div>

        {/* Prediction Results Display */}
        {predictionResult && (
          <div className="mt-4 p-3.5 bg-[#0d121d] border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">
                {predictionResult.model_used || 'PREDICTED CONGESTION'}
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {predictionResult.congestion_index}%
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  ({predictionResult.status})
                </span>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
              predictionResult.congestion_index > 70
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : predictionResult.congestion_index > 45
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {predictionResult.status}
            </div>
          </div>
        )}
      </div>

      {/* 3. 24-Hour ARIMA Time-Series Forecast Chart */}
      {arimaData.length > 0 && (
        <div className="bg-[#131a28] p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-mono">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>ARIMA(2,1,1) 24-Hour Forecast</span>
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Statistical time-series trend prediction curve</p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={arimaData}>
                <XAxis dataKey="hour_label" stroke="#64748b" fontSize={8} interval={3} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0d121d', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="arima_congestion_index" name="ARIMA Forecast %" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Model Benchmark Accuracy Chart */}
      <div className="bg-[#131a28] p-4 rounded-xl border border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Algorithm Accuracy Benchmark</span>
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData} margin={{ bottom: 15 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={8} interval={0} angle={-12} textAnchor="end" />
              <YAxis domain={[0.9, 1.0]} stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0d121d', borderColor: '#334155' }} />
              <Bar dataKey="R2" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Model Comparison Cards */}
      <div className="bg-[#131a28] p-4 rounded-xl border border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-mono">
          MODEL PERFORMANCE SUMMARY
        </h3>
        <div className="space-y-2 text-xs">
          {benchmarkData.map((row) => (
            <div key={row.name} className="flex justify-between items-center p-2.5 bg-[#182132] rounded-lg border border-slate-800 font-mono">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                {row.name.includes(metrics?.best_model) && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                <span>{row.name}</span>
              </span>
              <span className="text-emerald-400">R²: {row.R2}</span>
              <span className="text-slate-400">MAE: {row.MAE}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AnalyticsDashboard;