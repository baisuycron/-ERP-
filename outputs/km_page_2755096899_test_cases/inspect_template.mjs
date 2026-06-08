import XLSX from "xlsx";

const path =
  "c:/Users/Thunderobot/Documents/WXWork/1688857839786170/Cache/File/2026-06/发票二期测试用例1-20260527别动.xlsx";
const wb = XLSX.readFile(path, { cellStyles: true });
console.log("Sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  console.log(`\n=== ${name} rows=${range.e.r + 1} cols=${range.e.c + 1} ===`);
  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    const row = [];
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v).replace(/\n/g, "\\n").slice(0, 100) : "");
    }
    console.log(`R${r + 1}:`, JSON.stringify(row));
  }
  if (ws["!merges"]) console.log("Merges:", JSON.stringify(ws["!merges"]));
  if (ws["!cols"]) console.log("Col widths:", JSON.stringify(ws["!cols"]));
}
