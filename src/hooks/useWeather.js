import { useState, useEffect, useCallback, useRef } from "react";

const OWM_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";

export default function useWeather() {
  // Smart Default: Load initial weather from localStorage if available
  const [weather, setWeather] = useState(() => {
    try {
      const cached = localStorage.getItem("kisan_last_weather");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  // Keep a mutable ref to weather to avoid triggering useCallback rebuild loops
  const weatherRef = useRef(weather);
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  const fetchWeatherByCoords = useCallback(async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      if (!OWM_API_KEY) {
        // Fallback Mock Data if no API key is provided
        console.warn("OpenWeatherMap API key not found. Using fallback mock weather.");
        await new Promise((r) => setTimeout(r, 800));
        const mocked = {
          temp: "32°C",
          humidity: "68%",
          wind: "12 km/h",
          rain: "20%",
          description: "scattered clouds",
          main: "Clouds",
          cityName: "Patna (Mocked)",
        };
        setWeather(mocked);
        localStorage.setItem("kisan_last_weather", JSON.stringify(mocked));
        setLoading(false);
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch weather from OpenWeatherMap");
      const data = await res.json();
      
      const fetched = {
        temp: `${Math.round(data.main.temp)}°C`,
        humidity: `${data.main.humidity}%`,
        wind: `${Math.round(data.wind.speed * 3.6)} km/h`, // convert m/s to km/h
        rain: `${data.clouds?.all || 0}%`, // Use cloudiness as a proxy for rain probability
        description: data.weather?.[0]?.description || "clear sky",
        main: data.weather?.[0]?.main || "Clear",
        cityName: data.name || "Unknown Location",
      };
      setWeather(fetched);
      localStorage.setItem("kisan_last_weather", JSON.stringify(fetched));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeatherByCity = useCallback(async (cityName) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (!OWM_API_KEY) {
        // Fallback Mock Data if no API key is provided
        console.warn("OpenWeatherMap API key not found. Using fallback mock weather.");
        await new Promise((r) => setTimeout(r, 800));
        const mocked = {
          temp: "30°C",
          humidity: "75%",
          wind: "15 km/h",
          rain: "60%",
          description: "light rain",
          main: "Rain",
          cityName: cityName,
        };
        setWeather(mocked);
        localStorage.setItem("kisan_last_weather", JSON.stringify(mocked));
        setLoading(false);
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${OWM_API_KEY}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();

      const fetched = {
        temp: `${Math.round(data.main.temp)}°C`,
        humidity: `${data.main.humidity}%`,
        wind: `${Math.round(data.wind.speed * 3.6)} km/h`,
        rain: `${data.clouds?.all || 0}%`,
        description: data.weather?.[0]?.description || "clear sky",
        main: data.weather?.[0]?.main || "Clear",
        cityName: data.name || cityName,
      };
      setWeather(fetched);
      localStorage.setItem("kisan_last_weather", JSON.stringify(fetched));
    } catch (err) {
      console.error(err);
      setError(err.message || "City not found");
    } finally {
      setLoading(false);
    }
  }, []);

  const getLocalWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setPermissionDenied(true);
      return;
    }

    setLoading(true);
    setError(null);
    setIsSlow(false);

    // Trigger Slow GPS fallback after 3 seconds
    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 3000);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(slowTimer);
        setIsSlow(false);
        const { latitude, longitude } = position.coords;
        setPermissionDenied(false);
        fetchWeatherByCoords(latitude, longitude);
      },
      (err) => {
        clearTimeout(slowTimer);
        setIsSlow(false);
        console.warn("Geolocation permission error:", err);
        setLoading(false);
        setPermissionDenied(true);
        setError("Location access denied. Please enter city manually.");
        // Fallback to default city Patna if first load
        if (!weatherRef.current) {
          fetchWeatherByCity("Patna");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  }, [fetchWeatherByCoords, fetchWeatherByCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getLocalWeather();
    }, 0);
    return () => clearTimeout(timer);
  }, [getLocalWeather]);

  return {
    weather,
    loading,
    error,
    permissionDenied,
    isSlow,
    fetchWeatherByCoords,
    fetchWeatherByCity,
    getLocalWeather
  };
}
