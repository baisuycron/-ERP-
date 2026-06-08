# Codex 项目指令

## 本地 Skills 调用规则

本仓库维护了一组项目内本地 skill，路径为：

- `.agents/skills/PM/SKILL.md`
- `.agents/skills/PRD/SKILL.md`
- `.agents/skills/TEST/SKILL.md`

当用户在对话中提到以下说法时，必须先读取对应 `SKILL.md`，再开始执行任务：

- `PM skill`、`pm skill`、`产品经理 skill`、`需求分析 skill` -> 读取 `.agents/skills/PM/SKILL.md`
- `PRD skill`、`prd skill`、`生成 PRD`、`写 PRD` -> 读取 `.agents/skills/PRD/SKILL.md`
- `TEST skill`、`test skill`、`测试用例 skill`、`测试点`、`生成测试用例` -> 读取 `.agents/skills/TEST/SKILL.md`

如果用户只说“调用某个 skill”，不要只查系统内置 skills；应优先检查本仓库 `.agents/skills/` 下是否存在同名或语义匹配的 skill。

## 使用边界

- PM skill 用于需求调研、需求分析、业务规则拆解、页面交互说明、验收标准和待确认问题。
- PRD skill 用于生成或整理完整 PRD。
- TEST skill 用于生成测试点、测试用例或测试用例表格。

当用户明确指定某个 skill 时，以用户指定为准；当用户没有明确指定时，根据任务语义选择最匹配的本地 skill。
