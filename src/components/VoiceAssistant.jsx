import 'regenerator-runtime/runtime';
import { useState, useEffect, useRef, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Text-to-Speech playback helper.
 * Designed to be easily swappable with a cloud service (e.g., Google Cloud TTS) for Bhojpuri in production.
 */
const playTTS = (text, langCode) => {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech Synthesis is not supported in this browser.");
    return;
  }

  // Cancel any active speech to avoid queuing
  window.speechSynthesis.cancel();

  // PRODUCTION UPGRADE PATH:
  // If you integrate Google Cloud TTS, you would make an API call here:
  // fetch(`${BASE}/api/tts`, { method: 'POST', body: JSON.stringify({ text, lang: langCode }) })
  //   .then(res => res.json())
  //   .then(data => {
  //      const audio = new Audio(data.audioUrl);
  //      audio.play();
  //   });
  // return;

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language code (e.g. 'hi-IN', 'en-US')
  utterance.lang = langCode;

  // Try to find a matching installed browser voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(
    v => v.lang.toLowerCase().replace("_", "-") === langCode.toLowerCase()
  ) || voices.find(v => v.lang.startsWith(langCode.substring(0, 2)));

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  // Speak
  window.speechSynthesis.speak(utterance);
};

// Standard language config options
const langConfig = {
  "en-US": { apiLang: "en", ttsLang: "en-US", label: "English" },
  "hi-IN": { apiLang: "hi", ttsLang: "hi-IN", label: "Hindi" },
  "bho-IN": { apiLang: "hi", ttsLang: "hi-IN", label: "Bhojpuri (Hindi TTS fallback)" } // fallback to Hindi tts voice
};

export default function VoiceAssistant({ sessionId, setMessages, setSessions, weather }) {
  const [selectedLang, setSelectedLang] = useState("hi-IN");
  const [status, setStatus] = useState("idle"); // idle | listening | processing | speaking
  const lastSpeechRef = useRef("");

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const sendSpeechQuery = useCallback(async (queryText) => {
    setStatus("processing");
    
    // 1. Instantly display user's recognized speech in the messages feed
    setMessages(prev => [...prev, { role: "user", text: `🎙️ ${queryText}` }]);

    try {
      const config = langConfig[selectedLang];
      const formData = new FormData();
      formData.append("message", queryText);
      formData.append("lang", config.apiLang);
      formData.append("isAudio", "true"); // Optimize prompt for spoken response
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }
      if (weather) {
        formData.append("weatherTemp", weather.temp || "");
        formData.append("weatherHumidity", weather.humidity || "");
        formData.append("weatherWind", weather.wind || "");
        formData.append("weatherRain", weather.rain || "");
        formData.append("weatherDesc", weather.description || "");
      }

      // 2. Fetch response from existing Gemini backend
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.success && data.data) {
        const info = data.data;
        let textReply = info.immediate_action || "No response received.";
        
        let markdownReply = textReply;
        if (info.disease_name && info.disease_name !== "General Advice" && info.disease_name !== "N/A") {
          markdownReply = `### 🚨 ${info.disease_name} (${info.confidence_score})\n\n**⚡ Immediate Action:** ${info.immediate_action}\n\n**🧪 Chemical Cure:** ${info.chemical_cure}\n\n**🌿 Organic Cure:** ${info.organic_cure}\n\n**💧 Dosage:** ${info.dosage_per_acre}`;
        }

        // Add bot message to list
        setMessages(prev => [...prev, { role: "bot", text: markdownReply }]);

        // Update session list title if a new title was generated
        if (data.newTitle) {
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: data.newTitle } : s));
        }

        // 3. Play audio feedback (using immediate action text for a clean, short spoken summary)
        setStatus("speaking");
        playTTS(textReply, config.ttsLang);
      } else {
        throw new Error("API call unsuccessful");
      }
    } catch (err) {
      console.error("VoiceAssistant Query Error:", err);
      const errText = selectedLang.startsWith("hi") ? "माफ करें, मैं सर्वर से कनेक्ट नहीं हो सका।" : "Sorry, I could not connect to the server.";
      setMessages(prev => [...prev, { role: "bot", text: errText }]);
      playTTS(errText, selectedLang);
      setStatus("idle");
    }
  }, [sessionId, selectedLang, setMessages, setSessions, weather]);

  // Monitor listening transition to submit query
  useEffect(() => {
    if (!listening && transcript.trim() !== "") {
      const capturedText = transcript.trim();
      if (capturedText !== lastSpeechRef.current) {
        lastSpeechRef.current = capturedText;
        sendSpeechQuery(capturedText);
      }
    }
  }, [listening, transcript, sendSpeechQuery]);

  // Handle TTS browser voices load delay
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setStatus("idle");
    } else {
      resetTranscript();
      lastSpeechRef.current = "";
      setStatus("listening");
      // Stop any active TTS speaking
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      SpeechRecognition.startListening({
        language: selectedLang,
        continuous: false
      });
    }
  };
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="card border border-rose-200 bg-rose-50/50 p-4 rounded-xl text-rose-800 dark:text-rose-400 dark:bg-zinc-900/50 dark:border-rose-900/30 text-xs mb-4">
        ⚠️ Voice Assistant: Your browser does not support speech recognition. Try Google Chrome.
      </div>
    );
  }

  return (
    <div className="card p-4 rounded-xl border border-emerald-100 dark:border-zinc-800 bg-emerald-50/20 dark:bg-zinc-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 m-0 flex items-center gap-1.5">
          🎙️ Multilingual Voice Assistant
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 m-0">
          Speak your farming questions in English, Hindi, or Bhojpuri.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Language selector dropdown */}
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="kisan-input text-xs"
          style={{ width: "160px", padding: "6px 10px" }}
          disabled={listening}
        >
          <option value="en-US">English (en-US)</option>
          <option value="hi-IN">Hindi (hi-IN)</option>
          <option value="bho-IN">Bhojpuri (bho-IN)</option>
        </select>

        {/* Mic toggle button with visual animations */}
        <button
          onClick={toggleListening}
          className={`flex items-center justify-center w-10 h-10 rounded-full border-none cursor-pointer transition-all duration-300 outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            listening 
              ? "bg-red-500 text-white animate-pulse" 
              : status === "processing" 
                ? "bg-amber-500 text-white" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          }`}
          aria-label={listening ? "Stop listening" : "Start speaking"}
          disabled={status === "processing"}
        >
          {listening ? (
            <span className="text-xs font-bold">■</span>
          ) : status === "processing" ? (
            <span className="text-xs font-bold animate-spin">⏳</span>
          ) : (
            <span className="text-sm">🎤</span>
          )}
        </button>

        {/* Status display indicator */}
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 min-w-[70px]">
          {listening ? (
            <span className="text-red-500 font-bold">Listening...</span>
          ) : status === "processing" ? (
            <span className="text-amber-500">Processing...</span>
          ) : status === "speaking" ? (
            <span className="text-emerald-600 font-bold">Speaking...</span>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>
    </div>
  );
}
