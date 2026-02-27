"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Apple, User } from "lucide-react";

const tabs = [
  { href: "/", label: "בית", icon: Home },
  { href: "/diary", label: "יומן", icon: BookOpen },
  { href: "/nutrition", label: "תזונה", icon: Apple },
  { href: "/profile", label: "אזור אישי", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-mobile bg-surface border-t border-[#2a2a31]"
      style={{ maxWidth: "480px" }}
    >
      <div className="flex items-stretch" role="list">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              role="listitem"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors duration-200
                ${
                  isActive
                    ? "text-accent"
                    : "text-text-muted hover:text-text-primary focus-visible:text-text-primary"
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset rounded-sm`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                aria-hidden="true"
                className={isActive ? "drop-shadow-[0_0_6px_rgba(240,128,0,0.6)]" : ""}
              />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
