# 产品经理 AI IDE 工作空间

## 项目简介

这是一个面向产品经理的 AI IDE 工作空间，用于统一管理需求分析、PRD 撰写、字段清单、前端 Demo 协作和业务分析材料。

当前仓库同时保留了一套可运行的前端 Demo 代码，位于 `src/`。你可以把这里理解为：

- `src/`：演示页面与前端实现区
- 其余标准目录：产品文档、方法论、AI 协作与交付管理区

## 项目结构

```text
D:\Codexsdbb
├── .agent
│   ├── rules
│   ├── skills
│   └── workflows
├── analysis
│   ├── data-analysis
│   ├── process-simulation
│   └── scope-analysis
├── assets
│   ├── diagrams
│   ├── icons
│   ├── images
│   └── mockups
├── context
├── docs
│   ├── 01-reference
│   └── 02-other-docs
├── drafts
│   └── archive
├── outputs
│   ├── archive
│   ├── client-prds
│   ├── handoff-docs
│   └── presentations
├── prds
│   └── archive
├── prompts
├── src
├── templates
├── AGENT.md
└── README.md
```

## 快速开始

### 方式一：作为产品工作空间使用

1. 在 `context/` 中补充项目背景、目标用户和关键约束
2. 在 `drafts/` 中记录需求草稿和 AI 初稿
3. 在 `analysis/` 中输出业务分析、流程推演和影响范围分析
4. 在 `prds/` 中沉淀正式 PRD
5. 在 `outputs/` 中整理对外交付物

### 方式二：联动当前前端 Demo 使用

1. 在 `prds/` 中编写页面需求和字段清单
2. 在 `src/` 中查看或迭代演示代码
3. 在 `assets/mockups/` 和 `assets/diagrams/` 中管理原型与流程图
4. 在 `outputs/handoff-docs/` 中生成交接文档

### 启动本地 Demo

```bash
cd D:\Codexsdbb
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 文件夹说明

- `.agent/`：AI 配置中心，沉淀规则、技能包和标准工作流
- `analysis/`：业务分析材料，包括数据分析、流程推演和影响范围分析
- `assets/`：图片、图标、原型图、流程图等统一素材库
- `context/`：项目背景、业务目标、用户画像、术语表等上下文信息
- `docs/`：参考资料、外部文档、会议纪要等文档库
- `drafts/`：草稿、脑暴记录、AI 初稿和试错内容
- `outputs/`：对外交付物，如客户版 PRD、汇报材料、交接文档
- `prds/`：正式 PRD 输出区，适合沉淀评审后的版本
- `prompts/`：常用 Prompt、提示词模板和结构化指令
- `templates/`：PRD 模板、字段模板、分析模板、汇报模板
- `src/`：当前前端 Demo 代码区

## 使用技巧

- 把通用要求写进 `.agent/rules/`，减少每次重复说明
- 把高频任务流程写进 `.agent/workflows/`，方便分阶段推进
- 把稳定模板放进 `templates/`，把临时草稿放进 `drafts/`
- 所有正式结论都尽量落盘，不依赖聊天记录
- 对重要交付物，建议在文档末尾保留版本号、负责人和更新时间
