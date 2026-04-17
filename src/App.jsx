import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const buyerPageNames = ["买家列表"];
const shopPageNames = ["发票管理"];
const shopInvoiceStatusTabs = ["全部", "待开票", "已驳回", "已撤销", "已开票", "发票设置"];
const shopInvoiceMarkerFilterOptions = ["全部", "即将超时", "超时", "已修改", "撤销重提"];
const initialShopInvoiceFilters = {
  orderNo: "",
  invoiceType: "全部",
  singleInvoice: "全部",
  paymentMethod: "全部",
  invoiceContent: "全部",
  invoiceBatch: "",
  invoiceStatus: "全部",
  orderStatus: "全部",
  afterSaleStatus: "全部",
  paidAtRange: { startDate: "", endDate: "" },
  appliedAtRange: { startDate: "", endDate: "" },
  invoicedAtRange: { startDate: "", endDate: "" },
  invoiceNo: "",
  invoiceTitle: "",
  taxpayerId: "",
  buyerAccount: "",
  store: ""
};

const shopInvoiceAfterSaleStatusOptions = ["售后中", "退款成功", "售后关闭", "部分售后完成"];
const shopInvoiceAfterSaleStatusTooltip = `售后中：当订单下任一 SKU 售后状态属于以下之一：

待供应商审核
待买家寄货
待供应商收货
待平台确认
退款中

退款成功：当订单下所有发起售后的 SKU 都是：退款成功

售后关闭：当订单下所有发起售后的 SKU 都是以下关闭态之一：
供应商拒绝
平台驳回
买家取消

部分售后完成：
当订单下所有售后都已结束，但结束结果混合，例如：
部分 SKU = 退款成功
部分 SKU = 供应商拒绝 / 平台驳回 / 买家取消`;
const shopInvoicePaymentMethodOptions = ["全部", "先货后款", "先款后货"];
const shopInvoiceAfterSaleInProgressStatuses = ["待供应商审核", "待买家寄货", "待供应商收货", "待平台确认", "退款中", "售后审核中"];
const shopInvoiceAfterSaleClosedStatuses = ["供应商拒绝", "平台驳回", "买家取消"];
const shopInvoiceAfterSaleSuccessStatuses = ["退款成功"];

const normalizeShopInvoiceMode = (value) => {
  if (value === "单独开票" || value === "是") return "是";
  if (value === "合并开票" || value === "否") return "否";
  return "否";
};

function parseMoneyValue(value) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoneyDisplay(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatCurrentDateTime() {
  return new Date().toLocaleString("sv-SE", { hour12: false });
}

function getShopInvoiceOrderAfterSaleSummary(statuses) {
  const normalizedStatuses = (Array.isArray(statuses) ? statuses : [])
    .map((status) => String(status || "").trim())
    .filter((status) => status && status !== "-");
  if (normalizedStatuses.length === 0) {
    return {
      afterSaleStatus: "-",
      afterSaleStatusDetail: "-",
      orderStatus: "已完成"
    };
  }

  const isRefundSuccess = normalizedStatuses.every((status) => shopInvoiceAfterSaleSuccessStatuses.includes(status));
  if (isRefundSuccess) {
    return {
      afterSaleStatus: "退款成功",
      afterSaleStatusDetail: "退款成功",
      orderStatus: "已完成"
    };
  }

  const isSummaryClosed = normalizedStatuses.every((status) => status === "售后关闭");
  if (isSummaryClosed) {
    return {
      afterSaleStatus: "售后关闭",
      afterSaleStatusDetail: "售后关闭",
      orderStatus: "已完成"
    };
  }

  const isSummaryPartialDone = normalizedStatuses.every((status) => status === "部分售后完成");
  if (isSummaryPartialDone) {
    return {
      afterSaleStatus: "部分售后完成",
      afterSaleStatusDetail: "部分售后完成",
      orderStatus: "已完成"
    };
  }

  const isClosed = normalizedStatuses.every((status) => shopInvoiceAfterSaleClosedStatuses.includes(status));
  if (isClosed) {
    return {
      afterSaleStatus: "售后关闭",
      afterSaleStatusDetail: "售后关闭",
      orderStatus: "已完成"
    };
  }

  const isEnded = normalizedStatuses.every((status) => (
    shopInvoiceAfterSaleSuccessStatuses.includes(status) || shopInvoiceAfterSaleClosedStatuses.includes(status)
  ));
  if (isEnded) {
    return {
      afterSaleStatus: "部分售后完成",
      afterSaleStatusDetail: "部分售后完成",
      orderStatus: "已完成"
    };
  }

  const hasInProgress = normalizedStatuses.some((status) => shopInvoiceAfterSaleInProgressStatuses.includes(status));
  if (hasInProgress) {
    return {
      afterSaleStatus: "售后中",
      afterSaleStatusDetail: "售后中",
      orderStatus: "售后中"
    };
  }

  return {
    afterSaleStatus: "售后中",
    afterSaleStatusDetail: "售后中",
    orderStatus: "售后中"
  };
}

function getShopInvoiceOrderAfterSaleStatuses(row, detailSeed) {
  const detailItems = Array.isArray(detailSeed?.items) ? detailSeed.items : [];
  const detailStatuses = detailItems
    .map((item) => item.afterSaleStatus)
    .filter((status) => String(status || "").trim() && String(status || "").trim() !== "-");

  if (detailStatuses.length > 0) return detailStatuses;

  return [row?.afterSaleStatusDetail, row?.afterSaleStatus]
    .map((status) => String(status || "").trim())
    .filter((status) => status && status !== "-");
}

function PcMallContactSellerIconButton() {
  return (
    <button className="pc-mall-contact-icon-btn" type="button" aria-label="联系卖家" title="联系卖家">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.6 4.25h8.8c.8 0 1.45.65 1.45 1.45v5.1c0 .8-.65 1.45-1.45 1.45H7.95L5.1 14.4c-.22.16-.53 0-.53-.28v-1.87H3.6c-.8 0-1.45-.65-1.45-1.45V5.7c0-.8.65-1.45 1.45-1.45Z" />
        <path d="M5.15 7.1h5.7M5.15 9.2h4.1" />
      </svg>
    </button>
  );
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stringToUint8Array(value) {
  return new TextEncoder().encode(value);
}

function base64ToUint8Array(base64Value) {
  const binary = window.atob(base64Value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfBlobFromJpegDataUrl(jpegDataUrl, imageWidth, imageHeight) {
  const base64Payload = String(jpegDataUrl).split(",")[1] || "";
  const imageBytes = base64ToUint8Array(base64Payload);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const chunks = [];
  const objectOffsets = [0];
  let offset = 0;

  const pushChunk = (chunk) => {
    chunks.push(chunk);
    offset += chunk.length;
  };

  const pushText = (text) => {
    pushChunk(stringToUint8Array(text));
  };

  pushText("%PDF-1.4\n");

  objectOffsets[1] = offset;
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  objectOffsets[2] = offset;
  pushText("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");

  objectOffsets[3] = offset;
  pushText(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>
endobj
`);

  objectOffsets[4] = offset;
  pushText(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>
stream
`);
  pushChunk(imageBytes);
  pushText("\nendstream\nendobj\n");

  objectOffsets[5] = offset;
  pushText(`5 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}endstream
endobj
`);

  const xrefOffset = offset;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) {
    pushText(`${String(objectOffsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

function buildShopInvoicePreviewSvg(detail) {
  const invoiceInfo = detail?.invoiceInfo || {};
  const titleInfo = detail?.titleInfo || {};
  const orderInfo = detail?.orderInfo || {};
  const summary = detail?.summary || {};
  const items = Array.isArray(detail?.items) ? detail.items.slice(0, 6) : [];
  const svgWidth = 1240;
  const svgHeight = 1754;
  const tableTop = 744;
  const tableRowHeight = 72;
  const visibleRows = Math.max(items.length, 4);
  const lineY = tableTop + 64 + visibleRows * tableRowHeight;
  const totalBlockTop = lineY + 40;
  const tableRows = items.map((item, index) => {
    const rowTop = tableTop + 64 + index * tableRowHeight;
    return `
      <rect x="72" y="${rowTop}" width="1096" height="${tableRowHeight}" fill="#ffffff" />
      <text x="96" y="${rowTop + 42}" font-size="22" fill="#1f2937">${escapeXml(item.product || "-")}</text>
      <text x="470" y="${rowTop + 42}" font-size="22" fill="#1f2937">${escapeXml(item.spec || "-")}</text>
      <text x="698" y="${rowTop + 42}" font-size="22" fill="#1f2937">${escapeXml(item.unitPrice || "-")}</text>
      <text x="862" y="${rowTop + 42}" font-size="22" fill="#1f2937">${escapeXml(item.quantity || "-")}</text>
      <text x="984" y="${rowTop + 42}" font-size="22" fill="#1f2937">${escapeXml(item.subtotal || "-")}</text>
      <line x1="72" y1="${rowTop + tableRowHeight}" x2="1168" y2="${rowTop + tableRowHeight}" stroke="#e5e7eb" />
    `;
  }).join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="100%" height="100%" fill="#f4f6fb" />
    <rect x="40" y="40" width="1160" height="1674" rx="24" fill="#ffffff" stroke="#e5e7eb" />
    <text x="620" y="118" text-anchor="middle" font-size="44" font-weight="700" fill="#111827">电子发票预览</text>
    <text x="620" y="162" text-anchor="middle" font-size="22" fill="#6b7280">Supplier Invoice Preview</text>

    <rect x="72" y="206" width="1096" height="220" rx="18" fill="#f8fafc" stroke="#e5e7eb" />
    <text x="96" y="258" font-size="24" font-weight="700" fill="#111827">发票信息</text>
    <text x="96" y="308" font-size="22" fill="#4b5563">发票号码：${escapeXml(invoiceInfo.invoiceNo || "-")}</text>
    <text x="96" y="352" font-size="22" fill="#4b5563">发票类型：${escapeXml(invoiceInfo.invoiceType || "-")}</text>
    <text x="96" y="396" font-size="22" fill="#4b5563">开票时间：${escapeXml(invoiceInfo.invoicedAt || "-")}</text>
    <text x="660" y="308" font-size="22" fill="#4b5563">价税合计：${escapeXml(invoiceInfo.invoiceAmountWithTax || "-")}</text>
    <text x="660" y="352" font-size="22" fill="#4b5563">不含税金额：${escapeXml(invoiceInfo.invoiceAmountWithoutTax || "-")}</text>
    <text x="660" y="396" font-size="22" fill="#4b5563">申请订单：${escapeXml(orderInfo.orderNo || "-")}</text>

    <rect x="72" y="462" width="1096" height="236" rx="18" fill="#ffffff" stroke="#e5e7eb" />
    <text x="96" y="516" font-size="24" font-weight="700" fill="#111827">购方信息</text>
    <text x="96" y="566" font-size="22" fill="#4b5563">名称：${escapeXml(titleInfo.invoiceTitle || "-")}</text>
    <text x="96" y="610" font-size="22" fill="#4b5563">纳税人识别号：${escapeXml(titleInfo.taxpayerId || "-")}</text>
    <text x="96" y="654" font-size="22" fill="#4b5563">地址、电话：${escapeXml(`${titleInfo.registerAddress || "-"} ${titleInfo.registerPhone || ""}`.trim())}</text>
    <text x="660" y="566" font-size="22" fill="#4b5563">开户行及账号：</text>
    <text x="660" y="610" font-size="22" fill="#4b5563">${escapeXml(titleInfo.bankName || "-")}</text>
    <text x="660" y="654" font-size="22" fill="#4b5563">${escapeXml(titleInfo.bankAccount || "-")}</text>

    <rect x="72" y="${tableTop}" width="1096" height="64" rx="14" fill="#f8fafc" stroke="#e5e7eb" />
    <text x="96" y="${tableTop + 40}" font-size="22" font-weight="700" fill="#111827">商品/服务名称</text>
    <text x="470" y="${tableTop + 40}" font-size="22" font-weight="700" fill="#111827">规格型号</text>
    <text x="698" y="${tableTop + 40}" font-size="22" font-weight="700" fill="#111827">单价</text>
    <text x="862" y="${tableTop + 40}" font-size="22" font-weight="700" fill="#111827">数量</text>
    <text x="984" y="${tableTop + 40}" font-size="22" font-weight="700" fill="#111827">金额</text>
    ${tableRows}
    <line x1="72" y1="${lineY}" x2="1168" y2="${lineY}" stroke="#d1d5db" />

    <rect x="720" y="${totalBlockTop}" width="448" height="210" rx="18" fill="#fff7ed" stroke="#fed7aa" />
    <text x="752" y="${totalBlockTop + 52}" font-size="22" fill="#9a3412">订单总额：${escapeXml(summary.orderAmount || "-")}</text>
    <text x="752" y="${totalBlockTop + 96}" font-size="22" fill="#9a3412">售后金额总计：${escapeXml(summary.afterSaleAmount || "-")}</text>
    <text x="752" y="${totalBlockTop + 140}" font-size="22" fill="#9a3412">申请开票金额：${escapeXml(summary.applyInvoiceAmount || "-")}</text>
    <text x="752" y="${totalBlockTop + 184}" font-size="26" font-weight="700" fill="#c2410c">发票应开金额：${escapeXml(summary.shouldInvoiceAmount || invoiceInfo.invoiceAmountWithTax || "-")}</text>

    <text x="72" y="${totalBlockTop + 56}" font-size="22" fill="#4b5563">买家账号：${escapeXml(orderInfo.buyerAccount || "-")}</text>
    <text x="72" y="${totalBlockTop + 100}" font-size="22" fill="#4b5563">订单状态：${escapeXml(orderInfo.orderStatus || "-")}</text>
    <text x="72" y="${totalBlockTop + 144}" font-size="22" fill="#4b5563">支付时间：${escapeXml(orderInfo.paidAt || "-")}</text>

    <text x="620" y="1654" text-anchor="middle" font-size="20" fill="#94a3b8">本预览仅用于页面展示，实际发票内容以系统生成文件为准</text>
  </svg>`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

async function buildShopInvoicePreviewPdfUrl(detail) {
  const svgMarkup = buildShopInvoicePreviewSvg(detail);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  const image = await loadImage(svgDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持画布能力");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const pdfBlob = buildPdfBlobFromJpegDataUrl(jpegDataUrl, canvas.width, canvas.height);
  return URL.createObjectURL(pdfBlob);
}

function renderInvoicePreviewLoading(previewWindow, title) {
  previewWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f6fb; color: #334155; font: 16px/1.5 "Microsoft YaHei", "PingFang SC", sans-serif; }
      .invoice-preview-loading { padding: 20px 24px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08); }
    </style>
  </head>
  <body>
    <div class="invoice-preview-loading">正在生成 PDF 发票预览...</div>
  </body>
</html>`);
  previewWindow.document.close();
}

function renderInvoicePreviewContent(previewWindow, pdfUrl, title) {
  previewWindow.document.open();
  previewWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body { margin: 0; height: 100%; background: #eef2f7; }
      body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
      .invoice-preview-shell { height: 100%; display: flex; flex-direction: column; }
      .invoice-preview-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #fff; border-bottom: 1px solid #dbe2ea; color: #334155; font-size: 14px; }
      .invoice-preview-head a { color: #ff6f18; text-decoration: none; }
      .invoice-preview-frame { flex: 1; width: 100%; border: none; background: #eef2f7; }
    </style>
  </head>
  <body>
    <div class="invoice-preview-shell">
      <div class="invoice-preview-head">
        <span>PDF 发票预览</span>
        <a href="${pdfUrl}" download>下载 PDF</a>
      </div>
      <iframe class="invoice-preview-frame" src="${pdfUrl}" title="${escapeHtml(title)}"></iframe>
    </div>
  </body>
</html>`);
  previewWindow.document.close();
}

function getInvoicePdfFileName(detail) {
  const invoiceNo = String(detail?.invoiceInfo?.invoiceNo || "").trim();
  const orderNo = String(detail?.orderInfo?.orderNo || "").trim();
  const rawName = invoiceNo && invoiceNo !== "-" ? `发票-${invoiceNo}.pdf` : `发票-${orderNo || "详情"}.pdf`;
  return rawName.replace(/[\\/:*?"<>|]/g, "_");
}

function downloadBlobUrl(blobUrl, fileName) {
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function isShopInvoiceApplicationOverdue(row, overdueDays = 5) {
  if (!row || row.orderStatus !== "已完成" || row.invoiceStatus !== "待开票") return false;

  const normalizedValue = String(row.appliedAt || "").trim();
  if (!normalizedValue || normalizedValue === "-") return false;

  const parsedTime = Date.parse(normalizedValue.replace(/-/g, "/"));
  if (Number.isNaN(parsedTime)) return false;

  return Date.now() - parsedTime >= overdueDays * 24 * 60 * 60 * 1000;
}

function isShopInvoiceApplicationApproachingOverdue(row, overdueDays = 5, warningDays = 1) {
  if (!row || row.orderStatus !== "已完成" || row.invoiceStatus !== "待开票") return false;

  const normalizedValue = String(row.appliedAt || "").trim();
  if (!normalizedValue || normalizedValue === "-") return false;

  const parsedTime = Date.parse(normalizedValue.replace(/-/g, "/"));
  if (Number.isNaN(parsedTime)) return false;

  const elapsed = Date.now() - parsedTime;
  const warningThreshold = (overdueDays - warningDays) * 24 * 60 * 60 * 1000;
  const overdueThreshold = overdueDays * 24 * 60 * 60 * 1000;

  return elapsed >= warningThreshold && elapsed < overdueThreshold;
}

function getShopInvoiceApproachingTimeoutAt(row, overdueDays = 5) {
  if (!row) return "";
  if (row.approachingTimeoutAt) return row.approachingTimeoutAt;

  const normalizedValue = String(row.appliedAt || "").trim();
  if (!normalizedValue || normalizedValue === "-") return "";

  const parsedTime = Date.parse(normalizedValue.replace(/-/g, "/"));
  if (Number.isNaN(parsedTime)) return "";

  const timeoutDate = new Date(parsedTime + overdueDays * 24 * 60 * 60 * 1000);
  const year = timeoutDate.getFullYear();
  const month = String(timeoutDate.getMonth() + 1).padStart(2, "0");
  const day = String(timeoutDate.getDate()).padStart(2, "0");
  const hours = String(timeoutDate.getHours()).padStart(2, "0");
  const minutes = String(timeoutDate.getMinutes()).padStart(2, "0");
  const seconds = String(timeoutDate.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function hasShopInvoiceApproachingBadge(row) {
  return Boolean(row?.approachingTimeoutAt) || isShopInvoiceApplicationApproachingOverdue(row);
}

function getShopInvoiceApproachingTooltip(row) {
  const timeoutAt = getShopInvoiceApproachingTimeoutAt(row);
  if (!timeoutAt) return "";
  return `该开票申请即将于${timeoutAt}超时`;
}

function getShopInvoiceOverdueTooltip(row) {
  const timeoutAt = getShopInvoiceApproachingTimeoutAt(row);
  if (!timeoutAt) return "";
  return `该开票申请已于${timeoutAt}超时`;
}

function isShopInvoiceApplicationModified(row) {
  if (!row) return false;

  const appliedAt = String(row.appliedAt || "").trim();
  const modifiedAt = String(row.modifiedAt || "").trim();
  if (!appliedAt || !modifiedAt || appliedAt === "-" || modifiedAt === "-") return false;

  return appliedAt !== modifiedAt;
}

function isShopInvoiceApplicationResubmitted(row) {
  return Boolean(row?.lastCanceledAt && row?.resubmittedAt);
}

function getShopInvoiceStatusExtraText(row) {
  if (!row) return "";

  if (row.invoiceStatus === "已驳回") {
    const rejectedAt = row.rejectedAt || (row.orderNo === "2026040411083345" ? "2026-04-11 15:01:02" : "-");
    const rejectReason = row.rejectReason || "-";
    return `【驳回日期：${rejectedAt}　　驳回原因：${rejectReason}】`;
  }

  if (row.invoiceStatus === "已撤销") {
    const canceledAt = row.canceledAt || (row.orderNo === "2026040517461208" ? "2026-04-12 12:20:02" : "-");
    return `【买家于${canceledAt}撤销了当前订单的开票申请】`;
  }

  return "";
}

function getShopInvoiceTypeExtraText(row) {
  if (!isShopInvoiceApplicationModified(row)) return "";
  const originalInvoiceType = row.originalInvoiceType || row.invoiceType || "-";
  return `【提示：买家已修改发票类型，原发票类型为“${originalInvoiceType}”；修改时间：${row.modifiedAt || "-"}】`;
}

function getShopInvoiceTitleExtraText(row) {
  if (!isShopInvoiceApplicationModified(row)) return "";
  const originalInvoiceTitle = row.originalInvoiceTitle || row.invoiceTitle || "-";
  return `【提示：买家已修改发票抬头，原发票抬头为“${originalInvoiceTitle}”；修改时间：${row.modifiedAt || "-"}】`;
}

function getShopInvoiceModifiedTooltip(row) {
  if (!isShopInvoiceApplicationModified(row)) return "";

  const changes = [];
  const originalInvoiceType = row.originalInvoiceType || row.invoiceType || "-";
  const currentInvoiceType = row.invoiceType || "-";
  const originalInvoiceTitle = row.originalInvoiceTitle || row.invoiceTitle || "-";
  const currentInvoiceTitle = row.invoiceTitle || "-";

  if (originalInvoiceTitle !== currentInvoiceTitle) {
    changes.push("发票抬头");
  }

  if (originalInvoiceType !== currentInvoiceType) {
    changes.unshift("发票类型");
  }

  const uniqueChanges = [...new Set(changes)];
  const changeSummary = uniqueChanges.length > 0 ? uniqueChanges.join("、") : "开票信息";
  return `修改内容：${changeSummary}\n修改时间：${row.modifiedAt || "-"}`;
}

function getShopInvoiceResubmittedTooltip(row) {
  if (!isShopInvoiceApplicationResubmitted(row)) return "";
  return `上次撤销时间：${row.lastCanceledAt || "-"}\n本次重提时间：${row.resubmittedAt || "-"}`;
}

function getShopInvoiceProductCategoryLabel(item) {
  const productText = String(item?.product || "").trim();
  if (!productText) return "其他";

  const categoryRules = [
    { keywords: ["饮品", "整箱", "茉沏"], label: "食品饮料" },
    { keywords: ["办公", "复印纸", "收纳", "托盘"], label: "办公用品" },
    { keywords: ["电子设备", "投屏器", "扩展坞", "显示器"], label: "电子设备" },
    { keywords: ["耳机"], label: "影音设备" },
    { keywords: ["电视"], label: "家用电器" },
    { keywords: ["空气净化器"], label: "生活电器" },
    { keywords: ["笔记本"], label: "电脑整机" },
    { keywords: ["工业设备", "设备固定支架"], label: "工业设备" },
    { keywords: ["维护工具", "工具包"], label: "工业耗材" },
    { keywords: ["标签打印机", "价签", "热敏纸"], label: "门店物料" },
    { keywords: ["陈列物料"], label: "营销物料" }
  ];

  const matchedRule = categoryRules.find((rule) => (
    rule.keywords.some((keyword) => productText.includes(keyword))
  ));
  return matchedRule?.label || productText;
}

function getShopInvoiceOrderCategorySummary(row) {
  const detail = createShopInvoiceOrderDetail(row);
  const categories = (detail?.items || [])
    .map((item) => getShopInvoiceProductCategoryLabel(item))
    .filter(Boolean);
  const uniqueCategories = [...new Set(categories)];
  return uniqueCategories.length > 0 ? uniqueCategories.join("、") : "-";
}

function exportShopInvoiceContentWorkbook(rows, invoiceContent) {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  const normalizedContent = invoiceContent || rows[0]?.invoiceContent || "商品类别";
  const exportRows = normalizedContent === "商品明细"
    ? rows.flatMap((row) => {
      const detail = createShopInvoiceOrderDetail(row);
      return (detail?.items || []).map((item) => ({
        订单号: row.orderNo,
        发票内容: normalizedContent,
        商品名称: item.product || "-",
        规格货号: item.spec || "-",
        单价: item.unitPrice || "-",
        数量: item.quantity || "-",
        小计: item.subtotal || "-",
        售后状态: item.afterSaleStatus || "-",
        售后金额: item.afterSaleAmount || "-"
      }));
    })
    : rows.map((row) => ({
      订单号: row.orderNo,
      发票内容: normalizedContent,
      商品类别: getShopInvoiceOrderCategorySummary(row),
      发票类型: row.invoiceType || "-",
      发票抬头: row.invoiceTitle || "-",
      纳税人识别号: row.taxpayerId || "-",
      申请开票金额: row.amount || "-",
      发票应开金额: row.shouldInvoiceAmount || "-",
      买家账号: row.buyerAccount || "-",
      闪购门店: String(row.store || "").replace("\n", " ")
    }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, normalizedContent === "商品明细" ? "商品明细" : "商品类别");
  XLSX.writeFile(workbook, `发票内容-${normalizedContent}-${rows.length}条.xlsx`);
  return true;
}

function exportBuyerPcMallPendingInvoiceWorkbook(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  const orderRows = rows.map((row) => ({
    订单号: row.orderNo || "-",
    订单状态: row.orderStatus || "-",
    订单总额: row.price || "-",
    售后状态: row.afterSaleStatus || "-",
    售后金额: row.afterSaleAmount || "-",
    支付时间: row.time || "-",
    付款方式: row.paymentMethod || "-",
    店铺名称: row.shop || "-",
    闪购门店: [row.store, row.storeId].filter(Boolean).join(" ") || "-",
    开票状态: row.status || "-"
  }));
  const detailRows = rows.flatMap((row) => {
    const detail = createBuyerPcMallInvoiceDetail({
      ...row,
      amount: row.price,
      appliedAt: row.time
    }, "applied");
    return (detail?.items || []).map((item, index) => ({
      订单号: row.orderNo || "-",
      商品名称: item.product || `${row.shop || "-"}订单商品`,
      商品ID: row.productId || `${row.orderNo || "-"}-${index + 1}`,
      规格: item.spec || row.spec || "-",
      规格ID: row.specId || `${row.orderNo || "-"}-S${index + 1}`,
      货号: row.skuNo || "-",
      "单价(元)\n(商品折扣/优惠前价格)": item.unitPrice || "-",
      购买数量: item.quantity || "1",
      "小计(元)\n(单价*数量)": item.subtotal || "-",
      "售后金额\n(售后中金额+已退款金额)": item.afterSaleAmount || row.afterSaleAmount || "-",
      售后状态: item.afterSaleStatus || row.afterSaleStatus || "-",
      申请售后数量: item.afterSaleCount || "0",
      实际售后数量: item.actualAfterSaleCount || "0",
      已发数量: item.shippedCount || "1"
    }));
  });

  const workbook = XLSX.utils.book_new();
  const orderWorksheet = XLSX.utils.json_to_sheet(orderRows);
  const detailWorksheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(workbook, orderWorksheet, "订单列表");
  XLSX.utils.book_append_sheet(workbook, detailWorksheet, "商品明细");
  XLSX.writeFile(workbook, `可申请开票导出-${rows.length}条.xlsx`);
  return true;
}

function exportBuyerPcMallAppliedInvoiceWorkbook(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  const orderRows = rows.map((row) => ({
    订单号: row.orderNo || "-",
    发票抬头: row.invoiceTitle || "-",
    发票类型: row.invoiceType || "-",
    申请开票金额: row.amount || "-",
    申请开票时间: row.appliedAt || "-",
    开票批次: row.invoiceBatch || "-",
    店铺名称: row.shop || "-",
    闪购门店: [row.store, row.storeId].filter(Boolean).join(" ") || "-",
    开票状态: row.status || "-"
  }));
  const detailRows = rows.flatMap((row) => {
    const detail = createBuyerPcMallInvoiceDetail(row, "applied");
    return (detail?.items || []).map((item, index) => ({
      订单号: row.orderNo || "-",
      商品名称: item.product || `${row.shop || "-"}订单商品`,
      商品ID: row.productId || `${row.orderNo || "-"}-${index + 1}`,
      规格: item.spec || row.spec || "-",
      规格ID: row.specId || `${row.orderNo || "-"}-S${index + 1}`,
      货号: row.skuNo || "-",
      "单价(元)\n(商品折扣/优惠前价格)": item.unitPrice || "-",
      购买数量: item.quantity || "1",
      "小计(元)\n(单价*数量)": item.subtotal || "-",
      "售后金额\n(售后中金额+已退款金额)": item.afterSaleAmount || row.afterSaleAmount || "-",
      售后状态: item.afterSaleStatus || row.afterSaleStatus || "-",
      申请售后数量: item.afterSaleCount || "0",
      实际售后数量: item.actualAfterSaleCount || "0",
      已发数量: item.shippedCount || "1"
    }));
  });

  const workbook = XLSX.utils.book_new();
  const orderWorksheet = XLSX.utils.json_to_sheet(orderRows);
  const detailWorksheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(workbook, orderWorksheet, "订单列表");
  XLSX.utils.book_append_sheet(workbook, detailWorksheet, "商品明细");
  XLSX.writeFile(workbook, `已申请开票导出-${rows.length}条.xlsx`);
  return true;
}

function exportBuyerPcMallInvoicedInvoiceWorkbook(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  const orderRows = rows.map((row) => ({
    订单号: row.orderNo || "-",
    发票抬头: row.invoiceTitle || "-",
    发票类型: row.invoiceType || "-",
    开票金额: row.amount || "-",
    开票批次: row.invoiceBatch || "-",
    店铺名称: row.shop || "-",
    闪购门店: [row.store, row.storeId].filter(Boolean).join(" ") || "-",
    发票号码: row.invoiceNo || "-",
    开票时间: row.invoicedAt || "-",
    开票状态: row.status || "-"
  }));
  const detailRows = rows.flatMap((row) => {
    const detail = createBuyerPcMallInvoiceDetail(row, "invoiced");
    return (detail?.items || []).map((item, index) => ({
      订单号: row.orderNo || "-",
      商品名称: item.product || `${row.shop || "-"}订单商品`,
      商品ID: row.productId || `${row.orderNo || "-"}-${index + 1}`,
      规格: item.spec || row.spec || "-",
      规格ID: row.specId || `${row.orderNo || "-"}-S${index + 1}`,
      货号: row.skuNo || "-",
      "单价(元)\n(商品折扣/优惠前价格)": item.unitPrice || "-",
      购买数量: item.quantity || "1",
      "小计(元)\n(单价*数量)": item.subtotal || "-",
      "售后金额\n(售后中金额+已退款金额)": item.afterSaleAmount || row.afterSaleAmount || "-",
      售后状态: item.afterSaleStatus || row.afterSaleStatus || "-",
      申请售后数量: item.afterSaleCount || "0",
      实际售后数量: item.actualAfterSaleCount || "0",
      已发数量: item.shippedCount || "1"
    }));
  });

  const workbook = XLSX.utils.book_new();
  const orderWorksheet = XLSX.utils.json_to_sheet(orderRows);
  const detailWorksheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(workbook, orderWorksheet, "订单列表");
  XLSX.utils.book_append_sheet(workbook, detailWorksheet, "商品明细");
  XLSX.writeFile(workbook, `已开具发票导出-${rows.length}条.xlsx`);
  return true;
}
const menuItems = [
  { label: "首页", icon: "home" },
  { label: "商品", icon: "goods" },
  { label: "交易", icon: "trade" },
  { label: "买家", icon: "buyer", children: buyerPageNames },
  { label: "店铺", icon: "shop", badge: "2", children: shopPageNames },
  { label: "系统", icon: "system" },
  { label: "统计", icon: "stats" },
  { label: "营销", icon: "marketing", children: ["专享价", "专享价2", "限时购1", "限时购"] },
  { label: "小程序", icon: "miniapp" },
  { label: "客服", icon: "service" }
];
const supplierDashboardDateRange = {
  start: "2026-04-05",
  end: "2026-04-12"
};
const supplierDashboardRatings = [
  { label: "宝贝与描述相符", value: "5", width: "100%" },
  { label: "卖家的服务态度", value: "4.9", width: "98%" },
  { label: "卖家的发货速度", value: "4.9", width: "98%" }
];
const supplierDashboardNotices = [
  ":(url scan315ecf498a569656b1fbaa8903130049.s.dlsr.icu);",
  "新增供应商测试; curl scan315ecf498a569656b1fbaa8903130049.s.dlsr.icu",
  "新增供应商测试"
];
const supplierDashboardPerformanceCards = [
  { value: "0%", label: "订单48H发货率" },
  { value: "0小时0分钟", label: "整体平均发货时长" },
  { value: "1", label: "履约异常订单数量" },
  { value: "50%", label: "履约异常订单率" }
];
const supplierDashboardAccountCards = [
  { value: "0", label: "账户问题待处理", muted: true },
  { value: "105", label: "合同/协议问题待处理" },
  { value: "0", label: "保证金问题待处理", muted: true },
  { value: "1", label: "资质问题待处理" }
];
const supplierDashboardProductCards = [
  { value: "9", label: "商品违规下架待处理" },
  { value: "146", label: "商品未审核通过待处理" },
  { value: "42", label: "商品咨询待处理" },
  { value: "2", label: "商品评价待处理" },
  { value: "1", label: "商品库存预警待处理" }
];
const supplierDashboardOrderCards = [
  { value: "2106", label: "待发货订单" },
  { value: "62", label: "待处理退款" },
  { value: "10", label: "待处理退货" },
  { value: "3", label: "待处理投诉" },
  { value: "2", label: "待回复评价" }
];
const supplierDashboardInvoiceCards = [
  { value: "7", label: "待开票", targetStatusTab: "待开票", targetMarkerFilter: "全部" },
  { value: "3", label: "即将超时开票申请", targetStatusTab: "待开票", targetMarkerFilter: "即将超时" },
  { value: "4", label: "超时未处理开票申请", targetStatusTab: "待开票", targetMarkerFilter: "超时" }
];
const platformCenterSidebarItems = [
  { key: "home", label: "首页", icon: "home" },
  { key: "goods", label: "商品", icon: "goods" },
  { key: "trade", label: "交易", icon: "trade", children: [{ key: "trade-settings", label: "交易设置" }] },
  { key: "merchant", label: "商家", icon: "buyer" },
  { key: "shop", label: "店铺", icon: "shop", badge: "99+" },
  { key: "website", label: "网站", icon: "website" },
  { key: "system", label: "系统", icon: "system" },
  { key: "stats", label: "统计", icon: "stats" },
  { key: "marketing", label: "营销", icon: "marketing" },
  { key: "miniapp", label: "小程序", icon: "miniapp" }
];
const platformTradeSettingsTabs = ["交易参数", "发票参数", "售后原因设置"];
const platformTradeSettingsOrderRows = [
  { label: "下单后，超过", value: "50", suffix: "小时未付款，订单关闭", hint: "自动取消订单，订单状态从待付款变为已关闭" },
  { label: "发货后，超过", value: "1", suffix: "天未收货，订单自动完成", hint: "自动确认收货，订单状态从待收货变为已完成" },
  { label: "发货后，订单自动完成前", value: "1", suffix: "天可申请延长收货，一次可延长", extraValue: "1", extraSuffix: "天" },
  { label: "收货后，超过", value: "1", suffix: "天未评价，关闭评价通道", hint: "评价通道关闭后用户可发起追加评论" },
  { label: "发货超时时间：订单付款", value: "48", suffix: "小时后供应商未发货", hint: "供应商首页弹窗提示超时未发货订单数" },
  { label: "订单支付金额达到", value: "1.00", suffix: "元时，PC端订单支付页面显示企业网银支付方式，仅近付渠道支付的订单才生效" }
];
const platformTradeSettingsAfterSaleRows = [
  { label: "提交申请后供应商逾期", value: "1", suffix: "天未处理，流程自动进入下一环节", hint: "供应商逾期未处理，视为同意售后" },
  { label: "退货申请买家逾期", value: "1", suffix: "天未寄货，自动关闭退货流程环节", hint: "买家逾期未寄货，视为放弃售后申请" },
  { label: "买家寄货后供应商逾期", value: "1", suffix: "天未处理，流程自动进入下一环节", hint: "供应商逾期未处理，视为同意售后，等待平台确认退款" }
];
const platformTradeSettingsInvoiceRows = [
  { label: "订单开票申请超过", value: "5", suffix: "天未处理，卖家端生成超时未开票提醒", hint: "订单完成后开始计时" },
  { label: "开票申请超时前", value: "1", suffix: "天，提醒卖家开票即将超时" }
];
const platformCenterSummaryCards = [
  { title: "今日有效销售总额", value: "0", tone: "blue", icon: "summary-sales" },
  { title: "今日商家新增数", value: "1", tone: "yellow", icon: "summary-merchant" },
  { title: "今日店铺新增数", value: "1", tone: "gold", icon: "summary-store" }
];
const platformCenterPendingSections = [
  {
    title: "商品待办事项",
    items: [
      { value: "1576", label: "商品待审核" },
      { value: "74", label: "品牌待审核" }
    ]
  },
  {
    title: "店铺入驻",
    items: [
      { value: "3", label: "入驻待审核" }
    ]
  },
  {
    title: "交易待办",
    items: [
      { value: "1", label: "待仲裁" },
      { value: "193", label: "待退货" }
    ]
  },
  {
    title: "营销活动",
    items: [
      { value: "0", label: "卖家限时购待审核", muted: true }
    ]
  }
];
const platformCenterAnalyticsCards = [
  {
    title: "店铺",
    value: "4,982",
    unit: "个",
    stats: ["今日新增: 1", "昨日新增: 5", "待审核: 3"],
    chart: "line-warm"
  },
  {
    title: "商品",
    value: "91,113",
    unit: "件",
    stats: ["销售中: 62750", "待审核: 1576", "商品咨询: 362", "商品评价: 289961"],
    chart: "bar-lilac"
  },
  {
    title: "交易",
    value: "458,618",
    unit: "笔",
    stats: ["待付款: 6", "待发货: 9865", "退款: 532", "退货: 193"],
    chart: "line-cyan"
  }
];
const supplierAdminViewStorageKey = "supplier-admin-view-state";
const buyerPcMallViewStorageKey = "buyer-pc-mall-view-state";

function readStoredJson(key, fallbackValue) {
  if (typeof window === "undefined") return fallbackValue;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallbackValue;
    return { ...fallbackValue, ...JSON.parse(rawValue) };
  } catch (error) {
    return fallbackValue;
  }
}

function writeStoredJson(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage write failures so the UI still works normally.
  }
}

const statuses = ["全部", "未开始", "进行中", "已结束"];
const activityCategories = ["常规活动", "节日活动", "品牌活动"];
const productCategories = ["饮料酒水", "休闲食品", "日化用品"];

const marketingPageNames = ["专享价", "专享价2", "限时购1", "限时购"];
const buyerAccountTypes = ["总部账号", "授权账号", "子账号", "自主认证账号", "默认账号"];
const buyerGroups = [
  { id: "1", name: "北京分组" },
  { id: "2", name: "黑龙江分组" },
  { id: "3", name: "四川分组" }
];
const buyerGroupNameById = buyerGroups.reduce((result, item) => {
  result[item.id] = item.name;
  return result;
}, {});
const buyerSeedRows = [
  { id: "18166", account: "Shawnee003", accountType: "总部账号", identity: "", group: "1", discount: "", createdAt: "2026-03-16 14:41:24", status: "正常" },
  { id: "19346", account: "tianxuekui", accountType: "授权账号", identity: "", group: "2", discount: "", createdAt: "2026-03-11 17:16:23", status: "正常" },
  { id: "13641", account: "NFSQ369", accountType: "子账号", identity: "", group: "3", discount: "", createdAt: "2026-02-09 15:02:06", status: "正常" },
  { id: "19069", account: "lgq01", accountType: "默认账号", identity: "", group: "", discount: "", createdAt: "2026-01-28 15:19:21", status: "正常" }
];
const buyerGroupOptions = buyerGroups;
const initialBuyerFilters = { id: "", account: "", accountType: "", identity: "" };
const initialNewBuyerForm = { buyerIds: "", group: "", discount: "" };
const partialBuyerDiscountPattern = /^(\d{0,2}(\.\d{0,2})?)?$/;
const finalBuyerDiscountPattern = /^(5(\.\d{1,2})?|[6-9](\.\d{1,2})?|10(\.0{1,2})?|10)$/;
const createSpecialPriceSeedActivities = () => ([
  { id: "844", name: "四川分组专享价", buyerGroup: "四川分组", buyerId: "-", goodsCount: 1, startTime: "2026-04-10 00:00:00", endTime: "2026-04-12 23:59:59", status: "未开始", actions: ["查看", "提前结束", "编辑", "复制"] },
  { id: "843", name: "北京分组买家专享价", buyerGroup: "四川分组", buyerId: "2083059433", goodsCount: 3, startTime: "2026-04-09 00:00:00", endTime: "2026-04-30 23:59:59", status: "进行中", actions: ["查看", "提前结束", "编辑", "复制"] },
  { id: "829", name: "鼠标【有多规格，无阶梯价】", buyerGroup: "四川分组", buyerId: "-", goodsCount: 8, startTime: "2026-03-18 00:00:00", endTime: "2026-03-20 23:59:59", status: "已结束", actions: ["查看", "复制"] },
  { id: "828", name: "2083059433", buyerGroup: "四川分组", buyerId: "2083059433", goodsCount: 125, goodsFlag: "部分已失效", startTime: "2026-03-18 00:00:00", endTime: "2026-03-20 23:59:59", status: "已结束", actions: ["查看", "复制"] }
]);
const seedActivitiesByPage = {
  专享价: createSpecialPriceSeedActivities(),
  专享价2: createSpecialPriceSeedActivities(),
  限时购1: [
    { id: "1111", name: "双11限时购1活动", goodsCount: 12, startTime: "2026-11-01 00:00:00", endTime: "2026-11-11 23:59:59", status: "未开始", actions: ["查看", "编辑", "提前结束"] },
    { id: "0001", name: "国庆节限时购1活动", goodsCount: 2, startTime: "2026-10-01 00:00:00", endTime: "2026-10-08 23:59:59", status: "未开始", actions: ["查看", "编辑", "提前结束"] },
    { id: "0011", name: "普通限时购1活动", goodsCount: 30, startTime: "2026-03-01 00:00:00", endTime: "2026-04-20 23:59:59", status: "进行中", actions: ["查看", "编辑", "提前结束", "复制链接"] },
    { id: "0012", name: "元旦节限时购1活动", goodsCount: 6, startTime: "2026-01-01 00:00:00", endTime: "2026-01-01 23:59:59", status: "已结束", actions: ["查看"] }
  ],
  限时购: [
    { id: "2101", name: "春季限时购活动", goodsCount: 8, startTime: "2026-04-01 00:00:00", endTime: "2026-04-30 23:59:59", status: "进行中", actions: ["查看", "编辑", "提前结束", "复制链接"] },
    { id: "2102", name: "五一限时购活动", goodsCount: 15, startTime: "2026-05-01 00:00:00", endTime: "2026-05-05 23:59:59", status: "未开始", actions: ["查看", "编辑", "提前结束"] },
    { id: "2103", name: "清仓限时购活动", goodsCount: 5, startTime: "2026-02-01 00:00:00", endTime: "2026-02-10 23:59:59", status: "已结束", actions: ["查看"] }
  ]
};

const pickerRows = [
  { id: "123456", name: "百岁山天然矿泉水570m", stock: 319, marketPrice: "￥30~50", specCount: 6, image: "百" },
  { id: "162101", name: "景田饮用纯净水560ml", stock: 1633, marketPrice: "￥100", specCount: 1, image: "景" }
];
const buyerPcMallOrderTabKeys = ["可申请开票", "已申请开票", "已开具发票"];
const buyerPcMallSidebarGroups = [
  { title: "商家中心" },
  { title: "订单中心", items: ["我的订单", "咨询管理", "评价管理", "采购统计"] },
  { title: "资产中心", items: ["我的优惠券"] },
  { title: "我的关注", items: ["商品关注", "店铺关注", "常购清单"] },
  { title: "售后服务", items: ["退款退货", "投诉维权", "平台客服"] },
  { title: "账户管理", items: ["收货地址管理", "发票管理", "个人信息", "账户安全管理", "身份认证"], activeItem: "发票管理" }
];
const buyerPcMallInvoiceTitleRows = [
  {
    id: "title-1",
    title: "zd增值税专用发票抬头",
    invoiceType: "电子增值税专用发票",
    invoiceTypeTone: "blue",
    titleType: "企业",
    taxpayerId: "1331132342134",
    registeredAddress: "湖南省长沙市芙蓉区朝阳街道湖南大剧院",
    phone: "13800000002",
    bank: "中国营业",
    bankAccount: "88888888888",
    storeBindings: [
      { id: "1902567", name: "总部日用品连锁营业执照纸质签约客户12421754_快送_供应链自动化建店" },
      { id: "1902771", name: "总部商超连锁护照电子签约客户12421769_商家自配_供应链自动化建店" }
    ],
    isDefault: true
  },
  {
    id: "title-2",
    title: "朱达的发票抬头",
    invoiceType: "电子普通发票",
    invoiceTypeTone: "purple",
    titleType: "个人",
    taxpayerId: "",
    registeredAddress: "",
    phone: "",
    bank: "",
    bankAccount: "",
    storeBindings: [
      { id: "604559", name: "配送移动端众包商家_陈苏懿702" }
    ],
    isDefault: false
  },
  {
    id: "title-3",
    title: "企业01",
    invoiceType: "电子普通发票",
    invoiceTypeTone: "purple",
    titleType: "企业",
    taxpayerId: "33126",
    registeredAddress: "",
    phone: "",
    bank: "",
    bankAccount: "",
    storeBindings: [
      { id: "601603", name: "IoT加盟测试自动化商家勿动_张琼2" }
    ],
    isDefault: false
  },
  {
    id: "title-4",
    title: "YMbgmkeW8NzoZliBHEAwChSVcJ)--",
    invoiceType: "电子增值税专用发票",
    invoiceTypeTone: "blue",
    titleType: "企业",
    taxpayerId: "666666666666666",
    registeredAddress: "湖南省长沙市芙蓉区朝阳街道湖南大剧院",
    phone: "13800000002",
    bank: "中国营业",
    bankAccount: "88888888888",
    storeBindings: [
      { id: "2232453", name: "入驻测试门店闭店撰写班仔-供应链自动化_上单建店" }
    ],
    isDefault: false
  }
];
const buyerPcMallInvoiceRows = [
  { orderNo: "20260212022895768", product: "小米13 Pro 5G手机", spec: "12GB+256GB 陶瓷黑", price: "¥5,299.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-05-28 14:30", shop: "胖子炒货", store: "北京朝阳门店", storeId: "(102325)", status: "待申请", productTone: "phone", paymentMethod: "先货后款", orderStatus: "已完成" },
  { orderNo: "20260212022895769", product: "索尼 WH-1000XM5 耳机", spec: "黑色 降噪版", price: "¥2,499.00", afterSaleStatus: "待供应商审核", afterSaleAmount: "¥0.00", time: "2023-06-15 09:45", shop: "老百姓大药房", store: "北京朝阳门店", storeId: "(102325)", status: "待申请", productTone: "earphone", paymentMethod: "先货后款", orderStatus: "待收货" },
  { orderNo: "20260212022895770", product: "美的破壁料理机", spec: "MJ-BL1543A 1.75L", price: "¥899.00", afterSaleStatus: "退款中", afterSaleAmount: "¥899.00", time: "2023-07-02 16:20", shop: "老百姓大药房", store: "成都晨曦路门店", storeId: "(064151)", status: "已驳回", extraStatus: "查看", rejectedAt: "2023-07-03 10:26", rejectReason: "订单存在售后退款处理中，请待售后完成后重新申请开票。", productTone: "appliance", paymentMethod: "先货后款", orderStatus: "已完成" },
  { orderNo: "20260212022895771", product: "海信 75E3F 75英寸电视", spec: "4K超高清 智能语音", price: "¥4,999.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-07-18 11:15", shop: "老百姓大药房", store: "成都晨曦路门店", storeId: "(064151)", status: "已驳回", extraStatus: "查看", rejectedAt: "2023-07-19 09:12", rejectReason: "抬头信息与订单主体不一致，请核对后重新提交。", productTone: "tv", paymentMethod: "先货后款", orderStatus: "已完成" },
  { orderNo: "20260212022895772", product: "米家空气净化器Pro H", spec: "AC-M7-SC 除甲醛", price: "¥1,699.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-08-05 13:50", shop: "小米有品", store: "北京朝阳门店", storeId: "(102325)", status: "待申请", productTone: "purifier", paymentMethod: "先货后款", orderStatus: "待发货", applyDisabledReason: "未结算的先货后款订单不允许申请开票" },
  { orderNo: "20260212022895773", product: "联想 ThinkBook 14 笔记本", spec: "i5 16GB+512GB", price: "¥4,599.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-08-11 10:20", shop: "办公优选", store: "北京朝阳门店", storeId: "(102325)", status: "待申请", productTone: "laptop", paymentMethod: "先款后货", orderStatus: "待发货" },
  { orderNo: "20260212022895774", product: "格力云逸空调", spec: "1.5匹 新一级能效", price: "¥3,299.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-08-14 15:08", shop: "格力官方旗舰店", store: "成都晨曦路门店", storeId: "(064151)", status: "待申请", productTone: "appliance", paymentMethod: "先款后货", orderStatus: "待收货" },
  { orderNo: "20260212022895775", product: "华为 MatePad Air", spec: "12GB+256GB 羽砂白", price: "¥2,899.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-08-20 09:32", shop: "华为企业购", store: "北京朝阳门店", storeId: "(102325)", status: "待申请", productTone: "phone", paymentMethod: "先款后货", orderStatus: "已完成" },
  { orderNo: "20260212022895776", product: "飞利浦商用显示器", spec: "27英寸 4K", price: "¥2,260.00", afterSaleStatus: "退款中", afterSaleAmount: "¥300.00", time: "2023-08-25 11:46", shop: "显示设备专营店", store: "成都晨曦路门店", storeId: "(064151)", status: "已驳回", extraStatus: "查看", rejectedAt: "2023-08-26 13:20", rejectReason: "订单存在部分退款，请确认最终开票金额后重新申请。", productTone: "tv", paymentMethod: "先款后货", orderStatus: "待收货" },
  { orderNo: "20260212022895777", product: "戴森 V12 Detect Slim", spec: "轻量无线款", price: "¥4,280.00", afterSaleStatus: "-", afterSaleAmount: "¥0.00", time: "2023-08-30 16:12", shop: "品质生活馆", store: "北京朝阳门店", storeId: "(102325)", status: "已撤销", productTone: "appliance", paymentMethod: "先款后货", orderStatus: "已完成" }
];
const buyerPcMallInvoiceAfterSaleStatusSeed = {
  "20260212022895769": ["售后中"],
  "20260212022895770": ["部分售后完成"],
  "20260212022895776": ["售后关闭"]
};

function getBuyerPcMallInvoiceOrderAfterSaleStatuses(row) {
  const seededStatuses = buyerPcMallInvoiceAfterSaleStatusSeed[row?.orderNo];
  if (Array.isArray(seededStatuses) && seededStatuses.length > 0) {
    return seededStatuses;
  }

  return [row?.afterSaleStatusDetail, row?.afterSaleStatus]
    .map((status) => String(status || "").trim())
    .filter((status) => status && status !== "-");
}

function getBuyerPcMallInvoiceAfterSaleViewTooltip(row) {
  const statuses = getBuyerPcMallInvoiceOrderAfterSaleStatuses(row);
  if (statuses.length === 0) return "";

  const inProgressCount = statuses.filter((status) => (
    status === "售后中" || shopInvoiceAfterSaleInProgressStatuses.includes(status)
  )).length;
  return `该笔订单共${statuses.length}种商品申请售后，当前剩余${inProgressCount}种处于售后中`;
}

function normalizeBuyerPcMallInvoiceRow(row) {
  const detailStatuses = getBuyerPcMallInvoiceOrderAfterSaleStatuses(row);
  const afterSaleSummary = getShopInvoiceOrderAfterSaleSummary(detailStatuses);
  const normalizedAfterSaleStatus = afterSaleSummary.afterSaleStatus === "退款成功" || afterSaleSummary.afterSaleStatus === "部分售后完成"
    ? "部分退款"
    : afterSaleSummary.afterSaleStatus;

  return {
    ...row,
    afterSaleStatus: normalizedAfterSaleStatus,
    afterSaleStatusDetail: detailStatuses.length > 0 ? detailStatuses.join("、") : "-",
    hasPendingSupplierReview: detailStatuses.includes("待供应商审核")
  };
}

const normalizedBuyerPcMallInvoiceRows = buyerPcMallInvoiceRows.map(normalizeBuyerPcMallInvoiceRow);
const buyerPcMallAppliedInvoiceRows = [
  { orderNo: "202306150010002", invoiceTitle: "北京科技有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥12,568.00", appliedAt: "2023-06-15 14:30", shop: "北京科技有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-001", status: "已申请" },
  { orderNo: "202306100020003", invoiceTitle: "上海浦东门店", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥8,420.00", appliedAt: "2023-06-10 10:15", shop: "上海贸易有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-001", status: "已申请" },
  { orderNo: "202306050030001", invoiceTitle: "广州天河门店", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥3,150.00", appliedAt: "2023-06-05 16:45", shop: "广州科技股份有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-002", status: "已申请" },
  { orderNo: "202305280040005", invoiceTitle: "深圳南山门店", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥6,780.00", appliedAt: "2023-05-28 09:20", shop: "深圳电子有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-003", status: "已申请" },
  { orderNo: "202305200050006", invoiceTitle: "杭州西湖门店", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥4,250.00", appliedAt: "2023-05-20 13:10", shop: "杭州服饰有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-004", status: "已申请" },
  { orderNo: "202305150060007", invoiceTitle: "苏州工业设备有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥7,680.00", appliedAt: "2023-05-15 10:26", shop: "苏州工业设备有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-007", status: "已申请" },
  { orderNo: "202305110070008", invoiceTitle: "华东数智供应链有限公司", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥1,860.00", appliedAt: "2023-05-11 17:08", shop: "华东办公商城", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-008", status: "已申请" },
  { orderNo: "202305080080009", invoiceTitle: "成都锦行商贸有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥9,240.00", appliedAt: "2023-05-08 09:42", shop: "成都锦行商贸有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-009", status: "已申请" },
  { orderNo: "202305030090010", invoiceTitle: "宁波云采贸易有限公司", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥2,430.00", appliedAt: "2023-05-03 15:20", shop: "宁波云采贸易有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-010", status: "已申请" },
  { orderNo: "202304290100011", invoiceTitle: "华南集采运营有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥5,970.00", appliedAt: "2023-04-29 11:58", shop: "华南集采运营有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-011", status: "已申请" }
];
const buyerPcMallInvoicedInvoiceRows = [
  { orderNo: "202305010010002", invoiceTitle: "北京科技有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥12,568.00", shop: "上海电子设备有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-001", invoiceNo: "20230501010003", invoicedAt: "2023-05-01", status: "已开票" },
  { orderNo: "202304280010001", invoiceTitle: "个人（张伟）", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥5,280.00", shop: "广州数码科技有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-001", invoiceNo: "20230428010015", invoicedAt: "2023-04-28", status: "已开票" },
  { orderNo: "202304150010003", invoiceTitle: "深圳贸易有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥8,960.00", shop: "杭州电器公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-002", invoiceNo: "20230415011562", invoicedAt: "2023-04-15", status: "已开票" },
  { orderNo: "202304010010004", invoiceTitle: "个人（李娜）", invoiceType: "增值税普通发票", invoiceTypeTone: "purple", amount: "¥3,240.00", shop: "南京家居用品有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-005", invoiceNo: "20230401012321", invoicedAt: "2023-04-01", status: "已开票" },
  { orderNo: "202303250010005", invoiceTitle: "成都科技有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥15,780.00", shop: "武汉电子科技有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-006", invoiceNo: "20230325010023", invoicedAt: "2023-03-25", status: "已开票" },
  { orderNo: "202303200010006", invoiceTitle: "苏州品越设备有限公司", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥1,560.00", shop: "苏州设备专营店", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-012", invoiceNo: "20230320010028", invoicedAt: "2023-03-20", status: "已开票" },
  { orderNo: "202303150010007", invoiceTitle: "华东数智供应链有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥6,320.00", shop: "华东办公商城", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-013", invoiceNo: "20230315010031", invoicedAt: "2023-03-15", status: "已开票" },
  { orderNo: "202303100010008", invoiceTitle: "宁波云采贸易有限公司", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥2,180.00", shop: "宁波云采贸易有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-014", invoiceNo: "20230310010042", invoicedAt: "2023-03-10", status: "已开票" },
  { orderNo: "202303050010009", invoiceTitle: "华南集采运营有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥9,860.00", shop: "华南集采运营有限公司", store: "北京朝阳门店", storeId: "(102325)", invoiceBatch: "KP202604-015", invoiceNo: "20230305010057", invoicedAt: "2023-03-05", status: "已开票" },
  { orderNo: "202303010010010", invoiceTitle: "杭州西湖门店", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥4,680.00", shop: "杭州服饰有限公司", store: "成都晨曦路门店", storeId: "(064151)", invoiceBatch: "KP202604-016", invoiceNo: "20230301010063", invoicedAt: "2023-03-01", status: "已开票" }
];
const buyerPcMallProductDetailSeed = {
  "20260212022895768": [
    { sku: "XM13P-12-256-BLK", product: "小米13 Pro 5G手机", spec: "12GB+256GB 陶瓷黑", quantity: "1", unitPrice: "¥5,299.00", subtotal: "¥5,299.00" }
  ],
  "20260212022895769": [
    { sku: "SONY-XM5-BLK", product: "索尼 WH-1000XM5 耳机", spec: "黑色 降噪版", quantity: "1", unitPrice: "¥2,499.00", subtotal: "¥2,499.00" }
  ],
  "20260212022895770": [
    { sku: "MIDEA-BL1543A", product: "美的破壁料理机", spec: "MJ-BL1543A 1.75L", quantity: "1", unitPrice: "¥899.00", subtotal: "¥899.00" }
  ],
  "20260212022895771": [
    { sku: "HISENSE-75E3F", product: "海信 75E3F 75英寸电视", spec: "4K超高清 智能语音", quantity: "1", unitPrice: "¥4,999.00", subtotal: "¥4,999.00" }
  ],
  "20260212022895772": [
    { sku: "MI-PROH-ACM7", product: "米家空气净化器Pro H", spec: "AC-M7-SC 除甲醛", quantity: "1", unitPrice: "¥1,699.00", subtotal: "¥1,699.00" }
  ]
};
const shopInvoiceManagementRows = [
  {
    orderNo: "2026040119104267",
    invoiceType: "电子增值税专用发票",
    invoiceTitle: "湖南海商科技有限公司",
    taxpayerId: "102324565122210",
    orderStatus: "已完成",
    orderAmount: "¥2760.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥2760.00",
    shouldInvoiceAmount: "¥2760.00",
    invoiceAmountWithTax: "¥2760.00",
    buyerAccount: "sakuraA (ID:19556)",
    paymentMethod: "先货后款",
    store: "闪电帮帮门店\n(ID:2232453)",
    paidAt: "2026-04-01 19:27:31",
    appliedAt: "2026-04-01 19:35:18",
    modifiedAt: "2026-04-01 19:35:18",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-06 15:11:00",
    invoiceNo: "13216486611",
    invoiceRemark: "4月9日我提交了一批开票申请，请帮我合并开票；【是否需要单开：否】",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "售后关闭",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040315224679",
    invoiceType: "电子增值税专用发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "深圳广联科技有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91440300111222333P",
    orderStatus: "已完成",
    orderAmount: "¥4599.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥4599.00",
    shouldInvoiceAmount: "¥4599.00",
    invoiceAmountWithTax: "¥4599.00",
    buyerAccount: "techmall (ID:20773)",
    paymentMethod: "先货后款",
    store: "南山闪购店\n(ID:2232512)",
    paidAt: "2026-04-03 15:22:46",
    appliedAt: "2026-04-03 16:05:11",
    modifiedAt: "2026-04-04 09:18:45",
    lastCanceledAt: "2026-04-03 18:12:06",
    resubmittedAt: "2026-04-04 09:18:45",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "手动",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026040411083345",
    invoiceType: "电子普通发票",
    originalInvoiceType: "电子增值税专用发票",
    invoiceTitle: "杭州优选商贸有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91330100666777888L",
    orderStatus: "待收货",
    orderAmount: "¥699.00",
    afterSaleStatus: "退款中",
    afterSaleAmount: "¥699.00",
    amount: "¥699.00",
    shouldInvoiceAmount: "¥699.00",
    invoiceAmountWithTax: "¥699.00",
    buyerAccount: "hz-select (ID:19824)",
    paymentMethod: "先货后款",
    store: "西湖闪购店\n(ID:2232599)",
    paidAt: "2026-04-04 11:08:33",
    appliedAt: "2026-04-04 11:45:26",
    modifiedAt: "2026-04-05 08:30:12",
    applicationStatus: "已驳回",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "系统",
    invoiceStatus: "已驳回",
    invoiceStatusTone: "danger",
    rejectedAt: "2026-04-11 15:01:02",
    rejectReason: "订单存在退款处理中记录，请待售后完成后重新申请开票。",
    afterSaleStatusDetail: "售后审核中",
    afterSaleExpired: "否",
    actions: ["发票详情"]
  },
  {
    orderNo: "2026040517461208",
    invoiceType: "电子普通发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "苏州工业设备有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91320500777888999M",
    orderStatus: "已完成",
    orderAmount: "¥980.00",
    afterSaleStatus: "售后关闭",
    afterSaleAmount: "¥0.00",
    amount: "¥980.00",
    shouldInvoiceAmount: "¥980.00",
    invoiceAmountWithTax: "¥980.00",
    buyerAccount: "szfactory (ID:20164)",
    paymentMethod: "先货后款",
    store: "园区闪购店\n(ID:2232641)",
    paidAt: "2026-04-05 17:46:12",
    appliedAt: "2026-04-05 18:03:45",
    modifiedAt: "2026-04-05 18:25:10",
    applicationStatus: "已撤销",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "系统",
    invoiceStatus: "已撤销",
    invoiceStatusTone: "muted",
    canceledAt: "2026-04-12 12:20:02",
    afterSaleStatusDetail: "售后关闭",
    afterSaleExpired: "否",
    actions: ["发票详情"]
  },
  {
    orderNo: "2026040612053401",
    invoiceType: "电子增值税专用发票",
    invoiceTitle: "华东数智供应链有限公司",
    taxpayerId: "91310115MA1K202601",
    orderStatus: "已完成",
    orderAmount: "¥1380.00",
    afterSaleStatus: "部分售后完成",
    afterSaleAmount: "¥680.00",
    amount: "¥1380.00",
    shouldInvoiceAmount: "¥1380.00",
    invoiceAmountWithTax: "¥1380.00",
    buyerAccount: "eastlink (ID:20891)",
    paymentMethod: "先货后款",
    store: "虹桥闪购店\n(ID:2232701)",
    paidAt: "2026-04-06 12:05:34",
    appliedAt: "2026-04-06 12:18:09",
    modifiedAt: "2026-04-06 12:18:09",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-07 09:16:00",
    invoiceNo: "13216486612",
    invoiceRemark: "请与同门店订单统一归档。",
    approachingTimeoutAt: "2026-04-11 12:18:09",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "部分售后完成",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040613485722",
    invoiceType: "电子增值税专用发票",
    invoiceTitle: "华东数智供应链有限公司",
    taxpayerId: "91310115MA1K202601",
    orderStatus: "已完成",
    orderAmount: "¥2260.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥2260.00",
    shouldInvoiceAmount: "¥2260.00",
    invoiceAmountWithTax: "¥2260.00",
    buyerAccount: "eastlink (ID:20891)",
    paymentMethod: "先货后款",
    store: "虹桥闪购店\n(ID:2232701)",
    paidAt: "2026-04-06 13:48:57",
    appliedAt: "2026-04-06 14:02:31",
    modifiedAt: "2026-04-06 14:02:31",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-07 09:20:00",
    invoiceNo: "13216486613",
    invoiceRemark: "请与同门店订单统一归档。",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040710152846",
    invoiceType: "电子增值税专用发票",
    invoiceTitle: "华东数智供应链有限公司",
    taxpayerId: "91310115MA1K202601",
    orderStatus: "已完成",
    orderAmount: "¥3199.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥3199.00",
    shouldInvoiceAmount: "¥3199.00",
    invoiceAmountWithTax: "¥3199.00",
    buyerAccount: "eastlink (ID:20891)",
    paymentMethod: "先货后款",
    store: "虹桥闪购店\n(ID:2232701)",
    paidAt: "2026-04-07 10:15:28",
    appliedAt: "2026-04-07 10:40:15",
    modifiedAt: "2026-04-07 10:40:15",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-08 11:06:00",
    invoiceNo: "13216486614",
    invoiceRemark: "请与同门店订单统一归档。",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040716524309",
    invoiceType: "电子普通发票",
    invoiceTitle: "宁波云采贸易有限公司",
    taxpayerId: "91330201MA2E202602",
    orderStatus: "已完成",
    orderAmount: "¥880.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥880.00",
    shouldInvoiceAmount: "¥880.00",
    invoiceAmountWithTax: "¥880.00",
    buyerAccount: "nb-trade (ID:21105)",
    paymentMethod: "先货后款",
    store: "鄞州闪购店\n(ID:2232715)",
    paidAt: "2026-04-07 16:52:43",
    appliedAt: "2026-04-07 17:03:20",
    modifiedAt: "2026-04-07 17:03:20",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-09 10:28:00",
    invoiceNo: "13216486615",
    invoiceRemark: "普通发票电子版发送至采购邮箱。",
    invoiceMethod: "系统",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040811241975",
    invoiceType: "电子普通发票",
    invoiceTitle: "苏州品越设备有限公司",
    taxpayerId: "91320594MA3C202603",
    orderStatus: "已完成",
    orderAmount: "¥1560.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥1560.00",
    shouldInvoiceAmount: "¥1560.00",
    invoiceAmountWithTax: "¥1560.00",
    buyerAccount: "suzhou-py (ID:21286)",
    paymentMethod: "先款后货",
    store: "工业园闪购店\n(ID:2232738)",
    paidAt: "2026-04-08 11:24:19",
    appliedAt: "2026-04-08 11:36:42",
    modifiedAt: "2026-04-08 11:36:42",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-09 14:10:00",
    invoiceNo: "13216486616",
    invoiceRemark: "请保留设备类采购备注。",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040814382551",
    invoiceType: "电子增值税专用发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "华南集采运营有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91440300MA5G202604",
    orderStatus: "已完成",
    orderAmount: "¥1880.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥1880.00",
    shouldInvoiceAmount: "¥1880.00",
    invoiceAmountWithTax: "¥1880.00",
    buyerAccount: "hn-jicai (ID:21317)",
    paymentMethod: "先款后货",
    store: "福田闪购店\n(ID:2232750)",
    paidAt: "2026-04-08 14:38:25",
    appliedAt: "2026-04-08 15:01:08",
    modifiedAt: "2026-04-08 15:22:10",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "手动",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026040816024198",
    invoiceType: "电子增值税专用发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "华南集采运营有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91440300MA5G202604",
    orderStatus: "已完成",
    orderAmount: "¥2450.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥2450.00",
    shouldInvoiceAmount: "¥2450.00",
    invoiceAmountWithTax: "¥2450.00",
    buyerAccount: "hn-jicai (ID:21317)",
    paymentMethod: "先款后货",
    store: "福田闪购店\n(ID:2232750)",
    paidAt: "2026-04-08 16:02:41",
    appliedAt: "2026-04-08 16:15:39",
    modifiedAt: "2026-04-08 16:31:22",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "手动",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026040909231674",
    invoiceType: "电子增值税专用发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "华南集采运营有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91440300MA5G202604",
    orderStatus: "已完成",
    orderAmount: "¥3270.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥3270.00",
    shouldInvoiceAmount: "¥3270.00",
    invoiceAmountWithTax: "¥3270.00",
    buyerAccount: "hn-jicai (ID:21317)",
    paymentMethod: "先款后货",
    store: "福田闪购店\n(ID:2232750)",
    paidAt: "2026-04-11 09:23:16",
    appliedAt: "2026-04-11 09:36:55",
    modifiedAt: "2026-04-11 09:55:08",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "手动",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026040914175826",
    invoiceType: "电子普通发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "成都锦行商贸有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91510100MA6F202605",
    orderStatus: "已完成",
    orderAmount: "¥760.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥760.00",
    shouldInvoiceAmount: "¥760.00",
    invoiceAmountWithTax: "¥760.00",
    buyerAccount: "cd-jx (ID:21420)",
    paymentMethod: "先款后货",
    store: "高新闪购店\n(ID:2232766)",
    paidAt: "2026-04-11 14:17:58",
    appliedAt: "2026-04-11 14:28:17",
    modifiedAt: "2026-04-11 14:28:17",
    lastCanceledAt: "2026-04-09 16:40:33",
    resubmittedAt: "2026-04-10 15:26:48",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "系统",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026041014582635",
    invoiceType: "电子增值税专用发票",
    originalInvoiceType: "电子增值税专用发票",
    invoiceTitle: "成都锦行商贸有限公司",
    originalInvoiceTitle: "成都锦行商贸有限公司",
    taxpayerId: "91510100MA6F202605",
    orderStatus: "已完成",
    orderAmount: "¥1680.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥1680.00",
    shouldInvoiceAmount: "¥1680.00",
    invoiceAmountWithTax: "¥1680.00",
    buyerAccount: "cd-jx (ID:21420)",
    paymentMethod: "先款后货",
    store: "高新闪购店\n(ID:2232766)",
    paidAt: "2026-04-10 14:58:26",
    appliedAt: "2026-04-10 15:10:42",
    modifiedAt: "2026-04-10 15:10:42",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "系统",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  },
  {
    orderNo: "2026041010314407",
    invoiceType: "电子普通发票",
    originalInvoiceType: "电子普通发票",
    invoiceTitle: "武汉智采信息技术有限公司",
    originalInvoiceTitle: "****公司",
    taxpayerId: "91420100MA4L202606",
    orderStatus: "已完成",
    orderAmount: "¥1299.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥1299.00",
    shouldInvoiceAmount: "¥1299.00",
    invoiceAmountWithTax: "¥1299.00",
    buyerAccount: "wh-zc (ID:21495)",
    paymentMethod: "先款后货",
    store: "光谷闪购店\n(ID:2232782)",
    paidAt: "2026-04-11 10:31:44",
    appliedAt: "2026-04-11 10:49:26",
    modifiedAt: "2026-04-11 10:49:26",
    applicationStatus: "待开票",
    invoicedAt: "-",
    invoiceNo: "-",
    invoiceMethod: "系统",
    invoiceStatus: "待开票",
    invoiceStatusTone: "warning",
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "确认开票", "驳回"]
  }
];
const shopInvoiceSingleInvoiceByOrderNo = {
  "2026040119104267": "否",
  "2026040315224679": "是",
  "2026040411083345": "否",
  "2026040517461208": "否",
  "2026040612053401": "否",
  "2026040613485722": "否",
  "2026040710152846": "是",
  "2026040716524309": "否",
  "2026040811241975": "是",
  "2026040814382551": "是",
  "2026040816024198": "是",
  "2026040909231674": "是",
  "2026040914175826": "否",
  "2026041014582635": "否",
  "2026041010314407": "否"
};
const shopInvoiceBatchByOrderNo = {
  "2026040119104267": "KP202604-001",
  "2026040315224679": "KP202604-001",
  "2026040411083345": "KP202604-001",
  "2026040517461208": "KP202604-001",
  "2026040612053401": "KP202604-001",
  "2026040613485722": "KP202604-001",
  "2026040710152846": "KP202604-001",
  "2026040716524309": "KP202604-002",
  "2026040811241975": "KP202604-002",
  "2026040814382551": "KP202604-002",
  "2026040816024198": "KP202604-003",
  "2026040909231674": "KP202604-004",
  "2026040914175826": "KP202604-005",
  "2026041014582635": "KP202604-005",
  "2026041010314407": "KP202604-006"
};
const getShopInvoiceActions = (row) => {
  const baseActions = ["发票详情", "历史操作"];

  if (row.invoiceStatus === "待开票") {
    return [...baseActions, "确认开票", "驳回"];
  }

  if (row.invoiceStatus === "已开票") {
    return [...baseActions, "修改发票"];
  }

  return baseActions;
};
const sortShopInvoiceHistoryRecords = (records = []) => (
  [...records].sort((prev, next) => String(next.time || "").localeCompare(String(prev.time || "")))
);
const buildShopInvoiceHistoryRecords = (row) => {
  const records = [];

  if (row.appliedAt) {
    records.push({
      key: `${row.orderNo}-apply-${row.appliedAt}`,
      type: "apply",
      label: "申请开票",
      time: row.appliedAt,
      amount: row.amount || row.shouldInvoiceAmount || "-",
      invoiceBatch: row.invoiceBatch || "-",
      description: `提交开票申请，申请金额 ${row.amount || row.shouldInvoiceAmount || "-" }。`
    });
  }

  if (row.modifiedAt && row.modifiedAt !== row.appliedAt) {
    const changeSummary = [];

    if (row.originalInvoiceType && row.originalInvoiceType !== row.invoiceType) {
      changeSummary.push(`发票类型由“${row.originalInvoiceType}”改为“${row.invoiceType}”`);
    }
    if (row.originalInvoiceTitle && row.originalInvoiceTitle !== row.invoiceTitle) {
      changeSummary.push(`发票抬头由“${row.originalInvoiceTitle}”改为“${row.invoiceTitle}”`);
    }

    records.push({
      key: `${row.orderNo}-modify-apply-${row.modifiedAt}`,
      type: "modify_apply",
      label: "修改开票申请",
      time: row.modifiedAt,
      description: changeSummary.join("；") || "更新了开票申请信息。"
    });
  }

  if (row.lastCanceledAt) {
    records.push({
      key: `${row.orderNo}-cancel-last-${row.lastCanceledAt}`,
      type: "cancel",
      label: "撤销开票申请",
      time: row.lastCanceledAt,
      description: "本次开票申请已撤销。"
    });
  }

  if (row.resubmittedAt) {
    records.push({
      key: `${row.orderNo}-resubmit-${row.resubmittedAt}`,
      type: "resubmit",
      label: "重新提交开票申请",
      time: row.resubmittedAt,
      description: "撤销后重新提交开票申请。"
    });
  }

  if (row.rejectedAt) {
    records.push({
      key: `${row.orderNo}-reject-${row.rejectedAt}`,
      type: "reject",
      label: "驳回开票申请",
      time: row.rejectedAt,
      description: row.rejectReason ? `驳回原因：${row.rejectReason}` : "平台审核未通过。"
    });
  }

  if (row.canceledAt) {
    records.push({
      key: `${row.orderNo}-cancel-${row.canceledAt}`,
      type: "cancel",
      label: "撤销开票申请",
      time: row.canceledAt,
      description: "当前开票申请已撤销。"
    });
  }

  if (row.invoicedAt && row.invoicedAt !== "-") {
    records.push({
      key: `${row.orderNo}-invoiced-${row.invoicedAt}`,
      type: "complete",
      label: "开票完成",
      time: row.invoicedAt,
      description: `已完成开票，发票号码 ${row.invoiceNo || "-" }。`
    });
  }

  return sortShopInvoiceHistoryRecords(records);
};
const appendShopInvoiceHistoryRecord = (records, record) => sortShopInvoiceHistoryRecords([...(records || []), record]);
const shopInvoiceOrderAfterSaleStatusSeed = {
  "2026040119104267": ["供应商拒绝"],
  "2026040315224679": [],
  "2026040411083345": ["退款中", "待供应商收货"],
  "2026040517461208": ["供应商拒绝", "买家取消"],
  "2026040612053401": ["退款成功", "平台驳回"]
};
const normalizedShopInvoiceManagementRows = shopInvoiceManagementRows.map((row) => {
  const seededStatuses = shopInvoiceOrderAfterSaleStatusSeed[row.orderNo];
  const afterSaleSummary = getShopInvoiceOrderAfterSaleSummary(
    Array.isArray(seededStatuses) && seededStatuses.length > 0
      ? seededStatuses
      : getShopInvoiceOrderAfterSaleStatuses(row)
  );
  const normalizedRow = {
    ...row,
    singleInvoice: normalizeShopInvoiceMode(row.singleInvoice || shopInvoiceSingleInvoiceByOrderNo[row.orderNo]),
    invoiceContent: row.invoiceContent || (["2026040315224679", "2026040716524309", "2026040814382551", "2026040909231674"].includes(row.orderNo) ? "商品明细" : "商品类别"),
    invoiceBatch: row.invoiceBatch || shopInvoiceBatchByOrderNo[row.orderNo] || "-",
    invoiceRemark: row.invoiceRemark || "-",
    orderStatus: row.orderStatus,
    afterSaleStatus: afterSaleSummary.afterSaleStatus,
    afterSaleStatusDetail: afterSaleSummary.afterSaleStatusDetail
  };

  return {
    ...normalizedRow,
    actions: getShopInvoiceActions(normalizedRow),
    historyRecords: buildShopInvoiceHistoryRecords(normalizedRow)
  };
});
const shopInvoiceColumnDefinitions = [
  { key: "select", label: "", width: 44, alwaysVisible: true, frozen: true, renderHeader: () => <input type="checkbox" />, renderCell: () => <input type="checkbox" /> },
  { key: "orderNo", label: "订单号", width: 220, visible: true, frozen: true, renderCell: (item) => <button className="buyer-link-btn" type="button">{item.orderNo}</button> },
  { key: "invoiceType", label: "发票类型", width: 160, visible: true, renderCell: (item) => item.invoiceType },
  { key: "paymentMethod", label: "付款方式", width: 120, visible: true, renderCell: (item) => item.paymentMethod || "-" },
  { key: "invoiceTitle", label: "发票抬头", width: 200, visible: true, renderCell: (item) => item.invoiceTitle },
  { key: "taxpayerId", label: "纳税人识别号", width: 180, visible: true, renderCell: (item) => item.taxpayerId },
  { key: "orderStatus", label: "订单状态", width: 110, visible: true, renderCell: (item) => item.orderStatus },
  { key: "orderAmount", label: "订单总额", width: 120, visible: true, renderCell: (item) => item.orderAmount },
  {
    key: "afterSaleStatus",
    label: "售后状态",
    width: 110,
    visible: true,
    renderCell: (item) => item.afterSaleStatus
  },
  { key: "afterSaleAmount", label: "售后金额总计", width: 130, visible: true, renderCell: (item) => item.afterSaleAmount },
  { key: "amount", label: "申请开票金额", width: 140, visible: true, renderCell: (item) => <div className="shop-invoice-amount">{item.amount}</div> },
  { key: "shouldInvoiceAmount", label: "发票应开金额", width: 140, visible: true, renderCell: (item) => item.shouldInvoiceAmount },
  { key: "invoiceAmountWithTax", label: "发票金额（含税）", width: 156, visible: true, headerClassName: "shop-invoice-col-amount-tax", cellClassName: "shop-invoice-col-amount-tax", renderCell: (item) => ["待开票", "已驳回", "已撤销"].includes(item.invoiceStatus || item.applicationStatus) ? "-" : item.invoiceAmountWithTax },
  { key: "invoiceContent", label: "发票内容", width: 120, visible: true, renderCell: (item) => item.invoiceContent || "商品类别" },
  { key: "singleInvoice", label: "是否单独开票", width: 110, visible: true, renderCell: (item) => normalizeShopInvoiceMode(item.singleInvoice) },
  { key: "invoiceBatch", label: "开票批次", width: 140, visible: true, renderCell: (item) => item.invoiceBatch || "-" },
  { key: "invoiceRemark", label: "开票备注", width: 220, visible: true, renderCell: (item) => item.invoiceRemark || "-" },
  { key: "buyerAccount", label: "买家账号", width: 150, visible: true, renderCell: (item) => item.buyerAccount },
  { key: "store", label: "闪购门店", width: 210, visible: true, renderCell: (item) => (
    <div className="shop-invoice-store-cell">
      {String(item.store || "").split("\n").map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  ) },
  { key: "paidAt", label: "支付时间", width: 180, visible: true, renderCell: (item) => item.paidAt },
  { key: "appliedAt", label: "申请时间", width: 180, visible: true, renderCell: (item) => item.appliedAt },
  { key: "invoicedAt", label: "开票时间", width: 180, visible: true, headerClassName: "shop-invoice-col-invoiced-at", cellClassName: "shop-invoice-col-invoiced-at", renderCell: (item) => item.invoicedAt },
  { key: "invoiceNo", label: "发票号码", width: 180, visible: true, renderCell: (item) => item.invoiceNo },
  { key: "invoiceMethod", label: "开票方式", width: 120, visible: true, renderCell: (item) => item.invoiceMethod },
  { key: "invoiceStatus", label: "开票状态", width: 110, visible: true, renderCell: (item) => <span className={`shop-invoice-status-tag is-${item.invoiceStatusTone || "default"}`}>{item.invoiceStatus}</span> },
  { key: "afterSaleExpired", label: "是否过售后期", width: 130, visible: true, renderCell: (item) => item.afterSaleExpired },
  { key: "actions", label: "操作", width: 120, visible: true, alwaysVisible: true, frozenRight: true, renderCell: (item) => (
    <div className="shop-invoice-actions">
      {item.actions.map((action) => (
        <button className="buyer-link-btn" key={action} type="button">{action}</button>
      ))}
    </div>
  ) }
];
const initialShopInvoiceColumnPrefs = shopInvoiceColumnDefinitions.reduce((result, column) => {
  result[column.key] = {
    visible: column.alwaysVisible ? true : column.visible !== false,
    freeze: column.frozenRight ? "right" : column.frozen ? "left" : "none"
  };
  return result;
}, {});
const initialShopInvoiceColumnOrder = shopInvoiceColumnDefinitions.filter((column) => column.key !== "select").map((column) => column.key);
const buyerPcMallAccountOptions = ["wujing146(总部)", "nfsq369(子账号)", "shawnee003(总部)", "lgq01(默认账号)"];
const buyerPcMallStatusOptions = ["待申请", "已驳回", "已撤销"];
const buyerPcMallAfterSaleStatusOptions = ["全部", "售后中", "部分退款", "售后关闭"];
const buyerPcMallStoreOptions = ["闪购一店", "闪购二店", "北京朝阳门店", "成都晨曦路门店"];
const buyerPcMallStoreSearchOptions = [
  { value: "闪购一店", label: "闪购一店", meta: "ID：121301", searchText: "闪购一店 id:121301 id：121301 121301" },
  { value: "闪购二店", label: "闪购二店", meta: "ID：121302", searchText: "闪购二店 id:121302 id：121302 121302" },
  { value: "北京朝阳门店", label: "北京朝阳门店", meta: "ID：102325", searchText: "北京朝阳门店 id:102325 id：102325 102325" },
  { value: "成都晨曦路门店", label: "成都晨曦路门店", meta: "ID：064151", searchText: "成都晨曦路门店 id:064151 id：064151 064151" }
];
const buyerPcMallStoreInvoiceProfileMap = {
  闪购一店: {
    invoiceType: "电子普通发票",
    titleType: "企业",
    titleName: "湖南海商科技有限公司",
    taxpayerId: "102324565122210",
    registeredAddress: "",
    phone: "",
    bank: "",
    bankAccount: "",
    invoiceContent: "商品类别"
  },
  闪购二店: {
    invoiceType: "电子普通发票",
    titleType: "个人",
    titleName: "朱达",
    taxpayerId: "",
    registeredAddress: "",
    phone: "",
    bank: "",
    bankAccount: "",
    invoiceContent: "商品类别"
  },
  北京朝阳门店: {
    invoiceType: "电子增值税专用发票",
    titleType: "企业",
    titleName: "深圳广联科技有限公司",
    taxpayerId: "91440300111222333P",
    registeredAddress: "深圳市南山区科苑路 18 号 A 座 12 楼",
    phone: "0755-86543210",
    bank: "招商银行深圳科技园支行",
    bankAccount: "755924680010223",
    invoiceContent: "商品明细"
  },
  成都晨曦路门店: {
    invoiceType: "电子增值税专用发票",
    titleType: "企业",
    titleName: "杭州优选商贸有限公司",
    taxpayerId: "91330100666777888L",
    registeredAddress: "杭州市西湖区文三路 188 号 9 楼",
    phone: "0571-87330021",
    bank: "中国工商银行杭州西湖支行",
    bankAccount: "3301028800123456789",
    invoiceContent: "商品明细"
  }
};
const buyerPcMallStoreMetaMap = buyerPcMallStoreSearchOptions.reduce((result, option) => {
  result[option.value] = option.meta || "";
  return result;
}, {});
const buyerPcMallBatchInvoiceForm = {
  invoiceType: "电子普通发票",
  titleType: "企业",
  titleName: "",
  taxpayerId: "",
  registeredAddress: "",
  phone: "",
  bank: "",
  bankAccount: "",
  storeName: "",
  invoiceContent: "商品类别",
  receiverPhone: "",
  receiverEmail: "",
  remark: ""
};
const buyerPcMallDefaultReceiverPhone = "13800138000";
const buyerPcMallDefaultReceiverEmail = "nfsq369@shandianbangbang.com";
const initialBatchInvoiceFieldErrors = {
  invoiceType: false,
  titleType: false,
  titleName: false,
  taxpayerId: false,
  registeredAddress: false,
  phone: false,
  bank: false,
  bankAccount: false,
  invoiceContent: false,
  receiverPhone: false,
  receiverEmail: false
};
const buyerPcMallDetailActionLabels = {
  modify: "modify",
  revoke: "revoke"
};
const initialBuyerPcMallInvoiceTitleForm = {
  id: "",
  invoiceType: "电子增值税专用发票",
  titleType: "企业",
  storeName: "",
  titleName: "",
  taxpayerId: "",
  registeredAddress: "",
  phone: "",
  bank: "",
  receiverPhone: "",
  receiverEmail: "",
  bankAccount: "",
  isDefault: false
};
const initialBuyerPcMallInvoiceTitleFieldErrors = {
  titleName: false,
  taxpayerId: false,
  registeredAddress: false,
  phone: false,
  bank: false,
  bankAccount: false,
  receiverPhone: false,
  receiverEmail: false
};
const initialShopInvoiceConfirmForm = {
  invoiceNo: "",
  invoiceAmountWithTax: "",
  invoiceAmountWithoutTax: "",
  invoicedDate: "",
  attachmentName: ""
};
const initialShopInvoiceConfirmErrors = {
  attachmentName: false,
  invoiceNo: false,
  invoiceAmountWithTax: false,
  invoiceAmountWithoutTax: false,
  invoicedDate: false
};
const initialShopInvoiceModifyForm = {
  invoiceNo: "",
  invoiceAmountWithTax: "",
  invoiceAmountWithoutTax: "",
  invoicedDate: "",
  attachmentName: ""
};
const initialShopInvoiceModifyErrors = {
  attachmentName: false,
  invoiceNo: false,
  invoiceAmountWithTax: false,
  invoiceAmountWithoutTax: false,
  invoicedDate: false
};
const initialShopInvoiceRejectForm = {
  rejectReason: ""
};
const initialShopInvoiceRejectErrors = {
  rejectReason: false
};

const BuyerPcMallStoreSearchSelect = memo(function BuyerPcMallStoreSearchSelect({
  value,
  onChange,
  placeholder = "请输入闪购门店名称/闪购门店ID，支持全模糊查询",
  isSpecialLayout = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const rootRef = useRef(null);
  const selectedOption = buyerPcMallStoreSearchOptions.find((option) => option.value === value) || null;
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleOptions = useMemo(() => {
    if (!normalizedKeyword) return buyerPcMallStoreSearchOptions;
    return buyerPcMallStoreSearchOptions.filter((option) => option.searchText.toLowerCase().includes(normalizedKeyword));
  }, [normalizedKeyword]);

  useEffect(() => {
    if (!isOpen) {
      setKeyword("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setKeyword("");
    setIsOpen(false);
  };

  return (
    <div className={`pc-mall-search-select pc-mall-store-search-select${isOpen ? " is-open" : ""}${isSpecialLayout ? " is-special-layout" : ""}`} ref={rootRef}>
      <div className="pc-mall-search-select-trigger">
        <div className="pc-mall-search-select-input-wrap" onClick={() => setIsOpen(true)} role="presentation">
          {selectedOption ? (
            <span className="pc-mall-store-search-select-value">
              {selectedOption.label}{selectedOption.meta ? `（${selectedOption.meta}）` : ""}
            </span>
          ) : null}
          <input
            placeholder={selectedOption ? "" : placeholder}
            value={keyword}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setKeyword(event.target.value);
              setIsOpen(true);
            }}
          />
        </div>
        <i aria-hidden="true" />
      </div>
      {isOpen ? (
        <div className="pc-mall-search-select-menu pc-mall-store-search-select-menu">
          {visibleOptions.length > 0 ? visibleOptions.map((option) => (
            <label className="pc-mall-search-select-option pc-mall-store-search-select-option" key={option.value}>
              <input type="radio" checked={value === option.value} onChange={() => handleSelect(option.value)} />
              <div className="pc-mall-store-search-select-option-body">
                <span className="pc-mall-store-search-select-option-label">
                  {option.label}{option.meta ? `（${option.meta}）` : ""}
                </span>
              </div>
            </label>
          )) : <div className="pc-mall-search-select-empty">未找到匹配的闪购门店</div>}
        </div>
      ) : null}
    </div>
  );
});

function createBuyerPcMallStoreBindings(storeName) {
  const trimmedStoreName = String(storeName || "").trim();
  if (!trimmedStoreName) return [];
  const storeMeta = buyerPcMallStoreMetaMap[trimmedStoreName] || "";
  const matchedId = String(storeMeta).match(/\d+/)?.[0] || "";

  return [{
    id: matchedId,
    name: trimmedStoreName
  }];
}

function getBuyerPcMallStoreInvoiceProfile(storeName) {
  if (!storeName) return null;
  return buyerPcMallStoreInvoiceProfileMap[storeName] || null;
}

function getBuyerPcMallInvoiceTitleStoreBindings(row) {
  if (Array.isArray(row.storeBindings) && row.storeBindings.length > 0) return row.storeBindings;
  if (row.storeName) return createBuyerPcMallStoreBindings(row.storeName);
  return [];
}

function getBuyerPcMallInvoiceTitleStoreSummary(row) {
  return getBuyerPcMallInvoiceTitleStoreBindings(row).map((store) => (
    `${store.name}${store.id ? `(ID:${store.id})` : ""}`
  )).join("、");
}

function getBuyerPcMallInvoiceTitlePrimaryStore(row) {
  const [firstStore] = getBuyerPcMallInvoiceTitleStoreBindings(row);
  if (!firstStore) return "";
  return `${firstStore.name}${firstStore.id ? `(ID:${firstStore.id})` : ""}`;
}

const shopInvoiceOrderDetailSeed = {
  "2026040119104267": {
    orderStatusText: "已完成",
    afterSaleStatusText: "售后关闭",
    receiverInfo: "张**  138****5566",
    address: "上海市浦东新区金桥路 88 号 3 号楼 1202 室",
    paidAt: "2026-04-01 19:27:31",
    buyerAccount: "sakuraA(ID:19556)",
    storeName: "入驻测试门店闭店撰写班仔-供应链自动化_上单建店",
    storeId: "门店ID: 2232453",
    remark: "-",
    items: [
      {
        product: "茉沏-专享价（CF勿删）12箱",
        spec: "71066199-2",
        unitPrice: "1200",
        quantity: "1",
        subtotal: "1200",
        afterSaleStatus: "供应商拒绝",
        afterSaleCount: "1",
        actualAfterSaleCount: "1",
        afterSaleAmount: "1200.00",
        shippedCount: "0"
      },
      {
        product: "茉沏青柠风味饮品整箱",
        spec: "71066201-6",
        unitPrice: "900",
        quantity: "2",
        subtotal: "1800",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "门店专供陈列物料包",
        spec: "MQ-WLB-09",
        unitPrice: "600",
        quantity: "1",
        subtotal: "600",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 4 件，商品，总商品金额：",
      goodsAmount: "¥3600",
      shippingFee: "¥0",
      taxFee: "¥360",
      orderAmount: "¥3960",
      afterSaleAmount: "¥1200",
      applyInvoiceAmount: "¥3960",
      shouldInvoiceAmount: "¥2760"
    }
  },
  "2026040210365821": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
    receiverInfo: "李**  139****8821",
    address: "上海市徐汇区漕溪北路 66 号",
    paidAt: "2026-04-02 15:22:46",
    buyerAccount: "cloudbuyer(ID:20318)",
    storeName: "浦东闪购店",
    storeId: "门店ID: 2232512",
    remark: "-",
    items: [
      {
        product: "商用办公用品套装",
        spec: "BG-1288-A",
        unitPrice: "644",
        quantity: "2",
        subtotal: "1288",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      }
    ],
    summary: {
      itemCount: "共 2 件，商品，总商品金额：",
      goodsAmount: "¥1288",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥1288",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥1288",
      shouldInvoiceAmount: "¥1288"
    }
  },
  "2026040315224679": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
    receiverInfo: "王**  136****2233",
    address: "深圳市南山区科苑路 18 号",
    paidAt: "2026-04-03 15:22:46",
    buyerAccount: "sz-tech(ID:18976)",
    storeName: "深圳联科技园店",
    storeId: "门店ID: 2232788",
    remark: "-",
    items: [
      {
        product: "企业采购电子设备套餐",
        spec: "SZ-NUC-01",
        unitPrice: "2899",
        quantity: "1",
        subtotal: "2899",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "会议室无线投屏器",
        spec: "SZ-DONGLE-7",
        unitPrice: "900",
        quantity: "1",
        subtotal: "900",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "多口扩展坞",
        spec: "SZ-HUB-800",
        unitPrice: "800",
        quantity: "1",
        subtotal: "800",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 3 件，商品，总商品金额：",
      goodsAmount: "¥4599",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥4599",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥4599",
      shouldInvoiceAmount: "¥4599"
    }
  },
  "2026040411083345": {
    orderStatusText: "待收货",
    afterSaleStatusText: "退款中",
    receiverInfo: "赵**  137****3345",
    address: "杭州市西湖区文三路 188 号",
    paidAt: "2026-04-04 11:08:33",
    buyerAccount: "hz-select(ID:19824)",
    storeName: "西湖闪购店",
    storeId: "门店ID: 2233018",
    remark: "-",
    items: [
      {
        product: "杭州优选办公礼包",
        spec: "HZ-459",
        unitPrice: "459",
        quantity: "1",
        subtotal: "459",
        afterSaleStatus: "退款中",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "459.00",
        shippedCount: "1"
      },
      {
        product: "A4 复印纸整箱",
        spec: "HZ-PAPER-120",
        unitPrice: "120",
        quantity: "1",
        subtotal: "120",
        afterSaleStatus: "待供应商收货",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "120.00",
        shippedCount: "1"
      },
      {
        product: "桌面收纳托盘",
        spec: "HZ-TRAY-120",
        unitPrice: "120",
        quantity: "1",
        subtotal: "120",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 3 件，商品，总商品金额：",
      goodsAmount: "¥699",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥699",
      afterSaleAmount: "¥579",
      applyInvoiceAmount: "¥699",
      shouldInvoiceAmount: "¥699"
    }
  },
  "2026040517461208": {
    orderStatusText: "已完成",
    afterSaleStatusText: "售后关闭",
    receiverInfo: "陈**  135****1208",
    address: "苏州市工业园区星湖街 99 号",
    paidAt: "2026-04-05 17:46:12",
    buyerAccount: "su-tech(ID:18552)",
    storeName: "苏州工业设备店",
    storeId: "门店ID: 2233560",
    remark: "-",
    items: [
      {
        product: "工业设备配件采购单",
        spec: "SU-420",
        unitPrice: "420",
        quantity: "1",
        subtotal: "420",
        afterSaleStatus: "供应商拒绝",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "工业设备维护工具包",
        spec: "SU-360",
        unitPrice: "360",
        quantity: "1",
        subtotal: "360",
        afterSaleStatus: "买家取消",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "设备固定支架",
        spec: "SU-200",
        unitPrice: "200",
        quantity: "1",
        subtotal: "200",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 3 件，商品，总商品金额：",
      goodsAmount: "¥980",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥980",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥980",
      shouldInvoiceAmount: "¥980"
    }
  },
  "2026040612053401": {
    orderStatusText: "已完成",
    afterSaleStatusText: "部分售后完成",
    receiverInfo: "周**  186****3401",
    address: "上海市闵行区申长路 1688 号",
    paidAt: "2026-04-06 12:05:34",
    buyerAccount: "eastlink(ID:20891)",
    storeName: "虹桥闪购店",
    storeId: "门店ID: 2232701",
    remark: "部分商品售后已完结。",
    items: [
      {
        product: "门店标签打印机",
        spec: "HQ-PRINT-680",
        unitPrice: "680",
        quantity: "1",
        subtotal: "680",
        afterSaleStatus: "退款成功",
        afterSaleCount: "1",
        actualAfterSaleCount: "1",
        afterSaleAmount: "680.00",
        shippedCount: "0"
      },
      {
        product: "热敏纸耗材包",
        spec: "HQ-PAPER-220",
        unitPrice: "220",
        quantity: "1",
        subtotal: "220",
        afterSaleStatus: "平台驳回",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "货架价签卡槽",
        spec: "HQ-TAG-480",
        unitPrice: "480",
        quantity: "1",
        subtotal: "480",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 3 件，商品，总商品金额：",
      goodsAmount: "¥1380",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥1380",
      afterSaleAmount: "¥680",
      applyInvoiceAmount: "¥1380",
      shouldInvoiceAmount: "¥1380"
    }
  },
  "2026040816024198": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
    receiverInfo: "何**  188****4198",
    address: "深圳市福田区深南大道 6008 号采购中心 12 楼",
    paidAt: "2026-04-08 16:02:41",
    buyerAccount: "hn-jicai(ID:21317)",
    storeName: "福田闪购店",
    storeId: "门店ID: 2232750",
    remark: "本单包含门店终端、标签耗材及陈列物料，请按清单统一归档。",
    items: [
      {
        product: "工业级门店平板终端",
        spec: "FT-PAD-680",
        unitPrice: "680",
        quantity: "1",
        subtotal: "680",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "二维码扫描枪",
        spec: "FT-SCAN-260",
        unitPrice: "260",
        quantity: "2",
        subtotal: "520",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "桌面标签支架",
        spec: "FT-LABEL-180",
        unitPrice: "180",
        quantity: "2",
        subtotal: "360",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "热敏标签纸补充装",
        spec: "FT-PAPER-90",
        unitPrice: "90",
        quantity: "3",
        subtotal: "270",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "3"
      },
      {
        product: "陈列海报物料包",
        spec: "FT-POSTER-140",
        unitPrice: "140",
        quantity: "2",
        subtotal: "280",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "门店交互音箱",
        spec: "FT-SPEAKER-340",
        unitPrice: "340",
        quantity: "1",
        subtotal: "340",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 11 件，商品，总商品金额：",
      goodsAmount: "¥2450",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥2450",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥2450",
      shouldInvoiceAmount: "¥2450"
    }
  },
  "2026040914175826": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
    receiverInfo: "刘**  139****5826",
    address: "成都市高新区天府大道 188 号 B 座 8 楼",
    paidAt: "2026-04-11 14:17:58",
    buyerAccount: "cd-jx(ID:21420)",
    storeName: "高新闪购店",
    storeId: "门店ID: 2232766",
    remark: "门店常备办公补货单，含文具与员工茶歇商品。",
    items: [
      {
        product: "A4 复印纸整箱",
        spec: "CD-PAPER-120",
        unitPrice: "120",
        quantity: "2",
        subtotal: "240",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "中性笔补充盒",
        spec: "CD-PEN-68",
        unitPrice: "68",
        quantity: "2",
        subtotal: "136",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "文件收纳箱",
        spec: "CD-BOX-96",
        unitPrice: "96",
        quantity: "1",
        subtotal: "96",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "桌面绿植摆件",
        spec: "CD-PLANT-58",
        unitPrice: "58",
        quantity: "1",
        subtotal: "58",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "咖啡茶歇礼包",
        spec: "CD-TEA-115",
        unitPrice: "115",
        quantity: "2",
        subtotal: "230",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      }
    ],
    summary: {
      itemCount: "共 8 件，商品，总商品金额：",
      goodsAmount: "¥760",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥760",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥760",
      shouldInvoiceAmount: "¥760"
    }
  },
  "2026041014582635": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
    receiverInfo: "唐**  187****2635",
    address: "成都市高新区软件园 D 区 6 栋 3 楼",
    paidAt: "2026-04-10 14:58:26",
    buyerAccount: "cd-jx(ID:21420)",
    storeName: "高新闪购店",
    storeId: "门店ID: 2232766",
    remark: "会议室设备升级采购，混合电子设备与办公配套用品。",
    items: [
      {
        product: "便携投影仪",
        spec: "CD-PROJ-720",
        unitPrice: "720",
        quantity: "1",
        subtotal: "720",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "无线演示器",
        spec: "CD-PRES-160",
        unitPrice: "160",
        quantity: "1",
        subtotal: "160",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "HDMI 高清线",
        spec: "CD-HDMI-65",
        unitPrice: "65",
        quantity: "2",
        subtotal: "130",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "移动白板套装",
        spec: "CD-BOARD-210",
        unitPrice: "210",
        quantity: "1",
        subtotal: "210",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      },
      {
        product: "会议记录本礼包",
        spec: "CD-NOTE-92",
        unitPrice: "92",
        quantity: "2",
        subtotal: "184",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "2"
      },
      {
        product: "瓶装茶饮组合",
        spec: "CD-DRINK-69",
        unitPrice: "69",
        quantity: "4",
        subtotal: "276",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "4"
      }
    ],
    summary: {
      itemCount: "共 11 件，商品，总商品金额：",
      goodsAmount: "¥1680",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥1680",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥1680",
      shouldInvoiceAmount: "¥1680"
    }
  }
};

function createShopInvoiceOrderDetail(row) {
  if (!row) return null;
  const seed = shopInvoiceOrderDetailSeed[row.orderNo];
  const afterSaleSummary = getShopInvoiceOrderAfterSaleSummary(getShopInvoiceOrderAfterSaleStatuses(row, seed));
  if (seed) {
    return {
      orderNo: row.orderNo,
      orderStatusText: seed.orderStatusText,
      afterSaleStatusText: afterSaleSummary.afterSaleStatus === "-" ? seed.afterSaleStatusText : afterSaleSummary.afterSaleStatusDetail,
      receiverInfo: seed.receiverInfo,
      address: seed.address,
      paidAt: seed.paidAt || row.paidAt,
      buyerAccount: seed.buyerAccount,
      storeName: seed.storeName,
      storeId: seed.storeId,
      remark: seed.remark,
      items: seed.items,
      summary: seed.summary
    };
  }

  const [storeName = row.store, storeId = ""] = String(row.store || "").split("\n");
  return {
    orderNo: row.orderNo,
    orderStatusText: row.orderStatus,
    afterSaleStatusText: row.afterSaleStatusDetail || row.afterSaleStatus || "-",
    receiverInfo: "-",
    address: "-",
    paidAt: row.paidAt,
    buyerAccount: row.buyerAccount,
    storeName,
    storeId,
    remark: "-",
    items: [
      {
        product: `${row.invoiceType}对应订单商品`,
        spec: row.taxpayerId,
        unitPrice: String(parseMoneyValue(row.orderAmount)),
        quantity: "1",
        subtotal: String(parseMoneyValue(row.orderAmount)),
        afterSaleStatus: row.afterSaleStatus || "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: String(parseMoneyValue(row.afterSaleAmount).toFixed(2)),
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 1 件，商品，总商品金额：",
      goodsAmount: row.orderAmount,
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: row.orderAmount,
      afterSaleAmount: row.afterSaleAmount,
      applyInvoiceAmount: row.amount,
      shouldInvoiceAmount: row.shouldInvoiceAmount
    }
  };
}

function createShopInvoiceIssuedDetail(row) {
  if (!row) return null;
  const orderDetail = createShopInvoiceOrderDetail(row);
  const isIssued = row.invoiceStatus === "已开票";
  const shouldHideInvoiceAmounts = ["待开票", "已驳回", "已撤销"].includes(row.invoiceStatus || row.applicationStatus);
  const statusExtraText = getShopInvoiceStatusExtraText(row);
  const invoiceTypeExtraText = getShopInvoiceTypeExtraText(row);
  const invoiceTitleExtraText = getShopInvoiceTitleExtraText(row);
  const invoiceAmountWithTax = shouldHideInvoiceAmounts
    ? "-"
    : row.invoiceAmountWithTax && row.invoiceAmountWithTax !== "-" ? row.invoiceAmountWithTax : row.shouldInvoiceAmount || row.amount || "-";
  return {
    invoiceInfo: {
      applicationStatus: row.applicationStatus,
      invoiceStatus: row.invoiceStatus,
      invoiceStatusTone: row.invoiceStatusTone || "dark",
      invoiceType: row.invoiceType,
      invoiceContent: row.invoiceContent || "商品类别",
      invoiceTypeExtraText,
      appliedAt: row.appliedAt,
      invoicePlatform: "闪电帮帮",
      invoiceNo: row.invoiceNo,
      canPreviewPdf: isIssued && row.invoiceNo && row.invoiceNo !== "-",
      statusExtraText,
      invoiceAmountWithTax,
      invoiceAmountWithoutTax: isIssued && !shouldHideInvoiceAmounts ? formatMoneyDisplay(Math.max(parseMoneyValue(invoiceAmountWithTax) - 0.04, 0)) : "-",
      invoicedAt: row.invoicedAt
    },
    titleInfo: {
      invoiceTitle: row.invoiceTitle,
      invoiceTitleExtraText,
      taxpayerId: row.taxpayerId,
      registerAddress: "湖南省长沙市雨花区",
      registerPhone: "0731-85632561",
      bankName: "长沙银行",
      bankAccount: "10215545132321125"
    },
    receiverInfo: {
      receiverPhone: "-",
      receiverEmail: "-"
    },
    orderInfo: {
      orderStatus: orderDetail?.orderStatusText || row.orderStatus,
      orderNo: row.orderNo,
      applyAmount: row.amount,
      paidAt: row.paidAt,
      buyerAccount: row.buyerAccount,
      storeName: `${orderDetail?.storeName || row.store}（${orderDetail?.storeId || ""}）`
    },
    items: orderDetail?.items || [],
    remark: orderDetail?.remark || "-",
    invoiceRemark: row.invoiceRemark || "-",
    summary: orderDetail?.summary || {
      itemCount: "共 1 件，商品，总商品金额：",
      goodsAmount: row.orderAmount,
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: row.orderAmount,
      afterSaleAmount: row.afterSaleAmount,
      applyInvoiceAmount: row.amount,
      shouldInvoiceAmount: row.shouldInvoiceAmount
    }
  };
}

function createBuyerPcMallInvoiceDetail(row, sourceType) {
  if (!row) return null;

  const isInvoiced = sourceType === "invoiced";
  const isPersonalTitle = String(row.invoiceTitle || "").includes("个人");
  const orderAmount = row.amount || "¥0.00";
  const appliedAt = row.appliedAt || `${row.invoicedAt || "2023-05-01"} 10:00`;
  const paidAt = row.appliedAt || `${row.invoicedAt || "2023-05-01"} 09:30`;
  const mappedRow = {
    orderNo: row.orderNo,
    invoiceType: row.invoiceType,
    invoiceContent: row.invoiceContent || "商品类别",
    invoiceTitle: row.invoiceTitle,
    taxpayerId: isPersonalTitle ? "-" : `9131${String(row.orderNo).slice(-10)}`,
    orderStatus: "已完成",
    orderAmount,
    afterSaleAmount: "¥0.00",
    amount: orderAmount,
    shouldInvoiceAmount: orderAmount,
    invoiceAmountWithTax: isInvoiced ? orderAmount : "-",
    buyerAccount: "nfsq369（ID:13641）",
    store: `${row.store || "-"}\n${row.storeId || ""}`,
    paidAt,
    appliedAt,
    modifiedAt: appliedAt,
    applicationStatus: isInvoiced ? "已完成" : "待开票",
    invoicedAt: isInvoiced ? row.invoicedAt : "-",
    invoiceNo: isInvoiced ? row.invoiceNo : "-",
    invoiceRemark: isInvoiced ? "供应商已根据申请开具对应发票。" : "发票申请已提交，请等待供应商开票。",
    invoiceStatus: isInvoiced ? "已开票" : "待开票",
    invoiceStatusTone: isInvoiced ? "success" : "dark"
  };
  const detail = createShopInvoiceIssuedDetail(mappedRow);
  const amountNumber = parseMoneyValue(orderAmount).toFixed(2);

  return {
    ...detail,
    titleInfo: {
      ...detail.titleInfo,
      taxpayerId: isPersonalTitle ? "-" : `9131${String(row.orderNo).slice(-10)}`,
      registerAddress: isPersonalTitle ? "-" : "湖南省长沙市雨花区湘府东路二段517号",
      registerPhone: isPersonalTitle ? "-" : "0731-85632561",
      bankName: isPersonalTitle ? "-" : "长沙银行股份有限公司高桥支行",
      bankAccount: isPersonalTitle ? "-" : `10215545${String(row.orderNo).slice(-8)}`
    },
    receiverInfo: {
      receiverPhone: "13800000002",
      receiverEmail: "buyer.invoice@shandian.com"
    },
    orderInfo: {
      ...detail.orderInfo,
      orderStatus: "已完成",
      applyAmount: orderAmount,
      paidAt,
      buyerAccount: "nfsq369（ID:13641）",
      storeName: `${row.store || "-"}${row.storeId || ""}`
    },
    items: [
      {
        product: `${row.shop}订单商品`,
        spec: row.invoiceType,
        unitPrice: amountNumber,
        quantity: "1",
        subtotal: amountNumber,
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    remark: "-",
    invoiceRemark: isInvoiced ? "供应商已根据申请开具对应发票。" : "发票申请已提交，请等待供应商开票。",
    summary: {
      itemCount: "共 1 件，商品，总商品金额：",
      goodsAmount: orderAmount,
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount,
      afterSaleAmount: "¥0.00",
      applyInvoiceAmount: orderAmount,
      shouldInvoiceAmount: orderAmount
    },
    sourceType,
    canModifyInvoiceInfo: sourceType === "applied" && !row.modifiedOnce,
    modifiedAt: row.modifiedAt || "",
    canRevokeApplication: sourceType === "applied"
  };
}

function formatBuyerPcMallDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function createBuyerPcMallInvoiceBatchNo(date = new Date(), suffix = "001") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `KP${year}${month}-${suffix}`;
}

function createBuyerPcMallAppliedInvoiceRow(order, form, appliedAt = formatBuyerPcMallDateTime(), invoiceBatch = "") {
  const titleType = form.invoiceType === "电子增值税专用发票" ? "企业" : form.titleType;
  return {
    orderNo: order.orderNo,
    invoiceTitle: form.titleName,
    invoiceType: form.invoiceType,
    invoiceTypeTone: form.invoiceType.includes("专用") ? "blue" : "purple",
    amount: order.amount || order.price || "¥0.00",
    appliedAt,
    shop: order.shop,
    store: form.storeName || order.store || "-",
    storeId: order.storeId || "",
    status: "已申请",
    taxpayerId: titleType === "个人" ? "-" : form.taxpayerId,
    titleType,
    registeredAddress: form.registeredAddress || "-",
    phone: form.phone || "-",
    bank: form.bank || "-",
    bankAccount: form.bankAccount || "-",
    receiverPhone: form.receiverPhone || "-",
    receiverEmail: form.receiverEmail || "-",
    invoiceContent: form.invoiceContent,
    singleInvoice: normalizeShopInvoiceMode(order.needInvoice === true || order.needInvoice === "是" ? "是" : "否"),
    invoiceBatch,
    remark: form.remark || "发票申请已提交，请等待供应商开票。",
    modifiedOnce: false,
    modifiedAt: ""
  };
}

function createBuyerPcMallBatchInvoiceFormFromTitleRow(row) {
  if (!row) return buyerPcMallBatchInvoiceForm;

  const [firstStore] = getBuyerPcMallInvoiceTitleStoreBindings(row);
  return {
    ...buyerPcMallBatchInvoiceForm,
    invoiceType: row.invoiceType || buyerPcMallBatchInvoiceForm.invoiceType,
    titleType: row.titleType || buyerPcMallBatchInvoiceForm.titleType,
    titleName: row.title || "",
    taxpayerId: row.taxpayerId || "",
    registeredAddress: row.registeredAddress || "",
    phone: row.phone || "",
    bank: row.bank || "",
    bankAccount: row.bankAccount || "",
    storeName: firstStore?.name || "",
    receiverPhone: row.receiverPhone || buyerPcMallDefaultReceiverPhone,
    receiverEmail: row.receiverEmail || buyerPcMallDefaultReceiverEmail,
    invoiceContent: buyerPcMallBatchInvoiceForm.invoiceContent
  };
}

function createBuyerPcMallBatchOrderInvoiceFields(titleRow) {
  if (!titleRow) {
    return {
      invoiceTitleId: "",
      invoiceTitle: "",
      invoiceType: buyerPcMallBatchInvoiceForm.invoiceType,
      titleType: buyerPcMallBatchInvoiceForm.titleType,
      taxpayerId: "",
      registeredAddress: "",
      phone: "",
      bank: "",
      bankAccount: "",
      receiverPhone: buyerPcMallDefaultReceiverPhone,
      receiverEmail: buyerPcMallDefaultReceiverEmail
    };
  }

  return {
    invoiceTitleId: titleRow.id,
    invoiceTitle: titleRow.title || "",
    invoiceType: titleRow.invoiceType || buyerPcMallBatchInvoiceForm.invoiceType,
    titleType: titleRow.titleType || buyerPcMallBatchInvoiceForm.titleType,
    taxpayerId: titleRow.taxpayerId || "",
    registeredAddress: titleRow.registeredAddress || "",
    phone: titleRow.phone || "",
    bank: titleRow.bank || "",
    bankAccount: titleRow.bankAccount || "",
    receiverPhone: titleRow.receiverPhone || buyerPcMallDefaultReceiverPhone,
    receiverEmail: titleRow.receiverEmail || buyerPcMallDefaultReceiverEmail
  };
}

function createBuyerPcMallInvoiceTitleFormFromRow(row) {
  if (!row) return initialBuyerPcMallInvoiceTitleForm;

  return {
    id: row.id || "",
    invoiceType: row.invoiceType || initialBuyerPcMallInvoiceTitleForm.invoiceType,
    titleType: row.titleType || initialBuyerPcMallInvoiceTitleForm.titleType,
    storeName: getBuyerPcMallInvoiceTitlePrimaryStore(row) || "",
    titleName: row.title || "",
    taxpayerId: row.taxpayerId || "",
    registeredAddress: row.registeredAddress || "",
    phone: row.phone || "",
    bank: row.bank || "",
    receiverPhone: row.receiverPhone || "",
    receiverEmail: row.receiverEmail || "",
    bankAccount: row.bankAccount || "",
    isDefault: Boolean(row.isDefault)
  };
}

function getBuyerPcMallInvoiceTitleTooltip(titleRow) {
  if (!titleRow) return "发票抬头信息暂无";

  const lines = [
    `发票类型：${titleRow.invoiceType || "-"}`,
    `抬头类型：${titleRow.titleType || "-"}`,
    `发票抬头：${titleRow.title || "-"}`
  ];

  if (titleRow.titleType !== "个人") {
    lines.push(`纳税人识别号：${titleRow.taxpayerId || "-"}`);
  }

  if (titleRow.invoiceType === "电子增值税专用发票") {
    lines.push(`企业地址：${titleRow.registeredAddress || "-"}`);
    lines.push(`企业电话：${titleRow.phone || "-"}`);
    lines.push(`开户银行名称：${titleRow.bank || "-"}`);
    lines.push(`开户银行账号：${titleRow.bankAccount || "-"}`);
  }

  return lines.join("\n");
}

function createBuyerPcMallPendingInvoiceRowFromRevoked(appliedRow) {
  return normalizeBuyerPcMallInvoiceRow({
    orderNo: appliedRow.orderNo,
    product: `${appliedRow.shop}订单商品`,
    spec: appliedRow.invoiceType,
    price: appliedRow.amount,
    time: appliedRow.appliedAt,
    shop: appliedRow.shop,
    store: appliedRow.store || "-",
    storeId: appliedRow.storeId || "",
    status: "已撤销",
    productTone: "phone"
  });
}

function createBuyerPcMallInvoiceFormFromAppliedRow(row) {
  return {
    invoiceType: row.invoiceType || "电子普通发票",
    titleType: row.titleType || (String(row.invoiceTitle || "").includes("个人") ? "个人" : "企业"),
    titleName: row.invoiceTitle || "",
    taxpayerId: row.taxpayerId && row.taxpayerId !== "-" ? row.taxpayerId : "",
    registeredAddress: row.registeredAddress && row.registeredAddress !== "-" ? row.registeredAddress : "",
    phone: row.phone && row.phone !== "-" ? row.phone : "",
    bank: row.bank && row.bank !== "-" ? row.bank : "",
    bankAccount: row.bankAccount && row.bankAccount !== "-" ? row.bankAccount : "",
    storeName: row.store || "",
    invoiceContent: row.invoiceContent || "商品类别",
    receiverPhone: row.receiverPhone && row.receiverPhone !== "-" ? row.receiverPhone : "",
    receiverEmail: row.receiverEmail && row.receiverEmail !== "-" ? row.receiverEmail : "",
    remark: row.remark === "发票申请已提交，请等待供应商开票。" ? "" : (row.remark || "")
  };
}

function createBuyerPcMallModifyInvoiceFormFromAppliedRow(row) {
  return {
    ...createBuyerPcMallInvoiceFormFromAppliedRow(row),
    invoiceType: "电子普通发票"
  };
}

function createBuyerPcMallBatchItemFromAppliedRow(row, invoiceTitleRows = []) {
  const matchedTitle = invoiceTitleRows.find((titleItem) => titleItem.title === row.invoiceTitle) || null;
  const invoiceFields = matchedTitle
    ? {
      ...createBuyerPcMallBatchOrderInvoiceFields(matchedTitle),
      receiverPhone: row.receiverPhone && row.receiverPhone !== "-" ? row.receiverPhone : buyerPcMallDefaultReceiverPhone,
      receiverEmail: row.receiverEmail && row.receiverEmail !== "-" ? row.receiverEmail : buyerPcMallDefaultReceiverEmail
    }
    : {
      invoiceTitleId: "",
      invoiceTitle: row.invoiceTitle || "",
      invoiceType: row.invoiceType || buyerPcMallBatchInvoiceForm.invoiceType,
      titleType: row.titleType || buyerPcMallBatchInvoiceForm.titleType,
      taxpayerId: row.taxpayerId && row.taxpayerId !== "-" ? row.taxpayerId : "",
      registeredAddress: row.registeredAddress && row.registeredAddress !== "-" ? row.registeredAddress : "",
      phone: row.phone && row.phone !== "-" ? row.phone : "",
      bank: row.bank && row.bank !== "-" ? row.bank : "",
      bankAccount: row.bankAccount && row.bankAccount !== "-" ? row.bankAccount : "",
      receiverPhone: row.receiverPhone && row.receiverPhone !== "-" ? row.receiverPhone : "",
      receiverEmail: row.receiverEmail && row.receiverEmail !== "-" ? row.receiverEmail : ""
    };

  return {
    ...row,
    ...invoiceFields,
    price: row.amount,
    time: row.appliedAt,
    buyerAccount: "nfsq369（ID:13641）",
    needInvoice: normalizeShopInvoiceMode(row.singleInvoice) === "是"
  };
}

const emptyFilters = { status: "全部", dateRange: "", activityName: "", activityId: "", productId: "", specId: "", productName: "" };
const createSpecialPricePageConfig = () => ({
  createLabel: "新增专享价",
  defaultCategory: "专享活动",
  initialFilters: { status: "", activityName: "", startTime: "2026-03-18 00:00:00", endTime: "", activityId: "", buyerGroup: "", buyerId: "" },
  tipLines: [
    "同一个商品规格同一个买家分组在同一个时间段内只能有一个未结束的专享价活动；",
    "专享价不可与其他优惠活动叠加使用；",
    "专享价活动未单独设置运费，则运费按普通商品运费规则收取。"
  ]
});
const marketingPageConfigs = {
  专享价: createSpecialPricePageConfig(),
  专享价2: createSpecialPricePageConfig(),
  限时购1: {
    createLabel: "新增限时购",
    defaultCategory: "常规活动",
    initialFilters: { ...emptyFilters }
  },
  限时购: {
    createLabel: "新增限时购",
    defaultCategory: "店铺专属",
    initialFilters: { ...emptyFilters }
  }
};
const initialCreateForm = { activityName: "", category: "", startTime: "", endTime: "", productKeyword: "", productId: "", onlyUnpricedProducts: false };
const initialPickerFilters = { category: "", productName: "", productId: "" };
const cloneProducts = (products) => JSON.parse(JSON.stringify(products));
const isPrimarySpecialPricePage = (pageName) => pageName === "专享价";
const isSecondarySpecialPricePage = (pageName) => pageName === "专享价2";
const isAnySpecialPricePage = (pageName) => isPrimarySpecialPricePage(pageName) || isSecondarySpecialPricePage(pageName);
const getActiveSpecs = (product) => product.specs.filter((spec) => spec.status === "active");
const hasUnifiedFlashPrice = (product) => String(product.flashPrice || "").trim() !== "";
const hasUnifiedTotalLimit = (product) => String(product.totalLimit || "").trim() !== "";
const hasUnifiedActivityStock = (product) => String(product.activityStock || "").trim() !== "";
const hasValue = (value) => String(value || "").trim() !== "";
const hasSpecLevelFlashPrice = (product) => getActiveSpecs(product).some((spec) => hasValue(spec.flashPrice));
const hasSpecLevelLimitCount = (product) => getActiveSpecs(product).some((spec) => hasValue(spec.limitCount));
const hasSpecLevelActivityStock = (product) => getActiveSpecs(product).some((spec) => hasValue(spec.activityStock));
const getNumericStockValue = (value) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};
const getPriceNumber = (value) => {
  const numericValue = Number.parseFloat(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : null;
};
const formatPriceRange = (value) => {
  if (!Number.isFinite(value)) return "";
  const normalized = Number.isInteger(value) ? String(value) : String(value).replace(/\.?0+$/, "");
  return `¥ ${normalized}`;
};
const sanitizeBuyerDiscountInput = (value, previousValue = "") => {
  let normalizedValue = String(value || "").replace(/[^\d.]/g, "");
  if (!normalizedValue) return "";

  const firstDotIndex = normalizedValue.indexOf(".");
  if (firstDotIndex >= 0) {
    const integerPart = normalizedValue.slice(0, firstDotIndex);
    const decimalPart = normalizedValue.slice(firstDotIndex + 1).replace(/\./g, "").slice(0, 2);
    normalizedValue = `${integerPart}.${decimalPart}`;
  }

  if (normalizedValue.startsWith(".")) return previousValue;
  if (partialBuyerDiscountPattern.test(normalizedValue)) return normalizedValue;
  return previousValue;
};
const isValidBuyerDiscount = (value) => !String(value || "").trim() || finalBuyerDiscountPattern.test(String(value).trim());
const isBuyerDiscountInvalid = (value) => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return false;
  return !finalBuyerDiscountPattern.test(normalizedValue);
};
const buyerImportHeaderRowIndex = 2;
const buyerImportColumns = {
  buyerId: 0,
  groupIds: 1,
  identity: 2,
  discount: 3
};
const getBuyerImportCellValue = (row, index) => String(row?.[index] ?? "").trim();
const isBuyerImportRowEmpty = (row) => (
  !hasValue(getBuyerImportCellValue(row, buyerImportColumns.buyerId))
  && !hasValue(getBuyerImportCellValue(row, buyerImportColumns.groupIds))
  && !hasValue(getBuyerImportCellValue(row, buyerImportColumns.identity))
  && !hasValue(getBuyerImportCellValue(row, buyerImportColumns.discount))
);
const parseBuyerImportGroupIds = (value) => String(value || "").split(/[，,]+/).map((item) => item.trim()).filter(Boolean);
const formatBuyerGroupNames = (value) => {
  const groupIds = parseBuyerImportGroupIds(value);
  return groupIds.map((item) => buyerGroupNameById[item] || item).join("、");
};
const validateBuyerImportRow = (row, existingIds, importedIds) => {
  const buyerId = getBuyerImportCellValue(row, buyerImportColumns.buyerId);
  const groupValue = getBuyerImportCellValue(row, buyerImportColumns.groupIds);
  const identity = getBuyerImportCellValue(row, buyerImportColumns.identity);
  const discount = getBuyerImportCellValue(row, buyerImportColumns.discount);
  const groupIds = parseBuyerImportGroupIds(groupValue);
  const errors = [];

  if (!buyerId) {
    errors.push("买家ID必填");
  } else if (!/^\d+$/.test(buyerId)) {
    errors.push("买家ID只能为数字");
  } else if (existingIds.has(buyerId) || importedIds.has(buyerId)) {
    errors.push("买家ID重复");
  }

  if (!groupValue) {
    errors.push("买家分组必填");
  } else if (groupIds.length === 0 || groupIds.some((item) => !/^\d+$/.test(item))) {
    errors.push("买家分组只能为数字");
  } else if (groupIds.some((item) => !buyerGroupNameById[item])) {
    errors.push(`买家分组仅支持${buyerGroups.map((item) => item.id).join("、")}`);
  }

  if (identity.length > 100) {
    errors.push("买家身份超过100字符");
  }

  if (hasValue(discount) && !isValidBuyerDiscount(discount)) {
    errors.push("买家折扣不在5.00~10之间");
  }

  return {
    buyerId,
    group: groupIds.join(","),
    identity,
    discount,
    isValid: errors.length === 0,
    errors
  };
};
const getProductFlashPriceDisplay = (product) => {
  if (hasUnifiedFlashPrice(product)) return product.flashPrice;

  const specFlashPrices = getActiveSpecs(product).map((spec) => getPriceNumber(spec.flashPrice)).filter((value) => value !== null);
  if (specFlashPrices.length === 0) return "";

  const minPrice = Math.min(...specFlashPrices);
  const maxPrice = Math.max(...specFlashPrices);
  if (minPrice === maxPrice) return formatPriceRange(minPrice);
  return `${formatPriceRange(minPrice)}~${Number.isInteger(maxPrice) ? String(maxPrice) : String(maxPrice).replace(/\.?0+$/, "")}`;
};
const getProductTotalLimitDisplay = (product) => {
  if (hasUnifiedTotalLimit(product)) return product.totalLimit;
  const total = getActiveSpecs(product).reduce((sum, spec) => sum + getNumericStockValue(spec.limitCount), 0);
  return total > 0 ? String(total) : "";
};
const getProductTotalLimitInputValue = (product, isSpecialPricePage = false) => {
  if (!hasSpecLevelLimitCount(product)) return product.totalLimit;
  return isSpecialPricePage ? product.totalLimit : getProductTotalLimitDisplay(product);
};
const getProductActivityStockDisplay = (product) => {
  if (hasUnifiedActivityStock(product)) return product.activityStock;
  const total = getActiveSpecs(product).reduce((sum, spec) => sum + getNumericStockValue(spec.activityStock), 0);
  return total > 0 ? String(total) : "";
};
const getProductStockDisplay = (product) => {
  const total = getActiveSpecs(product).reduce((sum, spec) => sum + getNumericStockValue(spec.stock), 0);
  return total > 0 ? String(total) : "";
};
const initialProductFieldEditModes = { flashPrice: false, totalLimit: false, activityStock: false };
const editHeaderIcon = "data:image/svg+xml,%3Csvg%20t%3D%221775524476153%22%20class%3D%22icon%22%20viewBox%3D%220%200%201024%201024%22%20version%3D%221.1%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20p-id%3D%224620%22%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%3E%3Cpath%20d%3D%22M598.8864%20153.6v51.2H256a51.2%2051.2%200%200%200-51.2%2051.2v512a51.2%2051.2%200%200%200%2051.2%2051.2h512a51.2%2051.2%200%200%200%2051.2-51.2V435.6608h51.2V768a102.4%20102.4%200%200%201-102.4%20102.4H256a102.4%20102.4%200%200%201-102.4-102.4V256a102.4%20102.4%200%200%201%20102.4-102.4h342.8864zM460.8%20551.8336L859.0336%20153.6l36.1984%2036.1984-398.2336%20398.2336L460.8%20551.8336z%22%20fill%3D%22%23707070%22%20p-id%3D%224621%22%3E%3C/path%3E%3C/svg%3E";
const questionHeaderIcon = "data:image/svg+xml,%3Csvg%20t%3D%221775542653160%22%20class%3D%22icon%22%20viewBox%3D%220%200%201024%201024%22%20version%3D%221.1%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20p-id%3D%224947%22%20width%3D%2216%22%20height%3D%2216%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%3E%3Cpath%20d%3D%22M512%200C227.555556%200%200%20227.555556%200%20512s227.555556%20512%20512%20512%20512-227.555556%20512-512-227.555556-512-512-512z%20m45.511111%20853.333333c-17.066667%2011.377778-28.444444%2017.066667-51.2%2017.066667-17.066667%200-34.133333-5.688889-51.2-17.066667-17.066667-11.377778-22.755556-28.444444-22.755555-51.2s5.688889-34.133333%2022.755555-51.2c11.377778-11.377778%2028.444444-22.755556%2051.2-22.755555s34.133333%205.688889%2051.2%2022.755555c11.377778%2011.377778%2022.755556%2028.444444%2022.755556%2051.2s-11.377778%2039.822222-22.755556%2051.2z%20m176.355556-443.733333c-11.377778%2022.755556-22.755556%2039.822222-39.822223%2051.2-17.066667%2017.066667-39.822222%2039.822222-79.644444%2073.955556l-28.444444%2028.444444c-5.688889%205.688889-11.377778%2017.066667-17.066667%2022.755556v17.066666c0%205.688889-5.688889%2017.066667-5.688889%2034.133334-5.688889%2034.133333-22.755556%2051.2-56.888889%2051.2-17.066667%200-28.444444-5.688889-39.822222-17.066667-11.377778-11.377778-17.066667-28.444444-17.066667-45.511111%200-28.444444%205.688889-51.2%2011.377778-68.266667%205.688889-17.066667%2017.066667-34.133333%2034.133333-51.2%2011.377778-17.066667%2034.133333-34.133333%2056.888889-51.2%2022.755556-17.066667%2034.133333-28.444444%2045.511111-39.822222s17.066667-17.066667%2022.755556-28.444445c5.688889-11.377778%2011.377778-22.755556%2011.377778-34.133333%200-22.755556-11.377778-45.511111-28.444445-62.577778-17.066667-17.066667-45.511111-28.444444-73.955555-28.444444-45.511111-11.377778-73.955556%200-85.333334%2017.066667-17.066667%2017.066667-34.133333%2045.511111-45.511111%2079.644444-11.377778%2034.133333-28.444444%2051.2-62.577778%2051.2-17.066667%200-34.133333-5.688889-45.511111-17.066667-11.377778-11.377778-17.066667-28.444444-17.066666-39.822222%200-28.444444%2011.377778-62.577778%2028.444444-91.022222s45.511111-56.888889%2085.333333-79.644445c39.822222-22.755556%2079.644444-28.444444%20130.844445-28.444444%2045.511111%200%2085.333333%205.688889%20119.466667%2022.755556%2034.133333%2017.066667%2062.577778%2039.822222%2079.644444%2068.266666%2022.755556%2028.444444%2034.133333%2062.577778%2034.133333%2096.711111%200%2028.444444-5.688889%2051.2-17.066666%2068.266667z%22%20fill%3D%22%23707070%22%20p-id%3D%224948%22%3E%3C/path%3E%3C/svg%3E";
const syncProductActivityStock = (product, nextTotalValue) => {
  return {
    ...product,
    activityStock: nextTotalValue
  };
};

function EditableHeader({ label, suffixIcon, suffixTooltip }) {
  return (
    <span className="editable-th-content">
      <span className="editable-th-label">
        <span>{label}</span>
        {suffixIcon ? (
          <span className="header-suffix-wrap">
            <img className="header-suffix-icon" src={suffixIcon} alt="" aria-hidden="true" />
            {suffixTooltip ? <span className="header-suffix-tooltip">{suffixTooltip}</span> : null}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function HeaderWithIcon({ label, onIconClick, isActive = false }) {
  return (
    <span className="editable-th-content">
      <span>{label}</span>
      {onIconClick ? (
        <button type="button" className={`editable-th-icon ${isActive ? "is-active" : ""}`} onClick={onIconClick} aria-label={`编辑${label}`}>
          <img src={editHeaderIcon} alt="" />
        </button>
      ) : (
        <span className="editable-th-icon" aria-hidden="true">
          <img src={editHeaderIcon} alt="" />
        </span>
      )}
    </span>
  );
}

function EditableCellInput({ label, value, onChange, placeholder, locked, lockedDisplay, showEditWhenLocked = false, isEditMode, onToggleEdit, inputMode = "text", hasError = false }) {
  const displayValue = locked && hasValue(lockedDisplay) ? lockedDisplay : value;
  const showEditButton = locked && (hasValue(lockedDisplay) || showEditWhenLocked);

  return (
    <span className="editable-cell-input">
      {locked && hasValue(lockedDisplay) ? (
        <span className="limit-locked-message">{lockedDisplay}</span>
      ) : (
        <input
          className={`limit-input ${locked ? "is-locked" : ""} ${hasError ? "is-error" : ""}`}
          value={displayValue}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={locked}
          tabIndex={locked ? -1 : 0}
          inputMode={inputMode}
        />
      )}
      {showEditButton ? (
        <button type="button" className={`editable-th-icon ${isEditMode ? "is-active" : ""}`} onClick={onToggleEdit} aria-label={`编辑${label}`}>
          <img src={editHeaderIcon} alt="" />
        </button>
      ) : null}
    </span>
  );
}

function createInitialProducts(defaultTotalLimit = "0") {
  return [
    {
      id: "123456",
      name: "百岁山天然矿泉水570m",
      marketPrice: "￥30~50",
      flashPrice: "￥20~40",
      totalLimit: defaultTotalLimit,
      activityStock: "",
      stock: 100,
      image: "百",
      specs: [
        { id: "455008", name: "深灰色,160/80(XS),版本1", stock: 100, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "100", status: "active" },
        { id: "455009a", name: "深灰色,160/80(XS),版本2", status: "merged", mergedText: "该规格已参与【XXX】限时购" },
        { id: "455009", name: "深灰色,160/80(XS),版本3", stock: 88, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "88", status: "active" },
        { id: "455010", name: "深灰色,160/80(XS),版本4", stock: 76, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "76", status: "active" },
        { id: "455011", name: "深灰色,160/80(XS),版本5", stock: 91, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "91", status: "active" },
        { id: "455012", name: "深灰色,160/80(XS),版本6", stock: 64, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "64", status: "active" }
      ]
    },
    {
      id: "162101",
      name: "景田饮用纯净水560ml",
      marketPrice: "￥30",
      flashPrice: "",
      totalLimit: defaultTotalLimit,
      activityStock: "",
      stock: 100,
      image: "景",
      specs: [
        { id: "562101", name: "默认规格", stock: 100, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "100", status: "active" }
      ]
    }
  ];
}

function createEditProducts(activity, pageName) {
  const products = cloneProducts(createInitialProducts(isAnySpecialPricePage(pageName) ? "1" : "0"));
  const targetCount = Math.max(1, Math.min(products.length, activity.goodsCount || products.length));

  return products.slice(0, targetCount);
}

function createDetailSpec(id, name, stock, marketPrice, flashPrice, activityStock, limitCount = "100") {
  return { id, name, stock, marketPrice, flashPrice, activityStock, limitCount, status: "active" };
}

const detailActivityConfigs = {
  限时购: {
    "2101": {
      category: "店铺专属",
      rule: "按商品限购",
      rows: [
        {
          id: "123456",
          name: "百岁山天然矿泉水570m",
          marketPrice: "￥30~50",
          flashPrice: "￥20~40",
          totalLimit: "100",
          activityStock: "100",
          image: "百",
          specs: [
            createDetailSpec("455008", "默认装 570ml*12", 100, "￥30", "￥20", "60"),
            createDetailSpec("455009", "家庭装 570ml*24", 88, "￥40", "￥28", "40")
          ]
        },
        {
          id: "162101",
          name: "景田饮用纯净水560ml",
          marketPrice: "￥30",
          flashPrice: "￥20",
          totalLimit: "100",
          activityStock: "100",
          image: "景",
          specs: [
            createDetailSpec("562101", "默认规格", 100, "￥30", "￥20", "100")
          ]
        }
      ]
    },
    "2102": {
      category: "五一大促",
      rule: "按商品限购",
      rows: [
        {
          id: "123456",
          name: "百岁山天然矿泉水570m",
          marketPrice: "￥30~50",
          flashPrice: "￥18~35",
          totalLimit: "80",
          activityStock: "80",
          image: "百",
          specs: [
            createDetailSpec("455010", "节日装 570ml*12", 76, "￥30", "￥18", "30", "80"),
            createDetailSpec("455011", "节日装 570ml*24", 91, "￥50", "￥35", "50", "80")
          ]
        },
        {
          id: "162101",
          name: "景田饮用纯净水560ml",
          marketPrice: "￥30",
          flashPrice: "￥19",
          totalLimit: "60",
          activityStock: "60",
          image: "景",
          specs: [
            createDetailSpec("562102", "五一活动规格", 60, "￥30", "￥19", "60", "60")
          ]
        },
        {
          id: "173300",
          name: "统一冰红茶500ml",
          marketPrice: "￥45",
          flashPrice: "￥32",
          totalLimit: "120",
          activityStock: "120",
          image: "统",
          specs: [
            createDetailSpec("733001", "500ml*15", 120, "￥45", "￥32", "120", "120")
          ]
        }
      ]
    },
    "2103": {
      category: "清仓专场",
      rule: "按商品限购",
      rows: [
        {
          id: "193001",
          name: "纸巾家庭装 24 包",
          marketPrice: "￥59",
          flashPrice: "￥39",
          totalLimit: "30",
          activityStock: "30",
          image: "纸",
          specs: [
            createDetailSpec("930011", "家庭装", 30, "￥59", "￥39", "30", "30")
          ]
        }
      ]
    }
  },
  限时购1: {
    "1111": {
      category: "大促活动",
      rule: "按商品限购",
      rows: [
        {
          id: "800101",
          name: "双11爆款抽纸 3 层",
          marketPrice: "￥69",
          flashPrice: "￥49",
          totalLimit: "150",
          activityStock: "150",
          image: "抽",
          specs: [
            createDetailSpec("801001", "18 包/提", 150, "￥69", "￥49", "150", "150")
          ]
        },
        {
          id: "800102",
          name: "百岁山天然矿泉水570m",
          marketPrice: "￥30~50",
          flashPrice: "￥21~36",
          totalLimit: "120",
          activityStock: "120",
          image: "百",
          specs: [
            createDetailSpec("801002", "双11组合装 12 瓶", 70, "￥30", "￥21", "70", "120"),
            createDetailSpec("801003", "双11组合装 24 瓶", 50, "￥50", "￥36", "50", "120")
          ]
        }
      ]
    },
    "0001": {
      category: "节日活动",
      rule: "按商品限购",
      rows: [
        {
          id: "600101",
          name: "国庆零食礼包",
          marketPrice: "￥88",
          flashPrice: "￥59",
          totalLimit: "50",
          activityStock: "50",
          image: "礼",
          specs: [
            createDetailSpec("601001", "标准礼盒", 50, "￥88", "￥59", "50", "50")
          ]
        },
        {
          id: "600102",
          name: "景田饮用纯净水560ml",
          marketPrice: "￥30",
          flashPrice: "￥22",
          totalLimit: "80",
          activityStock: "80",
          image: "景",
          specs: [
            createDetailSpec("601002", "假日补水装", 80, "￥30", "￥22", "80", "80")
          ]
        }
      ]
    },
    "0011": {
      category: "常规活动",
      rule: "按商品限购",
      rows: [
        {
          id: "123456",
          name: "百岁山天然矿泉水570m",
          marketPrice: "￥30~50",
          flashPrice: "￥20~40",
          totalLimit: "100",
          activityStock: "100",
          image: "百",
          specs: [
            createDetailSpec("455008", "常规装 570ml*12", 60, "￥30", "￥20", "60"),
            createDetailSpec("455009", "常规装 570ml*24", 40, "￥50", "￥40", "40")
          ]
        },
        {
          id: "162101",
          name: "景田饮用纯净水560ml",
          marketPrice: "￥30",
          flashPrice: "￥20",
          totalLimit: "100",
          activityStock: "100",
          image: "景",
          specs: [
            createDetailSpec("562101", "默认规格", 100, "￥30", "￥20", "100")
          ]
        }
      ]
    },
    "0012": {
      category: "节日活动",
      rule: "按商品限购",
      rows: [
        {
          id: "990001",
          name: "元旦福袋礼盒",
          marketPrice: "￥99",
          flashPrice: "￥66",
          totalLimit: "20",
          activityStock: "20",
          image: "福",
          specs: [
            createDetailSpec("990011", "新年礼盒", 20, "￥99", "￥66", "20", "20")
          ]
        }
      ]
    }
  }
};

function createInitialMarketingPageState(pageName) {
  const pageConfig = marketingPageConfigs[pageName] || marketingPageConfigs.限时购1;
  return {
    filters: { ...(pageConfig.initialFilters || emptyFilters) },
    page: 1,
    pageSize: 20,
    detailPage: 1,
    detailPageSize: 10,
    createForm: { ...initialCreateForm },
    pickerFilters: { ...initialPickerFilters },
    selectedProducts: [],
    selectedGoodsIds: [],
    selectedPickerProductIds: [],
    selectedSpecIdsByProduct: {},
    productFieldEditModesByProduct: {},
    productFieldErrorsByProduct: {},
    detailActivity: null,
    activities: [...(seedActivitiesByPage[pageName] || [])]
  };
}

function createDetailActivity(pageName, activity) {
  if (!activity) return null;

  const config = detailActivityConfigs[pageName]?.[activity.id];
  const rows = (config?.rows || []).map((row) => ({
    ...row,
    selectedSpecCount: row.specs.length,
    specSummary: `共 ${row.specs.length} 个 规格`
  }));

  return {
    ...activity,
    category: config?.category || marketingPageConfigs[pageName]?.defaultCategory || (pageName === "限时购" ? "店铺专属" : "常规活动"),
    rule: config?.rule || "按商品限购",
    rows
  };
}

function createInitialMarketingStates() {
  return marketingPageNames.reduce((result, pageName) => {
    result[pageName] = createInitialMarketingPageState(pageName);
    return result;
  }, {});
}

function SidebarIcon({ type }) {
  const commonProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };

  switch (type) {
    case "home":
      return <svg {...commonProps}><path d="M3.2 7.1 8 3.5l4.8 3.6v5.1H9.7V9.5H6.3v2.7H3.2V7.1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M2.4 7.6 8 3l5.6 4.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "goods":
      return <svg {...commonProps}><rect x="3" y="4.2" width="10" height="8.6" rx="1.6" stroke="currentColor" strokeWidth="1.2" /><path d="M5.1 6.1a2.9 2.9 0 0 1 5.8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "trade":
      return <svg {...commonProps}><path d="M4 2.8h5.3l2.7 2.7v7.7H4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M9.3 2.8v2.7H12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6 8h4M6 10.4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "buyer":
      return <svg {...commonProps}><circle cx="8" cy="5.2" r="2.1" stroke="currentColor" strokeWidth="1.2" /><path d="M4.3 12.6a3.7 3.7 0 0 1 7.4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "shop":
      return <svg {...commonProps}><path d="M3.1 5.3h9.8l-1 2.4H4.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M4.3 7.7h7.4v4.5H4.3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6.2 9.4h1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "website":
      return <svg {...commonProps}><rect x="2.6" y="3.1" width="10.8" height="9.8" rx="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M2.9 5.7h10.2M5.5 10.2h2.2M9.1 10.2h1.4M5 7.8h5.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "system":
      return <svg {...commonProps}><circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.2" /><path d="M8 2.9v1.3M8 11.8v1.3M13.1 8h-1.3M4.2 8H2.9M11.6 4.4l-.9.9M5.3 10.7l-.9.9M11.6 11.6l-.9-.9M5.3 5.3l-.9-.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "stats":
      return <svg {...commonProps}><path d="M3.4 12.4V8.6M8 12.4V4.9M12.6 12.4V6.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M2.8 12.4h10.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "marketing":
      return <svg {...commonProps}><path d="M5.2 3.2h5.6v9.6l-2.8-1.7-2.8 1.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><circle cx="8" cy="6.2" r="1.2" stroke="currentColor" strokeWidth="1.2" /></svg>;
    case "miniapp":
      return <svg {...commonProps}><circle cx="7" cy="8" r="4.2" stroke="currentColor" strokeWidth="1.2" /><path d="M9.5 6.2a2.6 2.6 0 0 0-3.8 3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="10.9" cy="5.3" r="1.1" stroke="currentColor" strokeWidth="1.2" /></svg>;
    case "service":
      return <svg {...commonProps}><path d="M3.3 9.6a4.7 4.7 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><rect x="2.4" y="8.9" width="2.1" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="11.5" y="8.9" width="2.1" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M8 12.1v1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    default:
      return null;
  }
}

function TopActionIcon({ type }) {
  const commonProps = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };

  switch (type) {
    case "platform":
      return <svg {...commonProps}><rect x="2.6" y="3" width="10.8" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M5.2 6h5.6M5.2 8.3h5.6M5.2 10.6h3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "supplier-admin":
      return <svg {...commonProps}><path d="M3.1 5.3h9.8l-1 2.4H4.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M4.3 7.7h7.4v4.5H4.3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6.2 9.4h1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "summary-sales":
      return <svg {...commonProps}><rect x="2.2" y="3.2" width="11.6" height="9.6" rx="1.4" stroke="currentColor" strokeWidth="1.1" /><path d="M4.6 10.5V8.6M7.4 10.5V6.7M10.2 10.5V5M13 10.5H3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
    case "summary-merchant":
      return <svg {...commonProps}><path d="M3.1 11.7a3.9 3.9 0 0 1 7.8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="5.4" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M11.6 6.2h2.4M12.8 5v2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "summary-store":
      return <svg {...commonProps}><path d="M2.8 5.6h10.4l-.9 2.2H3.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M4.1 7.8h7.8v4.1H4.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6.1 9.5h1.7M9.2 9.5h.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "pc-mall":
      return <svg {...commonProps}><rect x="2.1" y="2.7" width="11.8" height="8.2" rx="1.2" stroke="currentColor" strokeWidth="1.2" /><path d="M5.2 13.1h5.6M8 10.9v2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "miniapp-mall":
      return <svg {...commonProps}><circle cx="7" cy="8" r="4.1" stroke="currentColor" strokeWidth="1.2" /><path d="M9.4 6.2a2.5 2.5 0 0 0-3.7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="10.8" cy="5.4" r="1.1" stroke="currentColor" strokeWidth="1.2" /></svg>;
    case "service":
      return <svg {...commonProps}><path d="M3.3 9.6a4.7 4.7 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><rect x="2.4" y="8.9" width="2.1" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="11.5" y="8.9" width="2.1" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M8 12.1v1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "todo":
      return <svg {...commonProps}><rect x="3" y="2.8" width="10" height="10.4" rx="1.3" stroke="currentColor" strokeWidth="1.2" /><path d="M5.5 6.2h5M5.5 9h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "export":
      return <svg {...commonProps}><path d="M8 2.8v6.1M5.8 6.8 8 9l2.2-2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.2 10.2v1.6c0 .7.5 1.2 1.2 1.2h7.2c.7 0 1.2-.5 1.2-1.2v-1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
    case "logout":
      return <svg {...commonProps}><path d="M6.5 3.2H4.4c-.7 0-1.2.5-1.2 1.2v7.2c0 .7.5 1.2 1.2 1.2h2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M8.1 5.2 10.9 8l-2.8 2.8M10.9 8H6.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return null;
  }
}

function formatPcMallDateRangeValue(startDate, endDate) {
  if (startDate && endDate) return `${startDate} ～ ${endDate}`;
  if (startDate) return `${startDate} ～`;
  if (endDate) return `～ ${endDate}`;
  return "";
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatPcMallCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPcMallCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    const date = new Date(year, month - 1, daysInPrevMonth - index);
    cells.push({ key: formatPcMallCalendarDate(date), label: date.getDate(), date, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ key: formatPcMallCalendarDate(date), label: day, date, isCurrentMonth: true });
  }

  while (cells.length < 42) {
    const day = cells.length - (firstWeekday + daysInMonth) + 1;
    const date = new Date(year, month + 1, day);
    cells.push({ key: formatPcMallCalendarDate(date), label: date.getDate(), date, isCurrentMonth: false });
  }

  return cells;
}

function PcMallRangeCalendar({ monthDate, onChangeMonth, startDate, endDate, onSelectDate }) {
  const monthLabel = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const startValue = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const endValue = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const days = buildPcMallCalendarDays(monthDate);

  return (
    <div className="pc-mall-range-calendar">
      <div className="pc-mall-range-calendar-head">
        <button type="button" onClick={() => onChangeMonth(-1)}>‹</button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={() => onChangeMonth(1)}>›</button>
      </div>
      <div className="pc-mall-range-calendar-weekdays">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="pc-mall-range-calendar-grid">
        {days.map((item) => {
          const dateValue = item.date.getTime();
          const isStart = startValue ? dateValue === startValue.getTime() : false;
          const isEnd = endValue ? dateValue === endValue.getTime() : false;
          const isInRange = startValue && endValue ? dateValue > startValue.getTime() && dateValue < endValue.getTime() : false;

          return (
            <button
              className={`pc-mall-range-day ${item.isCurrentMonth ? "" : "is-outside"} ${isInRange ? "is-in-range" : ""} ${isStart || isEnd ? "is-selected" : ""}`}
              key={item.key}
              type="button"
              onClick={() => onSelectDate(formatPcMallCalendarDate(item.date))}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PcMallDateRangeField({ placeholder, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [innerValue, setInnerValue] = useState({ startDate: "", endDate: "" });
  const [viewMonth, setViewMonth] = useState(() => getMonthStart(new Date()));
  const fieldRef = useRef(null);
  const rangeValue = value ?? innerValue;
  const startDate = rangeValue?.startDate || "";
  const endDate = rangeValue?.endDate || "";
  const displayValue = formatPcMallDateRangeValue(startDate, endDate);

  const updateRangeValue = (nextValue) => {
    if (!value) {
      setInnerValue(nextValue);
    }
    onChange?.(nextValue);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!fieldRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const handleSelectDate = (dateValue) => {
    if (!startDate || (startDate && endDate)) {
      updateRangeValue({ startDate: dateValue, endDate: "" });
      return;
    }

    if (dateValue < startDate) {
      updateRangeValue({ startDate: dateValue, endDate: "" });
      return;
    }

    updateRangeValue({ startDate, endDate: dateValue });
  };

  return (
    <div className={`pc-mall-date-field ${isOpen ? "is-open" : ""}`} ref={fieldRef}>
      <button className="pc-mall-date-trigger" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span className={`pc-mall-date-trigger-text ${displayValue ? "has-value" : ""}`}>{displayValue || placeholder}</span>
        <i>◫</i>
      </button>
      {isOpen ? (
        <div className="pc-mall-date-popover">
          <div className="pc-mall-date-popover-summary">
            <span>{startDate || "开始日期"}</span>
            <em>至</em>
            <span>{endDate || "结束日期"}</span>
          </div>
          <PcMallRangeCalendar
            monthDate={viewMonth}
            onChangeMonth={(offset) => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))}
            startDate={startDate}
            endDate={endDate}
            onSelectDate={handleSelectDate}
          />
          <div className="pc-mall-date-popover-actions">
            <button className="pc-mall-btn" type="button" onClick={() => updateRangeValue({ startDate: "", endDate: "" })}>清空</button>
            <button className="pc-mall-btn pc-mall-btn-primary" type="button" onClick={() => setIsOpen(false)}>确定</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizePcMallBatchQueryValue(value) {
  return String(value || "")
    .replace(/[，；;]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePcMallBatchQueryList(value) {
  const normalizedValue = normalizePcMallBatchQueryValue(value);
  if (!normalizedValue) return [];
  return [...new Set(normalizedValue.split(" ").map((item) => item.trim()).filter(Boolean))];
}

function PcMallBatchQueryField({ value, onChange, onOpenBatchQueryModal, placeholder = "输入开票批次" }) {
  return (
    <div className="pc-mall-input-with-icon pc-mall-batch-query-field">
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <button className="pc-mall-batch-query-icon-btn" type="button" aria-label="批量查询开票批次" title="批量查询开票批次" onClick={onOpenBatchQueryModal}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.25 11.85V12.75H4.15L10.9 6L10 5.1L3.25 11.85Z" />
          <path d="M11.55 5.35L10.65 4.45L11.4 3.7C11.8 3.3 12.45 3.3 12.85 3.7L13.25 4.1C13.65 4.5 13.65 5.15 13.25 5.55L12.5 6.3L11.55 5.35Z" />
          <path d="M3 13H13" />
        </svg>
      </button>
    </div>
  );
}

function PcMallBatchQueryModal({ title, value, onChange, onClose, onConfirm, maxLength = 100 }) {
  const currentLength = String(value || "").length;

  return (
    <div className="pc-mall-batch-query-modal-overlay">
      <div className="pc-mall-batch-query-modal">
        <div className="pc-mall-batch-query-modal-head">
          <div>
            <h3>{title}</h3>
            <p>仅支持精确匹配</p>
          </div>
          <button className="pc-mall-batch-query-modal-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="pc-mall-batch-query-modal-body">
          <textarea
            value={value}
            maxLength={maxLength}
            onChange={(event) => onChange(event.target.value)}
            placeholder="多个开票批次使用空格、回车或逗号分割，例如 KP202604-001 KP202604-002"
          />
          <div className="pc-mall-batch-query-modal-count">{`${currentLength}/${maxLength}`}</div>
        </div>
        <div className="pc-mall-batch-query-modal-foot">
          <button className="pc-mall-btn" type="button" onClick={onClose}>取消</button>
          <button className="pc-mall-btn pc-mall-btn-dark" type="button" onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}

function PcMallMultiSelect({ options, values, onChange, placeholder = "请选择" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const handleToggleOption = (option) => {
    onChange(
      values.includes(option)
        ? values.filter((item) => item !== option)
        : [...values, option]
    );
  };

  return (
    <div className={`pc-mall-multi-select ${isOpen ? "is-open" : ""}`} ref={wrapperRef}>
      <button className="pc-mall-multi-select-trigger" type="button" onClick={() => setIsOpen((current) => !current)}>
        {values.length > 0 ? (
          <span className="pc-mall-multi-select-tags">
            {values.map((value) => (
              <span className="pc-mall-multi-select-tag" key={value}>
                <span className="pc-mall-multi-select-tag-label">{value}</span>
                <span
                  aria-label={`删除${value}`}
                  className="pc-mall-multi-select-tag-remove"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleToggleOption(value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleOption(value);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  ×
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="pc-mall-multi-select-text">{placeholder}</span>
        )}
        <i aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="pc-mall-multi-select-menu">
          {options.map((option) => (
            <label className="pc-mall-multi-select-option" key={option}>
              <input type="checkbox" checked={values.includes(option)} onChange={() => handleToggleOption(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PcMallSearchSelect({ options, values, onChange, searchValue, onSearchChange, placeholder = "请选择" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const keyword = searchValue.trim().toLowerCase();
  const filteredOptions = options.filter((option) => (
    !keyword || option.searchText.toLowerCase().includes(keyword)
  ));

  const handleToggleOption = (optionValue) => {
    onChange(
      values.includes(optionValue)
        ? values.filter((item) => item !== optionValue)
        : [...values, optionValue]
    );
  };

  return (
    <div className={`pc-mall-search-select ${isOpen ? "is-open" : ""}`} ref={wrapperRef}>
      <div className="pc-mall-search-select-trigger">
        <div className="pc-mall-search-select-input-wrap" onClick={() => setIsOpen(true)} role="presentation">
          {values.length > 0 ? (
            <span className="pc-mall-search-select-tags">
              {values.map((value) => (
                <span className="pc-mall-search-select-tag" key={value}>
                  <span className="pc-mall-search-select-tag-label">{value}</span>
                  <span
                    aria-label={`删除${value}`}
                    className="pc-mall-search-select-tag-remove"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleOption(value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        handleToggleOption(value);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    ×
                  </span>
                </span>
              ))}
            </span>
          ) : null}
          <input
            placeholder={values.length > 0 ? "" : placeholder}
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>
        <i aria-hidden="true" />
      </div>
      {isOpen ? (
        <div className="pc-mall-search-select-menu">
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <label className="pc-mall-search-select-option" key={`${option.value}-${option.meta || ""}`}>
              <input type="checkbox" checked={values.includes(option.value)} onChange={() => handleToggleOption(option.value)} />
              <span>{option.label}</span>
              {option.meta ? <strong>{option.meta}</strong> : null}
            </label>
          )) : (
            <div className="pc-mall-search-select-empty">暂无匹配门店</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BuyerPcMallProductDetailModal({ row, onClose }) {
  if (!row) return null;

  const detailItems = buyerPcMallProductDetailSeed[row.orderNo] || [{
    sku: row.orderNo,
    product: row.product,
    spec: row.spec,
    quantity: "1",
    unitPrice: row.price,
    subtotal: row.price
  }];

  return (
    <div className="modal-overlay pc-mall-detail-overlay" onClick={onClose} role="presentation">
      <div className="pc-mall-detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-mall-detail-title">
        <div className="pc-mall-detail-head">
          <div>
            <h3 id="pc-mall-detail-title">商品明细</h3>
            <p>{`订单号：${row.orderNo}`}</p>
          </div>
          <button className="pc-mall-detail-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="pc-mall-detail-table-wrap">
          <table className="pc-mall-detail-table">
            <thead>
              <tr>
                <th>商品编码</th>
                <th>商品名称</th>
                <th>规格</th>
                <th>数量</th>
                <th>单价</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              {detailItems.map((item) => (
                <tr key={`${row.orderNo}-${item.sku}`}>
                  <td>{item.sku}</td>
                  <td>{item.product}</td>
                  <td>{item.spec}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pc-mall-detail-foot">
          <button className="pc-mall-btn" type="button" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

function BuyerPcMallInvoiceActionModal({ title, message, confirmText = "确定", onClose, onConfirm }) {
  return (
    <div className="home-invoice-alert-overlay" onClick={onClose} role="presentation">
      <div className="home-invoice-alert-dialog pc-mall-invoice-action-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-mall-invoice-action-title">
        <div className="pc-mall-invoice-action-body">
          <h3 className="pc-mall-invoice-action-title" id="pc-mall-invoice-action-title">{title}</h3>
          <p className="home-invoice-alert-message pc-mall-invoice-action-message">{message}</p>
        </div>
        <div className="pc-mall-invoice-action-foot">
          <button className="pc-mall-btn" type="button" onClick={onClose}>取消</button>
          <button className="home-invoice-alert-action" type="button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function BuyerPcMallInvoiceDetailPage({ detail, onBack, onPreview, onModifyInvoiceInfo, onRevokeApplication }) {
  if (!detail) return null;

  return (
    <>
      {detail.sourceType === "applied" ? (
        <section className="content-card pc-mall-detail-action-bar">
          <div className="pc-mall-detail-action-inner">
            <div className="pc-mall-detail-action-main">
              <div className="pc-mall-detail-action-heading">
                <div className="pc-mall-detail-action-title">发票详情</div>
              </div>
              <div className="pc-mall-detail-action-buttons">
                {detail.canModifyInvoiceInfo ? (
                  <div className="pc-mall-detail-action-tip">
                    <span className="pc-mall-detail-action-tip-icon">!</span>
                    <span>温馨提示：仅能支持修改一次开票信息</span>
                  </div>
                ) : (
                  <div className="pc-mall-detail-action-tip">
                    <span className="pc-mall-detail-action-tip-icon">!</span>
                    <span>{`您于${detail.modifiedAt || "-"}修改开票信息，无法再次修改`}</span>
                  </div>
                )}
                <button className="pc-mall-detail-primary-btn" type="button" onClick={onModifyInvoiceInfo} disabled={!detail.canModifyInvoiceInfo}>修改开票信息</button>
                <button className="pc-mall-detail-secondary-btn" type="button" onClick={onRevokeApplication}>撤销申请</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="content-card shop-invoice-detail-card">
        <div className="shop-invoice-detail-section">
          <div className="shop-invoice-detail-title">
            <span>发票信息</span>
            <button className="shop-invoice-detail-return" type="button" onClick={onBack}>← 返回</button>
          </div>
          <div className="shop-invoice-detail-info-grid">
            <div className="shop-invoice-detail-info-row"><span>开票状态</span><strong className="shop-invoice-status-detail"><span className={`shop-invoice-mini-tag is-${detail.invoiceInfo.invoiceStatusTone || "dark"}`}>{detail.invoiceInfo.invoiceStatus}</span>{detail.invoiceInfo.statusExtraText ? <span className="shop-invoice-status-extra">{detail.invoiceInfo.statusExtraText}</span> : null}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>发票类型</span><strong className="shop-invoice-status-detail">{detail.invoiceInfo.invoiceType}{detail.invoiceInfo.invoiceTypeExtraText ? <span className="shop-invoice-detail-alert">{detail.invoiceInfo.invoiceTypeExtraText}</span> : null}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>发票内容</span><strong>{detail.invoiceInfo.invoiceContent || "商品类别"}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>申请时间</span><strong>{detail.invoiceInfo.appliedAt}</strong></div>
            <div className="shop-invoice-detail-info-row">
              <span>发票号码</span>
              <strong className="shop-invoice-detail-inline-actions">
                <span>{detail.invoiceInfo.invoiceNo}</span>
                {detail.invoiceInfo.canPreviewPdf ? (
                  <>
                    <button className="shop-invoice-preview-link" type="button" onClick={onPreview}>预览发票</button>
                    <button className="shop-invoice-preview-link" type="button" onClick={() => onPreview("download")}>下载发票</button>
                  </>
                ) : null}
              </strong>
            </div>
            <div className="shop-invoice-detail-info-row"><span>开票金额(含税)</span><strong>{detail.invoiceInfo.invoiceAmountWithTax}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>开票金额(不含税)</span><strong>{detail.invoiceInfo.invoiceAmountWithoutTax}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>开票时间</span><strong>{detail.invoiceInfo.invoicedAt}</strong></div>
          </div>
        </div>

        <div className="shop-invoice-detail-section">
          <div className="shop-invoice-detail-title"><span>抬头信息</span></div>
          <div className="shop-invoice-detail-info-grid">
            <div className="shop-invoice-detail-info-row"><span>发票抬头</span><strong className="shop-invoice-status-detail">{detail.titleInfo.invoiceTitle}{detail.titleInfo.invoiceTitleExtraText ? <span className="shop-invoice-detail-alert">{detail.titleInfo.invoiceTitleExtraText}</span> : null}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>纳税人识别号</span><strong>{detail.titleInfo.taxpayerId}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>企业地址</span><strong>{detail.titleInfo.registerAddress}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>企业电话</span><strong>{detail.titleInfo.registerPhone}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>开户银行名称</span><strong>{detail.titleInfo.bankName}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>开户银行账号</span><strong>{detail.titleInfo.bankAccount}</strong></div>
          </div>
        </div>

        <div className="shop-invoice-detail-section">
          <div className="shop-invoice-detail-title"><span>收票信息</span></div>
          <div className="shop-invoice-detail-info-grid">
            <div className="shop-invoice-detail-info-row"><span>收票人手机</span><strong>{detail.receiverInfo.receiverPhone}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>收票人邮箱</span><strong>{detail.receiverInfo.receiverEmail}</strong></div>
          </div>
        </div>

        <div className="shop-invoice-detail-section">
          <div className="shop-invoice-detail-title"><span>订单信息</span></div>
          <div className="shop-invoice-detail-info-grid">
            <div className="shop-invoice-detail-info-row"><span>订单状态</span><strong>{detail.orderInfo.orderStatus}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>订单编号</span><strong className="is-link">{detail.orderInfo.orderNo}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>支付时间</span><strong>{detail.orderInfo.paidAt}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>买家账号</span><strong>{detail.orderInfo.buyerAccount}</strong></div>
            <div className="shop-invoice-detail-info-row"><span>闪购门店</span><strong>{detail.orderInfo.storeName}</strong></div>
          </div>
        </div>

        <div className="shop-invoice-detail-section">
          <div className="shop-invoice-detail-title"><span>商品清单</span></div>
          <div className="shop-invoice-detail-table-wrap">
            <table className="shop-invoice-detail-table">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>规格货号</th>
                  <th>单价（元）</th>
                  <th>购买数量</th>
                  <th>小计（元）</th>
                  <th>售后状态</th>
                  <th>申请售后数量</th>
                  <th>实际售后数量</th>
                  <th>售后金额</th>
                  <th>已发数量</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((detailItem) => (
                  <tr key={`${detail.orderInfo.orderNo}-${detailItem.spec}`}>
                    <td>{detailItem.product}</td>
                    <td>{detailItem.spec}</td>
                    <td>{detailItem.unitPrice}</td>
                    <td>{detailItem.quantity}</td>
                    <td>{detailItem.subtotal}</td>
                    <td>{detailItem.afterSaleStatus}</td>
                    <td>{detailItem.afterSaleCount}</td>
                    <td>{detailItem.actualAfterSaleCount}</td>
                    <td>{detailItem.afterSaleAmount}</td>
                    <td>{detailItem.shippedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shop-invoice-detail-summary">
            <div className="shop-invoice-detail-summary-row"><span>{detail.summary.itemCount}</span><strong>{detail.summary.goodsAmount}</strong></div>
            <div className="shop-invoice-detail-summary-row"><span>运费：</span><strong>{detail.summary.shippingFee}</strong></div>
            <div className="shop-invoice-detail-summary-row"><span>税费：</span><strong>{detail.summary.taxFee}</strong></div>
            <div className="shop-invoice-detail-summary-row"><span>订单总额：</span><strong className="is-accent">{detail.summary.orderAmount}</strong></div>
            <div className="shop-invoice-detail-summary-row"><span>售后金额总计：</span><strong className="is-accent">{detail.summary.afterSaleAmount}</strong></div>
            <div className="shop-invoice-detail-summary-row"><span>申请开票金额：</span><strong className="is-accent">{detail.summary.applyInvoiceAmount}</strong></div>
          </div>
        </div>
      </section>

      <section className="shop-invoice-issued-actions">
        <div className="shop-invoice-issued-note">
          <span className="shop-invoice-issued-note-label"><span className="shop-invoice-issued-note-icon">!</span>开票备注</span>
          <span className="shop-invoice-issued-note-text">{detail.invoiceRemark || detail.remark}</span>
        </div>
      </section>
    </>
  );
}

const BuyerPcMallInvoiceTitleModal = memo(function BuyerPcMallInvoiceTitleModal({ initialForm, storeOptions, onClose, onSave, onNotice }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialBuyerPcMallInvoiceTitleFieldErrors);

  useEffect(() => {
    setForm(initialForm.invoiceType === "电子增值税专用发票" ? { ...initialForm, titleType: "企业" } : initialForm);
    setErrors(initialBuyerPcMallInvoiceTitleFieldErrors);
  }, [initialForm]);

  const hideTitleType = form.invoiceType === "电子增值税专用发票";
  const isEnterpriseTitle = form.titleType === "企业";
  const needsSpecialInvoiceFields = isEnterpriseTitle && form.invoiceType === "电子增值税专用发票";
  const titleNameLabel = isEnterpriseTitle ? "企业抬头名称" : "个人姓名";
  const titleNamePlaceholder = isEnterpriseTitle ? "请输入企业抬头名称" : "请输入个人姓名";
  const modalTitle = form.id ? "编辑发票抬头" : "新增发票抬头";

  const handleChange = (field, value) => {
    setForm((current) => {
      if (field === "titleType") {
        return {
          ...current,
          titleType: value,
          taxpayerId: value === "个人" ? "" : current.taxpayerId,
          registeredAddress: value === "个人" ? "" : current.registeredAddress,
          phone: value === "个人" ? "" : current.phone,
          bank: value === "个人" ? "" : current.bank,
          bankAccount: value === "个人" ? "" : current.bankAccount
        };
      }

      if (field === "invoiceType" && value !== "电子增值税专用发票") {
        return {
          ...current,
          [field]: value,
          registeredAddress: "",
          phone: "",
          bank: "",
          bankAccount: ""
        };
      }

      if (field === "invoiceType" && value === "电子增值税专用发票") {
        return {
          ...current,
          [field]: value,
          titleType: "企业"
        };
      }

      return {
        ...current,
        [field]: value
      };
    });

    if (field in initialBuyerPcMallInvoiceTitleFieldErrors) {
      setErrors((current) => ({
        ...current,
        [field]: false
      }));
    }

    if (field === "titleType" || field === "invoiceType") {
      setErrors((current) => ({
        ...current,
        taxpayerId: field === "titleType" ? false : current.taxpayerId,
        registeredAddress: false,
        phone: false,
        bank: false,
        bankAccount: false
      }));
    }
  };

  const handleSave = () => {
    const titleName = form.titleName.trim();
    const taxpayerId = form.taxpayerId.trim();
    const registeredAddress = form.registeredAddress.trim();
    const phone = form.phone.trim();
    const bank = form.bank.trim();
    const bankAccount = form.bankAccount.trim();
    const receiverPhone = form.receiverPhone.trim();
    const receiverEmail = form.receiverEmail.trim();
    const requiresTaxpayerId = form.titleType === "企业";
    const requiresSpecialInvoiceFields = requiresTaxpayerId && form.invoiceType === "电子增值税专用发票";
    const nextErrors = {
      titleName: !titleName,
      taxpayerId: requiresTaxpayerId && !taxpayerId,
      registeredAddress: requiresSpecialInvoiceFields && !registeredAddress,
      phone: requiresSpecialInvoiceFields && !phone,
      bank: requiresSpecialInvoiceFields && !bank,
      bankAccount: requiresSpecialInvoiceFields && !bankAccount,
      receiverPhone: false,
      receiverEmail: false
    };

    if (nextErrors.titleName || nextErrors.taxpayerId || nextErrors.registeredAddress || nextErrors.phone || nextErrors.bank || nextErrors.bankAccount) {
      setErrors(nextErrors);
      if (nextErrors.titleName) {
        onNotice("抬头名称为空，请检查");
      } else if (nextErrors.taxpayerId) {
        onNotice("纳税人识别号为空，请检查");
      } else if (nextErrors.registeredAddress) {
        onNotice("企业地址为空，请检查");
      } else if (nextErrors.phone) {
        onNotice("企业电话为空，请检查");
      } else if (nextErrors.bank) {
        onNotice("开户银行名称为空，请检查");
      } else {
        onNotice("开户银行账号为空，请检查");
      }
      return;
    }

    onSave({
      ...form,
      titleName,
      taxpayerId: requiresTaxpayerId ? taxpayerId : "",
      registeredAddress: requiresSpecialInvoiceFields ? registeredAddress : "",
      phone: requiresSpecialInvoiceFields ? phone : "",
      bank: requiresSpecialInvoiceFields ? bank : "",
      bankAccount: requiresSpecialInvoiceFields ? bankAccount : "",
      receiverPhone,
      receiverEmail
    });
  };

  return (
    <div className="modal-overlay pc-mall-title-modal-overlay" onClick={onClose} role="presentation">
      <div className="pc-mall-title-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-mall-title-modal-heading">
        <div className="pc-mall-title-modal-head">
          <h3 id="pc-mall-title-modal-heading">{modalTitle}</h3>
          <button className="pc-mall-title-modal-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="pc-mall-title-modal-body">
          <div className="pc-mall-title-modal-row">
            <span>发票类型 <em>*</em></span>
            <div className="pc-mall-chip-row">
              {["电子增值税专用发票", "电子普通发票"].map((option) => (
                <button className={`pc-mall-chip pc-mall-title-modal-chip ${form.invoiceType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceType", option)}>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {!hideTitleType ? (
            <div className="pc-mall-title-modal-row">
              <span>抬头类型 <em>*</em></span>
              <div className="pc-mall-chip-row">
                {["企业", "个人"].map((option) => (
                  <button className={`pc-mall-chip pc-mall-title-modal-chip pc-mall-title-modal-chip-small ${form.titleType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("titleType", option)}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="pc-mall-title-modal-row">
            <span>闪购门店</span>
            <div className="pc-mall-title-modal-select-wrap">
              <select value={form.storeName} onChange={(event) => handleChange("storeName", event.target.value)}>
                <option value="">请选择闪购门店</option>
                {storeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </label>

          <label className="pc-mall-title-modal-row">
            <span>{titleNameLabel} <em>*</em></span>
            <div className="pc-mall-title-modal-input-wrap">
              <input className={errors.titleName ? "is-error" : ""} placeholder={titleNamePlaceholder} value={form.titleName} onChange={(event) => handleChange("titleName", event.target.value)} />
            </div>
          </label>

          {isEnterpriseTitle ? (
            <>
              <label className="pc-mall-title-modal-row">
                <span>纳税人识别号 <em>*</em></span>
                <div className="pc-mall-title-modal-input-wrap">
                  <input className={errors.taxpayerId ? "is-error" : ""} placeholder="请输入纳税人识别号" value={form.taxpayerId} onChange={(event) => handleChange("taxpayerId", event.target.value)} />
                </div>
              </label>
              {needsSpecialInvoiceFields ? (
                <>
                  <label className="pc-mall-title-modal-row">
                    <span>企业地址 <em>*</em></span>
                    <div className="pc-mall-title-modal-input-wrap">
                      <input className={errors.registeredAddress ? "is-error" : ""} placeholder="请输入企业地址" value={form.registeredAddress} onChange={(event) => handleChange("registeredAddress", event.target.value)} />
                    </div>
                  </label>

                  <label className="pc-mall-title-modal-row">
                    <span>企业电话 <em>*</em></span>
                    <div className="pc-mall-title-modal-input-wrap">
                      <input className={errors.phone ? "is-error" : ""} placeholder="请输入企业电话" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} />
                    </div>
                  </label>

                  <label className="pc-mall-title-modal-row">
                    <span>开户银行名称 <em>*</em></span>
                    <div className="pc-mall-title-modal-input-wrap">
                      <input className={errors.bank ? "is-error" : ""} placeholder="请输入开户银行名称" value={form.bank} onChange={(event) => handleChange("bank", event.target.value)} />
                    </div>
                  </label>

                  <label className="pc-mall-title-modal-row">
                    <span>开户银行账号 <em>*</em></span>
                    <div className="pc-mall-title-modal-input-wrap">
                      <input className={errors.bankAccount ? "is-error" : ""} placeholder="请输入完整的开户银行账号" value={form.bankAccount} onChange={(event) => handleChange("bankAccount", event.target.value)} />
                    </div>
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          <label className="pc-mall-title-modal-row">
            <span>收票人手机</span>
            <div className="pc-mall-title-modal-input-wrap">
              <input className={errors.receiverPhone ? "is-error" : ""} placeholder="请输入收票人手机号" value={form.receiverPhone} onChange={(event) => handleChange("receiverPhone", event.target.value)} />
            </div>
          </label>

          <label className="pc-mall-title-modal-row">
            <span>收票人邮箱</span>
            <div className="pc-mall-title-modal-input-wrap">
              <input className={errors.receiverEmail ? "is-error" : ""} placeholder="请输入收票人邮箱" value={form.receiverEmail} onChange={(event) => handleChange("receiverEmail", event.target.value)} />
            </div>
          </label>

          <label className="pc-mall-title-modal-default">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => handleChange("isDefault", event.target.checked)} />
            <span>设为默认抬头</span>
            <p>设置为默认抬头后，后续下单优先使用以上发票信息</p>
          </label>
        </div>

        <div className="pc-mall-title-modal-foot">
          <button className="pc-mall-btn pc-mall-title-modal-cancel" type="button" onClick={onClose}>取消</button>
          <button className="pc-mall-btn pc-mall-btn-dark pc-mall-title-modal-confirm" type="button" onClick={handleSave}>确定</button>
        </div>
      </div>
    </div>
  );
});

const BuyerPcMallInvoiceTitleStoreModal = memo(function BuyerPcMallInvoiceTitleStoreModal({ title, stores, onClose }) {
  return (
    <div className="modal-overlay pc-mall-title-store-modal-overlay" onClick={onClose} role="presentation">
      <div className="pc-mall-title-store-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-mall-title-store-modal-heading">
        <div className="pc-mall-title-store-modal-head">
          <h3 id="pc-mall-title-store-modal-heading">全部闪购门店</h3>
          <button className="pc-mall-title-store-modal-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="pc-mall-title-store-modal-body">
          <div className="pc-mall-title-store-modal-summary">{title}</div>
          <table className="pc-mall-title-store-modal-table">
            <thead>
              <tr>
                <th>闪购门店ID</th>
                <th>闪购门店名称</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store, index) => (
                <tr key={`${store.id || "store"}-${index}`}>
                  <td>{store.id || "-"}</td>
                  <td>{store.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pc-mall-title-store-modal-foot">
          <button className="pc-mall-btn pc-mall-btn-dark" type="button" onClick={onClose}>确定</button>
        </div>
      </div>
    </div>
  );
});

const BuyerPcMallBatchInvoiceModal = memo(function BuyerPcMallBatchInvoiceModal({
  initialForm,
  orderItems,
  summary,
  onClose,
  onSubmit,
  onNotice,
  onToggleOrder,
  onRemoveOrder,
  title = "批量申请开票",
  showOrderSummary = true,
  submitButtonText = "提交申请",
  summaryTitle,
  allowToggleOrder = true,
  allowRemoveOrder = true,
  showOrderGroupMode = false,
  showSeparateInvoiceColumn = false,
  editableSeparateInvoiceColumn = false,
  hideInvoiceAndReceiverSections = false,
  invoiceTitleRows = [],
  onOrderItemsChange,
  enableBatchTitleReplace = false
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialBatchInvoiceFieldErrors);
  const [orderGroupMode, setOrderGroupMode] = useState("order");
  const [batchReplaceTitleId, setBatchReplaceTitleId] = useState("");
  const [batchReplaceInvoiceContent, setBatchReplaceInvoiceContent] = useState("");
  const [batchReplaceSingleInvoice, setBatchReplaceSingleInvoice] = useState("");
  const modalBodyRef = useRef(null);
  const pendingScrollTopRef = useRef(null);
  const batchTableClassName = `pc-mall-table pc-mall-batch-table${allowToggleOrder ? "" : " is-without-toggle"}${hideInvoiceAndReceiverSections ? " has-row-invoice-fields" : ""}${enableBatchTitleReplace ? " has-batch-content-column" : ""}`;

  useEffect(() => {
    setForm(initialForm.invoiceType === "电子增值税专用发票" ? { ...initialForm, titleType: "企业" } : initialForm);
    setErrors(initialBatchInvoiceFieldErrors);
  }, [initialForm]);

  useEffect(() => {
    if (!enableBatchTitleReplace) return;
    const firstMatchedTitleId = orderItems.find((item) => item.invoiceTitleId)?.invoiceTitleId || "";
    setBatchReplaceTitleId(firstMatchedTitleId);
    setBatchReplaceInvoiceContent("");
    setBatchReplaceSingleInvoice("");
  }, [enableBatchTitleReplace, orderItems]);

  useLayoutEffect(() => {
    if (pendingScrollTopRef.current == null || !modalBodyRef.current) return;
    modalBodyRef.current.scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
  }, [form.invoiceType]);

  const hideTitleType = form.invoiceType === "电子增值税专用发票";
  const isPersonalBatchInvoiceTitle = form.titleType === "个人";
  const isEnterpriseBatchInvoiceTitle = form.titleType === "企业";
  const needsBatchSpecialInvoiceFields = isEnterpriseBatchInvoiceTitle && form.invoiceType === "电子增值税专用发票";
  const isSpecialInvoiceLayout = form.invoiceType === "电子增值税专用发票";
  const groupedOrderSections = useMemo(() => {
    if (orderGroupMode === "order") {
      return [{ key: "order", title: "", items: orderItems }];
    }

    const groups = [];
    const groupMap = new Map();

    orderItems.forEach((item) => {
      const groupKey = orderGroupMode === "shop"
        ? `shop:${item.shop || "-"}`
        : `store:${item.store || "-"}|${item.storeId || ""}`;

      if (!groupMap.has(groupKey)) {
        const nextGroup = {
          key: groupKey,
          title: orderGroupMode === "shop"
            ? (item.shop || "-")
            : `${item.store || "-"}${item.storeId ? ` ${item.storeId}` : ""}`,
          items: []
        };
        groupMap.set(groupKey, nextGroup);
        groups.push(nextGroup);
      }

      groupMap.get(groupKey).items.push(item);
    });

    return groups;
  }, [orderGroupMode, orderItems]);

  const handleChangeOrderItem = (orderNo, field, value) => {
    if (!onOrderItemsChange) return;

    onOrderItemsChange((current) => current.map((item) => {
      if (item.orderNo !== orderNo) return item;
      if (field === "invoiceTitleId") {
        const matchedTitle = invoiceTitleRows.find((titleItem) => titleItem.id === value);
        return {
          ...item,
          ...createBuyerPcMallBatchOrderInvoiceFields(matchedTitle)
        };
      }

      return {
        ...item,
        [field]: value
      };
    }));
  };

  const handleChange = (field, value) => {
    if (field === "invoiceType" && modalBodyRef.current) {
      pendingScrollTopRef.current = modalBodyRef.current.scrollTop;
    }
    if (field === "storeName") {
      const storeInvoiceProfile = getBuyerPcMallStoreInvoiceProfile(value);
      if (storeInvoiceProfile?.invoiceType && modalBodyRef.current) {
        pendingScrollTopRef.current = modalBodyRef.current.scrollTop;
      }
    }

    setForm((current) => {
      if (field === "storeName") {
        const storeInvoiceProfile = getBuyerPcMallStoreInvoiceProfile(value);
        if (!storeInvoiceProfile) {
          return {
            ...current,
            storeName: value
          };
        }

        return {
          ...current,
          ...storeInvoiceProfile,
          storeName: value
        };
      }

      if (field === "titleType") {
        return {
          ...current,
          [field]: value,
          taxpayerId: value === "个人" ? "" : current.taxpayerId,
          registeredAddress: value === "个人" ? "" : current.registeredAddress,
          phone: value === "个人" ? "" : current.phone,
          bank: value === "个人" ? "" : current.bank,
          bankAccount: value === "个人" ? "" : current.bankAccount
        };
      }

      if (field === "invoiceType" && value !== "电子增值税专用发票") {
        return {
          ...current,
          [field]: value,
          registeredAddress: "",
          phone: "",
          bank: "",
          bankAccount: ""
        };
      }

      if (field === "invoiceType" && value === "电子增值税专用发票") {
        return {
          ...current,
          [field]: value,
          titleType: "企业"
        };
      }

      return {
        ...current,
        [field]: value
      };
    });

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: false
      }));
    }

    if (field === "storeName") {
      setErrors((current) => ({
        ...current,
        storeName: false,
        invoiceType: false,
        titleType: false,
        titleName: false,
        taxpayerId: false,
        registeredAddress: false,
        phone: false,
        bank: false,
        bankAccount: false,
        invoiceContent: false
      }));
    }

    if (field === "titleType" || field === "invoiceType") {
      setErrors((current) => ({
        ...current,
        taxpayerId: field === "titleType" ? false : current.taxpayerId,
        registeredAddress: false,
        phone: false,
        bank: false,
        bankAccount: false
      }));
    }
  };

  const handleBatchReplaceInvoiceTitle = () => {
    if (!enableBatchTitleReplace || !onOrderItemsChange) return;
    if (!batchReplaceTitleId && !batchReplaceInvoiceContent && !batchReplaceSingleInvoice) {
      onNotice("请选择要批量修改的内容");
      return;
    }

    const matchedTitle = batchReplaceTitleId ? invoiceTitleRows.find((item) => item.id === batchReplaceTitleId) : null;
    if (batchReplaceTitleId && !matchedTitle) {
      onNotice("未找到对应的发票抬头，请重新选择");
      return;
    }

    onOrderItemsChange((current) => current.map((item) => {
      const nextTitleFields = matchedTitle ? createBuyerPcMallBatchOrderInvoiceFields(matchedTitle) : {};
      return {
        ...item,
        ...nextTitleFields,
        invoiceContent: batchReplaceInvoiceContent || item.invoiceContent || "商品类别",
        needInvoice: batchReplaceSingleInvoice || item.needInvoice || "",
        receiverPhone: item.receiverPhone,
        receiverEmail: item.receiverEmail
      };
    }));
  };

  const handleSubmit = () => {
    if (hideInvoiceAndReceiverSections) {
      onSubmit({
        ...form,
        orderItems,
        remark: form.remark.trim()
      });
      return;
    }

    const invoiceType = form.invoiceType.trim();
    const titleType = form.titleType.trim();
    const titleName = form.titleName.trim();
    const taxpayerId = form.taxpayerId.trim();
    const registeredAddress = form.registeredAddress.trim();
    const phone = form.phone.trim();
    const bank = form.bank.trim();
    const bankAccount = form.bankAccount.trim();
    const invoiceContent = form.invoiceContent.trim();
    const receiverPhone = form.receiverPhone.trim();
    const receiverEmail = form.receiverEmail.trim();
    const receiverMissing = !receiverPhone && !receiverEmail;
    const taxpayerRequired = form.titleType === "企业";
    const specialInvoiceFieldsRequired = taxpayerRequired && form.invoiceType === "电子增值税专用发票";
    const nextErrors = {
      invoiceType: !invoiceType,
      titleType: !titleType,
      titleName: !titleName,
      taxpayerId: taxpayerRequired && !taxpayerId,
      registeredAddress: specialInvoiceFieldsRequired && !registeredAddress,
      phone: specialInvoiceFieldsRequired && !phone,
      bank: specialInvoiceFieldsRequired && !bank,
      bankAccount: specialInvoiceFieldsRequired && !bankAccount,
      invoiceContent: !invoiceContent,
      receiverPhone: receiverMissing,
      receiverEmail: receiverMissing
    };

    if (nextErrors.invoiceType || nextErrors.titleType || nextErrors.titleName || nextErrors.taxpayerId || nextErrors.registeredAddress || nextErrors.phone || nextErrors.bank || nextErrors.bankAccount || nextErrors.invoiceContent || nextErrors.receiverPhone || nextErrors.receiverEmail) {
      setErrors(nextErrors);

      if (nextErrors.invoiceType) {
        onNotice("请选择发票类型");
        return;
      }
      if (nextErrors.titleType) {
        onNotice("请选择抬头类型");
        return;
      }
      if (nextErrors.titleName) {
        onNotice("抬头名称为空，请检查");
        return;
      }
      if (nextErrors.taxpayerId) {
        onNotice("纳税人识别号为空，请检查");
        return;
      }
      if (nextErrors.registeredAddress) {
        onNotice("企业地址为空，请检查");
        return;
      }
      if (nextErrors.phone) {
        onNotice("企业电话为空，请检查");
        return;
      }
      if (nextErrors.bank) {
        onNotice("开户银行名称为空，请检查");
        return;
      }
      if (nextErrors.bankAccount) {
        onNotice("开户银行账号为空，请检查");
        return;
      }
      if (nextErrors.invoiceContent) {
        onNotice("请选择发票内容");
        return;
      }
      if (receiverMissing) {
        onNotice("收票人手机为空，请检查");
      }
      return;
    }

    onSubmit({
      ...form,
      titleName,
      taxpayerId: taxpayerRequired ? taxpayerId : "",
      registeredAddress: specialInvoiceFieldsRequired ? registeredAddress : "",
      phone: specialInvoiceFieldsRequired ? phone : "",
      bank: specialInvoiceFieldsRequired ? bank : "",
      bankAccount: specialInvoiceFieldsRequired ? bankAccount : "",
      receiverPhone,
      receiverEmail,
      remark: form.remark.trim()
    });
  };

  return (
    <div className="modal-overlay pc-mall-batch-modal-overlay" onClick={onClose} role="presentation">
      <div className="pc-mall-batch-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pc-mall-batch-modal-heading">
        <div className="pc-mall-batch-modal-head">
          <h3 id="pc-mall-batch-modal-heading">{title}</h3>
          <button className="pc-mall-batch-modal-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="pc-mall-batch-modal-body" ref={modalBodyRef}>
          {!hideInvoiceAndReceiverSections && isSpecialInvoiceLayout ? (
            <>
              <section className="pc-mall-batch-card is-special-layout">
                <h2>发票信息</h2>
                <div className="pc-mall-batch-form-grid is-special-layout">
                  <div className="pc-mall-batch-field is-special-layout">
                    <span>发票类型 <em>*</em></span>
                  <div className="pc-mall-chip-row is-special-layout">
                      {["电子普通发票", "电子增值税专用发票"].map((option) => (
                        <button className={`pc-mall-chip pc-mall-chip-invoice-type is-special-layout ${form.invoiceType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceType", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pc-mall-batch-field is-special-layout">
                    <span>发票内容 <em>*</em></span>
                    <div className="pc-mall-chip-row is-special-layout">
                      {["商品类别", "商品明细"].map((option) => (
                        <button className={`pc-mall-chip is-special-layout ${form.invoiceContent === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceContent", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="pc-mall-batch-card is-special-layout">
                <h2>增票资质</h2>
                <div className="pc-mall-batch-form-grid is-special-layout">
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>企业抬头名称 <em>*</em></span>
                    <div className="pc-mall-input-action-row">
                      <input className={errors.titleName ? "is-error" : ""} placeholder="请输入企业抬头名称" value={form.titleName} onChange={(e) => handleChange("titleName", e.target.value)} />
                      <button className="pc-mall-text-btn" type="button">选择抬头</button>
                    </div>
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>纳税人识别号 <em>*</em></span>
                    <input className={errors.taxpayerId ? "is-error" : ""} placeholder="请输入纳税人识别号" value={form.taxpayerId} onChange={(e) => handleChange("taxpayerId", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>闪购门店</span>
                    <BuyerPcMallStoreSearchSelect value={form.storeName} onChange={(value) => handleChange("storeName", value)} isSpecialLayout />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>企业地址 <em>*</em></span>
                    <input className={errors.registeredAddress ? "is-error" : ""} placeholder="请输入企业地址" value={form.registeredAddress} onChange={(e) => handleChange("registeredAddress", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>企业电话 <em>*</em></span>
                    <input className={errors.phone ? "is-error" : ""} placeholder="请输入企业电话" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>开户银行名称 <em>*</em></span>
                    <input className={errors.bank ? "is-error" : ""} placeholder="请输入开户银行名称" value={form.bank} onChange={(e) => handleChange("bank", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full is-special-layout">
                    <span>开户银行账号 <em>*</em></span>
                    <input className={errors.bankAccount ? "is-error" : ""} placeholder="请输入完整的开户银行账号" value={form.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)} />
                  </label>
                </div>
              </section>
            </>
          ) : !hideInvoiceAndReceiverSections ? (
            <section className={`pc-mall-batch-card ${hideInvoiceAndReceiverSections ? "pc-mall-batch-card-order-summary" : ""}`}>
              <h2>发票信息</h2>
              <div className="pc-mall-batch-form-grid">
                <div className="pc-mall-batch-field">
                  <span>发票类型 <em>*</em></span>
                  <div className="pc-mall-chip-row">
                    {["电子普通发票", "电子增值税专用发票"].map((option) => (
                      <button className={`pc-mall-chip pc-mall-chip-invoice-type ${form.invoiceType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceType", option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                {!hideTitleType ? (
                  <div className="pc-mall-batch-field pc-mall-batch-field-title-type">
                    <span>抬头类型 <em>*</em></span>
                    <div className="pc-mall-chip-row">
                      {["企业", "个人"].map((option) => (
                        <button className={`pc-mall-chip ${form.titleType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("titleType", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <label className="pc-mall-batch-field pc-mall-batch-field-full">
                  <span>{isPersonalBatchInvoiceTitle ? "个人姓名" : isEnterpriseBatchInvoiceTitle ? "企业抬头名称" : "抬头名称"} <em>*</em></span>
                  <div className="pc-mall-input-action-row">
                    <input className={errors.titleName ? "is-error" : ""} placeholder={isPersonalBatchInvoiceTitle ? "请输入个人姓名" : isEnterpriseBatchInvoiceTitle ? "请输入企业抬头名称" : "请输入抬头名称"} value={form.titleName} onChange={(e) => handleChange("titleName", e.target.value)} />
                    <button className="pc-mall-text-btn" type="button">选择抬头</button>
                  </div>
                </label>
                {!isPersonalBatchInvoiceTitle ? (
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>纳税人识别号 <em>*</em></span>
                    <input className={errors.taxpayerId ? "is-error" : ""} placeholder="请输入纳税人识别号" value={form.taxpayerId} onChange={(e) => handleChange("taxpayerId", e.target.value)} />
                  </label>
                ) : null}
                <label className="pc-mall-batch-field pc-mall-batch-field-full">
                  <span>闪购门店</span>
                  <BuyerPcMallStoreSearchSelect value={form.storeName} onChange={(value) => handleChange("storeName", value)} />
                </label>
                <div className="pc-mall-batch-field">
                  <span>发票内容 <em>*</em></span>
                  <div className="pc-mall-chip-row">
                    {["商品类别", "商品明细"].map((option) => (
                      <button className={`pc-mall-chip ${form.invoiceContent === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceContent", option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {!hideInvoiceAndReceiverSections ? (
          <section className={`pc-mall-batch-card ${hideInvoiceAndReceiverSections ? "pc-mall-batch-card-order-note" : ""}`}>
            <div className="pc-mall-batch-section-head">
              <h2>收票信息</h2>
              <span>收票人手机和邮箱至少填一项</span>
            </div>
            <div className="pc-mall-batch-form-grid pc-mall-batch-form-grid-receiver">
              <label className="pc-mall-batch-field pc-mall-batch-field-full">
                <span>收票人手机</span>
                <input className={errors.receiverPhone ? "is-error" : ""} placeholder="请输入收票人手机号（选填）" value={form.receiverPhone} onChange={(e) => handleChange("receiverPhone", e.target.value)} />
              </label>
              <label className="pc-mall-batch-field pc-mall-batch-field-full">
                <span>收票人邮箱</span>
                <input className={errors.receiverEmail ? "is-error" : ""} placeholder="请输入收票人邮箱（选填）" value={form.receiverEmail} onChange={(e) => handleChange("receiverEmail", e.target.value)} />
              </label>
            </div>
          </section>
          ) : null}

          {showOrderSummary ? (
            <section className={`pc-mall-batch-card ${hideInvoiceAndReceiverSections ? "pc-mall-batch-card-order-list" : ""}`}>
              <div className="pc-mall-batch-summary-head">
                <h2>{summaryTitle ?? `本次批量申请开票共 ${summary.count} 笔订单，申请开票金额合计：￥${summary.totalAmount.toFixed(2)}`}</h2>
                {showOrderGroupMode && !hideInvoiceAndReceiverSections ? (
                  <label className="pc-mall-batch-group-control">
                    <span>展示方式</span>
                    <div className="pc-mall-batch-select-wrap">
                      <select value={orderGroupMode} onChange={(e) => setOrderGroupMode(e.target.value)}>
                        <option value="order">按订单</option>
                        <option value="shop">按店铺</option>
                        <option value="store">按闪购门店</option>
                      </select>
                    </div>
                  </label>
                ) : null}
              </div>
              {enableBatchTitleReplace ? (
                <div className="pc-mall-batch-title-replace-bar">
                  <span className="pc-mall-batch-title-replace-label">批量修改</span>
                  <div className="pc-mall-batch-title-replace-controls">
                    <div className="pc-mall-batch-select-wrap pc-mall-batch-title-replace-select">
                      <select value={batchReplaceTitleId} onChange={(e) => setBatchReplaceTitleId(e.target.value)}>
                        <option value="">请选择发票抬头</option>
                        {invoiceTitleRows.map((titleItem) => (
                          <option key={titleItem.id} value={titleItem.id}>{titleItem.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pc-mall-batch-select-wrap pc-mall-batch-title-replace-select is-content-select">
                      <select value={batchReplaceInvoiceContent} onChange={(e) => setBatchReplaceInvoiceContent(e.target.value)}>
                        <option value="">请选择开票内容</option>
                        {["商品类别", "商品明细"].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pc-mall-batch-select-wrap pc-mall-batch-title-replace-select is-separate-select">
                      <select value={batchReplaceSingleInvoice} onChange={(e) => setBatchReplaceSingleInvoice(e.target.value)}>
                        <option value="">请选择是否单独开票</option>
                        {["是", "否"].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <button className="pc-mall-batch-title-replace-confirm" type="button" onClick={handleBatchReplaceInvoiceTitle}>确定</button>
                  </div>
                </div>
              ) : null}
              {groupedOrderSections.map((group) => (
                <div className="pc-mall-batch-group-block" key={group.key}>
                  {orderGroupMode !== "order" ? <div className="pc-mall-batch-group-title">{group.title}</div> : null}
                  <div className="pc-mall-table-wrap pc-mall-batch-table-wrap">
                    <table className={batchTableClassName}>
                      <thead>
                        <tr>
                          <th>订单号</th>
                          <th>
                            <span className="pc-mall-header-with-tip">
                              <span>订单总额</span>
                              <span className="shop-invoice-summary-tip pc-mall-header-tip">
                                <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                                <span className="shop-invoice-summary-tooltip">订单总额 = 总商品金额 - 折扣/优惠金额 + 运费</span>
                              </span>
                            </span>
                          </th>
                          <th>售后状态</th>
                          <th>
                            <span className="pc-mall-header-with-tip">
                              <span>售后金额</span>
                              <span className="shop-invoice-summary-tip pc-mall-header-tip">
                                <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                                <span className="shop-invoice-summary-tooltip">售后金额 = 售后中金额 + 已退款金额</span>
                              </span>
                            </span>
                          </th>
                          <th>申请开票金额</th>
                          <th>闪购门店</th>
                          {hideInvoiceAndReceiverSections ? <th>发票抬头</th> : null}
                          {hideInvoiceAndReceiverSections ? <th>收票信息</th> : null}
                          {enableBatchTitleReplace ? <th>发票内容</th> : null}
                          {showSeparateInvoiceColumn && (!hideInvoiceAndReceiverSections || enableBatchTitleReplace || editableSeparateInvoiceColumn) ? <th>是否单独开票</th> : null}
                          {allowToggleOrder ? <th>单开发票</th> : null}
                          {allowRemoveOrder ? <th>操作</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.orderNo}>
                            <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                            <td>{item.price}</td>
                            <td>{item.afterSaleStatus || "-"}</td>
                            <td>{item.afterSaleAmount || "¥0.00"}</td>
                            <td>{item.price}</td>
                            <td>
                              <div className="pc-mall-store-cell">
                                <div>{item.store}</div>
                                {item.storeId ? <div>{item.storeId}</div> : null}
                              </div>
                            </td>
                            {hideInvoiceAndReceiverSections ? (
                              <td>
                                <div className="pc-mall-batch-title-field">
                                  <div className="pc-mall-batch-title-text">{item.invoiceTitle || "-"}</div>
                                  <span className="pc-mall-inline-tooltip-wrap pc-mall-batch-title-view-wrap">
                                    <button className="pc-mall-batch-title-view-btn" type="button">查看</button>
                                    <span className="pc-mall-inline-tooltip">{getBuyerPcMallInvoiceTitleTooltip(invoiceTitleRows.find((titleItem) => titleItem.id === item.invoiceTitleId) || null)}</span>
                                  </span>
                                </div>
                              </td>
                            ) : null}
                            {hideInvoiceAndReceiverSections ? (
                              <td>
                                <div className="pc-mall-batch-receiver-info">
                                  <div className="pc-mall-batch-receiver-lines">
                                    <span>收票人手机：{item.receiverPhone || "-"}</span>
                                    <span>收票人邮箱：{item.receiverEmail || "-"}</span>
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            {enableBatchTitleReplace ? <td>{item.invoiceContent || "商品类别"}</td> : null}
                            {showSeparateInvoiceColumn && (!hideInvoiceAndReceiverSections || enableBatchTitleReplace || editableSeparateInvoiceColumn) ? (
                              <td>
                                {hideInvoiceAndReceiverSections && !editableSeparateInvoiceColumn ? normalizeShopInvoiceMode(item.needInvoice ? "是" : "否") : (
                                  editableSeparateInvoiceColumn ? (
                                    <div className="pc-mall-batch-table-select-wrap">
                                      <div className="pc-mall-batch-select-wrap">
                                        <select value={item.needInvoice || ""} onChange={(event) => onToggleOrder(item.orderNo, event.target.value)}>
                                          <option value="">请选择</option>
                                          <option value="是">是</option>
                                          <option value="否">否</option>
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="pc-mall-batch-checkbox-cell">
                                      <input type="checkbox" checked={Boolean(item.needInvoice)} onChange={() => onToggleOrder(item.orderNo)} />
                                    </label>
                                  )
                                )}
                              </td>
                            ) : null}
                            {allowToggleOrder ? (
                              <td>
                                <button className={`pc-mall-switch ${item.needInvoice ? "is-on" : ""}`} type="button" onClick={() => onToggleOrder(item.orderNo)}>
                                  <span />
                                </button>
                              </td>
                            ) : null}
                            {allowRemoveOrder ? <td><button className="pc-mall-inline-remove" type="button" onClick={() => onRemoveOrder(item.orderNo)}>移除</button></td> : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {hideInvoiceAndReceiverSections && !enableBatchTitleReplace ? (
            <section className="pc-mall-batch-card">
              <div className="pc-mall-batch-content-row">
                <h2>发票内容</h2>
                <div className="pc-mall-batch-content-input">
                  {["商品类别", "商品明细"].map((option) => (
                    <button className={`pc-mall-chip ${form.invoiceContent === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleChange("invoiceContent", option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="pc-mall-batch-card">
            <h2>开票备注</h2>
            <label className="pc-mall-batch-field pc-mall-batch-field-full pc-mall-batch-note-field pc-mall-batch-note-field-no-label">
              <div className="pc-mall-batch-note-input">
                <textarea placeholder="补充开票要求、特殊说明等信息，便于卖家更准确处理。" value={form.remark} onChange={(e) => handleChange("remark", e.target.value)} />
              </div>
            </label>
          </section>
        </div>

        <div className="pc-mall-batch-footer pc-mall-batch-modal-foot">
          <button className="pc-mall-btn pc-mall-batch-footer-btn" type="button" onClick={onClose}>取消</button>
          <button className="pc-mall-batch-submit-btn" type="button" onClick={handleSubmit}>{submitButtonText}</button>
        </div>
      </div>
    </div>
  );
});

function BuyerPcMallPage({ onPortalActionClick }) {
  const buyerPcMallStoredView = useMemo(() => readStoredJson(buyerPcMallViewStorageKey, {
    activeTab: buyerPcMallOrderTabKeys[0],
    invoicePageView: "list",
    batchInvoiceOrderItems: []
  }), []);
  const normalizeBuyerPcMallOrderTab = useCallback((tabValue) => {
    if (buyerPcMallOrderTabKeys.includes(tabValue)) return tabValue;
    if (String(tabValue || "").startsWith("已申请开票")) return "已申请开票";
    if (String(tabValue || "").startsWith("已开具发票")) return "已开具发票";
    return "可申请开票";
  }, []);
  const [activeTab, setActiveTab] = useState(() => (
    normalizeBuyerPcMallOrderTab(buyerPcMallStoredView.activeTab)
  ));
  const [invoicePageView, setInvoicePageView] = useState(() => (
    ["list", "batch", "title-management", "detail"].includes(buyerPcMallStoredView.invoicePageView) ? buyerPcMallStoredView.invoicePageView : "list"
  ));
  const [invoiceRows, setInvoiceRows] = useState(normalizedBuyerPcMallInvoiceRows);
  const [appliedInvoiceRows, setAppliedInvoiceRows] = useState(buyerPcMallAppliedInvoiceRows);
  const [invoicedInvoiceRows] = useState(buyerPcMallInvoicedInvoiceRows);
  const [selectedInvoiceOrderNos, setSelectedInvoiceOrderNos] = useState([normalizedBuyerPcMallInvoiceRows[0].orderNo]);
  const [selectedAppliedInvoiceOrderNos, setSelectedAppliedInvoiceOrderNos] = useState([]);
  const [selectedInvoicedInvoiceOrderNos, setSelectedInvoicedInvoiceOrderNos] = useState([]);
  const [selectedPendingAccounts, setSelectedPendingAccounts] = useState(["wujing146(总部)"]);
  const [selectedPendingStatuses, setSelectedPendingStatuses] = useState(["待申请", "已驳回", "已撤销"]);
  const [selectedPendingAfterSaleStatuses, setSelectedPendingAfterSaleStatuses] = useState(["全部"]);
  const [selectedPendingPaymentMethod, setSelectedPendingPaymentMethod] = useState("全部");
  const [selectedPendingStores, setSelectedPendingStores] = useState([]);
  const [pendingStoreKeyword, setPendingStoreKeyword] = useState("");
  const [selectedAppliedAccounts, setSelectedAppliedAccounts] = useState([]);
  const [selectedAppliedStores, setSelectedAppliedStores] = useState([]);
  const [appliedStoreKeyword, setAppliedStoreKeyword] = useState("");
  const [draftAppliedSingleInvoice, setDraftAppliedSingleInvoice] = useState("");
  const [draftAppliedInvoiceBatchQuery, setDraftAppliedInvoiceBatchQuery] = useState("");
  const [appliedSingleInvoiceFilter, setAppliedSingleInvoiceFilter] = useState("");
  const [appliedInvoiceBatchQueryList, setAppliedInvoiceBatchQueryList] = useState([]);
  const [selectedInvoicedAccounts, setSelectedInvoicedAccounts] = useState(["wujing146(总部)"]);
  const [selectedInvoicedStores, setSelectedInvoicedStores] = useState([]);
  const [invoicedStoreKeyword, setInvoicedStoreKeyword] = useState("");
  const [draftInvoicedInvoiceBatchQuery, setDraftInvoicedInvoiceBatchQuery] = useState("");
  const [invoicedInvoiceBatchQueryList, setInvoicedInvoiceBatchQueryList] = useState([]);
  const [invoiceBatchQueryModal, setInvoiceBatchQueryModal] = useState(null);
  const [draftInvoiceTitleManagementStores, setDraftInvoiceTitleManagementStores] = useState([]);
  const [invoiceTitleManagementStoreKeyword, setInvoiceTitleManagementStoreKeyword] = useState("");
  const [appliedInvoiceTitleManagementStores, setAppliedInvoiceTitleManagementStores] = useState([]);
  const [draftInvoiceTitleManagementKeyword, setDraftInvoiceTitleManagementKeyword] = useState("");
  const [appliedInvoiceTitleManagementKeyword, setAppliedInvoiceTitleManagementKeyword] = useState("");
  const [batchInvoiceNotice, setBatchInvoiceNotice] = useState("");
  const [invoiceTitleRows, setInvoiceTitleRows] = useState(buyerPcMallInvoiceTitleRows);
  const [isInvoiceTitleModalOpen, setIsInvoiceTitleModalOpen] = useState(false);
  const [activeInvoiceTitleForm, setActiveInvoiceTitleForm] = useState(initialBuyerPcMallInvoiceTitleForm);
  const [activeInvoiceTitleStores, setActiveInvoiceTitleStores] = useState(null);
  const [batchInvoiceOrderItems, setBatchInvoiceOrderItems] = useState(() => (
    Array.isArray(buyerPcMallStoredView.batchInvoiceOrderItems) ? buyerPcMallStoredView.batchInvoiceOrderItems : []
  ));
  const [batchInvoiceMode, setBatchInvoiceMode] = useState("merged");
  const [singleInvoiceOrder, setSingleInvoiceOrder] = useState(null);
  const [activeProductDetailOrderNo, setActiveProductDetailOrderNo] = useState("");
  const [activeBuyerInvoiceDetail, setActiveBuyerInvoiceDetail] = useState(null);
  const [modifyInvoiceOrders, setModifyInvoiceOrders] = useState([]);
  const [modifyInvoiceInitialForm, setModifyInvoiceInitialForm] = useState(buyerPcMallBatchInvoiceForm);
  const [invoiceActionModal, setInvoiceActionModal] = useState(null);
  const buyerPcMallMissingInvoiceTitleNotice = "请在发票抬头管理>新增发票抬头后再开票";
  const getBuyerPcMallApplyDisabledReason = useCallback((item) => {
    if (!item) return "";
    if (item.applyDisabledReason) return item.applyDisabledReason;
    if (item.afterSaleStatus === "售后中") return "售后状态为 售后中的订单，不允许申请开票";
    return "";
  }, []);
  const hasInvoiceTitles = invoiceTitleRows.length > 0;
  const displayedPendingInvoiceRows = useMemo(() => invoiceRows, [invoiceRows]);
  const selectableInvoiceOrderNos = useMemo(() => (
    displayedPendingInvoiceRows.filter((item) => !getBuyerPcMallApplyDisabledReason(item)).map((item) => item.orderNo)
  ), [displayedPendingInvoiceRows, getBuyerPcMallApplyDisabledReason]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("pc-mall-body-scroll");
    return () => {
      document.body.classList.remove("pc-mall-body-scroll");
    };
  }, []);

  useEffect(() => {
    writeStoredJson(buyerPcMallViewStorageKey, {
      activeTab,
      invoicePageView: invoicePageView === "detail" ? "list" : invoicePageView,
      batchInvoiceOrderItems
    });
  }, [activeTab, batchInvoiceOrderItems, invoicePageView]);
  const displayedAppliedInvoiceRows = useMemo(() => {
    let nextRows = appliedInvoiceRows;

    if (appliedSingleInvoiceFilter) {
      nextRows = nextRows.filter((item) => normalizeShopInvoiceMode(item.singleInvoice) === appliedSingleInvoiceFilter);
    }

    if (appliedInvoiceBatchQueryList.length > 0) {
      const batchSet = new Set(appliedInvoiceBatchQueryList);
      nextRows = nextRows.filter((item) => batchSet.has(String(item.invoiceBatch || "").trim()));
    }

    return nextRows;
  }, [appliedInvoiceBatchQueryList, appliedInvoiceRows, appliedSingleInvoiceFilter]);
  const displayedInvoicedInvoiceRows = useMemo(() => {
    if (invoicedInvoiceBatchQueryList.length === 0) return invoicedInvoiceRows;
    const batchSet = new Set(invoicedInvoiceBatchQueryList);
    return invoicedInvoiceRows.filter((item) => batchSet.has(String(item.invoiceBatch || "").trim()));
  }, [invoicedInvoiceBatchQueryList, invoicedInvoiceRows]);
  const allInvoiceRowsSelected = selectableInvoiceOrderNos.length > 0 && selectableInvoiceOrderNos.every((orderNo) => selectedInvoiceOrderNos.includes(orderNo));
  const allAppliedInvoiceRowsSelected = displayedAppliedInvoiceRows.length > 0 && displayedAppliedInvoiceRows.every((item) => selectedAppliedInvoiceOrderNos.includes(item.orderNo));
  const allInvoicedInvoiceRowsSelected = displayedInvoicedInvoiceRows.length > 0 && displayedInvoicedInvoiceRows.every((item) => selectedInvoicedInvoiceOrderNos.includes(item.orderNo));
  const selectedInvoiceSummary = useMemo(() => {
    const selectedOrderSet = new Set(selectedInvoiceOrderNos);
    const selectedRows = invoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const totalAmount = selectedRows.reduce((sum, item) => sum + (getPriceNumber(item.price) || 0), 0);

    return {
      count: selectedRows.length,
      totalAmount
    };
  }, [invoiceRows, selectedInvoiceOrderNos]);
  const selectedAppliedInvoiceSummary = useMemo(() => {
    const selectedOrderSet = new Set(selectedAppliedInvoiceOrderNos);
    const selectedRows = appliedInvoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const totalAmount = selectedRows.reduce((sum, item) => sum + (getPriceNumber(item.amount) || 0), 0);

    return {
      count: selectedRows.length,
      totalAmount
    };
  }, [appliedInvoiceRows, selectedAppliedInvoiceOrderNos]);
  const selectedInvoicedInvoiceSummary = useMemo(() => {
    const selectedOrderSet = new Set(selectedInvoicedInvoiceOrderNos);
    const selectedRows = invoicedInvoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const totalAmount = selectedRows.reduce((sum, item) => sum + (getPriceNumber(item.amount) || 0), 0);

    return {
      count: selectedRows.length,
      totalAmount
    };
  }, [invoicedInvoiceRows, selectedInvoicedInvoiceOrderNos]);
  const batchInvoiceSummary = useMemo(() => {
    const totalAmount = batchInvoiceOrderItems.reduce((sum, item) => sum + (getPriceNumber(item.price) || 0), 0);

    return {
      count: batchInvoiceOrderItems.length,
      totalAmount
    };
  }, [batchInvoiceOrderItems]);
  const activeProductDetailRow = useMemo(() => (
    invoiceRows.find((item) => item.orderNo === activeProductDetailOrderNo) || null
  ), [activeProductDetailOrderNo, invoiceRows]);
  const filteredInvoiceTitleRows = useMemo(() => {
    const titleKeyword = appliedInvoiceTitleManagementKeyword.trim().toLowerCase();

    return invoiceTitleRows.filter((item) => {
      if (appliedInvoiceTitleManagementStores.length > 0) {
        const storeNames = getBuyerPcMallInvoiceTitleStoreBindings(item).map((store) => store.name);
        if (!appliedInvoiceTitleManagementStores.some((storeName) => storeNames.includes(storeName))) {
          return false;
        }
      }

      if (titleKeyword && !String(item.title || "").toLowerCase().includes(titleKeyword)) {
        return false;
      }

      return true;
    });
  }, [appliedInvoiceTitleManagementKeyword, appliedInvoiceTitleManagementStores, invoiceTitleRows]);
  const invoiceTitleTotalPages = Math.max(1, Math.ceil(filteredInvoiceTitleRows.length / 10));
  const sidebarGroupsForInvoicePage = useMemo(() => (
    buyerPcMallSidebarGroups.map((group) => (
      group.title === "账户管理"
        ? { ...group, activeItem: "发票管理", items: ["收货地址管理", "发票管理", "个人信息", "账户安全管理", "身份认证"] }
        : group
    ))
  ), [invoicePageView]);

  useEffect(() => {
    if (!batchInvoiceNotice) return undefined;
    const timerId = window.setTimeout(() => setBatchInvoiceNotice(""), 2200);
    return () => window.clearTimeout(timerId);
  }, [batchInvoiceNotice]);

  useEffect(() => {
    setSelectedInvoiceOrderNos((current) => current.filter((orderNo) => selectableInvoiceOrderNos.includes(orderNo)));
  }, [selectableInvoiceOrderNos]);

  const handleToggleAllInvoiceRows = (checked) => {
    setSelectedInvoiceOrderNos(checked ? selectableInvoiceOrderNos : []);
  };

  const handleToggleInvoiceRow = (orderNo) => {
    const matchedOrder = invoiceRows.find((item) => item.orderNo === orderNo);
    if (getBuyerPcMallApplyDisabledReason(matchedOrder)) return;

    setSelectedInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleToggleAllAppliedInvoiceRows = (checked) => {
    setSelectedAppliedInvoiceOrderNos(checked ? displayedAppliedInvoiceRows.map((item) => item.orderNo) : []);
  };

  const handleToggleAppliedInvoiceRow = (orderNo) => {
    setSelectedAppliedInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleToggleAllInvoicedInvoiceRows = (checked) => {
    setSelectedInvoicedInvoiceOrderNos(checked ? displayedInvoicedInvoiceRows.map((item) => item.orderNo) : []);
  };

  const handleToggleInvoicedInvoiceRow = (orderNo) => {
    setSelectedInvoicedInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleOpenBatchInvoicePage = (mode = "merged") => {
    if (!hasInvoiceTitles) {
      setBatchInvoiceNotice(buyerPcMallMissingInvoiceTitleNotice);
      return;
    }

    if (selectedInvoiceOrderNos.length === 0) {
      setBatchInvoiceNotice("请先勾选订单，再进行申请开票。");
      return;
    }

    const selectedOrderSet = new Set(selectedInvoiceOrderNos);
    const selectedRows = invoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const blockedRow = selectedRows.find((item) => getBuyerPcMallApplyDisabledReason(item));
    const defaultTitleRow = invoiceTitleRows.find((item) => item.isDefault) || invoiceTitleRows[0] || null;
    if (blockedRow) {
      setBatchInvoiceNotice(`${getBuyerPcMallApplyDisabledReason(blockedRow)}。`);
      return;
    }
    const batchRows = selectedRows
      .map((item) => ({
        ...item,
        ...createBuyerPcMallBatchOrderInvoiceFields(defaultTitleRow),
        needInvoice: mode === "separate",
        buyerAccount: "zhuda123"
      }));

    setBatchInvoiceMode(mode);
    setBatchInvoiceOrderItems(batchRows);
    setInvoicePageView("batch");
  };

  const handleBatchInvoiceBack = () => {
    setBatchInvoiceMode("merged");
    setInvoicePageView("list");
  };
  const handleOpenInvoiceTitleManagement = () => {
    setInvoicePageView("title-management");
  };
  const handleInvoiceTitleManagementBack = () => {
    setInvoicePageView("list");
  };
  const handleOpenBuyerInvoiceDetail = (row, sourceType) => {
    setActiveBuyerInvoiceDetail(createBuyerPcMallInvoiceDetail(row, sourceType));
    setInvoicePageView("detail");
  };
  const handleCloseBuyerInvoiceDetail = () => {
    setActiveBuyerInvoiceDetail(null);
    setInvoicePageView("list");
  };
  const handleBuyerInvoicePdfAction = async (detail, action = "preview") => {
    if (!detail?.invoiceInfo?.canPreviewPdf) return;

    if (action === "preview") {
      const previewWindow = window.open("", "_blank");
      if (!previewWindow) {
        setBatchInvoiceNotice("浏览器拦截了新窗口，请允许弹窗后重试");
        return;
      }

      const previewTitle = `发票预览-${detail.invoiceInfo.invoiceNo || detail.orderInfo.orderNo || ""}`;
      renderInvoicePreviewLoading(previewWindow, previewTitle);

      try {
        const pdfUrl = await buildShopInvoicePreviewPdfUrl(detail);
        renderInvoicePreviewContent(previewWindow, pdfUrl, previewTitle);
      } catch (error) {
        previewWindow.document.open();
        previewWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(previewTitle)}</title>
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; color: #334155; font: 16px/1.6 "Microsoft YaHei", "PingFang SC", sans-serif; }
      .invoice-preview-error { padding: 20px 24px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08); }
    </style>
  </head>
  <body>
    <div class="invoice-preview-error">PDF 发票预览生成失败，请关闭后重试。</div>
  </body>
</html>`);
        previewWindow.document.close();
        setBatchInvoiceNotice("预览发票失败，请稍后重试");
      }
      return;
    }

    try {
      const pdfUrl = await buildShopInvoicePreviewPdfUrl(detail);
      downloadBlobUrl(pdfUrl, getInvoicePdfFileName(detail));
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 30 * 1000);
    } catch (error) {
      setBatchInvoiceNotice("下载发票失败，请稍后重试");
    }
  };
  const handleOpenInvoiceTitleModal = () => {
    setActiveInvoiceTitleForm(initialBuyerPcMallInvoiceTitleForm);
    setIsInvoiceTitleModalOpen(true);
  };
  const handleOpenEditInvoiceTitleModal = (row) => {
    setActiveInvoiceTitleForm(createBuyerPcMallInvoiceTitleFormFromRow(row));
    setIsInvoiceTitleModalOpen(true);
  };
  const handleCloseInvoiceTitleModal = () => {
    setActiveInvoiceTitleForm(initialBuyerPcMallInvoiceTitleForm);
    setIsInvoiceTitleModalOpen(false);
  };
  const handleOpenInvoiceTitleStores = (row) => {
    const stores = getBuyerPcMallInvoiceTitleStoreBindings(row);
    if (stores.length === 0) return;

    setActiveInvoiceTitleStores({
      title: row.title,
      stores
    });
  };
  const handleCloseInvoiceTitleStores = () => {
    setActiveInvoiceTitleStores(null);
  };
  const handleQueryInvoiceTitleManagement = () => {
    setAppliedInvoiceTitleManagementStores(draftInvoiceTitleManagementStores);
    setAppliedInvoiceTitleManagementKeyword(draftInvoiceTitleManagementKeyword.trim());
  };
  const handleResetInvoiceTitleManagement = () => {
    setDraftInvoiceTitleManagementStores([]);
    setInvoiceTitleManagementStoreKeyword("");
    setAppliedInvoiceTitleManagementStores([]);
    setDraftInvoiceTitleManagementKeyword("");
    setAppliedInvoiceTitleManagementKeyword("");
  };
  const handleDeleteInvoiceTitle = (titleId) => {
    setInvoiceTitleRows((current) => current.filter((item) => item.id !== titleId));
    setBatchInvoiceNotice("删除发票抬头成功");
  };
  const handleSaveInvoiceTitle = (form) => {
    const nextRow = {
      id: form.id || `title-${Date.now()}`,
      title: form.titleName,
      invoiceType: form.invoiceType,
      invoiceTypeTone: form.invoiceType.includes("专用") ? "blue" : "purple",
      titleType: form.titleType,
      taxpayerId: form.taxpayerId,
      registeredAddress: form.registeredAddress,
      phone: form.phone,
      bank: form.bank,
      bankAccount: form.bankAccount,
      receiverPhone: form.receiverPhone,
      receiverEmail: form.receiverEmail,
      storeBindings: createBuyerPcMallStoreBindings(form.storeName),
      isDefault: form.isDefault
    };

    setInvoiceTitleRows((current) => {
      const normalizedCurrent = form.isDefault ? current.map((item) => ({ ...item, isDefault: false })) : current;
      if (form.id) {
        return normalizedCurrent.map((item) => (item.id === form.id ? { ...item, ...nextRow } : item));
      }
      return [nextRow, ...normalizedCurrent];
    });
    setIsInvoiceTitleModalOpen(false);
    setActiveInvoiceTitleForm(initialBuyerPcMallInvoiceTitleForm);
    setBatchInvoiceNotice(form.id ? "编辑发票抬头成功" : "新增发票抬头成功");
  };

  const handleBatchInvoiceSubmit = (form) => {
    const appliedAt = formatBuyerPcMallDateTime();
    const submitOrderItems = Array.isArray(form.orderItems) && form.orderItems.length > 0 ? form.orderItems : batchInvoiceOrderItems;
    const selectedOrderNos = new Set(submitOrderItems.map((item) => item.orderNo));
    const currentDate = new Date();
    const mergedInvoiceBatch = createBuyerPcMallInvoiceBatchNo(currentDate, "001");
    const nextAppliedRows = submitOrderItems.map((item, index) => (
      createBuyerPcMallAppliedInvoiceRow(
        item,
        form.orderItems
          ? {
            ...form,
            invoiceType: item.invoiceType || form.invoiceType,
            titleType: item.titleType || form.titleType,
            titleName: item.invoiceTitle || form.titleName,
            taxpayerId: item.taxpayerId || "",
            registeredAddress: item.registeredAddress || "",
            phone: item.phone || "",
            bank: item.bank || "",
            bankAccount: item.bankAccount || "",
            receiverPhone: item.receiverPhone || "",
            receiverEmail: item.receiverEmail || ""
          }
          : form,
        appliedAt,
        batchInvoiceMode === "merged"
          ? mergedInvoiceBatch
          : createBuyerPcMallInvoiceBatchNo(currentDate, String(index + 1).padStart(3, "0"))
      )
    ));

    setInvoiceRows((current) => current.filter((item) => !selectedOrderNos.has(item.orderNo)));
    setAppliedInvoiceRows((current) => [...nextAppliedRows, ...current]);
    setSelectedInvoiceOrderNos((current) => current.filter((orderNo) => !selectedOrderNos.has(orderNo)));
    setBatchInvoiceOrderItems([]);
    setBatchInvoiceMode("merged");
    setInvoicePageView("list");
    setActiveTab("已申请开票");
    setBatchInvoiceNotice("批量申请开票成功");
  };
  const handleOpenSingleInvoiceModal = (orderNo) => {
    if (!hasInvoiceTitles) {
      setBatchInvoiceNotice(buyerPcMallMissingInvoiceTitleNotice);
      return;
    }

    const matchedOrder = invoiceRows.find((item) => item.orderNo === orderNo);
    if (!matchedOrder) return;
    const defaultTitleRow = invoiceTitleRows.find((item) => item.isDefault) || invoiceTitleRows[0] || null;
    const applyDisabledReason = getBuyerPcMallApplyDisabledReason(matchedOrder);
    if (applyDisabledReason) {
      setBatchInvoiceNotice(`${applyDisabledReason}。`);
      return;
    }

    setSingleInvoiceOrder({
      ...matchedOrder,
      ...createBuyerPcMallBatchOrderInvoiceFields(defaultTitleRow),
      needInvoice: "",
      buyerAccount: "zhuda123"
    });
  };
  const handleCloseSingleInvoiceModal = () => {
    setSingleInvoiceOrder(null);
  };
  const handleSingleInvoiceSubmit = (form) => {
    if (!singleInvoiceOrder) return;

    const submitOrder = Array.isArray(form.orderItems) && form.orderItems.length > 0 ? form.orderItems[0] : singleInvoiceOrder;
    const nextAppliedRow = createBuyerPcMallAppliedInvoiceRow(submitOrder, form);
    setInvoiceRows((current) => current.filter((item) => item.orderNo !== singleInvoiceOrder.orderNo));
    setAppliedInvoiceRows((current) => [nextAppliedRow, ...current]);
    setSelectedInvoiceOrderNos((current) => current.filter((orderNo) => orderNo !== singleInvoiceOrder.orderNo));
    setSingleInvoiceOrder(null);
    setActiveTab("已申请开票");
    setBatchInvoiceNotice("申请开票成功");
  };

  const handleToggleSingleInvoiceOrder = (orderNo, value) => {
    setSingleInvoiceOrder((current) => (
      current && current.orderNo === orderNo
        ? { ...current, needInvoice: value ?? current.needInvoice }
        : current
    ));
  };

  const handleToggleBatchInvoiceOrder = (orderNo) => {
    setBatchInvoiceOrderItems((current) => current.map((item) => (
      item.orderNo === orderNo
        ? { ...item, needInvoice: !item.needInvoice }
        : item
    )));
  };

  const handleRemoveBatchInvoiceOrder = (orderNo) => {
    setBatchInvoiceOrderItems((current) => {
      if (current.length <= 1) {
        setBatchInvoiceNotice("请至少保留一笔订单");
        return current;
      }

      return current.filter((item) => item.orderNo !== orderNo);
    });
  };

  const handleOpenBatchModifyModal = () => {
    if (selectedAppliedInvoiceOrderNos.length === 0) {
      setBatchInvoiceNotice("请先勾选已申请开票订单，再进行批量修改。");
      return;
    }

    const selectedSet = new Set(selectedAppliedInvoiceOrderNos);
    const selectedRows = appliedInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
    const blockedRow = selectedRows.find((item) => item.modifiedOnce);
    if (blockedRow) {
      setBatchInvoiceNotice("所选订单中包含已修改过开票信息的订单，无法再次修改。");
      return;
    }

    setModifyInvoiceOrders(selectedRows.map((item) => createBuyerPcMallBatchItemFromAppliedRow(item, invoiceTitleRows)));
    setModifyInvoiceInitialForm(createBuyerPcMallModifyInvoiceFormFromAppliedRow(selectedRows[0]));
  };

  const handleCloseModifyInvoiceModal = () => {
    setModifyInvoiceOrders([]);
    setModifyInvoiceInitialForm(buyerPcMallBatchInvoiceForm);
  };

  const handleToggleModifyInvoiceOrder = (orderNo) => {
    setModifyInvoiceOrders((current) => current.map((item) => (
      item.orderNo === orderNo
        ? { ...item, needInvoice: !item.needInvoice }
        : item
    )));
  };

  const handleRemoveModifyInvoiceOrder = (orderNo) => {
    setModifyInvoiceOrders((current) => {
      if (current.length <= 1) {
        setBatchInvoiceNotice("请至少保留一笔订单");
        return current;
      }

      return current.filter((item) => item.orderNo !== orderNo);
    });
  };

  const handleSubmitModifyInvoice = (form) => {
    const modifiedAt = formatBuyerPcMallDateTime();
    const submitOrderItems = Array.isArray(form.orderItems) && form.orderItems.length > 0 ? form.orderItems : modifyInvoiceOrders;
    const enabledModifyOrders = submitOrderItems.filter((item) => item.needInvoice);

    if (enabledModifyOrders.length === 0) {
      return;
    }

    const targetOrderNos = new Set(enabledModifyOrders.map((item) => item.orderNo));
    const submitOrderMap = new Map(submitOrderItems.map((item) => [item.orderNo, item]));

    setAppliedInvoiceRows((current) => current.map((item) => {
      if (!targetOrderNos.has(item.orderNo)) return item;
      const orderItem = submitOrderMap.get(item.orderNo) || item;
      const invoiceSource = form.orderItems ? orderItem : form;
      const titleType = invoiceSource.invoiceType === "电子增值税专用发票" ? "企业" : invoiceSource.titleType;
      return {
        ...item,
        invoiceTitle: invoiceSource.invoiceTitle || invoiceSource.titleName || item.invoiceTitle,
        invoiceType: invoiceSource.invoiceType,
        invoiceTypeTone: invoiceSource.invoiceType.includes("专用") ? "blue" : "purple",
        taxpayerId: titleType === "个人" ? "-" : invoiceSource.taxpayerId,
        titleType,
        registeredAddress: invoiceSource.registeredAddress || "-",
        phone: invoiceSource.phone || "-",
        bank: invoiceSource.bank || "-",
        bankAccount: invoiceSource.bankAccount || "-",
        store: form.orderItems ? item.store : (form.storeName || item.store),
        receiverPhone: invoiceSource.receiverPhone || "-",
        receiverEmail: invoiceSource.receiverEmail || "-",
        invoiceContent: form.orderItems ? (orderItem.invoiceContent || item.invoiceContent || "商品类别") : form.invoiceContent,
        singleInvoice: normalizeShopInvoiceMode(orderItem.needInvoice ? "是" : "否"),
        remark: form.orderItems ? (item.remark || "发票申请已提交，请等待供应商开票。") : (form.remark || "发票申请已提交，请等待供应商开票。"),
        modifiedOnce: true,
        modifiedAt
      };
    }));

    setActiveBuyerInvoiceDetail((current) => {
      if (!current || !targetOrderNos.has(current.orderInfo.orderNo)) return current;
      const targetRow = appliedInvoiceRows.find((item) => item.orderNo === current.orderInfo.orderNo);
      const orderItem = submitOrderMap.get(current.orderInfo.orderNo);
      const invoiceSource = form.orderItems ? orderItem : form;
      if (!targetRow || !invoiceSource) return current;
      return createBuyerPcMallInvoiceDetail({
        ...targetRow,
        invoiceTitle: invoiceSource.invoiceTitle || invoiceSource.titleName || targetRow.invoiceTitle,
        invoiceType: invoiceSource.invoiceType,
        invoiceTypeTone: invoiceSource.invoiceType.includes("专用") ? "blue" : "purple",
        taxpayerId: invoiceSource.invoiceType === "电子增值税专用发票" || invoiceSource.titleType === "企业" ? invoiceSource.taxpayerId : "-",
        titleType: invoiceSource.invoiceType === "电子增值税专用发票" ? "企业" : invoiceSource.titleType,
        registeredAddress: invoiceSource.registeredAddress || "-",
        phone: invoiceSource.phone || "-",
        bank: invoiceSource.bank || "-",
        bankAccount: invoiceSource.bankAccount || "-",
        store: form.orderItems ? targetRow.store : (form.storeName || targetRow.store),
        receiverPhone: invoiceSource.receiverPhone || "-",
        receiverEmail: invoiceSource.receiverEmail || "-",
        invoiceContent: form.orderItems ? (orderItem?.invoiceContent || targetRow.invoiceContent || "商品类别") : form.invoiceContent,
        singleInvoice: normalizeShopInvoiceMode(orderItem?.needInvoice ? "是" : "否"),
        remark: form.orderItems ? (targetRow.remark || "发票申请已提交，请等待供应商开票。") : (form.remark || "发票申请已提交，请等待供应商开票。"),
        modifiedOnce: true,
        modifiedAt
      }, "applied");
    });

    handleCloseModifyInvoiceModal();
    setBatchInvoiceNotice("修改开票信息成功");
  };

  const handleOpenDetailModifyModal = () => {
    if (!activeBuyerInvoiceDetail?.canModifyInvoiceInfo) return;
    setInvoiceActionModal({
      type: "modify",
      title: "修改开票信息",
      message: "仅能支持修改一次开票信息"
    });
  };

  const handleConfirmDetailModifyModal = () => {
    if (!activeBuyerInvoiceDetail?.canModifyInvoiceInfo) {
      setInvoiceActionModal(null);
      return;
    }
    const targetRow = appliedInvoiceRows.find((item) => item.orderNo === activeBuyerInvoiceDetail.orderInfo.orderNo);
    if (!targetRow) {
      setInvoiceActionModal(null);
      return;
    }
    setInvoiceActionModal(null);
    setModifyInvoiceOrders([createBuyerPcMallBatchItemFromAppliedRow(targetRow, invoiceTitleRows)]);
    setModifyInvoiceInitialForm(createBuyerPcMallModifyInvoiceFormFromAppliedRow(targetRow));
  };

  const handleConfirmRevokeOrders = (orderNos) => {
    const targetSet = new Set(orderNos);
    const revokedRows = appliedInvoiceRows.filter((item) => targetSet.has(item.orderNo));
    if (revokedRows.length === 0) {
      setInvoiceActionModal(null);
      return;
    }

    setAppliedInvoiceRows((current) => current.filter((item) => !targetSet.has(item.orderNo)));
    setInvoiceRows((current) => [...revokedRows.map(createBuyerPcMallPendingInvoiceRowFromRevoked), ...current]);
    setSelectedAppliedInvoiceOrderNos((current) => current.filter((item) => !targetSet.has(item)));
    if (activeBuyerInvoiceDetail && targetSet.has(activeBuyerInvoiceDetail.orderInfo.orderNo)) {
      setActiveBuyerInvoiceDetail(null);
      setInvoicePageView("list");
    }
    setInvoiceActionModal(null);
    setActiveTab("可申请开票");
    setBatchInvoiceNotice(orderNos.length > 1 ? "批量撤销申请成功" : "撤销申请成功");
  };

  const handleOpenBatchRevokeModal = () => {
    if (selectedAppliedInvoiceOrderNos.length === 0) {
      setBatchInvoiceNotice("请先勾选已申请开票订单，再进行撤销。");
      return;
    }

    setInvoiceActionModal({
      type: buyerPcMallDetailActionLabels.revoke,
      title: "撤销申请",
      message: `确认撤销这${selectedAppliedInvoiceOrderNos.length}笔订单的开票申请吗？`,
      orderNos: selectedAppliedInvoiceOrderNos
    });
  };

  const handleOpenDetailRevokeModal = () => {
    if (!activeBuyerInvoiceDetail?.canRevokeApplication) return;
    setInvoiceActionModal({
      type: buyerPcMallDetailActionLabels.revoke,
      title: "撤销申请",
      message: "确认撤销当前订单的开票申请吗？",
      orderNos: [activeBuyerInvoiceDetail.orderInfo.orderNo]
    });
  };

  const handleOpenRowRevokeModal = (orderNo) => {
    if (!orderNo) return;
    setInvoiceActionModal({
      type: buyerPcMallDetailActionLabels.revoke,
      title: "撤销申请",
      message: "确认撤销当前订单的开票申请吗？",
      orderNos: [orderNo]
    });
  };

  const handleOpenInvoiceBatchQueryModal = (target) => {
    setInvoiceBatchQueryModal({
      target,
      value: target === "applied" ? draftAppliedInvoiceBatchQuery : draftInvoicedInvoiceBatchQuery
    });
  };

  const handleCloseInvoiceBatchQueryModal = () => {
    setInvoiceBatchQueryModal(null);
  };

  const handleChangeInvoiceBatchQueryModal = (value) => {
    setInvoiceBatchQueryModal((current) => (current ? { ...current, value } : current));
  };

  const handleConfirmInvoiceBatchQueryModal = () => {
    if (!invoiceBatchQueryModal) return;
    const normalizedValue = normalizePcMallBatchQueryValue(invoiceBatchQueryModal.value);
    const parsedList = parsePcMallBatchQueryList(normalizedValue);

    if (invoiceBatchQueryModal.target === "applied") {
      setDraftAppliedInvoiceBatchQuery(normalizedValue);
      setAppliedInvoiceBatchQueryList(parsedList);
      setSelectedAppliedInvoiceOrderNos([]);
      setBatchInvoiceNotice(parsedList.length > 0 ? `已按${parsedList.length}个开票批次筛选` : "已清空开票批次筛选");
    } else {
      setDraftInvoicedInvoiceBatchQuery(normalizedValue);
      setInvoicedInvoiceBatchQueryList(parsedList);
      setSelectedInvoicedInvoiceOrderNos([]);
      setBatchInvoiceNotice(parsedList.length > 0 ? `已按${parsedList.length}个开票批次筛选` : "已清空开票批次筛选");
    }

    setInvoiceBatchQueryModal(null);
  };

  const handleQueryAppliedInvoices = () => {
    const parsedList = parsePcMallBatchQueryList(draftAppliedInvoiceBatchQuery);
    setAppliedSingleInvoiceFilter(draftAppliedSingleInvoice);
    setAppliedInvoiceBatchQueryList(parsedList);
    setSelectedAppliedInvoiceOrderNos([]);
  };

  const handleResetAppliedInvoices = () => {
    setDraftAppliedSingleInvoice("");
    setAppliedSingleInvoiceFilter("");
    setDraftAppliedInvoiceBatchQuery("");
    setAppliedInvoiceBatchQueryList([]);
    setSelectedAppliedInvoiceOrderNos([]);
  };

  const handleQueryInvoicedInvoices = () => {
    const parsedList = parsePcMallBatchQueryList(draftInvoicedInvoiceBatchQuery);
    setInvoicedInvoiceBatchQueryList(parsedList);
    setSelectedInvoicedInvoiceOrderNos([]);
  };

  const handleResetInvoicedInvoices = () => {
    setDraftInvoicedInvoiceBatchQuery("");
    setInvoicedInvoiceBatchQueryList([]);
    setSelectedInvoicedInvoiceOrderNos([]);
  };

  const handleExportPendingQueryData = () => {
    const didExport = exportBuyerPcMallPendingInvoiceWorkbook(displayedPendingInvoiceRows);
    if (!didExport) {
      setBatchInvoiceNotice("当前没有可导出的查询数据。");
      return;
    }
    setBatchInvoiceNotice("可申请开票查询数据导出成功");
  };

  const handleExportAppliedQueryData = () => {
    const didExport = exportBuyerPcMallAppliedInvoiceWorkbook(appliedInvoiceRows);
    if (!didExport) {
      setBatchInvoiceNotice("当前没有可导出的查询数据。");
      return;
    }
    setBatchInvoiceNotice("已申请开票查询数据导出成功");
  };

  const handleExportInvoicedQueryData = () => {
    const didExport = exportBuyerPcMallInvoicedInvoiceWorkbook(displayedInvoicedInvoiceRows);
    if (!didExport) {
      setBatchInvoiceNotice("当前没有可导出的查询数据。");
      return;
    }
    setBatchInvoiceNotice("已开具发票查询数据导出成功");
  };

  const isPendingTab = activeTab === "可申请开票";
  const isAppliedTab = activeTab === "已申请开票";
  const isInvoicedTab = activeTab === "已开具发票";
  const buyerPcMallOrderTabs = useMemo(() => ([
    { key: "可申请开票", label: `可申请开票(${invoiceRows.length})` },
    { key: "已申请开票", label: `已申请开票(${appliedInvoiceRows.length})` },
    { key: "已开具发票", label: `已开具发票(${invoicedInvoiceRows.length})` }
  ]), [appliedInvoiceRows.length, invoiceRows.length, invoicedInvoiceRows.length]);
  const currentInvoiceTabTotal = isPendingTab ? invoiceRows.length : isAppliedTab ? appliedInvoiceRows.length : invoicedInvoiceRows.length;
  const isBatchInvoiceView = invoicePageView === "batch";
  const isInvoiceTitleManagementView = invoicePageView === "title-management";
  const isInvoiceDetailView = invoicePageView === "detail";
  const shouldEnableInvoiceDetailScroll = isInvoiceDetailView && (isAppliedTab || isInvoicedTab);
  const defaultInvoiceTitleRow = invoiceTitleRows.find((item) => item.isDefault) || invoiceTitleRows[0] || null;
  const batchInvoiceModal = isBatchInvoiceView ? (
    <BuyerPcMallBatchInvoiceModal
      initialForm={createBuyerPcMallBatchInvoiceFormFromTitleRow(defaultInvoiceTitleRow)}
      orderItems={batchInvoiceOrderItems}
      invoiceTitleRows={invoiceTitleRows}
      onOrderItemsChange={setBatchInvoiceOrderItems}
      summary={batchInvoiceSummary}
      onClose={handleBatchInvoiceBack}
      onSubmit={handleBatchInvoiceSubmit}
      onNotice={setBatchInvoiceNotice}
      onToggleOrder={handleToggleBatchInvoiceOrder}
      onRemoveOrder={handleRemoveBatchInvoiceOrder}
      title="批量申请开票"
      submitButtonText="提交申请"
      summaryTitle={`本次批量申请开票共 ${batchInvoiceSummary.count} 笔订单，申请开票金额合计：￥${batchInvoiceSummary.totalAmount.toFixed(2)}`}
      allowToggleOrder={false}
      showOrderGroupMode
      showSeparateInvoiceColumn
      hideInvoiceAndReceiverSections
    />
  ) : null;
  const modifyInvoiceModal = modifyInvoiceOrders.length > 0 ? (
    <BuyerPcMallBatchInvoiceModal
      initialForm={modifyInvoiceInitialForm}
      orderItems={modifyInvoiceOrders}
      invoiceTitleRows={invoiceTitleRows}
      onOrderItemsChange={setModifyInvoiceOrders}
      summary={{
        count: modifyInvoiceOrders.length,
        totalAmount: modifyInvoiceOrders.reduce((sum, item) => sum + (getPriceNumber(item.price) || 0), 0)
      }}
      onClose={handleCloseModifyInvoiceModal}
      onSubmit={handleSubmitModifyInvoice}
      onNotice={setBatchInvoiceNotice}
      onToggleOrder={handleToggleModifyInvoiceOrder}
      onRemoveOrder={handleRemoveModifyInvoiceOrder}
      title={modifyInvoiceOrders.length === 1 ? "修改开票信息" : "批量修改开票信息"}
      submitButtonText="确认修改"
      summaryTitle=""
      allowToggleOrder={false}
      showOrderGroupMode
      showSeparateInvoiceColumn
      hideInvoiceAndReceiverSections
      allowRemoveOrder={false}
      enableBatchTitleReplace={modifyInvoiceOrders.length > 1}
    />
  ) : null;
  const singleInvoiceModal = singleInvoiceOrder ? (
    <BuyerPcMallBatchInvoiceModal
      initialForm={buyerPcMallBatchInvoiceForm}
      orderItems={[singleInvoiceOrder]}
      summary={{
        count: 1,
        enabledCount: singleInvoiceOrder.needInvoice ? 1 : 0,
        totalAmount: getPriceNumber(singleInvoiceOrder.price) || 0
      }}
      onClose={handleCloseSingleInvoiceModal}
      onSubmit={handleSingleInvoiceSubmit}
      onNotice={setBatchInvoiceNotice}
      onToggleOrder={handleToggleSingleInvoiceOrder}
      onRemoveOrder={() => {}}
      title="申请开票"
      submitButtonText="提交申请"
      summaryTitle={`本次申请开票共 1 笔订单，申请开票金额合计：￥${(getPriceNumber(singleInvoiceOrder.price) || 0).toFixed(2)}`}
      allowToggleOrder={false}
      allowRemoveOrder={false}
      showSeparateInvoiceColumn
      editableSeparateInvoiceColumn
      hideInvoiceAndReceiverSections
    />
  ) : null;

  if (isInvoiceTitleManagementView) {
    return (
      <div className="pc-mall-shell">
        {batchInvoiceNotice ? <div className="page-toast">{batchInvoiceNotice}</div> : null}
        <header className="pc-mall-topbar">
          <div className="pc-mall-topbar-inner">
            <div className="pc-mall-brand">
              <span className="pc-mall-brand-mark">⬆</span>
              <span className="pc-mall-brand-name">闪电帮帮</span>
              <span className="pc-mall-brand-account">NFSQ369（ID:13641）</span>
              <button className="pc-mall-toplink" type="button">退出</button>
            </div>
            <div className="pc-mall-toplinks">
              <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("operations-admin")}>运营后台</button>
              <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("supplier-admin")}>供应商后台</button>
              <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("miniapp-mall")}>买家小程序商城</button>
              <button className="pc-mall-toplink" type="button">我的美团闪电帮帮</button>
              <button className="pc-mall-toplink pc-mall-cart" type="button">购物车(24)</button>
              <button className="pc-mall-toplink" type="button">微信小程序</button>
              <button className="pc-mall-toplink" type="button">卖家中心⌄</button>
              <button className="pc-mall-toplink" type="button">客户中心⌄</button>
            </div>
          </div>
        </header>

        <div className="pc-mall-main">
          <aside className="pc-mall-sidebar">
            {sidebarGroupsForInvoicePage.map((group) => (
              <section className="pc-mall-side-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.items ? (
                  <div className="pc-mall-side-links">
                    {group.items.map((item) => (
                      <button className={`pc-mall-side-link ${group.activeItem === item ? "is-active" : ""}`} key={item} type="button">{item}</button>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </aside>

          <section className="pc-mall-content">
            <div className="pc-mall-breadcrumb">商家中心 <span>››</span> 发票管理 <span>››</span> 发票抬头管理</div>
            <div className="pc-mall-panel">
              <div className="pc-mall-invoice-title-head">
                <div className="pc-mall-invoice-title-head-main">
                  <div className="pc-mall-invoice-title-head-left">
                    <div className="pc-mall-invoice-title-headline">
                      <h2>发票抬头管理</h2>
                      <p>{`（您已创建${invoiceTitleRows.length}个发票抬头）`}</p>
                    </div>
                    <button className="pc-mall-invoice-title-create-btn" type="button" onClick={handleOpenInvoiceTitleModal}>新增发票抬头</button>
                  </div>
                  <div className="pc-mall-invoice-title-head-actions">
                    <button className="pc-mall-back-link" type="button" onClick={handleInvoiceTitleManagementBack}>← 返回</button>
                  </div>
                </div>
              </div>

              <section className="pc-mall-filter-card pc-mall-invoice-title-filter-card">
                <div className="pc-mall-filter-grid">
                  <label className="pc-mall-filter-field">
                    <span>闪购门店</span>
                    <PcMallSearchSelect
                      options={buyerPcMallStoreSearchOptions}
                      values={draftInvoiceTitleManagementStores}
                      onChange={setDraftInvoiceTitleManagementStores}
                      searchValue={invoiceTitleManagementStoreKeyword}
                      onSearchChange={setInvoiceTitleManagementStoreKeyword}
                      placeholder="输入闪购门店名称/闪购门店ID，支持全模糊查询"
                    />
                  </label>
                  <label className="pc-mall-filter-field">
                    <span>发票抬头</span>
                    <input placeholder="输入发票抬头" value={draftInvoiceTitleManagementKeyword} onChange={(event) => setDraftInvoiceTitleManagementKeyword(event.target.value)} />
                  </label>
                  <div className="pc-mall-filter-actions pc-mall-filter-actions-inline">
                    <button className="pc-mall-btn" type="button" onClick={handleResetInvoiceTitleManagement}>重置</button>
                    <button className="pc-mall-btn pc-mall-btn-dark" type="button" onClick={handleQueryInvoiceTitleManagement}>查询</button>
                  </div>
                </div>
              </section>

              <div className="pc-mall-invoice-title-list">
                {filteredInvoiceTitleRows.map((item) => (
                  <article className="pc-mall-invoice-title-card" key={item.id}>
                    <div className="pc-mall-invoice-title-card-main">
                      <div className="pc-mall-invoice-title-name">{item.title}</div>
                      <div className="pc-mall-invoice-title-tags">
                        {item.isDefault ? <span className="pc-mall-invoice-title-default-tag">默认</span> : null}
                        <span className={`pc-mall-invoice-tag is-${item.invoiceTypeTone}`}>{item.invoiceType}</span>
                        <span className="pc-mall-invoice-title-type-tag">{item.titleType}</span>
                      </div>
                      {getBuyerPcMallInvoiceTitleStoreBindings(item).length > 0 ? (
                        <div className="pc-mall-invoice-title-store-row">
                          <span className="pc-mall-invoice-title-store-label">闪购门店：</span>
                          <span className="pc-mall-invoice-title-store-summary" title={getBuyerPcMallInvoiceTitlePrimaryStore(item)}>
                            {getBuyerPcMallInvoiceTitlePrimaryStore(item)}
                          </span>
                          <button className="pc-mall-invoice-title-store-link" type="button" onClick={() => handleOpenInvoiceTitleStores(item)}>全部</button>
                        </div>
                      ) : null}
                      <div className="pc-mall-invoice-title-info-grid">
                        {item.taxpayerId ? <div><span>纳税人识别号：</span><strong>{item.taxpayerId}</strong></div> : null}
                        {item.registeredAddress ? <div><span>企业地址：</span><strong>{item.registeredAddress}</strong></div> : null}
                        {item.phone ? <div><span>企业电话：</span><strong>{item.phone}</strong></div> : null}
                        {item.bank ? <div><span>开户银行名称：</span><strong>{item.bank}</strong></div> : null}
                        {item.bankAccount ? <div><span>开户银行账号：</span><strong>{item.bankAccount}</strong></div> : null}
                        {item.receiverPhone ? <div><span>收票人手机：</span><strong>{item.receiverPhone}</strong></div> : null}
                        {item.receiverEmail ? <div><span>收票人邮箱：</span><strong>{item.receiverEmail}</strong></div> : null}
                      </div>
                    </div>
                    <div className="pc-mall-invoice-title-actions">
                      <button className={`pc-mall-invoice-title-default-btn ${item.isDefault ? "is-active" : ""}`} type="button">
                        <span className="pc-mall-invoice-title-default-dot" />
                        设为默认
                      </button>
                      <button className="pc-mall-invoice-title-icon-btn" type="button" onClick={() => handleOpenEditInvoiceTitleModal(item)}>编辑</button>
                      <button className="pc-mall-invoice-title-icon-btn" type="button" onClick={() => handleDeleteInvoiceTitle(item.id)}>删除</button>
                    </div>
                  </article>
                ))}
                {filteredInvoiceTitleRows.length === 0 ? <div className="pc-mall-invoice-title-empty">暂无符合条件的发票抬头</div> : null}
              </div>

              <div className="pc-mall-pagination-wrap">
                <div className="pc-mall-pagination">
                  <span className="pc-mall-pagination-total">{`共计 ${filteredInvoiceTitleRows.length} 条`}</span>
                  <button className="pc-mall-page-size" type="button">10 条/页</button>
                  <div className="pc-mall-page-list">
                    <button className="pc-mall-page-btn is-arrow" type="button">‹</button>
                    <button className="pc-mall-page-btn is-active" type="button">1</button>
                    {invoiceTitleTotalPages >= 2 ? <button className="pc-mall-page-btn" type="button">2</button> : null}
                    {invoiceTitleTotalPages >= 3 ? <button className="pc-mall-page-btn" type="button">3</button> : null}
                    <button className="pc-mall-page-btn is-arrow" type="button">›</button>
                  </div>
                  <span className="pc-mall-pagination-jump-label">到第</span>
                  <input className="pc-mall-page-input" placeholder="请输入" />
                  <span className="pc-mall-pagination-jump-label">页</span>
                  <button className="pc-mall-page-jump" type="button">跳转</button>
                </div>
              </div>
            </div>
          </section>
        </div>
        {isInvoiceTitleModalOpen ? <BuyerPcMallInvoiceTitleModal initialForm={activeInvoiceTitleForm} storeOptions={buyerPcMallStoreOptions} onClose={handleCloseInvoiceTitleModal} onSave={handleSaveInvoiceTitle} onNotice={setBatchInvoiceNotice} /> : null}
        {activeInvoiceTitleStores ? <BuyerPcMallInvoiceTitleStoreModal title={activeInvoiceTitleStores.title} stores={activeInvoiceTitleStores.stores} onClose={handleCloseInvoiceTitleStores} /> : null}
      </div>
    );
  }

  return (
    <div className={`pc-mall-shell ${shouldEnableInvoiceDetailScroll ? "pc-mall-shell-detail-scroll" : "pc-mall-shell-batch"}`}>
      <header className="pc-mall-topbar">
        <div className="pc-mall-topbar-inner">
          <div className="pc-mall-brand">
            <span className="pc-mall-brand-mark">⬆</span>
            <span className="pc-mall-brand-name">闪电帮帮</span>
            <span className="pc-mall-brand-account">NFSQ369（ID:13641）</span>
            <button className="pc-mall-toplink" type="button">退出</button>
          </div>
          <div className="pc-mall-toplinks">
            <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("operations-admin")}>运营后台</button>
            <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("supplier-admin")}>供应商后台</button>
            <button className="pc-mall-toplink pc-mall-portal-entry" type="button" onClick={() => onPortalActionClick?.("miniapp-mall")}>买家小程序商城</button>
            <button className="pc-mall-toplink" type="button">我的美团闪电帮帮</button>
            <button className="pc-mall-toplink pc-mall-cart" type="button">购物车(24)</button>
            <button className="pc-mall-toplink" type="button">微信小程序</button>
            <button className="pc-mall-toplink" type="button">卖家中心⌄</button>
            <button className="pc-mall-toplink" type="button">客户中心⌄</button>
          </div>
        </div>
      </header>

      <div className={`pc-mall-main ${shouldEnableInvoiceDetailScroll ? "pc-mall-main-detail-scroll" : "pc-mall-main-batch"}`}>
        <aside className="pc-mall-sidebar">
          {sidebarGroupsForInvoicePage.map((group) => (
            <section className="pc-mall-side-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.items ? (
                <div className="pc-mall-side-links">
                  {group.items.map((item) => (
                    <button className={`pc-mall-side-link ${group.activeItem === item ? "is-active" : ""}`} key={item} type="button">{item}</button>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </aside>

        <section className={`pc-mall-content ${shouldEnableInvoiceDetailScroll ? "pc-mall-content-detail-scroll" : "pc-mall-content-batch"}`}>
          {batchInvoiceNotice ? <div className="page-toast">{batchInvoiceNotice}</div> : null}
          <div className="pc-mall-breadcrumb">商家中心 <span>››</span> 发票管理{isInvoiceDetailView ? <><span>››</span> 发票详情</> : null}</div>
          <div className={`pc-mall-panel ${isInvoiceDetailView ? "pc-mall-panel-detail" : ""}`}>
            {!isInvoiceDetailView ? (
              <div className="pc-mall-panel-header">
                <h1>发票管理</h1>
              </div>
            ) : null}

            {!isInvoiceDetailView ? (
              <div className="pc-mall-tabbar">
              <div className="pc-mall-tabs">
                {buyerPcMallOrderTabs.map((tab) => (
                  <button className={`pc-mall-tab ${activeTab === tab.key ? "is-active" : ""}`} key={tab.key} type="button" onClick={() => {
                    setActiveTab(tab.key);
                    setActiveBuyerInvoiceDetail(null);
                    setInvoicePageView("list");
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button className="pc-mall-invoice-type-btn" type="button" onClick={handleOpenInvoiceTitleManagement}>发票抬头管理</button>
              </div>
            ) : null}

            {isInvoiceDetailView && activeBuyerInvoiceDetail ? (
              <BuyerPcMallInvoiceDetailPage
                detail={activeBuyerInvoiceDetail}
                onBack={handleCloseBuyerInvoiceDetail}
                onPreview={(action) => handleBuyerInvoicePdfAction(activeBuyerInvoiceDetail, action)}
                onModifyInvoiceInfo={handleOpenDetailModifyModal}
                onRevokeApplication={handleOpenDetailRevokeModal}
              />
            ) : null}

            {!isInvoiceDetailView ? (
              <div className="pc-mall-invoice-list-scroll">
                {isPendingTab ? (
                  <>
                <section className="pc-mall-filter-card">
                  <div className="pc-mall-filter-grid">
                    <label className="pc-mall-filter-field">
                  <span>关键字</span>
                  <input defaultValue="支持订单号/店铺名称" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>支付时间</span>
                      <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>下单账号</span>
                      <PcMallMultiSelect options={buyerPcMallAccountOptions} values={selectedPendingAccounts} onChange={setSelectedPendingAccounts} placeholder="请选择下单账号" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>闪购门店</span>
                      <PcMallSearchSelect
                        options={buyerPcMallStoreSearchOptions}
                        values={selectedPendingStores}
                        onChange={setSelectedPendingStores}
                        searchValue={pendingStoreKeyword}
                        onSearchChange={setPendingStoreKeyword}
                        placeholder="请输入闪购门店名称/闪购门店ID，支持全模糊查询"
                      />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>开票状态</span>
                      <PcMallMultiSelect options={buyerPcMallStatusOptions} values={selectedPendingStatuses} onChange={setSelectedPendingStatuses} placeholder="请选择申请状态" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>售后状态</span>
                      <PcMallMultiSelect options={buyerPcMallAfterSaleStatusOptions} values={selectedPendingAfterSaleStatuses} onChange={setSelectedPendingAfterSaleStatuses} placeholder="请选择售后状态" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>付款方式</span>
                      <div className="pc-mall-select-wrap pc-mall-select-wrap-payment">
                        <select value={selectedPendingPaymentMethod} onChange={(event) => setSelectedPendingPaymentMethod(event.target.value)}>
                          <option value="全部">全部</option>
                          <option value="先货后款">先货后款</option>
                          <option value="先款后货">先款后货</option>
                        </select>
                      </div>
                    </label>
                    <div className="pc-mall-filter-actions pc-mall-filter-actions-inline">
                      <button className="pc-mall-btn" type="button">重置</button>
                      <button className="pc-mall-btn pc-mall-btn-dark" type="button">查询</button>
                    </div>
                  </div>
                </section>

                <div className="pc-mall-table-toolbar">
                  <div className="pc-mall-toolbar-left">
                    <button className="pc-mall-batch-btn" type="button" onClick={() => handleOpenBatchInvoicePage("merged")}>批量申请开票</button>
                    <div className="pc-mall-toolbar-summary">已选中 {selectedInvoiceSummary.count} 笔订单，合计金额： <strong>{`￥${selectedInvoiceSummary.totalAmount.toFixed(2)}`}</strong></div>
                  </div>
                  <div className="pc-mall-toolbar-right">
                    <button className="pc-mall-batch-btn pc-mall-batch-btn-secondary" type="button" onClick={handleExportPendingQueryData}>查询数据导出</button>
                  </div>
                </div>

                <div className="pc-mall-table-wrap pc-mall-table-wrap-pending">
                  <table className="pc-mall-table pc-mall-table-pending">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allInvoiceRowsSelected} disabled={selectableInvoiceOrderNos.length === 0} onChange={(e) => handleToggleAllInvoiceRows(e.target.checked)} /></th>
                        <th>订单号</th>
                        <th>
                          <span className="pc-mall-header-with-tip">
                            <span>订单总额</span>
                            <span className="shop-invoice-summary-tip pc-mall-header-tip">
                              <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              <span className="shop-invoice-summary-tooltip">订单总额 = 总商品金额 - 折扣/优惠金额 + 运费</span>
                            </span>
                          </span>
                        </th>
                        <th>
                          <span className="pc-mall-header-with-tip">
                            <span>售后状态</span>
                            <span className="shop-invoice-summary-tip pc-mall-header-tip">
                              <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              <span className="shop-invoice-summary-tooltip">{shopInvoiceAfterSaleStatusTooltip}</span>
                            </span>
                          </span>
                        </th>
                        <th>
                          <span className="pc-mall-header-with-tip">
                            <span>售后金额</span>
                            <span className="shop-invoice-summary-tip pc-mall-header-tip">
                              <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              <span className="shop-invoice-summary-tooltip">售后金额 = 售后中金额 + 已退款金额</span>
                            </span>
                          </span>
                        </th>
                        <th>支付时间</th>
                        <th>付款方式</th>
                        <th>店铺名称</th>
                        <th>闪购门店</th>
                        <th>开票状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedPendingInvoiceRows.map((item) => {
                        const applyDisabledReason = item.applyDisabledReason || (item.afterSaleStatus === "售后中" ? "售后状态为 售后中的订单，不允许申请开票" : "");
                        const isApplyDisabled = Boolean(applyDisabledReason);

                        return (
                        <tr key={item.orderNo}>
                          <td><input type="checkbox" checked={selectedInvoiceOrderNos.includes(item.orderNo)} disabled={isApplyDisabled} onChange={() => handleToggleInvoiceRow(item.orderNo)} /></td>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>{item.price}</td>
                          <td>
                            <div className="pc-mall-status-cell">
                              <span>{item.afterSaleStatus || "-"}</span>
                              {item.afterSaleStatus === "售后中" ? (
                                <span className="pc-mall-inline-tooltip-wrap">
                                  <button className="pc-mall-inline-link" type="button">查看</button>
                                  <span className="pc-mall-inline-tooltip">{getBuyerPcMallInvoiceAfterSaleViewTooltip(item)}</span>
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>{item.afterSaleAmount || "¥0.00"}</td>
                          <td>{item.time}</td>
                          <td>{item.paymentMethod || "-"}</td>
                          <td>
                            <div className="pc-mall-shop-cell">
                              <span>{item.shop}</span>
                              <PcMallContactSellerIconButton />
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              {item.storeId ? <div>{item.storeId}</div> : null}
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-status-cell">
                              <span>{item.status}</span>
                              {item.extraStatus ? (
                                <span className="pc-mall-inline-tooltip-wrap">
                                  <button className="pc-mall-inline-link" type="button">{item.extraStatus}</button>
                                  {item.status === "已驳回" ? (
                                    <span className="pc-mall-inline-tooltip">{`驳回原因：${item.rejectReason || "平台审核未通过，请核对开票信息后重试。"}\n驳回日期：${item.rejectedAt || "-"}`}</span>
                                  ) : null}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-action-cell">
                              <span className={`pc-mall-inline-tooltip-wrap${isApplyDisabled ? " is-disabled-trigger" : ""}`}>
                                <button className="pc-mall-apply-btn" type="button" disabled={isApplyDisabled} onClick={() => handleOpenSingleInvoiceModal(item.orderNo)}>申请开票</button>
                                {isApplyDisabled ? <span className="pc-mall-inline-tooltip">{applyDisabledReason}</span> : null}
                              </span>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                  </>
                ) : null}

                {isAppliedTab ? (
                  <>
                <section className="pc-mall-filter-card pc-mall-filter-card-applied">
                  <div className="pc-mall-filter-grid pc-mall-filter-grid-applied">
                    <label className="pc-mall-filter-field">
                      <span>关键字</span>
                      <div className="pc-mall-input-with-icon">
                  <input placeholder="支持订单号/店铺名称" />
                        <i>⌕</i>
                      </div>
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>下单账号</span>
                      <PcMallMultiSelect options={buyerPcMallAccountOptions} values={selectedAppliedAccounts} onChange={setSelectedAppliedAccounts} placeholder="请选择下单账号" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>闪购门店</span>
                      <PcMallSearchSelect
                        options={buyerPcMallStoreSearchOptions}
                        values={selectedAppliedStores}
                        onChange={setSelectedAppliedStores}
                        searchValue={appliedStoreKeyword}
                        onSearchChange={setAppliedStoreKeyword}
                        placeholder="输入闪购门店名称/闪购门店ID，支持全模糊查询"
                      />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>发票抬头</span>
                      <input placeholder="输入发票抬头" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>纳税人识别号</span>
                      <input placeholder="输入纳税人识别号" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>是否单独开票</span>
                      <div className="pc-mall-select-wrap">
                        <select value={draftAppliedSingleInvoice} onChange={(event) => setDraftAppliedSingleInvoice(event.target.value)}>
                          <option value="">请选择</option>
                          <option value="是">是</option>
                          <option value="否">否</option>
                        </select>
                      </div>
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>支付时间</span>
                      <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>申请时间</span>
                      <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>开票批次</span>
                      <PcMallBatchQueryField
                        value={draftAppliedInvoiceBatchQuery}
                        onChange={setDraftAppliedInvoiceBatchQuery}
                        onOpenBatchQueryModal={() => handleOpenInvoiceBatchQueryModal("applied")}
                        placeholder="输入开票批次"
                      />
                    </label>
                    <div className="pc-mall-filter-actions pc-mall-filter-actions-inline pc-mall-filter-actions-applied">
                      <button className="pc-mall-btn" type="button" onClick={handleResetAppliedInvoices}>重置</button>
                      <button className="pc-mall-btn pc-mall-btn-dark" type="button" onClick={handleQueryAppliedInvoices}>查询</button>
                    </div>
                  </div>
                </section>

                <div className="pc-mall-table-toolbar pc-mall-table-toolbar-applied">
                  <div className="pc-mall-toolbar-left">
                    <button className="pc-mall-batch-btn" type="button" onClick={handleOpenBatchModifyModal}>批量修改</button>
                    <button className="pc-mall-batch-btn pc-mall-batch-btn-secondary" type="button" onClick={handleOpenBatchRevokeModal}>批量撤销</button>
                    <div className="pc-mall-toolbar-summary">已选中 {selectedAppliedInvoiceSummary.count} 笔订单，申请开票金额合计： <strong>{`￥${selectedAppliedInvoiceSummary.totalAmount.toFixed(2)}`}</strong></div>
                  </div>
                  <div className="pc-mall-toolbar-right">
                    <button className="pc-mall-batch-btn pc-mall-batch-btn-secondary" type="button" onClick={handleExportAppliedQueryData}>查询数据导出</button>
                  </div>
                </div>

                <div className="pc-mall-table-wrap pc-mall-table-wrap-applied">
                  <table className="pc-mall-table pc-mall-table-applied pc-mall-table-applied-orders">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allAppliedInvoiceRowsSelected} onChange={(e) => handleToggleAllAppliedInvoiceRows(e.target.checked)} /></th>
                        <th>订单号</th>
                        <th>发票抬头</th>
                        <th>发票类型</th>
                        <th>
                          <span className="pc-mall-header-with-tip">
                            <span>订单总额</span>
                            <span className="shop-invoice-summary-tip pc-mall-header-tip">
                              <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              <span className="shop-invoice-summary-tooltip">订单总额 = 总商品金额 - 折扣/优惠金额 + 运费</span>
                            </span>
                          </span>
                        </th>
                        <th>申请开票金额</th>
                        <th>申请时间</th>
                        <th>开票批次</th>
                        <th>店铺名称</th>
                        <th>闪购门店</th>
                        <th>是否单独开票</th>
                        <th>开票状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedAppliedInvoiceRows.map((item) => (
                        <tr key={item.orderNo}>
                          <td><input type="checkbox" checked={selectedAppliedInvoiceOrderNos.includes(item.orderNo)} onChange={() => handleToggleAppliedInvoiceRow(item.orderNo)} /></td>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>{item.invoiceTitle}</td>
                          <td><span className={`pc-mall-invoice-tag is-${item.invoiceTypeTone}`}>{item.invoiceType}</span></td>
                          <td className="pc-mall-amount-cell">{item.price || item.amount}</td>
                          <td className="pc-mall-amount-cell">{item.amount}</td>
                          <td>{item.appliedAt}</td>
                          <td>{item.invoiceBatch || "-"}</td>
                          <td>
                            <div className="pc-mall-shop-cell">
                              <span>{item.shop}</span>
                              <PcMallContactSellerIconButton />
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              <div>{item.storeId}</div>
                            </div>
                          </td>
                          <td>{normalizeShopInvoiceMode(item.singleInvoice)}</td>
                          <td>
                            <div className="pc-mall-status-cell pc-mall-status-dot-cell">
                              <span className="pc-mall-status-dot" />
                              <span>{item.status}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-action-cell">
                              <button className="pc-mall-apply-btn" type="button" onClick={() => handleOpenBuyerInvoiceDetail(item, "applied")}>查看</button>
                              <button className="pc-mall-detail-secondary-btn pc-mall-table-secondary-btn" type="button" onClick={() => handleOpenRowRevokeModal(item.orderNo)}>撤销申请</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  </>
                ) : null}

                {isInvoicedTab ? (
                  <>
                <section className="pc-mall-filter-card pc-mall-filter-card-applied">
                  <div className="pc-mall-filter-grid pc-mall-filter-grid-applied">
                    <label className="pc-mall-filter-field">
                      <span>关键字</span>
                  <input placeholder="支持订单号/店铺名称" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>下单账号</span>
                      <PcMallMultiSelect options={buyerPcMallAccountOptions} values={selectedInvoicedAccounts} onChange={setSelectedInvoicedAccounts} placeholder="请选择下单账号" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>闪购门店</span>
                      <PcMallSearchSelect
                        options={buyerPcMallStoreSearchOptions}
                        values={selectedInvoicedStores}
                        onChange={setSelectedInvoicedStores}
                        searchValue={invoicedStoreKeyword}
                        onSearchChange={setInvoicedStoreKeyword}
                        placeholder="输入闪购门店名称/闪购门店ID，支持全模糊查询"
                      />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>发票抬头</span>
                      <input defaultValue="上海信息技术有限公司" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>纳税人识别号</span>
                      <input defaultValue="914301056803336923" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>支付时间</span>
                      <PcMallDateRangeField placeholder="开始时间 ～ 结束时间" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>申请时间</span>
                      <PcMallDateRangeField placeholder="开始时间 ～ 结束时间" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>发票号码</span>
                      <input defaultValue="914301056803330000" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>开票批次</span>
                      <PcMallBatchQueryField
                        value={draftInvoicedInvoiceBatchQuery}
                        onChange={setDraftInvoicedInvoiceBatchQuery}
                        onOpenBatchQueryModal={() => handleOpenInvoiceBatchQueryModal("invoiced")}
                        placeholder="输入开票批次"
                      />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>开票时间</span>
                      <PcMallDateRangeField placeholder="开始时间 ～ 结束时间" />
                    </label>
                    <div className="pc-mall-filter-actions pc-mall-filter-actions-inline pc-mall-filter-actions-applied">
                      <button className="pc-mall-btn" type="button" onClick={handleResetInvoicedInvoices}>重置</button>
                      <button className="pc-mall-btn pc-mall-btn-dark" type="button" onClick={handleQueryInvoicedInvoices}>查询</button>
                    </div>
                  </div>
                </section>

                <div className="pc-mall-table-toolbar">
                  <div className="pc-mall-toolbar-left">
                  </div>
                  <div className="pc-mall-toolbar-right">
                    <button className="pc-mall-batch-btn pc-mall-batch-btn-secondary" type="button" onClick={handleExportInvoicedQueryData}>查询数据导出</button>
                  </div>
                </div>

                <div className="pc-mall-table-wrap">
                  <table className="pc-mall-table pc-mall-table-applied pc-mall-table-invoiced">
                    <thead>
                      <tr>
                        <th>订单号</th>
                        <th>发票抬头</th>
                        <th>发票类型</th>
                        <th>
                          <span className="pc-mall-header-with-tip">
                            <span>订单总额</span>
                            <span className="shop-invoice-summary-tip pc-mall-header-tip">
                              <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              <span className="shop-invoice-summary-tooltip">订单总额 = 总商品金额 - 折扣/优惠金额 + 运费</span>
                            </span>
                          </span>
                        </th>
                        <th>开票金额</th>
                        <th>开票批次</th>
                        <th>店铺名称</th>
                        <th>闪购门店</th>
                        <th>发票号码</th>
                        <th>开票时间</th>
                        <th>开票状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInvoicedInvoiceRows.map((item) => (
                        <tr key={item.orderNo}>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>{item.invoiceTitle}</td>
                          <td><span className={`pc-mall-invoice-tag is-${item.invoiceTypeTone}`}>{item.invoiceType}</span></td>
                          <td className="pc-mall-amount-cell">{item.price || item.amount}</td>
                          <td className="pc-mall-amount-cell">{item.amount}</td>
                          <td>{item.invoiceBatch || "-"}</td>
                          <td>
                            <div className="pc-mall-shop-cell">
                              <span>{item.shop}</span>
                              <PcMallContactSellerIconButton />
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              <div>{item.storeId}</div>
                            </div>
                          </td>
                          <td>{item.invoiceNo}</td>
                          <td>{item.invoicedAt}</td>
                          <td>
                            <div className="pc-mall-status-cell pc-mall-status-dot-cell">
                              <span className="pc-mall-status-dot is-success" />
                              <span>{item.status}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-action-cell">
                              <button className="pc-mall-apply-btn" type="button" onClick={() => handleOpenBuyerInvoiceDetail(item, "invoiced")}>查看</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  </>
                ) : null}

                <div className={`pc-mall-pagination-wrap${isAppliedTab ? " pc-mall-pagination-wrap-applied" : ""}`}>
                  <div className={`pc-mall-pagination${isAppliedTab ? " pc-mall-pagination-applied" : ""}`}>
                    <span className="pc-mall-pagination-total">{`共计 ${currentInvoiceTabTotal} 条`}</span>
                    <button className="pc-mall-page-size" type="button">10 条/页</button>
                    <div className="pc-mall-page-list">
                      <button className="pc-mall-page-btn is-arrow" type="button">‹</button>
                      <button className="pc-mall-page-btn is-active" type="button">1</button>
                      <button className="pc-mall-page-btn" type="button">2</button>
                      <button className="pc-mall-page-btn" type="button">3</button>
                      <button className="pc-mall-page-btn" type="button">4</button>
                      <button className="pc-mall-page-btn" type="button">5</button>
                      <span className="pc-mall-page-ellipsis">...</span>
                      <button className="pc-mall-page-btn" type="button">417</button>
                      <button className="pc-mall-page-btn is-arrow" type="button">›</button>
                    </div>
                    <span className="pc-mall-pagination-jump-label">到第</span>
                    <input className="pc-mall-page-input" placeholder="请输入" />
                    <span className="pc-mall-pagination-jump-label">页</span>
                    <button className="pc-mall-page-jump" type="button">跳转</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {batchInvoiceModal}
      {modifyInvoiceModal}
      {singleInvoiceModal}
      {activeInvoiceTitleStores ? <BuyerPcMallInvoiceTitleStoreModal title={activeInvoiceTitleStores.title} stores={activeInvoiceTitleStores.stores} onClose={handleCloseInvoiceTitleStores} /> : null}
      {invoiceActionModal ? (
        <BuyerPcMallInvoiceActionModal
          title={invoiceActionModal.title}
          message={invoiceActionModal.message}
          confirmText="确认"
          onClose={() => setInvoiceActionModal(null)}
          onConfirm={() => (
            invoiceActionModal.type === "modify"
              ? handleConfirmDetailModifyModal()
              : handleConfirmRevokeOrders(invoiceActionModal.orderNos)
          )}
        />
      ) : null}
      {invoiceBatchQueryModal ? (
        <PcMallBatchQueryModal
          title="开票批次批量查询"
          value={invoiceBatchQueryModal.value}
          onChange={handleChangeInvoiceBatchQueryModal}
          onClose={handleCloseInvoiceBatchQueryModal}
          onConfirm={handleConfirmInvoiceBatchQueryModal}
        />
      ) : null}
      {activeProductDetailRow ? <BuyerPcMallProductDetailModal row={activeProductDetailRow} onClose={() => setActiveProductDetailOrderNo("")} /> : null}
      {isInvoiceTitleModalOpen ? <BuyerPcMallInvoiceTitleModal initialForm={activeInvoiceTitleForm} storeOptions={buyerPcMallStoreOptions} onClose={handleCloseInvoiceTitleModal} onSave={handleSaveInvoiceTitle} onNotice={setBatchInvoiceNotice} /> : null}
    </div>
  );
}

function Header({ currentMarketingPage, specialCreateTab, onTopActionClick, customTabs, homeTabLabel = "首页-控制台", topActionItems: customTopActionItems }) {
  const pendingCount = 24;
  const topActionItems = customTopActionItems || [
    { key: "platform-center", label: "平台中心", icon: "platform" },
    { key: "pc-mall", label: "买家PC商城", icon: "pc-mall" },
    { key: "miniapp-mall", label: "买家小程序商城", icon: "miniapp-mall" },
    { key: "service", label: "在线客服", icon: "service" },
    { key: "todo", label: "我的待办", icon: "todo", badge: pendingCount },
    { key: "export", label: "导出记录", icon: "export" },
    { key: "logout", label: "退出登录", icon: "logout" }
  ];
  const isHomeTab = currentMarketingPage === homeTabLabel;

  return (
    <header className="workspace-topbar">
      <div className="page-tabs">
        <div className={`page-tab ${isHomeTab ? "is-current" : ""}`}>{homeTabLabel} <span>×</span></div>
        {!isHomeTab && customTabs?.length ? customTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`page-tab page-tab-button ${tab.isCurrent ? "is-current" : ""}`}
            onClick={tab.onClick}
          >
            {tab.label}
            {tab.closable ? (
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  tab.onClose?.();
                }}
              >
                ×
              </span>
            ) : (
              <span>×</span>
            )}
          </button>
        )) : !isHomeTab ? <div className="page-tab is-current">{currentMarketingPage} <span>×</span></div> : null}
        {specialCreateTab ? <div className="page-tab is-current">{specialCreateTab} <span>×</span></div> : null}
      </div>
      <div className="top-actions">
        {topActionItems.map((item) => (
          <a href="#" key={item.key} className={item.badge ? "top-action-with-badge" : ""} onClick={(event) => { event.preventDefault(); onTopActionClick?.(item.key); }}>
            <span className="top-action-icon"><TopActionIcon type={item.icon} /></span>
            {item.label}
            {item.badge ? <em>{item.badge}</em> : null}
          </a>
        ))}
      </div>
    </header>
  );
}

function SupplierDashboardPage({ onOpenInvoiceTodo }) {
  return (
    <div className="supplier-dashboard">
      <section className="supplier-dashboard-card supplier-dashboard-hero">
        <div className="supplier-dashboard-store">
          <div className="supplier-dashboard-avatar">
            <div className="supplier-dashboard-avatar-core">农妇三拳</div>
          </div>
          <div className="supplier-dashboard-store-meta">
            <h2>农妇三拳</h2>
            <div className="supplier-dashboard-created">创建时间： 2024-04-17 08:43:36</div>
          </div>
        </div>

        <div className="supplier-dashboard-ratings">
          {supplierDashboardRatings.map((item) => (
            <div className="supplier-dashboard-rating" key={item.label}>
              <span>{item.label}</span>
              <div className="supplier-dashboard-rating-track">
                <div className="supplier-dashboard-rating-fill" style={{ width: item.width }} />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="supplier-dashboard-notice">
          <h3>平台公告</h3>
          <div className="supplier-dashboard-notice-list">
            {supplierDashboardNotices.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="supplier-dashboard-card">
        <div className="supplier-dashboard-section-head">
          <h3>履约服务数据看板</h3>
          <div className="supplier-dashboard-date-range">
            <span>{supplierDashboardDateRange.start}</span>
            <em>-</em>
            <span>{supplierDashboardDateRange.end}</span>
            <i>◫</i>
          </div>
        </div>
        <div className="supplier-dashboard-metric-grid supplier-dashboard-metric-grid-four">
          {supplierDashboardPerformanceCards.map((item) => (
            <article className="supplier-dashboard-metric-card" key={item.label}>
              <div className="supplier-dashboard-metric-value">{item.value}</div>
              <div className="supplier-dashboard-metric-label">
                {item.label}
                <span className="supplier-dashboard-tip">?</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="supplier-dashboard-card">
        <div className="supplier-dashboard-group">
          <h3>账户相关待办事项</h3>
          <div className="supplier-dashboard-metric-grid supplier-dashboard-metric-grid-four">
            {supplierDashboardAccountCards.map((item) => (
              <article className="supplier-dashboard-metric-card" key={item.label}>
                <div className={`supplier-dashboard-metric-value ${item.muted ? "is-muted" : ""}`}>{item.value}</div>
                <div className="supplier-dashboard-metric-label">{item.label}</div>
              </article>
            ))}
          </div>
        </div>

        <div className="supplier-dashboard-group">
          <h3>商品待办事项</h3>
          <div className="supplier-dashboard-metric-grid supplier-dashboard-metric-grid-five">
            {supplierDashboardProductCards.map((item) => (
              <article className="supplier-dashboard-metric-card" key={item.label}>
                <div className="supplier-dashboard-metric-value">{item.value}</div>
                <div className="supplier-dashboard-metric-label">{item.label}</div>
              </article>
            ))}
          </div>
        </div>

        <div className="supplier-dashboard-group">
          <h3>订单待办事项</h3>
          <div className="supplier-dashboard-metric-grid supplier-dashboard-metric-grid-five">
            {supplierDashboardOrderCards.map((item) => (
              <article className="supplier-dashboard-metric-card" key={item.label}>
                <div className="supplier-dashboard-metric-value">{item.value}</div>
                <div className="supplier-dashboard-metric-label">{item.label}</div>
              </article>
            ))}
          </div>
        </div>

        <div className="supplier-dashboard-group">
          <h3>发票待办事项</h3>
          <div className="supplier-dashboard-metric-grid supplier-dashboard-metric-grid-five">
            {supplierDashboardInvoiceCards.map((item) => (
              <button
                className="supplier-dashboard-metric-card supplier-dashboard-metric-card-button"
                key={item.label}
                type="button"
                onClick={() => onOpenInvoiceTodo?.(item)}
              >
                <div className="supplier-dashboard-metric-value">{item.value}</div>
                <div className="supplier-dashboard-metric-label">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PlatformCenterChart({ type }) {
  if (type === "bar-lilac") {
    return (
      <div className="platform-center-chart platform-center-chart-bars" aria-hidden="true">
        {[20, 10, 28, 44, 58, 54, 60, 78, 48, 86, 34, 46].map((height, index) => (
          <span key={`${type}-${index}`} style={{ height: `${height}px` }} />
        ))}
      </div>
    );
  }

  const lineClassName = type === "line-cyan" ? "is-cyan" : "is-warm";
  return (
    <div className={`platform-center-chart platform-center-chart-line ${lineClassName}`} aria-hidden="true">
      <svg viewBox="0 0 160 78" preserveAspectRatio="none">
        {type === "line-cyan" ? (
          <path d="M10 60 C 25 20, 42 68, 58 44 S 92 58, 108 34 S 136 40, 150 12" />
        ) : (
          <path d="M10 58 C 22 78, 36 20, 50 38 S 76 30, 90 46 S 118 8, 134 26 S 146 14, 150 18" />
        )}
      </svg>
    </div>
  );
}

function PlatformCenterPage() {
  return (
    <div className="platform-center-page">
      <section className="platform-center-summary-grid">
        {platformCenterSummaryCards.map((item) => (
          <article className={`platform-center-summary-card is-${item.tone}`} key={item.title}>
            <div>
              <div className="platform-center-summary-title">
                {item.title}
                <span>?</span>
              </div>
              <strong>{item.value}</strong>
            </div>
            <div className="platform-center-summary-illustration">
              <TopActionIcon type={item.icon} />
            </div>
          </article>
        ))}
      </section>

      <section className="platform-center-panel">
        <div className="platform-center-pending-grid">
          {platformCenterPendingSections.map((section) => (
            <div className="platform-center-pending-section" key={section.title}>
              <h3>{section.title}</h3>
              <div className={`platform-center-pending-cards ${section.items.length === 1 ? "is-single" : ""}`}>
                {section.items.map((item) => (
                  <article className="platform-center-pending-card" key={item.label}>
                    <strong className={item.muted ? "is-muted" : ""}>{item.value}</strong>
                    <span>{item.label}</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-center-analytics-grid">
        {platformCenterAnalyticsCards.map((item) => (
          <article className="platform-center-analytics-card" key={item.title}>
            <h3>{item.title}</h3>
            <div className="platform-center-analytics-value">
              <strong>{item.value}</strong>
              <span>{item.unit}</span>
            </div>
            <div className="platform-center-analytics-stats">
              {item.stats.map((stat) => (
                <p key={stat}>{stat}</p>
              ))}
            </div>
            <PlatformCenterChart type={item.chart} />
          </article>
        ))}
      </section>
    </div>
  );
}

function PlatformTradeSettingsPage() {
  const [activeTab, setActiveTab] = useState(platformTradeSettingsTabs[0]);

  return (
    <div className="platform-trade-settings-page">
      <section className="content-card platform-trade-settings-tabs-card">
        <div className="platform-trade-settings-tabs">
          {platformTradeSettingsTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`platform-trade-settings-tab ${activeTab === tab ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="content-card platform-trade-settings-card">
        {activeTab === "交易参数" ? (
          <>
            <div className="platform-trade-settings-section">
              <div className="platform-trade-settings-section-title">订单参数</div>
              <div className="platform-trade-settings-form">
                {platformTradeSettingsOrderRows.map((item) => (
                  <div className="platform-trade-settings-row" key={item.label}>
                    <label>{item.label}</label>
                    <input defaultValue={item.value} />
                    <span className="platform-trade-settings-row-text">{item.suffix}</span>
                    {item.extraValue ? <input className="is-short" defaultValue={item.extraValue} /> : null}
                    {item.extraSuffix ? <span className="platform-trade-settings-row-text">{item.extraSuffix}</span> : null}
                    {item.hint ? <em>{item.hint}</em> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="platform-trade-settings-section">
              <div className="platform-trade-settings-section-title">售后参数</div>
              <div className="platform-trade-settings-form">
                {platformTradeSettingsAfterSaleRows.map((item) => (
                  <div className="platform-trade-settings-row" key={item.label}>
                    <label>{item.label}</label>
                    <input defaultValue={item.value} />
                    <span className="platform-trade-settings-row-text">{item.suffix}</span>
                    {item.hint ? <em>{item.hint}</em> : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "发票参数" ? (
          <div className="platform-trade-settings-section">
            <div className="platform-trade-settings-section-title">发票参数</div>
            <div className="platform-trade-settings-form">
              {platformTradeSettingsInvoiceRows.map((item) => (
                <div className="platform-trade-settings-row" key={item.label}>
                  <label>{item.label}</label>
                  <input defaultValue={item.value} />
                  <span className="platform-trade-settings-row-text">{item.suffix}</span>
                  {item.hint ? <em>{item.hint}</em> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="platform-trade-settings-actions">
          <button type="button">提交</button>
        </div>
      </section>
    </div>
  );
}

function TabSection({ creating, detailing, onSwitchToList, currentMarketingPage }) {
  const tabs = creating ? [`新增${currentMarketingPage}`] : [`${currentMarketingPage}管理`, "参数配置", `${currentMarketingPage}详情`];
  return (
    <section className="content-card tab-card">
      <div className="tab-strip">
        {tabs.map((tab, index) => {
          const isActive = creating ? index === 0 : detailing ? index === 2 : index === 0;

          return (
            <button className={`tab-button ${isActive ? "is-active" : ""}`} key={tab} type="button" onClick={!creating && !detailing ? undefined : index === 0 ? onSwitchToList : undefined}>
              {tab}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SpecialPriceListLayout({ pageConfig, filters, setFilters, page, setPage, pageSize, setPageSize, onCreate, onAction, activities }) {
  const filteredActivities = useMemo(() => activities.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.activityId && !item.id.includes(filters.activityId.trim())) return false;
    if (filters.activityName && !item.name.includes(filters.activityName.trim())) return false;
    if (filters.buyerGroup && !item.buyerGroup.includes(filters.buyerGroup.trim())) return false;
    if (filters.buyerId && String(item.buyerId || "").indexOf(filters.buyerId.trim()) === -1) return false;
    if (filters.startTime && item.startTime < filters.startTime) return false;
    if (filters.endTime && item.endTime > filters.endTime) return false;
    return true;
  }), [activities, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filteredActivities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className="special-tip-card">
        <div className="special-tip-title">温馨提示:</div>
        <ol className="special-tip-list">
          {pageConfig.tipLines.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="content-card special-filter-card">
        <div className="special-filter-grid">
          <label className="filter-field"><span>活动状态</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">请选择</option>{statuses.filter((status) => status !== "全部").map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="filter-field"><span>活动名称</span><input value={filters.activityName} onChange={(e) => setFilters({ ...filters, activityName: e.target.value })} /></label>
          <label className="filter-field"><span>开始时间</span><div className="special-input-with-icon"><input value={filters.startTime} placeholder="请选择时间" onChange={(e) => setFilters({ ...filters, startTime: e.target.value })} /><i>◴</i></div></label>
          <label className="filter-field"><span>结束时间</span><div className="special-input-with-icon"><input value={filters.endTime} placeholder="请选择时间" onChange={(e) => setFilters({ ...filters, endTime: e.target.value })} /><i>◴</i></div></label>
          <label className="filter-field"><span>活动ID</span><input value={filters.activityId} onChange={(e) => setFilters({ ...filters, activityId: e.target.value })} /></label>
          <label className="filter-field"><span>买家分组</span><input value={filters.buyerGroup} placeholder="请选择" onChange={(e) => setFilters({ ...filters, buyerGroup: e.target.value })} /></label>
          <label className="filter-field"><span>买家ID</span><input value={filters.buyerId} onChange={(e) => setFilters({ ...filters, buyerId: e.target.value })} /></label>
          <div className="filter-actions special-filter-actions"><button className="btn btn-reset" type="button" onClick={() => setFilters({ ...pageConfig.initialFilters })}>重置</button><button className="btn btn-search" type="button">查询</button></div>
        </div>
      </section>

      <section className="content-card special-table-card">
        <div className="table-toolbar"><button className="btn btn-create" type="button" onClick={onCreate}>{pageConfig.createLabel}</button></div>
        <div className="table-shell">
          <table className="data-table special-data-table">
            <thead>
              <tr>
                <th>活动ID</th>
                <th>活动名称</th>
                <th>买家分组</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>活动状态</th>
                <th>商品数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td><button className="table-link-button" type="button">{item.buyerGroup}</button></td>
                  <td>{item.startTime}</td>
                  <td>{item.endTime}</td>
                  <td className={`status-cell status-${item.status}`}>{item.status}</td>
                  <td>
                    <div className="special-goods-cell">
                      <span>{item.goodsCount}</span>
                      {item.goodsFlag ? <em>{item.goodsFlag}</em> : null}
                    </div>
                  </td>
                  <td>
                    <div className="action-links action-links-stacked">
                      {item.actions.map((action) => <button key={action} type="button" onClick={() => onAction(action, item)}>{action}</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar special-pagination"><span>共{filteredActivities.length}条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={20}>20 条/页</option><option value={50}>50 条/页</option><option value={100}>100 条/页</option></select><button className="page-btn" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><button className="page-btn is-current" type="button">{currentPage}</button><button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button><span>到第</span><input className="page-input" placeholder="请输入" /><span>页</span><button className="btn btn-jump" type="button">跳转</button></div>
      </section>
    </>
  );
}

function SpecialPriceListPage(props) {
  return <SpecialPriceListLayout {...props} pageConfig={marketingPageConfigs.专享价} />;
}

function SpecialPrice2ListPage(props) {
  return <SpecialPriceListLayout {...props} pageConfig={marketingPageConfigs.专享价2} />;
}

function ListPage({ pageName, filters, setFilters, page, setPage, pageSize, setPageSize, onCreate, onAction, activities }) {
  if (isPrimarySpecialPricePage(pageName)) {
    return <SpecialPriceListPage filters={filters} setFilters={setFilters} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} onCreate={onCreate} onAction={onAction} activities={activities} />;
  }

  if (isSecondarySpecialPricePage(pageName)) {
    return <SpecialPrice2ListPage filters={filters} setFilters={setFilters} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} onCreate={onCreate} onAction={onAction} activities={activities} />;
  }

  const filteredActivities = useMemo(() => activities.filter((item) => {
    if (filters.status !== "全部" && item.status !== filters.status) return false;
    if (filters.activityId && !item.id.includes(filters.activityId.trim())) return false;
    if (filters.activityName && !item.name.includes(filters.activityName.trim())) return false;
    return true;
  }), [activities, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filteredActivities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className="content-card filter-card">
        <div className="filter-grid">
          <label className="filter-field field-status"><span>状态</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status === "全部" ? "请选择" : status}</option>)}</select></label>
          <label className="filter-field field-date"><span>活动时间</span><input placeholder="开始时间        -        结束时间" value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} /></label>
          <label className="filter-field"><span>活动名称</span><input value={filters.activityName} onChange={(e) => setFilters({ ...filters, activityName: e.target.value })} /></label>
          <label className="filter-field"><span>活动ID</span><input value={filters.activityId} onChange={(e) => setFilters({ ...filters, activityId: e.target.value })} /></label>
          <label className="filter-field"><span>商品ID</span><input value={filters.productId} onChange={(e) => setFilters({ ...filters, productId: e.target.value })} /></label>
          <label className="filter-field"><span>规格ID</span><input value={filters.specId} onChange={(e) => setFilters({ ...filters, specId: e.target.value })} /></label>
          <label className="filter-field field-product-name"><span>商品名称</span><input value={filters.productName} onChange={(e) => setFilters({ ...filters, productName: e.target.value })} /></label>
          <div className="filter-actions"><button className="btn btn-reset" type="button" onClick={() => setFilters(emptyFilters)}>重置</button><button className="btn btn-search" type="button">查询</button></div>
        </div>
      </section>

      <section className="content-card table-card">
        <div className="table-toolbar"><button className="btn btn-create" type="button" onClick={onCreate}>{marketingPageConfigs[pageName]?.createLabel || "新增活动"}</button></div>
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>活动ID</th><th>活动名称</th><th>活动商品数</th><th>开始时间</th><th>结束时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.goodsCount}</td><td>{item.startTime}</td><td>{item.endTime}</td><td className={`status-cell status-${item.status}`}>{item.status}</td><td><div className="action-links">{item.actions.map((action) => <button key={action} type="button" onClick={() => onAction(action, item)}>{action}</button>)}</div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="pagination-bar"><span>共 {filteredActivities.length} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={20}>20 条/页</option><option value={50}>50 条/页</option><option value={100}>100 条/页</option></select><button className="page-btn" type="button" disabled>‹</button><button className="page-btn is-current" type="button">{currentPage}</button><button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>›</button><span>到第</span><input className="page-input" placeholder="请输入" /><span>页</span><button className="btn btn-jump" type="button">跳转</button></div>
      </section>
    </>
  );
}

function DetailSpecModal({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="detail-spec-modal">
        <div className="picker-header">
          <h3>规格查看</h3>
          <button type="button" className="picker-close" onClick={onClose}>×</button>
        </div>

        <div className="detail-spec-head">
          <div className="product-cell">
            <div className="product-image">{product.image}</div>
            <div className="product-meta">
              <div className="product-name">{product.name}</div>
              <div className="product-id">商品ID: {product.id}</div>
            </div>
          </div>
          <div className="detail-spec-summary">
            <div><span>总限购数量</span><strong>{product.totalLimit}</strong></div>
            <div><span>活动总库存</span><strong>{product.activityStock}</strong></div>
          </div>
        </div>

        <div className="detail-spec-table-wrap">
          <table className="spec-table detail-spec-table">
            <thead>
              <tr>
                <th>规格信息</th>
                <th>库存</th>
                <th>商城价</th>
                <th>限时价</th>
                <th>活动库存</th>
              </tr>
            </thead>
            <tbody>
              {product.specs.map((spec) => (
                <tr key={spec.id}>
                  <td>
                    <div className="spec-info">
                      <div>{spec.name}</div>
                      <div className="product-id">规格ID: {spec.id}</div>
                    </div>
                  </td>
                  <td>{spec.stock}</td>
                  <td>{spec.marketPrice}</td>
                  <td>{spec.flashPrice}</td>
                  <td>{spec.activityStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="detail-spec-footer">
          <button className="btn btn-reset" type="button" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

function DetailPage({ detailActivity, page, setPage, pageSize, setPageSize, onShowSpecDetail }) {
  const rows = detailActivity?.rows || [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!detailActivity) return null;

  return (
    <section className="content-card detail-card">
      <div className="detail-summary">
        <div className="detail-line"><span>活动名称:</span><strong>{detailActivity.name}</strong></div>
        <div className="detail-line"><span>活动分类:</span><strong>{detailActivity.category}</strong></div>
        <div className="detail-line"><span>开始时间:</span><strong>{detailActivity.startTime}</strong></div>
        <div className="detail-line"><span>结束时间:</span><strong>{detailActivity.endTime}</strong></div>
        <div className="detail-line"><span>限购规则:</span><strong><i className="detail-rule-dot" />{detailActivity.rule}</strong></div>
      </div>

      <div className="detail-goods-label">商品详情:</div>
      <div className="detail-table-shell">
        <table className="goods-table detail-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>商城价</th>
              <th>限时价</th>
              <th>总限购数量</th>
              <th>活动总库存</th>
              <th>规格数量</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="product-cell">
                    <div className="product-image">{item.image}</div>
                    <div className="product-meta">
                      <div className="product-name">{item.name}</div>
                      <div className="product-id">商品ID: {item.id}</div>
                    </div>
                  </div>
                </td>
                <td>{item.marketPrice}</td>
                <td>{item.flashPrice}</td>
                <td>{item.totalLimit}</td>
                <td>{item.activityStock}</td>
                <td>{item.specSummary}</td>
                <td>
                  <div className="detail-action-text">
                    已选 {item.selectedSpecCount} 个 规格 <button type="button" onClick={() => onShowSpecDetail(item)}>查看</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="goods-pagination detail-pagination">
        <span>共 125 条</span>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          <option value={10}>10 条/页</option>
          <option value={20}>20 条/页</option>
        </select>
        <button className="page-btn" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
        {Array.from({ length: Math.min(5, pageCount) }, (_, index) => (
          <button className={`page-btn ${currentPage === index + 1 ? "is-current" : ""}`} key={index + 1} type="button" onClick={() => setPage(index + 1)}>
            {index + 1}
          </button>
        ))}
        {pageCount > 5 ? <span>...</span> : null}
        {pageCount > 5 ? <button className="page-btn" type="button" onClick={() => setPage(pageCount)}>{pageCount}</button> : null}
        <button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button>
        <span>到第</span>
        <input className="page-input" placeholder="请输入" />
        <span>页</span>
        <button className="btn btn-jump" type="button">跳转</button>
      </div>
    </section>
  );
}

function ProductPickerModal({ filters, setFilters, selectedProductIds, onToggleProduct, onSave, onClose, confirmText = "保存" }) {
  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="picker-modal">
        <div className="picker-header"><h3>商品选择</h3><button type="button" className="picker-close" onClick={onClose}>×</button></div>
        <div className="picker-filters">
          <label className="picker-field"><span>商品分类</span><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">请选择</option>{productCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="picker-field"><span>商品名称</span><input value={filters.productName} onChange={(e) => setFilters({ ...filters, productName: e.target.value })} /></label>
          <label className="picker-field"><span>商品ID</span><input value={filters.productId} onChange={(e) => setFilters({ ...filters, productId: e.target.value })} /></label>
          <div className="picker-actions"><button className="btn btn-reset" type="button" onClick={() => setFilters(initialPickerFilters)}>重置</button><button className="btn btn-search" type="button">查询</button></div>
        </div>
        <div className="picker-table-wrap"><table className="picker-table goods-table"><thead><tr><th><input type="checkbox" checked={pickerRows.length > 0 && selectedProductIds.length === pickerRows.length} onChange={(e) => onToggleProduct(e.target.checked ? pickerRows.map((item) => item.id) : [])} /></th><th>商品</th><th>库存</th><th>商城价</th><th>规格数量</th></tr></thead><tbody>{pickerRows.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selectedProductIds.includes(item.id)} onChange={() => onToggleProduct(item.id)} /></td><td><div className="product-cell"><div className="product-image">{item.image}</div><div className="product-meta"><div className="product-name">{item.name}</div><div className="product-id">商品ID： {item.id}</div></div></div></td><td>{item.stock}</td><td>{item.marketPrice}</td><td>共 {item.specCount} 个 规格</td></tr>)}</tbody></table></div>
        <div className="picker-pagination"><span>共1条</span><select><option>10 条/页</option></select><button className="page-btn" type="button" disabled>‹</button><button className="page-btn is-current" type="button">1</button><button className="page-btn" type="button" disabled>›</button><span>到第</span><input className="page-input" placeholder="请输入" /><span>页</span><button className="btn btn-jump" type="button">跳转</button></div>
        <div className="picker-footer"><button className="btn btn-create" type="button" onClick={onSave}>{confirmText}</button></div>
      </div>
    </div>
  );
}

function BatchSpecStepModal({ products, selectedSpecIdsByProduct, onToggleSpecSelection, onToggleAllSpecs, onBatchToggleSpecs, onClose, onSave, onUpdateProductLimit, onUpdateProductActivityStock, onUpdateSpecField, onToggleSpecStatus, onShowToast }) {
  const [hideConfigured, setHideConfigured] = useState(false);
  const [batchFieldsByProduct, setBatchFieldsByProduct] = useState({});
  const hasConfiguredFlashPrice = (value) => {
    const numericValue = Number.parseFloat(String(value || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(numericValue) && numericValue > 0;
  };

  const getTotalLimitDisplay = (product) => {
    if (hasUnifiedTotalLimit(product)) return product.totalLimit;
    const total = product.specs.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.limitCount || 0), 0);
    return total ? String(total) : "";
  };

  const getBatchFields = (productId) => batchFieldsByProduct[productId] || { flashPrice: "", limitCount: "", activityStock: "" };

  const handleBatchFieldChange = (productId, field, value) => {
    setBatchFieldsByProduct((current) => ({
      ...current,
      [productId]: {
        ...getBatchFields(productId),
        [field]: field === "flashPrice" ? value : value.replace(/[^\d]/g, "")
      }
    }));
  };

  const handleApplyBatchFields = (product) => {
    const selectedSpecIds = selectedSpecIdsByProduct[product.id] || [];
    const activeSelectedSpecs = product.specs.filter((spec) => selectedSpecIds.includes(spec.id) && spec.status === "active");

    if (activeSelectedSpecs.length === 0) {
      onShowToast("请先勾选参与活动的规格");
      return;
    }

    const fields = getBatchFields(product.id);
    const updates = [
      ["flashPrice", fields.flashPrice.trim()],
      ["limitCount", fields.limitCount.trim()],
      ["activityStock", fields.activityStock.trim()]
    ].filter(([, value]) => value);

    if (updates.length === 0) {
      onShowToast("请先填写批量设置内容");
      return;
    }

    activeSelectedSpecs.forEach((spec) => {
      updates.forEach(([field, value]) => {
        onUpdateSpecField(product.id, spec.id, field, value);
      });
    });

    setBatchFieldsByProduct((current) => ({
      ...current,
      [product.id]: { flashPrice: "", limitCount: "", activityStock: "" }
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="batch-spec-modal">
        <div className="picker-header"><h3>规格选择</h3><button type="button" className="picker-close" onClick={onClose}>×</button></div>
        <div className="batch-spec-body">
          {products.map((product) => {
            const selectedSpecIds = selectedSpecIdsByProduct[product.id] || [];
            const sortedSpecs = [...product.specs].sort((left, right) => {
              const getSpecOrder = (spec) => {
                if (spec.status === "active") return 0;
                if (spec.status === "merged") return 1;
                return 2;
              };

              return getSpecOrder(left) - getSpecOrder(right);
            });
            const visibleSpecs = sortedSpecs.filter((spec) => {
              if (!hideConfigured) return true;
              if (spec.status === "merged") return false;
              if (hasConfiguredFlashPrice(spec.flashPrice)) return false;
              return true;
            });
            const selectableSpecs = visibleSpecs.filter((spec) => spec.status !== "merged");
            const allSelectableSelected = selectableSpecs.length > 0 && selectableSpecs.every((spec) => selectedSpecIds.includes(spec.id));
            const batchFields = getBatchFields(product.id);
            const useUnifiedFlashPrice = hasUnifiedFlashPrice(product);
            const useUnifiedTotalLimit = hasUnifiedTotalLimit(product);
            const useUnifiedActivityStock = hasUnifiedActivityStock(product);

            return (
              <section className="batch-spec-section" key={product.id}>
                <div className="batch-spec-product-head">
                  <div className="product-cell">
                    <div className="product-image">{product.image}</div>
                    <div className="product-meta">
                      <div className="product-name">{product.name}</div>
                      <div className="product-id">商品ID： {product.id}</div>
                    </div>
                  </div>
                  <div className="batch-spec-summary">
                    <label className="batch-spec-summary-item batch-spec-summary-input"><span>总活动库存</span><input value={getProductActivityStockDisplay(product)} onChange={(e) => onUpdateProductActivityStock(product.id, e.target.value.replace(/[^\d]/g, ""))} /></label>
                    <label className="batch-spec-summary-item batch-spec-summary-input"><span>总限购数量</span><input value={getTotalLimitDisplay(product)} onChange={(e) => onUpdateProductLimit(product.id, e.target.value.replace(/[^\d]/g, ""))} /></label>
                  </div>
                </div>
                <div className="batch-spec-toolbar">
                  <div className="spec-batch-left">
                    <span>批量设置:</span>
                    <input placeholder="限时价" value={batchFields.flashPrice} onChange={(e) => handleBatchFieldChange(product.id, "flashPrice", e.target.value)} disabled={useUnifiedFlashPrice} className={useUnifiedFlashPrice ? "is-disabled" : ""} />
                    <input placeholder="限购数量" value={batchFields.limitCount} onChange={(e) => handleBatchFieldChange(product.id, "limitCount", e.target.value)} disabled={useUnifiedTotalLimit} className={useUnifiedTotalLimit ? "is-disabled" : ""} />
                    <input placeholder="活动库存" value={batchFields.activityStock} onChange={(e) => handleBatchFieldChange(product.id, "activityStock", e.target.value)} disabled={useUnifiedActivityStock} className={useUnifiedActivityStock ? "is-disabled" : ""} />
                    <button className="btn btn-search" type="button" onClick={() => handleApplyBatchFields(product)}>确定</button>
                  </div>
                </div>
                <div className="spec-table-wrap batch-spec-table-wrap">
                  <table className="spec-table batch-spec-table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allSelectableSelected} disabled={selectableSpecs.length === 0} onChange={() => onToggleAllSpecs(product.id)} /></th>
                        <th>规格信息</th>
                        <th>商城价</th>
                        <th>限时价</th>
                        <th>库存</th>
                        <th>活动库存</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSpecs.map((row) => {
                        if (row.status === "merged") {
                          return (
                            <tr key={row.id}>
                              <td><input type="checkbox" disabled /></td>
                              <td>
                                <div className="spec-info muted">
                                  <div>{row.name}</div>
                                  <div className="product-id">规格ID: {row.id}</div>
                                </div>
                              </td>
                              <td colSpan="5" className="spec-merged-cell">{row.mergedText}</td>
                            </tr>
                          );
                        }

                        if (row.status === "available") {
                          return (
                            <tr key={row.id} className="spec-row-inactive">
                              <td><input type="checkbox" checked={selectedSpecIds.includes(row.id)} onChange={() => onToggleSpecSelection(product.id, row.id)} /></td>
                              <td>
                                <div className="spec-info muted">
                                  <div>{row.name}</div>
                                  <div className="product-id">规格ID: {row.id}</div>
                                </div>
                              </td>
                              <td colSpan="4"></td>
                              <td><button className="spec-link" type="button" onClick={() => onToggleSpecStatus(product.id, row.id, "active")}>加入活动</button></td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={row.id}>
                            <td><input type="checkbox" checked={selectedSpecIds.includes(row.id)} onChange={() => onToggleSpecSelection(product.id, row.id)} /></td>
                            <td>
                              <div className="spec-info">
                                <div>{row.name}</div>
                                <div className="product-id">规格ID: {row.id}</div>
                              </div>
                            </td>
                            <td>{row.marketPrice}</td>
                            <td>{useUnifiedFlashPrice ? <span className="spec-unified-label">{product.flashPrice}</span> : <input className="spec-inline-input" value={row.flashPrice} onChange={(e) => onUpdateSpecField(product.id, row.id, "flashPrice", e.target.value)} />}</td>
                            <td>{row.stock}</td>
                            <td>{useUnifiedTotalLimit ? <span className="spec-unified-label">按商品维度生效</span> : <input className="spec-inline-input" value={row.limitCount} onChange={(e) => onUpdateSpecField(product.id, row.id, "limitCount", e.target.value.replace(/[^\d]/g, ""))} />}</td>
                            <td>{useUnifiedActivityStock ? <span className="spec-unified-label">按商品维度生效</span> : <input className="spec-inline-input" value={row.activityStock} onChange={(e) => onUpdateSpecField(product.id, row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} />}</td>
                            <td><button className="spec-link spec-remove" type="button" onClick={() => onToggleSpecStatus(product.id, row.id, "available")}>撤出活动</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
        <div className="batch-spec-footer"><label className="batch-spec-toggle"><input type="checkbox" checked={hideConfigured} onChange={(e) => setHideConfigured(e.target.checked)} /><span>隐藏已设置</span></label><button className="btn btn-create" type="button" onClick={onSave}>保存</button></div>
      </div>
    </div>
  );
}

function SpecPickerModal({ pageName, product, productFlashPriceInputMode, selectedSpecIds, onToggleSpecSelection, onToggleAllSpecs, onBatchToggleSpecs, onClose, onUpdateSpecField, onToggleSpecStatus, onShowToast }) {
  if (!product) return null;

  const isSpecialPricePage = isAnySpecialPricePage(pageName);
  const useProductLevelFlashPrice = isSpecialPricePage && productFlashPriceInputMode;
  const useUnifiedFlashPrice = hasUnifiedFlashPrice(product);
  const useUnifiedTotalLimit = hasUnifiedTotalLimit(product);
  const useUnifiedActivityStock = hasUnifiedActivityStock(product);
  const [specFieldEditModes, setSpecFieldEditModes] = useState(initialProductFieldEditModes);
  const [batchFields, setBatchFields] = useState({ flashPrice: "", limitCount: "", activityStock: "" });
  const [invalidSpecFields, setInvalidSpecFields] = useState({});
  const selectableSpecs = product.specs.filter((spec) => spec.status !== "merged");
  const sortedSpecs = [...product.specs].sort((left, right) => {
    const getSpecOrder = (spec) => {
      if (spec.status === "active") return 0;
      if (spec.status === "merged") return 1;
      return 2;
    };

    return getSpecOrder(left) - getSpecOrder(right);
  }).filter((spec) => !(isSpecialPricePage && spec.status === "merged"));
  const allSelectableSelected = selectableSpecs.length > 0 && selectableSpecs.every((spec) => selectedSpecIds.includes(spec.id));
  const hasAnySelected = selectedSpecIds.length > 0;
  const allowSpecFlashPriceEdit = useProductLevelFlashPrice
    ? specFieldEditModes.flashPrice
    : (!useUnifiedFlashPrice || specFieldEditModes.flashPrice);
  const allowSpecTotalLimitEdit = !useUnifiedTotalLimit || specFieldEditModes.totalLimit;
  const allowSpecActivityStockEdit = !isSpecialPricePage && (!useUnifiedActivityStock || specFieldEditModes.activityStock);

  const clearInvalidSpecField = (specId, field) => {
    setInvalidSpecFields((current) => {
      if (!current[specId]?.[field]) return current;

      const nextSpecFields = { ...current[specId], [field]: false };
      const hasAnyInvalid = Object.values(nextSpecFields).some(Boolean);
      if (!hasAnyInvalid) {
        const { [specId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [specId]: nextSpecFields
      };
    });
  };

  const handleSpecFieldChange = (specId, field, value) => {
    clearInvalidSpecField(specId, field);
    onUpdateSpecField(product.id, specId, field, value);
  };

  const handleBatchFieldChange = (field, value) => {
    setBatchFields((current) => ({
      ...current,
      [field]: field === "flashPrice" ? value : value.replace(/[^\d]/g, "")
    }));
  };

  const handleToggleSpecFieldEditMode = (field) => {
    setSpecFieldEditModes((current) => ({
      ...current,
      [field]: !current[field]
    }));
  };

  const handleSave = () => {
    const activeSpecs = product.specs.filter((spec) => spec.status === "active");
    const nextInvalidSpecFields = {};
    const missingLabels = [];

    const validateField = (field, label, isEditable) => {
      if (!isEditable) return;

      let hasMissing = false;
      activeSpecs.forEach((spec) => {
        if (hasValue(spec[field])) return;
        hasMissing = true;
        nextInvalidSpecFields[spec.id] = {
          ...(nextInvalidSpecFields[spec.id] || {}),
          [field]: true
        };
      });

      if (hasMissing) missingLabels.push(label);
    };

    validateField("flashPrice", isSpecialPricePage ? "专享价" : "限时价", allowSpecFlashPriceEdit);
    validateField("limitCount", isSpecialPricePage ? "专享价生效件数" : "限购数量", allowSpecTotalLimitEdit);
    validateField("activityStock", "活动库存", allowSpecActivityStockEdit);

    if (missingLabels.length > 0) {
      setInvalidSpecFields(nextInvalidSpecFields);
      onShowToast(`${missingLabels.join("、")}为空，请检查`);
      return;
    }

    setInvalidSpecFields({});
    onClose();
  };

  const handleApplyBatchFields = () => {
    const activeSelectedSpecs = product.specs.filter((spec) => selectedSpecIds.includes(spec.id) && spec.status === "active");

    if (activeSelectedSpecs.length === 0) {
      onShowToast("请先勾选参与活动的规格");
      return;
    }

    const updates = [
      ["flashPrice", batchFields.flashPrice.trim()],
      ["limitCount", batchFields.limitCount.trim()],
      ["activityStock", batchFields.activityStock.trim()]
    ].filter(([, value]) => value).filter(([field]) => !isSpecialPricePage || field !== "activityStock");

    if (updates.length === 0) {
      onShowToast("请先填写批量设置内容");
      return;
    }

    activeSelectedSpecs.forEach((spec) => {
      updates.forEach(([field, value]) => {
        onUpdateSpecField(product.id, spec.id, field, value);
      });
    });

    setBatchFields({ flashPrice: "", limitCount: "", activityStock: "" });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className={`spec-modal ${isSpecialPricePage ? "spec-modal-special" : ""}`}>
        <div className="picker-header"><h3>规格选择</h3><button type="button" className="picker-close" onClick={onClose}>×</button></div>

        <div className="spec-product-head">
          <div className="product-image spec-head-image">{product.image}</div>
          <div className="product-meta">
            <div className="spec-head-title">{product.name}</div>
            <div className="product-id">商品ID: {product.id}</div>
          </div>
        </div>

        <div className="spec-batch-bar">
          <div className={`spec-batch-left ${isSpecialPricePage ? "spec-batch-left-special" : ""}`}>
            <span>批量设置:</span>
            <input placeholder={isSpecialPricePage ? "专享价" : "限时价"} value={batchFields.flashPrice} onChange={(e) => handleBatchFieldChange("flashPrice", e.target.value)} disabled={!allowSpecFlashPriceEdit} className={!allowSpecFlashPriceEdit ? "is-disabled" : ""} />
            <input placeholder={isSpecialPricePage ? "专享价生效件数" : "限购数量"} value={batchFields.limitCount} onChange={(e) => handleBatchFieldChange("limitCount", e.target.value)} disabled={!allowSpecTotalLimitEdit} className={!allowSpecTotalLimitEdit ? "is-disabled" : ""} />
            {!isSpecialPricePage ? <input placeholder="活动库存" value={batchFields.activityStock} onChange={(e) => handleBatchFieldChange("activityStock", e.target.value)} disabled={!allowSpecActivityStockEdit} className={!allowSpecActivityStockEdit ? "is-disabled" : ""} /> : null}
            <button className="btn btn-search" type="button" onClick={handleApplyBatchFields}>确定</button>
          </div>
        </div>

        <div className="spec-table-wrap">
          <table className={`spec-table ${isSpecialPricePage ? "spec-table-special" : ""}`}>
            <thead>
              <tr>
                <th><input type="checkbox" checked={allSelectableSelected} disabled={selectableSpecs.length === 0} onChange={() => onToggleAllSpecs(product.id)} /></th>
                <th>规格信息</th>
                <th>商城价</th>
                {!isSpecialPricePage ? <th>商品库存</th> : null}
                <th><HeaderWithIcon label={isSpecialPricePage ? "专享价" : "限时价"} onIconClick={() => handleToggleSpecFieldEditMode("flashPrice")} isActive={specFieldEditModes.flashPrice} /></th>
                <th><HeaderWithIcon label={isSpecialPricePage ? "专享价生效件数" : "限购数量"} onIconClick={() => handleToggleSpecFieldEditMode("totalLimit")} isActive={specFieldEditModes.totalLimit} /></th>
                {!isSpecialPricePage ? <th><HeaderWithIcon label="活动库存" onIconClick={() => handleToggleSpecFieldEditMode("activityStock")} isActive={specFieldEditModes.activityStock} /></th> : null}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedSpecs.map((row) => {
                if (row.status === "merged") {
                  return (
                    <tr key={row.id}>
                      <td><input type="checkbox" disabled /></td>
                      <td>
                        <div className="spec-info muted">
                          <div>{row.name}</div>
                          <div className="product-id">规格ID: {row.id}</div>
                        </div>
                      </td>
                      <td colSpan={isSpecialPricePage ? 4 : 6} className="spec-merged-cell">{row.mergedText}</td>
                    </tr>
                  );
                }

                if (row.status === "available") {
                  return (
                    <tr key={row.id} className="spec-row-inactive">
                      <td><input type="checkbox" checked={selectedSpecIds.includes(row.id)} onChange={() => onToggleSpecSelection(product.id, row.id)} /></td>
                      <td>
                        <div className="spec-info muted">
                          <div>{row.name}</div>
                          <div className="product-id">规格ID: {row.id}</div>
                        </div>
                      </td>
                      <td colSpan={isSpecialPricePage ? 3 : 5}></td>
                      <td><button className="spec-link" type="button" onClick={() => onToggleSpecStatus(product.id, row.id, "active")}>加入活动</button></td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.id}>
                    <td><input type="checkbox" checked={selectedSpecIds.includes(row.id)} onChange={() => onToggleSpecSelection(product.id, row.id)} /></td>
                    <td>
                      <div className="spec-info">
                        <div>{row.name}</div>
                        <div className="product-id">规格ID: {row.id}</div>
                      </div>
                    </td>
                    <td>{row.marketPrice}</td>
                    {!isSpecialPricePage ? <td>{row.stock}</td> : null}
                    <td>{allowSpecFlashPriceEdit ? <input className={`spec-inline-input ${invalidSpecFields[row.id]?.flashPrice ? "is-error" : ""}`} value={row.flashPrice} onChange={(e) => handleSpecFieldChange(row.id, "flashPrice", e.target.value)} /> : <span className="spec-unified-label">按商品维度生效</span>}</td>
                    <td>
                      {allowSpecTotalLimitEdit ? <input className={`spec-inline-input ${invalidSpecFields[row.id]?.limitCount ? "is-error" : ""}`} value={row.limitCount} onChange={(e) => handleSpecFieldChange(row.id, "limitCount", e.target.value.replace(/[^\d]/g, ""))} /> : <span className="spec-unified-label">按商品维度生效</span>}
                    </td>
                    {!isSpecialPricePage ? <td>{allowSpecActivityStockEdit ? <input className={`spec-inline-input ${invalidSpecFields[row.id]?.activityStock ? "is-error" : ""}`} value={row.activityStock} onChange={(e) => handleSpecFieldChange(row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} /> : <span className="spec-unified-label">按商品维度生效</span>}</td> : null}
                    <td><button className="spec-link spec-remove" type="button" onClick={() => onToggleSpecStatus(product.id, row.id, "available")}>撤出活动</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="spec-footer">
          <div className="spec-footer-left spec-footer-left-compact">
            <div className="spec-batch-right">
              <button type="button" className={hasAnySelected ? "is-active" : ""} disabled={!hasAnySelected} onClick={() => onBatchToggleSpecs(product.id, "active")}>批量加入活动</button>
              <button type="button" className={hasAnySelected ? "is-active" : ""} disabled={!hasAnySelected} onClick={() => onBatchToggleSpecs(product.id, "available")}>批量撤出活动</button>
            </div>
          </div>
          <button className="btn btn-create" type="button" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

function SpecialPriceSpecPickerModal(props) {
  return <SpecPickerModal {...props} pageName="专享价" />;
}

function SpecialPrice2SpecPickerModal(props) {
  return <SpecPickerModal {...props} pageName="专享价2" />;
}

function BuyerListPage({ filters, onFiltersChange, rows, page, setPage, pageSize, setPageSize, expanded, onToggleExpanded, onActionClick }) {
  const filteredRows = useMemo(() => rows.filter((item) => {
    if (filters.id && !item.id.includes(filters.id.trim())) return false;
    if (filters.account && !item.account.toLowerCase().includes(filters.account.trim().toLowerCase())) return false;
    if (filters.accountType && item.accountType !== filters.accountType) return false;
    if (filters.identity && !String(item.identity || "").includes(filters.identity.trim())) return false;
    return true;
  }), [filters, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <section className="content-card buyer-filter-card">
        <div className="buyer-filter-row">
          <label className="buyer-filter-field"><span>买家ID</span><input value={filters.id} onChange={(e) => onFiltersChange({ ...filters, id: e.target.value })} /></label>
          <label className="buyer-filter-field"><span>买家账号</span><input value={filters.account} onChange={(e) => onFiltersChange({ ...filters, account: e.target.value })} /></label>
          <label className="buyer-filter-field"><span>账号类型</span><select value={filters.accountType} onChange={(e) => onFiltersChange({ ...filters, accountType: e.target.value })}><option value="">请选择</option>{buyerAccountTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="buyer-filter-field"><span>买家身份</span><input value={filters.identity} onChange={(e) => onFiltersChange({ ...filters, identity: e.target.value })} /></label>
          <div className="buyer-filter-actions">
            <button className="buyer-expand-btn" type="button" onClick={onToggleExpanded}>{expanded ? "收起" : "展开"} <span>⌄</span></button>
            <button className="btn btn-reset" type="button" onClick={() => { onFiltersChange(initialBuyerFilters); setPage(1); }}>重置</button>
            <button className="btn btn-search" type="button" onClick={() => setPage(1)}>查询</button>
          </div>
        </div>
      </section>

      <section className="content-card buyer-table-card">
        <div className="buyer-toolbar">
          <div className="buyer-toolbar-left">
            <button className="btn btn-create" type="button" onClick={() => onActionClick("新增买家")}>新增买家</button>
            <button className="btn btn-reset buyer-toolbar-btn" type="button" onClick={() => onActionClick("批量导入买家")}>批量导入买家</button>
            <button className="btn btn-reset buyer-toolbar-btn" type="button" onClick={() => onActionClick("批量删除买家")}>批量删除买家</button>
          </div>
          <button className="btn btn-reset buyer-export-btn" type="button" onClick={() => onActionClick("导出查询结果")}>导出查询结果</button>
        </div>

        <div className="buyer-table-shell">
          <table className="buyer-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>买家ID</th>
                <th>买家账号</th>
                <th>账号类型</th>
                <th>买家身份</th>
                <th>买家折扣</th>
                <th>所属分组</th>
                <th>添加时间 <span className="buyer-sort-icon">↕</span></th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((item) => (
                <tr key={item.id}>
                  <td><input type="checkbox" /></td>
                  <td>{item.id}</td>
                  <td>{item.account}</td>
                  <td>{item.accountType}</td>
                  <td>{item.identity}</td>
                  <td>{hasValue(item.discount) ? item.discount : "-"}</td>
                  <td>{formatBuyerGroupNames(item.group) || "-"}</td>
                  <td>{item.createdAt}</td>
                  <td>{item.status}</td>
                  <td>
                    <div className="buyer-action-links">
                      <button type="button" onClick={() => onActionClick("编辑买家", item)}>编辑</button>
                      <button type="button" onClick={() => onActionClick(`删除买家 ${item.id}`, item)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="buyer-pagination">
          <span>共 {filteredRows.length} 条</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={20}>20 条/页</option>
            <option value={50}>50 条/页</option>
            <option value={100}>100 条/页</option>
          </select>
          <button className="page-btn" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          <button className="page-btn is-current" type="button">{currentPage}</button>
          <button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button>
          <span>到第</span>
          <input className="page-input" placeholder="请输入" />
          <span>页</span>
          <button className="btn btn-jump" type="button">跳转</button>
        </div>
      </section>
    </>
  );
}

function ShopInvoicePage({
  activeShopTab = "发票管理",
  initialInvoiceStatusTab = "全部",
  initialMarkerFilter = "全部",
  invoiceEntryRequestId = 0,
  onOpenOrderInfoTab,
  onCloseOrderInfoTab,
  onOpenInvoiceInfoTab,
  onCloseInvoiceInfoTab,
  onOpenInvoiceHistoryTab,
  onCloseInvoiceHistoryTab
}) {
  const [activeInvoiceStatusTab, setActiveInvoiceStatusTab] = useState("全部");
  const [markerFilter, setMarkerFilter] = useState("全部");
  const [isColumnSettingOpen, setIsColumnSettingOpen] = useState(false);
  const [activeOrderDetailNo, setActiveOrderDetailNo] = useState("");
  const [activeInvoiceDetailNo, setActiveInvoiceDetailNo] = useState("");
  const [activeInvoiceHistoryNo, setActiveInvoiceHistoryNo] = useState("");
  const [draftFilters, setDraftFilters] = useState(initialShopInvoiceFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialShopInvoiceFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [shopInvoiceRows, setShopInvoiceRows] = useState(normalizedShopInvoiceManagementRows);
  const [selectedShopInvoiceOrderNos, setSelectedShopInvoiceOrderNos] = useState([]);
  const [shopInvoiceNotice, setShopInvoiceNotice] = useState("");
  const [shopInvoiceSettingTypes, setShopInvoiceSettingTypes] = useState(["电子普通发票", "电子增值税专用发票"]);
  const [isConfirmInvoiceModalOpen, setIsConfirmInvoiceModalOpen] = useState(false);
  const [confirmInvoiceModalMode, setConfirmInvoiceModalMode] = useState("batch");
  const [confirmInvoiceForm, setConfirmInvoiceForm] = useState(initialShopInvoiceConfirmForm);
  const [confirmInvoiceErrors, setConfirmInvoiceErrors] = useState(initialShopInvoiceConfirmErrors);
  const [isRejectInvoiceModalOpen, setIsRejectInvoiceModalOpen] = useState(false);
  const [rejectInvoiceModalMode, setRejectInvoiceModalMode] = useState("batch");
  const [rejectInvoiceForm, setRejectInvoiceForm] = useState(initialShopInvoiceRejectForm);
  const [rejectInvoiceErrors, setRejectInvoiceErrors] = useState(initialShopInvoiceRejectErrors);
  const [isModifyInvoiceModalOpen, setIsModifyInvoiceModalOpen] = useState(false);
  const [modifyInvoiceModalMode, setModifyInvoiceModalMode] = useState("batch");
  const [selectedModifyInvoiceOrderNos, setSelectedModifyInvoiceOrderNos] = useState([]);
  const [modifyInvoiceForm, setModifyInvoiceForm] = useState(initialShopInvoiceModifyForm);
  const [modifyInvoiceErrors, setModifyInvoiceErrors] = useState(initialShopInvoiceModifyErrors);
  const [shopInvoiceColumnPrefs, setShopInvoiceColumnPrefs] = useState(initialShopInvoiceColumnPrefs);
  const [shopInvoiceColumnOrder, setShopInvoiceColumnOrder] = useState(initialShopInvoiceColumnOrder);
  const [draggingColumnKey, setDraggingColumnKey] = useState("");
  const [afterSaleHeaderTooltip, setAfterSaleHeaderTooltip] = useState(null);
  const [orderMarkerTooltip, setOrderMarkerTooltip] = useState(null);
  const [columnPopoverPosition, setColumnPopoverPosition] = useState({ top: 0, right: 0, maxHeight: 0, zoneMaxHeight: 0 });
  const columnTriggerRef = useRef(null);
  const orderMarkerTooltipRef = useRef(null);
  const confirmInvoiceFileInputRef = useRef(null);
  const confirmInvoiceDateInputRef = useRef(null);
  const modifyInvoiceFileInputRef = useRef(null);
  const modifyInvoiceDateInputRef = useRef(null);
  const orderedSettingColumns = useMemo(() => (
    shopInvoiceColumnOrder
      .map((key) => shopInvoiceColumnDefinitions.find((column) => column.key === key))
      .filter(Boolean)
  ), [shopInvoiceColumnOrder]);
  const leftZoneColumns = useMemo(() => (
    orderedSettingColumns.filter((column) => column.key !== "actions" && shopInvoiceColumnPrefs[column.key]?.freeze === "left")
  ), [orderedSettingColumns, shopInvoiceColumnPrefs]);
  const middleZoneColumns = useMemo(() => (
    orderedSettingColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.freeze === "none")
  ), [orderedSettingColumns, shopInvoiceColumnPrefs]);
  const rightZoneColumns = useMemo(() => (
    orderedSettingColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.freeze === "right")
  ), [orderedSettingColumns, shopInvoiceColumnPrefs]);
  const visibleColumns = useMemo(() => {
    const fixedSelectColumn = shopInvoiceColumnDefinitions.find((column) => column.key === "select");
    const visibleLeftColumns = leftZoneColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.visible !== false);
    const visibleMiddleColumns = middleZoneColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.visible !== false);
    const visibleRightColumns = rightZoneColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.visible !== false);
    const shouldShowSelectColumn = ["全部", "待开票", "已开票"].includes(activeInvoiceStatusTab);

    return [shouldShowSelectColumn ? fixedSelectColumn : null, ...visibleLeftColumns, ...visibleMiddleColumns, ...visibleRightColumns].filter(Boolean);
  }, [activeInvoiceStatusTab, leftZoneColumns, middleZoneColumns, rightZoneColumns, shopInvoiceColumnPrefs]);
  const rightFrozenColumnKeys = useMemo(() => (
    visibleColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.freeze === "right").map((column) => column.key)
  ), [shopInvoiceColumnPrefs, visibleColumns]);
  const firstRightFrozenColumnKey = rightFrozenColumnKeys.length > 0 ? rightFrozenColumnKeys[0] : "";
  const frozenColumnKeys = useMemo(() => (
    visibleColumns.filter((column) => shopInvoiceColumnPrefs[column.key]?.freeze === "left").map((column) => column.key)
  ), [shopInvoiceColumnPrefs, visibleColumns]);
  const lastFrozenColumnKey = frozenColumnKeys.length > 0 ? frozenColumnKeys[frozenColumnKeys.length - 1] : "";
  const stickyLeftByKey = useMemo(() => {
    let offset = 0;
    return visibleColumns.reduce((result, column) => {
      if (shopInvoiceColumnPrefs[column.key]?.freeze === "left") {
        result[column.key] = offset;
        offset += column.width;
      }
      return result;
    }, {});
  }, [shopInvoiceColumnPrefs, visibleColumns]);
  const stickyRightByKey = useMemo(() => {
    let offset = 0;
    return [...visibleColumns].reverse().reduce((result, column) => {
      if (shopInvoiceColumnPrefs[column.key]?.freeze === "right") {
        result[column.key] = offset;
        offset += column.width;
      }
      return result;
    }, {});
  }, [visibleColumns]);
  const tableMinWidth = useMemo(() => (
    visibleColumns.reduce((sum, column) => sum + column.width, 0)
  ), [visibleColumns]);
  const invoiceStatusTabCounts = useMemo(() => (
    shopInvoiceStatusTabs.reduce((result, status) => {
      result[status] = status === "全部"
        ? shopInvoiceRows.length
        : shopInvoiceRows.filter((item) => item.invoiceStatus === status).length;
      return result;
    }, {})
  ), [shopInvoiceRows]);
  const filteredRows = useMemo(() => shopInvoiceRows.filter((item) => {
    const orderNoKeyword = appliedFilters.orderNo.trim();
    if (orderNoKeyword && !item.orderNo.includes(orderNoKeyword)) return false;
    if (appliedFilters.invoiceType !== "全部" && item.invoiceType !== appliedFilters.invoiceType) return false;
    if (appliedFilters.singleInvoice !== "全部" && item.singleInvoice !== appliedFilters.singleInvoice) return false;
    if (appliedFilters.paymentMethod !== "全部" && item.paymentMethod !== appliedFilters.paymentMethod) return false;
    if (appliedFilters.invoiceContent !== "全部" && item.invoiceContent !== appliedFilters.invoiceContent) return false;
    if (appliedFilters.invoiceBatch.trim() && !String(item.invoiceBatch || "").toLowerCase().includes(appliedFilters.invoiceBatch.trim().toLowerCase())) return false;
    if (activeInvoiceStatusTab !== "全部" && item.invoiceStatus !== activeInvoiceStatusTab) return false;
    if (appliedFilters.orderStatus !== "全部" && item.orderStatus !== appliedFilters.orderStatus) return false;
    if (appliedFilters.afterSaleStatus !== "全部" && item.afterSaleStatus !== appliedFilters.afterSaleStatus) return false;

    const invoiceNoKeyword = appliedFilters.invoiceNo.trim();
    if (invoiceNoKeyword && !String(item.invoiceNo || "").includes(invoiceNoKeyword)) return false;

    const invoiceTitleKeyword = appliedFilters.invoiceTitle.trim().toLowerCase();
    if (invoiceTitleKeyword && !item.invoiceTitle.toLowerCase().includes(invoiceTitleKeyword)) return false;

    const taxpayerKeyword = appliedFilters.taxpayerId.trim();
    if (taxpayerKeyword && !item.taxpayerId.includes(taxpayerKeyword)) return false;

    const buyerAccountKeyword = appliedFilters.buyerAccount.trim().toLowerCase();
    if (buyerAccountKeyword && !item.buyerAccount.toLowerCase().includes(buyerAccountKeyword)) return false;

    const storeKeyword = appliedFilters.store.trim().toLowerCase();
    if (storeKeyword && !item.store.toLowerCase().includes(storeKeyword)) return false;
    if (markerFilter === "即将超时" && !isShopInvoiceApplicationApproachingOverdue(item)) return false;
    if (markerFilter === "超时" && !isShopInvoiceApplicationOverdue(item)) return false;
    if (markerFilter === "已修改" && !isShopInvoiceApplicationModified(item)) return false;
    if (markerFilter === "撤销重提" && !isShopInvoiceApplicationResubmitted(item)) return false;

    const matchDateRange = (dateTime, range) => {
      if (!range.startDate && !range.endDate) return true;
      const dateValue = String(dateTime || "").slice(0, 10);
      if (!dateValue || dateValue === "-") return false;
      if (range.startDate && dateValue < range.startDate) return false;
      if (range.endDate && dateValue > range.endDate) return false;
      return true;
    };

    if (!matchDateRange(item.paidAt, appliedFilters.paidAtRange)) return false;
    if (!matchDateRange(item.appliedAt, appliedFilters.appliedAtRange)) return false;
    if (!matchDateRange(item.invoicedAt, appliedFilters.invoicedAtRange)) return false;

    return true;
  }), [activeInvoiceStatusTab, appliedFilters, markerFilter, shopInvoiceRows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectableInvoiceRows = useMemo(() => (
    filteredRows.filter((item) => item.invoiceStatus === "待开票")
  ), [filteredRows]);
  const selectableModifyRows = useMemo(() => (
    filteredRows.filter((item) => item.invoiceStatus === "已开票")
  ), [filteredRows]);
  const selectableMixedRows = useMemo(() => (
    filteredRows.filter((item) => ["待开票", "已开票"].includes(item.invoiceStatus))
  ), [filteredRows]);
  const isAllInvoiceStatusTab = activeInvoiceStatusTab === "全部";
  const showOrderMarkerBadges = !["已驳回", "已撤销"].includes(activeInvoiceStatusTab);
  const showInvoiceApproachingBadge = showOrderMarkerBadges && ["全部", "待开票"].includes(activeInvoiceStatusTab);
  const showInvoiceOverdueBadge = showOrderMarkerBadges && ["全部", "待开票"].includes(activeInvoiceStatusTab);
  const showModifiedBadge = showOrderMarkerBadges;
  const showResubmittedBadge = showOrderMarkerBadges && ["全部", "待开票"].includes(activeInvoiceStatusTab);
  const showConfirmBatchToolbar = activeInvoiceStatusTab === "全部" || activeInvoiceStatusTab === "待开票";
  const showPendingModifyBatchAction = activeInvoiceStatusTab === "全部";
  const showModifyBatchToolbar = activeInvoiceStatusTab === "已开票";
  const showBatchRejectAction = activeInvoiceStatusTab === "全部" || activeInvoiceStatusTab === "待开票";
  const showSelectableCheckboxes = showConfirmBatchToolbar || showModifyBatchToolbar;
  const activeSelectableRows = showModifyBatchToolbar
    ? selectableModifyRows
    : isAllInvoiceStatusTab
      ? selectableMixedRows
      : selectableInvoiceRows;
  const activeSelectedOrderNos = showModifyBatchToolbar ? selectedModifyInvoiceOrderNos : selectedShopInvoiceOrderNos;
  const allSelectableInvoiceRowsSelected = activeSelectableRows.length > 0 && activeSelectableRows.every((item) => activeSelectedOrderNos.includes(item.orderNo));
  const selectedConfirmRows = useMemo(() => {
    const selectedSet = new Set(selectedShopInvoiceOrderNos);
    return shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
  }, [selectedShopInvoiceOrderNos, shopInvoiceRows]);
  const confirmInvoiceContent = useMemo(() => (
    selectedConfirmRows[0]?.invoiceContent || "商品类别"
  ), [selectedConfirmRows]);
  const confirmInvoiceSummary = useMemo(() => {
    const firstRow = selectedConfirmRows[0];
    const orderAmount = selectedConfirmRows.reduce((sum, item) => sum + parseMoneyValue(item.orderAmount), 0);
    const afterSaleAmount = selectedConfirmRows.reduce((sum, item) => sum + parseMoneyValue(item.afterSaleAmount), 0);
    const applyAmount = selectedConfirmRows.reduce((sum, item) => sum + parseMoneyValue(item.amount), 0);
    const shouldInvoiceAmount = selectedConfirmRows.reduce((sum, item) => sum + parseMoneyValue(item.shouldInvoiceAmount), 0);
    const allSameInvoiceType = selectedConfirmRows.every((item) => item.invoiceType === firstRow?.invoiceType);
    const allSameInvoiceTitle = selectedConfirmRows.every((item) => item.invoiceTitle === firstRow?.invoiceTitle && item.taxpayerId === firstRow?.taxpayerId);

    return {
      count: selectedConfirmRows.length,
      invoiceType: selectedConfirmRows.length === 0 ? "-" : allSameInvoiceType ? firstRow.invoiceType : "多种发票类型",
      invoiceTitle: selectedConfirmRows.length === 0 ? "-" : allSameInvoiceTitle ? `${firstRow.invoiceTitle}（${firstRow.taxpayerId}）` : `共 ${selectedConfirmRows.length} 个开票主体`,
      orderAmount,
      afterSaleAmount,
      applyAmount,
      shouldInvoiceAmount
    };
  }, [selectedConfirmRows]);
  const confirmBatchNotice = useMemo(() => {
    const buyerCount = new Set(selectedConfirmRows.map((item) => item.buyerAccount)).size;
    const storeCount = new Set(selectedConfirmRows.map((item) => item.store)).size;
    const invoiceCount = selectedConfirmRows.length;
    return `温馨提示：您将为${buyerCount}个买家账号（含${storeCount}家闪购门店）批量开具${invoiceCount}张发票，请谨慎操作`;
  }, [selectedConfirmRows]);
  const selectedModifyRows = useMemo(() => {
    const selectedSet = new Set(selectedModifyInvoiceOrderNos);
    return shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
  }, [selectedModifyInvoiceOrderNos, shopInvoiceRows]);
  const modifyInvoiceContent = useMemo(() => (
    selectedModifyRows[0]?.invoiceContent || "商品类别"
  ), [selectedModifyRows]);
  const modifyInvoiceSummary = useMemo(() => {
    const firstRow = selectedModifyRows[0];
    const orderAmount = selectedModifyRows.reduce((sum, item) => sum + parseMoneyValue(item.orderAmount), 0);
    const afterSaleAmount = selectedModifyRows.reduce((sum, item) => sum + parseMoneyValue(item.afterSaleAmount), 0);
    const applyAmount = selectedModifyRows.reduce((sum, item) => sum + parseMoneyValue(item.amount), 0);
    const shouldInvoiceAmount = selectedModifyRows.reduce((sum, item) => sum + parseMoneyValue(item.shouldInvoiceAmount), 0);
    const allSameInvoiceType = selectedModifyRows.every((item) => item.invoiceType === firstRow?.invoiceType);
    const allSameInvoiceTitle = selectedModifyRows.every((item) => item.invoiceTitle === firstRow?.invoiceTitle && item.taxpayerId === firstRow?.taxpayerId);

    return {
      count: selectedModifyRows.length,
      invoiceType: selectedModifyRows.length === 0 ? "-" : allSameInvoiceType ? firstRow.invoiceType : "多种发票类型",
      invoiceTitle: selectedModifyRows.length === 0 ? "-" : allSameInvoiceTitle ? `${firstRow.invoiceTitle}（${firstRow.taxpayerId}）` : `共 ${selectedModifyRows.length} 个开票主体`,
      orderAmount,
      afterSaleAmount,
      applyAmount,
      shouldInvoiceAmount
    };
  }, [selectedModifyRows]);
  const modifyBatchNotice = useMemo(() => {
    const buyerCount = new Set(selectedModifyRows.map((item) => item.buyerAccount)).size;
    const storeCount = new Set(selectedModifyRows.map((item) => item.store)).size;
    const invoiceCount = selectedModifyRows.length;
    return `温馨提示：您将为${buyerCount}个买家账号（含${storeCount}家闪购门店）批量修改${invoiceCount}张发票，请谨慎操作`;
  }, [selectedModifyRows]);
  const activeOrderDetail = useMemo(() => (
    createShopInvoiceOrderDetail(shopInvoiceRows.find((item) => item.orderNo === activeOrderDetailNo))
  ), [activeOrderDetailNo, shopInvoiceRows]);
  const activeInvoiceDetail = useMemo(() => (
    createShopInvoiceIssuedDetail(shopInvoiceRows.find((item) => item.orderNo === activeInvoiceDetailNo))
  ), [activeInvoiceDetailNo, shopInvoiceRows]);
  const activeInvoiceHistory = useMemo(() => (
    shopInvoiceRows.find((item) => item.orderNo === activeInvoiceHistoryNo) || null
  ), [activeInvoiceHistoryNo, shopInvoiceRows]);
  const activeInvoiceBatchOrderCount = useMemo(() => {
    if (!activeInvoiceHistory?.invoiceBatch || activeInvoiceHistory.invoiceBatch === "-") return 0;
    return shopInvoiceRows.filter((item) => item.invoiceBatch === activeInvoiceHistory.invoiceBatch).length;
  }, [activeInvoiceHistory, shopInvoiceRows]);

  const handleShowAfterSaleHeaderTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAfterSaleHeaderTooltip({
      left: rect.left + (rect.width / 2),
      top: rect.top - 8
    });
  };

  const handleHideAfterSaleHeaderTooltip = () => {
    setAfterSaleHeaderTooltip(null);
  };

  const handleShowOrderMarkerTooltip = (event, content) => {
    if (!content) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const preferredLeft = rect.left + (rect.width / 2);

    setOrderMarkerTooltip({
      content,
      preferredLeft,
      left: preferredLeft,
      top: rect.top - 8
    });
  };

  const handleHideOrderMarkerTooltip = () => {
    setOrderMarkerTooltip(null);
  };

  useLayoutEffect(() => {
    if (!orderMarkerTooltip || !orderMarkerTooltipRef.current) return;

    const tooltipWidth = orderMarkerTooltipRef.current.offsetWidth || 0;
    if (!tooltipWidth) return;

    const viewportPadding = 16;
    const halfWidth = tooltipWidth / 2;
    const clampedLeft = Math.min(
      window.innerWidth - viewportPadding - halfWidth,
      Math.max(viewportPadding + halfWidth, orderMarkerTooltip.preferredLeft)
    );

    if (Math.abs(clampedLeft - orderMarkerTooltip.left) > 0.5) {
      setOrderMarkerTooltip((current) => (
        current
          ? { ...current, left: clampedLeft }
          : current
      ));
    }
  }, [orderMarkerTooltip]);

  const handleDraftFilterChange = (key, nextValue) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: nextValue
    }));
  };

  const handleSearch = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const handleOpenOrderDetail = (orderNo) => {
    setActiveInvoiceDetailNo("");
    setActiveOrderDetailNo(orderNo);
    onOpenOrderInfoTab?.();
  };

  const handleCloseOrderDetail = () => {
    setActiveOrderDetailNo("");
    onCloseOrderInfoTab?.();
  };

  const handleOpenInvoiceDetail = (orderNo) => {
    setActiveInvoiceHistoryNo("");
    setActiveOrderDetailNo("");
    setActiveInvoiceDetailNo(orderNo);
    onOpenInvoiceInfoTab?.();
  };

  const handleCloseInvoiceDetail = () => {
    setActiveInvoiceDetailNo("");
    onCloseInvoiceInfoTab?.();
  };

  const handleOpenInvoiceHistory = (orderNo) => {
    setActiveOrderDetailNo("");
    setActiveInvoiceDetailNo("");
    setActiveInvoiceHistoryNo(orderNo);
    onOpenInvoiceHistoryTab?.();
  };

  const handleCloseInvoiceHistory = () => {
    setActiveInvoiceHistoryNo("");
    onCloseInvoiceHistoryTab?.();
  };
  const handleSearchInvoiceBatchFromHistory = (invoiceBatch) => {
    if (!invoiceBatch || invoiceBatch === "-") return;
    const nextFilters = {
      ...initialShopInvoiceFilters,
      invoiceBatch
    };

    setActiveInvoiceHistoryNo("");
    setActiveInvoiceDetailNo("");
    setActiveOrderDetailNo("");
    setActiveInvoiceStatusTab("全部");
    setMarkerFilter("全部");
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedShopInvoiceOrderNos([]);
    setSelectedModifyInvoiceOrderNos([]);
    setPage(1);
    onCloseInvoiceHistoryTab?.();
  };

  useEffect(() => {
    if (activeShopTab === "订单信息" || !activeOrderDetailNo) return;
    setActiveOrderDetailNo("");
  }, [activeOrderDetailNo, activeShopTab]);

  useEffect(() => {
    if (activeShopTab === "发票信息" || !activeInvoiceDetailNo) return;
    setActiveInvoiceDetailNo("");
  }, [activeInvoiceDetailNo, activeShopTab]);

  useEffect(() => {
    if (activeShopTab === "历史操作" || !activeInvoiceHistoryNo) return;
    setActiveInvoiceHistoryNo("");
  }, [activeInvoiceHistoryNo, activeShopTab]);

  useEffect(() => {
    setActiveInvoiceStatusTab(initialInvoiceStatusTab || "全部");
    setMarkerFilter(initialMarkerFilter || "全部");
    setDraftFilters(initialShopInvoiceFilters);
    setAppliedFilters(initialShopInvoiceFilters);
    setSelectedShopInvoiceOrderNos([]);
    setSelectedModifyInvoiceOrderNos([]);
    setPage(1);
  }, [initialInvoiceStatusTab, initialMarkerFilter, invoiceEntryRequestId]);

  const handleResetFilters = () => {
    setDraftFilters(initialShopInvoiceFilters);
    setAppliedFilters(initialShopInvoiceFilters);
    setPage(1);
  };

  const handleChangeInvoiceStatusTab = (status) => {
    setActiveInvoiceStatusTab(status);
    setPage(1);
    setSelectedShopInvoiceOrderNos([]);
    setSelectedModifyInvoiceOrderNos([]);
  };

  const handleToggleInvoiceSettingType = (type) => {
    setShopInvoiceSettingTypes((current) => (
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    ));
  };

  const handleSaveInvoiceSettings = () => {
    if (shopInvoiceSettingTypes.length === 0) {
      setShopInvoiceNotice("请至少选择一种发票类型");
      return;
    }
    setShopInvoiceNotice("发票设置已保存");
  };

  const handleToggleAllSelectableRows = (checked) => {
    if (showModifyBatchToolbar) {
      setSelectedModifyInvoiceOrderNos(checked ? selectableModifyRows.map((item) => item.orderNo) : []);
      return;
    }

    if (isAllInvoiceStatusTab) {
      setSelectedShopInvoiceOrderNos(checked ? selectableMixedRows.map((item) => item.orderNo) : []);
      return;
    }

    handleToggleAllPendingConfirmRows(checked);
  };

  const handleToggleSelectableRow = (orderNo) => {
    if (showModifyBatchToolbar) {
      setSelectedModifyInvoiceOrderNos((current) => (
        current.includes(orderNo)
          ? current.filter((item) => item !== orderNo)
          : [...current, orderNo]
      ));
      return;
    }

    handleTogglePendingConfirmRow(orderNo);
  };

  const handleToggleColumnVisible = (key) => {
    setShopInvoiceColumnPrefs((current) => {
      const column = shopInvoiceColumnDefinitions.find((item) => item.key === key);
      if (!column || column.alwaysVisible) return current;

      return {
        ...current,
        [key]: {
          ...current[key],
          visible: !current[key]?.visible
        }
      };
    });
  };

  const handleToggleColumnFrozen = (key) => {
    setShopInvoiceColumnPrefs((current) => {
      const column = shopInvoiceColumnDefinitions.find((item) => item.key === key);
      if (!column || column.key === "actions") return current;

      return {
        ...current,
        [key]: {
          ...current[key],
          visible: true,
          freeze: current[key]?.freeze === "left" ? "none" : "left"
        }
      };
    });
  };

  const moveColumnToZone = (key, targetZone, targetIndex = null) => {
    setShopInvoiceColumnOrder((currentOrder) => {
      const nextOrder = currentOrder.filter((item) => item !== key);
      const leftKeys = nextOrder.filter((item) => shopInvoiceColumnPrefs[item]?.freeze === "left" && item !== "actions");
      const middleKeys = nextOrder.filter((item) => shopInvoiceColumnPrefs[item]?.freeze === "none");
      const rightKeys = nextOrder.filter((item) => shopInvoiceColumnPrefs[item]?.freeze === "right");
      const zoneMap = {
        left: leftKeys,
        none: middleKeys,
        right: rightKeys
      };
      const targetList = [...zoneMap[targetZone]];
      const insertIndex = targetIndex === null ? targetList.length : Math.max(0, Math.min(targetIndex, targetList.length));
      targetList.splice(insertIndex, 0, key);
      zoneMap[targetZone] = targetList;
      return [...zoneMap.left, ...zoneMap.none, ...zoneMap.right];
    });
    setShopInvoiceColumnPrefs((current) => ({
      ...current,
      [key]: {
        ...current[key],
        visible: true,
        freeze: targetZone
      }
    }));
  };

  const handleColumnDragStart = (key) => {
    setDraggingColumnKey(key);
  };

  const handleColumnDrop = (targetZone, targetIndex = null) => {
    if (!draggingColumnKey) return;
    moveColumnToZone(draggingColumnKey, targetZone, targetIndex);
    setDraggingColumnKey("");
  };

  const handleResetColumnSettings = () => {
    setShopInvoiceColumnPrefs(initialShopInvoiceColumnPrefs);
    setShopInvoiceColumnOrder(initialShopInvoiceColumnOrder);
    setDraggingColumnKey("");
  };

  useEffect(() => {
    if (!shopInvoiceNotice) return undefined;
    const timerId = window.setTimeout(() => setShopInvoiceNotice(""), 2200);
    return () => window.clearTimeout(timerId);
  }, [shopInvoiceNotice]);

  useEffect(() => {
    if (!isColumnSettingOpen) return undefined;

    const updatePopoverPosition = () => {
      if (!columnTriggerRef.current) return;
      const rect = columnTriggerRef.current.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 8;
      const headerHeight = 52;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const shouldOpenUpward = spaceBelow < 320 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(240, shouldOpenUpward ? spaceAbove - gap : spaceBelow - gap);

      setColumnPopoverPosition({
        top: shouldOpenUpward
          ? Math.max(viewportPadding, rect.top - gap - availableHeight)
          : rect.bottom + gap,
        right: Math.max(window.innerWidth - rect.right, viewportPadding),
        maxHeight: availableHeight,
        zoneMaxHeight: Math.max(188, availableHeight - headerHeight)
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isColumnSettingOpen]);

  const handleToggleAllPendingConfirmRows = (checked) => {
    setSelectedShopInvoiceOrderNos(checked ? selectableInvoiceRows.map((item) => item.orderNo) : []);
  };

  const handleTogglePendingConfirmRow = (orderNo) => {
    setSelectedShopInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleOpenConfirmInvoiceModal = (orderNos = selectedShopInvoiceOrderNos, mode = "batch") => {
    const selectedSet = new Set(orderNos);
    const selectedRows = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
    const rowsToConfirm = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo) && item.invoiceStatus === "待开票");

    if (selectedRows.length === 0) {
      setShopInvoiceNotice("请先勾选待开票订单，再进行批量开票。");
      return;
    }

    if (selectedRows.some((item) => item.invoiceStatus !== "待开票")) {
      setShopInvoiceNotice("部分订单开票状态非待开票，无法批量开票，请检查");
      return;
    }

    if (mode === "batch" && rowsToConfirm.length > 1) {
      const firstRow = rowsToConfirm[0];
      const hasDifferentInvoiceTitle = rowsToConfirm.some((item) => item.invoiceTitle !== firstRow.invoiceTitle);
      if (hasDifferentInvoiceTitle) {
        setShopInvoiceNotice("本次选中订单的发票抬头不一致，无法批量开票，请检查");
        return;
      }

      const hasDifferentInvoiceType = rowsToConfirm.some((item) => item.invoiceType !== firstRow.invoiceType);
      if (hasDifferentInvoiceType) {
        setShopInvoiceNotice("本次选中订单的发票类型不一致，无法批量开票，请检查");
        return;
      }

      const hasDifferentInvoiceContent = rowsToConfirm.some((item) => (item.invoiceContent || "商品类别") !== (firstRow.invoiceContent || "商品类别"));
      if (hasDifferentInvoiceContent) {
        setShopInvoiceNotice("本次选中订单的发票内容不一致，无法批量开票，请检查");
        return;
      }
    }

    const defaultWithTax = formatMoneyDisplay(rowsToConfirm.reduce((sum, item) => sum + parseMoneyValue(item.shouldInvoiceAmount), 0));
    setSelectedShopInvoiceOrderNos(rowsToConfirm.map((item) => item.orderNo));
    setConfirmInvoiceForm({
      ...initialShopInvoiceConfirmForm,
      invoiceAmountWithTax: defaultWithTax
    });
    setConfirmInvoiceModalMode(mode);
    setConfirmInvoiceErrors(initialShopInvoiceConfirmErrors);
    setIsConfirmInvoiceModalOpen(true);
  };

  const handleOpenRejectInvoiceModal = (orderNos = selectedShopInvoiceOrderNos, mode = "batch") => {
    const selectedSet = new Set(orderNos);
    const selectedRows = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
    const rowsToReject = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo) && item.invoiceStatus === "待开票");

    if (selectedRows.length === 0) {
      setShopInvoiceNotice("请先勾选待开票订单，再进行批量驳回。");
      return;
    }

    if (selectedRows.some((item) => item.invoiceStatus !== "待开票")) {
      setShopInvoiceNotice("部分订单开票状态非待开票，无法批量驳回，请检查");
      return;
    }

    setSelectedShopInvoiceOrderNos(rowsToReject.map((item) => item.orderNo));
    setRejectInvoiceModalMode(mode);
    setRejectInvoiceForm(initialShopInvoiceRejectForm);
    setRejectInvoiceErrors(initialShopInvoiceRejectErrors);
    setIsRejectInvoiceModalOpen(true);
  };

  const handleOpenModifyInvoiceModal = (orderNos, mode = "batch") => {
    const normalizedOrderNos = Array.isArray(orderNos) ? orderNos : orderNos ? [orderNos] : [];
    const selectedSet = new Set(normalizedOrderNos);
    const selectedRows = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
    const rowsToModify = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo) && item.invoiceStatus === "已开票");

    if (selectedRows.length === 0) {
      setShopInvoiceNotice("请选择已开票订单，再进行修改发票。");
      return;
    }

    if (selectedRows.some((item) => item.invoiceStatus !== "已开票")) {
      setShopInvoiceNotice("部分订单开票状态非已开票，无法批量修改开票，请检查");
      return;
    }

    const firstRow = rowsToModify[0];
    setSelectedModifyInvoiceOrderNos(rowsToModify.map((item) => item.orderNo));
    setModifyInvoiceForm({
      ...initialShopInvoiceModifyForm,
      invoiceNo: firstRow.invoiceNo === "-" ? "" : firstRow.invoiceNo,
      invoiceAmountWithTax: firstRow.invoiceAmountWithTax === "-" ? "" : firstRow.invoiceAmountWithTax,
      invoiceAmountWithoutTax: firstRow.invoicedAt === "-"
        ? ""
        : formatMoneyDisplay(Math.max(parseMoneyValue(firstRow.invoiceAmountWithTax) - 0.04, 0)),
      invoicedDate: firstRow.invoicedAt && firstRow.invoicedAt !== "-" ? String(firstRow.invoicedAt).slice(0, 10) : ""
    });
    setModifyInvoiceModalMode(mode);
    setModifyInvoiceErrors(initialShopInvoiceModifyErrors);
    setIsModifyInvoiceModalOpen(true);
  };

  const handleRejectInvoice = (orderNo) => {
    handleOpenRejectInvoiceModal([orderNo], "single");
  };

  const handleCloseConfirmInvoiceModal = () => {
    setIsConfirmInvoiceModalOpen(false);
    setConfirmInvoiceModalMode("batch");
    setConfirmInvoiceForm(initialShopInvoiceConfirmForm);
    setConfirmInvoiceErrors(initialShopInvoiceConfirmErrors);
  };

  const handleCloseRejectInvoiceModal = () => {
    setIsRejectInvoiceModalOpen(false);
    setRejectInvoiceModalMode("batch");
    setRejectInvoiceForm(initialShopInvoiceRejectForm);
    setRejectInvoiceErrors(initialShopInvoiceRejectErrors);
  };

  const handleCloseModifyInvoiceModal = () => {
    setIsModifyInvoiceModalOpen(false);
    setModifyInvoiceModalMode("batch");
    setSelectedModifyInvoiceOrderNos([]);
    setModifyInvoiceForm(initialShopInvoiceModifyForm);
    setModifyInvoiceErrors(initialShopInvoiceModifyErrors);
  };

  const handlePreviewInvoicePdf = async (detail, action = "preview") => {
    if (!detail?.invoiceInfo?.canPreviewPdf) return;

    if (action === "download") {
      try {
        const pdfUrl = await buildShopInvoicePreviewPdfUrl(detail);
        downloadBlobUrl(pdfUrl, getInvoicePdfFileName(detail));
        window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 30 * 1000);
      } catch (error) {
        setShopInvoiceNotice("下载发票失败，请稍后重试");
      }
      return;
    }

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      setShopInvoiceNotice("浏览器拦截了新窗口，请允许弹窗后重试");
      return;
    }

    const previewTitle = `发票预览-${detail.invoiceInfo.invoiceNo || detail.orderInfo.orderNo || ""}`;
    renderInvoicePreviewLoading(previewWindow, previewTitle);

    try {
      const pdfUrl = await buildShopInvoicePreviewPdfUrl(detail);
      renderInvoicePreviewContent(previewWindow, pdfUrl, previewTitle);
    } catch (error) {
      previewWindow.document.open();
      previewWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(previewTitle)}</title>
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; color: #334155; font: 16px/1.6 "Microsoft YaHei", "PingFang SC", sans-serif; }
      .invoice-preview-error { padding: 20px 24px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08); }
    </style>
  </head>
  <body>
    <div class="invoice-preview-error">PDF 发票预览生成失败，请关闭后重试。</div>
  </body>
</html>`);
      previewWindow.document.close();
      setShopInvoiceNotice("预览发票失败，请稍后重试");
    }
  };

  const handleConfirmInvoiceFieldChange = (field, value) => {
    setConfirmInvoiceForm((current) => ({
      ...current,
      [field]: value
    }));
    if (confirmInvoiceErrors[field]) {
      setConfirmInvoiceErrors((current) => ({
        ...current,
        [field]: false
      }));
    }
  };

  const handleRejectInvoiceFieldChange = (value) => {
    setRejectInvoiceForm({ rejectReason: value });
    if (rejectInvoiceErrors.rejectReason) {
      setRejectInvoiceErrors(initialShopInvoiceRejectErrors);
    }
  };

  const handleConfirmInvoiceFileChange = (event) => {
    const file = event.target.files?.[0];
    handleConfirmInvoiceFieldChange("attachmentName", file ? file.name : "");
  };

  const handleDownloadConfirmInvoiceContent = () => {
    if (selectedConfirmRows.length === 0) {
      setShopInvoiceNotice("暂无可下载的发票内容");
      return;
    }

    const didExport = exportShopInvoiceContentWorkbook(selectedConfirmRows, confirmInvoiceContent);
    if (!didExport) {
      setShopInvoiceNotice("发票内容下载失败，请稍后重试");
    }
  };
  const handleDownloadModifyInvoiceContent = () => {
    if (selectedModifyRows.length === 0) {
      setShopInvoiceNotice("暂无可下载的发票内容");
      return;
    }

    const didExport = exportShopInvoiceContentWorkbook(selectedModifyRows, modifyInvoiceContent);
    if (!didExport) {
      setShopInvoiceNotice("发票内容下载失败，请稍后重试");
    }
  };

  const handleModifyInvoiceFieldChange = (field, value) => {
    setModifyInvoiceForm((current) => ({
      ...current,
      [field]: value
    }));
    if (modifyInvoiceErrors[field]) {
      setModifyInvoiceErrors((current) => ({
        ...current,
        [field]: false
      }));
    }
  };

  const handleModifyInvoiceFileChange = (event) => {
    const file = event.target.files?.[0];
    handleModifyInvoiceFieldChange("attachmentName", file ? file.name : "");
  };

  const handleOpenConfirmInvoiceDatePicker = () => {
    const input = confirmInvoiceDateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  const handleOpenModifyInvoiceDatePicker = () => {
    const input = modifyInvoiceDateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  const handleSubmitConfirmInvoice = () => {
    const nextErrors = {
      attachmentName: !confirmInvoiceForm.attachmentName,
      invoiceNo: !confirmInvoiceForm.invoiceNo.trim(),
      invoiceAmountWithTax: !confirmInvoiceForm.invoiceAmountWithTax.trim(),
      invoiceAmountWithoutTax: false,
      invoicedDate: !confirmInvoiceForm.invoicedDate
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setConfirmInvoiceErrors(nextErrors);
      setShopInvoiceNotice("请补全确认开票信息后再提交。");
      return;
    }

    const selectedSet = new Set(selectedShopInvoiceOrderNos);
    const submittedDate = `${confirmInvoiceForm.invoicedDate} 10:00:00`;
    setShopInvoiceRows((current) => current.map((item) => (
      selectedSet.has(item.orderNo)
        ? {
          ...item,
          invoiceAmountWithTax: confirmInvoiceForm.invoiceAmountWithTax.trim(),
          shouldInvoiceAmount: confirmInvoiceForm.invoiceAmountWithTax.trim(),
          invoicedAt: submittedDate,
          invoiceNo: confirmInvoiceForm.invoiceNo.trim(),
          invoiceMethod: "手动",
          invoiceStatus: "已开票",
          invoiceStatusTone: "success",
          applicationStatus: "已完成",
          actions: getShopInvoiceActions({ ...item, invoiceStatus: "已开票" }),
          historyRecords: appendShopInvoiceHistoryRecord(item.historyRecords, {
            key: `${item.orderNo}-invoiced-${submittedDate}`,
            type: "complete",
            label: "开票完成",
            time: submittedDate,
            description: `已完成开票，发票号码 ${confirmInvoiceForm.invoiceNo.trim()}。`
          })
        }
        : item
    )));
    setSelectedShopInvoiceOrderNos([]);
    handleCloseConfirmInvoiceModal();
    setShopInvoiceNotice("确认开票成功");
  };

  const handleSubmitRejectInvoice = () => {
    const rejectReason = rejectInvoiceForm.rejectReason.trim();

    if (!rejectReason) {
      setRejectInvoiceErrors({ rejectReason: true });
      setShopInvoiceNotice("请输入驳回原因后再提交。");
      return;
    }

    const rejectedAt = formatCurrentDateTime();
    const selectedSet = new Set(selectedShopInvoiceOrderNos);
    setShopInvoiceRows((current) => current.map((item) => (
      selectedSet.has(item.orderNo)
        ? {
          ...item,
          applicationStatus: "已驳回",
          invoiceStatus: "已驳回",
          invoiceStatusTone: "danger",
          rejectedAt,
          rejectReason,
          actions: getShopInvoiceActions({ ...item, invoiceStatus: "已驳回" }),
          historyRecords: appendShopInvoiceHistoryRecord(item.historyRecords, {
            key: `${item.orderNo}-reject-${rejectedAt}`,
            type: "reject",
            label: "驳回开票申请",
            time: rejectedAt,
            description: `驳回原因：${rejectReason}`
          })
        }
        : item
    )));
    setSelectedShopInvoiceOrderNos([]);
    handleCloseRejectInvoiceModal();
    setShopInvoiceNotice(rejectInvoiceModalMode === "single" ? "驳回成功" : "批量驳回成功");
  };

  const handleSubmitModifyInvoice = () => {
    const nextErrors = {
      attachmentName: !modifyInvoiceForm.attachmentName,
      invoiceNo: !modifyInvoiceForm.invoiceNo.trim(),
      invoiceAmountWithTax: !modifyInvoiceForm.invoiceAmountWithTax.trim(),
      invoiceAmountWithoutTax: false,
      invoicedDate: !modifyInvoiceForm.invoicedDate
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setModifyInvoiceErrors(nextErrors);
      setShopInvoiceNotice("请补全修改发票信息后再提交。");
      return;
    }

    const selectedSet = new Set(selectedModifyInvoiceOrderNos);
    const submittedDate = `${modifyInvoiceForm.invoicedDate} 10:00:00`;
    setShopInvoiceRows((current) => current.map((item) => (
      selectedSet.has(item.orderNo)
        ? {
          ...item,
          invoiceAmountWithTax: modifyInvoiceForm.invoiceAmountWithTax.trim(),
          shouldInvoiceAmount: modifyInvoiceForm.invoiceAmountWithTax.trim(),
          invoicedAt: submittedDate,
          invoiceNo: modifyInvoiceForm.invoiceNo.trim(),
          invoiceMethod: "手动",
          invoiceStatus: "已开票",
          invoiceStatusTone: "success",
          applicationStatus: "已完成",
          actions: getShopInvoiceActions({ ...item, invoiceStatus: "已开票" }),
          historyRecords: appendShopInvoiceHistoryRecord(item.historyRecords, {
            key: `${item.orderNo}-modify-invoice-${submittedDate}`,
            type: "modify_invoice",
            label: "修改发票",
            time: submittedDate,
            description: `更新发票信息，发票号码调整为 ${modifyInvoiceForm.invoiceNo.trim()}。`
          })
        }
        : item
    )));
    handleCloseModifyInvoiceModal();
    setShopInvoiceNotice("修改发票成功");
  };

  const getColumnStyle = (column) => {
    const stickyLeft = stickyLeftByKey[column.key];
    const stickyRight = stickyRightByKey[column.key];
    return {
      width: `${column.width}px`,
      minWidth: `${column.width}px`,
      ...(stickyLeft !== undefined
        ? {
          position: "sticky",
          left: `${stickyLeft}px`
        }
        : stickyRight !== undefined
          ? {
            position: "sticky",
            right: `${stickyRight}px`
          }
        : {})
    };
  };

  const getColumnClassName = (column, type) => {
    const classNames = [
      shopInvoiceColumnPrefs[column.key]?.freeze === "left" ? "is-frozen" : "",
      lastFrozenColumnKey === column.key ? "is-last-frozen" : "",
      shopInvoiceColumnPrefs[column.key]?.freeze === "right" ? "is-frozen-right" : "",
      firstRightFrozenColumnKey === column.key ? "is-first-frozen-right" : "",
      type === "header" ? column.headerClassName || "" : column.cellClassName || ""
    ].filter(Boolean);
    return classNames.length > 0 ? classNames.join(" ") : undefined;
  };

  const renderInvoiceTableCell = (item, column) => {
    if (column.key === "select") {
      if (!showSelectableCheckboxes) return null;
      return (
        <input
          type="checkbox"
          checked={activeSelectedOrderNos.includes(item.orderNo)}
          disabled={
            showModifyBatchToolbar
              ? item.invoiceStatus !== "已开票"
              : isAllInvoiceStatusTab
                ? !["待开票", "已开票"].includes(item.invoiceStatus)
                : item.invoiceStatus !== "待开票"
          }
          onChange={() => handleToggleSelectableRow(item.orderNo)}
        />
      );
    }

    if (column.key === "orderNo") {
      return (
        <div className="shop-invoice-order-cell">
          <button className="buyer-link-btn" type="button" onClick={() => handleOpenOrderDetail(item.orderNo)}>
            {item.orderNo}
          </button>
          {(showInvoiceApproachingBadge && hasShopInvoiceApproachingBadge(item))
            || (showInvoiceOverdueBadge && isShopInvoiceApplicationOverdue(item))
            || (showModifiedBadge && isShopInvoiceApplicationModified(item))
            || (showResubmittedBadge && isShopInvoiceApplicationResubmitted(item))
            ? (
              <div className="shop-invoice-order-badges">
                {showInvoiceApproachingBadge && hasShopInvoiceApproachingBadge(item)
                  ? (
                    <span
                      className="pc-mall-inline-tooltip-wrap"
                      onMouseEnter={(event) => handleShowOrderMarkerTooltip(event, getShopInvoiceApproachingTooltip(item))}
                      onMouseLeave={handleHideOrderMarkerTooltip}
                    >
                      <span className="shop-invoice-approaching-badge">即将超时</span>
                    </span>
                  )
                  : null}
                {showInvoiceOverdueBadge && isShopInvoiceApplicationOverdue(item)
                  ? (
                    <span
                      className="pc-mall-inline-tooltip-wrap"
                      onMouseEnter={(event) => handleShowOrderMarkerTooltip(event, getShopInvoiceOverdueTooltip(item))}
                      onMouseLeave={handleHideOrderMarkerTooltip}
                    >
                      <span className="shop-invoice-overdue-badge">超时</span>
                    </span>
                  )
                  : null}
                {showModifiedBadge && isShopInvoiceApplicationModified(item)
                  ? (
                    <span
                      className="pc-mall-inline-tooltip-wrap"
                      onMouseEnter={(event) => handleShowOrderMarkerTooltip(event, getShopInvoiceModifiedTooltip(item))}
                      onMouseLeave={handleHideOrderMarkerTooltip}
                    >
                      <span className="shop-invoice-modified-badge">已修改</span>
                    </span>
                  )
                  : null}
                {showResubmittedBadge && isShopInvoiceApplicationResubmitted(item)
                  ? (
                    <span
                      className="pc-mall-inline-tooltip-wrap"
                      onMouseEnter={(event) => handleShowOrderMarkerTooltip(event, getShopInvoiceResubmittedTooltip(item))}
                      onMouseLeave={handleHideOrderMarkerTooltip}
                    >
                      <span className="shop-invoice-resubmitted-badge">撤销重提</span>
                    </span>
                  )
                  : null}
              </div>
            )
            : null}
        </div>
      );
    }

    if (column.key === "actions") {
      return (
        <div className="shop-invoice-actions">
          {item.actions.map((action) => (
            <button
              className="buyer-link-btn"
              key={action}
              type="button"
              onClick={() => {
                if (action === "发票详情") {
                  handleOpenInvoiceDetail(item.orderNo);
                }
                if (action === "历史操作") {
                  handleOpenInvoiceHistory(item.orderNo);
                }
                if (action === "确认开票") {
                  handleOpenConfirmInvoiceModal([item.orderNo], "single");
                }
                if (action === "查看原因") {
                  setShopInvoiceNotice(`驳回原因：${item.rejectReason || "平台审核未通过，请核对开票信息后重试。"}`);
                }
                if (action === "修改发票") {
                  handleOpenModifyInvoiceModal([item.orderNo], "single");
                }
                if (action === "驳回") {
                  handleRejectInvoice(item.orderNo);
                }
              }}
            >
              {action}
            </button>
          ))}
        </div>
      );
    }

    return column.renderCell(item);
  };

  return (
    <div className="shop-invoice-page">
      {shopInvoiceNotice ? <div className="page-toast">{shopInvoiceNotice}</div> : null}
      {activeShopTab === "发票管理" ? (
        <section className="content-card shop-invoice-tabs-card">
          <div className="shop-invoice-tabs-row">
            <div className="shop-invoice-tabs">
              {shopInvoiceStatusTabs.map((status) => (
                <button
                  key={status}
                  className={`shop-invoice-tab ${activeInvoiceStatusTab === status ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleChangeInvoiceStatusTab(status)}
                >
                  <span>{status}</span>
                  {!["全部", "已开票", "发票设置"].includes(status) ? <em className="shop-invoice-tab-badge">{invoiceStatusTabCounts[status] || 0}</em> : null}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeShopTab === "发票管理" && activeInvoiceStatusTab === "发票设置" ? (
        <section className="content-card shop-invoice-settings-page">
          <div className="shop-invoice-settings-body">
            <div className="shop-invoice-settings-tip">
              <span className="shop-invoice-settings-tip-icon" aria-hidden="true">!</span>
              <div>
                <strong>温馨提示：</strong>
                <p>应平台合规要求，发票税点需包含在商品价格中。</p>
              </div>
            </div>

            <div className="shop-invoice-settings-form">
              <div className="shop-invoice-settings-row">
                <span className="shop-invoice-settings-label">发票类型:</span>
                <label className="shop-invoice-settings-option">
                  <input
                    type="checkbox"
                    checked={shopInvoiceSettingTypes.includes("电子普通发票")}
                    onChange={() => handleToggleInvoiceSettingType("电子普通发票")}
                  />
                  <span>电子普通发票</span>
                </label>
                <label className="shop-invoice-settings-option">
                  <input
                    type="checkbox"
                    checked={shopInvoiceSettingTypes.includes("电子增值税专用发票")}
                    onChange={() => handleToggleInvoiceSettingType("电子增值税专用发票")}
                  />
                  <span>电子增值税专用发票</span>
                </label>
              </div>
              <p className="shop-invoice-settings-note">勾选后，将在PC商城、小程序买家下单时及之后展示索取“发票”的通道</p>
              <div className="shop-invoice-settings-actions">
                <button className="btn btn-dark shop-invoice-settings-save" type="button" onClick={handleSaveInvoiceSettings}>保存</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeInvoiceDetail && activeShopTab === "发票信息" ? (
        <>
          <section className="content-card shop-invoice-detail-card">
            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title">
                <span>发票详情</span>
                <button className="shop-invoice-detail-return" type="button" onClick={handleCloseInvoiceDetail}>← 返回</button>
              </div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>开票状态</span><strong className="shop-invoice-status-detail"><span className={`shop-invoice-mini-tag is-${activeInvoiceDetail.invoiceInfo.invoiceStatusTone || "dark"}`}>{activeInvoiceDetail.invoiceInfo.invoiceStatus}</span>{activeInvoiceDetail.invoiceInfo.statusExtraText ? <span className="shop-invoice-status-extra">{activeInvoiceDetail.invoiceInfo.statusExtraText}</span> : null}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票类型</span><strong className="shop-invoice-status-detail">{activeInvoiceDetail.invoiceInfo.invoiceType}{activeInvoiceDetail.invoiceInfo.invoiceTypeExtraText ? <span className="shop-invoice-detail-alert">{activeInvoiceDetail.invoiceInfo.invoiceTypeExtraText}</span> : null}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>申请时间</span><strong>{activeInvoiceDetail.invoiceInfo.appliedAt}</strong></div>
                <div className="shop-invoice-detail-info-row">
                  <span>发票号码</span>
                  <strong className="shop-invoice-detail-inline-actions">
                    <span>{activeInvoiceDetail.invoiceInfo.invoiceNo}</span>
                    {activeInvoiceDetail.invoiceInfo.canPreviewPdf ? (
                      <>
                        <button className="shop-invoice-preview-link" type="button" onClick={() => handlePreviewInvoicePdf(activeInvoiceDetail, "preview")}>预览发票</button>
                        <button className="shop-invoice-preview-link" type="button" onClick={() => handlePreviewInvoicePdf(activeInvoiceDetail, "download")}>下载发票</button>
                      </>
                    ) : null}
                  </strong>
                </div>
                <div className="shop-invoice-detail-info-row"><span>开票金额(含税)</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceAmountWithTax}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票金额(不含税)</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceAmountWithoutTax}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票时间</span><strong>{activeInvoiceDetail.invoiceInfo.invoicedAt}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>抬头信息</span></div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>发票抬头</span><strong className="shop-invoice-status-detail">{activeInvoiceDetail.titleInfo.invoiceTitle}{activeInvoiceDetail.titleInfo.invoiceTitleExtraText ? <span className="shop-invoice-detail-alert">{activeInvoiceDetail.titleInfo.invoiceTitleExtraText}</span> : null}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>纳税人识别号</span><strong>{activeInvoiceDetail.titleInfo.taxpayerId}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>企业地址</span><strong>{activeInvoiceDetail.titleInfo.registerAddress}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>企业电话</span><strong>{activeInvoiceDetail.titleInfo.registerPhone}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开户银行名称</span><strong>{activeInvoiceDetail.titleInfo.bankName}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开户银行账号</span><strong>{activeInvoiceDetail.titleInfo.bankAccount}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>收票信息</span></div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>收票人手机</span><strong>{activeInvoiceDetail.receiverInfo.receiverPhone}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>收票人邮箱</span><strong>{activeInvoiceDetail.receiverInfo.receiverEmail}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>订单信息</span></div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>订单状态</span><strong>{activeInvoiceDetail.orderInfo.orderStatus}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>订单编号</span><strong className="is-link">{activeInvoiceDetail.orderInfo.orderNo}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>支付时间</span><strong>{activeInvoiceDetail.orderInfo.paidAt}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>买家账号</span><strong>{activeInvoiceDetail.orderInfo.buyerAccount}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>闪购门店</span><strong>{activeInvoiceDetail.orderInfo.storeName}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>商品清单</span></div>
              <div className="shop-invoice-detail-table-wrap">
                <table className="shop-invoice-detail-table">
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>规格货号</th>
                      <th>单价（元）</th>
                      <th>购买数量</th>
                      <th>小计（元）</th>
                      <th>售后状态</th>
                      <th>申请售后数量</th>
                      <th>实际售后数量</th>
                      <th>
                        <span className="shop-invoice-detail-header-with-tip">
                          <span>售后金额</span>
                          <span className="shop-invoice-summary-tip">
                            <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                            <span className="shop-invoice-summary-tooltip">售后金额 = 售后中金额 + 已退款金额</span>
                          </span>
                        </span>
                      </th>
                      <th>已发数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoiceDetail.items.map((detailItem) => (
                      <tr key={`${activeInvoiceDetail.orderInfo.orderNo}-${detailItem.spec}`}>
                        <td>{detailItem.product}</td>
                        <td>{detailItem.spec}</td>
                        <td>{detailItem.unitPrice}</td>
                        <td>{detailItem.quantity}</td>
                        <td>{detailItem.subtotal}</td>
                        <td className={detailItem.afterSaleStatus !== "-" ? "is-accent" : ""}>{detailItem.afterSaleStatus}</td>
                        <td>{detailItem.afterSaleCount}</td>
                        <td>{detailItem.actualAfterSaleCount}</td>
                        <td>{detailItem.afterSaleAmount}</td>
                        <td>{detailItem.shippedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="shop-invoice-detail-remark">买家留言：{activeInvoiceDetail.remark}</div>
              <div className="shop-invoice-detail-summary">
                <div className="shop-invoice-detail-summary-row"><span>{activeInvoiceDetail.summary.itemCount}</span><strong>{activeInvoiceDetail.summary.goodsAmount}</strong></div>
                <div className="shop-invoice-detail-summary-row"><span>运费：</span><strong>{activeInvoiceDetail.summary.shippingFee}</strong></div>
                <div className="shop-invoice-detail-summary-row"><span>税费：</span><strong>{activeInvoiceDetail.summary.taxFee}</strong></div>
                <div className="shop-invoice-detail-summary-row"><span>订单总额：</span><strong className="is-accent">{activeInvoiceDetail.summary.orderAmount}</strong></div>
                <div className="shop-invoice-detail-summary-row"><span>售后金额总计：</span><strong className="is-accent">{activeInvoiceDetail.summary.afterSaleAmount}</strong></div>
                <div className="shop-invoice-detail-summary-row"><span>申请开票金额：</span><strong className="is-accent">{activeInvoiceDetail.summary.applyInvoiceAmount}</strong></div>
                <div className="shop-invoice-detail-summary-row">
                  <span className="shop-invoice-detail-label-with-tip">
                    <span className="shop-invoice-summary-tip">
                      <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                      <span className="shop-invoice-summary-tooltip">发票应开金额 = 订单总额 - 售后金额总计</span>
                    </span>
                    <span>发票应开金额：</span>
                  </span>
                  <strong className="is-accent">{activeInvoiceDetail.summary.shouldInvoiceAmount}</strong>
                </div>
              </div>
            </div>
          </section>
          <div className="shop-invoice-issued-actions">
            <div className="shop-invoice-issued-note">
              <span className="shop-invoice-issued-note-label">
                <span className="shop-invoice-issued-note-icon" aria-hidden="true">!</span>
                <span>开票备注：</span>
              </span>
              <span className="shop-invoice-issued-note-text">{activeInvoiceDetail.invoiceRemark}</span>
            </div>
            <div className="shop-invoice-issued-buttons">
              <button className="btn btn-reset" type="button" onClick={handleCloseInvoiceDetail}>返回</button>
              {activeInvoiceDetail.invoiceInfo.invoiceStatus === "已开票" ? <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal([activeInvoiceDetail.orderInfo.orderNo], "single")}>修改发票</button> : null}
              {activeInvoiceDetail.invoiceInfo.invoiceStatus === "待开票" ? <button className="btn btn-dark" type="button" onClick={() => handleOpenConfirmInvoiceModal([activeInvoiceDetail.orderInfo.orderNo], "single")}>确认开票</button> : null}
              {activeInvoiceDetail.invoiceInfo.invoiceStatus === "待开票" ? <button className="btn btn-dark" type="button" onClick={() => handleRejectInvoice(activeInvoiceDetail.orderInfo.orderNo)}>驳回</button> : null}
            </div>
          </div>
        </>
      ) : activeInvoiceHistory && activeShopTab === "历史操作" ? (
        <>
          <section className="content-card shop-invoice-detail-card">
            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title">
                <span>历史操作</span>
                <button className="shop-invoice-detail-return" type="button" onClick={handleCloseInvoiceHistory}>← 返回</button>
              </div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>订单编号</span><strong className="is-link">{activeInvoiceHistory.orderNo}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票状态</span><strong>{activeInvoiceHistory.invoiceStatus}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票类型</span><strong>{activeInvoiceHistory.invoiceType}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票抬头</span><strong>{activeInvoiceHistory.invoiceTitle}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>操作记录</span></div>
              <div className="shop-invoice-history-list">
                {sortShopInvoiceHistoryRecords(activeInvoiceHistory.historyRecords).map((record, index) => (
                  <div className="shop-invoice-history-item" key={record.key || `${record.label}-${record.time}`}>
                    <div className="shop-invoice-history-axis" aria-hidden="true">
                      <span className={`shop-invoice-history-dot ${index === 0 ? "is-latest" : ""}`} />
                      {index < activeInvoiceHistory.historyRecords.length - 1 ? <span className="shop-invoice-history-line" /> : null}
                    </div>
                    <div className="shop-invoice-history-card">
                      <div className="shop-invoice-history-head">
                        <strong>{record.label}</strong>
                        <span>{record.time || "-"}</span>
                      </div>
                      {record.type === "apply" ? (
                        <p className="shop-invoice-history-text">
                          <span>提交开票申请，申请金额 {record.amount || "-" }。</span>
                          <span className="shop-invoice-history-batch-meta">
                            <span>开票批次：</span>
                            <button
                              className="shop-invoice-history-link"
                              type="button"
                              onClick={() => handleSearchInvoiceBatchFromHistory(record.invoiceBatch)}
                            >
                              {record.invoiceBatch ? `${record.invoiceBatch}（点击查看）` : "-"}
                            </button>
                            <span>，该开票批次共 {activeInvoiceBatchOrderCount} 笔订单</span>
                          </span>
                        </p>
                      ) : record.description ? <p>{record.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className="shop-invoice-issued-actions">
            <div className="shop-invoice-issued-note">
              <span className="shop-invoice-issued-note-label">
                <span className="shop-invoice-issued-note-icon" aria-hidden="true">!</span>
                <span>展示规则：</span>
              </span>
              <span className="shop-invoice-issued-note-text">按操作时间倒序展示，最近一次操作显示在最上方。</span>
            </div>
            <div className="shop-invoice-issued-buttons">
              <button className="btn btn-reset" type="button" onClick={handleCloseInvoiceHistory}>返回</button>
            </div>
          </div>
        </>
      ) : activeOrderDetail && activeShopTab === "订单信息" ? (
        <section className="content-card shop-invoice-detail-card">
          <div className="shop-invoice-detail-section">
            <div className="shop-invoice-detail-title">
              <span>订单信息</span>
              <button className="shop-invoice-detail-return" type="button" onClick={handleCloseOrderDetail}>← 返回</button>
            </div>
            <div className="shop-invoice-detail-info-grid">
              <div className="shop-invoice-detail-info-row"><span>订单状态</span><strong>{activeOrderDetail.orderStatusText}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>订单编号</span><strong className="is-link">{activeOrderDetail.orderNo}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>售后状态</span><strong className="is-accent">{activeOrderDetail.afterSaleStatusText}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>收货人信息</span><strong>{activeOrderDetail.receiverInfo}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>收货地址</span><strong>{activeOrderDetail.address}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>支付时间</span><strong>{activeOrderDetail.paidAt}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>买家账号</span><strong>{activeOrderDetail.buyerAccount}</strong></div>
              <div className="shop-invoice-detail-info-row"><span>闪购门店</span><strong>{activeOrderDetail.storeName}（{activeOrderDetail.storeId}）</strong></div>
            </div>
          </div>

          <div className="shop-invoice-detail-section">
            <div className="shop-invoice-detail-title">商品清单</div>
            <div className="shop-invoice-detail-table-wrap">
              <table className="shop-invoice-detail-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>规格货号</th>
                    <th>单价（元）</th>
                    <th>购买数量</th>
                    <th>小计（元）</th>
                    <th>售后状态</th>
                    <th>申请售后数量</th>
                    <th>实际售后数量</th>
                    <th>售后金额</th>
                    <th>已发数量</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrderDetail.items.map((detailItem) => (
                    <tr key={`${activeOrderDetail.orderNo}-${detailItem.spec}`}>
                      <td>{detailItem.product}</td>
                      <td>{detailItem.spec}</td>
                      <td>{detailItem.unitPrice}</td>
                      <td>{detailItem.quantity}</td>
                      <td>{detailItem.subtotal}</td>
                      <td className={detailItem.afterSaleStatus !== "-" ? "is-accent" : ""}>{detailItem.afterSaleStatus}</td>
                      <td>{detailItem.afterSaleCount}</td>
                      <td>{detailItem.actualAfterSaleCount}</td>
                      <td>{detailItem.afterSaleAmount}</td>
                      <td>{detailItem.shippedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shop-invoice-detail-remark">买家留言：{activeOrderDetail.remark}</div>
            <div className="shop-invoice-detail-summary">
              <div className="shop-invoice-detail-summary-row">
                <span>{activeOrderDetail.summary.itemCount}</span>
                <strong>{activeOrderDetail.summary.goodsAmount}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>运费：</span>
                <strong>{activeOrderDetail.summary.shippingFee}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>税费：</span>
                <strong>{activeOrderDetail.summary.taxFee}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>订单总额：</span>
                <strong className="is-accent">{activeOrderDetail.summary.orderAmount}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>售后金额总计：</span>
                <strong className="is-accent">{activeOrderDetail.summary.afterSaleAmount}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>申请开票金额：</span>
                <strong className="is-accent">{activeOrderDetail.summary.applyInvoiceAmount}</strong>
              </div>
              <div className="shop-invoice-detail-summary-row">
                <span>发票应开金额：</span>
                <strong className="is-accent">{activeOrderDetail.summary.shouldInvoiceAmount}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : activeInvoiceStatusTab !== "发票设置" ? (
        <>

      <section className="content-card shop-invoice-filter-card">
        <div className="shop-invoice-filter-grid">
          <label className="shop-invoice-field">
            <span>订单号</span>
            <div className="shop-invoice-input-wrap has-clear">
              <input value={draftFilters.orderNo} onChange={(e) => handleDraftFilterChange("orderNo", e.target.value)} />
              {draftFilters.orderNo ? <button className="shop-invoice-clear" type="button" onClick={() => handleDraftFilterChange("orderNo", "")}>×</button> : null}
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>发票类型</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.invoiceType} onChange={(e) => handleDraftFilterChange("invoiceType", e.target.value)}>
                <option>全部</option>
                <option>电子增值税专用发票</option>
                <option>电子普通发票</option>
              </select>
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>申请时间</span>
            <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" value={draftFilters.appliedAtRange} onChange={(value) => handleDraftFilterChange("appliedAtRange", value)} />
          </label>
          <label className="shop-invoice-field">
            <span>付款方式</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.paymentMethod} onChange={(e) => handleDraftFilterChange("paymentMethod", e.target.value)}>
                {shopInvoicePaymentMethodOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>发票内容</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.invoiceContent} onChange={(e) => handleDraftFilterChange("invoiceContent", e.target.value)}>
                <option>全部</option>
                <option>商品类别</option>
                <option>商品明细</option>
              </select>
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>订单状态</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.orderStatus} onChange={(e) => handleDraftFilterChange("orderStatus", e.target.value)}>
                <option>全部</option>
                <option>待发货</option>
                <option>待收货</option>
                <option>已完成</option>
              </select>
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>支付时间</span>
            <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" value={draftFilters.paidAtRange} onChange={(value) => handleDraftFilterChange("paidAtRange", value)} />
          </label>
          <label className="shop-invoice-field">
            <span>售后状态</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.afterSaleStatus} onChange={(e) => handleDraftFilterChange("afterSaleStatus", e.target.value)}>
                <option>全部</option>
                {shopInvoiceAfterSaleStatusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="shop-invoice-field shop-invoice-field-wide-label">
            <span>是否单独开票</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.singleInvoice} onChange={(e) => handleDraftFilterChange("singleInvoice", e.target.value)}>
                <option>全部</option>
                <option>是</option>
                <option>否</option>
              </select>
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>开票时间</span>
            <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" value={draftFilters.invoicedAtRange} onChange={(value) => handleDraftFilterChange("invoicedAtRange", value)} />
          </label>
          <label className="shop-invoice-field">
            <span>发票号码</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入发票号码" value={draftFilters.invoiceNo} onChange={(e) => handleDraftFilterChange("invoiceNo", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>发票抬头</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入发票抬头" value={draftFilters.invoiceTitle} onChange={(e) => handleDraftFilterChange("invoiceTitle", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field shop-invoice-field-taxpayer-id shop-invoice-field-wide-label">
            <span>纳税人识别号</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入纳税人识别号" value={draftFilters.taxpayerId} onChange={(e) => handleDraftFilterChange("taxpayerId", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>买家账号</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入买家账号" value={draftFilters.buyerAccount} onChange={(e) => handleDraftFilterChange("buyerAccount", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>闪购门店</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入闪购门店名称/闪购门店ID，支持全模糊查询" value={draftFilters.store} onChange={(e) => handleDraftFilterChange("store", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field">
            <span>开票批次</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入开票批次" value={draftFilters.invoiceBatch} onChange={(e) => handleDraftFilterChange("invoiceBatch", e.target.value)} />
            </div>
          </label>
          <div className="shop-invoice-filter-actions">
            <button className="shop-invoice-collapse" type="button">收起 ^</button>
            <button className="btn btn-reset" type="button" onClick={handleResetFilters}>重置</button>
            <button className="btn btn-dark" type="button" onClick={handleSearch}>查询</button>
          </div>
        </div>
      </section>

      <section className="content-card shop-invoice-table-card">
        <div className="shop-invoice-toolbar">
          <div className="shop-invoice-toolbar-left">
            {showConfirmBatchToolbar ? (
              <>
                <button className="btn btn-dark" type="button" onClick={() => handleOpenConfirmInvoiceModal()}>批量开票</button>
                {showPendingModifyBatchAction ? <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal(selectedShopInvoiceOrderNos)}>批量修改开票</button> : null}
                {showBatchRejectAction ? <button className="btn btn-dark" type="button" onClick={() => handleOpenRejectInvoiceModal()}>批量驳回</button> : null}
                <div className="shop-invoice-toolbar-summary">
                  <>已选中 {selectedConfirmRows.length} 笔待开票订单，发票应开金额合计：<strong>{formatMoneyDisplay(confirmInvoiceSummary.shouldInvoiceAmount)}</strong></>
                </div>
              </>
            ) : null}
            {showModifyBatchToolbar ? (
              <>
                <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal(selectedModifyInvoiceOrderNos)}>批量修改开票</button>
                <div className="shop-invoice-toolbar-summary">
                  <>已选中 {selectedModifyRows.length} 笔已开票订单，发票应开金额合计：<strong>{formatMoneyDisplay(modifyInvoiceSummary.shouldInvoiceAmount)}</strong></>
                </div>
              </>
            ) : null}
          </div>
          <div className="shop-invoice-toolbar-right">
            <label className="shop-invoice-field shop-invoice-marker-filter">
              <span>标识筛选</span>
              <div className="shop-invoice-select-wrap">
                <select value={markerFilter} onChange={(e) => setMarkerFilter(e.target.value)}>
                  {shopInvoiceMarkerFilterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </label>
            <button className="btn btn-reset buyer-export-btn" type="button">导出查询结果</button>
            <div className={`shop-invoice-column-settings ${isColumnSettingOpen ? "is-open" : ""}`}>
              <button className="shop-invoice-column-trigger" ref={columnTriggerRef} type="button" onClick={() => setIsColumnSettingOpen((current) => !current)}>
                列设置
              </button>
              {isColumnSettingOpen ? (
                <div
                  className="shop-invoice-column-popover"
                  style={{
                    top: `${columnPopoverPosition.top}px`,
                    right: `${columnPopoverPosition.right}px`,
                    maxHeight: `${columnPopoverPosition.maxHeight}px`
                  }}
                >
                  <div className="shop-invoice-column-popover-head">
                    <strong>列设置</strong>
                    <div className="shop-invoice-column-head-actions">
                      <span>拖拽字段到不同区域可调整顺序与冻结</span>
                      <button className="shop-invoice-column-reset" type="button" onClick={handleResetColumnSettings}>重置</button>
                    </div>
                  </div>
                  <div className="shop-invoice-column-zones" style={{ maxHeight: `${columnPopoverPosition.zoneMaxHeight}px` }}>
                    {[
                      { key: "left", columns: leftZoneColumns },
                      { key: "none", columns: middleZoneColumns },
                      { key: "right", columns: rightZoneColumns }
                    ].map((zone) => (
                      <div className="shop-invoice-column-zone" key={zone.key} onDragOver={(e) => e.preventDefault()} onDrop={() => handleColumnDrop(zone.key)}>
                        <div className={`shop-invoice-column-list is-${zone.key}`}>
                          {zone.columns.map((column, index) => {
                            const pref = shopInvoiceColumnPrefs[column.key];
                            return (
                              <div
                                className={`shop-invoice-column-item ${draggingColumnKey === column.key ? "is-dragging" : ""}`}
                                key={column.key}
                                draggable
                                onDragStart={() => handleColumnDragStart(column.key)}
                                onDragEnd={() => setDraggingColumnKey("")}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  handleColumnDrop(zone.key, index);
                                }}
                              >
                                <button className="shop-invoice-drag-handle" type="button" aria-label={`拖拽${column.label}`}>⋮⋮</button>
                                <span>{column.label}</span>
                                <label>
                                  <input type="checkbox" checked={pref?.visible !== false} disabled={column.alwaysVisible} onChange={() => handleToggleColumnVisible(column.key)} />
                                  显示
                                </label>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={pref?.freeze !== "none"}
                                    disabled={column.key === "actions"}
                                    onChange={() => handleToggleColumnFrozen(column.key)}
                                  />
                                  冻结
                                </label>
                              </div>
                            );
                          })}
                          {zone.columns.length === 0 ? <div className="shop-invoice-column-empty">拖拽字段到这里</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shop-invoice-table-shell">
          <div className="shop-invoice-table-scroll">
            <table className={`shop-invoice-table ${showSelectableCheckboxes ? "" : "is-no-select"}`} style={{ minWidth: `${Math.max(tableMinWidth, 1320)}px` }}>
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th className={getColumnClassName(column, "header")} key={column.key} style={getColumnStyle(column)}>
                      {column.key === "select"
                        ? showSelectableCheckboxes
                          ? <input type="checkbox" checked={allSelectableInvoiceRowsSelected} onChange={(e) => handleToggleAllSelectableRows(e.target.checked)} />
                          : null
                        : column.key === "afterSaleStatus"
                          ? (
                            <span className="shop-invoice-header-with-tip">
                              <span>售后状态</span>
                              <span
                                className="shop-invoice-summary-tip shop-invoice-header-tip"
                                onMouseEnter={handleShowAfterSaleHeaderTooltip}
                                onMouseLeave={handleHideAfterSaleHeaderTooltip}
                              >
                                <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                              </span>
                            </span>
                          )
                        : column.renderHeader ? column.renderHeader() : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((item) => (
                  <tr key={item.orderNo}>
                    {visibleColumns.map((column) => (
                      <td className={getColumnClassName(column, "cell")} key={column.key} style={getColumnStyle(column)}>
                        {renderInvoiceTableCell(item, column)}
                      </td>
                    ))}
                  </tr>
                ))}
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} style={{ textAlign: "center", color: "#8b94a3", padding: "40px 12px" }}>
                      暂无匹配的发票记录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {afterSaleHeaderTooltip ? (
          <div
            className="shop-invoice-fixed-tooltip"
            style={{
              left: `${afterSaleHeaderTooltip.left}px`,
              top: `${afterSaleHeaderTooltip.top}px`
            }}
          >
            {shopInvoiceAfterSaleStatusTooltip}
          </div>
        ) : null}
        {orderMarkerTooltip ? (
          <div
            ref={orderMarkerTooltipRef}
            className="shop-invoice-fixed-tooltip"
            style={{
              left: `${orderMarkerTooltip.left}px`,
              top: `${orderMarkerTooltip.top}px`
            }}
          >
            {orderMarkerTooltip.content}
          </div>
        ) : null}

        <div className="buyer-pagination">
          <span>共{filteredRows.length}条发票记录</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={20}>20 条/页</option>
            <option value={50}>50 条/页</option>
            <option value={100}>100 条/页</option>
          </select>
          <button className="page-btn" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          <button className="page-btn is-current" type="button">{currentPage}</button>
          <button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button>
          <span>到第</span>
          <input className="page-input" placeholder="请输入" />
          <span>页</span>
          <button className="btn btn-jump" type="button">跳转</button>
        </div>
      </section>
        </>
      ) : null}

      {isConfirmInvoiceModalOpen ? (
        <div className="shop-invoice-modal-mask" onClick={handleCloseConfirmInvoiceModal}>
          <div className="shop-invoice-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shop-invoice-confirm-head">
              <div className="shop-invoice-confirm-headline">
                <h3>{confirmInvoiceModalMode === "single" ? "确认开票" : "批量开票"}</h3>
                {confirmInvoiceModalMode === "batch" ? <span className="shop-invoice-confirm-selected">已选中{confirmInvoiceSummary.count}条数据</span> : null}
              </div>
              {confirmInvoiceModalMode === "batch" ? (
                <div className="shop-invoice-batch-tip">
                  <span className="shop-invoice-batch-tip-icon">!</span>
                  <span>{confirmBatchNotice}</span>
                </div>
              ) : null}
            </div>
            <div className="shop-invoice-confirm-body">
              <section className="shop-invoice-confirm-summary">
                <div className="shop-invoice-confirm-summary-grid">
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票类型:</span>
                    <strong>{confirmInvoiceSummary.invoiceType}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票抬头:</span>
                    <strong>{confirmInvoiceSummary.invoiceTitle}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票内容:</span>
                    <span className="shop-invoice-summary-value is-text-row">
                      <strong>{confirmInvoiceContent}</strong>
                      {confirmInvoiceContent === "商品明细" ? (
                        <button className="shop-invoice-content-download" type="button" onClick={handleDownloadConfirmInvoiceContent}>下载内容</button>
                      ) : null}
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">订单总额:</span>
                    <strong>{formatMoneyDisplay(confirmInvoiceSummary.orderAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">
                      售后金额总计
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">售后金额总计 = 售后中金额 + 已退款金额</span>
                      </span>
                      :
                    </span>
                    <span className="shop-invoice-summary-value">
                      <strong>{formatMoneyDisplay(confirmInvoiceSummary.afterSaleAmount)}</strong>
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">申请开票金额:</span>
                    <strong>{formatMoneyDisplay(confirmInvoiceSummary.applyAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">
                      发票应开金额
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">发票应开金额 = 订单总额 - 售后金额总计</span>
                      </span>
                      :
                    </span>
                    <span className="shop-invoice-summary-value">
                      <strong className="is-highlight">{formatMoneyDisplay(confirmInvoiceSummary.shouldInvoiceAmount)}</strong>
                    </span>
                  </div>
                </div>
              </section>

              <section className="shop-invoice-confirm-section">
                <h4>附件上传</h4>
                <div className="shop-invoice-confirm-field is-upload">
                  <span><i>*</i>发票附件:</span>
                  <div className="shop-invoice-upload-box">
                    <input className="shop-invoice-file-input" ref={confirmInvoiceFileInputRef} type="file" accept=".pdf" onChange={handleConfirmInvoiceFileChange} />
                    <button className={`shop-invoice-upload-btn ${confirmInvoiceErrors.attachmentName ? "is-error" : ""}`} type="button" onClick={() => confirmInvoiceFileInputRef.current?.click()}>
                      ⤴ 选择文件
                    </button>
                    {confirmInvoiceForm.attachmentName ? <div className="shop-invoice-upload-name">{confirmInvoiceForm.attachmentName}</div> : null}
                    <p>支持pdf格式，大小不超过5M，最多上传1份</p>
                  </div>
                </div>
              </section>

              <section className="shop-invoice-confirm-section">
                <h4>发票信息</h4>
                <div className="shop-invoice-confirm-form">
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>发票号码:</span>
                    <input className={confirmInvoiceErrors.invoiceNo ? "is-error" : ""} placeholder="请输入发票号码" value={confirmInvoiceForm.invoiceNo} onChange={(e) => handleConfirmInvoiceFieldChange("invoiceNo", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>开票金额(含税):</span>
                    <input className={confirmInvoiceErrors.invoiceAmountWithTax ? "is-error" : ""} placeholder="请输入开票金额(含税)" value={confirmInvoiceForm.invoiceAmountWithTax} onChange={(e) => handleConfirmInvoiceFieldChange("invoiceAmountWithTax", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span>开票金额(不含税):</span>
                    <input className={confirmInvoiceErrors.invoiceAmountWithoutTax ? "is-error" : ""} placeholder="请输入开票金额(不含税)" value={confirmInvoiceForm.invoiceAmountWithoutTax} onChange={(e) => handleConfirmInvoiceFieldChange("invoiceAmountWithoutTax", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>开票时间:</span>
                    <div
                      className={`shop-invoice-date-trigger ${confirmInvoiceErrors.invoicedDate ? "is-error" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={handleOpenConfirmInvoiceDatePicker}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenConfirmInvoiceDatePicker();
                        }
                      }}
                    >
                      <span className={confirmInvoiceForm.invoicedDate ? "has-value" : "is-placeholder"}>
                        {confirmInvoiceForm.invoicedDate || "请选择开票时间"}
                      </span>
                      <input
                        ref={confirmInvoiceDateInputRef}
                        className="shop-invoice-date-native-input"
                        type="date"
                        value={confirmInvoiceForm.invoicedDate}
                        onChange={(e) => handleConfirmInvoiceFieldChange("invoicedDate", e.target.value)}
                        aria-label="请选择开票时间"
                      />
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <div className="shop-invoice-confirm-foot">
              <button className="btn btn-reset" type="button" onClick={handleCloseConfirmInvoiceModal}>取消</button>
              <button className="btn btn-dark" type="button" onClick={handleSubmitConfirmInvoice}>提交</button>
            </div>
          </div>
        </div>
      ) : null}

      {isRejectInvoiceModalOpen ? (
        <div className="shop-invoice-modal-mask" onClick={handleCloseRejectInvoiceModal}>
          <div className="shop-invoice-confirm-modal shop-invoice-reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shop-invoice-confirm-head shop-invoice-reject-head">
              <h3>{rejectInvoiceModalMode === "single" ? "驳回" : "批量驳回"}</h3>
              <button className="shop-invoice-reject-close" type="button" onClick={handleCloseRejectInvoiceModal} aria-label="关闭">
                ×
              </button>
            </div>
            <div className="shop-invoice-confirm-body shop-invoice-reject-body">
              <div className="shop-invoice-reject-tip">
                温馨提示：建议先与买家沟通并达成一致后，再操作驳回
              </div>
              <label className="shop-invoice-confirm-field shop-invoice-reject-field">
                <span><i>*</i>驳回原因：</span>
                <div className="shop-invoice-reject-input-wrap">
                  <textarea
                    className={rejectInvoiceErrors.rejectReason ? "is-error" : ""}
                    maxLength={100}
                    placeholder="请输入驳回原因"
                    value={rejectInvoiceForm.rejectReason}
                    onChange={(e) => handleRejectInvoiceFieldChange(e.target.value)}
                  />
                  <div className="shop-invoice-reject-count">{rejectInvoiceForm.rejectReason.trim().length} / 100</div>
                </div>
              </label>
            </div>

            <div className="shop-invoice-confirm-foot shop-invoice-reject-foot">
              <button className="btn btn-reset" type="button" onClick={handleCloseRejectInvoiceModal}>取消</button>
              <button className="btn btn-dark" type="button" onClick={handleSubmitRejectInvoice}>确定</button>
            </div>
          </div>
        </div>
      ) : null}

      {isModifyInvoiceModalOpen ? (
        <div className="shop-invoice-modal-mask" onClick={handleCloseModifyInvoiceModal}>
          <div className="shop-invoice-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shop-invoice-confirm-head">
              <div className="shop-invoice-confirm-headline">
                <h3>{modifyInvoiceModalMode === "single" ? "修改发票" : "批量修改开票"}</h3>
                {modifyInvoiceModalMode === "batch" ? <span className="shop-invoice-confirm-selected">已选中{modifyInvoiceSummary.count}条数据</span> : null}
              </div>
              {modifyInvoiceModalMode === "batch" ? (
                <div className="shop-invoice-batch-tip">
                  <span className="shop-invoice-batch-tip-icon">!</span>
                  <span>{modifyBatchNotice}</span>
                </div>
              ) : null}
            </div>
            <div className="shop-invoice-confirm-body">
              <section className="shop-invoice-confirm-summary">
                <div className="shop-invoice-confirm-summary-grid">
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票类型:</span>
                    <strong>{modifyInvoiceSummary.invoiceType}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票抬头:</span>
                    <strong>{modifyInvoiceSummary.invoiceTitle}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">发票内容:</span>
                    <span className="shop-invoice-summary-value is-text-row">
                      <strong>{modifyInvoiceContent}</strong>
                      {modifyInvoiceContent === "商品明细" ? (
                        <button className="shop-invoice-content-download" type="button" onClick={handleDownloadModifyInvoiceContent}>下载内容</button>
                      ) : null}
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">订单总额:</span>
                    <strong>{formatMoneyDisplay(modifyInvoiceSummary.orderAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">
                      售后金额总计
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">售后金额总计 = 售后中金额 + 已退款金额</span>
                      </span>
                      :
                    </span>
                    <span className="shop-invoice-summary-value">
                      <strong>{formatMoneyDisplay(modifyInvoiceSummary.afterSaleAmount)}</strong>
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">申请开票金额:</span>
                    <strong>{formatMoneyDisplay(modifyInvoiceSummary.applyAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span className="shop-invoice-confirm-summary-label">
                      发票应开金额
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">发票应开金额 = 订单总额 - 售后金额总计</span>
                      </span>
                      :
                    </span>
                    <span className="shop-invoice-summary-value">
                      <strong className="is-highlight">{formatMoneyDisplay(modifyInvoiceSummary.shouldInvoiceAmount)}</strong>
                    </span>
                  </div>
                </div>
              </section>

              <section className="shop-invoice-confirm-section">
                <h4>附件上传</h4>
                <div className="shop-invoice-confirm-field is-upload">
                  <span><i>*</i>发票附件:</span>
                  <div className="shop-invoice-upload-box">
                    <input className="shop-invoice-file-input" ref={modifyInvoiceFileInputRef} type="file" accept=".pdf" onChange={handleModifyInvoiceFileChange} />
                    <button className={`shop-invoice-upload-btn ${modifyInvoiceErrors.attachmentName ? "is-error" : ""}`} type="button" onClick={() => modifyInvoiceFileInputRef.current?.click()}>
                      ⤴ 选择文件
                    </button>
                    {modifyInvoiceForm.attachmentName ? <div className="shop-invoice-upload-name">{modifyInvoiceForm.attachmentName}</div> : null}
                    <p>支持pdf格式，大小不超过5M，最多上传1份</p>
                  </div>
                </div>
              </section>

              <section className="shop-invoice-confirm-section">
                <h4>发票信息</h4>
                <div className="shop-invoice-confirm-form">
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>发票号码:</span>
                    <input className={modifyInvoiceErrors.invoiceNo ? "is-error" : ""} placeholder="请输入发票号码" value={modifyInvoiceForm.invoiceNo} onChange={(e) => handleModifyInvoiceFieldChange("invoiceNo", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>开票金额(含税):</span>
                    <input className={modifyInvoiceErrors.invoiceAmountWithTax ? "is-error" : ""} placeholder="请输入开票金额(含税)" value={modifyInvoiceForm.invoiceAmountWithTax} onChange={(e) => handleModifyInvoiceFieldChange("invoiceAmountWithTax", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span>开票金额(不含税):</span>
                    <input className={modifyInvoiceErrors.invoiceAmountWithoutTax ? "is-error" : ""} placeholder="请输入开票金额(不含税)" value={modifyInvoiceForm.invoiceAmountWithoutTax} onChange={(e) => handleModifyInvoiceFieldChange("invoiceAmountWithoutTax", e.target.value)} />
                  </label>
                  <label className="shop-invoice-confirm-field">
                    <span><i>*</i>开票时间:</span>
                    <div
                      className={`shop-invoice-date-trigger ${modifyInvoiceErrors.invoicedDate ? "is-error" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={handleOpenModifyInvoiceDatePicker}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenModifyInvoiceDatePicker();
                        }
                      }}
                    >
                      <span className={modifyInvoiceForm.invoicedDate ? "has-value" : "is-placeholder"}>
                        {modifyInvoiceForm.invoicedDate || "请选择开票时间"}
                      </span>
                      <input
                        ref={modifyInvoiceDateInputRef}
                        className="shop-invoice-date-native-input"
                        type="date"
                        value={modifyInvoiceForm.invoicedDate}
                        onChange={(e) => handleModifyInvoiceFieldChange("invoicedDate", e.target.value)}
                        aria-label="请选择开票时间"
                      />
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <div className="shop-invoice-confirm-foot">
              <button className="btn btn-reset" type="button" onClick={handleCloseModifyInvoiceModal}>取消</button>
              <button className="btn btn-dark" type="button" onClick={handleSubmitModifyInvoice}>提交</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CreatePage({ pageName, form, isEditMode, onFormChange, onResetFilters, selectedProducts, selectedGoodsIds, productFieldEditModesByProduct, productFieldErrorsByProduct, onToggleProductFieldEditMode, onToggleGoodsSelection, onRemoveProduct, onBatchRemoveProducts, onBack, onOpenPicker, onOpenSpecPicker, onUpdateProductFlashPrice, onUpdateProductLimit, onUpdateProductActivityStock, onSave, modalOpen }) {
  const isSpecialPricePage = isAnySpecialPricePage(pageName);
  const showUnpricedFilter = pageName === "限时购1" || pageName === "限时购";
  const filteredProducts = useMemo(() => selectedProducts.filter((product) => {
    const productKeyword = form.productKeyword.trim();
    const productId = form.productId.trim();
    const hasUnpricedSpec = !hasUnifiedFlashPrice(product) && product.specs.some((spec) => spec.status === "active" && !String(spec.flashPrice || "").trim());

    if (productKeyword && !product.name.includes(productKeyword)) return false;
    if (productId && !product.id.includes(productId)) return false;
    if (showUnpricedFilter && form.onlyUnpricedProducts && !hasUnpricedSpec) return false;
    return true;
  }), [form.onlyUnpricedProducts, form.productId, form.productKeyword, selectedProducts, showUnpricedFilter]);

  const hasSelectedProducts = selectedProducts.length > 0;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((item) => selectedGoodsIds.includes(item.id));
  const showSelectionControls = !isEditMode;

  const selectedGoodsPanel = (
    <>
      <div className="goods-panel-head">已选商品列表 <span>({selectedProducts.length})</span></div>
      {hasSelectedProducts ? (
        <>
          <div className="goods-filter-bar">
            <label className="mini-field"><span>商品名称:</span><input value={form.productKeyword} onChange={(e) => onFormChange("productKeyword", e.target.value)} /></label>
            <label className="mini-field"><span>商品ID:</span><input value={form.productId} onChange={(e) => onFormChange("productId", e.target.value)} /></label>
            {showUnpricedFilter ? <label className="check-item goods-filter-check"><input type="checkbox" checked={form.onlyUnpricedProducts} onChange={(e) => onFormChange("onlyUnpricedProducts", e.target.checked)} /><span>筛选未配限时价商品</span></label> : null}
            <button className="btn btn-reset" type="button" onClick={onResetFilters}>重置</button>
            <button className="btn btn-search" type="button">搜索</button>
          </div>
          {showSelectionControls ? <div className="goods-toolbar"><button className="btn btn-reset" type="button" onClick={onBatchRemoveProducts}>批量删除</button></div> : null}
          <div className="goods-table-shell"><table className={`goods-table activity-goods-table ${isSpecialPricePage ? "special-price-goods-table" : ""} ${showSelectionControls ? "has-selection" : "no-selection"}`}><thead><tr>{showSelectionControls ? <th><input type="checkbox" checked={allFilteredSelected} onChange={(e) => onToggleGoodsSelection(e.target.checked ? filteredProducts.map((item) => item.id) : [])} /></th> : null}<th>商品</th><th>商城价</th>{!isSpecialPricePage ? <th>商品库存</th> : null}<th><EditableHeader label={isSpecialPricePage ? "专享价" : "限时价"} /></th><th><EditableHeader label={isSpecialPricePage ? "专享价生效件数" : "总限购数量"} suffixIcon={questionHeaderIcon} suffixTooltip={isSpecialPricePage ? "当前商品在每笔订单的购买量达到对应件数后，当前商品全部按专享价结算；\n未达到时，当前商品不享受专享价。" : "单个买家ID最多购买数量，0代表不做限制"} /></th>{!isSpecialPricePage ? <th><EditableHeader label="总活动库存" /></th> : null}<th>规格数量</th><th>操作</th></tr></thead><tbody>{filteredProducts.map((item) => {
            const productFieldEditModes = productFieldEditModesByProduct[item.id] || initialProductFieldEditModes;
            const productFieldErrors = productFieldErrorsByProduct[item.id] || {};
            const flashPriceLocked = hasSpecLevelFlashPrice(item) && !productFieldEditModes.flashPrice;
            const totalLimitLocked = hasSpecLevelLimitCount(item) && !productFieldEditModes.totalLimit;
            const activityStockLocked = hasSpecLevelActivityStock(item) && !productFieldEditModes.activityStock;
            const flashPriceDisplay = productFieldEditModes.flashPrice && hasSpecLevelFlashPrice(item) ? item.flashPrice : getProductFlashPriceDisplay(item);
            const totalLimitDisplay = getProductTotalLimitInputValue(item, isSpecialPricePage);
            const activityStockDisplay = hasSpecLevelActivityStock(item) ? getProductActivityStockDisplay(item) : item.activityStock;

            return (
              <tr key={item.id}>
                {showSelectionControls ? <td><input type="checkbox" checked={selectedGoodsIds.includes(item.id)} onChange={() => onToggleGoodsSelection(item.id)} /></td> : null}
                <td><div className="product-cell"><div className="product-image">{item.image}</div><div className="product-meta"><div className="product-name">{item.name}</div><div className="product-id">商品ID： {item.id}</div></div>{showSelectionControls ? <button className="delete-link" type="button" onClick={() => onRemoveProduct(item.id)}>删除商品</button> : null}</div></td>
                <td>{item.marketPrice}</td>
                {!isSpecialPricePage ? <td>{getProductStockDisplay(item)}</td> : null}
                <td><EditableCellInput label={isSpecialPricePage ? "专享价" : "限时价"} value={flashPriceDisplay} onChange={(e) => onUpdateProductFlashPrice(item.id, e.target.value)} placeholder="请输入" locked={flashPriceLocked} showEditWhenLocked={flashPriceLocked} isEditMode={productFieldEditModes.flashPrice} onToggleEdit={() => onToggleProductFieldEditMode(item.id, "flashPrice")} hasError={productFieldErrors.flashPrice} /></td>
                <td><EditableCellInput label={isSpecialPricePage ? "专享价生效件数" : "总限购数量"} value={totalLimitDisplay} onChange={(e) => onUpdateProductLimit(item.id, e.target.value.replace(/[^\d]/g, ""))} placeholder="请输入" locked={totalLimitLocked} lockedDisplay="按规格维度生效" isEditMode={productFieldEditModes.totalLimit} onToggleEdit={() => onToggleProductFieldEditMode(item.id, "totalLimit")} inputMode="numeric" hasError={productFieldErrors.totalLimit} /></td>
                {!isSpecialPricePage ? <td><EditableCellInput label="总活动库存" value={activityStockDisplay} onChange={(e) => onUpdateProductActivityStock(item.id, e.target.value.replace(/[^\d]/g, ""))} placeholder="请输入" locked={activityStockLocked} lockedDisplay="按规格维度生效" isEditMode={productFieldEditModes.activityStock} onToggleEdit={() => onToggleProductFieldEditMode(item.id, "activityStock")} inputMode="numeric" hasError={productFieldErrors.activityStock} /></td> : null}
                <td>共 {item.specs.length} 个 规格</td>
                <td><div className="spec-action"><button type="button" className="spec-open-btn" onClick={() => onOpenSpecPicker(item.id)}>已选 {item.specs.filter((spec) => spec.status === "active").length} 个 规格 <span>编辑</span></button></div></td>
              </tr>
            );
          })}</tbody></table></div>
          <div className="goods-pagination"><span>共 125 条</span><select><option>10 条/页</option></select><button className="page-btn" type="button" disabled>‹</button><button className="page-btn is-current" type="button">1</button><button className="page-btn" type="button">2</button><button className="page-btn" type="button">3</button><button className="page-btn" type="button">4</button><button className="page-btn" type="button">5</button><span>...</span><button className="page-btn" type="button">13</button><button className="page-btn" type="button">›</button><span>到第</span><input className="page-input" placeholder="请输入" /><span>页</span><button className="btn btn-jump" type="button">跳转</button></div>
        </>
      ) : (
        <div className="goods-empty-state">
          <div className="goods-empty-illustration" aria-hidden="true">
            <div className="goods-empty-box goods-empty-box-left" />
            <div className="goods-empty-box goods-empty-box-right" />
            <div className="goods-empty-tag">+</div>
          </div>
        </div>
      )}
    </>
  );

  if (isSpecialPricePage) {
    return (
      <section className="content-card special-create-card">
        <div className="special-create-layout">
          <div className="special-create-form">
            <label className="special-create-field">
              <span><em>*</em>活动名称:</span>
              <div className="special-create-input has-counter">
                <input placeholder="请输入活动名称" maxLength={20} value={form.activityName} onChange={(e) => onFormChange("activityName", e.target.value)} />
                <strong>{form.activityName.length}/20</strong>
              </div>
            </label>

            <label className="special-create-field">
              <span><em>*</em>活动时间:</span>
              <div className="special-create-range">
                <input placeholder="开始时间" value={form.startTime} onChange={(e) => onFormChange("startTime", e.target.value)} disabled={isEditMode} />
                <i>-</i>
                <input placeholder="结束时间" value={form.endTime} onChange={(e) => onFormChange("endTime", e.target.value)} />
                <b>◴</b>
              </div>
            </label>

            <label className="special-create-field">
              <span><em>*</em>买家分组:</span>
              <div className="special-create-input special-create-select">
                <select value={form.buyerGroup || ""} onChange={(e) => onFormChange("buyerGroup", e.target.value)}>
                  <option value="">请选择买家分组</option>
                  {buyerGroups.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              </div>
            </label>

            <div className="special-create-toggle-row">
              <span>活动运费:</span>
              <div className="special-create-toggle-content">
                <div className="special-create-toggle-main">
                  <label className="special-switch">
                    <input type="checkbox" checked={!!form.shippingEnabled} onChange={(e) => onFormChange("shippingEnabled", e.target.checked)} />
                    <i />
                  </label>
                </div>
                <p>开启后专享价活动可单独设置运费规则，关闭后则按照普通商品运费规则计算</p>
              </div>
            </div>

            <div className="special-create-toggle-row special-tax-row">
              <span>专享价增值税加收税点:</span>
              <div className="special-create-toggle-content">
                <div className="special-create-toggle-main">
                  <label className="special-switch">
                    <input type="checkbox" checked={!!form.taxEnabled} onChange={(e) => onFormChange("taxEnabled", e.target.checked)} />
                    <i />
                  </label>
                </div>
                <p>设置“专享价增值税加收税点”会优先按此税点计算税费；(增值税税费 = 商品支付金额(不含运费) * 专享价增值税加收税点)</p>
              </div>
            </div>

            <div className="special-create-field special-create-field-top">
              <span><em>*</em>参与活动商品:</span>
              <div className="special-create-product-entry">
                <label className="special-radio"><input type="radio" name="special-goods-source" checked={!form.importMode} onChange={() => onFormChange("importMode", false)} /><i />在线选择</label>
                <label className="special-radio"><input type="radio" name="special-goods-source" checked={!!form.importMode} onChange={() => onFormChange("importMode", true)} /><i />excel导入</label>
                <div className="special-create-action-row">
                  <button className="btn btn-reset special-pick-btn" type="button" onClick={onOpenPicker} disabled={isEditMode}>选择商品</button>
                </div>
                <div className="special-create-hint">活动商品数量限制在5000以内</div>
              </div>
            </div>
          </div>

          <div className="goods-panel special-goods-panel">{selectedGoodsPanel}</div>

          <div className="special-create-footer">
            <button className="btn btn-create" type="button" onClick={onSave}>保存</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`content-card create-card ${modalOpen ? "is-dimmed" : ""}`}>
      <div className="create-layout">
        <div className="form-panel">
          <label className="create-field"><span><em>*</em> 活动名称:</span><div className="create-input-wrap has-counter"><input placeholder="请输入活动名称" maxLength={10} value={form.activityName} onChange={(e) => onFormChange("activityName", e.target.value)} /><strong>{form.activityName.length}/10</strong></div></label>
          <label className="create-field"><span><em>*</em> 活动分类:</span><div className="create-input-wrap"><select value={form.category} onChange={(e) => onFormChange("category", e.target.value)}><option value="">请选择活动分类</option>{activityCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></label>
          <label className="create-field"><span><em>*</em> 开始时间:</span><div className={`create-input-wrap with-icon ${isEditMode ? "is-disabled" : ""}`}><input placeholder="请选择开始时间" value={form.startTime} onChange={(e) => onFormChange("startTime", e.target.value)} disabled={isEditMode} /><i>◴</i></div></label>
          <label className="create-field"><span><em>*</em> 结束时间:</span><div className="create-input-wrap with-icon"><input placeholder="请选择结束时间" value={form.endTime} onChange={(e) => onFormChange("endTime", e.target.value)} /><i>◴</i></div></label>
          <div className="create-field"><span><em>*</em> 活动商品:</span><div className="create-actions-row"><button className="btn btn-create picker-btn" type="button" onClick={onOpenPicker} disabled={isEditMode}>+ 选择商品</button></div></div>
        </div>

        <div className="goods-detail-title">商品详情:</div>
        <div className="goods-panel">{selectedGoodsPanel}</div>
        <div className="create-footer"><button className="btn btn-create" type="button" onClick={onSave}>保存</button></div>
      </div>
    </section>
  );
}

function SpecialPriceCreatePage(props) {
  return <CreatePage {...props} pageName="专享价" />;
}

function SpecialPrice2CreatePage(props) {
  return <CreatePage {...props} pageName="专享价2" />;
}

function BuyerImportPage({ onBack, fileName, fileInputRef, onChooseFile, onFileChange, onImport }) {
  return (
    <section className="buyer-import-page">
      <div className="content-card buyer-import-card">
        <div className="buyer-import-tip">
          <div className="buyer-import-tip-head">
            <span className="buyer-import-tip-icon">!</span>
            <strong>温馨提示</strong>
          </div>
          <div className="buyer-import-steps">
            <div className="buyer-import-step">
              <span className="buyer-import-step-index">1</span>
              <div className="buyer-import-step-title">第一步</div>
              <a className="buyer-import-link" href="/买家导入模板.xlsx" download="买家导入模板.xlsx">下载模板</a>
            </div>
            <div className="buyer-import-step buyer-import-step-middle">
              <span className="buyer-import-step-index">2</span>
              <div className="buyer-import-step-title">第二步</div>
              <div className="buyer-import-step-text">导入模板中的买家信息</div>
            </div>
            <div className="buyer-import-step buyer-import-step-last">
              <span className="buyer-import-step-index">3</span>
              <div className="buyer-import-step-title">第三步</div>
              <div className="buyer-import-step-text">上传模板文件，点击导入。如有导入失败的数据，系统会自动下载到 excel 文件并显示失败原因</div>
            </div>
          </div>
        </div>

        <div className="buyer-import-form">
          <label className="buyer-import-field">
            <span><i>*</i> excel文件:</span>
            <div className="buyer-import-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="buyer-import-file-input"
                onChange={onFileChange}
              />
              <button type="button" className="buyer-import-upload-btn" onClick={onChooseFile}>
                <span>⇪</span>
                选择文件
              </button>
              <div className="buyer-import-upload-tip">{fileName || "一次最多导入1000条数据"}</div>
            </div>
          </label>

          <div className="buyer-import-actions">
            <button type="button" className="btn btn-create" onClick={onImport}>导入</button>
            <button type="button" className="btn btn-reset" onClick={onBack}>返回列表</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuyerImportResultModal({ result, onClose, onConfirm }) {
  if (!result) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="buyer-import-result-modal">
        <div className="buyer-import-result-header">
          <h3>消息</h3>
          <button type="button" className="buyer-edit-close" onClick={onClose}>×</button>
        </div>
        <div className="buyer-import-result-body">
          成功导入【{result.successCount}】条，失败【{result.failureCount}】条
        </div>
        <div className="buyer-import-result-footer">
          <button className="btn btn-search" type="button" onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}

function EditBuyerModal({ buyer, groupOptions, form, discountInvalid, onFormChange, onClose, onSave }) {
  if (!buyer) return null;

  const identityLength = form.identity.length;

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="buyer-edit-modal">
        <div className="buyer-edit-header">
          <h3>编辑买家</h3>
          <button type="button" className="buyer-edit-close" onClick={onClose}>×</button>
        </div>

        <div className="buyer-edit-body">
          <label className="buyer-edit-field">
            <span>买家身份:</span>
            <div className="buyer-edit-input-wrap">
              <input
                value={form.identity}
                maxLength={100}
                placeholder="请输入买家身份"
                onChange={(e) => onFormChange((current) => ({ ...current, identity: e.target.value }))}
              />
              <em>{identityLength}/100</em>
            </div>
          </label>

          <label className="buyer-edit-field">
            <span><i>*</i>买家分组:</span>
            <div className="buyer-edit-select-wrap">
              <select value={form.group} onChange={(e) => onFormChange((current) => ({ ...current, group: e.target.value }))}>
                <option value="">请选择买家分组</option>
                {groupOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {form.group ? <div className="buyer-edit-tag">{formatBuyerGroupNames(form.group)}<button type="button" onClick={() => onFormChange((current) => ({ ...current, group: "" }))}>×</button></div> : null}
            </div>
          </label>

          <label className="buyer-edit-field">
            <span>买家折扣:</span>
              <div className="buyer-add-discount-block">
              <div className={`buyer-edit-input-wrap buyer-add-discount-wrap ${discountInvalid ? "is-error" : ""}`}>
                <input
                  value={form.discount}
                  placeholder="请输入买家折扣"
                  onChange={(e) => onFormChange((current) => ({ ...current, discount: sanitizeBuyerDiscountInput(e.target.value, current.discount) }))}
                />
                <em>折</em>
              </div>
              <p className="buyer-add-discount-tip">折扣范围：请填写5.00~10折之间的折扣值；5.00代表5折，10代表无折扣</p>
            </div>
          </label>
        </div>

        <div className="buyer-edit-footer">
          <button className="btn btn-reset" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-search" type="button" onClick={onSave}>确定</button>
        </div>
      </div>
    </div>
  );
}

function AddBuyerModal({ open, groupOptions, form, discountInvalid, onFormChange, onClose, onSave }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="buyer-edit-modal buyer-add-modal">
        <div className="buyer-edit-header">
          <h3>新增买家</h3>
          <button type="button" className="buyer-edit-close" onClick={onClose}>×</button>
        </div>

        <div className="buyer-edit-body">
          <label className="buyer-edit-field buyer-add-field">
            <span><i>*</i>买家ID:</span>
            <div className="buyer-add-textarea-wrap">
              <textarea
                value={form.buyerIds}
                placeholder="请输入买家ID，多个用逗号隔开，一次最多添加1000个ID"
                onChange={(e) => onFormChange((current) => ({ ...current, buyerIds: e.target.value }))}
              />
            </div>
          </label>

          <label className="buyer-edit-field">
            <span><i>*</i>所属分组:</span>
            <div className="buyer-edit-select-wrap">
              <select value={form.group} onChange={(e) => onFormChange((current) => ({ ...current, group: e.target.value }))}>
                <option value="">请选择所属分组</option>
                {groupOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          </label>

          <label className="buyer-edit-field">
            <span>买家折扣:</span>
            <div className="buyer-add-discount-block">
              <div className={`buyer-edit-input-wrap buyer-add-discount-wrap ${discountInvalid ? "is-error" : ""}`}>
                <input
                  value={form.discount}
                  placeholder="请输入买家折扣"
                  onChange={(e) => onFormChange((current) => ({ ...current, discount: sanitizeBuyerDiscountInput(e.target.value, current.discount) }))}
                />
                <em>折</em>
              </div>
              <p className="buyer-add-discount-tip">折扣范围：请填写5.00~10折之间的折扣值；5.00代表5折，10代表无折扣</p>
            </div>
          </label>
        </div>

        <div className="buyer-edit-footer">
          <button className="btn btn-reset" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-search" type="button" onClick={onSave}>确定</button>
        </div>
      </div>
    </div>
  );
}

function BuyerMiniAppMallPage({ onBackToPcMall }) {
  const [activeTab, setActiveTab] = useState("home");
  const [miniappView, setMiniappView] = useState("main");
  const categoryItems = [
    { key: "beauty", label: "美妆护肤", tone: "pink", emoji: "💄" },
    { key: "digital", label: "数码家电", tone: "cyan", emoji: "📷" },
    { key: "flowers", label: "花卉园艺", tone: "violet", emoji: "💐" },
    { key: "home", label: "家居日用", tone: "green", emoji: "🧻" },
    { key: "snacks", label: "休闲食品", tone: "gold", emoji: "🍪" },
    { key: "grocery", label: "粮油调味", tone: "yellow", emoji: "🫙" },
    { key: "personal", label: "个人洗护", tone: "blue", emoji: "🧴" }
  ];

  const tabItems = [
    { key: "home", label: "首页" },
    { key: "all", label: "全部" },
    { key: "cart", label: "购物车" },
    { key: "store", label: "店铺" },
    { key: "mine", label: "我的" }
  ];
  const mineSummaryItems = [
    { key: "coupon", count: 0, label: "优惠券", icon: "ticket" },
    { key: "favorites", count: 6, label: "常购清单", icon: "star" },
    { key: "collect", count: 3, label: "我的收藏", icon: "bag" }
  ];
  const mineOrderItems = [
    { key: "pay", label: "待支付", badge: 1, icon: "card" },
    { key: "ship", label: "待发货", badge: 61, icon: "truck" },
    { key: "receive", label: "待收货", badge: 17, icon: "box" },
    { key: "comment", label: "待评价", badge: 0, icon: "comment" },
    { key: "refund", label: "退款/售后", badge: 16, icon: "refund" }
  ];
  const mineServiceItems = ["我的评论", "我的消息", "我的收货地址", "我的发票抬头", "账号管理", "平台客服", "举报信息", "身份认证"];
  const orderTabs = ["全部", "待付款", "待发货", "待收货", "待评价"];
  const orderListItems = [
    { key: "order-main", image: "portrait", title: "20260324单规格商品", subtitle: "", price: "55", quantity: 3, status: "待收货" },
    { key: "order-1", image: "perfume", title: "小尼新增阶梯价商品最新排序", subtitle: "1#樱花茶柠； 保湿", price: "6", quantity: 2, status: "退款成功" },
    { key: "order-2", image: "perfume", title: "小尼新增阶梯价商品最新排序", subtitle: "30ml*1瓶； 保湿", price: "6", quantity: 2, status: "退款成功" },
    { key: "order-3", image: "perfume", title: "小尼新增阶梯价商品最新排序", subtitle: "40g*1盒； 保湿", price: "6", quantity: 2, status: "" },
    { key: "order-4", image: "perfume", title: "小尼新增阶梯价商品最新排序", subtitle: "【睫毛打底膏】定型纤长； 保湿", price: "6", quantity: 2, status: "退款成功" }
  ];
  const isMineTab = activeTab === "mine";
  const isOrderListView = isMineTab && miniappView === "orders";
  const isInvoiceDetailView = isMineTab && miniappView === "invoice";

  const handleTabSwitch = (key) => {
    setActiveTab(key);
    setMiniappView("main");
  };

  return (
    <div className="miniapp-preview-shell">
      <div className="miniapp-phone-frame">
        <div className="miniapp-phone">
          <div className="miniapp-phone-inner">
            <div className="miniapp-statusbar">
              <span>{isInvoiceDetailView ? "16:29" : isOrderListView ? "00:07:15" : isMineTab ? "00:03:58" : "00:02:06"}</span>
              <div className="miniapp-status-icons">
                <span>5G</span>
                <span>▂▄▆█</span>
                <span>{isInvoiceDetailView ? "84" : isMineTab ? "100" : "98"}</span>
              </div>
            </div>

            {isInvoiceDetailView ? (
              <div className="miniapp-invoice-page">
                <header className="miniapp-order-header miniapp-invoice-header">
                  <button className="miniapp-order-back" type="button" onClick={() => setMiniappView("orders")} aria-label="返回">
                    <span />
                  </button>
                  <div className="miniapp-order-title">发票详情</div>
                  <div className="miniapp-order-header-actions">
                    <span>•••</span>
                    <button type="button" aria-label="返回买家PC商城" onClick={() => onBackToPcMall?.()}>◎</button>
                  </div>
                </header>

                <main className="miniapp-invoice-content">
                  <section className="miniapp-invoice-amount-card">
                    <div className="miniapp-invoice-amount-head">
                      <span>开票金额 ⓘ</span>
                      <em>已驳回</em>
                    </div>
                    <strong>¥ -</strong>
                  </section>

                  <section className="miniapp-invoice-reject-card">
                    <div className="miniapp-invoice-row"><span>驳回时间：</span><strong>2026-04-15 15:54:12</strong></div>
                    <div className="miniapp-invoice-row"><span>驳回原因：</span><strong>存在售后单未处理完</strong></div>
                  </section>

                  <section className="miniapp-invoice-panel">
                    <h2>电子增值税专用发票</h2>

                    <div className="miniapp-invoice-section-title">发票信息</div>
                    <div className="miniapp-invoice-grid">
                      <div className="miniapp-invoice-row"><span>发票内容</span><strong>商品类别</strong></div>
                      <div className="miniapp-invoice-row"><span>申请时间</span><strong>2026-01-29 16:09:18</strong></div>
                      <div className="miniapp-invoice-row"><span className="is-accent">申请开票金额：</span><strong className="is-accent">¥ 168.8</strong></div>
                      <div className="miniapp-invoice-row"><span>开票时间</span><strong>-</strong></div>
                      <div className="miniapp-invoice-row"><span>发票号码</span><strong>-</strong></div>
                    </div>

                    <div className="miniapp-invoice-section-title">增票资质</div>
                    <div className="miniapp-invoice-grid">
                      <div className="miniapp-invoice-row"><span>发票抬头</span><strong>湖南海商科技有限公司</strong></div>
                      <div className="miniapp-invoice-row"><span>纳税人识别号</span><strong>102324565122210</strong></div>
                      <div className="miniapp-invoice-row"><span>注册地址</span><strong>湖南省长沙市芙蓉区朝阳街道湖南大剧院</strong></div>
                      <div className="miniapp-invoice-row"><span>注册电话</span><strong>198****9808</strong></div>
                      <div className="miniapp-invoice-row"><span>开户银行名称</span><strong>长沙银行</strong></div>
                      <div className="miniapp-invoice-row"><span>银行账号</span><strong>102155****1125</strong></div>
                    </div>

                    <div className="miniapp-invoice-section-title">收票信息</div>
                    <div className="miniapp-invoice-grid">
                      <div className="miniapp-invoice-row"><span>收票人姓名</span><strong>朱达</strong></div>
                      <div className="miniapp-invoice-row"><span>收票人手机</span><strong>198****9808</strong></div>
                      <div className="miniapp-invoice-row"><span>收票人地址</span><strong>湖南省 娄底市 娄星区 乐坪街道 1005号</strong></div>
                    </div>

                    <div className="miniapp-invoice-section-title">订单信息</div>
                    <div className="miniapp-invoice-grid">
                      <div className="miniapp-invoice-row"><span>订单状态</span><strong>待发货</strong></div>
                      <div className="miniapp-invoice-row"><span>订单号</span><strong>20260129162186775</strong></div>
                      <div className="miniapp-invoice-row"><span>下单时间</span><strong>2026-01-29 16:09:18</strong></div>
                      <div className="miniapp-invoice-row"><span>买家账号</span><strong>zd675671998(ID: 51987)</strong></div>
                      <div className="miniapp-invoice-row"><span>闪购门店</span><strong>禧它宠物生活馆（ID: 31405635）</strong></div>
                    </div>
                  </section>
                </main>

                <div className="miniapp-invoice-footer">
                  <button className="miniapp-invoice-submit" type="button">申请开票</button>
                </div>
              </div>
            ) : isOrderListView ? (
              <>
                <header className="miniapp-order-header">
                  <button className="miniapp-order-back" type="button" onClick={() => setMiniappView("main")} aria-label="返回">
                    <span />
                  </button>
                  <div className="miniapp-order-title">订单列表</div>
                  <div className="miniapp-order-header-actions">
                    <span>•••</span>
                    <button type="button" aria-label="返回买家PC商城" onClick={() => onBackToPcMall?.()}>◎</button>
                  </div>
                </header>

                <main className="miniapp-order-content">
                  <div className="miniapp-order-search-row">
                    <div className="miniapp-order-searchbar">请输入订单号/快递单号/商品名称</div>
                    <button className="miniapp-order-search-btn" type="button">搜索</button>
                    <button className="miniapp-order-filter-btn" type="button" aria-label="筛选">
                      <span />
                    </button>
                  </div>

                  <div className="miniapp-order-tabs">
                    {orderTabs.map((item) => (
                      <button className={`miniapp-order-tab ${item === "待收货" ? "is-active" : ""}`} key={item} type="button">{item}</button>
                    ))}
                  </div>

                  <section className="miniapp-order-card">
                    <div className="miniapp-order-store-row">
                      <div className="miniapp-order-store">农妇三拳 <span>〉</span></div>
                      <div className="miniapp-order-store-status">待收货</div>
                    </div>

                    <div className="miniapp-order-items">
                      {orderListItems.map((item) => (
                        <div className="miniapp-order-item-row" key={item.key}>
                          <div className={`miniapp-order-item-image is-${item.image}`} />
                          <div className="miniapp-order-item-main">
                            <div className="miniapp-order-item-title">{item.title}</div>
                            {item.subtitle ? <div className="miniapp-order-item-subtitle">{item.subtitle}</div> : null}
                          </div>
                          <div className="miniapp-order-item-side">
                            <div className="miniapp-order-item-price">{`¥ ${item.price}`}</div>
                            <div className="miniapp-order-item-qty">{`x${item.quantity}`}</div>
                            {item.status ? <div className={`miniapp-order-item-status ${item.status === "退款成功" ? "is-refund" : ""}`}>{item.status}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="miniapp-order-summary-row">
                      <button className="miniapp-order-more-btn" type="button">更多</button>
                      <div className="miniapp-order-summary-text">共11件商品 实付 <strong>¥ 15.57</strong></div>
                    </div>

                    <div className="miniapp-order-actions">
                      <button className="miniapp-order-action-btn is-primary" type="button">确认收货</button>
                      <button className="miniapp-order-action-btn" type="button">申请售后</button>
                      <button className="miniapp-order-action-btn" type="button" onClick={() => setMiniappView("invoice")}>查看发票</button>
                    </div>
                  </section>
                </main>
              </>
            ) : isMineTab ? (
              <>
                <header className="miniapp-mine-header">
                  <div className="miniapp-mine-user">
                    <div className="miniapp-mine-avatar" aria-hidden="true">
                      <span>兔</span>
                    </div>
                    <div className="miniapp-mine-user-meta">
                      <strong>Shawnee003</strong>
                      <span>ID：18166</span>
                    </div>
                  </div>
                  <div className="miniapp-mine-header-actions">
                    <span>•••</span>
                    <button type="button" aria-label="返回买家PC商城" onClick={() => onBackToPcMall?.()}>◎</button>
                  </div>
                </header>

                <main className="miniapp-content miniapp-content-mine">
                  <section className="miniapp-mine-summary-card">
                    {mineSummaryItems.map((item) => (
                      <div className="miniapp-mine-summary-item" key={item.key}>
                        <div className={`miniapp-mine-summary-icon is-${item.icon}`} />
                        <div className="miniapp-mine-summary-meta">
                          <strong>{item.count}</strong>
                          <span>{item.label}</span>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="miniapp-mine-panel">
                    <div className="miniapp-mine-panel-head">
                      <h3>我的订单</h3>
                      <button className="miniapp-mine-panel-link" type="button" onClick={() => setMiniappView("orders")}>查看全部 〉</button>
                    </div>
                    <div className="miniapp-mine-order-grid">
                      {mineOrderItems.map((item) => (
                        <button className="miniapp-mine-order-item" key={item.key} type="button">
                          <span className={`miniapp-mine-order-icon is-${item.icon}`}>
                            {item.badge ? <em>{item.badge}</em> : null}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="miniapp-mine-panel">
                    <div className="miniapp-mine-panel-head">
                      <h3>更多服务</h3>
                    </div>
                    <div className="miniapp-mine-service-list">
                      {mineServiceItems.map((item) => (
                        <button className="miniapp-mine-service-item" key={item} type="button">
                          <span>{item}</span>
                          <span>〉</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </main>
              </>
            ) : (
              <>
                <header className="miniapp-header">
                  <div className="miniapp-header-badge">vConsole</div>
                  <div className="miniapp-header-title">闪电帮帮</div>
                  <div className="miniapp-header-actions">
                    <span>☆ 2.8</span>
                    <button type="button" aria-label="返回买家PC商城" onClick={() => onBackToPcMall?.()}>◎</button>
                  </div>
                </header>

                <div className="miniapp-searchbar">
                  <span className="miniapp-search-icon">⌗</span>
                  <span className="miniapp-search-divider" />
                  <span className="miniapp-search-placeholder">请输入商品名称或UPC码</span>
                </div>

                <main className="miniapp-content">
                  <section className="miniapp-hero-card">
                    <div className="miniapp-card-brand">闪电帮帮</div>
                    <div className="miniapp-hero-layout">
                      <div>
                        <div className="miniapp-hero-title">美团闪电仓5.1假期</div>
                        <div className="miniapp-hero-title">线上选品会专区</div>
                      </div>
                      <div className="miniapp-hero-mascot" aria-hidden="true">
                        <div className="miniapp-hero-bag">
                          <span className="miniapp-hero-bag-hat" />
                          <span className="miniapp-hero-bag-glass" />
                          <span className="miniapp-hero-bag-flash">⚡</span>
                        </div>
                      </div>
                    </div>
                    <div className="miniapp-dots">
                      <span className="is-active" />
                      <span />
                      <span />
                      <span />
                    </div>
                  </section>

                  <section className="miniapp-category-row">
                    {categoryItems.map((item) => (
                      <div className="miniapp-category-item" key={item.key}>
                        <div className={`miniapp-category-thumb is-${item.tone}`}>{item.emoji}</div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </section>

                  <section className="miniapp-section">
                    <h3>甄选好物</h3>
                    <div className="miniapp-feature-card">
                      <div className="miniapp-card-brand is-dark">闪电帮帮</div>
                      <div className="miniapp-feature-copy">
                        <strong>甄选好物</strong>
                        <p>多品类甄选好物等你挑选</p>
                      </div>
                      <div className="miniapp-feature-cart" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <button className="miniapp-service-bubble" type="button" aria-label="客服">◔</button>
                    </div>
                  </section>

                  <section className="miniapp-section">
                    <h3>新商推荐</h3>
                    <div className="miniapp-recommend-card">
                      <div className="miniapp-recommend-copy">
                        <strong>品牌直供 资质齐全</strong>
                        <p>授权链路完整 质检严格</p>
                        <em>正品保障 品质无忧</em>
                      </div>
                      <div className="miniapp-recommend-products" aria-hidden="true">
                        <span className="is-bottle" />
                        <span className="is-perfume" />
                        <span className="is-razor" />
                        <span className="is-pack" />
                      </div>
                    </div>
                  </section>
                </main>
              </>
            )}

            {!isOrderListView && !isInvoiceDetailView ? (
              <nav className="miniapp-tabbar">
                {tabItems.map((item) => (
                  <button className={`miniapp-tabbar-item ${item.key === activeTab ? "is-active" : ""}`} key={item.key} type="button" onClick={() => handleTabSwitch(item.key)}>
                    <span className={`miniapp-tabbar-icon is-${item.key}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const storedAdminView = useMemo(() => readStoredJson(supplierAdminViewStorageKey, {
    activePortalPage: "admin",
    activeSection: "home",
    activeBuyerPage: "买家列表",
    activeShopPage: "发票管理",
    currentMarketingPage: "专享价"
  }), []);
  const [activePortalPage, setActivePortalPage] = useState(() => (
    ["admin", "buyer-pc-mall", "platform-center", "miniapp-mall"].includes(storedAdminView.activePortalPage) ? storedAdminView.activePortalPage : "admin"
  ));
  const [activeSection, setActiveSection] = useState(() => (
    ["home", "buyer", "shop", "marketing"].includes(storedAdminView.activeSection) ? storedAdminView.activeSection : "home"
  ));
  const [activeBuyerPage, setActiveBuyerPage] = useState(() => (
    storedAdminView.activeBuyerPage === "导入买家" || buyerPageNames.includes(storedAdminView.activeBuyerPage) ? storedAdminView.activeBuyerPage : "买家列表"
  ));
  const [activeShopPage, setActiveShopPage] = useState(() => (
    shopPageNames.includes(storedAdminView.activeShopPage) ? storedAdminView.activeShopPage : "发票管理"
  ));
  const [activeShopTab, setActiveShopTab] = useState("发票管理");
  const [platformCenterPage, setPlatformCenterPage] = useState("home");
  const [buyerRows, setBuyerRows] = useState(buyerSeedRows);
  const [buyerFilters, setBuyerFilters] = useState(initialBuyerFilters);
  const [buyerPage, setBuyerPage] = useState(1);
  const [buyerPageSize, setBuyerPageSize] = useState(20);
  const [buyerExpanded, setBuyerExpanded] = useState(true);
  const [buyerImportFileName, setBuyerImportFileName] = useState("");
  const [buyerImportFile, setBuyerImportFile] = useState(null);
  const [buyerImportResult, setBuyerImportResult] = useState(null);
  const buyerImportInputRef = useRef(null);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [buyerEditForm, setBuyerEditForm] = useState({ identity: "", group: "", discount: "" });
  const [buyerEditDiscountInvalid, setBuyerEditDiscountInvalid] = useState(false);
  const [isAddBuyerOpen, setIsAddBuyerOpen] = useState(false);
  const [newBuyerForm, setNewBuyerForm] = useState(initialNewBuyerForm);
  const [newBuyerDiscountInvalid, setNewBuyerDiscountInvalid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMarketingPage, setCurrentMarketingPage] = useState(() => (
    marketingPageNames.includes(storedAdminView.currentMarketingPage) ? storedAdminView.currentMarketingPage : "专享价"
  ));
  const [shopInvoiceEntryPreset, setShopInvoiceEntryPreset] = useState({
    statusTab: "全部",
    markerFilter: "全部",
    requestId: 0
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isBatchSpecOpen, setIsBatchSpecOpen] = useState(false);
  const [detailSpecProduct, setDetailSpecProduct] = useState(null);
  const [activeSpecProductId, setActiveSpecProductId] = useState("");
  const [batchSpecDraftProducts, setBatchSpecDraftProducts] = useState([]);
  const [batchSpecSelectedIdsByProduct, setBatchSpecSelectedIdsByProduct] = useState({});
  const [marketingStates, setMarketingStates] = useState(createInitialMarketingStates);
  const [toastMessage, setToastMessage] = useState("");
  const [showHomeInvoiceAlert, setShowHomeInvoiceAlert] = useState(() => activeSection === "home" && activePortalPage === "admin");
  const isHomeSection = activeSection === "home";
  const isBuyerSection = activeSection === "buyer";
  const isShopSection = activeSection === "shop";
  const isMarketingSection = activeSection === "marketing";
  const currentPageTitle = isHomeSection ? "首页-控制台" : isBuyerSection ? activeBuyerPage : isShopSection ? activeShopTab : currentMarketingPage;
  const platformTopActions = useMemo(() => ([
    { key: "supplier-admin", label: "供应商后台", icon: "supplier-admin" },
    { key: "pc-mall", label: "买家PC商城", icon: "pc-mall" },
    { key: "miniapp-mall", label: "买家小程序商城", icon: "miniapp-mall" },
    { key: "export", label: "导出记录", icon: "export" },
    { key: "logout", label: "退出登录", icon: "logout" }
  ]), []);
  const buyerGroupOptions = useMemo(() => buyerGroups, []);

  const currentPageState = marketingStates[currentMarketingPage] || createInitialMarketingPageState(currentMarketingPage);
  const {
    filters,
    page,
    pageSize,
    detailPage,
    detailPageSize,
    createForm,
    pickerFilters,
    selectedProducts,
    selectedGoodsIds,
    selectedPickerProductIds,
    selectedSpecIdsByProduct,
    productFieldEditModesByProduct,
    productFieldErrorsByProduct,
    detailActivity,
    activities
  } = currentPageState;

  const activeSpecProduct = selectedProducts.find((item) => item.id === activeSpecProductId) || selectedProducts[0];
  const activeSpecSelectedIds = selectedSpecIdsByProduct[activeSpecProductId] || [];
  const activeSpecProductFieldEditModes = productFieldEditModesByProduct?.[activeSpecProductId] || initialProductFieldEditModes;
  const activeSpecProductFlashPriceInputMode = !!activeSpecProduct && (!hasSpecLevelFlashPrice(activeSpecProduct) || activeSpecProductFieldEditModes.flashPrice);

  const updateCurrentMarketingState = (updater) => {
    setMarketingStates((current) => ({
      ...current,
      [currentMarketingPage]: updater(current[currentMarketingPage] || createInitialMarketingPageState(currentMarketingPage))
    }));
  };

  const updateCurrentField = (field, value) => {
    updateCurrentMarketingState((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    writeStoredJson(supplierAdminViewStorageKey, {
      activePortalPage,
      activeSection,
      activeBuyerPage,
      activeShopPage,
      currentMarketingPage
    });
  }, [activePortalPage, activeSection, activeBuyerPage, activeShopPage, currentMarketingPage]);

  const dismissHomeInvoiceAlert = () => {
    setShowHomeInvoiceAlert(false);
  };

  const closeAllCreateOverlays = () => {
    setIsPickerOpen(false);
    setIsSpecOpen(false);
    setIsBatchSpecOpen(false);
    setDetailSpecProduct(null);
    setActiveSpecProductId("");
    setBatchSpecDraftProducts([]);
    setBatchSpecSelectedIdsByProduct({});
    updateCurrentField("selectedSpecIdsByProduct", {});
  };

  const resetCreateState = () => {
    setIsEditMode(false);
    updateCurrentMarketingState((current) => ({
      ...current,
      createForm: { ...initialCreateForm },
      pickerFilters: { ...initialPickerFilters },
      selectedProducts: [],
      selectedGoodsIds: [],
      selectedPickerProductIds: [],
      selectedSpecIdsByProduct: {},
      productFieldEditModesByProduct: {},
      productFieldErrorsByProduct: {}
    }));
  };

  const updateSelectedProduct = (productId, updater) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.map((item) => (item.id === productId ? updater(item) : item))
    }));
  };

  const updateSelectedSpecIds = (productId, updater) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedSpecIdsByProduct: {
        ...current.selectedSpecIdsByProduct,
        [productId]: updater(current.selectedSpecIdsByProduct[productId] || [])
      }
    }));
  };

  const createPickerDraftProducts = () => {
    const catalogProducts = createInitialProducts(isAnySpecialPricePage(currentMarketingPage) ? "1" : "0");
    const catalogMap = new Map(catalogProducts.map((item) => [item.id, item]));
    const selectedMap = new Map(selectedProducts.map((item) => [item.id, item]));

    return selectedPickerProductIds.map((productId) => {
      const existingProduct = selectedMap.get(productId);
      if (existingProduct) return JSON.parse(JSON.stringify(existingProduct));

      const catalogProduct = catalogMap.get(productId);
      return catalogProduct ? { ...JSON.parse(JSON.stringify(catalogProduct)), flashPrice: "" } : null;
    }).filter(Boolean);
  };

  const updateBatchDraftProduct = (productId, updater) => {
    setBatchSpecDraftProducts((current) => current.map((item) => (item.id === productId ? updater(item) : item)));
  };

  const updateBatchDraftSpecIds = (productId, updater) => {
    setBatchSpecSelectedIdsByProduct((current) => ({
      ...current,
      [productId]: updater(current[productId] || [])
    }));
  };

  const handleFormChange = (field, value) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      createForm: { ...current.createForm, [field]: value }
    }));
  };

  const handleResetCreateFilters = () => {
    updateCurrentMarketingState((current) => ({
      ...current,
      createForm: {
        ...current.createForm,
        productKeyword: "",
        productId: "",
        onlyUnpricedProducts: false
      }
    }));
  };

  const handleToggleProductFieldEditMode = (productId, field) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      productFieldEditModesByProduct: {
        ...(current.productFieldEditModesByProduct || {}),
        [productId]: {
          ...(current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes),
          [field]: !(current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes)[field]
        }
      },
      productFieldErrorsByProduct: {
        ...(current.productFieldErrorsByProduct || {}),
        [productId]: {
          ...(current.productFieldErrorsByProduct?.[productId] || {}),
          [field]: false
        }
      }
    }));
  };

  const clearProductFieldError = (productId, field) => {
    updateCurrentMarketingState((current) => {
      if (!current.productFieldErrorsByProduct?.[productId]?.[field]) return current;

      return {
        ...current,
        productFieldErrorsByProduct: {
          ...(current.productFieldErrorsByProduct || {}),
          [productId]: {
            ...(current.productFieldErrorsByProduct?.[productId] || {}),
            [field]: false
          }
        }
      };
    });
  };

  const handleUpdateProductLimit = (productId, value) => {
    clearProductFieldError(productId, "totalLimit");
    updateSelectedProduct(productId, (product) => ({ ...product, totalLimit: value }));
  };

  const handleUpdateProductFlashPrice = (productId, value) => {
    clearProductFieldError(productId, "flashPrice");
    updateSelectedProduct(productId, (product) => ({ ...product, flashPrice: value }));
  };

  const handleUpdateProductActivityStock = (productId, value) => {
    clearProductFieldError(productId, "activityStock");
    updateSelectedProduct(productId, (product) => syncProductActivityStock(product, value));
  };

  const handleUpdateSpecField = (productId, specId, field, value) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          flashPrice: field === "flashPrice" ? "" : product.flashPrice,
          totalLimit: field === "limitCount" ? "" : product.totalLimit,
          activityStock: field === "activityStock" ? "" : product.activityStock,
          specs: product.specs.map((spec) => (spec.id === specId ? { ...spec, [field]: value } : spec))
        };
      }),
      productFieldEditModesByProduct: {
        ...(current.productFieldEditModesByProduct || {}),
        [productId]: {
          ...(current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes),
          flashPrice: field === "flashPrice" ? false : (current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes).flashPrice,
          totalLimit: field === "limitCount" ? false : (current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes).totalLimit,
          activityStock: field === "activityStock" ? false : (current.productFieldEditModesByProduct?.[productId] || initialProductFieldEditModes).activityStock
        }
      }
    }));
  };

  const handleTogglePickerProduct = (value) => {
    if (Array.isArray(value)) {
      updateCurrentField("selectedPickerProductIds", value);
      return;
    }

    updateCurrentMarketingState((current) => ({
      ...current,
      selectedPickerProductIds: current.selectedPickerProductIds.includes(value)
        ? current.selectedPickerProductIds.filter((item) => item !== value)
        : [...current.selectedPickerProductIds, value]
    }));
  };

  const handleSavePicker = () => {
    if (selectedPickerProductIds.length === 0) {
      setToastMessage("请先选择商品");
      return;
    }

    if (currentMarketingPage === "限时购") {
      setBatchSpecDraftProducts(createPickerDraftProducts());
      setBatchSpecSelectedIdsByProduct({});
      setIsPickerOpen(false);
      setIsBatchSpecOpen(true);
      return;
    }

    const catalogProducts = createInitialProducts(isAnySpecialPricePage(currentMarketingPage) ? "1" : "0");
    const selectedCatalogProducts = catalogProducts
      .filter((item) => selectedPickerProductIds.includes(item.id))
      .map((item) => ({ ...JSON.parse(JSON.stringify(item)), flashPrice: "" }));

    updateCurrentMarketingState((current) => {
      const existingIds = new Set(current.selectedProducts.map((item) => item.id));
      const newProducts = selectedCatalogProducts.filter((item) => !existingIds.has(item.id));

      return {
        ...current,
        selectedProducts: [...current.selectedProducts, ...newProducts]
      };
    });

    setIsPickerOpen(false);
  };

  const handleToggleSpecSelection = (productId, specId) => {
    updateSelectedSpecIds(productId, (current) => (current.includes(specId) ? current.filter((item) => item !== specId) : [...current, specId]));
  };

  const handleToggleAllSpecSelections = (productId) => {
    const product = selectedProducts.find((item) => item.id === productId);
    if (!product) return;

    const selectableIds = product.specs.filter((spec) => spec.status !== "merged").map((spec) => spec.id);
    updateSelectedSpecIds(productId, (current) => (current.length === selectableIds.length ? [] : selectableIds));
  };

  const handleBatchDraftProductLimit = (productId, value) => {
    updateBatchDraftProduct(productId, (product) => ({ ...product, totalLimit: value }));
  };

  const handleBatchDraftProductActivityStock = (productId, value) => {
    updateBatchDraftProduct(productId, (product) => syncProductActivityStock(product, value));
  };

  const handleBatchDraftProductFlashPrice = (productId, value) => {
    updateBatchDraftProduct(productId, (product) => ({ ...product, flashPrice: value }));
  };

  const handleBatchDraftSpecField = (productId, specId, field, value) => {
    updateBatchDraftProduct(productId, (product) => ({
      ...product,
      flashPrice: field === "flashPrice" ? "" : product.flashPrice,
      totalLimit: field === "limitCount" ? "" : product.totalLimit,
      activityStock: field === "activityStock" ? "" : product.activityStock,
      specs: product.specs.map((spec) => (spec.id === specId ? { ...spec, [field]: value } : spec))
    }));
  };

  const handleBatchDraftToggleSpecSelection = (productId, specId) => {
    updateBatchDraftSpecIds(productId, (current) => (current.includes(specId) ? current.filter((item) => item !== specId) : [...current, specId]));
  };

  const handleBatchDraftToggleAllSpecs = (productId) => {
    const product = batchSpecDraftProducts.find((item) => item.id === productId);
    if (!product) return;

    const selectableIds = product.specs.filter((spec) => spec.status !== "merged").map((spec) => spec.id);
    updateBatchDraftSpecIds(productId, (current) => (current.length === selectableIds.length ? [] : selectableIds));
  };

  const applyBatchDraftSpecStatusChange = (productId, specIds, nextStatus, clearAllSelections = false) => {
    const product = batchSpecDraftProducts.find((item) => item.id === productId);
    if (!product) return false;

    const targetIds = new Set(specIds);
    const targetSpecs = product.specs.filter((spec) => targetIds.has(spec.id));
    const eligibleSpecs = targetSpecs.filter((spec) => (nextStatus === "active" ? spec.status === "available" : spec.status === "active"));

    if (eligibleSpecs.length === 0) {
      return false;
    }

    if (nextStatus === "available") {
      const activeSpecCount = product.specs.filter((spec) => spec.status === "active").length;
      if (activeSpecCount <= eligibleSpecs.length) {
        setToastMessage("请至少保留一个规格参与活动");
        return false;
      }
    }

    const eligibleIdSet = new Set(eligibleSpecs.map((spec) => spec.id));
    updateBatchDraftProduct(productId, (currentProduct) => ({
      ...currentProduct,
      specs: currentProduct.specs.map((spec) => {
        if (!eligibleIdSet.has(spec.id)) return spec;

        return {
          ...spec,
          status: nextStatus,
          flashPrice: nextStatus === "available" ? "" : spec.flashPrice,
          limitCount: nextStatus === "available" ? "" : spec.limitCount,
          activityStock: nextStatus === "available" ? "" : (spec.activityStock || String(spec.stock || ""))
        };
      })
    }));

    updateBatchDraftSpecIds(productId, (current) => (clearAllSelections ? [] : current.filter((id) => !eligibleIdSet.has(id))));
    return true;
  };

  const handleBatchDraftToggleSpecStatus = (productId, specId, nextStatus) => {
    applyBatchDraftSpecStatusChange(productId, [specId], nextStatus);
  };

  const handleBatchDraftToggleSpecs = (productId, nextStatus) => {
    applyBatchDraftSpecStatusChange(productId, batchSpecSelectedIdsByProduct[productId] || [], nextStatus, true);
  };

  const handleBatchSpecSave = () => {
    const draftIdSet = new Set(batchSpecDraftProducts.map((item) => item.id));

    updateCurrentMarketingState((current) => ({
      ...current,
      selectedProducts: [...current.selectedProducts.filter((item) => !draftIdSet.has(item.id)), ...batchSpecDraftProducts],
      selectedPickerProductIds: []
    }));

    setIsBatchSpecOpen(false);
    setBatchSpecDraftProducts([]);
    setBatchSpecSelectedIdsByProduct({});
  };

  const handleCloseBatchSpec = () => {
    setIsBatchSpecOpen(false);
    setBatchSpecDraftProducts([]);
    setBatchSpecSelectedIdsByProduct({});
  };

  const handleOpenPicker = () => {
    setIsSpecOpen(false);
    setIsBatchSpecOpen(false);
    setActiveSpecProductId("");
    setBatchSpecDraftProducts([]);
    setBatchSpecSelectedIdsByProduct({});
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedPickerProductIds: current.selectedProducts.map((item) => item.id),
      selectedSpecIdsByProduct: {}
    }));
    setIsPickerOpen(true);
  };

  const handleOpenSpecPicker = (productId) => {
    setIsPickerOpen(false);
    setActiveSpecProductId(productId);
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedSpecIdsByProduct: {
        ...current.selectedSpecIdsByProduct,
        [productId]: current.selectedSpecIdsByProduct[productId] || []
      }
    }));
    setIsSpecOpen(true);
  };

  const handleToggleGoodsSelection = (value) => {
    if (Array.isArray(value)) {
      updateCurrentField("selectedGoodsIds", value);
      return;
    }

    updateCurrentMarketingState((current) => ({
      ...current,
      selectedGoodsIds: current.selectedGoodsIds.includes(value)
        ? current.selectedGoodsIds.filter((item) => item !== value)
        : [...current.selectedGoodsIds, value]
    }));
  };

  const handleRemoveProduct = (productId) => {
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.filter((item) => item.id !== productId),
      selectedGoodsIds: current.selectedGoodsIds.filter((item) => item !== productId),
      selectedPickerProductIds: current.selectedPickerProductIds.filter((item) => item !== productId),
      selectedSpecIdsByProduct: Object.fromEntries(Object.entries(current.selectedSpecIdsByProduct).filter(([key]) => key !== productId)),
      productFieldEditModesByProduct: Object.fromEntries(Object.entries(current.productFieldEditModesByProduct || {}).filter(([key]) => key !== productId)),
      productFieldErrorsByProduct: Object.fromEntries(Object.entries(current.productFieldErrorsByProduct || {}).filter(([key]) => key !== productId))
    }));

    if (activeSpecProductId === productId) {
      setIsSpecOpen(false);
      setActiveSpecProductId("");
    }
  };

  const handleBatchRemoveProducts = () => {
    if (selectedGoodsIds.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedGoodsIds);
    updateCurrentMarketingState((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.filter((item) => !selectedIdSet.has(item.id)),
      selectedPickerProductIds: current.selectedPickerProductIds.filter((item) => !selectedIdSet.has(item)),
      selectedSpecIdsByProduct: Object.fromEntries(Object.entries(current.selectedSpecIdsByProduct).filter(([key]) => !selectedIdSet.has(key))),
      productFieldEditModesByProduct: Object.fromEntries(Object.entries(current.productFieldEditModesByProduct || {}).filter(([key]) => !selectedIdSet.has(key))),
      productFieldErrorsByProduct: Object.fromEntries(Object.entries(current.productFieldErrorsByProduct || {}).filter(([key]) => !selectedIdSet.has(key))),
      selectedGoodsIds: []
    }));

    if (activeSpecProductId && selectedIdSet.has(activeSpecProductId)) {
      setIsSpecOpen(false);
      setActiveSpecProductId("");
    }
  };

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const applySpecStatusChange = (productId, specIds, nextStatus, clearAllSelections = false) => {
    const product = selectedProducts.find((item) => item.id === productId);
    if (!product) return false;

    const targetIds = new Set(specIds);
    const targetSpecs = product.specs.filter((spec) => targetIds.has(spec.id));
    const eligibleSpecs = targetSpecs.filter((spec) => (nextStatus === "active" ? spec.status === "available" : spec.status === "active"));

    if (eligibleSpecs.length === 0) {
      return false;
    }

    if (nextStatus === "available") {
      const activeSpecCount = product.specs.filter((spec) => spec.status === "active").length;
      if (activeSpecCount <= eligibleSpecs.length) {
        setToastMessage("请至少保留一个规格参与活动");
        return false;
      }
    }

    const eligibleIdSet = new Set(eligibleSpecs.map((spec) => spec.id));
    updateSelectedProduct(productId, (currentProduct) => ({
      ...currentProduct,
      specs: currentProduct.specs.map((spec) => {
        if (!eligibleIdSet.has(spec.id)) return spec;

        return {
          ...spec,
          status: nextStatus,
          flashPrice: nextStatus === "available" ? "" : spec.flashPrice,
          limitCount: nextStatus === "available" ? "" : spec.limitCount,
          activityStock: nextStatus === "available" ? "" : (spec.activityStock || String(spec.stock || ""))
        };
      })
    }));

    updateSelectedSpecIds(productId, (current) => (clearAllSelections ? [] : current.filter((id) => !eligibleIdSet.has(id))));
    return true;
  };

  const handleToggleSpecStatus = (productId, specId, nextStatus) => {
    applySpecStatusChange(productId, [specId], nextStatus);
  };

  const handleBatchToggleSpecs = (productId, nextStatus) => {
    applySpecStatusChange(productId, selectedSpecIdsByProduct[productId] || [], nextStatus, true);
  };

  const handleCreateSave = () => {
    const nextProductFieldErrorsByProduct = {};
    const missingLabels = [];
    let hasMissingFlashPrice = false;
    let hasMissingTotalLimit = false;
    let hasMissingActivityStock = false;

    selectedProducts.forEach((product) => {
      const productFieldEditModes = productFieldEditModesByProduct?.[product.id] || initialProductFieldEditModes;
      const flashPriceDisplay = productFieldEditModes.flashPrice && hasSpecLevelFlashPrice(product) ? product.flashPrice : getProductFlashPriceDisplay(product);
      const totalLimitDisplay = getProductTotalLimitInputValue(product, isAnySpecialPricePage(currentMarketingPage));
      const activityStockDisplay = hasSpecLevelActivityStock(product) ? getProductActivityStockDisplay(product) : product.activityStock;

      if (!hasValue(flashPriceDisplay)) {
        hasMissingFlashPrice = true;
        nextProductFieldErrorsByProduct[product.id] = {
          ...(nextProductFieldErrorsByProduct[product.id] || {}),
          flashPrice: true
        };
      }

      if (!hasValue(totalLimitDisplay)) {
        hasMissingTotalLimit = true;
        nextProductFieldErrorsByProduct[product.id] = {
          ...(nextProductFieldErrorsByProduct[product.id] || {}),
          totalLimit: true
        };
      }

      if (!hasValue(activityStockDisplay)) {
        hasMissingActivityStock = true;
        nextProductFieldErrorsByProduct[product.id] = {
          ...(nextProductFieldErrorsByProduct[product.id] || {}),
          activityStock: true
        };
      }
    });

    if (hasMissingFlashPrice) missingLabels.push("商品限时价");
    if (hasMissingTotalLimit) missingLabels.push("总限购数量");
    if (hasMissingActivityStock) missingLabels.push("总活动库存");

    if (missingLabels.length > 0) {
      updateCurrentField("productFieldErrorsByProduct", nextProductFieldErrorsByProduct);
      setToastMessage(`${missingLabels.join("、")}为空，请检查`);
      return;
    }

    updateCurrentField("productFieldErrorsByProduct", {});
  };

  const handleActivityAction = (action, activity) => {
    if (action === "编辑") {
      closeAllCreateOverlays();
      setIsEditMode(true);
      updateCurrentMarketingState((current) => ({
        ...current,
        detailActivity: null,
        createForm: {
          ...initialCreateForm,
          activityName: activity.name,
          category: activityCategories[0],
          startTime: activity.startTime,
          endTime: activity.endTime
        },
        pickerFilters: { ...initialPickerFilters },
        selectedProducts: createEditProducts(activity, currentMarketingPage),
        selectedGoodsIds: [],
        selectedPickerProductIds: [],
        selectedSpecIdsByProduct: {},
        productFieldEditModesByProduct: {},
        productFieldErrorsByProduct: {}
      }));
      setIsCreating(true);
      return;
    }

    if (action !== "查看") return;

    setDetailSpecProduct(null);
    updateCurrentMarketingState((current) => ({
      ...current,
      detailActivity: createDetailActivity(currentMarketingPage, activity),
      detailPage: 1
    }));
  };

  const handleSwitchMarketingPage = (pageName) => {
    setActivePortalPage("admin");
    setActiveSection("marketing");
    setCurrentMarketingPage(pageName);
    setIsCreating(false);
    setIsEditMode(false);
    setDetailSpecProduct(null);
    setActiveSpecProductId("");
    closeAllCreateOverlays();
    setMarketingStates((current) => ({
      ...current,
      [pageName]: {
        ...(current[pageName] || createInitialMarketingPageState(pageName)),
        detailActivity: null,
        detailPage: 1
      }
    }));
  };

  const handleSwitchHomePage = () => {
    setActivePortalPage("admin");
    setActiveSection("home");
    setShopInvoiceEntryPreset({
      statusTab: "全部",
      markerFilter: "全部",
      requestId: 0
    });
    setEditingBuyer(null);
    setIsAddBuyerOpen(false);
    setIsCreating(false);
    setIsEditMode(false);
    setDetailSpecProduct(null);
    setToastMessage("");
    closeAllCreateOverlays();
  };

  const handleSwitchBuyerPage = (pageName) => {
    setActivePortalPage("admin");
    setActiveSection("buyer");
    setShopInvoiceEntryPreset({
      statusTab: "全部",
      markerFilter: "全部",
      requestId: 0
    });
    setActiveBuyerPage(pageName);
    setBuyerPage(1);
    setEditingBuyer(null);
    setIsAddBuyerOpen(false);
    setIsCreating(false);
    setIsEditMode(false);
    setDetailSpecProduct(null);
    setToastMessage("");
    closeAllCreateOverlays();
  };

  const handleSwitchShopPage = (pageName) => {
    setActivePortalPage("admin");
    setActiveSection("shop");
    setActiveShopPage(pageName);
    setActiveShopTab("发票管理");
    setShopInvoiceEntryPreset({
      statusTab: "全部",
      markerFilter: "全部",
      requestId: 0
    });
    setEditingBuyer(null);
    setIsAddBuyerOpen(false);
    setIsCreating(false);
    setIsEditMode(false);
    setDetailSpecProduct(null);
    setToastMessage("");
    closeAllCreateOverlays();
  };

  const handleHomeInvoiceAlertAction = () => {
    dismissHomeInvoiceAlert();
    handleSwitchShopPage("发票管理");
  };

  const handleOpenDashboardInvoiceTodo = ({ targetStatusTab = "待开票", targetMarkerFilter = "全部" }) => {
    setActivePortalPage("admin");
    setActiveSection("shop");
    setActiveShopPage("发票管理");
    setActiveShopTab("发票管理");
    setShopInvoiceEntryPreset((current) => ({
      statusTab: targetStatusTab,
      markerFilter: targetMarkerFilter,
      requestId: current.requestId + 1
    }));
    setEditingBuyer(null);
    setIsAddBuyerOpen(false);
    setIsCreating(false);
    setIsEditMode(false);
    setDetailSpecProduct(null);
    setToastMessage("");
    closeAllCreateOverlays();
  };

  const handleBuyerActionClick = (actionLabel, buyer) => {
    if (actionLabel === "新增买家") {
      setEditingBuyer(null);
      setNewBuyerForm(initialNewBuyerForm);
      setNewBuyerDiscountInvalid(false);
      setIsAddBuyerOpen(true);
      return;
    }

    if (actionLabel === "批量导入买家") {
      setEditingBuyer(null);
      setIsAddBuyerOpen(false);
      setActiveBuyerPage("导入买家");
      setToastMessage("");
      return;
    }

    if (actionLabel === "编辑买家" && buyer) {
      setIsAddBuyerOpen(false);
      setEditingBuyer(buyer);
      setBuyerEditForm({
        identity: buyer.identity || "",
        group: buyer.group || "",
        discount: buyer.discount || ""
      });
      setBuyerEditDiscountInvalid(false);
      return;
    }

    setToastMessage(`${actionLabel}功能已按截图位置复刻，后续可继续接真实接口。`);
  };

  const handleSaveBuyerEdit = () => {
    if (!editingBuyer) return;
    if (!buyerEditForm.group.trim()) {
      setToastMessage("请选择买家分组");
      return;
    }
    if (!isValidBuyerDiscount(buyerEditForm.discount)) {
      setBuyerEditDiscountInvalid(true);
      setToastMessage("买家折扣仅支持 5~10 之间的数字，最多保留两位小数");
      return;
    }

    setBuyerEditDiscountInvalid(false);
    setBuyerRows((current) => current.map((item) => (
      item.id === editingBuyer.id
        ? { ...item, identity: buyerEditForm.identity, group: buyerEditForm.group, discount: buyerEditForm.discount }
        : item
    )));
    setEditingBuyer(null);
    setToastMessage("");
  };

  const handleSaveNewBuyer = () => {
    const buyerIds = newBuyerForm.buyerIds
      .split(/[,\n，]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (buyerIds.length === 0) {
      setToastMessage("请输入买家ID");
      return;
    }

    if (!newBuyerForm.group.trim()) {
      setToastMessage("请选择所属分组");
      return;
    }
    if (!isValidBuyerDiscount(newBuyerForm.discount)) {
      setNewBuyerDiscountInvalid(true);
      setToastMessage("买家折扣仅支持 5~10 之间的数字，最多保留两位小数");
      return;
    }

    setNewBuyerDiscountInvalid(false);
    const createdAt = new Date().toLocaleString("sv-SE", { hour12: false }).replace(" ", " ");
    const existingIds = new Set(buyerRows.map((item) => item.id));
    const nextRows = buyerIds
      .filter((id) => !existingIds.has(id))
      .map((id, index) => ({
        id,
        account: `buyer_${id}`,
        accountType: "默认账号",
        identity: "",
        group: newBuyerForm.group,
        discount: newBuyerForm.discount,
        createdAt,
        status: "正常",
        sortKey: `${createdAt}-${index}`
      }));

    if (nextRows.length === 0) {
      setToastMessage("输入的买家ID已存在");
      return;
    }

    setBuyerRows((current) => [...nextRows, ...current]);
    setIsAddBuyerOpen(false);
    setNewBuyerForm(initialNewBuyerForm);
    setBuyerPage(1);
    setToastMessage("");
  };

  const handleBuyerImportFileChange = (event) => {
    const [file] = event.target.files || [];
    setBuyerImportResult(null);
    setBuyerImportFile(file || null);
    setBuyerImportFileName(file ? file.name : "");
  };

  const handleChooseBuyerImportFile = async () => {
    const supportsNativePicker = typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";

    if (supportsNativePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: true,
          startIn: "desktop",
          types: [
            {
              description: "Excel 文件",
              accept: {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
              }
            }
          ]
        });
        const file = await handle.getFile();
        setBuyerImportResult(null);
        setBuyerImportFile(file || null);
        setBuyerImportFileName(file?.name || "");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    if (buyerImportInputRef.current) {
      buyerImportInputRef.current.value = "";
      buyerImportInputRef.current.click();
    }
  };

  const handleImportBuyers = async () => {
    if (!buyerImportFile) {
      setToastMessage("请先选择xlsx文件");
      return;
    }

    try {
      const fileBuffer = await buyerImportFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        setToastMessage("导入文件解析失败，请确认模板内容");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });
      const dataRows = rows.slice(buyerImportHeaderRowIndex).filter((row) => !isBuyerImportRowEmpty(row));
      const existingIds = new Set(buyerRows.map((item) => String(item.id)));
      const importedIds = new Set();
      const createdAt = new Date().toLocaleString("sv-SE", { hour12: false }).replace(" ", " ");
      const successRows = [];
      let failureCount = 0;

      dataRows.forEach((row, index) => {
        const result = validateBuyerImportRow(row, existingIds, importedIds);
        if (!result.isValid) {
          failureCount += 1;
          return;
        }

        importedIds.add(result.buyerId);
        successRows.push({
          id: result.buyerId,
          account: `buyer_${result.buyerId}`,
          accountType: "默认账号",
          identity: result.identity,
          group: result.group,
          discount: result.discount,
          createdAt,
          status: "正常",
          sortKey: `${createdAt}-import-${index}`
        });
      });

      if (successRows.length > 0) {
        setBuyerRows((current) => [...successRows, ...current]);
        setBuyerPage(1);
      }

      setBuyerImportResult({
        successCount: successRows.length,
        failureCount
      });
      setToastMessage("");
    } catch (error) {
      setToastMessage("导入文件解析失败，请上传正确的xlsx模板");
    }
  };

  const handleCloseBuyerImportResult = () => {
    setBuyerImportResult(null);
  };

  const handleConfirmBuyerImportResult = () => {
    if (buyerImportResult?.successCount > 0) {
      setActiveBuyerPage("买家列表");
    }
    setBuyerImportResult(null);
  };

  const handleTopActionClick = (actionKey) => {
    if (actionKey === "platform-center") {
      setActivePortalPage("platform-center");
      setToastMessage("");
      return;
    }

    if (actionKey === "pc-mall") {
      setActivePortalPage("buyer-pc-mall");
      setToastMessage("");
      return;
    }

    if (actionKey === "supplier-admin") {
      setActivePortalPage("admin");
      setToastMessage("");
      return;
    }

    if (actionKey === "operations-admin") {
      setActivePortalPage("platform-center");
      setPlatformCenterPage("home");
      setToastMessage("");
      return;
    }

    if (actionKey === "supplier-admin") {
      setActivePortalPage("admin");
      handleSwitchHomePage();
      setToastMessage("");
      return;
    }

    if (actionKey === "miniapp-mall") {
      setActivePortalPage("miniapp-mall");
      setToastMessage("");
      return;
    }

    if (actionKey === "service" || actionKey === "todo" || actionKey === "export" || actionKey === "logout") {
      const actionLabelMap = { service: "在线客服", todo: "我的待办", export: "导出记录", logout: "退出登录" };
      setToastMessage(`${actionLabelMap[actionKey]}功能已保留入口，后续可继续接真实逻辑。`);
    }
  };

  if (activePortalPage === "buyer-pc-mall") {
    return <BuyerPcMallPage onPortalActionClick={handleTopActionClick} />;
  }

  if (activePortalPage === "miniapp-mall") {
    return <BuyerMiniAppMallPage onBackToPcMall={() => setActivePortalPage("buyer-pc-mall")} />;
  }

  if (activePortalPage === "platform-center") {
    const platformCustomTabs = platformCenterPage === "trade-settings" ? [{
      key: "platform-trade-settings",
      label: "交易设置",
      isCurrent: true,
      closable: true,
      onClick: () => setPlatformCenterPage("trade-settings"),
      onClose: () => setPlatformCenterPage("home")
    }] : null;

    return (
      <div className="admin-shell platform-shell">
        <aside className="sidebar platform-sidebar">
          <div className="logo-card platform-logo-card">
            <div className="logo-thumb platform-logo-thumb" />
            <div className="logo-meta">
              <div className="logo-title platform-logo-title">闪电帮帮</div>
              <div className="logo-tag">平台中心版</div>
            </div>
          </div>
          <nav className="sidebar-nav platform-sidebar-nav">
            {platformCenterSidebarItems.map((item) => (
              <div className={`sidebar-group platform-sidebar-group ${(item.key === "home" && platformCenterPage === "home") || (item.key === "trade" && platformCenterPage === "trade-settings") ? "is-active" : ""}`} key={item.key}>
                <a
                  className={`sidebar-link platform-sidebar-link ${(item.key === "home" && platformCenterPage === "home") || (item.key === "trade" && platformCenterPage === "trade-settings") ? "is-active" : ""}`}
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (item.key === "home") setPlatformCenterPage("home");
                  }}
                >
                  <span className="sidebar-icon"><SidebarIcon type={item.icon} /></span>
                  <span className="sidebar-text">{item.label}</span>
                  {item.badge ? <span className="sidebar-badge platform-sidebar-badge">{item.badge}</span> : null}
                </a>
                {item.children?.length ? (
                  <div className="sidebar-subnav platform-sidebar-subnav">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        className={`sidebar-sublink platform-sidebar-sublink ${platformCenterPage === child.key ? "is-active" : ""}`}
                        onClick={() => setPlatformCenterPage(child.key)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </aside>

        <section className="workspace platform-workspace">
          <Header
            currentMarketingPage={platformCenterPage === "trade-settings" ? "交易设置" : "控制台"}
            homeTabLabel="控制台"
            onTopActionClick={handleTopActionClick}
            topActionItems={platformTopActions}
            customTabs={platformCustomTabs}
          />
          <main className="workspace-main platform-workspace-main">
            {platformCenterPage === "trade-settings" ? <PlatformTradeSettingsPage /> : <PlatformCenterPage />}
          </main>
        </section>
      </div>
    );
  }

  const shopHeaderTabs = isShopSection ? [
    {
      key: "shop-invoice-management",
      label: "发票管理",
      isCurrent: activeShopTab === "发票管理",
      onClick: () => setActiveShopTab("发票管理")
    },
    ...(activeShopTab === "订单信息" ? [{
      key: "shop-order-info",
      label: "订单信息",
      isCurrent: true,
      closable: true,
      onClick: () => setActiveShopTab("订单信息"),
      onClose: () => setActiveShopTab("发票管理")
    }] : []),
    ...(activeShopTab === "发票信息" ? [{
      key: "shop-invoice-info",
      label: "发票详情",
      isCurrent: true,
      closable: true,
      onClick: () => setActiveShopTab("发票信息"),
      onClose: () => setActiveShopTab("发票管理")
    }] : []),
    ...(activeShopTab === "历史操作" ? [{
      key: "shop-invoice-history",
      label: "历史操作",
      isCurrent: true,
      closable: true,
      onClick: () => setActiveShopTab("历史操作"),
      onClose: () => setActiveShopTab("发票管理")
    }] : [])
  ] : null;

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-card"><div className="logo-thumb" /><div className="logo-meta"><div className="logo-title">闪电帮帮</div><div className="logo-tag">供应商后台</div></div></div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            if (!item.children) {
              const isHomeMenu = item.label === "首页";
              const isActiveLink = isHomeMenu && isHomeSection;

              return (
                <a
                  className={`sidebar-link ${isActiveLink ? "is-active" : ""}`}
                  href="#"
                  key={item.label}
                  onClick={(event) => {
                    if (!isHomeMenu) return;
                    event.preventDefault();
                    handleSwitchHomePage();
                  }}
                >
                  <span className="sidebar-icon"><SidebarIcon type={item.icon} /></span>
                  <span className="sidebar-text">{item.label}</span>
                  {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                </a>
              );
            }

            const isBuyerMenu = item.label === "买家";
            const isShopMenu = item.label === "店铺";
            const activeParent = isBuyerMenu ? isBuyerSection : isShopMenu ? isShopSection : isMarketingSection && item.label === "营销";
            const handleParentClick = isBuyerMenu
              ? () => handleSwitchBuyerPage(item.children[0])
              : isShopMenu
                ? () => handleSwitchShopPage(item.children[0])
                : undefined;

            return (
              <div className={`sidebar-group ${activeParent ? "is-active" : ""}`} key={item.label}>
                <a
                  className={`sidebar-link ${activeParent ? "is-active" : ""}`}
                  href="#"
                  onClick={(event) => {
                    if (!handleParentClick) return;
                    event.preventDefault();
                    handleParentClick();
                  }}
                >
                  <span className="sidebar-icon"><SidebarIcon type={item.icon} /></span>
                  <span className="sidebar-text">{item.label}</span>
                  {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                </a>
                <div className="sidebar-subnav">
                  {item.children.map((child) => {
                    const isActiveChild = isBuyerMenu
                      ? activeBuyerPage === child && isBuyerSection
                      : isShopMenu
                        ? activeShopPage === child && isShopSection
                        : currentMarketingPage === child && isMarketingSection;
                    const handleClick = isBuyerMenu
                      ? () => handleSwitchBuyerPage(child)
                      : isShopMenu
                        ? () => handleSwitchShopPage(child)
                        : () => handleSwitchMarketingPage(child);

                    return (
                      <button className={`sidebar-sublink ${isActiveChild ? "is-active" : ""}`} key={child} type="button" onClick={handleClick}>
                        {child}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <Header currentMarketingPage={currentPageTitle} specialCreateTab={isMarketingSection && isCreating && (isPrimarySpecialPricePage(currentMarketingPage) || isSecondarySpecialPricePage(currentMarketingPage)) ? "新增专享价" : ""} onTopActionClick={handleTopActionClick} customTabs={shopHeaderTabs} />
        <main className="workspace-main">
          {isHomeSection ? (
            <SupplierDashboardPage onOpenInvoiceTodo={handleOpenDashboardInvoiceTodo} />
          ) : isBuyerSection ? (
            activeBuyerPage === "导入买家" ? (
              <BuyerImportPage
                onBack={() => setActiveBuyerPage("买家列表")}
                fileName={buyerImportFileName}
                fileInputRef={buyerImportInputRef}
                onChooseFile={handleChooseBuyerImportFile}
                onFileChange={handleBuyerImportFileChange}
                onImport={handleImportBuyers}
              />
            ) : (
              <BuyerListPage
                filters={buyerFilters}
                onFiltersChange={setBuyerFilters}
                rows={buyerRows}
                page={buyerPage}
                setPage={setBuyerPage}
                pageSize={buyerPageSize}
                setPageSize={setBuyerPageSize}
                expanded={buyerExpanded}
                onToggleExpanded={() => setBuyerExpanded((value) => !value)}
                onActionClick={handleBuyerActionClick}
              />
            )
          ) : isShopSection ? (
            <ShopInvoicePage
              activeShopTab={activeShopTab}
              initialInvoiceStatusTab={shopInvoiceEntryPreset.statusTab}
              initialMarkerFilter={shopInvoiceEntryPreset.markerFilter}
              invoiceEntryRequestId={shopInvoiceEntryPreset.requestId}
              onOpenOrderInfoTab={() => setActiveShopTab("订单信息")}
              onCloseOrderInfoTab={() => setActiveShopTab("发票管理")}
              onOpenInvoiceInfoTab={() => setActiveShopTab("发票信息")}
              onCloseInvoiceInfoTab={() => setActiveShopTab("发票管理")}
              onOpenInvoiceHistoryTab={() => setActiveShopTab("历史操作")}
              onCloseInvoiceHistoryTab={() => setActiveShopTab("发票管理")}
            />
          ) : (
            <>
              {!(isPrimarySpecialPricePage(currentMarketingPage) || isSecondarySpecialPricePage(currentMarketingPage)) ? <TabSection creating={isCreating} detailing={!isCreating && !!detailActivity} currentMarketingPage={currentMarketingPage} onSwitchToList={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); updateCurrentField("detailActivity", null); }} /> : null}
              {isCreating ? (isPrimarySpecialPricePage(currentMarketingPage) ? <SpecialPriceCreatePage form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : isSecondarySpecialPricePage(currentMarketingPage) ? <SpecialPrice2CreatePage form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : <CreatePage pageName={currentMarketingPage} form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} />) : detailActivity ? <DetailPage detailActivity={detailActivity} page={detailPage} setPage={(value) => updateCurrentField("detailPage", typeof value === "function" ? value(detailPage) : value)} pageSize={detailPageSize} setPageSize={(value) => updateCurrentField("detailPageSize", value)} onShowSpecDetail={setDetailSpecProduct} /> : <ListPage pageName={currentMarketingPage} filters={filters} setFilters={(value) => updateCurrentField("filters", value)} page={page} setPage={(value) => updateCurrentField("page", typeof value === "function" ? value(page) : value)} pageSize={pageSize} setPageSize={(value) => updateCurrentField("pageSize", value)} onCreate={() => { resetCreateState(); setIsCreating(true); updateCurrentField("detailActivity", null); }} onAction={handleActivityAction} activities={activities} />}
            </>
          )}
        </main>
      </section>

      {isMarketingSection && isCreating && isPickerOpen ? <ProductPickerModal filters={pickerFilters} setFilters={(value) => updateCurrentField("pickerFilters", value)} selectedProductIds={selectedPickerProductIds} onToggleProduct={handleTogglePickerProduct} onSave={handleSavePicker} onClose={() => setIsPickerOpen(false)} confirmText={currentMarketingPage === "限时购" ? "下一步" : "保存"} /> : null}
      {isMarketingSection && isCreating && isSpecOpen ? (isPrimarySpecialPricePage(currentMarketingPage) ? <SpecialPriceSpecPickerModal product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} /> : isSecondarySpecialPricePage(currentMarketingPage) ? <SpecialPrice2SpecPickerModal product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} /> : <SpecPickerModal pageName={currentMarketingPage} product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} />) : null}
      {isMarketingSection && isCreating && isBatchSpecOpen && currentMarketingPage === "限时购" ? <BatchSpecStepModal products={batchSpecDraftProducts} selectedSpecIdsByProduct={batchSpecSelectedIdsByProduct} onToggleSpecSelection={handleBatchDraftToggleSpecSelection} onToggleAllSpecs={handleBatchDraftToggleAllSpecs} onBatchToggleSpecs={handleBatchDraftToggleSpecs} onClose={handleCloseBatchSpec} onSave={handleBatchSpecSave} onUpdateProductLimit={handleBatchDraftProductLimit} onUpdateProductActivityStock={handleBatchDraftProductActivityStock} onUpdateSpecField={handleBatchDraftSpecField} onToggleSpecStatus={handleBatchDraftToggleSpecStatus} onShowToast={setToastMessage} /> : null}
      {isMarketingSection && !isCreating && detailSpecProduct ? <DetailSpecModal product={detailSpecProduct} onClose={() => setDetailSpecProduct(null)} /> : null}
      {isBuyerSection ? <AddBuyerModal open={isAddBuyerOpen} groupOptions={buyerGroupOptions} form={newBuyerForm} discountInvalid={newBuyerDiscountInvalid || isBuyerDiscountInvalid(newBuyerForm.discount)} onFormChange={(updater) => { setNewBuyerDiscountInvalid(false); setNewBuyerForm(updater); }} onClose={() => { setIsAddBuyerOpen(false); setNewBuyerDiscountInvalid(false); }} onSave={handleSaveNewBuyer} /> : null}
      {isBuyerSection ? <EditBuyerModal buyer={editingBuyer} groupOptions={buyerGroupOptions} form={buyerEditForm} discountInvalid={buyerEditDiscountInvalid || isBuyerDiscountInvalid(buyerEditForm.discount)} onFormChange={(updater) => { setBuyerEditDiscountInvalid(false); setBuyerEditForm(updater); }} onClose={() => { setEditingBuyer(null); setBuyerEditDiscountInvalid(false); }} onSave={handleSaveBuyerEdit} /> : null}
      {isBuyerSection ? <BuyerImportResultModal result={buyerImportResult} onClose={handleCloseBuyerImportResult} onConfirm={handleConfirmBuyerImportResult} /> : null}
      {activePortalPage === "admin" && isHomeSection && showHomeInvoiceAlert ? (
        <div className="home-invoice-alert-overlay" onClick={dismissHomeInvoiceAlert} role="presentation">
          <div
            className="home-invoice-alert-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-invoice-alert-title"
          >
            <p className="home-invoice-alert-message" id="home-invoice-alert-title">
              当前有 <strong>10</strong> 笔订单开票申请已超时，请及时处理!
            </p>
            <button className="home-invoice-alert-action" type="button" onClick={handleHomeInvoiceAlertAction}>立即处理</button>
          </div>
        </div>
      ) : null}
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}

















