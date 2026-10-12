"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps section jumps out of the address bar so a refresh always starts at the
 * top of the page:
 * - Links to a section on the current page scroll there without adding "#section".
 * - Arriving from another page with "#section" scrolls there, then drops the hash.
 * - A reload starts at the top instead of restoring the old scroll position,
 *   while Back/Forward keep the browser's normal restoration.
 */
export function InPageNavigation() {
  const pathname = usePathname();

  // Same-page section links: scroll without touching the URL. Runs in the capture
  // phase so it handles the click before Next's <Link> pushes a "#section" entry.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  // Arrived with "#section" (from another page or an outside link): go there, then drop the hash.
  useEffect(() => {
    const { hash, pathname: path, search } = window.location;
    if (!hash) return;
    const section = document.getElementById(decodeURIComponent(hash.slice(1)));
    window.history.replaceState(window.history.state, "", path + search);
    if (section) requestAnimationFrame(() => section.scrollIntoView());
  }, [pathname]);

  // Reloads start at the top: switch off scroll restoration only as the page unloads,
  // and turn it back on once loaded so Back/Forward still restore position.
  useEffect(() => {
    window.history.scrollRestoration = "auto";
    const onPageHide = () => {
      window.history.scrollRestoration = "manual";
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
