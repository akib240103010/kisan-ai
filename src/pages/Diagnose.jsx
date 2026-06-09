import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import imageCompression from 'browser-image-compression';
const crops    = ["Wheat","Rice","Maize","Soybean","Potato","Tomato","Cotton","Mustard"];
const cropsHi  = ["गेहूं","चावल","मक्का","सोयाबीन","आलू","टमाटर","कपास","सरसों"];
const BASE     = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Diagnose({ lang }) {
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [imageBase64, setImageBase64]   = useState(null);
  const [imageType, setImageType]       = useState(null);
  const [preview, setPreview]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const hi = lang === "hi";

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("kisan_diagnose_guide_seen");
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        setShowGuideModal(true);
        localStorage.setItem("kisan_diagnose_guide_seen", "true");
      }, 400); // Smooth entry delay after page render
      return () => clearTimeout(timer);
    }
  }, []);

  async function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Instantly show the UI preview
    setImageType(file.type);
    setPreview(URL.createObjectURL(file));

    // 2. Set our compression rules
    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };

    try {
      // 3. Compress the image BEFORE converting it
      const compressedFile = await imageCompression(file, options);
      
      // 4. Now convert the tiny compressed file to Base64 text
      const reader = new FileReader();
      reader.onload = (ev) => setImageBase64(ev.target.result.split(",")[1]);
      reader.readAsDataURL(compressedFile);
      
    } catch (error) {
      console.error("Compression error:", error);
    }
  }
  async function diagnose() {
    setLoading(true);
    setResult(null);
    try {
      // 1. Call your new Vision backend
      const response = await fetch(`${BASE}/api/diagnose`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: imageBase64, 
          mimeType: imageType 
        })
      });
      const data = await response.json();
      
      // 2. Grab the AI's reply
      const text = data.reply || "Could not get diagnosis.";
      const lines = text.trim().split("\n");
      const first = lines[0];
      const rest  = lines.slice(1).filter(l => l.trim()).join("\n");
      const sev   = first.toLowerCase();
      const type  = sev.includes("severe") ? "danger" : sev.includes("moderate") ? "warning" : "success";
      setResult({ type, title: first, body: rest });
    } catch (err) {
      console.error("Diagnosis fetch error:", err);
      setResult({ type:"danger", title:"Connection error", body:"Could not reach the server. Make sure the backend is running." });
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">🌿 {hi ? "अपनी फसल चुनें" : "Select your crop"}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:4 }}>
          {crops.map((crop, i) => (
            <button 
              key={crop} 
              onClick={() => setSelectedCrop(crop)} 
              className={selectedCrop === crop ? "crop-btn active" : "crop-btn"}
            >
              {hi ? cropsHi[i] : crop}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📷 {hi ? "फसल की फोटो अपलोड करें" : "Upload crop photo"}</span>
          <button 
            type="button" 
            className="guide-toggle-btn"
            onClick={() => setShowGuideModal(true)}
          >
            💡 {hi ? "उपयोग निर्देश" : "How to Use"}
          </button>
        </div>
        <label className="upload-area">
            {/* If we have a picture, show the picture. If not, show the upload instructions */}
            {preview ? (
              <>
                <img src={preview} alt="preview" style={{ width:"100%", maxHeight:250, objectFit:"contain", borderRadius:10 }} />
                <p style={{ fontSize:13, marginTop:12, color:"#2e7d32", fontWeight:"bold" }}>
                  {hi ? "फोटो तैयार है ✅" : "Photo ready ✅"}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
                <p style={{ fontSize:13 }}>
                  {hi ? "यहाँ क्लिक करें" : "Tap to upload a photo of your crop"}
                </p>
                <p style={{ fontSize:11, marginTop:4, color:"#aaa" }}>
                  {hi ? "JPG या PNG · अधिकतम 5MB" : "JPG or PNG · Max 5MB"}
                </p>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImage} style={{ display:"none" }} />
          </label>

        <button className="action-btn" style={{ marginTop:14 }} onClick={diagnose} disabled={loading}>
          {loading ? (hi ? "⏳ विश्लेषण हो रहा है..." : "⏳ Analyzing...") : (hi ? "🔬 AI से रोग पहचानें" : "🔬 Diagnose with AI")}
        </button>

        {result && (
          <div className={`result-box ${result.type}`}>
            <div className={`result-title ${result.type}`}>{result.title}</div>
            <div className="result-body markdown-styles" style={{ marginTop:"12px", lineHeight:"1.6" }}><ReactMarkdown>{result.body}</ReactMarkdown>
</div>
          </div>
        )}
      </div>

      {showGuideModal && (
        <div className="guide-modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="guide-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="guide-modal-header">
              <h3>💡 {hi ? "फोटो निर्देश और सहायता" : "Crop Diagnosis Guide"}</h3>
              <button type="button" className="guide-modal-close" onClick={() => setShowGuideModal(false)}>✕</button>
            </div>
            
            <div className="guide-steps">
              <div className="guide-step">
                <div className="step-badge">
                  <span className="step-number">1</span>
                </div>
                <div className="step-icon">📸</div>
                <div className="step-content">
                  <h4>{hi ? "फसल का चयन और फोटो" : "Crop Selection & Capture"}</h4>
                  <p>{hi ? "पहले सही फसल का चयन करें, फिर पत्ते या तने के प्रभावित हिस्से पर ध्यान केंद्रित करते हुए एक स्पष्ट और नज़दीकी फोटो लें।" : "Select the correct crop type first, then capture or select a clear, close-up image focusing on the affected area of the leaf or stem."}</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-badge">
                  <span className="step-number">2</span>
                </div>
                <div className="step-icon">☀️</div>
                <div className="step-content">
                  <h4>{hi ? "अच्छी रोशनी और फोकस" : "Good Lighting & Focus"}</h4>
                  <p>{hi ? "दिन के उजाले में फोटो लें या फ़्लैश का उपयोग करें। धुंधली या बहुत तेज़ रोशनी वाली तस्वीरों से बचें।" : "Ensure daylight conditions or use flash. Avoid blurry or extremely bright photos."}</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-badge">
                  <span className="step-number">3</span>
                </div>
                <div className="step-icon">🔬</div>
                <div className="step-content">
                  <h4>{hi ? "रोग की पहचान और समाधान" : "Diagnose & Resolve"}</h4>
                  <p>{hi ? "तुरंत फसल विश्लेषण और जैविक उपचार पाने के लिए \"AI से रोग पहचानें\" पर क्लिक करें।" : "Click on \"Diagnose with AI\" to get the immediate crop analysis and organic remedies."}</p>
                </div>
              </div>
            </div>

            <button type="button" className="guide-got-it-btn" onClick={() => setShowGuideModal(false)}>
              {hi ? "समझ गया" : "Got It"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
