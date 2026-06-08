import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "D:/Thunderobot/GitHub/-ERP-/outputs/km_page_2755096899_test_cases/prd_marketing_spec_id_skill_detailed_test_cases_corrected.xlsx";
const outputDir = path.join(process.env.TEMP || "C:/Users/Thunderobot/AppData/Local/Temp", "km_page_2755096899_test_cases");
await fs.mkdir(outputDir, { recursive: true });

const headers = ["目录", "标题", "优先级", "描述", "前置条件", "步骤", "预期结果"];

function stripSidePrefix(module) {
  return String(module || "")
    .replace(/^卖家侧-/, "")
    .replace(/^买家侧-/, "")
    .replace(/^平台侧-/, "");
}

function directoryOf(module, side) {
  const cleanModule = stripSidePrefix(module);
  const cleanSide = String(side || "").trim();
  if (!cleanSide) return cleanModule;
  if (cleanModule.includes(cleanSide)) return cleanModule;
  return `${cleanSide}/${cleanModule}`;
}

function numberedPrecondition(precondition, testData) {
  const lines = [];
  if (precondition) lines.push(`1. ${precondition}`);
  if (testData) lines.push(`${lines.length + 1}. 测试数据：${testData}`);
  return lines.join("\n");
}

function descriptionOf(id, req, type, section, note) {
  const parts = [`用例ID：${id}`, `需求点：${req}`, `用例类型：${type}`, `关联章节：${section}`];
  if (note) parts.push(`备注：${note}`);
  return parts.join("；");
}

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceRows = source.worksheets.getItem("测试用例").getUsedRange().values.slice(1).filter((row) => row[0]);
const rows = sourceRows.map((row) => {
  const [id, module, side, req, title, priority, type, precondition, testData, steps, expected, section, note] = row;
  return [
    directoryOf(module, side),
    `验证${stripSidePrefix(module)}-${title}`,
    priority,
    descriptionOf(id, req, type, section, note),
    numberedPrecondition(precondition, testData),
    steps,
    expected,
  ].map((value) => value ?? "");
});

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("营销限时购按规格ID");
sheet.showGridLines = false;
sheet.getRange("A1").writeValues([headers]);
rows.forEach((row, index) => sheet.getRange(`A${index + 2}`).writeValues([row]));

const used = sheet.getUsedRange();
used.format = {
  fill: "#FFFFFF",
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#D9D9D9" },
};
used.format.font = { name: "Microsoft YaHei", size: 10, color: "#000000" };
sheet.getRange("A1:G1").format = {
  fill: "#FFFFFF",
  font: { name: "Microsoft YaHei", bold: true, color: "#000000", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#BFBFBF" },
};

const widths = [230, 300, 70, 300, 360, 390, 450];
widths.forEach((width, index) => {
  sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidthPx = width;
});
sheet.getRange("A1:G1").format.rowHeightPx = 28;
sheet.getRange(`A2:G${rows.length + 1}`).format.rowHeightPx = 96;
sheet.getRange(`C2:C${rows.length + 1}`).format.horizontalAlignment = "center";
sheet.freezePanes.freezeRows(1);

const preview = await workbook.render({ sheetName: "营销限时购按规格ID", range: "A1:G20", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "company_template_no_color_preview.png"), new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
await fs.writeFile(path.join(outputDir, "company_template_no_color_verification.txt"), errors.ndjson || "");

const output = await SpreadsheetFile.exportXlsx(workbook);
const outPath = path.join(outputDir, "marketing_spec_id_test_cases_company_template.xlsx");
await output.save(outPath);
const usedValues = sheet.getUsedRange().values;
console.log(JSON.stringify({
  outPath,
  sheet: "营销限时购按规格ID",
  rowsIncludingHeader: usedValues.length,
  caseCount: usedValues.length - 1,
  cols: usedValues[0].length,
  firstCase: usedValues[1],
  lastCase: usedValues[usedValues.length - 1],
}, null, 2));
