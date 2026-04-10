import { useEffect, useMemo, useState } from "react";

import { useRef } from "react";
import * as XLSX from "xlsx";

const buyerPageNames = ["买家列表"];
const menuItems = [
  { label: "首页", icon: "home" },
  { label: "商品", icon: "goods" },
  { label: "交易", icon: "trade" },
  { label: "买家", icon: "buyer", children: buyerPageNames },
  { label: "店铺", icon: "shop", badge: "2" },
  { label: "系统", icon: "system" },
  { label: "统计", icon: "stats" },
  { label: "营销", icon: "marketing", children: ["专享价", "专享价2", "限时购1", "限时购"] },
  { label: "小程序", icon: "miniapp" },
  { label: "客服", icon: "service" }
];

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
function Header({ currentMarketingPage, specialCreateTab }) {
  const pendingCount = 24;
  return (
    <header className="workspace-topbar">
      <div className="page-tabs">
        <div className="page-tab">首页-控制台 <span>×</span></div>
        <div className="page-tab is-current">{currentMarketingPage} <span>×</span></div>
        {specialCreateTab ? <div className="page-tab is-current">{specialCreateTab} <span>×</span></div> : null}
      </div>
      <div className="top-actions">
        <a href="#"><span className="top-action-icon">☺</span>在线客服</a>
        <a href="#" className="top-action-with-badge"><span className="top-action-icon">▣</span>我的待办<em>{pendingCount}</em></a>
        <a href="#"><span className="top-action-icon">⌁</span>导出记录</a>
        <a href="#"><span className="top-action-icon">◦</span>退出登录</a>
      </div>
    </header>
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

export default function App() {
  const [activeSection, setActiveSection] = useState("marketing");
  const [activeBuyerPage, setActiveBuyerPage] = useState("买家列表");
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
  const [currentMarketingPage, setCurrentMarketingPage] = useState("专享价");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isBatchSpecOpen, setIsBatchSpecOpen] = useState(false);
  const [detailSpecProduct, setDetailSpecProduct] = useState(null);
  const [activeSpecProductId, setActiveSpecProductId] = useState("");
  const [batchSpecDraftProducts, setBatchSpecDraftProducts] = useState([]);
  const [batchSpecSelectedIdsByProduct, setBatchSpecSelectedIdsByProduct] = useState({});
  const [marketingStates, setMarketingStates] = useState(createInitialMarketingStates);
  const [toastMessage, setToastMessage] = useState("");
  const isBuyerSection = activeSection === "buyer";
  const currentPageTitle = isBuyerSection ? activeBuyerPage : currentMarketingPage;
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

  const handleSwitchBuyerPage = (pageName) => {
    setActiveSection("buyer");
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

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-card"><div className="logo-thumb" /><div className="logo-meta"><div className="logo-title">闪电帮帮</div><div className="logo-tag">供应商后台</div></div></div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            if (!item.children) {
              return (
                <a className="sidebar-link" href="#" key={item.label}>
                  <span className="sidebar-icon"><SidebarIcon type={item.icon} /></span>
                  <span className="sidebar-text">{item.label}</span>
                  {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                </a>
              );
            }

            const isBuyerMenu = item.label === "买家";
            const activeParent = isBuyerMenu ? isBuyerSection : !isBuyerSection && item.label === "营销";

            return (
              <div className={`sidebar-group ${activeParent ? "is-active" : ""}`} key={item.label}>
                <a className={`sidebar-link ${activeParent ? "is-active" : ""}`} href="#">
                  <span className="sidebar-icon"><SidebarIcon type={item.icon} /></span>
                  <span className="sidebar-text">{item.label}</span>
                </a>
                <div className="sidebar-subnav">
                  {item.children.map((child) => {
                    const isActiveChild = isBuyerMenu ? activeBuyerPage === child && isBuyerSection : currentMarketingPage === child && !isBuyerSection;
                    const handleClick = isBuyerMenu ? () => handleSwitchBuyerPage(child) : () => handleSwitchMarketingPage(child);

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
        <Header currentMarketingPage={currentPageTitle} specialCreateTab={!isBuyerSection && isCreating && (isPrimarySpecialPricePage(currentMarketingPage) || isSecondarySpecialPricePage(currentMarketingPage)) ? "新增专享价" : ""} />
        <main className="workspace-main">
          {isBuyerSection ? (
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
          ) : (
            <>
              {!(isPrimarySpecialPricePage(currentMarketingPage) || isSecondarySpecialPricePage(currentMarketingPage)) ? <TabSection creating={isCreating} detailing={!isCreating && !!detailActivity} currentMarketingPage={currentMarketingPage} onSwitchToList={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); updateCurrentField("detailActivity", null); }} /> : null}
              {isCreating ? (isPrimarySpecialPricePage(currentMarketingPage) ? <SpecialPriceCreatePage form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : isSecondarySpecialPricePage(currentMarketingPage) ? <SpecialPrice2CreatePage form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : <CreatePage pageName={currentMarketingPage} form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} productFieldEditModesByProduct={productFieldEditModesByProduct || {}} productFieldErrorsByProduct={productFieldErrorsByProduct || {}} onToggleProductFieldEditMode={handleToggleProductFieldEditMode} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} />) : detailActivity ? <DetailPage detailActivity={detailActivity} page={detailPage} setPage={(value) => updateCurrentField("detailPage", typeof value === "function" ? value(detailPage) : value)} pageSize={detailPageSize} setPageSize={(value) => updateCurrentField("detailPageSize", value)} onShowSpecDetail={setDetailSpecProduct} /> : <ListPage pageName={currentMarketingPage} filters={filters} setFilters={(value) => updateCurrentField("filters", value)} page={page} setPage={(value) => updateCurrentField("page", typeof value === "function" ? value(page) : value)} pageSize={pageSize} setPageSize={(value) => updateCurrentField("pageSize", value)} onCreate={() => { resetCreateState(); setIsCreating(true); updateCurrentField("detailActivity", null); }} onAction={handleActivityAction} activities={activities} />}
            </>
          )}
        </main>
      </section>

      {!isBuyerSection && isCreating && isPickerOpen ? <ProductPickerModal filters={pickerFilters} setFilters={(value) => updateCurrentField("pickerFilters", value)} selectedProductIds={selectedPickerProductIds} onToggleProduct={handleTogglePickerProduct} onSave={handleSavePicker} onClose={() => setIsPickerOpen(false)} confirmText={currentMarketingPage === "限时购" ? "下一步" : "保存"} /> : null}
      {!isBuyerSection && isCreating && isSpecOpen ? (isPrimarySpecialPricePage(currentMarketingPage) ? <SpecialPriceSpecPickerModal product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} /> : isSecondarySpecialPricePage(currentMarketingPage) ? <SpecialPrice2SpecPickerModal product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} /> : <SpecPickerModal pageName={currentMarketingPage} product={activeSpecProduct} productFlashPriceInputMode={activeSpecProductFlashPriceInputMode} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} />) : null}
      {!isBuyerSection && isCreating && isBatchSpecOpen && currentMarketingPage === "限时购" ? <BatchSpecStepModal products={batchSpecDraftProducts} selectedSpecIdsByProduct={batchSpecSelectedIdsByProduct} onToggleSpecSelection={handleBatchDraftToggleSpecSelection} onToggleAllSpecs={handleBatchDraftToggleAllSpecs} onBatchToggleSpecs={handleBatchDraftToggleSpecs} onClose={handleCloseBatchSpec} onSave={handleBatchSpecSave} onUpdateProductLimit={handleBatchDraftProductLimit} onUpdateProductActivityStock={handleBatchDraftProductActivityStock} onUpdateSpecField={handleBatchDraftSpecField} onToggleSpecStatus={handleBatchDraftToggleSpecStatus} onShowToast={setToastMessage} /> : null}
      {!isBuyerSection && !isCreating && detailSpecProduct ? <DetailSpecModal product={detailSpecProduct} onClose={() => setDetailSpecProduct(null)} /> : null}
      {isBuyerSection ? <AddBuyerModal open={isAddBuyerOpen} groupOptions={buyerGroupOptions} form={newBuyerForm} discountInvalid={newBuyerDiscountInvalid || isBuyerDiscountInvalid(newBuyerForm.discount)} onFormChange={(updater) => { setNewBuyerDiscountInvalid(false); setNewBuyerForm(updater); }} onClose={() => { setIsAddBuyerOpen(false); setNewBuyerDiscountInvalid(false); }} onSave={handleSaveNewBuyer} /> : null}
      {isBuyerSection ? <EditBuyerModal buyer={editingBuyer} groupOptions={buyerGroupOptions} form={buyerEditForm} discountInvalid={buyerEditDiscountInvalid || isBuyerDiscountInvalid(buyerEditForm.discount)} onFormChange={(updater) => { setBuyerEditDiscountInvalid(false); setBuyerEditForm(updater); }} onClose={() => { setEditingBuyer(null); setBuyerEditDiscountInvalid(false); }} onSave={handleSaveBuyerEdit} /> : null}
      {isBuyerSection ? <BuyerImportResultModal result={buyerImportResult} onClose={handleCloseBuyerImportResult} onConfirm={handleConfirmBuyerImportResult} /> : null}
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}

















