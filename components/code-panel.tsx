"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";
import { languageFromPath } from "@/lib/code-language";

type CodePanelProps = {
  code: string;
  /** 代码块顶栏标签，默认 path 或 terminal */
  path?: string;
  language?: string;
};

/** 语法高亮代码块；长行在块内横向滚动，不撑破页面布局 */
export function CodePanel({ code, path, language }: CodePanelProps) {
  const lang = language ?? languageFromPath(path);
  const label = path ?? "terminal";
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, { lang, theme: "github-dark-default" })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml("");
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return (
    <div className="code-panel flex max-h-[min(560px,70vh)] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117] shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-900/95 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-400">
          {label}
        </span>
        <div className="shrink-0">
          <CopyButton text={code} />
        </div>
      </div>
      <div className="code-panel-body min-h-0 min-w-0 flex-1 overflow-auto p-4 text-xs leading-6">
        {html ? (
          <div
            className="code-panel-shiki min-w-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="m-0 max-w-full overflow-x-auto whitespace-pre font-mono text-zinc-100">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
