"use client";

import { useEffect, useState } from "react";
import { labPreview, labPreviewCollapsed } from "@/lib/layout-classes";
import type { DocLink } from "@/lib/doc-link";

const STORAGE_KEY = "lab-langgraph:doc-sidebar-collapsed";

/** 右侧官方文档链接；桌面端可收起，给代码区让出宽度 */
export function DocLinksSidebar({
  links,
  description = "深入概念与完整 API 请查阅官方文档。",
}: {
  links: DocLink[];
  description?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");

    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  const desktopCollapsed = mounted && collapsed && isLg;

  if (desktopCollapsed) {
    return (
      <aside className={labPreviewCollapsed}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="展开官方文档"
          title="展开官方文档"
          className="flex h-full min-h-[120px] w-full flex-col items-center justify-start gap-2 rounded-lg py-3 text-xs text-muted transition-colors hover:bg-white/60 hover:text-foreground"
        >
          <span aria-hidden className="text-base leading-none">
            »
          </span>
          <span className="[writing-mode:vertical-rl]">文档</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={labPreview}>
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold">官方文档</h2>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="收起官方文档"
            title="收起官方文档"
            className="hidden shrink-0 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-white/80 hover:text-foreground lg:inline-block"
          >
            收起 «
          </button>
        </div>
        <p className="text-xs leading-5 text-muted">{description}</p>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-white/80"
              >
                {link.title}
                <span className="ml-1 text-xs text-muted">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
