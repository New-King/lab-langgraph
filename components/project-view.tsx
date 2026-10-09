"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { CodePanel } from "@/components/code-panel";
import { DocLinksSidebar } from "@/components/doc-links-sidebar";
import {
  labContent,
  labFileGrid,
  labMain,
  labScroll,
} from "@/lib/layout-classes";
import {
  getFileActionLabel,
  getLabOperations,
  getOrderLabel,
  splitFileCode,
  type Concept,
  type ConceptArticle,
  type LabOperation,
  type LabProject,
} from "@/lib/projects";

/** 项目页：操作列表 + 代码 + 右侧官方文档 */
export function ProjectView({ project }: { project: LabProject }) {
  const operations = getLabOperations(
    project.files,
    project.verify,
    project.install,
  );
  const [selectedId, setSelectedId] = useState(operations[0]?.id ?? "");
  const detailRef = useRef<HTMLElement>(null);
  // 记录上一次滚动过的操作：进页面时（首次）不滚动，
  // 否则代码区会被滚进视野，看起来像"页面自己往下移了一截"
  const lastScrolledId = useRef(selectedId);

  const selected =
    operations.find((op) => op.id === selectedId) ?? operations[0];

  useEffect(() => {
    if (lastScrolledId.current === selectedId) return;
    lastScrolledId.current = selectedId;
    detailRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <main className={labMain}>
      <div className={labContent}>
        <section className={labScroll}>
          <header className="mb-6 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
            <p className="text-sm leading-6 text-muted">{project.summary}</p>
          </header>

          <ConceptList
            concepts={project.concepts}
            article={project.conceptArticle}
          />

          <div className={`mt-6 ${labFileGrid}`}>
            <OperationList
              operations={operations}
              selectedId={selected?.id ?? ""}
              onSelect={setSelectedId}
            />
            <OperationDetail ref={detailRef} operation={selected} />
          </div>
        </section>
      </div>

      <DocLinksSidebar
        links={project.docLinks}
        description="本课用到的核心 API，详见官方文档。"
      />
    </main>
  );
}

function ConceptList({
  concepts,
  article,
}: {
  concepts: Concept[];
  article?: ConceptArticle;
}) {
  const [showArticle, setShowArticle] = useState(false);
  // 只有带补充说明的条目才编号，每课从 1 开始
  const items = concepts.map((concept, i) => ({
    ...concept,
    index: concept.note
      ? concepts.slice(0, i + 1).filter((item) => item.note).length
      : 0,
  }));

  return (
    <section className="space-y-2">
      <div className="flex items-start gap-1.5">
        <h2 className="text-sm font-semibold">知识点</h2>
        {article && (
          <button
            type="button"
            onClick={() => setShowArticle(true)}
            title={"延伸阅读：" + article.title}
            aria-label="延伸阅读"
            className="group -mt-1.5 flex cursor-pointer items-center gap-0.5 rounded-b-md rounded-t-sm bg-neutral-700 px-2 py-1 text-[10px] font-medium leading-none text-white transition-colors hover:bg-neutral-600"
          >
            延伸阅读
            <svg
              viewBox="0 0 20 20"
              className="h-2.5 w-2.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 5l6 5-6 5" />
            </svg>
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.text}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-muted"
          >
            <RichText text={item.text} />
            {item.note && <NoteTag index={item.index} note={item.note} />}
          </li>
        ))}
      </ul>

      {article && showArticle && (
        <ConceptArticleModal
          article={article}
          onClose={() => setShowArticle(false)}
        />
      )}
    </section>
  );
}

/** 知识点末尾的小编号：悬停 / 键盘聚焦（手机上点一下）时浮出补充说明 */
function NoteTag({ index, note }: { index: number; note: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);

  // fixed 定位 + 视口内夹紧：气泡不会被知识点卡片或滚动容器裁掉
  function show() {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    );
    const above = rect.top > 140;
    setPos({ top: above ? rect.top - 8 : rect.bottom + 8, left, width, above });
  }

  return (
    <span
      className="ml-1 inline-block align-middle"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      <button
        ref={ref}
        type="button"
        aria-label={`拓展 ${index}`}
        onFocus={show}
        onBlur={() => setPos(null)}
        onClick={show}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-[10px] font-medium leading-none text-white transition-colors hover:bg-neutral-600"
      >
        {index}
      </button>
      {pos && (
        <span
          role="tooltip"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            transform: pos.above ? "translateY(-100%)" : undefined,
          }}
          className="fixed z-50 block rounded-lg border border-border bg-white p-2.5 text-xs leading-5 text-muted shadow-lg"
        >
          <RichText text={note} />
        </span>
      )}
    </span>
  );
}

/** 把 `code` 渲染成行内等宽标签 */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] text-foreground"
          >
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** 知识点「更多」：当前窗口弹出的延伸阅读 */
function ConceptArticleModal({
  article,
  onClose,
}: {
  article: ConceptArticle;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mt-[4vh] flex max-h-[88vh] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 标题栏固定，只有正文滚动，保证底部边界始终在视口内 */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            {article.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:bg-neutral-100"
          >
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ArticleBody lines={article.body} />
        </div>
      </div>
    </div>
  );
}

/** 极简渲染：`## ` 小标题、`- ` 要点、``` 代码块、其余当段落 */
function ArticleBody({ lines }: { lines: string[] }) {
  const blocks: ReactNode[] = [];
  let code: string[] | null = null;

  lines.forEach((line, index) => {
    if (line.trim() === "```") {
      if (code) {
        blocks.push(
          <pre
            key={"code-" + index}
            className="max-w-full overflow-x-auto rounded-lg bg-neutral-100 p-3 font-mono text-xs leading-5 text-neutral-700"
          >
            {code.join("\n")}
          </pre>,
        );
        code = null;
      } else {
        code = [];
      }
      return;
    }

    if (code) {
      code.push(line);
      return;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h5 key={index} className="pt-1 text-xs font-semibold text-neutral-600">
          {line.slice(4)}
        </h5>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h4 key={index} className="pt-2 text-sm font-semibold text-foreground">
          {line.slice(3)}
        </h4>,
      );
      return;
    }

    if (line.startsWith("- ")) {
      blocks.push(
        <p key={index} className="pl-4">
          · {line.slice(2)}
        </p>,
      );
      return;
    }

    blocks.push(<p key={index}>{line}</p>);
  });

  return <div className="space-y-3 text-sm leading-6 text-muted">{blocks}</div>;
}

function OperationList({
  operations,
  selectedId,
  onSelect,
}: {
  operations: LabOperation[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">操作</h2>
      <ul className="space-y-1">
        {operations.map((op) => {
          const active = op.id === selectedId;
          return (
            <li key={op.id}>
              <button
                type="button"
                onClick={() => onSelect(op.id)}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  active
                    ? "bg-neutral-200 text-foreground"
                    : "text-foreground hover:bg-white/80"
                }`}
              >
                <p className="truncate font-mono text-xs">
                  <span className="mr-1 text-muted">{getOrderLabel(op.order)}</span>
                  {op.label}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const OperationDetail = forwardRef<
  HTMLElement,
  { operation: LabOperation | undefined }
>(function OperationDetail({ operation }, ref) {
  if (!operation) {
    return (
      <section
        ref={ref}
        className="rounded-lg border border-border bg-white/60 p-4 text-sm text-muted"
      >
        暂无操作。
      </section>
    );
  }

  if (operation.kind === "deps") {
    return (
      <section ref={ref} className="flex min-h-0 min-w-0 w-full flex-col space-y-2">
        <h2 className="text-sm font-semibold">装依赖</h2>
        <p className="text-sm leading-6 text-muted">{operation.description}</p>
        <CodePanel code={operation.command} language="bash" />
      </section>
    );
  }

  if (operation.kind === "scaffold") {
    return (
      <section ref={ref} className="flex min-h-0 min-w-0 w-full flex-col space-y-2">
        <h2 className="text-sm font-semibold">代码</h2>
        <p className="text-sm leading-6 text-muted">{operation.description}</p>
        <CodePanel code={operation.command} language="bash" />
      </section>
    );
  }

  if (operation.kind === "check") {
    return (
      <section ref={ref} className="flex min-h-0 min-w-0 w-full flex-col space-y-2">
        <h2 className="text-sm font-semibold">验收</h2>
        <ul className="space-y-1">
          {operation.description.map((line) => (
            <li key={line} className="text-sm leading-6 text-muted">
              {line}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const { file } = operation;
  // 局部修改：按注释拆成多块，每块单独复制（不能整体覆盖的文件最容易抄错）
  const blocks = file.action === "edit" ? splitFileCode(file.code ?? "") : [];

  return (
    <section ref={ref} className="flex min-h-0 min-w-0 w-full flex-col space-y-2">
      <h2 className="text-sm font-semibold">代码</h2>
      {(file.action || file.hint) && (
        <p className="text-sm leading-6 text-muted">
          {[
            file.action ? getFileActionLabel(file.action) : null,
            file.hint,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-xs text-muted">{block.label}</p>
              <CodePanel code={block.code} path={file.path} />
            </div>
          ))}
        </div>
      ) : (
        <CodePanel key={file.path} code={file.code ?? ""} path={file.path} />
      )}
    </section>
  );
});
