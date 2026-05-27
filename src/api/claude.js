const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function diagnoseCrop({ crop, imageBase64, imageType, lang }) {
  const res = await fetch(`${BASE}/api/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crop, imageBase64, imageType, lang }),
  });
  return res.json();
}

export async function chatWithAI({ message, lang }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, lang }),
  });
  return res.json();
}

export async function getWeatherAdvice({ city, lang }) {
  const res = await fetch(`${BASE}/api/weather-advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, lang }),
  });
  return res.json();
}
