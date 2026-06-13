import { useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Login({ lang, onLoginSuccess, switchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hi = lang === "hi";

  const validate = () => {
    if (!email || !password) {
      setError(hi ? "सभी फ़ील्ड आवश्यक हैं।" : "All fields are required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(hi ? "कृपया एक मान्य ईमेल दर्ज करें।" : "Please enter a valid email.");
      return false;
    }
    if (password.length < 6) {
      setError(hi ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (hi ? "लॉगिन विफल रहा।" : "Login failed."));
      }

      onLoginSuccess(data.token, data.user, data.defaultSessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: "420px", margin: "2.5rem auto", padding: "0 1rem" }}>
      <div className="card" style={{ padding: "2.5rem 2rem" }}>
        <h2 style={{ textAlign: "center", marginBottom: "0.5rem", color: "var(--primary-color)" }}>
          {hi ? "लॉगिन करें" : "Welcome Back"}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "14px", marginBottom: "2rem" }}>
          {hi ? "अपने किसान AI खाते में प्रवेश करें" : "Log in to your Kisan AI account"}
        </p>

        {error && (
          <div className="weather-warning-item" style={{ marginBottom: "1.5rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>
              {hi ? "ईमेल पता" : "Email Address"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="kisan-input"
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>
              {hi ? "पासवर्ड" : "Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="kisan-input"
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="action-btn"
            style={{ marginTop: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                {hi ? "प्रवेश किया जा रहा है..." : "Logging in..."}
              </>
            ) : (
              hi ? "लॉगिन करें" : "Log In"
            )}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "14px", color: "var(--text-muted)" }}>
          {hi ? "खाता नहीं है?" : "Don't have an account?"}{" "}
          <button
            onClick={switchToSignup}
            style={{ background: "none", border: "none", color: "var(--primary-color)", fontWeight: "600", cursor: "pointer", padding: 0 }}
          >
            {hi ? "नया खाता बनाएं" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
