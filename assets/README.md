# assets 说明

## 文件夹用途

`assets/` 用于统一管理产品工作中的静态资源，避免图片、图标、原型图和流程图分散在聊天记录、桌面或临时目录中。

## 子文件夹说明

### `images/`

用于存放截图、页面参考图、活动素材、文档配图等通用图片。

### `icons/`

用于存放图标资源、功能图标草稿、导出图标和统一视觉资产。

### `mockups/`

用于存放原型图、线框图、设计稿快照、页面结构草图等。

### `diagrams/`

用于存放流程图、泳道图、状态图、架构图及其源文件。

## 资源命名规范

建议格式：

`[模块名]-[内容描述]-[版本号].扩展名`

示例：

- `product-create-page-v1.png`
- `order-audit-flow-v2.drawio`
- `inventory-warning-icon-v1.svg`
- `member-growth-dashboard-v3.fig`

## 引用方式

- 在 PRD 中引用时，建议写相对路径，方便迁移和协作
- 在 Markdown 文档中可使用 `![说明](../assets/images/xxx.png)` 形式引用
- 在方案评审文档中，建议同时写明资源用途和版本
