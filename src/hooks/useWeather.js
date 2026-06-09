import { useState, useEffect, useCallback, useRef } from "react";

const OWM_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";

const wmoMap = {
  0: { icon: "☀️", desc: "Clear sky" },
  1: { icon: "🌤️", desc: "Mainly clear" },
  2: { icon: "⛅", desc: "Partly cloudy" },
  3: { icon: "☁️", desc: "Overcast" },
  45: { icon: "🌫️", desc: "Fog" },
  48: { icon: "🌫️", desc: "Depositing rime fog" },
  51: { icon: "🌦️", desc: "Light drizzle" },
  53: { icon: "🌦️", desc: "Moderate drizzle" },
  55: { icon: "🌦️", desc: "Dense drizzle" },
  61: { icon: "🌧️", desc: "Light rain" },
  63: { icon: "🌧️", desc: "Moderate rain" },
  65: { icon: "🌧️", desc: "Heavy rain" },
  80: { icon: "🌧️", desc: "Light rain showers" },
  81: { icon: "🌧️", desc: "Moderate rain showers" },
  82: { icon: "🌧️", desc: "Violent rain showers" },
  95: { icon: "⛈️", desc: "Thunderstorm" },
  96: { icon: "⛈️", desc: "Thunderstorm with hail" },
  99: { icon: "⛈️", desc: "Severe thunderstorm" },
};

function getWMOInfo(code) {
  return wmoMap[code] || { icon: "🌦️", desc: "Variable weather" };
}

const parseOWMOneCallData = (data, fetchedBase) => {
  if (data.daily && Array.isArray(data.daily)) {
    const forecastList = data.daily.map((day) => {
      const dateStr = new Date(day.dt * 1000).toISOString().split('T')[0];
      return {
        date: dateStr,
        tempMax: `${Math.round(day.temp.max)}°C`,
        tempMin: `${Math.round(day.temp.min)}°C`,
        uvIndex: day.uvi || 0,
        weatherCode: day.weather?.[0]?.id || 800, // Store OWM Weather ID
        windSpeed: `${Math.round(day.wind_speed * 3.6)} km/h`,
        windDir: day.wind_deg || 0,
        precipitation: `${day.rain || day.snow || 0} mm`
      };
    });
    
    fetchedBase.forecast = forecastList;
    fetchedBase.uvIndex = data.daily[0]?.uvi || 0;
    fetchedBase.windDir = data.daily[0]?.wind_deg || fetchedBase.windDir || 0;
    fetchedBase.precipitation = `${data.daily[0]?.rain || data.daily[0]?.snow || 0} mm`;
  }
  return fetchedBase;
};

const fetchOWMOneCall = async (lat, lon, fetchedBase) => {
  if (!OWM_API_KEY) throw new Error("No OpenWeatherMap API key");
  
  // Query OWM One Call 3.0
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${OWM_API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) {
    // Fallback to OWM One Call 2.5
    const url25 = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${OWM_API_KEY}&units=metric`;
    const res25 = await fetch(url25);
    if (!res25.ok) {
      throw new Error(`OWM One Call failed with status ${res25.status}`);
    }
    return parseOWMOneCallData(await res25.json(), fetchedBase);
  }
  return parseOWMOneCallData(await res.json(), fetchedBase);
};

const fetchForecast = async (lat, lon, fetchedBase) => {
  try {
    console.log("Attempting OpenWeatherMap One Call forecast fetch...");
    return await fetchOWMOneCall(lat, lon, fetchedBase);
  } catch (owmErr) {
    console.warn("OpenWeatherMap One Call failed, falling back to Open-Meteo:", owmErr.message);
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weathercode,windspeed_10m_max,winddirection_10m_dominant,precipitation_sum&timezone=auto&wind_speed_unit=kmh`;
      const meteoRes = await fetch(openMeteoUrl);
      if (meteoRes.ok) {
        const meteoData = await meteoRes.json();
        if (meteoData.daily) {
          const daily = meteoData.daily;
          const forecastList = daily.time.map((time, idx) => ({
            date: time,
            tempMax: `${Math.round(daily.temperature_2m_max[idx])}°C`,
            tempMin: `${Math.round(daily.temperature_2m_min[idx])}°C`,
            uvIndex: daily.uv_index_max[idx],
            weatherCode: daily.weathercode[idx], // WMO Weather Code
            windSpeed: `${Math.round(daily.windspeed_10m_max[idx])} km/h`,
            windDir: daily.winddirection_10m_dominant[idx],
            precipitation: `${daily.precipitation_sum[idx]} mm`
          }));
          
          fetchedBase.forecast = forecastList;
          fetchedBase.uvIndex = daily.uv_index_max[0] || 0;
          fetchedBase.windDir = daily.winddirection_10m_dominant[0] || fetchedBase.windDir || 0;
          fetchedBase.precipitation = `${daily.precipitation_sum[0] || 0} mm`;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch forecast from Open-Meteo:", err);
      fetchedBase.forecast = [];
      fetchedBase.uvIndex = fetchedBase.uvIndex || 0;
      fetchedBase.windDir = fetchedBase.windDir || 0;
      fetchedBase.precipitation = fetchedBase.precipitation || "0 mm";
    }
    return fetchedBase;
  }
};

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
        // Fallback to purely Open-Meteo weather and geocoding if no API key is provided
        console.warn("OpenWeatherMap API key not found. Using Open-Meteo for coordinates weather.");
        
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weathercode,windspeed_10m_max,winddirection_10m_dominant,precipitation_sum&timezone=auto&wind_speed_unit=kmh`;
        const res = await fetch(openMeteoUrl);
        if (!res.ok) throw new Error("Failed to fetch weather from Open-Meteo");
        const data = await res.json();
        
        const current = data.current;
        const wmoInfo = getWMOInfo(current.weather_code);
        
        const fetched = {
          temp: `${Math.round(current.temperature_2m)}°C`,
          humidity: `${current.relative_humidity_2m}%`,
          wind: `${Math.round(current.wind_speed_10m)} km/h`,
          rain: `10%`, // estimate clouds
          description: wmoInfo.desc,
          main: wmoInfo.icon,
          cityName: `GPS Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          windDir: current.wind_direction_10m,
          uvIndex: data.daily?.uv_index_max?.[0] || 0,
          precipitation: `${current.precipitation} mm`,
          forecast: []
        };
        
        if (data.daily) {
          const daily = data.daily;
          fetched.forecast = daily.time.map((time, idx) => ({
            date: time,
            tempMax: `${Math.round(daily.temperature_2m_max[idx])}°C`,
            tempMin: `${Math.round(daily.temperature_2m_min[idx])}°C`,
            uvIndex: daily.uv_index_max[idx],
            weatherCode: daily.weathercode[idx],
            windSpeed: `${Math.round(daily.windspeed_10m_max[idx])} km/h`,
            windDir: daily.winddirection_10m_dominant[idx],
            precipitation: `${daily.precipitation_sum[idx]} mm`
          }));
        }
        
        setWeather(fetched);
        localStorage.setItem("kisan_last_weather", JSON.stringify(fetched));
        setLoading(false);
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch weather from OpenWeatherMap");
      const data = await res.json();
      
      let fetched = {
        temp: `${Math.round(data.main.temp)}°C`,
        humidity: `${data.main.humidity}%`,
        wind: `${Math.round(data.wind.speed * 3.6)} km/h`, // convert m/s to km/h
        rain: `${data.clouds?.all || 0}%`, // Use cloudiness as a proxy for rain probability
        description: data.weather?.[0]?.description || "clear sky",
        main: data.weather?.[0]?.main || "Clear",
        cityName: data.name || "Unknown Location",
        windDir: data.wind?.deg || 0,
      };
      
      // Fetch 7-day outlook and UV index from Open-Meteo and merge
      fetched = await fetchForecast(lat, lon, fetched);
      
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
        console.warn("OpenWeatherMap API key not found. Resolving coordinates via Open-Meteo Geocoding.");
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) throw new Error("City lookup failed");
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("City not found");
        }
        
        const cityInfo = geoData.results[0];
        const lat = cityInfo.latitude;
        const lon = cityInfo.longitude;
        const resolvedName = cityInfo.name;
        
        // Now fetch details using coordinates
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weathercode,windspeed_10m_max,winddirection_10m_dominant,precipitation_sum&timezone=auto&wind_speed_unit=kmh`;
        const res = await fetch(openMeteoUrl);
        if (!res.ok) throw new Error("Failed to fetch weather details");
        const data = await res.json();
        
        const current = data.current;
        const wmoInfo = getWMOInfo(current.weather_code);
        
        const fetched = {
          temp: `${Math.round(current.temperature_2m)}°C`,
          humidity: `${current.relative_humidity_2m}%`,
          wind: `${Math.round(current.wind_speed_10m)} km/h`,
          rain: `15%`,
          description: wmoInfo.desc,
          main: wmoInfo.icon,
          cityName: resolvedName,
          windDir: current.wind_direction_10m,
          uvIndex: data.daily?.uv_index_max?.[0] || 0,
          precipitation: `${current.precipitation} mm`,
          forecast: []
        };
        
        if (data.daily) {
          const daily = data.daily;
          fetched.forecast = daily.time.map((time, idx) => ({
            date: time,
            tempMax: `${Math.round(daily.temperature_2m_max[idx])}°C`,
            tempMin: `${Math.round(daily.temperature_2m_min[idx])}°C`,
            uvIndex: daily.uv_index_max[idx],
            weatherCode: daily.weathercode[idx],
            windSpeed: `${Math.round(daily.windspeed_10m_max[idx])} km/h`,
            windDir: daily.winddirection_10m_dominant[idx],
            precipitation: `${daily.precipitation_sum[idx]} mm`
          }));
        }
        
        setWeather(fetched);
        localStorage.setItem("kisan_last_weather", JSON.stringify(fetched));
        setLoading(false);
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${OWM_API_KEY}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();

      let fetched = {
        temp: `${Math.round(data.main.temp)}°C`,
        humidity: `${data.main.humidity}%`,
        wind: `${Math.round(data.wind.speed * 3.6)} km/h`,
        rain: `${data.clouds?.all || 0}%`,
        description: data.weather?.[0]?.description || "clear sky",
        main: data.weather?.[0]?.main || "Clear",
        cityName: data.name || cityName,
        windDir: data.wind?.deg || 0,
      };
      
      const lat = data.coord.lat;
      const lon = data.coord.lon;
      
      // Fetch 7-day outlook and UV index from Open-Meteo and merge
      fetched = await fetchForecast(lat, lon, fetched);
      
      setWeather(fetched);
      localStorage.setItem("kisan_last_weather", JSON.stringify(fetched));
    } catch (err) {
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
