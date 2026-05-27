import { useState } from "react";

export default function DosageCalculator() {
  const [landSize, setLandSize] = useState(1);
  const [unit, setUnit] = useState("Acre");
  const [baseMedicine, setBaseMedicine] = useState(500); 
  const [baseWater, setBaseWater] = useState(150); 

  // Standard conversions to 1 Acre
  const conversions = {
    "Acre": 1,
    "Hectare": 2.471,
    "Bigha": 0.625, 
    "Katha": 0.03125 
  };

  const multiplier = landSize * conversions[unit] || 0;
  const totalMedicine = (baseMedicine * multiplier).toFixed(1);
  const totalWater = (baseWater * multiplier).toFixed(1);

  return (
    <div className="dosage-calc-container">
      <h4 className="dosage-calc-title">🧮 Custom Dosage Calculator</h4>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Enter the AI's "Per Acre" recommendation below, then select your actual land size to calculate your exact mix.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="dosage-calc-label">Medicine / Acre (ml/g)</label>
          <input 
            type="number" 
            value={baseMedicine} 
            onChange={e => setBaseMedicine(e.target.value)} 
            className="dosage-calc-input" 
          />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="dosage-calc-label">Water / Acre (Liters)</label>
          <input 
            type="number" 
            value={baseWater} 
            onChange={e => setBaseWater(e.target.value)} 
            className="dosage-calc-input" 
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="dosage-calc-label">Your Land Size</label>
          <input 
            type="number" 
            value={landSize} 
            onChange={e => setLandSize(e.target.value)} 
            className="dosage-calc-input" 
          />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="dosage-calc-label">Measurement Unit</label>
          <select 
            value={unit} 
            onChange={e => setUnit(e.target.value)} 
            className="dosage-calc-input"
          >
            {Object.keys(conversions).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dosage-calc-result">
        <p style={{ margin: 0, fontSize: 14 }}>
          For <strong>{landSize} {unit}</strong>, you need:
        </p>
        <h3>
          🧪 {totalMedicine} ml/g <span style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: "normal" }}>mixed into</span> 💧 {totalWater} Liters
        </h3>
      </div>
    </div>
  );
}
