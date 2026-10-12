"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { person } from "@/resources";

type Theme = "light" | "dark";

// Must match the key read by the inline theme script in layout.tsx.
const STORAGE_KEY = "theme-choice";

function readChoice(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

const links = [
  { href: "/#featured", label: "Featured" },
  { href: "/#experience", label: "Experience" },
  { href: "/work", label: "Projects" },
  { href: "/#photography", label: "Photography" },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ThemeSwitch({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Dark mode"
      className={`theme-switch theme-switch--${theme}`}
      onClick={onToggle}
    >
      <span className="theme-switch__icon">{theme === "dark" ? <MoonIcon /> : <SunIcon />}</span>
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();

  // The inline script in layout.tsx applies the theme before paint; sync to it,
  // then keep following the system setting until the visitor picks one.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readChoice()) return;
      const system: Theme = media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = system;
      setTheme(system);
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  // Collapse the header while scrolling down; bring it back on any scroll up.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - lastY) < 6) return;
        setHidden(y > lastY && y > 80);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close the mobile menu after navigating or on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    // Picking the system's own theme clears the override, so the site goes back
    // to following the system; picking the other one remembers it.
    const system: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      if (next === system) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  };

  const close = () => setOpen(false);

  return (
    <header className={`site-header${hidden && !open ? " site-header--hidden" : ""}`}>
      <div className="site-header__inner">
        <Link href="/" className="brand">
          {person.name}
        </Link>

        <nav id="site-nav" className={`site-nav${open ? " is-open" : ""}`} aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={close}>
              {link.label}
            </Link>
          ))}
          {/* On phones the header tools collapse into this panel. */}
          <a
            href={person.linkedin}
            className="site-nav__mobile-only"
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            LinkedIn
          </a>
          <Link href="/#contact" className="btn-solid site-nav__mobile-only" onClick={close}>
            Let's talk
          </Link>
          <div className="site-nav__mobile-only">
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
          </div>
        </nav>

        <div className="header-tools">
          <Link href="/#contact" className="btn-solid">
            Let's talk
          </Link>
          <span className="header-divider" aria-hidden="true" />
          <a
            href={person.linkedin}
            className="icon-circle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            IN
          </a>
          <span className="header-divider" aria-hidden="true" />
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
    </header>
  );
}
