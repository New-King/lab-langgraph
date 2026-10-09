export type HomeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

import type { DocLink } from "@/lib/doc-link";

export type HomeDocLink = DocLink;

export type HomeStackItem = {
  label: string;
  value: string;
};

export const HOME_INIT_PATH = "/lab/getting-started";

export const HOME = {
  title: "LangGraph Lab",
  sections: [
    {
      title: "什么是 LangGraph",
      paragraphs: [
        "LangGraph 是 LangChain 出品的低层编排框架与运行时，用来构建、管理和部署长期运行、有状态的智能体（agent）。只负责编排，不抽象提示词，也不规定架构。",
        "最大的特点是「确定性步骤与智能体步骤混用」：图里既可以是确定性的代码分支，也可以交给模型决定下一步。",
      ],
    },
    {
      title: "核心组成",
      bullets: [
        "State —— 图的状态：所有节点读写同一份状态，每个字段可以挂自己的 reducer。",
        "Node 与 Edge —— 节点做事，边决定下一步：普通边顺序执行，条件边用代码或模型路由。",
        "Persistence —— checkpointer 按 thread 保存每一步状态，支持多轮对话、断点续跑、时间旅行。",
        "Human-in-the-loop —— interrupt 让图在执行中途停下来等人，再用 Command 带着人的答复恢复。",
        "Memory —— 短期记忆（thread 内）与长期记忆（Store，跨 thread）是两套东西。",
        "Streaming —— 逐 token、逐步骤、自定义数据都可以流出去。",
      ],
    },
    {
      title: "本 Lab 讲什么",
      paragraphs: [
        "本 Lab 采用项目驱动式学习：在独立的 Next.js 项目 my-langgraph-app 里，按左侧课程从零搭起一个图，并逐课给它加能力。每课的图都用一个脚本直接跑，不用起服务就能看到结果。",
        "学习路径：第一个图 → 状态与更新 → 条件路由 → 工具调用 → 短期记忆 → 人工介入 → 流式输出 → 长期记忆 → 子图与并行 → 接上网页 → 可观测与部署。",
      ],
    },
    {
      title: "怎么读这个 Lab",
      bullets: [
        "每课页上半部分是知识点（本课出现的 API），下半部分是操作列表：装依赖 → 创建文件 → 粘贴代码 → 验收。",
        "跟做顺序：先在项目里建好文件，再逐块复制代码，最后按「验收」里的命令跑一次。",
        "右侧是本课用到的官方文档；知识点右上角偶尔会有「延伸阅读」，讲一个相关但不在主线里的概念。",
      ],
    },
  ] satisfies HomeSection[],
  stack: {
    title: "本教程技术栈",
    items: [
      { label: "框架", value: "Next.js（App Router）" },
      { label: "语言", value: "TypeScript" },
      { label: "编排运行时", value: "@langchain/langgraph" },
      { label: "模型", value: "DeepSeek（@langchain/deepseek 的 ChatDeepSeek）" },
      { label: "Schema", value: "zod" },
      { label: "验证方式", value: "tsx 脚本；最后一课起用网页" },
      { label: "包管理", value: "pnpm" },
    ] satisfies HomeStackItem[],
  },
  cta: {
    label: "立即开始",
    href: HOME_INIT_PATH,
  },
  docLinks: [
    {
      title: "LangGraph 概览",
      href: "https://docs.langchain.com/oss/javascript/langgraph/overview",
    },
    {
      title: "Graph API",
      href: "https://docs.langchain.com/oss/javascript/langgraph/graph-api",
    },
    {
      title: "Workflows 与 Agents",
      href: "https://docs.langchain.com/oss/javascript/langgraph/workflows-agents",
    },
    {
      title: "Persistence",
      href: "https://docs.langchain.com/oss/javascript/langgraph/persistence",
    },
    {
      title: "Interrupts",
      href: "https://docs.langchain.com/oss/javascript/langgraph/interrupts",
    },
    {
      title: "Streaming",
      href: "https://docs.langchain.com/oss/javascript/langgraph/streaming",
    },
    {
      title: "Stores",
      href: "https://docs.langchain.com/oss/javascript/langgraph/stores",
    },
    {
      title: "ChatDeepSeek 集成",
      href: "https://docs.langchain.com/oss/javascript/integrations/chat/deepseek",
    },
  ] satisfies HomeDocLink[],
};
