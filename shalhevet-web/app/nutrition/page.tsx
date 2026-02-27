import { Apple, Plus, Search, Flame, Beef, Wheat, Droplets } from "lucide-react";

const macros = [
  { label: "קלוריות",  value: "0", unit: 'קק"ל', icon: Flame,    color: "text-orange-400", bg: "bg-orange-500/10" },
  { label: "חלבון",    value: "0", unit: "גרם",   icon: Beef,     color: "text-red-400",    bg: "bg-red-500/10"    },
  { label: "פחמימות",  value: "0", unit: "גרם",   icon: Wheat,    color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { label: "שומן",     value: "0", unit: "גרם",   icon: Droplets, color: "text-sky-400",    bg: "bg-sky-500/10"    },
];

export default function NutritionPage() {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary">תזונה</h1>
          <p className="text-text-muted text-sm">מעקב קלוריות ומאקרו</p>
        </div>
        <button
          type="button"
          aria-label="הוסיפי ארוחה חדשה"
          className="bg-accent hover:bg-accent-dark text-white p-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </header>

      {/* Macro cards */}
      <section aria-label="סיכום מאקרו-נוטריאנטים היום">
        <dl className="grid grid-cols-2 gap-3 mb-6">
          {macros.map(({ label, value, unit, icon: Icon, color, bg }) => (
            <div key={label} className="bg-surface border border-[#2a2a31] rounded-2xl p-4 flex items-center gap-3">
              <div aria-hidden="true" className={`${bg} p-2.5 rounded-xl`}>
                <Icon size={20} className={color} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <dd className="text-text-primary font-bold text-lg leading-none">
                  {value}
                  <span className="text-text-muted text-xs font-normal ms-1">{unit}</span>
                </dd>
                <dt className="text-text-muted text-xs mt-0.5">{label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* Search bar */}
      <div className="mb-6">
        <label htmlFor="food-search" className="sr-only">
          חיפוש מזון
        </label>
        <div className="flex items-center gap-2 bg-surface border border-[#2a2a31] rounded-2xl px-4 py-3">
          <Search size={18} className="text-text-muted flex-shrink-0" aria-hidden="true" />
          <input
            id="food-search"
            type="search"
            placeholder="חפשי מזון..."
            aria-label="חיפוש מזון לתיעוד"
            className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full focus-visible:outline-none"
            dir="rtl"
          />
        </div>
      </div>

      {/* Empty state */}
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      >
        <div aria-hidden="true" className="bg-surface border border-[#2a2a31] p-5 rounded-full">
          <Apple size={36} className="text-text-muted" strokeWidth={1.5} />
        </div>
        <p className="text-text-primary font-semibold">לא תועדו ארוחות להיום</p>
        <p className="text-text-muted text-sm">התחילי לתעד את הארוחות שלך</p>
        <button
          type="button"
          aria-label="פתחי טופס הוספת ארוחה"
          className="bg-accent hover:bg-accent-dark text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          + הוסיפי ארוחה
        </button>
      </div>
    </div>
  );
}
