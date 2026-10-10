# LangGraph 能力 ↔ 课次映射（含未进主线项与原因）

用来回答两个问题：**这个能力在哪一课**、**为什么某个能力没进主线**。

## 证据来源

「证据」列一律引用下面这几份材料，避免凭印象判断：

| 代号 | 材料 | 时间 | 性质 |
|---|---|---|---|
| **SCAI** | [schoolofcoreai · LangGraph Interview Questions](https://schoolofcoreai.com/interview-prep/tools/langgraph-interview-questions) | 2026-09-02 复核 | **按经验年限分层**（0–2 / 2–5 / 5–8 年），最直接 |
| **IC35** | [Interview Coder · Top 35 LangGraph Interview Questions](https://www.interviewcoder.co/blog/langgraph-interview-questions) | 2026 | 5 模块 + 自述缺口 |
| **LG** | [LLMGuide · LangGraph 生产化高频问答](https://meko1.github.io/llm-interview-guide/interview/langgraph-production-qna) | — | 8 条生产追问链 |
| **CS60** | [CloudSoft · LangGraph Interview Questions (60 Qs)](https://cloudsoftsol.com/interview-questions/langgraph-interview-questions-answers/) | **2026-10-06**（最新） | 12 章 60 题 + 12 道场景题；自述 50/60 ≈ 83% 属进阶 |
| **JD-1** | 京东「大模型应用后端开发」 | 2026-08 | 任职要求点名 LangChain、LangGraph |
| **JD-2** | 某「大模型应用开发工程师」 | 2026-01 | 「基于 LangChain/LangGraph 主导多智能体系统架构设计、工作流编排」 |

> ⚠️ 这几份材料**绝大多数是 Python 命名**（`InMemorySaver`、`get_state_history`、`interrupt_before`、`HumanInTheLoopMiddleware`、`langgraph-supervisor`、`create_react_agent`）。本课程是 JS/TS，**不能照抄**：每一条写进课里之前，都必须先在 `docs.langchain.com/oss/javascript/**` 确认有对应物。

## 一、已进主线

| 课 | 覆盖的考点 | 对应证据 |
|---|---|---|
| 1 第一个图 | 图模型 / 节点 / 边 / `START`·`END` / `compile` | IC35 Q2·Q7；CS60 Q3·Q4 |
| 2 状态与更新 | typed state / reducer / 部分更新合并语义 | IC35 Q3·Q5·Q8；CS60 Q7·Q8 |
| 3 条件路由 | 条件边 / 路由函数 / 循环与 `recursionLimit` | IC35 Q6·Q11·Q12；CS60 Q13·Q14 |
| 4 工具调用 | `tool` / `bindTools` / `ToolNode` / agent 循环 | IC35 Q13；CS60 Q34 |
| 5 短期记忆 | checkpointer / `thread_id` / 状态快照与历史 | SCAI Q3；IC35 Q15–17；CS60 Q17·Q18 |
| 6 人工介入 | `interrupt` / `Command(resume)` / 节点返回 `Command`（`goto` + `ends`）/ 恢复时节点重跑与幂等 | SCAI Q4；IC35 Q21–25；CS60 Q22–24 |
| 7 流式输出 | `stream` / `streamMode`（updates·messages·custom）/ `writer` | IC35 Q29；CS60 Q43 |
| 8 长期记忆 | Store 跨 thread / namespace / 与 checkpointer 的分工 | IC35 Q17；CS60 Q26·Q27 |
| 9 状态编辑与时间旅行 | `getStateHistory` / `checkpoint_id` 重放 / `updateState` + `asNode` 分叉 | IC35 自述缺口第一条；CS60 Q19·Q58 |
| 10 子图与并行 | 子图当节点 / `Send` map-reduce / 并行写必须有 reducer | SCAI Q5；IC35 Q14·Q31；CS60 Q13·Q32 |
| 11 接上网页 | 本地 Agent Server + 官方前端 Hook 交付 | IC35 Q30（部分）；CS60 Q43 |
| 12 可观测与部署 | LangSmith trace / `durability` 写入时机 / 交付形态 | SCAI Q8；IC35 Q35；CS60 Q44 |

**结论**：初级 + 中级前半段（IC35 的模块 1–4 大部分、CS60 的基础与状态两章）已覆盖；缺的集中在 **2–5 年生产档**（SCAI 明确把 durable execution、recovery & idempotency 划在这一档）。

## 二、未进主线

### A. 生产化（证据最密集，建议优先补）

| 能力 | 证据 | 现状与原因 |
|---|---|---|
| 持久化执行：跨进程恢复、幂等键落地 | SCAI Q3·Q6（2–5 年）；IC35 Q18–20；LG 链②；CS60 Q20·Q21 | 第 5 课只做「同进程多轮」，第 12 课只提了一句 `durability`；**没实操** |
| `RetryPolicy` / 错误分层（瞬时故障重试 vs 业务失败写状态路由） | IC35 **自述缺口第二条**；LG 链⑤；CS60 Q16 | 未写（**签名也未核实**，动手前必须先查文档） |
| 循环与成本护栏（`RemainingSteps`、max_steps / max_tool_calls 门禁） | LG 链⑥（给了量化门禁）；CS60 Q14·Q47 | 只教了 `recursionLimit` |
| super-step 语义与并发写冲突（无 reducer 并行写同一 key 抛错） | IC35 **Q3 明标陷阱题**；CS60 Q15 | 第 2 课讲了合并语义，没讲这个具体失败模式 |
| checkpointer 生产选型与治理（Sqlite/Postgres、`setup()` 迁移、表膨胀） | IC35 Q16；CS60 Q18·Q55 | 只用 `MemorySaver`；`SqliteSaver` 需额外原生依赖 |
| 部署形态与图版本化 / 灰度（挂起线程期间发版的风险） | IC35 Q32；CS60 Q42·Q45·Q58 | 第 12 课只到「生产走 LangSmith Deployment」一句 |
| 测试与评估进 CI（三级测试、轨迹评估、上线门禁） | LG 链⑧；CS60 Q38–41 | 第 12 课只有 trace，无评估 |
| 水平扩展（同线程不可被两个 worker 并发执行） | CS60 Q48 | 未写 |
| 缓存（`cachePolicy` + `InMemoryCache` / 语义缓存 / prompt caching） | IC35 **自述缺口第三条**；CS60 Q46 | 未写 |
| 限流 / 排队降级 | LG 自述**空白**；多租户也只到字段级 | 未写 |

### B. 进阶叙事（写法层面，依赖少）

| 能力 | 证据 | 现状与原因 |
|---|---|---|
| Functional API（`entrypoint` / `task`，含 task 记忆化） | CS60 **Q6 明确归为进阶** | 未写。`task` 的「同 checkpoint 内只执行一次」语义值得单独一课 |
| input / output / private schema 分离 + state vs runtime context | CS60 Q9·Q10 | 第 8 课用了 `ContextSchema`，但没讲这层设计取舍 |
| 多 agent（subagents / handoffs / router；supervisor vs swarm；子图 checkpointer 语义） | CS60 Q30–33；IC35 Q26–28；**JD-2 直接点名** | **暂缓**：用户 2026-10-07 决定先不做。JS 侧也没有 `createSupervisor` / `createSwarm` 官方页，要自己用图实现 |
| MCP 接入（`MultiServerMCPClient` 等） | CS60 Q35 | 未写 |
| 工具安全（写操作鉴权、不从模型输出取身份/租户、注入防护） | CS60 Q37；LG 链③「怎么防止模型伪造审批」 | 未写 |
| 上下文窗口管理（长对话压缩） | CS60 Q28 | 未写（注意：这是 Mastra 侧的 `messageHistory` 预算概念，JS LangGraph 侧对应物需先核实） |
| streamMode 全清单（`checkpoints` / `tasks`）+ 事件流 `streamEvents` v3 | CS60 Q43 | 只教了 3 种；`subgraphs: true` 的输出形状在 curriculum 里提过但课里未演示 |
| 静态断点 `interruptBefore` / `interruptAfter` | IC35 Q24；CS60 Q24 | 只在第 6 课**延伸阅读**里讲「它是调试用的，别做审批」，未实操 |
| Graph / State schema 升级后的老任务恢复与回放 | LG 链④；CS60 Q58 | 未写 |

### C. 外延（需要外部服务或超出「LangGraph 核心」）

- **多租户隔离与记忆泄漏**：CS60 Q29·Q56；LG 自述多租户是空白 —— 属应用设计，不是框架 API。第 8 课的 namespace 已经是落点，可在此加一节告警式说明。
- **可观测性栈与告警**：CS60 Q44；第 12 课只到 LangSmith trace。
- **渠道接入 / 前端生成式 UI / HITL 前端**：官方在 LangChain 与 deepagents 侧另有文档，不属 LangGraph 主线的必经路径。
- **结构化输出 / 模型选型 / prompt 工程**：`structuredOutput` 等在本课程范围外（与另一套「AI SDK」课程分工重合）。

## 三、写课前必须先核实的三件事

1. **`RetryPolicy`**：导入路径与签名（IC35 完全没提，CS60 只提概念）。未核实前不要写进课。
2. **JS 侧是否存在多 agent 的官方预置**：文档索引里没有 `createSupervisor` / `createSwarm` 页面；Python 的 `langgraph-supervisor` 不能直接搬。
3. **`HumanInTheLoopMiddleware`**：面经（CS60 Q25）里的 Python 写法，JS 侧未查到对应物 —— 若要在 JS 课里讲「不手搭图的审批」，得先确认。

## 四、待实测

每课示例代码在学员项目里的实跑记录，见 `README.md` 的「待办」。
