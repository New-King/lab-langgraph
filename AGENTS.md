# AGENTS.md — lab-langgraph 维护规则

LangGraph 课程（lab-langgraph）的约定。改这个仓库前先读本文件；与 `docs/curriculum.md` 冲突时以本文件为准。

## 一、信息架构

- **左侧菜单 = 主线课**，顺序见 `docs/curriculum.md`（初始化 1 课 + 核心 11 课 + 上线 1 课）。
- 每课页 = 跟做步骤 + 知识点 + 文件 + 代码 + 右侧官方文档（`docLinks`），可选「延伸阅读」弹窗。
- 每课有两个标题字段：`title`（页内 h1，完整、可带「：说明」）与 `menuTitle`（左侧菜单，短名）。**两个都必填**。
- **验收写法**：2～3 行**陈述句** —— ① 怎么跑（哪条命令 / 打开哪个页面）；② 跑完能看到什么。不写问句、不写检查清单。
- 站点结构、组件、布局 class：照抄 `lab-ai-sdk`（`app/`、`components/`、`lib/layout-classes.ts`）；数据文件沿用同名 `lib/projects.ts`（`INIT_STEPS` / `NAV_ITEMS` / 类型与辅助函数）与 `lib/home.ts`。

## 二、动笔前必做：先查文档，不清楚就问

1. **先查官方文档**：`https://docs.langchain.com/oss/javascript/**`（LangGraph JS/TS 文档；旧域 `langchain-ai.github.io/langgraphjs` 已迁走）。API 名、参数、导入路径逐项对着文档写，**不凭印象**。
2. **注意 JS 版正在演进，别照抄旧文章**：
   - 状态定义现在主推 **`new StateSchema({...})`**（`zod` 字段 / `ReducedValue` / `MessagesValue` / `UntrackedValue`），`Annotation.Root` 是旧写法（只在部分页面残留）。
   - `tool()` 从 `@langchain/core/tools` 导入，`ToolNode` 从 `@langchain/langgraph/prebuilt` 导入。
   - 条件路由：官方示例用自定义 `shouldContinue`；`prebuilt` 里另有现成的 `toolsCondition`（`(state) => "tools" | END`，未标记废弃），需要时可替代自写路由。
  - `Command({ resume })` 的 `resume` **不能是 falsy**（`false` / `0` / `""`）：JS 版 `mapCommand` 用真值判断，会抛 `EmptyInputError: Received empty Command input`；Python 无此限制，照抄 Python 的 `resume=False` 会挂（2026-10-10 实跑确认，见 `scripts/command.ts`）。
3. **文档没写的、或文档与实际不符的**：先问用户，不要自己跑命令试探、也不要写进课里当事实。
4. **没实测过的不要写成事实**：确认过的才写进步骤说明，未验证的在课里标「待验证」，并同步进 `README.md` 待办。
5. **改 `lib/projects.ts` 前先 `git diff` 或重读文件**：整段替换会**静默覆盖**别人的改动。

## 三、知识点规则

只写 **LangGraph / LangChain 真实存在的 API / 概念**（来源：`docs.langchain.com`），每条 = **名称 + 一句中文说明它干什么**，并且**只列本课示例代码里真实出现过的方法与参数**。例如：

```text
addConditionalEdges — 用函数决定下一步走哪个节点，返回值即节点名
```

不要写：

- 自写函数（本课程自己的工具函数、脚本辅助函数）
- 「我们把参数传到哪」这类代码层面知识
- 同一个能力在后续课重复列（哪课首次出现就在哪课写）

只有讲**重要概念**（如 reducer 的合并语义、interrupt 的幂等要求）时，才允许写示例代码里没出现的东西 —— 这种内容放 `conceptArticle`（延伸阅读弹窗）或示例代码的中文注释里。

## 四、覆盖式演进（学员项目）

学员只维护**一个** Next 项目 `my-langgraph-app`：图在 `src/graphs/`，验证脚本在 `scripts/`，网页在根 `app/`，逐课叠加：

| 课 | 新增 | 覆盖 |
|---|---|---|
| 0 | `create-next-app` + 依赖 + `.env.local` | — |
| 1 | `src/graphs/hello.ts`、`scripts/hello.ts` | — |
| 2 | — | `hello.ts`、`hello.ts` 脚本 |
| 3 | — | `hello.ts`、`hello.ts` 脚本 |
| 4 | `src/graphs/agent.ts`、`scripts/agent.ts`（首次接 DeepSeek） | — |
| 5 | `scripts/memory.ts` | `agent.ts`（加 checkpointer） |
| 6 | `scripts/approve.ts`、`src/graphs/approval.ts`、`scripts/command.ts` | `agent.ts`（工具内 interrupt） |
| 7 | `scripts/stream.ts` | `agent.ts`（`llmCall` 加 `config.writer`） |
| 8 | `scripts/profile.ts` | `agent.ts`（加 store + context） |
| 9 | `scripts/time-travel.ts` | — |
| 10 | `src/graphs/research.ts`、`supervisor.ts`、`scripts/supervisor.ts` | — |
| 11 | `langgraph.json`（env 指向 `.env.local`） | `app/page.tsx`（换成 useStream 聊天页） |
| 12 | `scripts/trace.ts` | `.env.local`（追加 LangSmith 三行） |

禁止每课新建项目、新建平行目录；同一能力只在同一处演进。

## 五、代码与依赖约定

- **场景**：**纯特性演示** —— 不设业务背景，每课用最小例子讲机制。不要往课里加虚构公司、角色、订单之类的设定。
- **语言固定 TypeScript**：所有示例用 `@langchain/langgraph` 的 JS/TS 写法，不混 Python 写法。
- 模型统一 **DeepSeek**：`new ChatDeepSeek({ model: "deepseek-chat" })` + `DEEPSEEK_API_KEY`。
  - **必须用 `deepseek-chat`**：`deepseek-reasoner` 不支持 tool calling 与结构化输出，第 4 课起会挂。
- **新增依赖要写成一步**：需要装包的课在课数据里写 `install: { command, description }`，它会渲染成操作列表第一步「装依赖」；不要只在文件 `hint` 里带一句命令。
- 依赖只加课程真需要的包：主线 = `@langchain/langgraph`、`@langchain/core`、`@langchain/deepseek`、`zod`、`tsx`(dev)；第 11 课 = `@langchain/react`（前端 Hook）+ `@langchain/langgraph-cli`(dev)。**不要**引入其它 provider、向量库或云服务。
- 跑脚本统一用 `pnpm tsx scripts/xxx.ts`：**不带任何参数**。脚本是独立 Node 进程，靠**用模型的那个图文件**（`src/graphs/agent.ts`）顶部的 `loadEnvFile(".env.local")` 自己把变量读进来（Next 加载 `.env.local` 是自动的，脚本不是）——不额外建配置文件。
- 本地持久化用 `MemorySaver`（内存）；`SqliteSaver` 需要额外的原生依赖，只在文档链接与说明里提，不写进主线步骤。

## 六、写课约定

- **【强制】课页文案无人称**：`lib/home.ts` 与 `lib/projects.ts` 里**会渲染到页面上的文字** —— 包括示例代码中的字符串、`verify` 里的期望输出 —— 一律不出现人称代词：`我`、`你`、`他`，以及「学员」「学员项目」「学习者」这类称谓。
  - 写法：用**无主语叙述**，或直接写项目名 / 文件名 / 变量名。
  - 改写示例：`` \`你好，${state.name}\` `` → `` \`已连接：${state.name}\` ``；`HumanMessage("帮我算一下 12 加 30")` → `HumanMessage("计算 12 加 30")`；`HumanMessage("我叫什么？")` → `HumanMessage("刚才那个名字是什么？")`。
  - 依据（2026-10-09 核实）：`lab-ai-sdk` 的课页里「学员」**出现 0 次**；`lab-mastra` 的课页有 **5 次**（首页场景介绍 + 第 1 课提示等），那是它自己带进来的写法，照抄时不要抄。
  - **维护文档不受此限制**：本文件、`README.md`、`docs/**` 照旧可以使用（两个参考站的维护文档都这么用）。
- **知识点是 `{ text, note? }`**：`text` 一句话说清这个方法干什么；`note` 是**可选**补充，只在确实需要时写（Python 对应物、常见坑、和别课的联系），**尽量短（≤ 48 字，体检脚本会提醒）**。
  - 界面上只有带 `note` 的条目才会在**行右侧固定位置**显示一个灯泡图标；悬停 / 键盘聚焦（手机上点一下）浮出气泡，气泡向左展开。
  - 位置由布局决定（`flex` + `shrink-0`），数据里不写任何位置或序号。
- 示例代码写**中文注释**，讲清关键行为；知识点列表只列方法名，注释解释用法。
- 每课示例必须能独立跑通：脚本自带最小输入，不依赖上一课残留的本地状态。
- 课页里**不出现别的课程 / 仓库的名字**；需要复用现成页面就直接整份放进本课的文件列表，按官方口径讲。

## 七、回复风格

- **一句话先给结论**，用户追问再展开；不要先铺垫「分几种情况」再给结论。
- 只答被问的那一点：不引申相邻概念，不主动加对比表、包名对照、源码条款、备选方案。
- 只有用户明确要细节（「展开」「为什么」「依据在哪」）时，才给来源与出处。

## 八、开发约定

- **只改 lab-langgraph**；`lab-ai-sdk`、`lab-mastra`、`my-mastra-app`、`newking` 等既有仓库禁止改动（包括「顺手优化」）。
- 站点本身**不装课程依赖**：`package.json` 只有 `next` / `react` / `shiki` 与 Tailwind、TypeScript 工具链，不引 `@langchain/*`。
- **改完必须跑 `pnpm audit:course`**：它会交叉核对「课页文案 ↔ 代码 ↔ 命令 ↔ 目录 ↔ 三份文档」，把历史上真出过的不连贯（知识点写了没教的方法、命令引用了还没建的文件、文档与课程数据漂移）全拦下来；有错退出码非 0。
- 改前先说明；改完列出文件清单。
- 不主动 commit / push。
