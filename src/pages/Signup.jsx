import { useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Signup({ lang, onSignupSuccess, switchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const hi = lang === "hi";

  const validate = () => {
    if (!name || !email || !password) {
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
    setSuccess(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (hi ? "पंजीकरण विफल रहा।" : "Registration failed."));
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
      
      // Auto redirect to login after 2 seconds
      setTimeout(() => {
        onSignupSuccess();
      }, 2000);
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
          {hi ? "पंजीकरण करें" : "Create Account"}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "14px", marginBottom: "2rem" }}>
          {hi ? "किसान AI सहायक से जुड़ने के लिए साइन अप करें" : "Join Kisan AI farming assistant"}
        </p>

        {error && (
          <div className="weather-warning-item" style={{ marginBottom: "1.5rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="weather-warning-item" style={{ marginBottom: "1.5rem", background: "rgba(59, 109, 17, 0.08)", border: "1px solid rgba(59, 109, 17, 0.2)", color: "var(--primary-color)", padding: "10px 14px", borderRadius: "8px", fontSize: "13px" }}>
            ✅ {hi ? "पंजीकरण सफल! लॉग इन किया जा रहा है..." : "Signup successful! Redirecting to login..."}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>
              {hi ? "आपका नाम" : "Your Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ram Singh"
              className="kisan-input"
              style={{ width: "100%" }}
              disabled={loading || success}
            />
          </div>

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
              disabled={loading || success}
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
              disabled={loading || success}
            />
          </div>

          <button
            type="submit"
            className="action-btn"
            style={{ marginTop: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            disabled={loading || success}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                {hi ? "पंजीकरण किया जा रहा है..." : "Signing up..."}
              </>
            ) : (
              hi ? "साइन अप करें" : "Sign Up"
            )}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "14px", color: "var(--text-muted)" }}>
          {hi ? "पहले से ही खाता है?" : "Already have an account?"}{" "}
          <button
            onClick={switchToLogin}
            style={{ background: "none", border: "none", color: "var(--primary-color)", fontWeight: "600", cursor: "pointer", padding: 0 }}
          >
            {hi ? "लॉगिन करें" : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
