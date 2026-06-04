import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const baseDir = "D:/Thunderobot/GitHub/-ERP-/outputs/km_invoice_prd_tests";
const jsonPath = path.join(baseDir, "merged_v2_cases.json");
const tmpOutputPath = path.join(os.tmpdir(), "invoice_prd_phase2_test_cases_v2_merged.xlsx");
const payload = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const cases = payload.cases;

const headers = [
  "用例ID",
  "模块",
  "端/角色",
  "功能点",
  "用例标题",
  "前置条件",
  "操作步骤",
  "测试数据",
  "预期结果",
  "优先级",
  "用例类型",
  "执行状态",
  "来源/备注",
];

const moduleOrder = ["PC发票管理", "任务中心", "小程序发票管理", "订单撤销开票", "平台待办", "卖家待办", "批量导入发票", "规则与边界"];

function countBy(key) {
  const out = {};
  for (const item of cases) out[item[key]] = (out[item[key]] || 0) + 1;
  return out;
}

function rowsFromCases(rows) {
  return [
    headers,
    ...rows.map((item) => [
      item.id,
      item.module,
      item.client,
      item.feature,
      item.title,
      item.precondition,
      item.steps,
      item.data,
      item.expected,
      item.priority,
      item.type,
      item.status,
      item.source,
    ]),
  ];
}

function setWidth(sheet, colIndex, widthPx) {
  const colLetter = String.fromCharCode("A".charCodeAt(0) + colIndex);
  sheet.getRange(`${colLetter}:${colLetter}`).format.columnWidthPx = widthPx;
}

function styleSheet(sheet, rowCount, colCount, isCaseSheet = false) {
  sheet.showGridLines = false;
  const used = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
  used.format.wrapText = true;
  used.format.font = { name: "Microsoft YaHei", size: 10, color: "#1F2937" };
  used.format.borders = { preset: "all", style: "thin", color: "#D9E2EC" };
  const header = sheet.getRangeByIndexes(0, 0, 1, colCount);
  header.format.fill = { color: "#1F4E79" };
  header.format.font = { name: "Microsoft YaHei", size: 10, bold: true, color: "#FFFFFF" };
  header.format.rowHeightPx = 32;
  sheet.freezePanes.freezeRows(1);
  if (isCaseSheet) {
    sheet.freezePanes.freezeColumns(1);
    [82, 112, 112, 136, 280, 260, 390, 220, 390, 64, 86, 86, 190].forEach((width, index) => setWidth(sheet, index, width));
    sheet.getRangeByIndexes(1, 0, Math.max(rowCount - 1, 1), colCount).format.rowHeightPx = 118;
    if (rowCount > 1) {
      sheet.getRange(`J2:J${rowCount}`).format.fill = { color: "#FFF4CC" };
      sheet.getRange(`L2:L${rowCount}`).format.fill = { color: "#F3F4F6" };
    }
  } else {
    for (let i = 0; i < colCount; i += 1) setWidth(sheet, i, i === 0 ? 170 : 310);
    sheet.getRangeByIndexes(1, 0, Math.max(rowCount - 1, 1), colCount).format.rowHeightPx = 58;
  }
}

function addSheet(workbook, name, rows, isCaseSheet = false) {
  const sheet = workbook.worksheets.add(name);
  sheet.getRangeByIndexes(0, 0, rows.length, rows[0].length).values = rows;
  styleSheet(sheet, rows.length, rows[0].length, isCaseSheet);
  if (isCaseSheet && rows.length > 1) {
    sheet.getRange(`J2:J${rows.length}`).dataValidation = { rule: { type: "list", values: ["P0", "P1", "P2"] } };
    sheet.getRange(`K2:K${rows.length}`).dataValidation = { rule: { type: "list", values: ["功能", "异常", "边界", "权限", "并发/异常", "回归", "UI", "一致性"] } };
    sheet.getRange(`L2:L${rows.length}`).dataValidation = { rule: { type: "list", values: ["未执行", "通过", "失败", "阻塞", "不适用"] } };
  }
}

const byModule = countBy("module");
const byPriority = countBy("priority");
const byType = countBy("type");
const bySource = countBy("source");

const overview = [
  ["工作簿名称", "发票二期需求测试用例 V2 合并增强版"],
  ["用例总数", cases.length],
  ["合并策略", "以Codex V1最新PRD口径为底座，吸收GLM细颗粒度场景，另一份AI仅吸收独有空态/跳转/边界场景。"],
  ["旧方案处理", "PRD 2026-05-26说明去掉发票管理页导出记录，统一使用任务中心；旧导出记录入口类用例已剔除或改写。"],
  ["重点增强", "任务中心、批量导入ZIP/XLSX/PDF、下载状态反写、小程序跨页选择、撤销并发校验、待办生成/处理、字段边界。"],
  ["P0/P1/P2", `P0=${byPriority.P0 || 0}；P1=${byPriority.P1 || 0}；P2=${byPriority.P2 || 0}`],
];

const coverage = [
  ["模块", "用例数", "P0", "P1", "P2", "主要功能点"],
  ...moduleOrder.map((module) => {
    const rows = cases.filter((item) => item.module === module);
    return [
      module,
      rows.length,
      rows.filter((item) => item.priority === "P0").length,
      rows.filter((item) => item.priority === "P1").length,
      rows.filter((item) => item.priority === "P2").length,
      [...new Set(rows.map((item) => item.feature))].join("；"),
    ];
  }),
];

const differences = [
  ["差异项", "处理结果", "说明"],
  ["导出记录入口", "删除/改写", "GLM和另一份AI存在较多页面级导出记录入口用例；最新PRD已改为统一任务中心，因此不保留入口存在性断言。"],
  ["任务中心", "增强", "新增入口、两个TAB、状态刷新、关闭不取消、权限隔离、成功/失败/处理中下载行为。"],
  ["批量导入发票", "增强", "其它两份AI基本缺失；V2补充ZIP结构、XLSX数量/大小、PDF命名、失败数据、同票多订单一致性。"],
  ["小程序选择", "增强", "吸收GLM本页全选、跨页累计、未加载数据不参与、回到已选页状态等细项。"],
  ["待办", "增强", "吸收GLM/另一份AI的标题、无数据、查看详情、去处理跳转，并保留定时生成/进度闭环。"],
  ["规则边界", "增强", "补充2026-01-01支付时间边界、售后关闭、先货后款未还款、订单总额为0等资格规则。"],
];

const sourceRows = [
  ["来源", "吸收用例数"],
  ...Object.entries(bySource).sort((a, b) => b[1] - a[1]),
];

const typeRows = [
  ["用例类型", "数量"],
  ...Object.entries(byType).sort((a, b) => b[1] - a[1]),
];

const workbook = Workbook.create();
addSheet(workbook, "总览", overview);
addSheet(workbook, "覆盖矩阵", coverage);
addSheet(workbook, "差异说明", differences);
addSheet(workbook, "来源统计", sourceRows);
addSheet(workbook, "类型统计", typeRows);

for (const module of moduleOrder) {
  const rows = cases.filter((item) => item.module === module);
  if (rows.length) addSheet(workbook, module, rowsFromCases(rows), true);
}
addSheet(workbook, "全部用例", rowsFromCases(cases), true);

const check = await workbook.inspect({
  kind: "table",
  range: "覆盖矩阵!A1:F10",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 8,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["总览", "覆盖矩阵", "差异说明"]) {
  await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
}
for (const sheetName of ["PC发票管理", "小程序发票管理", "批量导入发票", "全部用例"]) {
  await workbook.render({ sheetName, range: "A1:M20", scale: 1, format: "png" });
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(tmpOutputPath);
console.log(JSON.stringify({ tmpOutputPath, totalCases: cases.length, modules: byModule }, null, 2));
