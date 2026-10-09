# 本课程课表（LangGraph）

初始化 **1 课** + 核心 **10 课** + 上线 **1 课**，共 **12 项左侧菜单**。设计原则：一个学员项目覆盖式演进；一课一能力；每课有可独立验收的产出。

- 站点 UI / 结构 / 数据文件形状：照抄 `lab-ai-sdk`（`app/(shell)/lab/[projectSlug]`、`components/`、`lib/projects.ts`）
- 学员项目：`my-langgraph-app`（Next.js 一体化，`src/graphs/` 放图，`scripts/` 放验证脚本）
- 语言：**TypeScript**（`@langchain/langgraph`，官方 JS/TS 文档 `docs.langchain.com/oss/javascript/**`）
- 模型：DeepSeek（`@langchain/deepseek` 的 `ChatDeepSeek`，模型名 `deepseek-chat`）
- 场景：**纯特性演示** —— 不设业务背景，每课用最小例子只讲机制
- 未进主线的能力、原因与来源：见 `coverage-matrix.md`
- 跑脚本统一 `pnpm tsx scripts/xxx.ts`（不带参数；脚本靠 `src/env.ts` 自己加载 `.env.local`）

## 总览

「核心能力」一列 = 该课 `concepts`（知识点），与课页一一对应。

| # | 课 | 核心能力（LangGraph 侧） | 学员项目改动 |
|---|---|---|---|
| 0 | 初始化（guide） | 脚手架、依赖、`DEEPSEEK_API_KEY`、tsx 跑脚本 | 建项目 + `src/graphs/`、`scripts/` |
| 1 | 第一个图 | `StateSchema`、`StateGraph`、`addNode`、`addEdge`、`START`/`END`、`compile`、`invoke` | 新建 `src/graphs/hello.ts`、`scripts/hello.ts` |
| 2 | 状态与更新 | `MessagesValue`、`ReducedValue`、`default`、`typeof State.Node` | 覆盖上两个文件 |
| 3 | 条件路由 | `addConditionalEdges`、`ConditionalEdgeRouter`、`recursionLimit` | 覆盖上两个文件 |
| 4 | 工具调用 | `ChatDeepSeek`、`bindTools`、`tool`、`ToolNode`、`AIMessage`、`getType`、`loadEnvFile` | 新建 `src/env.ts`、`src/graphs/agent.ts`、`scripts/agent.ts` |
| 5 | 短期记忆 | `MemorySaver`、`checkpointer`、`thread_id`、`getState`、`getStateHistory` | 覆盖 agent + 新建 `scripts/memory.ts` |
| 6 | 人工介入 | `interrupt`、`Command`、`__interrupt__` | 覆盖 agent（加需审批的工具）+ 新建 `scripts/approve.ts` |
| 7 | 流式输出 | `stream`、`streamMode`、`writer` | 覆盖 agent 的 `llmCall`（加 `config.writer`）+ 新建 `scripts/stream.ts` |
| 8 | 长期记忆 | `MemoryStore`、`store`、`context`、`put`、`search` | 覆盖 agent（加 `saveMemory`/`loadMemory` + `ContextSchema`）+ 新建 `scripts/profile.ts` |
| 9 | 子图与并行 | `Send`、子图当节点 | 新建 `src/graphs/research.ts`、`supervisor.ts`、`scripts/supervisor.ts` |
| 10 | 接上网页 | `langgraph.json`、`langgraph dev`、`useStream`、`apiUrl`、`assistantId`、`submit`、`messages`、`isLoading`、`stop`、`respond` | 新建 `langgraph.json` + 覆盖 `app/page.tsx` |
| 11 | 可观测与部署 | `LANGSMITH_TRACING`、`LANGSMITH_API_KEY`、`LANGSMITH_PROJECT`、`durability` | 追加 `.env.local`（LangSmith 三行）+ 新建 `scripts/trace.ts` |

## 排列思路

整条主线是**能力递进链**：先能跑（1）→ 会传数据（2）→ 会分支（3）→ 会用工具（4）→ 能记住（5、8）→ 能等人（6）→ 能边说边出（7）→ 能拆大图（9）→ 能交付（10、11）。

- **第 1–3 课不接模型**：先用纯函数把「状态 / 节点 / 边 / 路由」跑明白，第 4 课才引入 DeepSeek。否则前三课的问题会混在「模型为什么不调工具」里，难定位。
- **短期记忆（5）与长期记忆（8）分开**：checkpointer 是 thread 内的状态快照，Store 是跨 thread 的键值数据，混在一课讲不清区别。
- **人工介入（6）紧跟短期记忆**：`interrupt` 的前提就是 checkpointer + `thread_id`，紧接着讲，依赖关系最清楚。
- **第 4 课起共用一张 `agent.ts`**：5 / 6 / 7 / 8 都在它上面叠加，学员不必每课重写图。
- **网页（10）与部署（11）放最后**：本地 `langgraph dev` 起 Agent Server 是官方交付方式，`useStream` 是官方前端 Hook；两者都要图先稳定。

## 逐课细节

### 第 1 课 · 第一个图：状态、节点与边

- **目标**：跑通最小闭环 —— 一张「START → `greet` → `shout` → END」的图，用脚本 `invoke` 一次拿到状态
- **示例**：`src/graphs/hello.ts` 两个纯函数节点（`greet` 拼问候、`shout` 补感叹号），不调模型
- **要点**：状态先用 `StateSchema` 声明；`.compile()` 之后才是可执行对象；`invoke` 返回**执行完的完整状态**；初始状态只需给没有默认值的字段
- **验收**：`pnpm tsx scripts/hello.ts` 打印出「已连接：LangGraph！」
- **文档**：`/oss/javascript/langgraph/overview`、`/oss/javascript/langgraph/graph-api`

### 第 2 课 · 状态与更新：部分更新与 reducer

- **目标**：搞清「节点只返回要改的字段」与「每个字段自己的 reducer」
- **示例**：状态换成 `messages`（`MessagesValue`）、`count`（`z.number().default(0)`）、`notes`（`ReducedValue` 自定义 reducer 的累加数组）
- **要点**：节点返回的是**部分更新**，不是完整状态；默认 reducer 是「后写覆盖」，合并型 reducer 下返回空数组**不会清空**（旧值还在）；节点函数用 `typeof State.Node` 标注类型
- **验收**：打印「消息条数：2 / 计数：2 / 记录：[…]」—— 消息与记录是合并而不是覆盖
- **文档**：`/oss/javascript/langgraph/graph-api`、`/oss/javascript/langgraph/use-graph-api`

### 第 3 课 · 条件路由：让边自己决定下一步

- **目标**：让边由代码决定下一步 —— 条件边自指构成循环
- **示例**：`hello.ts` 改成「`loop` 节点 + `shouldStop` 路由」：计数没到 3 就回到自己，到了就返回 `END`
- **要点**：条件边返回值就是下一个节点名（或节点名数组，会并行）；返回 `"loop"` 即条件边自指，不需要另写回边；`recursionLimit` 是 **config 的顶层键**（不能放进 `configurable`），默认 25，超限抛 `GraphRecursionError`
- **验收**：打印「最终文本：循环!!! / 执行次数：3」
- **文档**：`/oss/javascript/langgraph/use-graph-api`、`/oss/javascript/langgraph/graph-api`
- **延伸阅读**：知识点右上角弹窗 —— 「判断该交给谁：从条件边到专用决策模型」（确定性判断 / LLM 判断 / 专用决策模型的取舍判据）

### 第 4 课 · 工具调用：自己实现 agent 循环

- **目标**：用图自己实现 agent 循环 —— 模型决定调工具，工具节点执行，再回到模型
- **示例**：`src/env.ts` —— 脚本自己把 `.env.local` 读进来（Next 是自动的，脚本不是）；`src/graphs/agent.ts`：`ChatDeepSeek` + `bindTools`、`ToolNode`、看最后一条消息有没有 `tool_calls` 的路由、`toolNode → llmCall` 回边
- **要点**：`tool(fn, { name, description, schema })` 的 schema 用 zod；`ToolNode` 从 `@langchain/langgraph/prebuilt` 导入，负责并行执行与错误处理；循环靠回边，不靠 while；路由用 `instanceof AIMessage` 收窄类型
- **模型注意**：用 `deepseek-chat`；`deepseek-reasoner` 不支持 tool calling
- **验收**：打印「消息链：human → ai → tool → ai」，最后一条是模型用工具算出的结果
- **文档**：`/oss/javascript/langgraph/workflows-agents`、`/oss/javascript/integrations/chat/deepseek`

### 第 5 课 · 短期记忆：checkpointer 与 thread

- **目标**：同一个 `thread_id` 的多次 `invoke` 能接上上下文
- **示例**：agent 图 `compile({ checkpointer: new MemorySaver() })`；`scripts/memory.ts` 用同一 `configurable.thread_id` 跑两轮
- **要点**：`MemorySaver` 只在内存里，进程结束就没了；有 checkpointer 就必须给 `thread_id`；`getState` 拿最新快照（`values` / `next` / `metadata`），`getStateHistory` 是**异步可迭代、按时间倒序**
- **验收**：第二轮的回答里出现第一轮说过的名字；随后打印出多个 checkpoint
- **文档**：`/oss/javascript/langgraph/persistence`、`/oss/javascript/langgraph/checkpointers`

### 第 6 课 · 人工介入：interrupt 与 resume

- **目标**：图跑到「需要人点头」的地方停下来，人给了答复再继续
- **示例**：给 agent 加一个敏感工具 `send_notice`，在工具里 `interrupt({ action, text })`；`scripts/approve.ts` 先跑到挂起，再用 `new Command({ resume: true })` 恢复
- **要点**：`interrupt` 的 payload 必须 JSON 可序列化；挂起结果在 `result.__interrupt__` 里；恢复**必须用同一个 `thread_id`**；恢复时**整个节点从头重跑**，所以 `interrupt()` 之前的副作用必须幂等
- **验收**：第一轮打印出挂起内容（工具名与要发送的文本），第二轮带着 `true` 恢复后打印「已发送通知：…」
- **文档**：`/oss/javascript/langgraph/interrupts`、`/oss/javascript/langgraph/checkpointers`
- **延伸阅读**：知识点右上角弹窗 —— 「interrupt 的几个坑」（节点从头重跑、别在同一节点反复 interrupt、静态断点 ≠ 人工审批、别用 try/catch 包住 `interrupt()`）

### 第 7 课 · 流式输出：stream 与 streamMode

- **目标**：不等到全部跑完才看到结果
- **示例**：覆盖 agent 的 `llmCall`（接上第二个参数，调模型前 `config.writer(...)` 发一条进度）；`scripts/stream.ts` 用同一个图跑三遍，分别换 `streamMode: "updates"`、`"messages"`、`"custom"`
- **要点**：`stream` 返回异步可迭代的 chunk 流；`updates` 给的是该步改动的字段、`messages` 给的是 `[消息块, 元信息]`；多模式写成数组时每个 chunk 是 `[mode, chunk]`
- **验收**：依次看到三段 —— updates 打出节点名、messages 逐字打出模型回答、custom 打出节点里 writer 发的那条数据
- **文档**：`/oss/javascript/langgraph/streaming`、`/oss/javascript/langgraph/graph-api`

### 第 8 课 · 长期记忆：Store 与跨 thread

- **目标**：跨 thread 记住用户信息 —— 换一个 `thread_id` 也认得出来
- **示例**：加 `saveMemory`（`runtime.store.put` 写进 `[userId, "memories"]`）与 `loadMemory`（`runtime.store.search` 读出来拼成 system 消息）；`new StateGraph(State, ContextSchema)` + 调用时传 `context: { userId }`；`compile({ checkpointer, store: new MemoryStore() })`
- **要点**：namespace 是字符串元组，`search` 是**前缀匹配**、默认 `limit` 10；节点的第二个参数文档里有时写 `config`、有时写 `runtime`，是**同一个对象**（`writer` / `store` / `context` 都挂在它上面）；checkpointer 管 thread，Store 管跨 thread
- **验收**：thread A 里说偏好，换 thread B、`userId` 不变，回答里仍然记得那条偏好
- **文档**：`/oss/javascript/langgraph/stores`、`/oss/javascript/langgraph/persistence`、`/oss/javascript/langgraph/add-memory`

### 第 9 课 · 子图与并行：Send 做 map-reduce

- **目标**：把一张编译好的图当成另一张图的节点；用 `Send` 做动态并行，再汇总
- **示例**：`research.ts` 是子图（把拿到的词变大写，写进与父图同名的 `results`）；`supervisor.ts` 用 `.addConditionalEdges(START, fanOut)` 对 `words` 里每个词各起一个 `Send("research", { word })` 分支，`results` 用 `ReducedValue` 汇总，最后 `collect` 节点 join
- **要点**：子图与父图**共享同名 key** 时值会回流；并行分支写同一字段**必须有 reducer**；`Send` 的目标节点收到的是**你传进去的那份状态**，不是完整父状态
- **验收**：打印三条分支结果（三个词各一条）与一行汇总
- **文档**：`/oss/javascript/langgraph/use-subgraphs`、`/oss/javascript/langgraph/use-graph-api`

### 第 10 课 · 接上网页：Agent Server 与 useStream

- **目标**：把图交给官方本地 Agent Server，网页用官方 React Hook 直接聊天
- **依赖**：`pnpm add @langchain/react` + `pnpm add -D @langchain/langgraph-cli`
- **示例**：`langgraph.json` 把 `agent` 映射到 `./src/graphs/agent.ts:agent`、`env` 指向已有的 `.env.local`；`pnpm exec langgraph dev` 起服务（API `http://127.0.0.1:2024`）；`app/page.tsx` 用 `useStream({ apiUrl, assistantId })` 渲染 `stream.messages`，`stream.submit` 发消息，`stream.stop` 停止，`stream.respond` 回答 interrupt
- **要点**：`useStream` 由 SDK 负责「发消息 / 读回历史 / 续上流」，页面不用自己拼 HTTP；前端 SDK 近期换过包：现在的文档与参考页指向 **`@langchain/react`**（旧的 `@langchain/langgraph-sdk/react` 是上一代写法）
- **验收**：`localhost:3000` 上能流式聊天，问「算一下 12 加 30」会先调工具再回答
- **文档**：`/oss/javascript/langgraph/local-server`、`/oss/javascript/langgraph/frontend/overview`、`useStream` API 参考

### 第 11 课 · 可观测与部署：看每一步，再把它交付出去

- **目标**：让每一步都留痕，并把图交付出去
- **示例**：在 `.env.local` 末尾追加 `LANGSMITH_TRACING=true` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` 三行（第 10 课已经建好这个文件）；`scripts/trace.ts` 跑一次带 `durability: "sync"` 的 `invoke`
- **要点**：LangSmith 记录每个节点、每次模型调用与工具调用；`durability` 决定 checkpoint 什么时候落盘（`"exit"` / `"async"` / `"sync"`）；`langgraph dev` 是**内存模式**，只适合开发测试，生产走 LangSmith Deployment
- **验收**：LangSmith 对应项目里能看到这次 run 的完整调用链（节点、模型调用、工具调用各占一段）
- **文档**：`/oss/javascript/langgraph/observability`、`/oss/javascript/langgraph/deploy`、`/oss/javascript/langgraph/application-structure`

## 写课风格

1. 每课固定有**验收**：怎么跑、看到什么算通过
2. 知识点只列本课示例里**真实出现**的方法与参数，每条一句话
3. 概念与实操分开：`docs/` 放课表与约定，课页放知识点 + 操作 + 代码
4. 每课都能独立验收，做到一半停下来也是能跑的
