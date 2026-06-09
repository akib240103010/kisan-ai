import { useState } from "react";

// Crop Milestones relative to sowing date (day offset)
const CROP_MILESTONES = {
  wheat: [
    { days: 0, labelEn: "Sowing / बुवाई", category: "sowing", descEn: "Sow wheat seeds in moist soil (ideal depth: 4-5 cm).", descHi: "गीली मिट्टी में गेहूं के बीज बोएं (आदर्श गहराई: 4-5 सेमी)।" },
    { days: 21, labelEn: "Crown Root Irrigation (CRI)", category: "irrigation", descEn: "First irrigation at CRI stage is critical. Do not delay.", descHi: "ताज जड़ दीक्षा (CRI) चरण में पहली सिंचाई बहुत महत्वपूर्ण है।" },
    { days: 35, labelEn: "First Urea Top-dress", category: "fertilizer", descEn: "Apply first dose of Urea top-dressing at tillering stage.", descHi: "कले फूटते समय यूरिया की पहली खुराक का छिड़काव करें।" },
    { days: 45, labelEn: "Second Irrigation", category: "irrigation", descEn: "Irrigate at late tillering / jointing stage.", descHi: "देर से कल्ले फूटने/गांठ बनने की अवस्था पर दूसरी सिंचाई करें।" },
    { days: 60, labelEn: "Second Urea Top-dress", category: "fertilizer", descEn: "Apply second dose of Urea top-dressing at jointing/booting stage.", descHi: "गांठ/बूटिंग चरण में यूरिया की दूसरी खुराक का छिड़काव करें।" },
    { days: 80, labelEn: "Flowering Irrigation", category: "irrigation", descEn: "Irrigate during flowering stage to ensure healthy grain formation.", descHi: "स्वस्थ अनाज बनने के लिए फूल आने की अवस्था के दौरान सिंचाई करें।" },
    { days: 100, labelEn: "Milking Stage Irrigation", category: "irrigation", descEn: "Irrigate during milk/dough stage for full grain filling.", descHi: "दाना भरने के लिए दूधिया अवस्था के दौरान अंतिम सिंचाई करें।" },
    { days: 125, labelEn: "Harvest", category: "harvest", descEn: "Harvest crop when grain is hard and straw turns golden dry.", descHi: "फसल की कटाई तब करें जब दाने कड़े हो जाएं और भूसा सुनहरा सूखा हो जाए।" }
  ],
  rice: [
    { days: 0, labelEn: "Nursery Sowing", category: "sowing", descEn: "Sow seeds in the nursery bed with proper organic treatment.", descHi: "उचित जैविक उपचार के साथ नर्सरी बेड में धान के बीज बोएं।" },
    { days: 25, labelEn: "Transplanting", category: "planting", descEn: "Transplant 25-30 days old seedlings to the puddled field.", descHi: "25-30 दिन पुराने पौधों को पानी भरे खेत (कीचड़दार खेत) में रोपें।" },
    { days: 35, labelEn: "Herbicide & Irrigation", category: "irrigation", descEn: "Apply weed control and maintain shallow water level (2-3 cm).", descHi: "खरपतवार नियंत्रण लागू करें और उथले पानी का स्तर (2-3 सेमी) बनाए रखें।" },
    { days: 50, labelEn: "First Urea Top-dress", category: "fertilizer", descEn: "Apply nitrogen fertilizer during active tillering stage.", descHi: "सक्रिय कल्ले फूटने के चरण के दौरान नाइट्रोजन उर्वरक का उपयोग करें।" },
    { days: 75, labelEn: "Panicle Initiation Fertilizer", category: "fertilizer", descEn: "Top-dress fertilizer at panicle initiation stage for higher yield.", descHi: "अधिक उपज के लिए बाली निकलने के शुरुआती चरण में खाद का छिड़काव करें।" },
    { days: 95, labelEn: "Flowering Water Management", category: "irrigation", descEn: "Maintain water depth of 2-5 cm during flowering.", descHi: "फूल आने के दौरान 2-5 सेमी पानी की गहराई बनाए रखें।" },
    { days: 120, labelEn: "Harvest", category: "harvest", descEn: "Drain water 10 days before harvesting. Harvest when 80% grains are straw colored.", descHi: "कटाई से 10 दिन पहले पानी निकाल दें। 80% दाने सुनहरे होने पर कटाई करें।" }
  ],
  maize: [
    { days: 0, labelEn: "Sowing", category: "sowing", descEn: "Sow seeds at 3-5 cm depth with proper row-to-row spacing.", descHi: "उचित दूरी के साथ 3-5 सेमी की गहराई पर मक्का के बीज बोएं।" },
    { days: 20, labelEn: "First Weeding & Hoeing", category: "weeding", descEn: "Remove weeds and loosen soil to assist root growth.", descHi: "खरपतवार निकालें और जड़ों के विकास में सहायता के लिए मिट्टी ढीली करें।" },
    { days: 30, labelEn: "First Urea Top-dress", category: "fertilizer", descEn: "Apply first dose of nitrogen fertilizer at knee-high stage.", descHi: "घुटने की ऊंचाई तक आने पर नाइट्रोजन उर्वरक की पहली खुराक दें।" },
    { days: 55, labelEn: "Irrigation (Tasseling stage)", category: "irrigation", descEn: "Critical irrigation at tasseling stage. Avoid water stress.", descHi: "नरमंजरी अवस्था में सिंचाई अत्यंत आवश्यक है। पानी की कमी न होने दें।" },
    { days: 75, labelEn: "Irrigation (Silking stage)", category: "irrigation", descEn: "Provide irrigation at grain filling and silking stage.", descHi: "दाना भरने और सिल्क निकलने की अवस्था में सिंचाई प्रदान करें।" },
    { days: 100, labelEn: "Harvest", category: "harvest", descEn: "Harvest when husks turn yellow/dry and grains are hard.", descHi: "जब भुट्टे के छिलके पीले/सूखे हो जाएं और दाने कड़े हो जाएं तो कटाई करें।" }
  ],
  mustard: [
    { days: 0, labelEn: "Sowing", category: "sowing", descEn: "Sow seeds at 2-3 cm depth in row arrangement.", descHi: "कतारों में 2-3 सेमी गहराई पर सरसों के बीज बोएं।" },
    { days: 25, labelEn: "Thinning & Weeding", category: "weeding", descEn: "Maintain 10-12 cm plant-to-plant distance by thinning excess seedlings.", descHi: "अतिरिक्त पौधों को छांटकर पौधों के बीच 10-12 सेमी की दूरी बनाए रखें।" },
    { days: 35, labelEn: "First Irrigation & Fertilizer", category: "irrigation", descEn: "Irrigate 30-35 days after sowing and top-dress nitrogen fertilizer.", descHi: "बुवाई के 30-35 दिन बाद सिंचाई करें और नाइट्रोजन खाद का छिड़काव करें।" },
    { days: 70, labelEn: "Second Irrigation", category: "irrigation", descEn: "Irrigate at pod-filling stage if soil moisture is dry.", descHi: "यदि मिट्टी में नमी कम हो, तो फली भरने के चरण में दूसरी सिंचाई करें।" },
    { days: 115, labelEn: "Harvest", category: "harvest", descEn: "Harvest when siliquae turn golden-yellow and seeds turn reddish-brown.", descHi: "जब फलियां सुनहरी-पीली हो जाएं और बीज लाल-भूरे रंग के होने लगें तो कटाई करें।" }
  ],
  potato: [
    { days: 0, labelEn: "Sowing (Planting tubers)", category: "sowing", descEn: "Plant healthy sprouted tubers in ridges.", descHi: "मेड़ों (ridges) में स्वस्थ अंकुरित आलू के कंद बोएं।" },
    { days: 25, labelEn: "First Irrigation & Earthing Up", category: "irrigation", descEn: "Earth up soil around plants and irrigate lightly.", descHi: "पौधों के चारों ओर मिट्टी चढ़ाएं (Earthing up) और हल्की सिंचाई करें।" },
    { days: 45, labelEn: "Second Irrigation & Nitrogen", category: "irrigation", descEn: "Irrigate and apply top-dressed nitrogen fertilizer.", descHi: "सिंचाई करें और नाइट्रोजन उर्वरक (यूरिया) का छिड़काव करें।" },
    { days: 70, labelEn: "Irrigation (Tuber bulking)", category: "irrigation", descEn: "Maintain uniform soil moisture for good tuber size development.", descHi: "अच्छे कंद आकार के विकास के लिए मिट्टी में एकसमान नमी बनाए रखें।" },
    { days: 95, labelEn: "Dehalming", category: "harvest", descEn: "Cut potato vines 10-12 days before harvest to harden the skin.", descHi: "छिलका सख्त करने के लिए कटाई से 10-12 दिन पहले बेल काट दें (Dehalming)।" },
    { days: 105, labelEn: "Harvest", category: "harvest", descEn: "Dig out potatoes carefully to prevent skin bruising.", descHi: "आलू को छिलने से बचाने के लिए सावधानीपूर्वक खुदाई करें।" }
  ]
};

const DEFAULT_SOWING = {
  wheat: "2026-11-15",
  rice: "2026-06-01",
  maize: "2026-06-15",
  mustard: "2026-10-15",
  potato: "2026-10-20"
};

const calData = {
  wheat: {
    noteEn: "Sow: Nov 10–25 · Irrigate at 21 days · Urea at tillering · Harvest: Mar",
    noteHi: "बुवाई: 10–25 नवंबर · 21 दिन पर सिंचाई · टिलरिंग पर यूरिया · कटाई: मार्च"
  },
  rice: {
    noteEn: "Sow nursery: Jun · Transplant: Jul · Harvest: Sep–Oct",
    noteHi: "नर्सरी बुवाई: जून · रोपाई: जुलाई · कटाई: सितंबर-अक्टूबर"
  },
  maize: {
    noteEn: "Sow: Jun with monsoon · Top-dress urea · Harvest: Sep",
    noteHi: "बुवाई: जून (मानसून के साथ) · यूरिया छिड़काव · कटाई: सितंबर"
  },
  mustard: {
    noteEn: "Sow: Oct 1–15 · Irrigate at flowering · Harvest: Feb",
    noteHi: "बुवाई: 1–15 अक्टूबर · फूल आने पर सिंचाई · कटाई: फरवरी"
  },
  potato: {
    noteEn: "Sow: Oct–Nov · Earth up at 30 days · Harvest: Jan–Feb",
    noteHi: "बुवाई: अक्टूबर-नवंबर · 30 दिन पर मिट्टी चढ़ाना · खुदाई: जनवरी-फरवरी"
  }
};

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_HI = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

const CATEGORY_LABELS = {
  sowing: { en: "Sowing", hi: "बुवाई", color: "#0C447C", bg: "#E6F1FB" },
  planting: { en: "Planting", hi: "रोपाई", color: "#0C447C", bg: "#E6F1FB" },
  weeding: { en: "Weeding", hi: "निराई-गुड़ाई", color: "#7c2d12", bg: "#ffedd5" },
  irrigation: { en: "Irrigation", hi: "सिंचाई", color: "#0369a1", bg: "#e0f2fe" },
  fertilizer: { en: "Fertilizer", hi: "खाद-उर्वरक", color: "#15803d", bg: "#dcfce7" },
  harvest: { en: "Harvest", hi: "कटाई/खुदाई", color: "#b45309", bg: "#fef3c7" },
  maintenance: { en: "Maintenance", hi: "रखरखाव", color: "#4b5563", bg: "#f3f4f6" },
  market: { en: "Market Visit", hi: "मंडी यात्रा", color: "#6d28d9", bg: "#f3e8ff" },
  other: { en: "Other", hi: "अन्य", color: "#374151", bg: "#f3f4f6" }
};

const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayStr = formatDateLocal(new Date());

export default function Calendar({ lang }) {
  const [crop, setCrop] = useState("wheat");
  const [sowingDate, setSowingDate] = useState(DEFAULT_SOWING.wheat);
  
  // Parse initial sowing date for wheat to initialize currentMonth, currentYear, and selectedDate
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [, m] = DEFAULT_SOWING.wheat.split("-").map(Number);
    return m - 1;
  });
  const [currentYear, setCurrentYear] = useState(() => {
    const [y] = DEFAULT_SOWING.wheat.split("-").map(Number);
    return y;
  });
  const [selectedDate, setSelectedDate] = useState(DEFAULT_SOWING.wheat);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("irrigation");

  // Load custom tasks
  const [customTasks, setCustomTasks] = useState(() => {
    const saved = localStorage.getItem("kisan_calendar_tasks");
    return saved ? JSON.parse(saved) : {};
  });

  const hi = lang === "hi";
  const data = calData[crop];

  const handleCropChange = (e) => {
    const newCrop = e.target.value;
    setCrop(newCrop);
    const newSow = DEFAULT_SOWING[newCrop];
    setSowingDate(newSow);
    
    // Sync calendar view month/year to sowing date
    const [y, m] = newSow.split("-").map(Number);
    setCurrentMonth(m - 1);
    setCurrentYear(y);
    setSelectedDate(newSow);
  };

  const handleSowingDateChange = (e) => {
    const newSow = e.target.value;
    setSowingDate(newSow);
    
    // Sync calendar view month/year to sowing date
    if (newSow) {
      const [y, m] = newSow.split("-").map(Number);
      setCurrentMonth(m - 1);
      setCurrentYear(y);
      setSelectedDate(newSow);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Date math dynamic milestone getter
  const getMilestonesForDate = (dateStr) => {
    const list = CROP_MILESTONES[crop] || [];
    const [sYear, sMonth, sDay] = sowingDate.split("-").map(Number);

    return list
      .map(m => {
        const d = new Date(sYear, sMonth - 1, sDay + m.days);
        const mDateStr = formatDateLocal(d);
        return { ...m, dateStr: mDateStr };
      })
      .filter(m => m.dateStr === dateStr);
  };

  const getCustomTasksForDate = (dateStr) => {
    return customTasks[dateStr] || [];
  };

  const getCategoryInfo = (cat) => {
    return CATEGORY_LABELS[cat] || CATEGORY_LABELS.other;
  };

  const getFormattedSelectedDate = () => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const monthName = hi ? MONTHS_HI[m - 1] : MONTHS_EN[m - 1];
    return hi ? `${d} ${monthName} ${y}` : `${monthName} ${d}, ${y}`;
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: formTitle.trim(),
      category: formCategory
    };

    const updated = {
      ...customTasks,
      [selectedDate]: [...(customTasks[selectedDate] || []), newTask]
    };

    setCustomTasks(updated);
    localStorage.setItem("kisan_calendar_tasks", JSON.stringify(updated));
    setFormTitle("");
  };

  const handleDeleteTask = (dateKey, taskId) => {
    const updatedTasksForDate = (customTasks[dateKey] || []).filter(t => t.id !== taskId);
    
    const updated = { ...customTasks };
    if (updatedTasksForDate.length === 0) {
      delete updated[dateKey];
    } else {
      updated[dateKey] = updatedTasksForDate;
    }
    
    setCustomTasks(updated);
    localStorage.setItem("kisan_calendar_tasks", JSON.stringify(updated));
  };

  // Gather weekly Alerts starting from today to today + 6 days
  const getWeeklyAlerts = () => {
    const alerts = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateStr = formatDateLocal(d);
      
      const ms = getMilestonesForDate(dateStr);
      const ts = getCustomTasksForDate(dateStr);
      
      ms.forEach(m => {
        alerts.push({
          date: dateStr,
          type: "milestone",
          label: hi ? m.labelHi || m.labelEn : m.labelEn,
          desc: hi ? m.descHi || m.descEn : m.descEn,
          category: m.category,
          dateObj: d
        });
      });
      
      ts.forEach(t => {
        alerts.push({
          date: dateStr,
          type: "custom",
          label: t.title,
          desc: hi ? `श्रेणी: ${getCategoryInfo(t.category).hi}` : `Category: ${getCategoryInfo(t.category).en}`,
          category: t.category,
          dateObj: d
        });
      });
    }
    
    return alerts.sort((a, b) => a.dateObj - b.dateObj);
  };

  // Monthly Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells = [...blanks, ...days];
  const weekdays = hi ? WEEKDAYS_HI : WEEKDAYS_EN;

  return (
    <div>
      {/* 1. Crop Cycle Timeline Setup Card */}
      <div className="card">
        <div className="card-title">🌱 {hi ? "फसल कैलेंडर और शेड्यूलर" : "Crop Calendar & Scheduler"}</div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              {hi ? "फसल चुनें" : "Select Crop"}
            </label>
            <select
              value={crop}
              onChange={handleCropChange}
              className="kisan-input"
            >
              <option value="wheat">Wheat / गेहूं</option>
              <option value="rice">Rice / चावल</option>
              <option value="maize">Maize / मक्का</option>
              <option value="mustard">Mustard / सरसों</option>
              <option value="potato">Potato / आलू</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              {hi ? "बुवाई की तारीख" : "Sowing Date"}
            </label>
            <input 
              type="date"
              className="kisan-input"
              value={sowingDate}
              onChange={handleSowingDateChange}
            />
          </div>
        </div>

        <div className="note-box" style={{ margin: 0 }}>
          📌 <strong>{hi ? "परामर्श:" : "Advisory:"}</strong> {hi ? data.noteHi : data.noteEn}
        </div>
      </div>

      {/* 2. Interactive Calendar Grid Card */}
      <div className="card">
        <div className="calendar-header">
          <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <span className="calendar-month-year">
            {hi ? `${MONTHS_HI[currentMonth]} ${currentYear}` : `${MONTHS_EN[currentMonth]} ${currentYear}`}
          </span>
          <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>

        <div className="calendar-weekdays">
          {weekdays.map(d => (
            <div key={d} className="weekday">{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} className="calendar-day empty"></div>;
            }

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;

            const dayMilestones = getMilestonesForDate(dateStr);
            const dayTasks = getCustomTasksForDate(dateStr);

            return (
              <div 
                key={dateStr}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <span className="day-number">{day}</span>
                <div className="indicator-dots">
                  {dayMilestones.length > 0 && <span className="dot dot-milestone" title={hi ? "अनुशंसित मील का पत्थर" : "Recommended Milestone"}></span>}
                  {dayTasks.length > 0 && <span className="dot dot-custom" title={hi ? "कस्टम कृषि कार्य" : "Custom Agri Task"}></span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="dot dot-milestone"></span>
            <span>{hi ? "अनुशंसित मील का पत्थर" : "Recommended Milestone"}</span>
          </div>
          <div className="legend-item">
            <span className="dot dot-custom"></span>
            <span>{hi ? "कस्टम कार्य" : "Custom Task"}</span>
          </div>
        </div>
      </div>

      {/* 3. Selected Date Details Card */}
      <div className="card">
        <div className="card-title">📋 {hi ? "कार्य एवं नोट्स - " : "Tasks & Notes - "}{getFormattedSelectedDate()}</div>
        
        <div className="day-tasks-list">
          {/* Render calculated milestones */}
          {getMilestonesForDate(selectedDate).map((m, idx) => {
            const catInfo = getCategoryInfo(m.category);
            return (
              <div key={`milestone-${idx}`} className="task-item milestone" style={{ borderLeft: `4px solid ${catInfo.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="task-category-badge" style={{ background: catInfo.bg, color: catInfo.color }}>
                        {hi ? catInfo.hi : catInfo.en}
                      </span>
                      <strong className="task-title-text">{hi ? m.labelHi || m.labelEn : m.labelEn}</strong>
                    </div>
                    <p className="task-desc">{hi ? m.descHi || m.descEn : m.descEn}</p>
                  </div>
                  <span className="rec-badge">
                    {hi ? "अनुशंसित" : "Recommended"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Render custom tasks */}
          {getCustomTasksForDate(selectedDate).map((t) => {
            const catInfo = getCategoryInfo(t.category);
            return (
              <div key={t.id} className="task-item custom" style={{ borderLeft: `4px solid ${catInfo.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="task-category-badge" style={{ background: catInfo.bg, color: catInfo.color }}>
                      {hi ? catInfo.hi : catInfo.en}
                    </span>
                    <strong className="task-title-text">{t.title}</strong>
                  </div>
                  <button 
                    type="button"
                    className="delete-task-btn"
                    onClick={() => handleDeleteTask(selectedDate, t.id)}
                    title={hi ? "हटाएं" : "Delete"}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {getMilestonesForDate(selectedDate).length === 0 && getCustomTasksForDate(selectedDate).length === 0 && (
            <p className="no-tasks-text">
              {hi ? "इस तारीख पर कोई कार्य या मील का पत्थर नहीं है।" : "No tasks or milestones scheduled for this date."}
            </p>
          )}
        </div>

        {/* Task logging form */}
        <form onSubmit={handleAddTask} className="task-log-form">
          <h4 className="form-sub-title">
            ➕ {hi ? "कस्टम कृषि कार्य जोड़ें" : "Add Custom Agri Task"}
          </h4>
          <div className="task-form-inputs">
            <input 
              type="text" 
              className="kisan-input input-task-title" 
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={hi ? "उदा. मंडी यात्रा, ट्रैक्टर सर्विसिंग..." : "e.g., Tractor servicing, Seed shopping..."}
              required
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="kisan-input select-task-category"
            >
              <option value="irrigation">{hi ? "सिंचाई" : "Irrigation"}</option>
              <option value="fertilizer">{hi ? "खाद-उर्वरक" : "Fertilizer"}</option>
              <option value="maintenance">{hi ? "रखरखाव" : "Maintenance"}</option>
              <option value="market">{hi ? "मंडी यात्रा" : "Market Visit"}</option>
              <option value="other">{hi ? "अन्य" : "Other"}</option>
            </select>
            <button type="submit" className="action-btn btn-save-task">
              {hi ? "सहेजें" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* 4. Weekly Agri-Alerts Summary Card */}
      <div className="card">
        <div className="card-title">🔔 {hi ? "इस सप्ताह के कृषि अलर्ट (आगामी कार्य)" : "Weekly Agri-Alerts (Upcoming Tasks)"}</div>
        <div className="weekly-alerts-list">
          {getWeeklyAlerts().length > 0 ? (
            getWeeklyAlerts().map((alert, idx) => {
              const catInfo = getCategoryInfo(alert.category);
              const [, m, d] = alert.date.split("-").map(Number);
              const dateLabel = hi 
                ? `${d} ${MONTHS_HI[m - 1].substring(0, 3)}` 
                : `${MONTHS_EN[m - 1].substring(0, 3)} ${d}`;

              const isAlertToday = alert.date === todayStr;

              return (
                <div key={idx} className={`alert-item-card ${isAlertToday ? 'today-alert' : ''}`} style={{ borderLeftColor: catInfo.color }}>
                  <div className="alert-item-left">
                    <span className="alert-date-badge">{dateLabel}</span>
                    <span className="alert-category-badge" style={{ background: catInfo.bg, color: catInfo.color }}>
                      {hi ? catInfo.hi : catInfo.en}
                    </span>
                  </div>
                  <div className="alert-item-right">
                    <div className="alert-item-title">
                      {alert.label} 
                      {isAlertToday && <span className="today-tag">{hi ? " (आज)" : " (Today)"}</span>}
                    </div>
                    <div className="alert-item-desc">{alert.desc}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-alerts">
              🌾 {hi 
                ? "इस सप्ताह कोई आगामी कार्य नहीं है। कैलेंडर पर तारीख दबाकर कोई नया कार्य जोड़ें!" 
                : "No tasks scheduled for this week. Tap a date on the calendar to add one!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
