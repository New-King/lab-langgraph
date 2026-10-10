# lab-langgraph（LangGraph 项目制课程）

LangGraph（TypeScript 版）的课程站点，站点结构、UI 与数据文件形状照抄 `lab-ai-sdk`。

主站不跑任何 LangGraph 代码 —— 它只是「对照学习站」：左侧课程 + 右侧官方文档，学员在自己的项目里跟做。

## 站点结构

```text
lab-langgraph/
├── AGENTS.md                    # 维护规则（课程结构、知识点规则、覆盖式演进约定）
├── README.md                    # 本文件
├── docs/
│   ├── curriculum.md            # 课表：初始化 + 核心 11 课 + 上线课，每课目标/能力/验收
│   └── coverage-matrix.md       # 能力 ↔ 课次映射；未进主线项的证据与原因（面试/生产材料 + JD）
├── app/
│   ├── (shell)/lab/[projectSlug]/page.tsx
│   └── globals.css
├── components/                  # 代码面板 / 文档侧栏 / 延伸阅读弹窗（照抄 lab-ai-sdk）
└── lib/
    ├── projects.ts              # 课次数据（同名同结构：INIT_STEPS / NAV_ITEMS）
    ├── home.ts                  # 首页介绍数据
    └── layout-classes.ts        # 布局 class
```

## 学员项目的演进方式（覆盖式）

学员只维护**一个** Next 项目 `my-langgraph-app`：图在 `src/graphs/`，验证脚本在 `scripts/`，网页在根 `app/`。

```text
第 0 课  create-next-app + 装依赖 + .env.local（DEEPSEEK_API_KEY）
第 1 课  新建 src/graphs/hello.ts（START → 两个纯函数节点 → END）+ scripts/hello.ts
第 2 课  覆盖 hello.ts：StateSchema 加 MessagesValue / ReducedValue / 带 default 的计数器
第 3 课  覆盖 hello.ts：条件边 + 回边（计数到上限才走 END）
第 4 课  新建 src/graphs/agent.ts（顶部读 .env.local；ChatDeepSeek + bindTools + ToolNode + 工具回边）+ scripts/agent.ts
第 5 课  覆盖 agent.ts（compile({ checkpointer: new MemorySaver() })）+ 新建 scripts/memory.ts
第 6 课  覆盖 agent.ts（敏感工具内 interrupt）+ 新建 scripts/approve.ts（readline 问人 + Command({ resume }) 恢复）、src/graphs/approval.ts（模型起草 / 人裁决 / 模型收尾的审核循环，节点返回 Command + ends）、scripts/command.ts（循环问人）
第 7 课  整份覆盖 agent.ts（只改了 llmCall 的 config.writer）+ 新建 scripts/stream.ts（streamMode: updates / messages / custom）
第 8 课  覆盖 agent.ts（compile({ store }) + runtime.store / context）+ 新建 scripts/profile.ts
第 9 课  新建 scripts/time-travel.ts（getStateHistory 找 checkpoint + updateState 改状态分叉重跑）
第 10 课 新建 src/graphs/research.ts（Send 并行 map-reduce）、supervisor.ts（子图当节点）+ scripts/supervisor.ts
第 11 课 新建 langgraph.json（env 指向 .env.local）+ 覆盖 app/page.tsx（useStream 聊天页）+ pnpm exec langgraph dev
第 12 课 追加 .env.local（LANGSMITH_TRACING / LANGSMITH_API_KEY / LANGSMITH_PROJECT）+ 新建 scripts/trace.ts，LangSmith 里看 trace
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 lab-ai-sdk 一致）
- 课程主体：TypeScript + `@langchain/langgraph`、`@langchain/core`、`@langchain/deepseek`、`zod`、`tsx`
- 第 11 课起：`@langchain/react`（前端 Hook `useStream`）+ `@langchain/langgraph-cli`（本地 Agent Server）
  - 注意：JS 前端 SDK 近期换过包 —— 文档总览与参考页现在指向 `@langchain/react`；旧的 `@langchain/langgraph-sdk/react` 是上一代写法
- 模型：DeepSeek（`ChatDeepSeek`，模型名 **`deepseek-chat`**）
  - 不用 `deepseek-reasoner`：官方文档明确它不支持 tool calling 与结构化输出
- 场景：**纯特性演示**，不设业务背景

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [ ] **全部课待实测**：课程内容按官方文档编写，但**站点侧示例代码尚未在 `my-langgraph-app` 里逐课跑过**
- [ ] **第 4 课待实测**：`ChatDeepSeek({ model: "deepseek-chat" })` + `bindTools` 实际能否走通工具调用（文档只给了 `deepseek-reasoner` 的示例，且注明它不支持 tools）
- [ ] **第 5 课待实测**：`MemorySaver` 在同一进程内两次 `invoke` 的上下文衔接
- [ ] **第 6 课待实测**：工具内 `interrupt()` + `Command({ resume })` 的恢复路径（现由 `readline` 在终端问人）；`deepseek-chat` 下模型是否会真的调用被审批的工具
- [x] **第 6 课已实测（2026-10-10）**：`Command({ resume: false })` 会抛 `EmptyInputError`（JS 版 `mapCommand` 用真值判断 resume），课里已改成传 `"reject"` / `"approve"` —— 这条坑同时记进了 `AGENTS.md` 与第 6 课延伸阅读
- [ ] **第 6 课待实测（审核循环演示）**：`approval.ts` 里「模型起草 → 人裁决 → 驳回带意见重写 → 再审」的实际效果（模型是否按 `feedback` 改写、驳回后能否回到 `draft` 再挂起）、`ends` 是否按声明的分支走通；以及 `readline` 在 `pnpm tsx` 下的交互是否正常
- [x] **第 7 课已实测（2026-10-10）**：挂上 checkpointer 后 `agent.stream(...)` 也必须给 `thread_id`，否则 `MemorySaver.put` 直接报错 —— 课里 `scripts/stream.ts` 已补上 `configurable.thread_id`
- [ ] **第 7 课待实测**：`streamMode: "messages"` 下 `deepseek-chat` 的 token 流是否逐块产出
- [ ] **第 8 课待实测**：`runtime.store` 在节点里的可用性（文档示例用 `runtime` 作为第二参数名，另一处写作 `config`，需实跑确认）
- [ ] **第 9 课待实测**：`updateState` 的第一个参数用历史快照的 `config`、且 `asNode` 传节点名时能否按预期从后继继续；`Overwrite` 放在 `updateState` 的值里能否绕过 `MessagesValue` 的合并（文档只写了「更新会被当作节点更新处理、会过 reducer」）
- [ ] **第 11 课待实测**：`langgraph dev` + `useStream` 在 Next 项目里的实跑 —— 需确认 `@langchain/react` 的 `useStream` 与本地 Agent Server 的协议版本是否对得上、CORS、`assistantId` 与 `langgraph.json` 里 `graphs` 别名的对应关系；`langgraph.json` 的 `env` 是否接受 `.env.local`
- [ ] **第 11 课待确认**：`useStream` 返回的 `interrupt` 对象字段（参考页只给了 `interrupt` / `interrupts`，`Interrupt` 内部的字段名未列出，示例里只用了 `JSON.stringify` 规避）
- [ ] **第 12 课待实测**：LangSmith 追踪环境变量（`LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT`）在 tsx 脚本与 `langgraph dev` 下的生效方式；部署路径（LangSmith Deployment）未验证
- [ ] `SqliteSaver`（`@langchain/langgraph-checkpoint-sqlite`）未纳入主线：需额外原生依赖，先只在文档链接里提
- [ ] 全部 `docLinks` 需校验可访问（LangChain 文档路径近期从 `langchain-ai.github.io` 迁到 `docs.langchain.com`）
