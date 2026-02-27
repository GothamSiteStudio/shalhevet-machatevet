import { User, Trophy, TrendingUp, Settings, ChevronLeft, Bell, Shield } from "lucide-react";

const menuItems = [
  { icon: TrendingUp, label: "ההתקדמות שלי",  sub: "גרפים ומדדים",    color: "text-purple-400" },
  { icon: Trophy,     label: "הנקודות שלי",    sub: "0 נקודות נצברו", color: "text-yellow-400" },
  { icon: Bell,       label: "התראות",         sub: "ניהול התראות",   color: "text-sky-400"    },
  { icon: Shield,     label: "פרטיות ואבטחה",  sub: "הגדרות חשבון",   color: "text-green-400"  },
  { icon: Settings,   label: "הגדרות",         sub: "העדפות אפליקציה", color: "text-text-muted" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-4">
      {/* Header */}
      <h1 className="text-2xl font-black text-text-primary mb-6">אזור אישי</h1>

      {/* Profile card */}
      <section aria-label="פרטי פרופיל">
        <div className="bg-surface border border-[#2a2a31] rounded-3xl p-5 flex items-center gap-4 mb-6">
          <div
            aria-hidden="true"
            className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center flex-shrink-0"
          >
            <User size={28} className="text-white" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-bold text-lg">שם המתאמנת</p>
            <p className="text-text-muted text-sm">חברה מ-01/2026</p>
          </div>
          <button
            type="button"
            aria-label="ערכי את פרטי הפרופיל"
            className="bg-surface-light border border-[#2a2a31] text-text-muted px-3 py-1.5 rounded-full text-xs font-medium hover:border-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            עריכה
          </button>
        </div>
      </section>

      {/* Stats row */}
      <section aria-label="נתוני גוף ואימון">
        <dl className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "משקל נוכחי", value: "—", unit: 'ק"ג' },
            { label: "יעד משקל",   value: "—", unit: 'ק"ג' },
            { label: "אימונים",    value: "0", unit: 'סה"כ' },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              className="bg-surface border border-[#2a2a31] rounded-2xl p-3 text-center"
            >
              <dd className="text-text-primary font-bold text-xl">{value}</dd>
              <dd className="text-text-muted text-[10px] leading-tight mt-0.5">{unit}</dd>
              <dt className="text-text-muted text-[10px] leading-tight">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Menu items */}
      <nav aria-label="תפריט אזור אישי">
        <ul className="flex flex-col gap-2">
          {menuItems.map(({ icon: Icon, label, sub, color }) => (
            <li key={label}>
              <button
                type="button"
                aria-label={`${label} - ${sub}`}
                className="w-full flex items-center gap-3 bg-surface border border-[#2a2a31] rounded-2xl p-4
                           hover:border-accent/30 hover:bg-surface-light transition-all duration-200 text-start
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className={`${color} bg-surface-light p-2.5 rounded-xl`} aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-semibold text-sm">{label}</p>
                  <p className="text-text-muted text-xs">{sub}</p>
                </div>
                <ChevronLeft
                  size={16}
                  className="text-text-muted"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
