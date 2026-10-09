"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/projects";

/** 桌面端左侧菜单 */
export function LabSidebar() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <Link
        href="/"
        className="block border-b border-border px-4 py-4 transition-colors hover:bg-white/60"
      >
        <span className="relative inline-block">
          <span className="block text-sm font-semibold">LangGraph Lab</span>
          <span
            aria-hidden
            className={`absolute left-0 top-[calc(100%+2px)] h-0.5 w-full origin-left bg-foreground transition-transform duration-300 ease-out ${
              onHome ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </span>
        <p className="mt-2 text-xs text-muted">项目驱动 · 逐层递进</p>
      </Link>
      <nav className="flex-1 overflow-y-auto p-2">
        <ol className="space-y-0.5">
          {NAV_ITEMS.map((item, index) => {
            const href = `/lab/${item.slug}`;
            const active = pathname === href;

            return (
              <li key={item.slug}>
                <Link
                  href={href}
                  className={`block rounded-lg px-3 py-2 transition-colors ${
                    active
                      ? "bg-accent text-accent-fg"
                      : "text-foreground hover:bg-white/60"
                  }`}
                >
                  <span className="mr-2 text-xs opacity-60">{index + 1}</span>
                  <span className="text-sm">{item.menuTitle}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
