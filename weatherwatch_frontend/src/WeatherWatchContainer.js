import React, { useState, useEffect } from "react";

// PUBLIC_INTERFACE
/**
 * Main WeatherWatchContainer component
 * - Provides centered layout with a search bar, current weather, and 5-day forecast.
 * - Uses provided color palette (primary: #2196F3, secondary: #FFFFFF, accent: #FFC107) and light theme.
 * - Includes geolocation (auto-detect), city search, weather icons, temperature, humidity, wind, dynamic gradient background.
 */
function WeatherWatchContainer() {
  // Main app state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(null); // {lat, lon, name}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [current, setCurrent] = useState(null); // {temp, humidity, wind, icon, desc, ...}
  const [forecast, setForecast] = useState([]); // [{dt, temp, icon, ...},...]

  // Palette (could migrate to CSS vars if desired)
  const colors = {
    primary: "#2196F3",
    secondary: "#FFFFFF",
    accent: "#FFC107"
  };

  // Weather-dependent gradient backgrounds
  function getWeatherGradient(weatherId) {
    // Simple heuristic using weatherId (OpenWeatherMap style)
    if (!weatherId) return `linear-gradient(135deg, ${colors.primary} 0%, #70c1ff 100%)`;
    if (weatherId >= 200 && weatherId < 600)
      return "linear-gradient(135deg, #78909c 0%, #f5f7fa 100%)"; // Rainy/Thunder/Snow
    if (weatherId >= 600 && weatherId < 700)
      return "linear-gradient(135deg, #ece9e6 0%, #adb5bd 100%)"; // Snow
    if (weatherId >= 700 && weatherId < 800)
      return "linear-gradient(135deg, #757f9a 0%, #d7dde8 100%)"; // Mist/Fog
    if (weatherId === 800)
      return `linear-gradient(135deg, ${colors.primary} 0%, #90caf9 100%)`; // Clear
    if (weatherId > 800)
      return "linear-gradient(135deg, #b0bec5 0%, #e0e0e0 100%)"; // Clouds
    return `linear-gradient(135deg, ${colors.primary} 0%, #70c1ff 100%)`;
  }

  // Get icon from weather code
  function getWeatherIcon(icon, alt, size = 60) {
    // Use OpenWeatherMap icons, free for dev
    if (!icon) return <span style={{ fontSize: size }}>🌈</span>;
    // For full accessibility
    const url = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    return (
      <img
        src={url}
        alt={alt || "weather icon"}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  // Fetch weather by coordinates (lat, lon)
  async function fetchWeatherByCoords(lat, lon) {
    setLoading(true);
    setError(null);
    try {
      // You must replace "YOUR_API_KEY" with a real key, or use a proxy during later integration
      const apiKey = "YOUR_API_KEY";
      const base = "https://api.openweathermap.org/data/2.5";
      // Fetch current
      const currentRes = await fetch(
        `${base}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );
      if (!currentRes.ok) throw new Error("Unable to retrieve weather data");
      const currentData = await currentRes.json();

      // Fetch forecast (5 days, 3-hour steps)
      const forecastRes = await fetch(
        `${base}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );
      if (!forecastRes.ok) throw new Error("Unable to retrieve forecast");
      const forecastData = await forecastRes.json();

      // Reduce forecast to 5 unique days, picking the midday forecast for each
      const forecastList = forecastData.list;
      const byDate = {};
      for (const item of forecastList) {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        // Pick forecasts closest to 12:00 local time
        const hour = new Date(item.dt * 1000).getHours();
        if (
          !byDate[date] ||
          Math.abs(hour - 12) < Math.abs(byDate[date].hour - 12)
        ) {
          byDate[date] = { ...item, hour };
        }
      }
      const fiveDays = Object.values(byDate).slice(0, 5);

      setCurrent({
        temp: Math.round(currentData.main.temp),
        humidity: currentData.main.humidity,
        wind: currentData.wind.speed,
        icon: currentData.weather[0].icon,
        desc: currentData.weather[0].description,
        weatherId: currentData.weather[0].id,
        city: currentData.name,
        country: currentData.sys.country,
      });
      setForecast(
        fiveDays.map((item) => ({
          temp: Math.round(item.main.temp),
          temp_min: Math.round(item.main.temp_min),
          temp_max: Math.round(item.main.temp_max),
          dt: item.dt,
          weekday: new Date(item.dt * 1000).toLocaleDateString(undefined, { weekday: "short" }),
          icon: item.weather[0].icon,
          desc: item.weather[0].description,
          weatherId: item.weather[0].id,
        }))
      );
      setLoading(false);
    } catch (err) {
      setError(err.message || "Error fetching weather.");
      setLoading(false);
    }
  }

  // Fetch weather by city query
  async function fetchWeatherByCity(q) {
    setLoading(true);
    setError(null);
    try {
      const apiKey = "YOUR_API_KEY";
      const base = "https://api.openweathermap.org/data/2.5";
      // First, get the coords for the city name
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${apiKey}`
      );
      const geo = await geoRes.json();
      if (!geo.length) throw new Error("City not found.");
      setLocation({ lat: geo[0].lat, lon: geo[0].lon, name: geo[0].name });
      await fetchWeatherByCoords(geo[0].lat, geo[0].lon);
    } catch (err) {
      setError(err.message || "Could not find location.");
      setLoading(false);
    }
  }

  // Trigger geolocation fetch on mount (and when no city searched)
  useEffect(() => {
    if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude, name: "Your Location" });
        },
        () => {
          setError("Unable to determine your location.");
          setLoading(false);
        }
      );
    }
  }, [location]);

  // Fetch weather when location set
  useEffect(() => {
    if (location && location.lat && location.lon) {
      fetchWeatherByCoords(location.lat, location.lon);
    }
    // eslint-disable-next-line
  }, [location && location.lat, location && location.lon]);

  // Search bar handlers
  function handleInput(e) {
    setQuery(e.target.value);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim() !== "") {
      fetchWeatherByCity(query.trim());
      setQuery("");
    }
  }

  // Calculate background gradient based on current.weatherId
  const gradientStyle = {
    minHeight: "100vh",
    width: "100vw",
    background: getWeatherGradient(current && current.weatherId),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 64,
    transition: "background 0.7s cubic-bezier(.25,.8,.25,1)"
  };

  return (
    <div style={gradientStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "32px auto 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: colors.secondary,
          borderRadius: 18,
          boxShadow: "0 4px 20px rgba(33,150,243,.12)",
          padding: "32px 24px 40px",
        }}
      >
        {/* Location Search Bar */}
        <form
          style={{
            width: "100%",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
          onSubmit={handleSearch}
          autoComplete="off"
        >
          <input
            type="text"
            placeholder="Search city…"
            value={query}
            onChange={handleInput}
            style={{
              flex: 1,
              border: `1px solid ${colors.primary}`,
              borderRadius: 8,
              padding: 10,
              fontSize: 16,
              outline: "none",
              color: "#2b2b2b"
            }}
            aria-label="Search for a city"
          />
          <button
            type="submit"
            style={{
              background: colors.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            aria-label="Search"
          >
            🔍
          </button>
        </form>

        {/* Weather Status Card */}
        {loading ? (
          <div style={{ margin: "20px 0", color: colors.primary }}>Loading...</div>
        ) : error ? (
          <div style={{ color: "#C62828", margin: "20px 0" }}>{error}</div>
        ) : current ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 24,
              width: "100%"
            }}
          >
            <div style={{ fontSize: 20, color: "#444", fontWeight: 500 }}>
              {current.city}, {current.country}
            </div>
            {getWeatherIcon(current.icon, current.desc, 88)}
            <div style={{
              fontSize: 42,
              color: colors.primary,
              fontWeight: 700,
              marginTop: 2,
              marginBottom: 3
            }}>
              {current.temp}°C
            </div>
            <div style={{ fontSize: 18, color: "#868686", textTransform: "capitalize" }}>
              {current.desc}
            </div>
            <div style={{
              display: "flex",
              gap: 18,
              marginTop: 12,
              fontSize: 16,
              color: "#444"
            }}>
              <span>💧 {current.humidity}%</span>
              <span>💨 {Math.round(current.wind)} m/s</span>
            </div>
          </div>
        ) : null}

        {/* Forecast Scrollable Bar */}
        {forecast.length > 0 && !loading && !error && (
          <div style={{ width: "100%" }}>
            <div style={{
              fontWeight: 500,
              color: "#757575",
              marginBottom: 8,
              fontSize: 17
            }}>
              5-Day Forecast
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                overflowX: "auto",
                paddingBottom: 2
              }}
            >
              {forecast.map((f) => (
                <div
                  key={f.dt}
                  style={{
                    background: "#f4f8fc",
                    minWidth: 96,
                    borderRadius: 13,
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    boxShadow: "0 2px 6px rgba(33,150,243,.07)"
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{f.weekday}</span>
                  {getWeatherIcon(f.icon, f.desc, 42)}
                  <span style={{ fontWeight: 700, color: colors.primary }}>
                    {f.temp}°C
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: "#888"
                  }}>
                    {f.desc}
                  </span>
                  <span style={{
                    fontSize: 13,
                    marginTop: 3,
                    color: colors.accent
                  }}>
                    {f.temp_min}° / {f.temp_max}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attribution / Footer */}
      <div style={{ margin: "32px 0 14px 0", color: "#446", fontSize: 13, opacity: 0.75 }}>
        Powered by <a href="https://openweathermap.org/" style={{ color: colors.primary }} rel="noopener noreferrer" target="_blank">OpenWeatherMap</a>
      </div>
    </div>
  );
}

export default WeatherWatchContainer;
