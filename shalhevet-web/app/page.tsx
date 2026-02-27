import Image from "next/image";
import Link from "next/link";
import {
  Scale,
  Droplet,
  Apple,
  BarChart2,
  Trophy,
  Calendar,
} from "lucide-react";

const quickActions = [
  { label: "עדכון משקל", icon: Scale,     href: "/profile#weight"   },
  { label: "מים",        icon: Droplet,   href: "/diary#water"      },
  { label: "תזונה",      icon: Apple,     href: "/nutrition"        },
  { label: "התקדמות",    icon: BarChart2,  href: "/profile#progress" },
  { label: "הנקודות שלי", icon: Trophy,   href: "/profile#points"   },
  { label: "יומן",       icon: Calendar,  href: "/diary"            },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-4">

      {/* ── Header / Logo ── */}
      <header className="flex flex-col items-center gap-3 mb-8">
        {/* Circular logo */}
        <div
          aria-hidden="true"
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-accent shadow-[0_0_24px_rgba(240,128,0,0.35)]"
        >
          {/* Fallback gradient (shown behind image) */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent to-[#e05010] flex items-center justify-center">
            <span className="text-white text-3xl font-black">ש</span>
          </div>
          <Image
            src="/images/logo.png"
            alt=""
            fill
            className="object-cover relative z-10"
            priority
          />
        </div>

        {/* App title */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#f4f4f5] tracking-wide">
            שלהבת מחטבת
          </h1>
          <p className="text-[#b6b6bd] text-sm mt-0.5 font-medium">
            אימון אישי · תזונה · מעקב
          </p>
        </div>

        {/* Greeting banner */}
        <div
          role="status"
          aria-live="polite"
          className="w-full bg-[#202024] border border-[#2a2a31] rounded-2xl px-4 py-3 text-center"
        >
          <p className="text-[#b6b6bd] text-sm">
            👋 ברוכה הבאה! מה נעשה היום?
          </p>
        </div>
      </header>

      {/* ── Quick Actions Grid (2-column, 6 square cards) ── */}
      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="text-[#b6b6bd] text-xs font-semibold uppercase tracking-widest mb-3"
        >
          פעולות מהירות
        </h2>
        <div className="grid grid-cols-2 gap-3" role="list">
          {quickActions.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              role="listitem"
              aria-label={label}
              className="group relative flex flex-col items-center justify-center gap-3
                         bg-[#18181b] border border-[#2a2a31] rounded-3xl
                         aspect-square p-4
                         hover:border-[#f08000]/40 hover:bg-[#202024]
                         active:scale-95
                         transition-all duration-200
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Icon */}
              <div className="bg-[#f08000]/10 p-3.5 rounded-2xl">
                <Icon
                  size={28}
                  aria-hidden="true"
                  className="text-[#f08000] group-hover:scale-110 transition-transform duration-200"
                  strokeWidth={1.8}
                />
              </div>

              {/* Hebrew label */}
              <span className="text-[#f4f4f5] text-sm font-semibold text-center leading-tight">
                {label}
              </span>

              {/* Subtle hover glow */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                            bg-gradient-to-br from-[#f08000]/5 to-transparent pointer-events-none"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Today's Summary ── */}
      <section aria-labelledby="today-summary-heading" className="mt-6">
        <h2
          id="today-summary-heading"
          className="text-[#b6b6bd] text-xs font-semibold uppercase tracking-widest mb-3"
        >
          סיכום היום
        </h2>
        <div className="bg-[#18181b] border border-[#2a2a31] rounded-2xl p-4">
          <dl className="flex items-center justify-between">
            <div className="text-center">
              <dt className="text-[#b6b6bd] text-xs mt-0.5 order-last">קלוריות</dt>
              <dd className="text-2xl font-black text-[#f08000]">0</dd>
            </div>
            <div aria-hidden="true" className="w-px h-10 bg-[#2a2a31]" />
            <div className="text-center">
              <dt className="text-[#b6b6bd] text-xs mt-0.5">מ&quot;ל מים</dt>
              <dd className="text-2xl font-black text-[#f4f4f5]">0</dd>
            </div>
            <div aria-hidden="true" className="w-px h-10 bg-[#2a2a31]" />
            <div className="text-center">
              <dt className="text-[#b6b6bd] text-xs mt-0.5">אימונים</dt>
              <dd className="text-2xl font-black text-[#f4f4f5]">0</dd>
            </div>
            <div aria-hidden="true" className="w-px h-10 bg-[#2a2a31]" />
            <div className="text-center">
              <dt className="text-[#b6b6bd] text-xs mt-0.5">נקודות</dt>
              <dd className="text-2xl font-black text-[#f4f4f5]">0</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
