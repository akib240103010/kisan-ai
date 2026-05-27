import { useState } from "react";

const calData = {
  wheat: {
    months: [null, "g", "h", null, null, null, null, null, null, null, "s", "g"],
    note: "Sow: Nov 10–25 · Irrigate at 21 days · Urea at tillering · Harvest: Mar",
  },
  rice: {
    months: ["g", null, null, null, null, "s", "g", "g", "h", null, null, null],
    note: "Sow nursery: Jun · Transplant: Jul · Harvest: Sep–Oct",
  },
  maize: {
    months: [null, null, null, null, null, "s", "g", "g", "h", null, null, null],
    note: "Sow: Jun with monsoon · Top-dress urea · Harvest: Sep",
  },
  mustard: {
    months: ["h", null, null, null, null, null, null, null, null, "s", "g", "g"],
    note: "Sow: Oct 1–15 · Irrigate at flowering · Harvest: Feb",
  },
  potato: {
    months: ["g", "h", null, null, null, null, null, null, null, "s", "s", "g"],
    note: "Sow: Oct–Nov · Earth up at 30 days · Harvest: Jan–Feb",
  },
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pillStyle = {
  s: { background: "#E6F1FB", color: "#0C447C", label: "Sow" },
  g: { background: "#EAF3DE", color: "#27500A", label: "Grow" },
  h: { background: "#FAEEDA", color: "#633806", label: "Harvest" },
  r: { background: "#F1EFE8", color: "#5F5E5A", label: "Rest" },
};

export default function Calendar({ lang }) {
  const [crop, setCrop] = useState("wheat");
  const hi = lang === "hi";
  const data = calData[crop];

  return (
    <div>
      <div className="card">
        <div className="card-title">🌱 {hi ? "फसल कैलेंडर — बिहार" : "Crop Calendar — Bihar"}</div>

        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="kisan-input"
          style={{ marginBottom: 14 }}
        >
          <option value="wheat">Wheat / गेहूं</option>
          <option value="rice">Rice / चावल</option>
          <option value="maize">Maize / मक्का</option>
          <option value="mustard">Mustard / सरसों</option>
          <option value="potato">Potato / आलू</option>
        </select>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {Object.values(pillStyle).map((p) => (
            <span
              key={p.label}
              style={{ background: p.background, color: p.color, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}
            >
              {p.label}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
          {data.months.map((m, i) => {
            const key = m || "r";
            const p = pillStyle[key];
            return (
              <div key={i} className="month-card">
                <div className="month-card-title">{months[i]}</div>
                <span
                  style={{
                    background: p.background,
                    color: p.color,
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="note-box">📌 {data.note}</div>
      </div>
    </div>
  );
}
