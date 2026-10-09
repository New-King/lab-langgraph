"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

export function IconCopy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 12l4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFailed({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.6v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");

  async function onCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1500);
  }

  const label =
    state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
    >
      {state === "copied" ? (
        <IconCheck className="h-4 w-4 text-emerald-400" />
      ) : state === "failed" ? (
        <IconFailed className="h-4 w-4 text-red-400" />
      ) : (
        <IconCopy className="h-4 w-4" />
      )}
    </button>
  );
}
