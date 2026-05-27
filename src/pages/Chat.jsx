import ReactMarkdown from "react-markdown";
import { useState, useRef, useEffect } from "react";
import DosageCalculator from "../components/DosageCalculator";
import imageCompression from "browser-image-compression";

const quickPrompts = {
  en: ["Best fertilizer for wheat?", "How to control aphids?", "When to harvest rice?", "PM-Kisan scheme details"],
  hi: ["गेहूं के लिए उर्वरक?", "माहू से कैसे बचाएं?", "चावल की कटाई कब?", "PM-किसान योजना"],
};

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Chat({ lang, showRainWarning, sidebarOpen, setSidebarOpen }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text:
        lang === "hi"
          ? "नमस्ते! 🌾 मैं किसान AI हूँ। कुछ भी पूछें!"
          : "Namaste! 🌾 I'm Kisan AI. Ask me anything about farming!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState(null);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const hi = lang === "hi";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Authenticate user and load active sessions on mount
  useEffect(() => {
    async function initUser() {
      try {
        const res = await fetch(`${BASE}/api/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: "9999999999" }),
        });
        if (!res.ok) throw new Error("Login failed");
        const data = await res.json();
        setUserId(data.user.id);
        setSessionId(data.defaultSessionId);

        // Fetch user's sessions
        const sessionsRes = await fetch(`${BASE}/api/chats/${data.user.id}/sessions`);
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
        }
      } catch (err) {
        console.error("Login / Session Fetch Error:", err);
      }
    }
    initUser();
  }, []);

  // 2. Load historical messages whenever sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    async function fetchMessages() {
      try {
        const res = await fetch(`${BASE}/api/chats/${sessionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map((msg) => {
              let text = msg.text;
              if (
                msg.sender === "bot" &&
                msg.disease_name &&
                msg.disease_name !== "General Advice" &&
                msg.disease_name !== "N/A"
              ) {
                text = `### 🚨 ${msg.disease_name} (${msg.confidence_score})\n\n**⚡ Immediate Action:** ${msg.immediate_action}\n\n**🧪 Chemical Cure:** ${msg.chemical_cure}\n\n**🌿 Organic Cure:** ${msg.organic_cure}\n\n**💧 Dosage:** ${msg.dosage_per_acre}`;
              }
              return { role: msg.sender, text };
            });
            setMessages(formatted);
          } else {
            setMessages([
              {
                role: "bot",
                text:
                  lang === "hi"
                    ? "नमस्ते! 🌾 मैं किसान AI हूँ। कुछ भी पूछें!"
                    : "Namaste! 🌾 I'm Kisan AI. Ask me anything about farming!",
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Fetch Messages Error:", err);
      }
    }
    fetchMessages();
  }, [sessionId, lang]);

  // Handle image attachment selection
  async function handleImageAttachment(e) {
    const file = e.target.files[0];
    if (!file) return;

    setAttachedImagePreview(URL.createObjectURL(file));

    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      setAttachedFile(compressedFile);
    } catch (err) {
      console.error("Image Compression Error:", err);
    }
  }

  // Create a new chat session in the database
  async function createNewChat() {
    if (!userId) return;
    try {
      const res = await fetch(`${BASE}/api/chats/${userId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lang === "hi" ? "नई बातचीत" : "New Chat",
        }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessionId(newSession.id);
        setSessions((prev) => [newSession, ...prev]);
        setSidebarOpen(false); // Close sidebar on mobile after creation
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  }

  async function send(text) {
    let msg = text || input.trim();
    if (!msg && !attachedFile) return;
    if (!msg && attachedFile) {
      msg = lang === "hi" ? "कृपया इस पौधे की जांच करें।" : "Please analyze this plant.";
    }

    const displayMsg = attachedFile ? `[📷 Photo] ${msg}`.trim() : msg;

    setInput("");
    const fileToSend = attachedFile;

    setAttachedFile(null);
    if (attachedImagePreview) {
      URL.revokeObjectURL(attachedImagePreview);
      setAttachedImagePreview(null);
    }

    setMessages((prev) => [...prev, { role: "user", text: displayMsg }]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", msg);
      formData.append("lang", lang);
      formData.append("history", JSON.stringify(messages));
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }
      if (fileToSend) {
        formData.append("image", fileToSend);
      }

      // 1. Call local Node/Gemini backend with FormData body
      const response = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      // 2. Format the new JSON data into a readable Markdown message
      let botReply = "Sorry, no response.";

      if (data.success && data.data) {
        const info = data.data;

        // Check if it is a disease diagnosis or just a general question
        if (info.disease_name && info.disease_name !== "General Advice" && info.disease_name !== "N/A") {
          botReply = `### 🚨 ${info.disease_name} (${info.confidence_score})\n\n**⚡ Immediate Action:** ${info.immediate_action}\n\n**🧪 Chemical Cure:** ${info.chemical_cure}\n\n**🌿 Organic Cure:** ${info.organic_cure}\n\n**💧 Dosage:** ${info.dosage_per_acre}`;
        } else {
          // If it's just a general question, only show the direct answer
          botReply = info.immediate_action;
        }

        if (data.newTitle) {
          setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: data.newTitle } : s)));
        }
      }

      setMessages((prev) => [...prev, { role: "bot", text: botReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: hi ? "माफ करें, जुड़ नहीं पाया।" : "Sorry, could not connect to server." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="chat-container">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar - Chat Sessions Panel */}
      <div className={`chat-sidebar card ${sidebarOpen ? "open" : ""}`}>
        <div className="card-title">📁 {hi ? "बातचीत इतिहास" : "Chat History"}</div>
        <button
          onClick={createNewChat}
          className="action-btn"
          style={{ marginBottom: "14px", background: "#f2a900" }}
        >
          ➕ {hi ? "नई बातचीत" : "New Chat"}
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "350px", overflowY: "auto" }}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSessionId(s.id);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              className={sessionId === s.id ? "session-btn active" : "session-btn"}
            >
              💬 {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="chat-main card">
        <div className="card-title">🤖 {hi ? "किसान AI से पूछें" : "Ask Kisan AI"}</div>

        {showRainWarning && (
          <div
            style={{
              background: "var(--bg-warning)",
              border: "1px solid var(--border-warning)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--text-warning)",
            }}
          >
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ fontSize: "13px", fontWeight: "500", lineHeight: "1.4" }}>
              {lang === "hi"
                ? "संभावित बारिश के कारण आज रसायनों के छिड़काव से बचें।"
                : "Avoid spraying chemicals today due to expected rain."}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
          {quickPrompts[lang].map((q) => (
            <button key={q} onClick={() => send(q)} className="quick-prompt-btn">
              {q}
            </button>
          ))}
        </div>

        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 9,
            marginBottom: 12,
          }}
        >
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "chat-bubble user" : "chat-bubble bot"}>
              <ReactMarkdown>{m.text}</ReactMarkdown>
              {m.role === "bot" && <DosageCalculator />}
            </div>
          ))}
          {loading && <div className="chat-bubble thinking">{hi ? "सोच रहा हूँ..." : "Thinking..."}</div>}
          <div ref={bottomRef} />
        </div>

        {attachedImagePreview && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: "10px", padding: "4px" }}>
            <img
              src={attachedImagePreview}
              alt="attachment preview"
              style={{
                height: "60px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                objectFit: "cover",
              }}
            />
            <button
              onClick={() => {
                setAttachedFile(null);
                URL.revokeObjectURL(attachedImagePreview);
                setAttachedImagePreview(null);
              }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "#ff4d4f",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageAttachment}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="icon-btn"
            type="button"
            aria-label={hi ? "छवि संलग्न करें" : "Attach Image"}
          >
            📷
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={hi ? "सवाल टाइप करें..." : "Type your question..."}
            className="chat-input"
          />
          <button
            onClick={() => send()}
            className="icon-btn"
            style={{ background: "var(--primary-color)", color: "#fff", borderColor: "var(--primary-color)" }}
            aria-label={hi ? "भेजें" : "Send"}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
