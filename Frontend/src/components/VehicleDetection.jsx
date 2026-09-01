
import React, { useState, useEffect } from 'react';
import { Camera, TrendingUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function VehicleDetection() {
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-trigger processing when tab opens
  useEffect(() => {
    runDetection();
  }, []);

  const runDetection = async () => {
    setStatus('processing');
    setResult(null);
    setErrorMsg('');

    try {
      // FIXED: normal URL, not Markdown-formatted URL
      const res = await fetch(
        'http://127.0.0.1:8000/api/detect/preloaded'
      );

      if (!res.ok) {
        let errorMessage = 'Processing failed';

        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch {
          errorMessage = `Server error: ${res.status}`;
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();

      setResult(data);
      setStatus('done');

    } catch (err) {
      console.error('Vehicle detection error:', err);
      setErrorMsg(err.message || 'Unable to connect to backend');
      setStatus('error');
    }
  };

  const vehicleTypes = result
    ? [
        {
          label: 'Cars',
          icon: '🚗',
          count: result.vehicle_counts?.car ?? 0,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
        },
        {
          label: 'Motorcycles',
          icon: '🏍️',
          count: result.vehicle_counts?.motorcycle ?? 0,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
        },
        {
          label: 'Buses',
          icon: '🚌',
          count: result.vehicle_counts?.bus ?? 0,
          color: 'text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/20',
        },
        {
          label: 'Trucks',
          icon: '🚛',
          count: result.vehicle_counts?.truck ?? 0,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
        },
      ]
    : [];

  return (
    <div className="flex-1 h-full bg-[#0d121d] text-slate-200 flex overflow-hidden font-sans">

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="w-[360px] bg-[#0d121d] border-r border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto select-none">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
            <Camera className="w-5 h-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Vehicle Detection
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>

            <p className="text-[10px] text-slate-400">
              YOLOv8 Neural Network · Real-time Analysis
            </p>
          </div>
        </div>

        {/* Processing State */}
        {status === 'processing' && (
          <div className="bg-[#141b29] border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0 mt-0.5" />

            <div>
              <p className="text-sm font-semibold text-amber-400">
                Analyzing Traffic Video...
              </p>

              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                YOLOv8 is scanning every frame and detecting vehicles.
                This takes 30–60 seconds for the first run.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-3">

            <div className="bg-[#141b29] border border-rose-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />

              <div>
                <p className="text-sm font-semibold text-rose-400">
                  Processing Failed
                </p>

                <p className="text-[11px] text-slate-400 mt-1">
                  {errorMsg}
                </p>
              </div>
            </div>

            <button
              onClick={runDetection}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Retry Detection
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <>
            {/* Success Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />

              <span className="text-[11px] text-emerald-300 font-medium">
                Analysis complete · {result.duration_sec}s video ·{' '}
                {result.total_frames} frames scanned
              </span>
            </div>

            {/* Vehicle Count Cards */}
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2.5 tracking-wider">
                Peak Vehicles Detected
              </p>

              <div className="grid grid-cols-2 gap-2">
                {vehicleTypes.map((v) => (
                  <div
                    key={v.label}
                    className={`${v.bg} border rounded-xl p-3.5 flex items-center gap-3`}
                  >
                    <span className="text-2xl">
                      {v.icon}
                    </span>

                    <div>
                      <p className={`text-2xl font-bold ${v.color}`}>
                        {v.count}
                      </p>

                      <p className="text-[10px] text-slate-400">
                        {v.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Vehicles */}
            <div className="bg-[#141b29] border border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                  Total Vehicles
                </p>

                <p className="text-3xl font-bold text-slate-100">
                  {result.vehicle_counts?.total ?? 0}
                </p>
              </div>

              <div className="text-5xl">
                🚦
              </div>
            </div>

            {/* Flow Rate */}
            <div className="bg-[#141b29] border border-violet-500/20 rounded-xl p-4">

              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-violet-400" />

                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Estimated Flow Rate
                </span>
              </div>

              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-violet-400">
                  {result.flow_rate_vph ?? 0}
                </span>

                <span className="text-slate-400 text-sm mb-1">
                  vehicles / hour
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(
                      100,
                      ((result.flow_rate_vph ?? 0) / 2000) * 100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-600 mt-1.5">
                <span>Low Traffic</span>
                <span>High Traffic</span>
              </div>
            </div>

            {/* Re-analyze Button */}
            <button
              onClick={runDetection}
              className="w-full py-2.5 bg-[#141b29] hover:bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              🔄 Re-analyze Video
            </button>
          </>
        )}

      </div>

      {/* ── RIGHT PANEL — VIDEO PLAYER ─────────────────────────── */}
      <div className="flex-1 h-full bg-[#0a0f18] flex flex-col">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">
              Live Output
            </span>

            <h3 className="text-base font-bold text-slate-100">
              Annotated Traffic Feed
            </h3>
          </div>

          {status === 'done' && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-[11px] text-emerald-300 font-medium">
                Detection Active
              </span>
            </div>
          )}
        </div>

        {/* Video / Status Area */}
        <div className="flex-1 flex items-center justify-center p-6">

          {/* Processing */}
          {status === 'processing' && (
            <div className="text-center">

              <div className="w-20 h-20 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin mx-auto mb-6" />

              <p className="text-xl font-semibold text-amber-400">
                Processing Traffic Video
              </p>

              <p className="text-sm text-slate-500 mt-2">
                YOLOv8 is detecting vehicles frame by frame...
              </p>

              <p className="text-xs text-slate-600 mt-1">
                Please wait — first run takes 30–60 seconds
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center">

              <div className="text-7xl mb-4">
                ⚠️
              </div>

              <p className="text-lg font-semibold text-rose-400">
                Something went wrong
              </p>

              <p className="text-sm text-slate-500 mt-1 max-w-md">
                {errorMsg}
              </p>

            </div>
          )}

          {/* Video */}
          {status === 'done' && result && result.output_video_url && (
            <video
              src={result.output_video_url}
              controls
              autoPlay
              loop
              className="max-w-full max-h-full rounded-2xl shadow-2xl border border-slate-700"
              style={{ maxHeight: 'calc(100vh - 140px)' }}
            />
          )}

        </div>
      </div>

    </div>
  );
}

