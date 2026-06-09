import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function SchemeAnnouncement() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let timer;
    async function fetchAnnouncement() {
      try {
        const res = await fetch(`${BASE}/api/announcements`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          
          // Trigger the 3-second delay popup after successful fetch
          timer = setTimeout(() => {
            setShow(true);
          }, 3000);
        }
      } catch (err) {
        console.error("Failed to fetch scheme announcement:", err);
      }
    }
    fetchAnnouncement();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!show || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-scale-in">
        {/* Modal Header */}
        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-semibold text-base flex items-center gap-2 m-0">
            📢 {data.title ? "New Scheme" : "Government Scheme Notification"}
          </h3>
          <button 
            onClick={() => setShow(false)} 
            className="text-white/80 hover:text-white text-lg font-bold border-none bg-transparent cursor-pointer outline-none focus:ring-2 focus:ring-white/50 rounded p-1 flex items-center justify-center"
            aria-label="Close Announcement"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-lg mb-2 mt-0">
            {data.title}
          </h4>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-5 mt-0">
            {data.description}
          </p>
          
          {/* Footer actions */}
          <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <span>Last Updated: {data.lastUpdated}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setShow(false)}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400/50"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.open("https://pmkisan.gov.in", "_blank");
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-none text-xs font-semibold shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
