"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/lib/projects";

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 移动端顶栏 + 右上角抽屉菜单（参考 newking Navbar） */
export function LabMobileNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-sidebar lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="relative inline-block" onClick={() => setDrawerOpen(false)}>
            <span className="block text-sm font-semibold">LangGraph Lab</span>
            <span
              aria-hidden
              className={`absolute left-0 top-[calc(100%+2px)] h-0.5 w-full origin-left bg-foreground transition-transform duration-300 ease-out ${
                onHome ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={drawerOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/80 hover:text-foreground"
          >
            {drawerOpen ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>

        <nav
          aria-label="移动端导航"
          className={`overflow-hidden border-t border-border bg-sidebar transition-all duration-200 ease-out ${
            drawerOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ol className="max-h-[70vh] space-y-0.5 overflow-y-auto p-2">
            {NAV_ITEMS.map((item, index) => {
              const href = `/lab/${item.slug}`;
              const active = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-accent text-accent-fg"
                        : "text-foreground hover:bg-white/60"
                    }`}
                  >
                    <span className="mr-2 text-xs opacity-60">{index + 1}</span>
                    {item.menuTitle}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity duration-200 lg:hidden ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />
    </>
  );
}
