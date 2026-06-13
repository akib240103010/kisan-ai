import "regenerator-runtime/runtime";
import ReactMarkdown from "react-markdown";
import { useState, useRef, useEffect } from "react";
import DosageCalculator from "../components/DosageCalculator";
import imageCompression from "browser-image-compression";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const quickPrompts = {
  en: ["Best fertilizer for wheat?", "How to control aphids?", "When to harvest rice?", "PM-Kisan scheme details"],
  hi: ["गेहूं के लिए उर्वरक?", "माहू से कैसे बचाएं?", "चावल की कटाई कब?", "PM-किसान योजना"],
};

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Clean markdown format characters for natural-sounding speech output
function cleanMarkdownForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/[#*`_~]/g, "") // Remove Markdown styling characters
    .replace(/💰 Estimated Cost:/gi, "") // Clean cost prefix
    .replace(/⚡|🚨|🧪|🌿|💧|💰/g, "") // Strip emojis
    .replace(/[\n\r]+/g, ". ") // Replace newlines with full stops for pauses
    .trim();
}

export default function Chat({ lang, showRainWarning, isHistoryOpen, setIsHistoryOpen, weather, setActiveTab, userId }) {
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
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState(null);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const hi = lang === "hi";
  const [ttsLang, setTtsLang] = useState("hi-IN");

  // Speech recognition hooks
  const lastSpeechRef = useRef("");
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle | listening | processing

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setVoiceStatus("idle");
    } else {
      resetTranscript();
      lastSpeechRef.current = "";
      setVoiceStatus("listening");
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      SpeechRecognition.startListening({
        language: ttsLang,
        continuous: false
      });
    }
  };

  // Monitor listening transition to submit query
  useEffect(() => {
    if (!listening && transcript.trim() !== "") {
      const capturedText = transcript.trim();
      if (capturedText !== lastSpeechRef.current) {
        lastSpeechRef.current = capturedText;
        setVoiceStatus("processing");
        send(capturedText, true).then(() => {
          setVoiceStatus("idle");
        }).catch(() => {
          setVoiceStatus("idle");
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, transcript]);

  // Sync TTS language with active application UI language state
  useEffect(() => {
    const timer = setTimeout(() => {
      setTtsLang(lang === "hi" ? "hi-IN" : "en-US");
    }, 0);
    return () => clearTimeout(timer);
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Page unmount cleanup to stop any active speech synthesis
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handleSpeak(text) {
    if (!("speechSynthesis" in window)) {
      alert(hi ? "माफ करें, आपका ब्राउज़र टेक्स्ट-टू-स्पीच का समर्थन नहीं करता है।" : "Sorry, your browser does not support the Web Speech API (Text-to-Speech).");
      return;
    }

    // Cancel any active speech synthesis playbacks
    window.speechSynthesis.cancel();

    // Clean text before reading
    const cleanedText = cleanMarkdownForSpeech(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Choose voice language based on ttsLang dropdown selection
    const targetPrefix = ttsLang.split("-")[0].toLowerCase(); // 'en', 'hi', 'bho'
    const voiceLang = targetPrefix === "bho" ? "hi-IN" : ttsLang;
    utterance.lang = voiceLang;

    // Search for browser voice matching active language prefix dynamically
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase().replace("_", "-");
      if (vLang === voiceLang.toLowerCase()) return true;
      const vPrefix = vLang.split("-")[0];
      if (targetPrefix === "bho" && vPrefix === "hi") return true;
      return vPrefix === targetPrefix;
    });

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // 1. Load active sessions on mount or when userId changes
  useEffect(() => {
    if (!userId) return;
    async function loadSessions() {
      try {
        const sessionsRes = await fetch(`${BASE}/api/chats/${userId}/sessions`);
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);

          const storedDefault = localStorage.getItem("kisan_default_session");
          if (storedDefault) {
            setSessionId(parseInt(storedDefault));
          } else if (sessionsData.length > 0) {
            setSessionId(sessionsData[0].id);
          }
        }
      } catch (err) {
        console.error("Session Fetch Error:", err);
      }
    }
    loadSessions();
  }, [userId]);

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
        if (window.innerWidth < 768) {
          setIsHistoryOpen(false); // Close sidebar on mobile after creation
        }
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  }

  async function send(text, isAudio = false) {
    let msg = text || input.trim();
    if (!msg && !attachedFile) return;
    if (!msg && attachedFile) {
      msg = lang === "hi" ? "कृपया इस पौधे की जांच करें।" : "Please analyze this plant.";
    }

    const displayMsg = isAudio ? `🎙️ ${msg}` : (attachedFile ? `[📷 Photo] ${msg}`.trim() : msg);

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
      if (isAudio) {
        formData.append("isAudio", "true");
      }
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }
      if (fileToSend) {
        formData.append("image", fileToSend);
      }
      if (weather) {
        formData.append("weatherTemp", weather.temp || "");
        formData.append("weatherHumidity", weather.humidity || "");
        formData.append("weatherWind", weather.wind || "");
        formData.append("weatherRain", weather.rain || "");
        formData.append("weatherDesc", weather.description || "");
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
      // Automatic read-aloud: speak the new AI response
      handleSpeak(botReply);
    } catch {
      const errText = hi ? "माफ करें, जुड़ नहीं पाया।" : "Sorry, could not connect to server.";
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: errText },
      ]);
      // Automatic read-aloud of fallback connection error
      handleSpeak(errText);
    }
    setLoading(false);
  }

  return (
    <div className="chat-container">
      {/* Mobile Sidebar Overlay */}
      {isHistoryOpen && <div className="sidebar-overlay" onClick={() => setIsHistoryOpen(false)} />}

      {/* Unified Chat Wrapper Card */}
      <div className="chat-main card">
        
        {/* Sidebar - Chat Sessions Panel (nested inside chat-main) */}
        <div className={`chat-sidebar ${isHistoryOpen ? "open" : "collapsed"}`}>
          <div className="card-title" style={{ padding: "16px 16px 8px 16px", marginBottom: 0 }}>
            📁 {hi ? "बातचीत इतिहास" : "Chat History"}
          </div>
          <div style={{ padding: "0 16px 14px 16px" }}>
            <button
              onClick={createNewChat}
              className="action-btn"
              style={{ background: "#f2a900" }}
            >
              ➕ {hi ? "नई बातचीत" : "New Chat"}
            </button>
          </div>
          <div className="chat-sidebar-list">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSessionId(s.id);
                  if (window.innerWidth < 768) {
                    setIsHistoryOpen(false); // Close sidebar on mobile after selection
                  }
                }}
                className={sessionId === s.id ? "session-btn active" : "session-btn"}
              >
                💬 {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Active Chat Thread container (Header, Messages, Input) */}
        <div className="chat-thread-container">
          <div className="chat-header-bar">
            <button 
              className="chat-back-btn" 
              onClick={() => setActiveTab("diagnose")} 
              aria-label={hi ? "वापस" : "Back"}
            >
              ←
            </button>
            <div className="chat-header-info">
              <span className="chat-header-avatar">🌾</span>
              <div>
                <h3 className="chat-header-title">{hi ? "किसान AI" : "Kisan AI"}</h3>
                <p className="chat-header-subtitle">{hi ? "सक्रिय कृषि सहायक" : "Active Farming Assistant"}</p>
              </div>
            </div>
            <button 
              type="button"
              className="chat-menu-btn" 
              onClick={() => setIsHistoryOpen(prev => !prev)} 
              aria-label={hi ? "इतिहास" : "History"}
            >
              ☰
            </button>
          </div>

          {showRainWarning && (
            <div className="chat-rain-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                {lang === "hi"
                  ? "संभावित बारिश के कारण आज रसायनों के छिड़काव से बचें।"
                  : "Avoid spraying chemicals today due to expected rain."}
              </span>
            </div>
          )}

          <div className="chat-settings-bar">
            <div className="quick-prompts-list">
              {quickPrompts[lang].map((q) => (
                <button key={q} onClick={() => send(q)} className="quick-prompt-btn">
                  {q}
                </button>
              ))}
            </div>
            <div className="readout-selector-container">
              <span className="readout-label">🔊 {hi ? "पढ़ने की भाषा:" : "Readout Lang:"}</span>
              <select
                value={ttsLang}
                onChange={(e) => setTtsLang(e.target.value)}
                className="kisan-input text-xs select-compact"
              >
                <option value="en-US">English</option>
                <option value="hi-IN">Hindi / हिंदी</option>
                <option value="bho-IN">Bhojpuri / भोजपुरी</option>
              </select>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "chat-bubble user" : "chat-bubble bot"}>
                <ReactMarkdown>{m.text}</ReactMarkdown>
                {m.role === "bot" && (
                  <div className="chat-bubble-actions">
                    <DosageCalculator />
                    <button 
                      onClick={() => handleSpeak(m.text)}
                      className="chat-speaker-btn"
                      title={hi ? "उत्तर सुनें" : "Listen to response"}
                    >
                      🔊
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="chat-bubble thinking">{hi ? "सोच रहा हूँ..." : "Thinking..."}</div>}
            <div ref={bottomRef} />
          </div>

          {attachedImagePreview && (
            <div className="chat-attachment-preview">
              <img
                src={attachedImagePreview}
                alt="attachment preview"
                className="chat-attachment-img"
              />
              <button
                onClick={() => {
                  setAttachedFile(null);
                  URL.revokeObjectURL(attachedImagePreview);
                  setAttachedImagePreview(null);
                }}
                className="chat-attachment-close"
              >
                ✕
              </button>
            </div>
          )}

          <div className="chat-input-bar">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageAttachment}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="icon-btn attach-btn"
              type="button"
              disabled={voiceStatus === "processing" || listening}
              aria-label={hi ? "छवि संलग्न करें" : "Attach Image"}
            >
              📷
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                listening 
                  ? (hi ? "सुन रहा हूँ... बोलें..." : "Listening... Speak...") 
                  : voiceStatus === "processing" 
                    ? (hi ? "आवाज संसाधित हो रही है..." : "Processing voice...") 
                    : (hi ? "सवाल टाइप करें..." : "Type your question...")
              }
              className="chat-input"
              disabled={voiceStatus === "processing" || listening}
            />
            {browserSupportsSpeechRecognition && (
              <button
                type="button"
                onClick={toggleListening}
                className={`icon-btn mic-btn ${listening ? "listening" : ""} ${voiceStatus === "processing" ? "processing" : ""}`}
                disabled={voiceStatus === "processing"}
                aria-label={listening ? "Stop listening" : "Start speaking"}
              >
                {listening ? (
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>■</span>
                ) : voiceStatus === "processing" ? (
                  <span className="animate-spin" style={{ fontSize: "14px" }}>⏳</span>
                ) : (
                  <span style={{ fontSize: "16px" }}>🎤</span>
                )}
              </button>
            )}
            <button
              onClick={() => send()}
              className="icon-btn send-btn"
              disabled={voiceStatus === "processing" || listening}
              aria-label={hi ? "भेजें" : "Send"}
            >
              ➤
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
