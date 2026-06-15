import { useState, useEffect } from "react";
import Diagnose from "./pages/Diagnose";
import Weather from "./pages/Weather";
import Calendar from "./pages/Calendar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import SchemeAnnouncement from "./components/SchemeAnnouncement";
import useWeather from "./hooks/useWeather";
import "./App.css";

const tabs = [
  { id: "diagnose", label: "🔬 Diagnose" },
  { id: "weather",  label: "🌦️ Weather"  },
  { id: "calendar", label: "📅 Calendar" },
  { id: "chat",     label: "💬 Chat"     },
];

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("kisan_token") || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("kisan_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });


  const [activeTab, setActiveTab] = useState("diagnose");
  const [lang, setLang] = useState("en");
  const [showRainWarning, setShowRainWarning] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        return false; // Default to closed on mobile
      }
      const saved = localStorage.getItem("kisan_chat_sidebar_open");
      return saved !== null ? saved === "true" : true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      localStorage.setItem("kisan_chat_sidebar_open", isHistoryOpen);
    }
  }, [isHistoryOpen]);

  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    permissionDenied: weatherPermissionDenied,
    isSlow: weatherIsSlow,
    fetchWeatherByCity,
    getLocalWeather,
  } = useWeather();
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    async function checkWeather(lat = 26.86631, lon = 84.87879) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,precipitation_probability&timezone=Asia/Kolkata&forecast_days=2`
        );
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        
        if (data && data.hourly && Array.isArray(data.hourly.rain) && Array.isArray(data.hourly.precipitation_probability)) {
          const currentHour = new Date().getHours();
          const next24Rain = data.hourly.rain.slice(currentHour, currentHour + 24);
          const next24Prob = data.hourly.precipitation_probability.slice(currentHour, currentHour + 24);
          
          const rainExpected = next24Rain.some((r) => r > 0) || next24Prob.some((p) => p >= 30);
          setShowRainWarning(rainExpected);
        }
      } catch (err) {
        console.error("Error checking weather warning:", err);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          checkWeather(); // Fallback to Patna coordinates
        }
      );
    } else {
      checkWeather();
    }
  }, []);

  if (!token || !user) {
    return (
      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="logo">🌾</div>
          <div className="header-text">
            <h1>{lang === "en" ? "Kisan AI" : "किसान AI"}</h1>
            <p>{lang === "en" ? "Your personal farming assistant" : "आपका कृषि सहायक"}</p>
          </div>
          <div className="lang-toggle">
            <button
              className={lang === "en" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("en")}
            >EN</button>
            <button
              className={lang === "hi" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("hi")}
            >हिं</button>
          </div>
        </div>

        <div className="content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 120px)" }}>
          <Login
            lang={lang}
            onLoginSuccess={(newToken, newUser, defaultSessionId) => {
              localStorage.setItem("kisan_token", newToken);
              localStorage.setItem("kisan_user", JSON.stringify(newUser));
              setToken(newToken);
              setUser(newUser);
              if (defaultSessionId) {
                localStorage.setItem("kisan_default_session", defaultSessionId);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      {/* Header */}
      <div className="header">
        {activeTab === "chat" && (
          <button 
            className="menu-toggle-btn" 
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            aria-label="Toggle Chat History"
            style={{ marginRight: "4px" }}
          >
            ☰
          </button>
        )}
        <div className="logo">🌾</div>
        <div className="header-text">
          <h1>{lang === "en" ? "Kisan AI" : "किसान AI"}</h1>
          <p>{lang === "en" ? "Your personal farming assistant" : "आपका कृषि सहायक"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logout Button */}
          <button
            onClick={() => {
              localStorage.removeItem("kisan_token");
              localStorage.removeItem("kisan_user");
              localStorage.removeItem("kisan_default_session");
              setToken(null);
              setUser(null);
            }}
            className="text-xs bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-zinc-700 border border-emerald-100 dark:border-zinc-700 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ fontWeight: "600", fontSize: "12px", border: "1px solid var(--border-light)", background: "var(--bg-card)", color: "var(--primary-color)" }}
            title={lang === "en" ? "Log Out" : "लॉग आउट"}
          >
            {lang === "en" ? "Logout" : "लॉगआउट"}
          </button>

          {/* Theme Toggle Button */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <div className="lang-toggle">
            <button
              className={lang === "en" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("en")}
            >EN</button>
            <button
              className={lang === "hi" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("hi")}
            >हिं</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== "chat" && window.innerWidth < 768) setIsHistoryOpen(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="content">
        {activeTab === "diagnose" && <Diagnose lang={lang} />}
        {activeTab === "weather"  && (
          <Weather
            lang={lang}
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            permissionDenied={weatherPermissionDenied}
            isSlow={weatherIsSlow}
            fetchWeatherByCity={fetchWeatherByCity}
            getLocalWeather={getLocalWeather}
          />
        )}
        {activeTab === "calendar" && <Calendar lang={lang} />}
        {activeTab === "chat"     && (
          <Chat 
            lang={lang} 
            showRainWarning={showRainWarning} 
            isHistoryOpen={isHistoryOpen}
            setIsHistoryOpen={setIsHistoryOpen}
            weather={weather}
            setActiveTab={setActiveTab}
            userId={user.id}
          />
        )}
      </div>

      <SchemeAnnouncement />
    </div>
  );
}

export default App;
