import { useState, useEffect } from "react";
import Diagnose from "./pages/Diagnose";
import Weather from "./pages/Weather";
import Calendar from "./pages/Calendar";
import Chat from "./pages/Chat";
import "./App.css";

const tabs = [
  { id: "diagnose", label: "🔬 Diagnose" },
  { id: "weather",  label: "🌦️ Weather"  },
  { id: "calendar", label: "📅 Calendar" },
  { id: "chat",     label: "💬 Chat"     },
];

function App() {
  const [activeTab, setActiveTab] = useState("diagnose");
  const [lang, setLang] = useState("en");
  const [showRainWarning, setShowRainWarning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
    async function checkWeather() {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=26.86631&longitude=84.87879&hourly=rain,precipitation_probability&timezone=Asia/Kolkata&forecast_days=2"
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
    checkWeather();
  }, []);

  return (
    <div className="app">

      {/* Header */}
      <div className="header">
        {activeTab === "chat" && (
          <button 
            className="menu-toggle-btn" 
            onClick={() => setSidebarOpen((prev) => !prev)}
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
              if (tab.id !== "chat") setSidebarOpen(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="content">
        {activeTab === "diagnose" && <Diagnose lang={lang} />}
        {activeTab === "weather"  && <Weather  lang={lang} />}
        {activeTab === "calendar" && <Calendar lang={lang} />}
        {activeTab === "chat"     && (
          <Chat 
            lang={lang} 
            showRainWarning={showRainWarning} 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        )}
      </div>

    </div>
  );
}

export default App;
