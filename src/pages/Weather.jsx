import { useState, useEffect } from "react";
import { getWeatherAdvice } from "../api/claude";

// Map WMO weather code to descriptions and icons
const getWeatherIconAndDesc = (code, isHi = false) => {
  const map = {
    0: { icon: "☀️", descEn: "Clear sky", descHi: "साफ आसमान" },
    1: { icon: "🌤️", descEn: "Mainly clear", descHi: "मुख्यतः साफ" },
    2: { icon: "⛅", descEn: "Partly cloudy", descHi: "आंशिक रूप से बादल" },
    3: { icon: "☁️", descEn: "Overcast", descHi: "पूर्णतः घने बादल" },
    45: { icon: "🌫️", descEn: "Fog", descHi: "कोहरा" },
    48: { icon: "🌫️", descEn: "Depositing rime fog", descHi: "ओस/कोहरा" },
    51: { icon: "🌦️", descEn: "Light drizzle", descHi: "हल्की बूंदाबांदी" },
    53: { icon: "🌦️", descEn: "Moderate drizzle", descHi: "बूंदाबांदी" },
    55: { icon: "🌦️", descEn: "Dense drizzle", descHi: "तेज बूंदाबांदी" },
    61: { icon: "🌧️", descEn: "Light rain", descHi: "हल्की बारिश" },
    63: { icon: "🌧️", descEn: "Moderate rain", descHi: "सामान्य बारिश" },
    65: { icon: "🌧️", descEn: "Heavy rain", descHi: "भारी बारिश" },
    80: { icon: "🌧️", descEn: "Light rain showers", descHi: "हल्की बौछारें" },
    81: { icon: "🌧️", descEn: "Moderate rain showers", descHi: "बारिश की बौछारें" },
    82: { icon: "🌧️", descEn: "Violent rain showers", descHi: "मूसलाधार बारिश" },
    95: { icon: "⛈️", descEn: "Thunderstorm", descHi: "गरज के साथ बारिश" },
    96: { icon: "⛈️", descEn: "Thunderstorm with hail", descHi: "ओलावृष्टि के साथ तूफान" },
    99: { icon: "⛈️", descEn: "Severe thunderstorm", descHi: "भारी ओलावृष्टि व तूफान" },
  };

  const defaultVal = { icon: "🌦️", descEn: "Variable weather", descHi: "परिवर्तनशील मौसम" };
  const res = map[code] || defaultVal;
  return {
    icon: res.icon,
    desc: isHi ? res.descHi : res.descEn
  };
};

// Map degrees to cardinal wind directions
const getWindDirection = (deg, isHi = false) => {
  if (deg === undefined || deg === null) return "N/A";
  const index = Math.round(deg / 45) % 8;
  const cardEn = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const cardHi = ["उत्तर (N)", "उत्तर-पूर्व (NE)", "पूर्व (E)", "दक्षिण-पूर्व (SE)", "दक्षिण (S)", "दक्षिण-पश्चिम (SW)", "पश्चिम (W)", "उत्तर-पश्चिम (NW)"];
  return isHi ? cardHi[index] : cardEn[index];
};

// Map UV Index values to safety levels and color themes
const getUvInfo = (uv, isHi = false) => {
  if (uv === undefined || uv === null) return { text: "N/A", color: "var(--text-muted)", bg: "transparent" };
  
  if (uv <= 2) {
    return {
      text: isHi ? `${uv} (निम्न)` : `${uv} (Low)`,
      color: "#16a34a", // green
      bg: "rgba(22, 163, 74, 0.1)"
    };
  } else if (uv <= 5) {
    return {
      text: isHi ? `${uv} (मध्यम)` : `${uv} (Mod)`,
      color: "#ca8a04", // yellow
      bg: "rgba(202, 138, 4, 0.1)"
    };
  } else if (uv <= 7) {
    return {
      text: isHi ? `${uv} (उच्च)` : `${uv} (High)`,
      color: "#ea580c", // orange
      bg: "rgba(234, 88, 12, 0.1)"
    };
  } else if (uv <= 10) {
    return {
      text: isHi ? `${uv} (अति उच्च)` : `${uv} (Very High)`,
      color: "#dc2626", // red
      bg: "rgba(220, 38, 38, 0.1)"
    };
  } else {
    return {
      text: isHi ? `${uv} (अत्यंत तीव्र)` : `${uv} (Extreme)`,
      color: "#9333ea", // purple
      bg: "rgba(147, 51, 234, 0.1)"
    };
  }
};

// Format Date string into Days for layout list
const formatDate = (dateStr, isHi = false) => {
  if (!dateStr) return { dayName: "", dateLabel: "" };
  const d = new Date(dateStr);
  const options = { weekday: "short" };
  let dayName = d.toLocaleDateString(isHi ? "hi-IN" : "en-US", options);
  
  if (isHi) {
    dayName = dayName.replace("वार", "");
  }
  
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return {
    dayName,
    dateLabel: `${day}/${month}`
  };
};

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

  // Rule-based agricultural weather advisories
  const getRuleBasedWarnings = () => {
    if (!weather) return [];
    const warnings = [];
    
    const tempVal = parseFloat(weather.temp);
    const humidityVal = parseFloat(weather.humidity);
    const windVal = parseFloat(weather.wind);
    const uvVal = weather.uvIndex;
    
    if (windVal > 15) {
      warnings.push({
        type: "warn",
        text: hi 
          ? "तीव्र हवा (15+ km/h): आज कीटनाशक/उर्वरक छिड़काव से बचें (बह जाने का खतरा)।" 
          : "High Wind Speed (>15 km/h): Avoid chemical or pesticide spraying to prevent drift."
      });
    }
    
    if (humidityVal > 80 && tempVal >= 15 && tempVal <= 28) {
      warnings.push({
        type: "warn",
        text: hi 
          ? "उच्च झुलसा रोग (Blight) का खतरा: आर्द्र और गर्म मौसम फंगल रोग फैलाने के अनुकूल है।" 
          : "High Blight Disease Risk: Warm and humid conditions favor blight fungal outbreaks."
      });
    }
    
    if (tempVal > 38) {
      warnings.push({
        type: "warn",
        text: hi 
          ? "अत्यधिक तापमान (38°C+): फसलों में जल-तनाव की स्थिति। सिंचाई बढ़ाएं।" 
          : "Severe Crop Heat Stress (>38°C): Heat damage risk. Increase irrigation frequency."
      });
    }
    
    if (uvVal >= 8) {
      warnings.push({
        type: "warn",
        text: hi 
          ? "अति तीव्र यूवी किरणें (8+ UV): फसलों पर छाया का प्रबंध करें और दोपहर में बाहरी काम टालें।" 
          : "Extreme UV Index (8+): Risk of crop sunburn. Protect young seedlings and avoid midday outdoor labor."
      });
    }
    
    return warnings;
  };

  const ruleWarnings = getRuleBasedWarnings();
  const uvInfo = weather ? getUvInfo(weather.uvIndex, hi) : null;
  const windDirectionStr = weather ? getWindDirection(weather.windDir, hi) : "";

  // Set up stats grid metrics
  const stats = weather
    ? [
        { icon: "🌡️", val: weather.temp, label: hi ? "तापमान" : "Temp" },
        { icon: "💧", val: weather.humidity, label: hi ? "नमी / आर्द्रता" : "Humidity" },
        { icon: "🌬️", val: `${weather.wind} (${windDirectionStr})`, label: hi ? "हवा की गति और दिशा" : "Wind Speed & Dir" },
        { 
          icon: "☀️", 
          val: uvInfo ? uvInfo.text : "N/A", 
          label: hi ? "यूवी सूचकांक" : "UV Index", 
          valStyle: uvInfo ? { color: uvInfo.color } : {} 
        },
        { icon: "🌧️", val: weather.rain, label: hi ? "वर्षा/बादल" : "Rain/Clouds" },
        { icon: "☔", val: weather.precipitation || "0 mm", label: hi ? "वर्षा मात्रा" : "Precipitation" }
      ]
    : [];

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

        {/* Dynamic Warning Advisories */}
        {weather && ruleWarnings.length > 0 && (
          <div className="weather-warnings-container">
            {ruleWarnings.map((w, idx) => (
              <div key={idx} className="weather-warning-item">
                {w.text}
              </div>
            ))}
          </div>
        )}

        {/* Expanded 6-Card Agri-Stats grid */}
        {weather && (
          <div className="agri-stats-grid">
            {stats.map((s, idx) => (
              <div key={idx} className="stat-card">
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, ...s.valStyle }}>{s.val}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {weather && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-3 capitalize italic">
            Condition: {weather.description}
          </div>
        )}
      </div>

      {/* 7-Day Outlook Forecast Container */}
      {weather && weather.forecast && weather.forecast.length > 0 && (
        <div className="card">
          <div className="card-title">📅 {hi ? "7-दिवसीय कृषि मौसम आउटलुक" : "7-Day Agricultural Outlook"}</div>
          <div className="forecast-container">
            {weather.forecast.map((f, idx) => {
              const dateInfo = formatDate(f.date, hi);
              const wmo = getWeatherIconAndDesc(f.weatherCode, hi);
              return (
                <div key={idx} className="forecast-item">
                  <span className="forecast-day-name">{dateInfo.dayName}</span>
                  <span className="forecast-date">{dateInfo.dateLabel}</span>
                  <span className="forecast-icon" title={wmo.desc}>{wmo.icon}</span>
                  <span className="forecast-temp">{f.tempMax} / {f.tempMin}</span>
                  <div className="forecast-agri-badges">
                    <span className="forecast-badge uv" title={hi ? "यूवी सूचकांक" : "UV Index"}>☀️ {Math.round(f.uvIndex)}</span>
                    <span className="forecast-badge wind" title={hi ? "हवा की गति" : "Wind Speed"}>🌬️ {f.windSpeed}</span>
                    {parseFloat(f.precipitation) > 0 && (
                      <span className="forecast-badge rain" title={hi ? "वर्षा" : "Precipitation"}>☔ {f.precipitation}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Advice Card */}
      <div className="card">
        <div className="card-title">
          💡 {hi ? "आज की खेती सलाह" : "AI farming advice for today"}
          {fetchingAdvice && <span className="text-xs ml-2 text-zinc-400 animate-pulse">({hi ? "अपडेट हो रहा है..." : "updating..."})</span>}
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
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
