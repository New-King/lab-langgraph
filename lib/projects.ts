import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace" | "edit" | "run";

export type ProjectFile = {
  path: string;
  code?: string;
  hint?: string;
  steps?: CommandStep[];
  /** 项目课：跟做顺序 */
  order?: number;
  /** 项目课：新建（create）/ 整体覆盖（replace）/ 局部修改（edit）/ 只跑命令（run） */
  action?: FileAction;
};

/**
 * 局部修改（edit）的代码按编号注释拆块：`// ① …`（顶格）当小标题，后面的代码各自成块、各自可复制。
 * 只认 ①~⑩ 编号，所以代码里普通的说明注释不会被误切；只有一块时返回空数组，调用方整块渲染。
 */
export function splitFileCode(code: string): { label: string; code: string }[] {
  const lines = code.split("\n");
  const blocks: { label: string; lines: string[] }[] = [];

  lines.forEach((line) => {
    const isHeading = /^\/\/\s*[①②③④⑤⑥⑦⑧⑨⑩]/.test(line);
    if (isHeading) {
      blocks.push({ label: line.replace(/^\/\/\s*/, "").trim(), lines: [] });
      return;
    }
    if (blocks.length === 0) blocks.push({ label: "", lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  });

  const parts = blocks
    .map((block) => ({ label: block.label, code: block.lines.join("\n").trim() }))
    .filter((block) => block.code.length > 0);

  return parts.length > 1 ? parts : [];
}

export type FollowStep = {
  description: string;
  command: string;
};

/** 课末的验收步骤：去哪儿看、看到什么算通过（每项一行） */
export type ProjectVerify = {
  label: string;
  description: string[];
};

export type LabOperation =
  | {
      kind: "deps";
      id: "deps";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "scaffold";
      id: "scaffold";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "check";
      id: "verify";
      order: number;
      label: string;
      description: string[];
    }
  | {
      kind: "file";
      id: string;
      order: number;
      label: string;
      file: ProjectFile;
    };

/** 生成 mkdir + touch 脚手架命令（仅包含 action: create 的文件） */
export function buildScaffoldCommand(files: ProjectFile[]): string | null {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const createFiles = sorted.filter((file) => file.action === "create");
  if (createFiles.length === 0) return null;

  const dirs = new Set<string>();
  const paths: string[] = [];

  for (const file of createFiles) {
    paths.push(file.path);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) dirs.add(file.path.slice(0, slash));
  }

  const parts: string[] = [];
  if (dirs.size > 0) {
    parts.push(`mkdir -p ${[...dirs].sort().join(" ")}`);
  }
  parts.push(`touch ${paths.join(" ")}`);
  return parts.join(" && ");
}

/** 操作列表：装依赖 → 创建文件 → 逐文件粘贴代码 → 验收 */
export function getLabOperations(
  files: ProjectFile[],
  verify?: ProjectVerify,
  install?: LabProject["install"],
): LabOperation[] {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const operations: LabOperation[] = [];
  let order = 1;

  // 需要新装依赖的课：第一步就是装包，别让它藏在文件说明里
  if (install) {
    operations.push({
      kind: "deps",
      id: "deps",
      order: order++,
      label: "装依赖",
      description:
        install.description ??
        `在 ${PROJECT_DIR} 目录执行，安装本课新增的依赖。`,
      command: install.command,
    });
  }

  const command = buildScaffoldCommand(sorted);
  if (command) {
    operations.push({
      kind: "scaffold",
      id: "scaffold",
      order: order++,
      label: "创建文件",
      description: `在 ${PROJECT_DIR} 目录执行，创建本课需要新建的文件夹和空文件。`,
      command,
    });
  }

  for (const file of sorted) {
    operations.push({
      kind: "file",
      // 同一个文件可能分两步改，id 要带上 order
      id: `${file.path}@${file.order}`,
      order: order++,
      label: getFileName(file.path),
      file,
    });
  }

  if (verify) {
    operations.push({
      kind: "check",
      id: "verify",
      order: order++,
      label: verify.label,
      description: verify.description,
    });
  }

  return operations;
}

export type GuideProject = {
  kind: "guide";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  files: ProjectFile[];
  docLinks: DocLink[];
};

/** 知识点右上角「延伸阅读」弹窗里的文章 */
export type ConceptArticle = {
  title: string;
  /** 每项一段：`## ` 开头是小标题，`- ` 开头是要点，``` 之间是代码 */
  body: string[];
};

/**
 * 知识点：一句话说清这个方法干什么。
 * `note` 是可选的补充，界面上在条目右侧显示一个灯泡图标，悬停（手机上点一下）浮出气泡；
 * 只在确实需要时写（Python 对应物、常见坑等），尽量短。
 */
export type Concept = {
  text: string;
  note?: string;
};

export type LabProject = {
  kind: "project";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  summary: string;
  /** 可选：本课新增的依赖，会渲染成操作列表的第一步 */
  install?: {
    command: string;
    description?: string;
  };
  /** 可选：课末验收步骤（操作列表的最后一项） */
  verify?: ProjectVerify;
  concepts: Concept[];
  /** 可选：知识点旁的延伸阅读 */
  conceptArticle?: ConceptArticle;
  files: ProjectFile[];
  docLinks: DocLink[];
};

const ORDER_LABELS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
] as const;

export function getOrderLabel(order: number) {
  return ORDER_LABELS[order - 1] ?? String(order);
}

export function getFileActionLabel(action: FileAction) {
  if (action === "replace") return "覆盖";
  if (action === "edit") return "修改";
  if (action === "run") return "执行";
  return "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-langgraph-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description:
      "创建 Next.js 项目（站点本身不跑 LangGraph，图都写在这个项目里）。",
    command: `pnpm dlx create-next-app@latest ${PROJECT_DIR} --yes --ts --eslint --tailwind --app --turbopack --import-alias "@/*"`,
  },
  {
    description: "进入刚创建的项目目录。",
    command: `cd ${PROJECT_DIR}`,
  },
  {
    description:
      "装运行时要用的包：LangGraph + LangChain 核心 + DeepSeek 模型，以及写 zod schema 用的 zod。",
    command: "pnpm add @langchain/langgraph @langchain/core @langchain/deepseek zod",
  },
  {
    description:
      "装 tsx（devDependency）：图写成一个脚本直接跑，不用起服务 —— 这套课到第 13 课接网页时才需要 dev 服务。",
    command: "pnpm add -D tsx",
  },
  {
    description: "在项目根目录创建 .env.local，填入 DeepSeek 的 API Key。",
    command: "touch .env.local",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "guide",
    slug: "getting-started",
    title: "初始化",
    menuTitle: "初始化",
    docLinks: [
      {
        title: "LangGraph 概览（JS）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/overview",
      },
      {
        title: "ChatDeepSeek 集成",
        href: "https://docs.langchain.com/oss/javascript/integrations/chat/deepseek",
      },
      {
        title: "create-next-app",
        href: "https://nextjs.org/docs/app/api-reference/cli/create-next-app",
      },
    ],
    files: [
      {
        path: "终端",
        steps: INIT_STEPS,
      },
      {
        path: ".env.local",
        hint: "ChatDeepSeek 默认从环境变量 DEEPSEEK_API_KEY 读 Key，这里只需写入这一行：",
        code: `DEEPSEEK_API_KEY=sk-...`,
      },
    ],
  },
  {
    kind: "project",
    slug: "first-graph",
    title: "第一个图：状态、节点与边",
    menuTitle: "第一个图",
    summary:
      "用一张 START → 两个节点 → END 的图跑通最小闭环：状态怎么声明、节点怎么改它、compile 之后怎么执行。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/hello.ts",
        "打印出「已连接：LangGraph！」，说明两个节点按边的顺序执行、状态被逐段改写",
      ],
    },
    concepts: [
      { text: "`StateSchema` — 声明图的状态；字段直接传 zod schema", note: "Python 里是 `TypedDict` + `Annotated`" },
      { text: "`StateGraph` — 用状态 schema 建一张图，之后 addNode / addEdge 都在它上面" },
      { text: "`addNode` — 注册一个节点，节点是 (state, config) => 部分更新 的函数" },
      { text: "`addEdge` — 把两个节点按顺序连起来" },
      { text: "`START` — 图的入口，指向第一个执行的节点" },
      { text: "`END` — 图的出口，表示这条边之后没有后续动作" },
      { text: "`compile` — 产出可执行对象；不 compile 就不能 invoke" },
      { text: "`invoke` — 跑一次图，返回执行完的完整状态（非流）" },
    ],
    files: [
      {
        path: "src/graphs/hello.ts",
        order: 1,
        action: "create",
        hint: "图的第一版：两个纯函数节点，先不接模型",
        code: `import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";

// ① 先声明状态：图里所有节点都读写这一份
const State = new StateSchema({
  name: z.string(),
  greeting: z.string().default(""),
});

// ② 节点就是普通函数：收到当前状态，返回「要改的字段」
function greet(state: typeof State.State) {
  return { greeting: \`已连接：\${state.name}\` };
}

// ③ 第二个节点接着改，拿到的是上一个节点改完的状态
function shout(state: typeof State.State) {
  return { greeting: \`\${state.greeting}！\` };
}

// ④ 建图：加节点 → 连边 → compile，
//    compile 之后才是可执行对象，invoke 才能跑
export const graph = new StateGraph(State)
  .addNode("greet", greet)
  .addNode("shout", shout)
  .addEdge(START, "greet")
  .addEdge("greet", "shout")
  .addEdge("shout", END)
  .compile();`,
      },
      {
        path: "scripts/hello.ts",
        order: 2,
        action: "create",
        hint: "脚本里 invoke 一次，把执行完的状态打出来",
        code: `import { graph } from "../src/graphs/hello";

async function main() {
  // 初始状态只需要给「没有默认值」的字段
  const result = await graph.invoke({ name: "LangGraph" });

  console.log(result.greeting);
  console.log(result);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "LangGraph 概览",
        href: "https://docs.langchain.com/oss/javascript/langgraph/overview",
      },
      {
        title: "Graph API",
        href: "https://docs.langchain.com/oss/javascript/langgraph/graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "state-and-reducers",
    title: "状态与更新：部分更新与 reducer",
    menuTitle: "状态与更新",
    summary:
      "节点返回的从来不是完整状态，而是一组「要改的字段」；每个字段是覆盖还是合并，由它自己的 reducer 决定。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "执行 pnpm tsx scripts/hello.ts",
        "打印「记录（合并）：…」与「记录（Overwrite 清空）：[]」—— 合并由 reducer 决定，清空要显式绕过它",
      ],
    },
    concepts: [
      { text: "`reducer` — 状态字段的合并规则：决定节点返回的新值怎么并进旧值，默认是后写覆盖", note: "Python 里写在 `Annotated[T, reducer]` 的第二位" },
      { text: "`MessagesValue` — 消息列表专用的状态字段：新消息自动追加，同 id 的消息就地更新", note: "变量不是函数；Python 用 `Annotated[list, add_messages]`" },
      { text: "`ReducedValue` — 自定义 reducer 的状态字段，把新值并进旧值而不是覆盖", note: "Python 没有这个类，写法是 `Annotated[list, reducer]`" },
      { text: "`Overwrite` — 包住一个值，绕过该字段的 reducer 直接替换整份值（合并型字段要清空时用）" },
      { text: "`default` — 给字段设初始值；zod 字段与 ReducedValue 都支持" },
      { text: "`typeof State.Node` — 给节点函数标注类型，参数与返回值都对上状态" },
    ],
    files: [
      {
        path: "src/graphs/hello.ts",
        order: 1,
        action: "replace",
        hint: "给状态换一套字段：消息、计数、需要自定义 reducer 的记录",
        code: `import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  Overwrite,
  START,
  END,
} from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  // ① 消息字段：内置 reducer，节点返回的新消息自动追加
  messages: MessagesValue,
  // ② 普通字段：默认 reducer 是「后写覆盖」
  name: z.string(),
  // ③ 带默认值的计数器：初始状态可以不给这个字段
  count: z.number().default(0),
  // ④ 自定义 reducer：把新值并进已有数组，而不是覆盖
  notes: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.string(),
    reducer: (current, next) => [...current, next],
  }),
  // ⑤ 开关字段：给下面的「清空」演示用
  clearNotes: z.boolean().default(false),
});

// 节点怎么改状态
//   只返回「要改的字段」，没提到的字段保持不动
//   要返回新值，别原地改 state（例如 state.messages.push(...)）—— 原地改绕过 reducer，快照也会是脏的
const ask: typeof State.Node = (state) => ({
  messages: [{ role: "user", content: \`介绍一下 \${state.name}\` }],
  count: state.count + 1,
  notes: "第一次提问",
});

const answer: typeof State.Node = (state) => ({
  messages: [{ role: "ai", content: \`\${state.name} 是一个状态图示例。\` }],
  count: state.count + 1,
  // 写入与合并：这里写的是「一项」，但 notes 是合并型 reducer，结果会变成两项
  // 清空的坑：合并型字段返回空数组清不掉，旧值还在（要清空见 ⑥）
  notes: "已回复",
});

// ⑥ 清空：合并型字段返回 [] 清不掉；开关打开时用 Overwrite 改写，关闭时返回 {} 不做任何改动
const reset: typeof State.Node = (state) =>
  state.clearNotes ? { notes: new Overwrite([]) } : {};

export const graph = new StateGraph(State)
  .addNode("ask", ask)
  .addNode("answer", answer)
  .addNode("reset", reset)
  .addEdge(START, "ask")
  .addEdge("ask", "answer")
  .addEdge("answer", "reset")
  .addEdge("reset", END)
  .compile();`,
      },
      {
        path: "scripts/hello.ts",
        order: 2,
        action: "replace",
        hint: "跑两遍：一遍看合并，一遍看用 Overwrite 清空",
        code: `import { graph } from "../src/graphs/hello";

async function main() {
  // 第一次：开关是默认的 false，notes 被两个节点合并成两项
  const merged = await graph.invoke({ name: "LangGraph" });

  console.log("消息条数：", merged.messages.length); // 2
  console.log("计数：", merged.count); // 2
  console.log("记录（合并）：", merged.notes); // ["第一次提问", "已回复"]

  // 第二次：打开开关，reset 节点用 Overwrite 把 notes 整体替换成空数组
  const cleared = await graph.invoke({ name: "LangGraph", clearNotes: true });

  console.log("记录（Overwrite 清空）：", cleared.notes); // []
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Graph API（State 与 reducers）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/graph-api",
      },
      {
        title: "Use the graph API",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "conditional-routing",
    title: "条件路由：让边自己决定下一步",
    menuTitle: "条件路由",
    summary:
      "把固定的边换成路由函数：返回哪个节点名就去哪里，返回 END 就结束；再配一条回边，图就能循环。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "执行 pnpm tsx scripts/hello.ts",
        "打印「最终文本：循环!!! / 执行次数：3」—— 说明 loop 节点被条件边来回调了三次才走 END",
      ],
    },
    concepts: [
      { text: "`addConditionalEdges` — 用函数决定下一步走哪个节点：返回值是节点名、END，或 Send（带着一份状态去跑目标节点，可以一次给好几个）" },
      { text: "`ConditionalEdgeRouter` — 给路由函数标注类型：声明能读到的状态与可达的节点" },
      { text: "`recursionLimit` — 一次 invoke 允许走多少个 super-step，默认 25，超出抛错" },
    ],
    conceptArticle: {
      title: "判断该交给谁：从条件边到专用决策模型",
      body: [
        "## 本课的路由函数是「确定性判断」",
        "能用代码判断的（阈值、状态机、白名单）就别交给模型：便宜、可测、可复现。这是默认做法，也是本课示例的做法。",
        "## 有些判断代码写不出来",
        "「这条消息算不算骚扰」「这个问题该转哪个队列」—— 规则表写不完，这时才把路由函数换成模型调用。",
        "## 第三条路：专用决策模型",
        "2026 年 9 月，TypeSafe AI 发布 Jev，提出「System One Model」这一类：不做生成，输入一段非结构化状态加一组问题，直接输出带校准概率的类型化决策 —— 选项（Choice）、评分（Score）、是或否（Noul）。官方称比同水平前沿 LLM 快 193.6 倍、便宜 444.6 倍，定价 $42 / 十亿输入 token、输出免费。",
        "- 名字取自杰文斯悖论；System One 借卡尼曼的「快思考」，把慢思考留给 LLM。",
        "- 生态里它典型的落点就是本课这种位置：路由、护栏、内容预筛，以及把 LLM-as-judge 换掉。",
        "## 什么时候值得换",
        "值 = 判断次数 × 单次省下的成本或延迟 − 接入成本。",
        "- 少而重（一天几十次、错了代价大）：不值。LLM 加结构化输出就够，多接一个 provider 的固定成本会吃掉收益。",
        "- 多而轻、彼此独立、可校验（路由、护栏、预筛、judge）：非常值。",
        "- 多而串联、错了不可回收（转账、发通知、改数据）：不值直接上；要么只在链的早期做路由，要么后面接规则或人工闸门。",
        "决定它的不是「判断多不多」，而是「每次判断做错了能不能被兜住」。兜得住就往它那边压，兜不住就不能让它单独拍板。",
        "## 别被官方数字带跑",
        "它目前没有独立论文，依据是官方博客与自建评测；第三方实测都显著低于官方上限（OpenRouter 说快 5 倍以上；LangChain 评估器实测平均 0.44 秒、$0.00035 一次）。",
        "- 最重的一条质疑叫「局部合理、全局愚蠢」：直接问它「这封是不是钓鱼邮件」准确率 62.6%，输给 Claude Haiku 4.5 的 81.3%；拆成五个子信号再加一个聚合器才到 95% —— 而这 95% 属于整个系统，不属于那个模型。",
        "- 推论：判断拆得越细，聚合这一步越关键。换模型之前先想清楚聚合器谁来做，否则省下的钱会在下游还回去。",
      ],
    },
    files: [
      {
        path: "src/graphs/hello.ts",
        order: 1,
        action: "replace",
        hint: "换成一个会循环的图：条件边决定继续还是结束",
        code: `import {
  StateGraph,
  StateSchema,
  START,
  END,
  ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  text: z.string(),
  count: z.number().default(0),
});

// 循环体：每走一次就追加一个字符、计数加一
const loop: typeof State.Node = (state) => ({
  text: \`\${state.text}!\`,
  count: state.count + 1,
});

// 路由函数：返回值就是下一个节点名，返回 END 表示到此为止。
// 返回 "loop" 就是回到 loop 自己 —— 条件边自指，不需要再写一条回边
const shouldStop: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "loop";
}> = (state) => (state.count < 3 ? "loop" : END);

export const graph = new StateGraph(State)
  .addNode("loop", loop)
  .addEdge(START, "loop")
  .addConditionalEdges("loop", shouldStop)
  .compile();`,
      },
      {
        path: "scripts/hello.ts",
        order: 2,
        action: "replace",
        hint: "recursionLimit 是本课唯一的配置项：上限别设得比循环次数还小",
        code: `import { graph } from "../src/graphs/hello";

async function main() {
  // recursionLimit 是 config 的顶层键（不能放进 configurable）
  const result = await graph.invoke(
    { text: "循环", count: 0 },
    { recursionLimit: 10 },
  );

  console.log("最终文本：", result.text); // 循环!!!
  console.log("执行次数：", result.count); // 3
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Use the graph API（分支与循环）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-graph-api",
      },
      {
        title: "Graph API",
        href: "https://docs.langchain.com/oss/javascript/langgraph/graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "tools-and-react",
    title: "工具调用：自己实现 agent 循环",
    menuTitle: "工具调用",
    summary:
      "模型决定调哪个工具，工具节点去执行，执行完再回到模型 —— 这个来回就是 agent 循环，用图的回边实现。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/agent.ts",
        "打印「消息链：human → ai → tool → ai」，最后一条是模型用工具算出的结果",
      ],
    },
    concepts: [
      { text: "`ChatDeepSeek` — DeepSeek 的聊天模型封装，从环境变量 DEEPSEEK_API_KEY 读 Key" },
      { text: "`bindTools` — 把工具列表绑到模型上，模型才知道有哪些工具可以调" },
      { text: "`tool` — 定义模型可调用的工具：name、description、zod schema", note: "Python 里是 `@tool` 装饰器" },
      { text: "`ToolNode` — 预置的工具节点：并行执行工具调用、处理报错、把结果写回状态" },
      { text: "`AIMessage` — 模型回复的消息类型，工具调用挂在它的 tool_calls 上" },
      { text: "`getType` — 读消息的角色类型：human / ai / tool" },
      { text: "`loadEnvFile` — Node 的 API：把 .env.local 读进 process.env（脚本不在 Next 里，得自己读）" },
    ],
    files: [
      {
        path: "src/graphs/agent.ts",
        order: 1,
        action: "create",
        hint: "本课程的主图：模型 → 工具 → 模型，直到模型不再调工具（顶部几行先把 .env.local 读进来）",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// 脚本是裸 Node 进程，没人替它读 .env.local（Next 才会自动读）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// ① 工具：模型只能看到 name、description 与 schema
const add = tool(({ a, b }) => String(a + b), {
  name: "add",
  description: "计算两个数字的和",
  schema: z.object({ a: z.number(), b: z.number() }),
});

const tools = [add];

// ② 模型 + 绑定工具：不 bindTools 模型不知道有工具可调。
//    deepseek-reasoner 不支持工具调用，这里用 deepseek-chat
const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools(tools);

const State = new StateSchema({ messages: MessagesValue });

// ③ 模型节点：模型要么直接回话，要么给出 tool_calls
const llmCall: typeof State.Node = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

// ④ 工具节点：ToolNode 负责执行 tool_calls，把结果写成 tool 消息
const toolNode = new ToolNode(tools);

// ⑤ 路由：最后一条消息是带 tool_calls 的模型消息，就去执行工具
const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && last.tool_calls.length > 0
    ? "toolNode"
    : END;
};

// ⑥ toolNode → llmCall 这条回边就是 agent 循环
export const agent = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .compile();`,
      },
      {
        path: "scripts/agent.ts",
        order: 2,
        action: "create",
        hint: "第一行先把 .env.local 读进来，再把整条消息链打出来",
        code: `import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

async function main() {
  const result = await agent.invoke({
    messages: [new HumanMessage("计算 12 加 30 的和")],
  });

  const chain = result.messages.map((message) => message.getType());
  console.log("消息链：", chain.join(" → "));
  console.log("最终回答：", result.messages.at(-1)?.content);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Workflows 与 Agents",
        href: "https://docs.langchain.com/oss/javascript/langgraph/workflows-agents",
      },
      {
        title: "ChatDeepSeek 集成",
        href: "https://docs.langchain.com/oss/javascript/integrations/chat/deepseek",
      },
    ],
  },
  {
    kind: "project",
    slug: "short-term-memory",
    title: "短期记忆：checkpointer 与 thread",
    menuTitle: "短期记忆",
    summary:
      "给图挂一个 checkpointer，同一个 thread_id 的每次 invoke 都会接上上次的状态 —— 多轮对话就是这么来的。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "执行 pnpm tsx scripts/memory.ts",
        "第二轮的回答里出现第一轮说过的名字 —— 说明状态被按 thread 存下来了",
        "随后打印出 6 个 checkpoint（每轮 3 个：刚收到输入 / 该跑模型 / 跑完），顺序是最新的在最前",
      ],
    },
    concepts: [
      { text: "`MemorySaver` — 内存版 checkpointer：把每一步的状态快照留在内存里，进程退出就没了", note: "Python 里叫 `InMemorySaver`" },
      { text: "`checkpointer` — compile 的选项：挂上它，图的状态才会被按 thread 保存", note: "挂上就必须给 thread_id，否则报错" },
      { text: "`thread_id` — 写在 configurable 里，指明「这是哪条对话」；同一个值就接着上次跑" },
      { text: "`getState` — 读某条 thread 最新的状态快照：values、next、metadata" },
      { text: "`getStateHistory` — 读这条 thread 的全部 checkpoint，异步可迭代，按时间倒序" },
    ],
    files: [
      {
        path: "src/graphs/agent.ts",
        order: 1,
        action: "replace",
        hint: "只改两处：导入 MemorySaver，compile 时挂上 checkpointer",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  MemorySaver,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// 脚本是裸 Node 进程，没人替它读 .env.local（Next 才会自动读）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const add = tool(({ a, b }) => String(a + b), {
  name: "add",
  description: "计算两个数字的和",
  schema: z.object({ a: z.number(), b: z.number() }),
});

const tools = [add];

const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools(tools);

const State = new StateSchema({ messages: MessagesValue });

const llmCall: typeof State.Node = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const toolNode = new ToolNode(tools);

const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && last.tool_calls.length > 0
    ? "toolNode"
    : END;
};

// 挂上 checkpointer：每次 super-step 的状态快照按 thread_id 存下来，
// 下次用同一个 thread_id invoke 就会先读回上次的状态
export const agent = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .compile({ checkpointer: new MemorySaver() });`,
      },
      {
        path: "scripts/memory.ts",
        order: 2,
        action: "create",
        hint: "两次 invoke 用同一个 thread_id，再读回状态与历史",
        code: `import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

// 同一个 thread_id = 同一条对话
const config = { configurable: { thread_id: "demo-1" } };

async function main() {
  await agent.invoke(
    { messages: [new HumanMessage("名字是 Nujabes，请记住")] },
    config,
  );

  // 第二轮只发新消息：历史由 checkpointer 从 thread 里读回来
  const second = await agent.invoke(
    { messages: [new HumanMessage("刚才那个名字是什么？")] },
    config,
  );
  console.log("回答：", second.messages.at(-1)?.content);

  // getState：读这条 thread 最新的快照；next 为空数组就表示已经跑完
  const state = await agent.getState(config);
  console.log("接下来要跑的节点：", state.next);
  // metadata 是可选字段，所以要写 metadata?.step
  console.log("已走步数：", state.metadata?.step);

  // getStateHistory：把这条 thread 的全部快照挨个取出来 —— 异步可迭代、按时间倒序。
  // 这里只打印 next，因为它能看出快照停在哪个阶段：
  // [] 跑完了 / ["llmCall"] 该跑模型 / ["__start__"] 刚收到输入（__start__ 是 START 的内部名）
  let index = 0;
  for await (const snapshot of agent.getStateHistory(config)) {
    index += 1;
    console.log(\`checkpoint \${index}，next = \${JSON.stringify(snapshot.next)}\`);
  }
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Persistence",
        href: "https://docs.langchain.com/oss/javascript/langgraph/persistence",
      },
      {
        title: "Checkpointers",
        href: "https://docs.langchain.com/oss/javascript/langgraph/checkpointers",
      },
    ],
  },
  {
    kind: "project",
    slug: "human-in-the-loop",
    title: "人工介入：interrupt 与 resume",
    menuTitle: "人工介入",
    summary:
      "图跑到「要人点头」的地方就停下来，状态留在 checkpoint 里；人给了答复，用 Command 带着答复恢复 —— 批准就继续，驳回就把意见带回模型重写。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "执行 pnpm tsx scripts/approve.ts：打印待确认内容后终端停下等人输入 —— 输入 approve 后模型回答「已发送通知：…」，输入别的则回答已被驳回",
        "执行 pnpm tsx scripts/command.ts：模型先起草，终端循环等人裁决 —— 输入修改意见会驳回并让模型重写，回车批准后打印模型写的发布话术",
      ],
    },
    concepts: [
      { text: "`interrupt` — 在节点或工具里喊停：把要人回答的内容抛给调用方，图挂起等回复" },
      { text: "`Command` — 既能当 invoke 的输入恢复挂起（带 resume），也能从节点返回（带 update 与 goto）", note: "resume 不能传 false，会被当成空输入" },
      { text: "`__interrupt__` — 挂起后返回结果里的字段，装着 interrupt 抛出的内容" },
      { text: "`goto` — 从节点返回 Command 时，指定下一步去哪个节点（或 END）" },
      { text: "`ends` — addNode 的选项：节点返回 Command 时，声明它可能跳到哪些节点" },
    ],
    conceptArticle: {
      title: "审批这件事：几个容易绕晕的点",
      body: [
        "## 走到中断时，模型已经跑过一轮",
        "llmCall 执行过之后才会去调工具、才会走到 interrupt。此时 messages 里最后一条是模型的「工具调用请求」，content 通常是空的，信息在 tool_calls 里。真正的最终回答要等恢复之后再跑一轮才有。",
        "## 挂起不是卡住",
        "interrupt 让图停下，把控制权交回调用方：invoke 立刻返回，结果里多一个 __interrupt__。终端不会自动弹出问题，网页也不会自动出现输入框 —— 要真人参与得自己接：终端用 readline 问，网页用 useStream 的批准按钮。",
        "## interrupt 的返回值就是 Command 的 resume",
        "恢复时 interrupt() 直接返回 new Command({ resume }) 里的值，代码里的 reply 就是终端输入的那句。",
        "## text 是传给调用方的",
        "interrupt({ ... }) 里的内容不进 state，调用方从返回结果的 __interrupt__ 里读，本课脚本取的是 __interrupt__[0].value.text。",
        "## resume 不能传 false",
        "JS 版内部用 if (cmd.resume) 判断有没有答复，所以 false / 0 / \"\" 会被当成「没传 resume」，直接抛 EmptyInputError。用 \"approve\" / \"reject\" 这样的字符串，或者把布尔包成对象。",
        "## Command 和条件边怎么选",
        "条件边的路由函数只能读 state，所以「批准还是驳回」必须先进状态字段；Command 可以在一次 return 里同时改状态和换路由，不必为这个决定多开字段。官方建议：只换路由、不改状态时用条件边；同一个节点上两者不要混用。",
        "## 返回 Command 要声明 ends",
        "addNode 的第三个参数里写 ends，列出这个节点可能跳到的节点名；不写会找不到目标。",
        "## 驳回的实际做法：把意见带回模型",
        "审批节点只做两件事 —— 问人、按答复路由。把驳回意见写进状态（示例里的 feedback），回到起草节点让模型按意见重写，再审一轮。实际项目里的审批循环就是这个形状。",
        "## 恢复时节点会从头重跑",
        "interrupt() 之前的代码在恢复时会再执行一遍，所以那段里的副作用要幂等（upsert、固定幂等键）。",
      ],
    },
    files: [
      {
        path: "src/graphs/agent.ts",
        order: 1,
        action: "replace",
        hint: "加一个需要人点头的工具：先在工具里 interrupt，拿到答复再决定做不做",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  MemorySaver,
  interrupt,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// 脚本是裸 Node 进程，没人替它读 .env.local（Next 才会自动读）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// 敏感工具：不自己拍板，先把要做的动作抛给人
const sendNotice = tool(
  async ({ text }: { text: string }) => {
    // payload 必须能被 JSON 序列化（不要传函数、类实例）
    const reply = interrupt({ action: "send_notice", text });

    // 重跑与 resume：恢复时这个节点会从头重跑，此时 interrupt 返回的就是 Command 里的 resume
    // 别传 false：false 会被当成「没传 resume」直接报错，所以这里用字符串判断
    if (reply !== "approve") return "已被人工驳回，未发送";
    return \`已发送通知：\${text}\`;
  },
  {
    name: "send_notice",
    description: "给用户发一条通知",
    schema: z.object({ text: z.string() }),
  },
);

const tools = [sendNotice];

const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools(tools);

const State = new StateSchema({ messages: MessagesValue });

const llmCall: typeof State.Node = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const toolNode = new ToolNode(tools);

const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && last.tool_calls.length > 0
    ? "toolNode"
    : END;
};

// interrupt 要有 checkpointer 才能挂起后恢复，thread_id 也不能少
export const agent = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .compile({ checkpointer: new MemorySaver() });`,
      },
      {
        path: "scripts/approve.ts",
        order: 2,
        action: "create",
        hint: "先跑到挂起，再在终端里问人（批准 / 驳回），把答复当作 resume 传回去；两轮必须用同一个 thread_id",
        code: `import { createInterface } from "node:readline/promises";
import { Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

const config = { configurable: { thread_id: "approve-1" } };

// 终端里真问一次：这就是「人工介入」里的那个人
async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  // 第一轮：模型调用 send_notice，工具里 interrupt，图在这里挂起并返回
  const paused = await agent.invoke(
    {
      messages: [
        new HumanMessage("请用 send_notice 工具发一条「会议改到 15:00」"),
      ],
    },
    config,
  );
  console.log("待确认：", paused.__interrupt__);

  // 挂起后控制权回到脚本：先问人，再把答复当作 resume 传回图里
  const answer = await ask("批准发送吗？（输入 approve 批准，其它输入驳回）");

  // 第二轮：同一个 thread_id + Command({ resume }) 恢复执行
  const resumed = await agent.invoke(
    new Command({ resume: answer === "approve" ? "approve" : "reject" }),
    config,
  );
  console.log("最终回答：", resumed.messages.at(-1)?.content);
}

main().catch(console.error);`,
      },
      {
        path: "src/graphs/approval.ts",
        order: 3,
        action: "create",
        hint: "另起一张小图，演示「节点直接返回 Command」：一次 return 同时改状态与决定下一步",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MemorySaver,
  START,
  END,
  Command,
  interrupt,
} from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

// 这个文件要调模型，所以自己把 .env.local 读进来（脚本是裸 Node 进程）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({ model: "deepseek-chat" });

const State = new StateSchema({
  topic: z.string(),                    // 要写什么主题
  text: z.string().default(""),         // 当前文案
  feedback: z.string().default(""),     // 人的驳回意见
  result: z.string().default(""),
});

// ① 起草 / 改写节点：有意见就按意见重写，没有就从零写
const draft: typeof State.Node = async (state) => {
  const prompt = state.feedback
    ? \`原文：\${state.text}。按这条意见重写，只输出文案本身：\${state.feedback}\`
    : \`写一条上线公告，主题：\${state.topic}。只输出文案本身。\`;

  const response = await model.invoke([new HumanMessage(prompt)]);
  return { text: String(response.content), result: "待审核" };
};

// ② 审核节点：只做两件事 —— 问人、按答复决定下一步
const review: typeof State.Node = (state) => {
  // 入参传给调用方（不进 state）；返回值就是 Command 里的 resume
  // resume 必须传真值：传 false / 0 / "" 会被当成「没传 resume」并抛 EmptyInputError
  const reply = interrupt({ action: "review", text: state.text });

  return reply === "approve"
    ? new Command({ update: { result: "已批准" }, goto: "publish" })
    : new Command({ update: { feedback: String(reply) }, goto: "draft" });
};

// ③ 发布节点：再由模型写一句交付给用户的话术
const publish: typeof State.Node = async (state) => {
  const response = await model.invoke([
    new HumanMessage(
      \`文案已通过审核并发布，内容：\${state.text}。用一句话说明已经发布。\`,
    ),
  ]);
  return { result: \`已发布：\${String(response.content)}\` };
};

// 返回 Command 的节点，必须在 addNode 的 ends 里声明可达节点
export const approval = new StateGraph(State)
  .addNode("draft", draft)
  .addNode("review", review, { ends: ["publish", "draft"] })
  .addNode("publish", publish)
  .addEdge(START, "draft")
  .addEdge("draft", "review")
  .addEdge("publish", END)
  .compile({ checkpointer: new MemorySaver() });`,
      },
      {
        path: "scripts/command.ts",
        order: 4,
        action: "create",
        hint: "循环问人：批准就发布，输入修改意见就驳回到 draft 让模型重写，然后再次审核",
        code: `import { createInterface } from "node:readline/promises";
import { Command } from "@langchain/langgraph";
import { approval } from "../src/graphs/approval";

const config = { configurable: { thread_id: "command-1" } };

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  // 第一轮：模型起草 → 审核节点挂起
  let result = await approval.invoke({ topic: "v2 版本上线" }, config);

  // 只要还挂着就继续问人：直接回车 = 批准；输入修改意见 = 驳回重写
  while (result.__interrupt__) {
    const text = (result.__interrupt__[0]?.value as { text?: string })?.text;
    console.log("当前文案：", text);

    const answer = await ask("批准发布吗？（回车 = 批准，或输入修改意见）");

    result = await approval.invoke(
      new Command({ resume: answer === "" ? "approve" : answer }),
      config,
    );
  }

  console.log("最终结果：", result.result);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Interrupts",
        href: "https://docs.langchain.com/oss/javascript/langgraph/interrupts",
      },
      {
        title: "Checkpointers",
        href: "https://docs.langchain.com/oss/javascript/langgraph/checkpointers",
      },
    ],
  },
  {
    kind: "project",
    slug: "streaming",
    title: "流式输出：stream 与 streamMode",
    menuTitle: "流式输出",
    summary:
      "同一个图换一种消费方式：逐步骤看状态变化、逐 token 看模型输出、看节点自己发的进度。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/stream.ts",
        "依次看到三段：updates 打出节点名、messages 逐字打出模型回答、custom 打出节点里 writer 发的那条数据",
      ],
    },
    concepts: [
      { text: "`stream` — 不返回最终状态，而是返回一个异步可迭代的 chunk 流（流）" },
      { text: "`streamMode` — 决定流里装什么：updates（状态增量）/ messages（模型 token）/ custom（自定义数据）" },
      { text: "`writer` — 节点或工具里通过第二个参数的 writer 往外发自定义数据，配合 custom 模式" },
    ],
    conceptArticle: {
      title: "流式输出：几个容易绕晕的点",
      body: [
        "## streamMode 的名字是固定的枚举",
        "values / updates / messages / custom / debug / checkpoints / tasks 都是 LangGraph 规定好的取值，不能自定义模式名；只有 custom 的**内容**由节点自己决定。",
        "## 想看模型文字必须显式写 messages",
        "不写 streamMode 时默认是 updates —— 那是早期留下的默认值，给的是「每步改了哪些字段」，不是模型文字。要做聊天界面，基本都要写 streamMode: \"messages\"。",
        "## 一次订阅多个模式",
        "传数组即可：streamMode: [\"messages\", \"custom\"]。这时每个块是 [模式名, 数据]，并且按发生时间交错在同一条流里 —— 模型 token、节点进度、状态更新会按实际执行顺序出现。",
        "## custom 是另一条通道，不是返回值",
        "节点（和工具）里调 config.writer(data) 就能往外发东西，节点的返回值仍然必须是状态更新。收到的只有那个值本身、不带节点名，想区分来源就在值里自己带标记。",
        "## writer 发出来的是实时的",
        "节点执行到那一行就发一块，不是攒到最后统一给。课程脚本里之所以看到 custom 排在最后，是因为它把图跑了三遍、每遍只订阅一个模式。",
        "## 有 checkpointer 就必须给 thread_id",
        "图只要 compile({ checkpointer })，每次运行都会写 checkpoint，所以 stream 和 invoke 一样都要 configurable.thread_id，不给会直接报错。",
        "## 思考内容在哪里",
        "只有思维链模型才有：DeepSeek 的 reasoner 把思考过程放在 additional_kwargs.reasoning_content，最终答案放在 content，两者分开。课程用的 deepseek-chat 没有这个字段。",
      ],
    },
    files: [
      {
        path: "src/graphs/agent.ts",
        order: 1,
        action: "replace",
        hint: "整份覆盖：只改了 llmCall 一处 —— 接上第二个参数，调模型前先往外发一条自定义进度",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  MemorySaver,
  interrupt,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// 脚本是裸 Node 进程，没人替它读 .env.local（Next 才会自动读）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// 敏感工具：不自己拍板，先把要做的动作抛给人
const sendNotice = tool(
  async ({ text }: { text: string }) => {
    // payload 必须能被 JSON 序列化（不要传函数、类实例）
    const reply = interrupt({ action: "send_notice", text });

    // 重跑与 resume：恢复时这个节点会从头重跑，此时 interrupt 返回的就是 Command 里的 resume
    // 别传 false：false 会被当成「没传 resume」直接报错，所以这里用字符串判断
    if (reply !== "approve") return "已被人工驳回，未发送";
    return \`已发送通知：\${text}\`;
  },
  {
    name: "send_notice",
    description: "给用户发一条通知",
    schema: z.object({ text: z.string() }),
  },
);

const tools = [sendNotice];

const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools(tools);

const State = new StateSchema({ messages: MessagesValue });

// 本课唯一改动：接上第二个参数，调模型前先发一条自定义进度
const llmCall: typeof State.Node = async (state, config) => {
  config.writer({ stage: "调用模型", messages: state.messages.length });

  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const toolNode = new ToolNode(tools);

const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && last.tool_calls.length > 0
    ? "toolNode"
    : END;
};

// interrupt 要有 checkpointer 才能挂起后恢复，thread_id 也不能少
export const agent = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .compile({ checkpointer: new MemorySaver() });`,
      },
      {
        path: "scripts/stream.ts",
        order: 2,
        action: "create",
        hint: "同一个图跑三遍，分别换一个 streamMode；图挂了 checkpointer，所以每次调用都要给 thread_id",
        code: `import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

const input = { messages: [new HumanMessage("用一句话解释什么是状态")] };

// 图挂了 checkpointer：不给 thread_id 会直接报错，这里三条流共用一个即可
const config = { configurable: { thread_id: "stream-1" } };

async function main() {
  // ① updates：每个 super-step 结束后，拿到该步改动的字段
  console.log("== updates ==");
  for await (const chunk of await agent.stream(input, {
    ...config,
    streamMode: "updates",
  })) {
    console.log("这一步动了：", Object.keys(chunk));
  }

  // ② messages：模型逐 token 输出，每个 chunk 是 [消息块, 元信息]
  console.log("== messages ==");
  for await (const [chunk] of await agent.stream(input, {
    ...config,
    streamMode: "messages",
  })) {
    if (chunk.content) process.stdout.write(String(chunk.content));
  }
  console.log();

  // ③ custom：节点里 writer 发什么，这里就收到什么
  console.log("== custom ==");
  for await (const chunk of await agent.stream(input, {
    ...config,
    streamMode: "custom",
  })) {
    console.log(chunk);
  }
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Streaming",
        href: "https://docs.langchain.com/oss/javascript/langgraph/streaming",
      },
      {
        title: "Graph API",
        href: "https://docs.langchain.com/oss/javascript/langgraph/graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "long-term-memory",
    title: "长期记忆：Store 与跨 thread",
    menuTitle: "长期记忆",
    summary:
      "两者差在两个维度：checkpointer 存的是图的执行状态（每个 super-step 的快照，框架自动写，用来恢复与续跑，只限一条 thread）；Store 存的是要长期记住的数据（自己 put / search 的键值，跨 thread 可用）—— 前者是运行存档，后者是长期资料。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/profile.ts",
        "第二轮换了 thread_id、userId 不变，回答里仍然记得第一轮说过的偏好",
      ],
    },
    concepts: [
      { text: "`ContextSchema` — 节点函数的第二个参数：这次运行的运行时环境\n- writer：往 custom 流发自定义数据\n- store：长期记忆（compile 时挂上）\n- context：invoke 时传的业务数据\n- configurable：thread_id 这类机制键", note: "文档里也常写成 `runtime`，同一个对象" },
      { text: "`InMemoryStore` — 内存版长期记忆：按 namespace 存任意键值数据，跨 thread 可读" },
      { text: "`store` — compile 的选项：挂上它，节点里才能通过第二个参数上的 store 读写" },
      { text: "`context` — invoke 时传进去的运行时数据（如 userId），节点里从第二个参数上读" },
      { text: "`put` — 往某个 namespace 写一条记忆" },
      { text: "`search` — 按 namespace 查记忆；namespace 是前缀匹配，默认最多 10 条" },
    ],
    conceptArticle: {
      title: "长期记忆：几个容易绕混的点",
      body: [
        "## checkpointer 与 Store 差在两个维度",
        "范围：checkpointer 只限一条 thread，Store 跨 thread。性质：checkpointer 存的是图的执行快照（框架自动写，用来恢复与续跑），Store 存的是要长期记住的数据（自己 put / search，用的时候自己去读）。一句话 —— 前者是运行存档，后者是长期资料。",
        "## 课程里的内存版只是演示",
        "MemorySaver 与 InMemoryStore 的好处是零依赖、能立刻跑。生产换成 PostgresStore / MongoDBStore / RedisStore / UpstashStore，改动只有两处：构造实例、compile({ checkpointer, store })；节点里的 runtime.store.put / search 一个字都不用改。",
        "## 三份数据各放哪儿",
        "checkpointer 的表（checkpoints / checkpoint_blobs / checkpoint_writes）由框架自己建，别手动改；Store 的表存长期记忆条目；自己的业务表（如 conversations / messages）给人看：历史、检索、审计。常见形态是同一个数据库实例里三组表并存，用不上 Store 就不建。",
        "## 什么该进 Store",
        "判断标准只有一条：以后要不要主动塞回 prompt 给模型看。要 —— 放 Store（偏好、事实、经验、跨会话的任务状态，短且结构化）；只是要能查、能展示 —— 放业务表。",
        "## 写入侧三步：筛 → 提炼 → 覆盖",
        "saveMemory 就是这三步：先让模型当裁判（挑出值得长期记住的），再提炼成「固定槽位 + 一句话」（不存原文），最后用固定 key 写进同一个 namespace —— 同类覆盖，条目数不随聊天量增长。提炼用 withStructuredOutput 直接拿结构化结果，省去解析 JSON。",
        "## 时机与成本",
        "裁判放在回答之后（图里 llmCall → saveMemory），不挡回答；代价是每轮多一次模型调用。想省，可以先用规则筛（关键词、长度），命中才调模型；或者给模型一个 save_memory 工具，它觉得该记才记。",
        "## namespace 与 search",
        "namespace 是分层目录：put([userId, \"facts\"], key, value) 写进去，search([userId]) 会命中它下面所有层级（前缀匹配），search([userId, \"facts\"]) 只查这一层。search 不带 query 就是按前缀列出（默认最多 10 条）；带 query 走向量相似度，需要向量 Store（Postgres + pgvector / Redis / MongoDB）并配好 embedding。官方实现自带 search，只有自己实现 BaseStore 才要自己写。",
      ],
    },
    files: [
      {
        path: "src/graphs/agent.ts",
        order: 1,
        action: "replace",
        hint: "作答后让模型筛一遍、提炼成「槽位 + 一句话」覆盖写入；开聊时先读出来拼进上下文",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  MemorySaver,
  InMemoryStore,
  interrupt,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// 脚本是裸 Node 进程，没人替它读 .env.local（Next 才会自动读）
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const sendNotice = tool(
  async ({ text }: { text: string }) => {
    const reply = interrupt({ action: "send_notice", text });
    if (reply !== "approve") return "已被人工驳回，未发送";
    return \`已发送通知：\${text}\`;
  },
  {
    name: "send_notice",
    description: "给用户发一条通知",
    schema: z.object({ text: z.string() }),
  },
);

const tools = [sendNotice];

const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools(tools);

// 运行时上下文：invoke 时传进来的 userId，节点里从第二个参数上读。
// 标成 optional：不传 context 的调用（例如 Agent Server 直接调图）也能跑，按未登录处理
const ContextSchema = z.object({ userId: z.string().optional() });

const State = new StateSchema({ messages: MessagesValue });

// 记忆裁判的输出：一组「固定槽位 + 一句话」，空数组表示这轮不值得记
const MemoryFacts = z.object({
  facts: z.array(
    z.object({
      key: z.string().describe("固定槽位名，如 name / preference / project；同类用同一个 key"),
      value: z.string().describe("一句话结论，别抄原话"),
    }),
  ),
});

const judge = new ChatDeepSeek({ model: "deepseek-chat" }).withStructuredOutput(MemoryFacts);

const JUDGE_PROMPT = [
  "从下面这轮对话里挑出值得长期记住的内容，整理成「固定槽位 + 一句话」。",
  "只记稳定的：偏好、事实、正在做的项目。寒暄、一次性问题、临时内容都不要。",
  "同类信息用同一个 key（偏好统一用 preference），已经记过就覆盖，不要另起新 key。",
  "没有值得记的就返回空数组。",
].join("\\n");

// 长期记忆（写入侧）：筛 → 提炼 → 覆盖，跑在回答之后
const saveMemory: typeof State.Node = async (state, runtime) => {
  const userId = runtime.context?.userId;
  if (!userId || !runtime.store) return {};

  const transcript = state.messages
    .map((message) => \`\${message.getType()}: \${String(message.content)}\`)
    .join("\\n");

  // ① 筛 + ② 提炼：交给模型判断值不值得记，并压成槽位（不存原文）
  const { facts } = await judge.invoke([
    { role: "system", content: JUDGE_PROMPT },
    { role: "user", content: transcript },
  ]);
  if (!facts.length) return {};

  // ③ 覆盖：固定 key 写进同一 namespace，同类只更新不新增
  for (const fact of facts) {
    await runtime.store.put([userId, "facts"], fact.key, { value: fact.value });
  }
  return {};
};

// 长期记忆（读取侧）：开聊时把该用户的槽位读出来，拼成一条 system 消息
const loadMemory: typeof State.Node = async (state, runtime) => {
  const userId = runtime.context?.userId;
  const items = await runtime.store?.search([userId ?? "anonymous", "facts"]);
  if (!items?.length) return {};

  const facts = items
    .map((item: { key: string; value: unknown }) => \`- \${item.key}: \${(item.value as { value: string }).value}\`)
    .join("\\n");

  return { messages: [{ role: "system", content: \`已知信息：\\n\${facts}\` }] };
};

const llmCall: typeof State.Node = async (state, config) => {
  config.writer({ stage: "调用模型", messages: state.messages.length });

  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const toolNode = new ToolNode(tools);

const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode" | "saveMemory";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && last.tool_calls.length > 0
    ? "toolNode"
    : "saveMemory";
};

// 第二个参数：文档里有时写 config、有时写 runtime，是同一个对象 ——
// writer、store、context 都挂在它上面
export const agent = new StateGraph(State, ContextSchema)
  .addNode("loadMemory", loadMemory)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("saveMemory", saveMemory)
  .addEdge(START, "loadMemory")
  .addEdge("loadMemory", "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .addEdge("saveMemory", END)
  .compile({ checkpointer: new MemorySaver(), store: new InMemoryStore() });`,
      },
      {
        path: "scripts/profile.ts",
        order: 2,
        action: "create",
        hint: "换一张 thread_id、userId 不变，看记忆还在不在",
        code: `import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

async function main() {
  // 第一条对话：说一条偏好
  await agent.invoke(
    { messages: [new HumanMessage("偏好：回答尽量短")] },
    { configurable: { thread_id: "thread-a" }, context: { userId: "u-1" } },
  );

  // 第二条对话：thread_id 换了，userId 没换
  const result = await agent.invoke(
    { messages: [new HumanMessage("刚才记录的偏好是什么？")] },
    { configurable: { thread_id: "thread-b" }, context: { userId: "u-1" } },
  );

  console.log("回答：", result.messages.at(-1)?.content);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Stores（长期记忆）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/stores",
      },
      {
        title: "Persistence",
        href: "https://docs.langchain.com/oss/javascript/langgraph/persistence",
      },
      {
        title: "Add memory",
        href: "https://docs.langchain.com/oss/javascript/langgraph/add-memory",
      },
    ],
  },
  {
    kind: "project",
    slug: "state-and-time-travel",
    title: "状态编辑与时间旅行：回到某一步再跑",
    menuTitle: "时间旅行",
    summary:
      "checkpoint 不只是记忆，也是存档点：能列出这条 thread 走过的每一步、挑一步当新起点重跑，也能在重跑前先把状态改掉。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/time-travel.ts",
      ],
    },
    concepts: [
      { text: "`updateState` — 手动往某个 checkpoint 写状态，生成一个新的分叉点（原 checkpoint 不动）", note: "第一个参数是历史快照的 config，不是 thread_id" },
      { text: "`checkpoint_id` — 写在 configurable 里，指明从哪一个 checkpoint 接着跑", note: "由 checkpointer 分配，存在快照的 config 里" },
      { text: "`asNode` — updateState 的第三个参数（字符串）：声明这次改动算哪个节点做的，从它的后继继续跑" },
      { text: "`next` — 快照里的字段：这一步之后还要跑哪些节点，空数组表示已经跑完" },
    ],
    conceptArticle: {
      title: "时间旅行：几个容易绕混的点",
      body: [
        "## checkpoint 与 snapshot 是同一件事的两种叫法",
        "checkpoint 指 checkpointer 里存的那条记录，带自己的 `checkpoint_id`；snapshot 指把它读出来时的对象，就是 `getState()` / `getStateHistory()` 返回的 `StateSnapshot`（字段有 `values`、`next`、`config`）。平时说「状态快照」，指的就是后者。",
        "## 每条 checkpoint 存的是完整快照，不是改动日志",
        "所以任意一条都能直接当新起点 —— 它自带那份状态的全部字段，不用把前面的记录累加起来。相邻两条大部分内容重复，差别只在被改动的字段。写入时机是每个 super-step 结束，粒度就是这个循环的步长。",
        "## `next` 说的是「之后还要跑谁」",
        "不是「已经跑了谁」。刚写入输入、还没跑任何节点的快照，`next` 是入口节点；跑完的终态是空数组。要从历史里挑某个阶段的快照，用它筛最直接。",
        "## `updateState` 不跑图，也不改历史",
        "它只做三件事：取指定那条 checkpoint 的值、把新值按 reducer 合进去（`Overwrite` 可绕过 reducer）、新写一条挂在它下面的 checkpoint。原记录一条都不动，所以 `getStateHistory` 里新旧都在。要让它接着跑，得再 `invoke(null, 新 config)`。",
        "## 改一条消息，结果有三种",
        "构造同 id 的新消息：按 id 就地更新，条数不变；不带 id 直接给：被当成新消息追加到末尾；用 `Overwrite` 交出整个数组：以给出的数组为准，没放进去的消息在新快照里就不存在（旧消息的 id 一起消失）。想让模型「重新回答」，就得把后面的消息从数组里去掉，否则模型看到的是已经聊过的上下文，只会顺着往下说。",
        "## 能回档的只有图的状态",
        "Store 里的长期记忆不受影响 —— 它不在 checkpoint 里，`updateState` 与时间旅行都不碰它。外部副作用同样不回滚：重跑时节点整段重新执行，发过的通知会再发、写过的库会再写。",
        "## 重跑要求节点幂等",
        "幂等指同一操作跑一次和跑多次结果一样。恢复、时间旅行、出错重试都会让节点从头再跑一遍，所以副作用要写成可重复的：按固定 key 覆盖写、先查再写、或者把真正不可重复的动作放到 `interrupt` 之后。自增计数、扣款、发消息这类，必须能挡住重复执行。",
      ],
    },
    files: [
      {
        path: "scripts/time-travel.ts",
        order: 1,
        action: "create",
        hint: "agent 图到这一课已经带了 checkpointer 与 store：先跑两轮攒历史，再从第二轮开始前那一步各跑一次",
        code: `import { Overwrite } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

// 图带了 ContextSchema，调用时一并给出 userId（不传也不会报错，只是记不进这个人的记忆）
const config = {
  configurable: { thread_id: "travel-1" },
  context: { userId: "u-1" },
};

async function main() {
  // ① 先跑两轮，攒出一串 checkpoint
  await agent.invoke(
    { messages: [new HumanMessage("记住：代号是 blue")] },
    config,
  );
  const second = await agent.invoke({ messages: [new HumanMessage("代号是什么？")] }, config);

  // ② 列出这条 thread 的全部 checkpoint（按时间倒序，最新的在最前）
  const history = [];
  for await (const snapshot of agent.getStateHistory(config)) {
    history.push(snapshot);
  }
  console.log("checkpoint 数：", history.length);

  // ③ 取这一步的 config
  //    挑哪一步：第二轮刚写入输入、还没跑任何节点的那步（next 是 ["saveMemory"]，图的入口节点）
  //    拿来干嘛：④ 重跑、⑤ 分叉都靠它定位到这一步（里面带 checkpoint_id）
  const point = history.find((snapshot) => snapshot.next.includes("saveMemory"));
  console.log("选中那一步的 checkpoint_id：", point.config.configurable?.checkpoint_id);
  console.log("这一步之后要跑：", point.next);

  // ④ 原样重跑：输入传 null 表示不注入新输入，只从这一步接着跑
  console.log("重跑前的回答：", second.messages.at(-1)?.content);
  const replay = await agent.invoke(null, point.config);
  console.log("重跑的回答：", replay.messages.at(-1)?.content);

  // ⑤ 改状态再跑（分叉）
  //    改什么：把待处理的输入整体换掉 —— messages 是合并型字段，想替换得用 Overwrite 绕过 reducer
  //    从哪儿跑：asNode 声明这次改动算 saveMemory 做的，从它的后继继续（于是跳过了 saveMemory）
  const forked = await agent.updateState(
    point.config,
    {
      messages: new Overwrite([
        new HumanMessage("换个问题：用一句话说明什么是状态"),
      ]),
    },
    "saveMemory",
  );
  const branch = await agent.invoke(null, forked);
  console.log("分叉的回答：", branch.messages.at(-1)?.content);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "时间旅行（replay 与 fork）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-time-travel",
      },
      {
        title: "Checkpointers",
        href: "https://docs.langchain.com/oss/javascript/langgraph/checkpointers",
      },
      {
        title: "Persistence",
        href: "https://docs.langchain.com/oss/javascript/langgraph/persistence",
      },
    ],
  },
  {
    kind: "project",
    slug: "subgraphs-and-send",
    title: "子图与并行：Send 做 map-reduce",
    menuTitle: "子图与并行",
    summary:
      "一张编译好的图可以直接当另一张图的节点；条件边返回 Send 数组，就能按数据条数动态并行，最后再汇总。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/supervisor.ts",
        "打印三条分支结果（三个词各一条）与一行汇总 —— 说明 Send 按数组长度起了三个并行分支",
      ],
    },
    concepts: [
      { text: "`Send` — 条件边返回它，就能为每条数据动态生成一次下游节点调用（map-reduce）" },
      { text: "子图当节点 — compile 过的图可以直接传给 addNode；同名 key 会被父图接收" },
    ],
    files: [
      {
        path: "src/graphs/research.ts",
        order: 1,
        action: "create",
        hint: "子图：只做一件小事 —— 把拿到的词变大写",
        code: `import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";

// results 这个 key 与父图同名，子图写进去的值会回流给父图
const SubState = new StateSchema({
  word: z.string(),
  results: z.array(z.string()).default(() => []),
});

const upper: typeof SubState.Node = (state) => ({
  results: [\`\${state.word} → \${state.word.toUpperCase()}\`],
});

export const research = new StateGraph(SubState)
  .addNode("upper", upper)
  .addEdge(START, "upper")
  .addEdge("upper", END)
  .compile();`,
      },
      {
        path: "src/graphs/supervisor.ts",
        order: 2,
        action: "create",
        hint: "父图：把子图当节点，用 Send 对每个词各起一个分支",
        code: `import {
  StateGraph,
  StateSchema,
  ReducedValue,
  Send,
  START,
  END,
} from "@langchain/langgraph";
import { z } from "zod";
import { research } from "./research";

const State = new StateSchema({
  words: z.array(z.string()),
  // 多个并行分支会同时写这个字段，所以必须有 reducer 负责合并
  results: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.array(z.string()),
    reducer: (current, next) => [...current, ...next],
  }),
  summary: z.string().default(""),
});

// 条件入口（fan-out）
//   返回几个 Send，就并行起几个 research 分支，每个分支只拿到自己那一份状态
//   参数只声明读到的字段：标 ConditionalEdgeRouter 会要求 Send 带完整父状态（1.4.21 如此），不适用
const fanOut = (state: { words: string[] }) =>
  state.words.map((word) => new Send("research", { word }));

// 汇总节点：等所有分支写完后才执行
const collect: typeof State.Node = (state) => ({
  summary: state.results.join(" / "),
});

export const supervisor = new StateGraph(State)
  .addNode("research", research)
  .addNode("collect", collect)
  .addConditionalEdges(START, fanOut)
  .addEdge("research", "collect")
  .addEdge("collect", END)
  .compile();`,
      },
      {
        path: "scripts/supervisor.ts",
        order: 3,
        action: "create",
        hint: "给一个数组，看它拆成几个分支、又怎么汇总",
        code: `import { supervisor } from "../src/graphs/supervisor";

async function main() {
  const result = await supervisor.invoke({
    words: ["alpha", "beta", "gamma"],
  });

  console.log("各分支结果：", result.results);
  console.log("汇总：", result.summary);
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Subgraphs",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs",
      },
      {
        title: "Use the graph API（Send 与并行）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "multi-agent-delegate",
    title: "多 Agent（一）：委派与移交",
    menuTitle: "多 Agent（一）",
    summary:
      "两个子 agent 各管一件事，父图用三种方式把活交出去：包成工具（控制权留在主 agent）、返回 Command（控制权转走）、由主管按状态派活。",
    verify: {
      label: "跑脚本看四段输出",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/multi-agent.ts",
        "四段依次是：子 agent 自己调工具、委派后主 agent 复述结果、移交后由 writer_agent 收尾、主管逐次打印「派给谁 + 理由」并交出文案",
      ],
    },
    concepts: [
      { text: "`Command.PARENT` — 子图里返回 Command 时写它，goto 才会落在父图的节点上" },
      { text: "`ToolRuntime` — 工具第二个参数：读当前图状态（state）与本次调用 id（toolCallId）" },
      { text: "`AIMessage.isInstance` — 判断一条消息是不是 AI 消息，用来找触发移交的那条" },
      { text: "子图当工具 — compile 过的图用 tool() 包一层，主 agent 像调普通工具一样拿它的结果" },
      { text: "路由要兜底 — 模型只说派给谁，走不走由条件边复核（说 done 但稿子没交，就自己派 writer）" },
    ],
    conceptArticle: {
      title: "多 Agent：什么时候该拆，拆了要付什么账",
      body: [
        "## 三种交法，先把控制权放在哪说清",
        "- 委派（agents as tools）：调用方还在，子 agent 只被问一次，结果变成一条工具消息回来。适合取一个结论或一段产物。",
        "- 移交（handoff）：控制权永久转走，后面这轮对话由接收方接。适合接下来这件事根本不归原 agent 管。",
        "- 主管（supervisor）：它自己不干活，只决定下一个派给谁；派出去的人干完再回来问它。适合步骤不确定、要按中间结果改派。",
        "## 还有第四种：群聊（不指定接收方）",
        "- 共享同一段对话，由一条规则决定下一句谁来说：轮流、按条件、或者让模型自己选。",
        "- 与移交的区别：移交有明确接收方，接手后原来那个不再说话；群聊里谁都能接着说，也没有「交接完成」这个动作。",
        "- 代价是状态最脏：几个 agent 的发言混在同一条历史里，出错时很难判断是谁的判断坏了。适合讨论、评审这类没有唯一正确答案的环节。",
        "## 错误会不会放大，看串联还是并行",
        "- 串联、且下游发现不了上游出错：错误会乘性叠加，三步各 90% 就只剩七成左右。",
        "- 并行、且每一路的结果都能校验：错的那一路能被筛掉或重跑，不按乘法算，只按「至少要有一路对」算。",
        "- 所以判据不是「尽量少拆」，而是每一步有没有独立的校验手段；没有校验的串联链路，拆得越多越不可靠。",
        "## 先别拆：这三种情况单 agent 就够",
        "- 提示词写清楚、工具减到三五个就能解决 —— 拆开只是把同样的模型调用次数放大。",
        "- 步骤固定、每步都是确定性代码 —— 那是节点，不是 agent；下一课的固定链路就是这种。",
        "- 只是上下文太长 —— 用压缩或检索解决，不是拆 agent。",
        "## 拆开要付的三笔账",
        "- 钱与延迟：每一跳都是一次完整循环（模型调用，加上可能的工具调用），按跳数累加。",
        "- 状态要显式传：子 agent 看不到父级聊天记录，缺的信息必须写进状态或当参数传，否则它会自己编。",
        "- 排查变难：出错时要先分清是路由选错、子 agent 做错，还是交接时信息丢了；所以每一跳都得留痕（本课 supervisor 的 routeLog 就是干这个）。",
        "## 一个反例",
        "「查一条事实，再写一句话」是两步固定流程，用下一课那种固定链路就够。拆成研究员 + 文案 + 主管，只多了两次模型调用和一个会出错的环节。",
      ],
    },
    files: [
      {
        path: "src/graphs/workers.ts",
        order: 1,
        action: "create",
        hint: "两个可复用的子 agent，各自 compile 好导出，本文件不跑图\n- researcher：带 lookup 工具的完整循环，给一个主题就自己查一条资料\n- writer：只调一次模型、没有工具，把已有资料写成一句文案",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// mock 资料库：不联网，跑几次结果都一样
const DOCS: Record<string, string> = {
  延迟: "deepseek-chat 的 p95 延迟约 1.8 秒",
  价格: "deepseek-chat 每百万输入 token 2 元",
};

const lookup = tool(
  async ({ topic }: { topic: string }) =>
    DOCS[topic] ?? \`资料库里没有「\${topic}」，只能按已知常识作答\`,
  {
    name: "lookup",
    description: "查内部资料里的延迟、价格等具体数据；topic 直接填主题词（如「价格」）",
    // 自由字符串而不是枚举：调用方给的主题不可能事先穷举，
    // 查不到就返回一句兜底，别让工具直接报参数错误
    schema: z.object({ topic: z.string().describe("要查的主题") }),
  },
);

// 两个子 agent 共用一个状态形状：只带消息
const WorkerState = new StateSchema({ messages: MessagesValue });

const RESEARCH_PROMPT = [
  "资料员职责：问题涉及延迟、价格这类具体数据就直接调 lookup，topic 填问题里的主题词，不要反问。",
  "闲聊、算数、常识类问题直接回答，不调工具。",
  "查不到再按已知常识回答；查到一条就够，只陈述事实，不要补充建议。",
].join("\\n");

// 资料子 agent：内部是完整的一轮「模型 → 工具 → 模型」，不是一次问答
const researchModel = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools([lookup]);

const researchCall: typeof WorkerState.Node = async (state) => ({
  messages: [
    await researchModel.invoke([new SystemMessage(RESEARCH_PROMPT), ...state.messages]),
  ],
});

const researchRoute: ConditionalEdgeRouter<{
  InputSchema: typeof WorkerState;
  Nodes: "lookup";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && Boolean(last.tool_calls?.length) ? "lookup" : END;
};

export const researcher = new StateGraph(WorkerState)
  .addNode("callModel", researchCall)
  .addNode("lookup", new ToolNode([lookup]))
  .addEdge(START, "callModel")
  .addConditionalEdges("callModel", researchRoute)
  .addEdge("lookup", "callModel")
  .compile();

const WRITER_PROMPT = [
  "基于对话里给出的信息，直接给出一条 20 字以内的中文宣传文案。",
  "只输出文案本身，不要解释、不要提问、不要复述移交过程。",
].join("\\n");

// 文案子 agent：一个模型节点就够了，它没有工具
const writerModel = new ChatDeepSeek({ model: "deepseek-chat" });

const writeOne: typeof WorkerState.Node = async (state) => ({
  messages: [
    await writerModel.invoke([new SystemMessage(WRITER_PROMPT), ...state.messages]),
  ],
});

export const writer = new StateGraph(WorkerState)
  .addNode("write", writeOne)
  .addEdge(START, "write")
  .addEdge("write", END)
  .compile();`,
      },
      {
        path: "src/graphs/delegate.ts",
        order: 2,
        action: "create",
        hint: "委派：把文案子 agent 包成工具，结果以一条工具消息回到主 agent",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { writer } from "./workers";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// 委派：把编译好的子 agent 包成一个普通工具 —— 入参进、一句话出，
// 控制权始终留在主 agent 手里，主 agent 还能接着调下一个工具。
// 子 agent 的返回值会变成一条 ToolMessage 落进消息历史，而不是新开一段对话
const writeCopy = tool(
  async ({ topic }: { topic: string }) => {
    const result = await writer.invoke({
      messages: [
        {
          role: "user",
          content: \`写一条关于「\${topic}」的宣传文案，20 字以内，只输出文案本身\`,
        },
      ],
    });
    return String(result.messages.at(-1)?.content);
  },
  {
    name: "write_copy",
    description: "把写文案的活交给文案子 agent，返回它写好的那一句话",
    schema: z.object({ topic: z.string() }),
  },
);

const State = new StateSchema({ messages: MessagesValue });

const model = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools([writeCopy]);

const llmCall: typeof State.Node = async (state) => ({
  messages: [await model.invoke(state.messages)],
});

const route: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "toolNode";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && Boolean(last.tool_calls?.length) ? "toolNode" : END;
};

export const delegate = new StateGraph(State)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", new ToolNode([writeCopy]))
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", route)
  .addEdge("toolNode", "llmCall")
  .compile();`,
      },
      {
        path: "src/graphs/handoff.ts",
        order: 3,
        action: "create",
        hint: "移交：技术支持把整段对话交给文案 agent，之后由它接话，技术支持不再参与",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  START,
  END,
  Command,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { writer } from "./workers";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// 父图状态比子 agent 多一个 activeAgent：记录现在谁在接话；
// 子 agent 只用得到 messages，两个状态结构不要求完全一样
const State = new StateSchema({
  messages: MessagesValue,
  activeAgent: z.string().default("support_agent"),
});

// 移交：工具直接返回 Command，goto 写的是父图的节点名。
// graph: Command.PARENT = 不在子图里跳，改在父图的节点之间跳
const transferToWriter = tool(
  async (_, runtime: ToolRuntime<typeof State.State>) => {
    // 触发这次移交的那条 AI 消息带着 tool_call，必须配对一条 tool 结果，
    // 否则消息历史里会留下一个没人回应的调用，下一轮模型会报错
    const lastAiMessage = [...runtime.state.messages]
      .reverse()
      .find(AIMessage.isInstance);

    return new Command({
      goto: "writer_agent",
      update: {
        activeAgent: "writer_agent",
        messages: [
          lastAiMessage,
          new ToolMessage({
            content: "已移交给文案 agent",
            tool_call_id: runtime.toolCallId,
          }),
        ].filter(Boolean),
      },
      graph: Command.PARENT,
    });
  },
  {
    name: "transfer_to_writer",
    description: "把对话移交给文案 agent，之后由它接话",
    schema: z.object({}),
  },
);

const SUPPORT_PROMPT = [
  "技术支持只回答性能与延迟问题。",
  "文案请求一律移交：调 transfer_to_writer，不要自己写。",
].join("\\n");

const supportModel = new ChatDeepSeek({ model: "deepseek-chat" }).bindTools([
  transferToWriter,
]);

const supportCall: typeof State.Node = async (state) => ({
  messages: [
    await supportModel.invoke([new SystemMessage(SUPPORT_PROMPT), ...state.messages]),
  ],
});

const supportRoute: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "tools";
}> = (state) => {
  const last = state.messages.at(-1);
  return last instanceof AIMessage && Boolean(last.tool_calls?.length) ? "tools" : END;
};

const supportAgent = new StateGraph(State)
  .addNode("callModel", supportCall)
  .addNode("tools", new ToolNode([transferToWriter]))
  .addEdge(START, "callModel")
  .addConditionalEdges("callModel", supportRoute)
  .addEdge("tools", "callModel")
  .compile();

// ends 声明「这个节点可能跳到哪」：它内部会返回带 goto 的 Command，
// 图必须提前知道目标节点存在，否则编译不过
export const handoff = new StateGraph(State)
  .addNode("support_agent", supportAgent, { ends: ["writer_agent"] })
  .addNode("writer_agent", writer)
  .addEdge(START, "support_agent")
  .addEdge("support_agent", END)
  .addEdge("writer_agent", END)
  .compile();`,
      },
      {
        path: "src/graphs/supervisor-agents.ts",
        order: 4,
        action: "create",
        hint: "主管：模型只决定下一个派给谁，条件边负责复核与封顶",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  START,
  END,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { researcher, writer } from "./workers";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

// 主管自己不干活，只决定「下一个派给谁」，所以状态里存一个 next
const State = new StateSchema({
  messages: MessagesValue,
  next: z.string().default("researcher"),
  // 派活理由：存下来才能看出它按什么做决定，而不是只看节点顺序
  reason: z.string().default(""),
  // 文案交过稿没有：模型说 done 时用代码再确认一次
  hasDraft: z.boolean().default(false),
  rounds: z.number().default(0),
  // 每次派活的结论都留下来，跑完一次性看清它怎么想的
  routeLog: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.string(),
    reducer: (current, next) => [...current, next],
  }),
});

const Route = z.object({
  next: z.enum(["researcher", "writer", "done"]).describe("下一个接手的角色"),
  reason: z.string().describe("一句话说明为什么派给这个角色"),
});

const router = new ChatDeepSeek({ model: "deepseek-chat" }).withStructuredOutput(Route);

const SUPERVISOR_PROMPT = [
  "主管只派活，不写内容。",
  "资料还不完整就派 researcher；资料够了就派 writer；writer 交过稿才返回 done。",
].join("\\n");

// 派活：让模型输出结构化结果，再由条件边按 next 走
const supervise: typeof State.Node = async (state) => {
  const { next, reason } = await router.invoke([
    new SystemMessage(SUPERVISOR_PROMPT),
    ...state.messages,
  ]);
  return {
    next,
    reason,
    rounds: state.rounds + 1,
    routeLog: \`\${next}（\${reason}）\`,
  };
};

// 文案节点包一层：子图会把传入的历史原样带回来，只取它新写的那一条，
// 否则父状态的 messages 会把整段历史再追加一遍
const writeStep: typeof State.Node = async (state) => {
  const result = await writer.invoke({ messages: state.messages });
  return { messages: result.messages.slice(-1), hasDraft: true };
};

const chooseWorker: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: "researcher" | "writer";
}> = (state) => {
  // 兜底一：模型说 done，但稿子还没交，就自己派 writer，别信它的判断
  if (state.next === "done" && !state.hasDraft) return "writer";
  // 兜底二：派活次数封顶，模型反复改主意也不会转不停
  if (state.next === "done" || state.rounds >= 4) return END;
  return state.next as "researcher" | "writer";
};

export const supervisor = new StateGraph(State)
  .addNode("supervisor", supervise)
  .addNode("researcher", researcher)
  .addNode("writer", writeStep)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", chooseWorker)
  .addEdge("researcher", "supervisor")
  .addEdge("writer", "supervisor")
  .compile();`,
      },
      {
        path: "scripts/multi-agent.ts",
        order: 5,
        action: "create",
        hint: "四段演示依次跑一遍\n- researcher 单独跑：它自己调 lookup，不经过任何主 agent\n- delegate：委派，结果以一条工具消息回到主 agent\n- handoff：移交，最后由 writer_agent 接话\n- supervisor：主管逐次派活，打印每次的理由",
        code: `import type { BaseMessage } from "@langchain/core/messages";
import { researcher } from "../src/graphs/workers";
import { delegate } from "../src/graphs/delegate";
import { handoff } from "../src/graphs/handoff";
import { supervisor } from "../src/graphs/supervisor-agents";

function print(title: string, messages: BaseMessage[]) {
  console.log(\`\\n== \${title} ==\`);
  for (const message of messages) {
    const content = String(message.content).replace(/\\s+/g, " ").slice(0, 60);
    console.log(\`[\${message.getType()}] \${content}\`);
  }
}

async function main() {
  const single = await researcher.invoke({
    messages: [{ role: "user", content: "deepseek 的价格是多少" }],
  });
  print("子 agent 单独跑：它自己调了工具", single.messages);

  const delegated = await delegate.invoke({
    messages: [{ role: "user", content: "写一条关于「低延迟」的宣传文案" }],
  });
  print("委派：agents as tools", delegated.messages);

  const handed = await handoff.invoke({
    messages: [{ role: "user", content: "写一条宣传文案" }],
  });
  print("移交：handoff", handed.messages);
  console.log("最后由谁接话：", handed.activeAgent);

  // 主管模式：先看它每次派给谁、为什么，再看最后交出来的话
  const supervised = await supervisor.invoke({
    messages: [{ role: "user", content: "给「延迟」写一条宣传文案" }],
  });
  console.log("\\n== 主管：supervisor ==");
  for (const line of supervised.routeLog) console.log("派活：", line);
  print("主管派活后留下的消息", supervised.messages.slice(-2));
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Multi-agent：subagents（agents as tools）",
        href: "https://docs.langchain.com/oss/javascript/langchain/multi-agent/subagents",
      },
      {
        title: "Multi-agent：handoffs",
        href: "https://docs.langchain.com/oss/javascript/langchain/multi-agent/handoffs",
      },
      {
        title: "Subgraphs",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs",
      },
    ],
  },
  {
    kind: "project",
    slug: "multi-agent-pipeline",
    title: "多 Agent（二）：把流程拼成一条可控链路",
    menuTitle: "多 Agent（二）",
    summary:
      "入口先把自由说法抽成槽位，缺项就结束这一轮去追问；齐了才进固定流程：拆计划 → 查资料 → 写稿 → 审查，审查没过就回边重写。",
    verify: {
      label: "跑脚本看两次进图",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/pipeline.ts",
        "第一次只给「写条宣传文案」，打印还缺槽位 topic；补齐后第二次进图，打印槽位、计划、两稿审查记录（第一稿缺「来源：」、第二稿通过）与定稿",
      ],
    },
    concepts: [
      { text: "`withStructuredOutput` — 按 zod schema 拿结构化结果：入口用它抽槽位，计划节点用它拿 steps 数组" },
      { text: "槽位缺项先收口 — 必填没齐时条件边直接走 END，由调用方追问，不带着半成品往流程里跑" },
      { text: "回边要封顶 — 审查没过就回写稿节点，attempts 数到上限转 finalize，否则会一直重写" },
      {
        text: "审查用代码判 — required 是硬指标，缺项写进 missing 回传给写稿节点，不花模型调用也不受模型说服",
        note: "规则不写进生成提示，靠意见回传补齐",
      },
    ],
    files: [
      {
        path: "src/graphs/pipeline.ts",
        order: 1,
        action: "create",
        hint: "整条链路六个节点，按顺序执行\n- extract 抽出槽位 → makePlan 拆步骤 → research 查资料 → write 写稿 → review 审查 → finalize 定稿\n- 槽位缺项直接结束这一轮；审查没过回 write 重写，第 2 稿仍不过就 finalize 收口\n- research 用的是上一课导出的 researcher，需要保留 src/graphs/workers.ts",
        code: `import { loadEnvFile } from "node:process";

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  START,
  END,
} from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { researcher } from "./workers";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const State = new StateSchema({
  messages: MessagesValue,
  // 入口归一化后的槽位：用户怎么问都落到这几个字段
  topic: z.string().default(""),
  audience: z.string().default(""),
  maxLength: z.number().optional(),
  // 槽位还缺哪几项：非空就结束这一轮，图外负责追问
  missingSlots: z.array(z.string()).default(() => []),
  // 模型拆出来的步骤：外层流程固定，步骤内容由模型定
  plan: z.array(z.string()).default(() => []),
  notes: z.string().default(""),
  draft: z.string().default(""),
  // 审查没过的词，会作为意见回传给写稿节点
  missing: z.array(z.string()).default(() => []),
  attempts: z.number().default(0),
  // 硬指标：审查用代码判，不交给模型判。
  // 这条规则故意不写进写稿提示词 —— 生成方不知道全部规则，靠审查意见回传补齐，
  // 所以第一稿必然缺「来源：」：这不是模型偷懒，是这套分工的常态
  required: z.array(z.string()).default(() => ["来源："]),
  // 每一稿的审查结论都留下来，方便看回边跑了几次
  reviewLog: new ReducedValue(z.array(z.string()).default(() => []), {
    inputSchema: z.string(),
    reducer: (current, next) => [...current, next],
  }),
});

const Brief = z.object({
  topic: z.string().describe("文案主题"),
  audience: z.string().describe("给谁看"),
  maxLength: z.number().describe("字数上限"),
});

// 全字段可选：用户一次说不全，缺的字段留空，由代码判
const extractor = new ChatDeepSeek({ model: "deepseek-chat" }).withStructuredOutput(
  Brief.partial(),
);

const REQUIRED_SLOTS = ["topic"] as const;

// ① 入口归一化：把自由说法抽成槽位，没提到的不许猜
const extract: typeof State.Node = async (state) => {
  const brief = await extractor.invoke([
    new SystemMessage("从对话里抽取文案需求：主题、受众、字数上限。没提到的字段留空，不要猜。"),
    ...state.messages,
  ]);
  const missingSlots = REQUIRED_SLOTS.filter((key) => !brief[key]);
  return { ...brief, missingSlots };
};

const planner = new ChatDeepSeek({ model: "deepseek-chat" }).withStructuredOutput(
  z.object({ steps: z.array(z.string()).min(1).max(3) }),
);

const writerModel = new ChatDeepSeek({ model: "deepseek-chat" });

// ② 计划：只产出步骤，不碰正文
const plan: typeof State.Node = async (state) => {
  const { steps } = await planner.invoke([
    new SystemMessage("把这次文案需求拆成 2 到 3 个执行步骤，每步一句话，按执行顺序。"),
    ...state.messages,
  ]);
  return { plan: steps };
};

// ③ 查资料：把这一步整个交给资料子 agent，它内部自己决定调几次工具
const research: typeof State.Node = async (state) => {
  const result = await researcher.invoke({
    messages: [
      {
        role: "user",
        content: \`查一条与「\${state.topic}」相关的事实\`,
      },
    ],
  });
  const lastAiMessage = result.messages.filter((message) => message.getType() === "ai").at(-1);
  return { notes: String(lastAiMessage?.content ?? "") };
};

// ④ 写稿：把主题、受众、字数上限、计划、资料、上一轮审查意见一起给它
const write: typeof State.Node = async (state) => {
  const feedback = state.missing.length
    ? \`上一稿没过审查，缺少：\${state.missing.join("、")}，这次必须补上。\`
    : "";

  const response = await writerModel.invoke([
    new SystemMessage("基于资料写一条中文宣传文案，只输出文案本身。"),
    new HumanMessage(
      [
        \`主题：\${state.topic}\`,
        \`受众：\${state.audience || "大众"}\`,
        \`字数上限：\${state.maxLength ?? 30}\`,
        \`计划：\${state.plan.join(" / ")}\`,
        \`资料：\${state.notes}\`,
        feedback,
      ]
        .filter(Boolean)
        .join("\\n"),
    ),
  ]);

  return { draft: String(response.content).trim(), attempts: state.attempts + 1 };
};

// ⑤ 审查：用代码判硬指标，不花一次模型调用，也不会被模型说服
const review: typeof State.Node = (state) => {
  const missing = state.required.filter((word) => !state.draft.includes(word));
  const verdict = missing.length
    ? \`第 \${state.attempts} 稿缺：\${missing.join("、")}\`
    : \`第 \${state.attempts} 稿通过\`;
  return { missing, reviewLog: verdict };
};

// ⑥ 收尾：定稿就是最后那一稿。
// 达到重试上限仍有缺项时也要收口，把缺项写进结果 —— 回边不能无限转，失败要能被看见
const finalize: typeof State.Node = (state) => ({
  messages: [
    {
      role: "ai",
      content: state.missing.length
        ? \`\${state.draft}（审查未过：\${state.missing.join("、")}，已达重试上限）\`
        : state.draft,
    },
  ],
});

export const pipeline = new StateGraph(State)
  .addNode("extract", extract)
  .addNode("makePlan", plan)
  .addNode("research", research)
  .addNode("write", write)
  .addNode("review", review)
  .addNode("finalize", finalize)
  .addEdge(START, "extract")
  // 槽位没齐就结束这一轮，把 missingSlots 交给调用方去追问
  .addConditionalEdges("extract", (state) =>
    state.missingSlots.length ? END : "makePlan",
  )
  .addEdge("makePlan", "research")
  .addEdge("research", "write")
  .addEdge("write", "review")
  // 回边：审查没过且还没到 2 稿，就回去重写
  .addConditionalEdges("review", (state) =>
    state.missing.length && state.attempts < 2 ? "write" : "finalize",
  )
  .addEdge("finalize", END)
  .compile();`,
      },
      {
        path: "scripts/pipeline.ts",
        order: 2,
        action: "create",
        hint: "两次进图：先跑一句含糊的看缺什么，补齐后再跑完整链路",
        code: `import { pipeline } from "../src/graphs/pipeline";

async function main() {
  // 第一轮：只给一句含糊的话，走不到计划，图停在入口
  const first = await pipeline.invoke({
    messages: [{ role: "user", content: "写条宣传文案" }],
  });
  console.log("还缺槽位：", first.missingSlots);

  // 第二轮：把追问的答复补进对话，重新进图
  const second = await pipeline.invoke({
    messages: [
      { role: "user", content: "写条宣传文案" },
      { role: "ai", content: \`还差这些信息：\${first.missingSlots.join("、")}\` },
      { role: "user", content: "写一条关于低延迟的文案，给技术负责人看，20 字以内" },
    ],
  });

  console.log("槽位：", {
    topic: second.topic,
    audience: second.audience,
    maxLength: second.maxLength,
  });
  console.log("计划：", second.plan);
  console.log("审查记录：", second.reviewLog);
  console.log("定稿：", String(second.messages.at(-1)?.content));
}

main().catch(console.error);`,
      },
    ],
    docLinks: [
      {
        title: "Multi-agent：overview（五种模式与选型）",
        href: "https://docs.langchain.com/oss/javascript/langchain/multi-agent",
      },
      {
        title: "Multi-agent：custom workflow",
        href: "https://docs.langchain.com/oss/javascript/langchain/multi-agent/custom-workflow",
      },
      {
        title: "Use the graph API（条件边与回边）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/use-graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "web-ui",
    title: "接上网页：Agent Server 与 useStream",
    menuTitle: "接上网页",
    summary:
      "把图交给官方本地 Agent Server，网页用官方 React Hook 直接聊 —— 不用自己写接口，也不用自己管历史。",
    install: {
      command: "pnpm add @langchain/react && pnpm add -D @langchain/langgraph-cli",
      description:
        "在 my-langgraph-app 目录执行：装前端 Hook 的包，以及提供 langgraphjs 命令的 CLI（devDependency）。",
    },
    verify: {
      label: "跑起来看网页",
      description: [
        "终端 A 执行 pnpm exec langgraphjs dev（本地 Agent Server 起在 http://localhost:2024）",
        "终端 B 执行 pnpm dev，打开 http://localhost:3000 —— 能流式聊天；问「用 send_notice 发一条通知」会先挂起，在页面上点批准后才继续回答",
      ],
    },
    concepts: [
      { text: "`langgraph.json` — 本地服务的配置：把哪张图注册成哪个名字、读哪个 env 文件" },
      { text: "`langgraphjs dev` — 起本地 Agent Server（内存模式）；网页与 Studio 都连它" },
      { text: "`useStream` — React Hook：连上 Agent Server（`apiUrl` 填地址、`assistantId` 填注册的图名），拿到可渲染的消息与状态" },
      { text: "`submit` — 往当前 thread 发一条新消息，触发一次运行" },
      { text: "`messages` / `isLoading` — 消息列表、当前有没有运行在跑" },
      { text: "`stop` / `respond` — 取消当前运行、回答图里挂起的 interrupt" },
    ],
    files: [
      {
        path: "langgraph.json",
        order: 1,
        action: "create",
        hint: "把 agent.ts 导出成名字叫 agent 的图 —— 这个名字是网页要连的 assistantId；env 指向已有的 .env.local，Agent Server 启动时自己读它",
        code: `{
  "node_version": "20",
  "graphs": {
    "agent": "./src/graphs/agent.ts:agent"
  },
  "env": ".env.local"
}`,
      },
      {
        path: "app/page.tsx",
        order: 2,
        action: "replace",
        hint: "把首页换成聊天页：消息流、输入框、停止按钮，以及第 6 课那个 interrupt 的批准 / 驳回",
        code: `"use client";

import { useState } from "react";
import { useStream } from "@langchain/react";

export default function Home() {
  const [input, setInput] = useState("");
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || stream.isLoading) return;

    stream.submit({ messages: [{ role: "user", content: input }] });
    setInput("");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">LangGraph 聊天</h1>

      <div className="flex-1 space-y-3">
        {stream.messages.map((message) => (
          <div key={message.id} className="rounded-lg border p-3 text-sm">
            <p className="mb-1 text-xs text-neutral-500">{message.type}</p>
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}
      </div>

      {/* 图在 interrupt 处挂起时，这里显示要人确认的内容 */}
      {stream.interrupt && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="mb-2 break-all">
            挂起内容：{JSON.stringify(stream.interrupt)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => stream.respond(true)}
              className="rounded-md bg-neutral-900 px-3 py-1 text-white"
            >
              批准
            </button>
            <button
              type="button"
              onClick={() => stream.respond(false)}
              className="rounded-md border px-3 py-1"
            >
              驳回
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="问点什么…"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={stream.isLoading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          发送
        </button>
        <button
          type="button"
          onClick={() => stream.stop()}
          disabled={!stream.isLoading}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          停止
        </button>
      </form>
    </main>
  );
}`,
      },
    ],
    docLinks: [
      {
        title: "本地服务（langgraph dev）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/local-server",
      },
      {
        title: "前端接入总览（useStream）",
        href: "https://docs.langchain.com/oss/javascript/langgraph/frontend/overview",
      },
      {
        title: "useStream 参考",
        href: "https://reference.langchain.com/javascript/langchain-react/index/useStream",
      },
    ],
  },
  {
    kind: "project",
    slug: "deploy-and-observability",
    title: "可观测与部署：看每一步，再把它交付出去",
    menuTitle: "可观测与部署",
    summary:
      "打开 LangSmith 追踪，图里每一步、每次模型与工具调用都会留痕；同一个项目再按官方方式交付出去。",
    verify: {
      label: "去 LangSmith 看 trace",
      description: [
        "在 my-langgraph-app 目录执行 pnpm tsx scripts/trace.ts，跑完打开 smith.langchain.com",
        "对应项目里能看到这次 run 的完整调用链：节点、模型调用、工具调用各占一段",
      ],
    },
    concepts: [
      { text: "`LANGSMITH_TRACING` — 设成 true 才会把每一步上报成 trace" },
      { text: "`LANGSMITH_API_KEY` — LangSmith 的 Key，上报时用来认证" },
      { text: "`LANGSMITH_PROJECT` — 把 trace 写进指定项目；不填就进 default" },
      { text: "`durability` — checkpoint 的写入时机：exit（最快）/ async（默认）/ sync（最稳）" },
    ],
    files: [
      {
        path: ".env.local",
        order: 1,
        action: "edit",
        hint: "在 .env.local 末尾追加三行（这个文件初始化时就建好了，Key 也在里面）：",
        code: `LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2-...
LANGSMITH_PROJECT=lab-langgraph`,
      },
      {
        path: "scripts/trace.ts",
        order: 2,
        action: "create",
        hint: "跑一次带 durability 的 invoke，产出一条可以对着看的 trace",
        code: `import { HumanMessage } from "@langchain/core/messages";
import { agent } from "../src/graphs/agent";

async function main() {
  const result = await agent.invoke(
    { messages: [new HumanMessage("用一句话说明什么是状态")] },
    {
      configurable: { thread_id: "trace-1" },
      // 这课显式选 sync（每步前同步落盘，最稳）；三个取值与默认值见本课知识点
      durability: "sync",
    },
  );

  console.log("回答：", result.messages.at(-1)?.content);
  console.log("去 LangSmith 看这次 run 的 trace");
}

main().catch(console.error);`,
      },
      {
        path: "终端",
        order: 3,
        action: "run",
        hint: "跑一次（图文件会自己读 .env.local）：",
        code: `pnpm tsx scripts/trace.ts`,
      },
    ],
    docLinks: [
      {
        title: "LangSmith 可观测性",
        href: "https://docs.langchain.com/oss/javascript/langgraph/observability",
      },
      {
        title: "部署",
        href: "https://docs.langchain.com/oss/javascript/langgraph/deploy",
      },
      {
        title: "应用结构",
        href: "https://docs.langchain.com/oss/javascript/langgraph/application-structure",
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
