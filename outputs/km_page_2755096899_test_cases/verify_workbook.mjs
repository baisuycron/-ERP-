import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const filePath = "D:/Thunderobot/GitHub/-ERP-/outputs/km_page_2755096899_test_cases/prd_marketing_spec_id_skill_detailed_test_cases_corrected.xlsx";
const input = await FileBlob.load(filePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheetNames = workbook.worksheets.items.map((s) => s.name);
const casesSheet = workbook.worksheets.getItem("测试用例");
const reqSheet = workbook.worksheets.getItem("需求点矩阵");
const apiSheet = workbook.worksheets.getItem("接口测试点");
const uiSheet = workbook.worksheets.getItem("UI测试点");
const regressionSheet = workbook.worksheets.getItem("回归范围");
const questionSheet = workbook.worksheets.getItem("待确认问题");
const casesUsed = casesSheet.getUsedRange().values;
const reqUsed = reqSheet.getUsedRange().values;
const apiUsed = apiSheet.getUsedRange().values;
const uiUsed = uiSheet.getUsedRange().values;
const regressionUsed = regressionSheet.getUsedRange().values;
const questionUsed = questionSheet.getUsedRange().values;
console.log(JSON.stringify({
  sheetNames,
  testCaseRowsIncludingHeader: casesUsed.length,
  testCaseCount: casesUsed.length - 1,
  requirementCount: reqUsed.length - 1,
  apiCheckCount: apiUsed.length - 1,
  uiCheckCount: uiUsed.length - 1,
  regressionCount: regressionUsed.length - 1,
  questionCount: questionUsed.length - 1,
  firstCase: casesUsed[1],
  lastCase: casesUsed[casesUsed.length - 1],
}, null, 2));
