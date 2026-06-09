import { useState, useEffect } from "react";
import { getWeatherAdvice } from "../api/claude";

export default function Weather({
  lang,
  weather,
  loading,
  error,
  permissionDenied,
  isSlow,
  fetchWeatherByCity,
  getLocalWeather,
}) {
  const [cityInput, setCityInput] = useState("");
  const [advice, setAdvice] = useState([]);
  const [fetchingAdvice, setFetchingAdvice] = useState(false);
  const hi = lang === "hi";

  // Pre-fill input when weather details change
  useEffect(() => {
    if (weather?.cityName) {
      const timer = setTimeout(() => {
        setCityInput(weather.cityName);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [weather]);

  // Fetch dynamic AI advice when weather parameters or language change
  useEffect(() => {
    if (!weather) return;

    async function loadAdvice() {
      setFetchingAdvice(true);
      try {
        const res = await getWeatherAdvice({ weather, lang });
        if (res.advice) {
          setAdvice(res.advice);
        } else {
          throw new Error("No advice returned");
        }
      } catch (err) {
        console.error("Failed to load weather advice:", err);
        setAdvice(
          hi
            ? [
                { type: "ok", text: "मौसम के अनुसार सिंचाई की योजना बनाएं।" },
                { type: "warn", text: "उच्च आर्द्रता में कीटों की निगरानी करें।" },
                { type: "ok", text: "शांत हवा में कीटनाशक छिड़काव करें।" },
              ]
            : [
                { type: "ok", text: "Plan irrigation based on weather forecasts." },
                { type: "warn", text: "Monitor crops for pests during high humidity." },
                { type: "ok", text: "Spray pesticides during calm wind conditions." },
              ]
        );
      } finally {
        setFetchingAdvice(false);
      }
    }

    loadAdvice();
  }, [weather, lang, hi]);

  const handleSearch = () => {
    if (cityInput.trim()) {
      fetchWeatherByCity(cityInput.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title flex justify-between items-center">
          <span>📍 {hi ? "आपका स्थान" : "Your location"}</span>
          {navigator.geolocation && (
            <button
              onClick={getLocalWeather}
              className="text-xs bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-zinc-700 border border-emerald-100 dark:border-zinc-700 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              title={hi ? "वर्तमान स्थान का उपयोग करें" : "Use current location"}
              disabled={loading}
            >
              🛰️ {hi ? "स्थान पुनः प्राप्त करें" : "Use GPS"}
            </button>
          )}
        </div>

        {/* Loading State Banner */}
        {loading && (
          <div className="text-sm font-semibold text-center text-emerald-700 dark:text-emerald-400 mb-3 animate-pulse py-2 flex items-center justify-center gap-1.5 bg-emerald-50/50 dark:bg-zinc-800/30 rounded-lg border border-emerald-100/50 dark:border-zinc-800/50">
            <span>🛰️</span> {hi ? "स्थान प्राप्त किया जा रहा है..." : "Fetching location..."}
          </div>
        )}

        {/* Slow GPS Fallback UI */}
        {isSlow && !permissionDenied && (
          <div className="text-xs border border-amber-200 bg-amber-50/50 p-2.5 rounded-lg text-amber-800 dark:text-amber-400 dark:bg-zinc-900/50 dark:border-amber-900/30 mb-3 flex items-center gap-1.5 animate-bounce">
            ⚠️ {hi ? "धीमा जीपीएस? नीचे शहर का नाम मैन्युअल रूप से दर्ज करें।" : "Slow GPS? Enter city manually below."}
          </div>
        )}

        {/* Location Permission Denied Warning */}
        {permissionDenied && (
          <div className="text-xs border border-amber-200 bg-amber-50/50 p-2.5 rounded-lg text-amber-800 dark:text-amber-400 dark:bg-zinc-900/50 dark:border-amber-900/30 mb-3 flex items-center gap-1.5">
            ⚠️ {hi ? "सटीक स्थान पहुंच अनुपलब्ध। कृपया मैन्युअल रूप से खोजें।" : "GPS location unavailable. Please search manually."}
          </div>
        )}

        {error && !permissionDenied && !isSlow && (
          <div className="text-xs border border-red-200 bg-red-50/50 p-2.5 rounded-lg text-red-800 dark:text-red-400 dark:bg-zinc-900/50 dark:border-red-900/30 mb-3">
            ❌ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hi ? "शहर का नाम दर्ज करें..." : "Enter city..."}
            className="kisan-input"
            style={{ flex: 1 }}
          />
          <button onClick={handleSearch} className="action-btn" style={{ width: "auto", padding: "8px 16px" }} disabled={loading}>
            {loading ? "..." : hi ? "देखें" : "Get"}
          </button>
        </div>

        {/* Stats grid */}
        {weather && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {[
              { icon: "🌡️", val: weather.temp, label: hi ? "तापमान" : "Temp" },
              { icon: "💧", val: weather.humidity, label: hi ? "नमी" : "Humidity" },
              { icon: "🌬️", val: weather.wind, label: hi ? "हवा" : "Wind" },
              { icon: "🌧️", val: weather.rain, label: hi ? "वर्षा/बादल" : "Rain/Clouds" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{s.val}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {weather && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-2 capitalize italic">
            Condition: {weather.description}
          </div>
        )}
      </div>

      {/* Advice */}
      <div className="card">
        <div className="card-title">
          💡 {hi ? "आज की खेती सलाह" : "AI farming advice for today"}
          {fetchingAdvice && <span className="text-xs ml-2 text-zinc-400 animate-pulse">({hi ? "अपडेट हो रहा है..." : "updating..."})</span>}
        </div>
        <ul style={{ listStyle: "none" }}>
          {advice.map((a, i) => (
            <li key={i} className="advice-item">
              <span style={{ color: a.type === "ok" ? "var(--primary-color)" : "#d97706", flexShrink: 0 }}>
                {a.type === "ok" ? "✅" : "⚠️"}
              </span>
              {a.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
