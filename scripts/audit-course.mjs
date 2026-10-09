/**
 * 课程一致性体检：把「课页文案 ↔ 代码 ↔ 命令 ↔ 目录 ↔ 三份文档」交叉核对一遍。
 *
 * 这些是历史上真出过的错，全部做成机器检查：
 *  1. 知识点写了本课没教的方法（从别处抄来的）
 *  2. 命令引用了还不存在的文件（比如初始化页就让人跑第 10 课才建的 .env）
 *  3. 课页文案出现「学员 / 我 / 你 / 他」及 xx.ts 这类占位符
 *  4. 同一知识点在多课重复列
 *  5. 要覆盖一个从没建过的文件
 *  6. 总览表 / 演进表与课程数据漂移
 *
 * 用法：pnpm audit:course   （有错时退出码非 0）
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(REPO, p), "utf8");

const src = read("lib/projects.ts");
const errors = [];
const warns = [];
const E = (m) => errors.push(m);
const W = (m) => warns.push(m);

// ---------- 切分出每一课 ----------
const navStart = src.indexOf("export const NAV_ITEMS");
const marks = [...src.matchAll(/^    kind: "(project|guide)",$/gm)]
  .filter((m) => m.index > navStart)
  .map((m) => ({ kind: m[1], at: m.index }));
marks.forEach((m, i) => {
  m.end = i + 1 < marks.length ? marks[i + 1].at : src.length;
  m.block = src.slice(m.at, m.end);
  m.no = i;
});

const stripUrls = (s) => s.replace(/https?:\/\/\S+/g, "");
const norm = (p) => p.replace(/\.(ts|tsx|js|mjs|json)$/, "");
const codeOf = (b) => [...b.matchAll(/code: `((?:[^`\\]|\\.)*)`/g)].map((m) => m[1]).join("\n");
/** 取 "key: [ ... ]" 段里的字符串字面量 */
const strArr = (b, key) => {
  const i = b.indexOf(`${key}: [`);
  if (i < 0) return null;
  return [...b.slice(i, b.indexOf("],", i)).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
};

const lessons = marks.map((m) => {
  const b = m.block;
  const g = (re) => b.match(re)?.[1];
  const files = [
    ...b.matchAll(/path: "([^"]+)",\s*\n\s*order: (\d+),\s*\n\s*action: "([a-z]+)"/g),
  ].map((x) => ({ path: x[1], order: +x[2], action: x[3] }));
  if (!files.length)
    for (const x of b.matchAll(/path: "([^"]+)",\s*\n\s*steps:/g))
      files.push({ path: x[1], order: null, action: "steps" });
  return {
    kind: m.kind,
    no: m.no,
    slug: g(/slug: "([^"]+)"/),
    title: g(/title: "([^"]+)"/),
    menuTitle: g(/menuTitle: "([^"]+)"/),
    summary: g(/summary:\s*\n?\s*"([^"]*)"/),
    concepts:
      m.kind === "guide"
        ? []
        : [...b.slice(b.indexOf("concepts: ["), b.indexOf("],", b.indexOf("concepts: [")))
            .matchAll(/`([^`]+)`/g)
          ].map((x) => x[1].split(/[\s—]/)[0]),
    verify: strArr(b, "description"),
    install: g(/install: \{\s*\n?\s*command: "([^"]+)"/),
    docLinks: [...b.matchAll(/href: "([^"]+)"/g)].map((x) => x[1]),
    files,
    code: codeOf(b),
    block: b,
  };
});
const projects = lessons.filter((l) => l.kind === "project");
const noOf = new Map(lessons.map((l) => [l.slug, l.no]));
const at = (slug) => (slug === "getting-started" ? "初始化" : `第 ${noOf.get(slug)} 课`);

// ---------- 1. 结构完整性 ----------
for (const l of lessons) {
  for (const k of ["slug", "title", "menuTitle"]) if (!l[k]) E(`[${l.no}] 缺 ${k}`);
  if (l.kind === "project") {
    if (!l.summary) E(`[${l.slug}] 缺 summary`);
    if (!l.concepts.length) E(`[${l.slug}] 缺 concepts`);
    if (!l.verify?.length) E(`[${l.slug}] 缺 verify.description`);
  }
  if (!l.docLinks.length) E(`[${l.slug}] 缺 docLinks`);
}
for (const key of ["slug", "menuTitle"]) {
  const v = lessons.map((l) => l[key]);
  const dup = [...new Set(v.filter((x, i) => v.indexOf(x) !== i))];
  if (dup.length) E(`${key} 重复: ${dup.join(", ")}`);
}

// ---------- 2. 人称 / 占位符 / 别的仓库名 ----------
// 直接扫整课块原文：任何字段（含以后新增的）出现人称都会被拦下
for (const bad of ["学员", "学习者", "咱们", "我", "你", "他"]) {
  const hit = lessons.filter((l) => l.block.includes(bad));
  if (hit.length) E(`课页文案出现「${bad}」—— 涉及: ${hit.map((l) => at(l.slug)).join(", ")}`);
}
for (const l of lessons) {
  if (/\bxx\.ts\b|\bTODO\b|待补/.test(l.block)) E(`[${l.slug}] 含占位符（xx.ts / TODO / 待补）`);
  const foreign = /mastra|my-ai-app|my-mastra-app|lab-ai-sdk|lab-mastra|json-render|AI SDK Lab/i.exec(l.block);
  if (foreign) E(`[${l.slug}] 出现别的课程/仓库名: ${foreign[0]}`);
}

// ---------- 3. 知识点必须出现在本课 ----------
for (const l of projects) {
  const hay = [
    l.code,
    ...(l.verify ?? []),
    l.install ?? "",
    l.files.map((f) => f.path).join(" "),
    ...(l.block.match(/hint: "((?:[^"\\]|\\.)*)"/g) ?? []),
  ].join("\n");
  for (const c of l.concepts) if (!hay.includes(c)) E(`[${l.slug}] 知识点 \`${c}\` 在本课找不到`);
}

// ---------- 4. 知识点跨课重复 ----------
const owner = new Map();
for (const l of lessons)
  for (const c of l.concepts) owner.set(c, [...(owner.get(c) ?? []), l.slug]);
for (const [k, v] of owner)
  if (v.length > 1) W(`\`${k}\` 在 ${v.length} 课重复列: ${v.join(", ")}`);

// ---------- 5. 文件演进链 ----------
const scaffolded = ["终端", ".env.local", "app/page.tsx", "app/layout.tsx", "app/globals.css", "next.config.ts"];
const known = new Set(scaffolded.map(norm));
for (const l of projects) {
  // 扫整课原文（含 code / verify / hint / steps 命令），URL 先剔除
  const text = stripUrls(l.block);
  const mentioned = new Set(
    [...text.matchAll(/(?:\.\.\/)?(src\/graphs\/[\w.-]+|scripts\/[\w.-]+|app\/[\w./-]+|langgraph\.json|(?<![\w])\.env(?:\.local)?)/g)].map(
      (m) => norm(m[1]),
    ),
  );
  for (const p of mentioned)
    if (!l.files.some((f) => norm(f.path) === p && f.action !== "run") && !known.has(p))
      E(`[${l.slug}] 引用了还不存在的文件: ${p}`);
  for (const f of l.files) {
    const key = norm(f.path);
    if (["replace", "edit"].includes(f.action) && !known.has(key))
      E(`[${l.slug}] 要${f.action} 一个还没建过的文件: ${f.path}`);
    if (f.action === "create" && known.has(key)) W(`[${l.slug}] 重复 create 已存在的文件: ${f.path}`);
    if (f.order == null && f.action !== "steps") E(`[${l.slug}] ${f.path} 缺 order/action`);
    known.add(key);
  }
  const orders = l.files.map((f) => f.order).filter((o) => o != null);
  if (new Set(orders).size !== orders.length) E(`[${l.slug}] order 重复: ${orders}`);
  if (orders.some((o, i) => o !== i + 1)) W(`[${l.slug}] order 不连续: [${orders}]`);
}

// ---------- 6. 依赖一致性 ----------
const initBlock = src.slice(src.indexOf("export const INIT_STEPS"), src.indexOf("export const NAV_ITEMS"));
const installed = new Set();
const addCmds = [
  ...[...initBlock.matchAll(/pnpm add[^"`\n]*/g)].map((m) => m[0]),
  ...lessons.map((l) => l.install).filter(Boolean),
];
for (const c of addCmds)
  for (const tok of String(c).split(/\s+/).slice(2))
    if (tok.startsWith("@") || ["zod", "tsx"].includes(tok)) installed.add(tok);
const imported = [...new Set([...src.matchAll(/from "(@?[\w@/-]+)"/g)].map((m) => m[1]))].filter(
  (x) => x === "zod" || x.startsWith("@langchain"),
);
for (const pkg of imported) {
  const root = pkg.split("/").slice(0, pkg.startsWith("@") ? 2 : 1).join("/");
  if (!installed.has(root)) W(`${pkg} 被 import，但安装命令里没出现（根包 ${root}）`);
}

// ---------- 7. 跨课引用 ----------
for (const l of lessons)
  for (const m of l.block.matchAll(/第\s*(\d+)\s*课/g)) {
    const n = +m[1];
    if (n < 1 || n > projects.length) E(`[${l.slug}] 引用了不存在的第 ${n} 课`);
    else if (n > noOf.get(l.slug)) W(`${at(l.slug)} 前向引用第 ${n} 课`);
  }

// ---------- 8. 文档与课程数据对齐 ----------
const cur = read("docs/curriculum.md");
const rows = [...cur.matchAll(/^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|$/gm)].map((m) => ({
  no: +m[1],
  ability: [...m[3].matchAll(/`([^`]+)`/g)].map((x) => x[1].split(/[\s—（(]/)[0]),
  changes: [...m[4].matchAll(/`([^`]+)`/g)].map((x) => x[1]),
}));
for (const r of rows) {
  const l = lessons[r.no];
  if (!l) {
    E(`curriculum.md 总览表有第 ${r.no} 行，课程数据里没有`);
    continue;
  }
  if (l.kind === "guide") continue; // 初始化课没有 concepts，能力列仅作说明
  const miss = r.ability.filter((a) => !l.concepts.includes(a));
  const extra = l.concepts.filter((a) => !r.ability.includes(a));
  if (miss.length) E(`curriculum.md 第 ${r.no} 课列了课程没教的能力: ${miss.join(", ")}`);
  if (extra.length) E(`curriculum.md 第 ${r.no} 课漏列能力: ${extra.join(", ")}`);
  for (const c of r.changes)
    if (c.includes("/") && !l.files.some((f) => f.path === c))
      E(`curriculum.md 第 ${r.no} 课写了不存在的文件: ${c}`);
}
for (const doc of ["AGENTS.md", "README.md"]) {
  const lines = read(doc).split("\n");
  for (const l of projects) {
    const row =
      doc === "README.md"
        ? lines.find((x) => new RegExp(`^第\\s*${l.no}\\s*课`).test(x))
        : lines.find((x) => new RegExp(`^\\|\\s*${l.no}\\s*\\|`).test(x));
    if (!row) {
      E(`${doc} 的演进表缺第 ${l.no} 课`);
      continue;
    }
    for (const f of l.files) {
      if (f.action === "run") continue;
      if (!row.includes(f.path.split("/").pop()))
        E(`${doc} 第 ${l.no} 课演进表漏了 ${f.action === "create" ? "新增" : "覆盖"}的文件: ${f.path}`);
    }
  }
}

// ---------- 输出 ----------
console.log(`课程体检：${lessons.length} 项（guide 1 / project ${projects.length}）`);
const byNo = [...lessons].sort((a, b) => a.no - b.no);
for (const l of byNo) {
  const created = l.files.filter((f) => f.action === "create").length;
  const changed = l.files.filter((f) => ["replace", "edit"].includes(f.action)).length;
  console.log(`  ${String(l.no).padStart(2)}  ${(l.menuTitle ?? "?").padEnd(12)} 新增 ${created} / 覆盖 ${changed}`);
}
console.log(`\n错误 ${errors.length} / 提醒 ${warns.length}`);
errors.forEach((e) => console.log("  ✗ " + e));
warns.forEach((w) => console.log("  · " + w));
if (!errors.length && !warns.length) console.log("  ✓ 全部通过");
process.exit(errors.length ? 1 : 0);
