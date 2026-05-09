const fs = require("fs");
const os = require("os");
const path = require("path");

const { chromium } = require("playwright");

const APP_URL = process.env.APP_URL || "http://127.0.0.1:5174/";
const CHROME_PATH = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const HEADLESS = process.env.HEADLESS === "1";
const SLOW_MO = Number(process.env.SLOW_MO || 250);
const ARTIFACT_ROOT = path.resolve(process.cwd(), "test-artifacts", "shop-invoice-visual");
const SCREENSHOT_DIR = path.join(ARTIFACT_ROOT, "screenshots");
const RESULT_JSON = path.join(ARTIFACT_ROOT, "results.json");
const RESULT_HTML = path.join(ARTIFACT_ROOT, "report.html");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const pdfPath = path.join(os.tmpdir(), "codex-visual-test-invoice.pdf");
if (!fs.existsSync(pdfPath)) {
  fs.writeFileSync(
    pdfPath,
    Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n", "utf8")
  );
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

async function setupPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1567, height: 910 } });
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelectorAll("button")[2].click());
  await page.waitForSelector(".shop-invoice-tab");
  return page;
}

async function getToastText(page) {
  const toast = page.locator(".page-toast").last();
  await toast.waitFor({ state: "visible", timeout: 3000 });
  return (await toast.textContent())?.trim() || "";
}

async function fillOrderNoAndSearch(page, orderNo) {
  const field = page.locator(".shop-invoice-filter-grid .shop-invoice-field").nth(0).locator("input");
  await field.fill("");
  await field.fill(orderNo);
  await page.locator(".shop-invoice-filter-actions .btn.btn-dark").click();
  await page.waitForTimeout(500);
}

async function resetFilters(page) {
  await page.locator(".shop-invoice-filter-actions .btn.btn-reset").click();
  await page.waitForTimeout(300);
}

function rowLocator(page, orderNo) {
  return page.locator(`.shop-invoice-table tbody tr:has-text("${orderNo}")`).first();
}

async function clickRowAction(page, orderNo, actionText) {
  const row = rowLocator(page, orderNo);
  await row.waitFor({ state: "visible", timeout: 5000 });
  await row.locator(`button:has-text("${actionText}")`).click();
  await page.waitForTimeout(400);
}

async function capture(page, caseId, name) {
  const safeName = sanitizeFileName(name);
  const filePath = path.join(SCREENSHOT_DIR, `${caseId}_${safeName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlReport(results) {
  const passCount = results.filter((item) => item.result === "通过").length;
  const failCount = results.length - passCount;
  const rows = results.map((item) => {
    const screenshots = (item.screenshots || []).map((shot) => {
      const relativePath = path.relative(ARTIFACT_ROOT, shot).replace(/\\/g, "/");
      return `<a href="${htmlEscape(relativePath)}" target="_blank">${htmlEscape(path.basename(shot))}</a>`;
    }).join("<br />");
    return `
      <tr>
        <td>${htmlEscape(item.caseId)}</td>
        <td>${htmlEscape(item.title)}</td>
        <td class="${item.result === "通过" ? "pass" : "fail"}">${htmlEscape(item.result)}</td>
        <td>${htmlEscape(item.actual || "")}</td>
        <td>${htmlEscape(item.expected || "")}</td>
        <td>${screenshots}</td>
        <td>${htmlEscape(item.note || "")}</td>
      </tr>
    `;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>发票管理可视化自动测试报告</title>
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; margin: 24px; color: #111827; background: #f8fafc; }
    .summary { display: flex; gap: 16px; margin-bottom: 20px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; min-width: 160px; }
    .card strong { display: block; font-size: 28px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; vertical-align: top; font-size: 14px; line-height: 1.5; }
    th { background: #f3f4f6; text-align: left; }
    .pass { color: #047857; font-weight: 700; }
    .fail { color: #b91c1c; font-weight: 700; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <h1>供应商后台 > 店铺 > 发票管理</h1>
  <p>执行方式：Chrome 可视化自动测试</p>
  <div class="summary">
    <div class="card"><span>执行总数</span><strong>${results.length}</strong></div>
    <div class="card"><span>通过</span><strong>${passCount}</strong></div>
    <div class="card"><span>失败</span><strong>${failCount}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>用例编号</th>
        <th>测试项</th>
        <th>结果</th>
        <th>实际结果</th>
        <th>预期结果</th>
        <th>截图</th>
        <th>备注</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function runCase(caseId, title, fn) {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    executablePath: CHROME_PATH
  });
  const page = await setupPage(browser);
  const screenshots = [];

  try {
    const detail = await fn(page, screenshots, caseId);
    await browser.close();
    return { caseId, title, result: "通过", startedAt, screenshots, ...detail };
  } catch (error) {
    try {
      screenshots.push(await capture(page, caseId, "failure"));
    } catch {}
    await browser.close();
    return {
      caseId,
      title,
      result: "失败",
      startedAt,
      screenshots,
      actual: error.message,
      note: error.stack?.split("\n").slice(0, 2).join(" | ") || ""
    };
  }
}

(async () => {
  const results = [];

  results.push(await runCase("TC-INV-001", "发票管理页签展示", async (page, screenshots, caseId) => {
    screenshots.push(await capture(page, caseId, "invoice-tabs"));
    const tabs = await page.locator(".shop-invoice-tab").allTextContents();
    const expected = ["全部", "待开票", "已驳回", "已撤销", "已开票", "发票设置"];
    for (const item of expected) {
      if (!tabs.some((tab) => tab.includes(item))) throw new Error(`缺少页签: ${item}`);
    }
    return { actual: tabs.join(" | "), expected: "展示全部核心状态页签" };
  }));

  results.push(await runCase("TC-INV-018", "单笔确认开票成功", async (page, screenshots, caseId) => {
    await fillOrderNoAndSearch(page, "2026040814382551");
    screenshots.push(await capture(page, caseId, "search-pending-order"));
    await clickRowAction(page, "2026040814382551", "确认开票");
    screenshots.push(await capture(page, caseId, "confirm-modal"));
    await page.locator('.shop-invoice-confirm-modal input[type="file"]').setInputFiles(pdfPath);
    const inputs = page.locator(".shop-invoice-confirm-form input");
    await inputs.nth(0).fill("AUTO-VISUAL-1001");
    await inputs.nth(1).fill("1880.00");
    await page.locator(".shop-invoice-date-native-input").fill("2026-05-09");
    screenshots.push(await capture(page, caseId, "confirm-form-filled"));
    await page.locator(".shop-invoice-confirm-foot .btn.btn-dark").click();
    const toast = await getToastText(page);
    screenshots.push(await capture(page, caseId, "confirm-success"));
    const rowText = await rowLocator(page, "2026040814382551").textContent();
    if (toast !== "确认开票成功") throw new Error(`提示不符: ${toast}`);
    if (!rowText.includes("已开票") || !rowText.includes("AUTO-VISUAL-1001")) throw new Error("订单状态或发票号未更新");
    return { actual: "订单改为已开票，发票号更新为 AUTO-VISUAL-1001", expected: "确认开票成功并更新状态" };
  }));

  results.push(await runCase("TC-INV-020", "单笔驳回成功", async (page, screenshots, caseId) => {
    await fillOrderNoAndSearch(page, "2026041010314407");
    screenshots.push(await capture(page, caseId, "search-reject-order"));
    await clickRowAction(page, "2026041010314407", "驳回");
    screenshots.push(await capture(page, caseId, "reject-modal"));
    await page.locator(".shop-invoice-reject-input-wrap textarea").fill("可视化自动测试驳回原因");
    screenshots.push(await capture(page, caseId, "reject-form-filled"));
    await page.locator(".shop-invoice-reject-foot .btn.btn-dark").click();
    const toast = await getToastText(page);
    screenshots.push(await capture(page, caseId, "reject-success"));
    const rowText = await rowLocator(page, "2026041010314407").textContent();
    if (toast !== "驳回成功") throw new Error(`提示不符: ${toast}`);
    if (!rowText.includes("已驳回")) throw new Error("订单未更新为已驳回");
    return { actual: "订单改为已驳回", expected: "驳回成功并更新状态" };
  }));

  results.push(await runCase("TC-INV-032", "单笔修改发票成功", async (page, screenshots, caseId) => {
    await fillOrderNoAndSearch(page, "2026040119104267");
    screenshots.push(await capture(page, caseId, "search-invoiced-order"));
    await clickRowAction(page, "2026040119104267", "修改发票");
    screenshots.push(await capture(page, caseId, "modify-modal"));
    await page.locator('.shop-invoice-confirm-modal input[type="file"]').setInputFiles(pdfPath);
    const inputs = page.locator(".shop-invoice-confirm-form input");
    await inputs.nth(0).fill("AUTO-VISUAL-EDIT-2001");
    await inputs.nth(1).fill("2760.00");
    await page.locator(".shop-invoice-date-native-input").fill("2026-05-09");
    screenshots.push(await capture(page, caseId, "modify-form-filled"));
    await page.locator(".shop-invoice-confirm-foot .btn.btn-dark").click();
    const toast = await getToastText(page);
    screenshots.push(await capture(page, caseId, "modify-success"));
    const rowText = await rowLocator(page, "2026040119104267").textContent();
    if (!toast.includes("修改")) throw new Error(`未捕获修改成功提示: ${toast}`);
    if (!rowText.includes("AUTO-VISUAL-EDIT-2001")) throw new Error("修改后的发票号未展示");
    return { actual: "修改发票成功，发票号更新为 AUTO-VISUAL-EDIT-2001", expected: "修改成功并更新发票信息" };
  }));

  fs.writeFileSync(RESULT_JSON, JSON.stringify(results, null, 2), "utf8");
  fs.writeFileSync(RESULT_HTML, buildHtmlReport(results), "utf8");

  console.log(JSON.stringify({
    resultJson: RESULT_JSON,
    resultHtml: RESULT_HTML,
    screenshots: SCREENSHOT_DIR,
    summary: {
      total: results.length,
      pass: results.filter((item) => item.result === "通过").length,
      fail: results.filter((item) => item.result === "失败").length
    }
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
