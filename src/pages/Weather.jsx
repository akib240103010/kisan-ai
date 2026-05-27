import { useState } from "react";

const defaultAdvice = [
  { type: "ok", text: "Hold off on irrigation — rain likely this evening" },
  { type: "warn", text: "High humidity raises fungal risk — inspect for rust" },
  { type: "ok", text: "Good window for spraying before 10 AM (calm wind)" },
  { type: "warn", text: "Heat stress possible — avoid transplanting seedlings" },
  { type: "ok", text: "Delay fertilizer — showers expected next 3 days" },
];

export default function Weather({ lang }) {
  const [city, setCity] = useState("Patna, Bihar");
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState({ temp: "34°C", humidity: "72%", wind: "18 km/h", rain: "40%" });
  const hi = lang === "hi";

  async function fetchWeather() {
    setLoading(true);
    // Real API call comes in Phase 5 — placeholder for now
    await new Promise((r) => setTimeout(r, 1200));
    setWeather({ temp: "36°C", humidity: "65%", wind: "14 km/h", rain: "30%" });
    setLoading(false);
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">📍 {hi ? "आपका स्थान" : "Your location"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city..."
            className="kisan-input"
            style={{ flex: 1 }}
          />
          <button onClick={fetchWeather} className="action-btn" style={{ width: "auto", padding: "8px 16px" }}>
            {loading ? "..." : hi ? "देखें" : "Get"}
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { icon: "🌡️", val: weather.temp, label: hi ? "तापमान" : "Temp" },
            { icon: "💧", val: weather.humidity, label: hi ? "नमी" : "Humidity" },
            { icon: "🌬️", val: weather.wind, label: hi ? "हवा" : "Wind" },
            { icon: "🌧️", val: weather.rain, label: hi ? "वर्षा" : "Rain" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{s.val}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Advice */}
      <div className="card">
        <div className="card-title">💡 {hi ? "आज की खेती सलाह" : "AI farming advice for today"}</div>
        <ul style={{ listStyle: "none" }}>
          {defaultAdvice.map((a, i) => (
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
