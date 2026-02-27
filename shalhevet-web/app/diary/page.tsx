import { BookOpen, Dumbbell, Droplets, Plus } from "lucide-react";

export default function DiaryPage() {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary">יומן</h1>
          <p className="text-text-muted text-sm">אימונים ומעקב יומי</p>
        </div>
        <button
          type="button"
          aria-label="הוסיפי פעילות חדשה"
          className="bg-accent hover:bg-accent-dark text-white p-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </header>

      {/* Date strip */}
      <div
        role="group"
        aria-label="בחירת יום בשבוע"
        className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
      >
        {[
          { short: "א", full: "ראשון" },
          { short: "ב", full: "שני" },
          { short: "ג", full: "שלישי" },
          { short: "ד", full: "רביעי" },
          { short: "ה", full: "חמישי" },
          { short: "ו", full: "שישי" },
          { short: "ש", full: "שבת" },
        ].map(({ short, full }, i) => (
          <button
            key={i}
            type="button"
            aria-label={`יום ${full}, ${20 + i} בחודש${i === 3 ? " - היום" : ""}`}
            aria-pressed={i === 3}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-2xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${i === 3 ? "bg-accent text-white" : "bg-surface border border-[#2a2a31] text-text-muted hover:border-accent/50"}`}
          >
            <span className="text-xs">{short}</span>
            <span>{20 + i}</span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <div
          aria-hidden="true"
          className="bg-surface border border-[#2a2a31] p-5 rounded-full"
        >
          <BookOpen size={40} className="text-text-muted" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-text-primary font-semibold text-lg">אין עדיין ערכים להיום</p>
          <p className="text-text-muted text-sm mt-1">הוסיפי אימון, מים, או הערה</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="הוסיפי אימון ליומן"
            className="flex items-center gap-2 bg-surface border border-[#2a2a31] text-text-primary px-4 py-2.5 rounded-full text-sm font-medium hover:border-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Dumbbell size={16} aria-hidden="true" />
            הוסיפי אימון
          </button>
          <button
            type="button"
            aria-label="תיעוד שתיית מים"
            className="flex items-center gap-2 bg-surface border border-[#2a2a31] text-text-primary px-4 py-2.5 rounded-full text-sm font-medium hover:border-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Droplets size={16} aria-hidden="true" />
            מים
          </button>
        </div>
      </div>
    </div>
  );
}
