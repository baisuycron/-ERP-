const STORAGE_KEY = "erp-product-master-data-v1";
const CATEGORY_TREE = [
  { label: "生鲜", children: [{ label: "水果", children: ["苹果", "柑橘", "浆果"] }, { label: "蔬菜", children: ["叶菜", "根茎", "菌菇"] }] },
  { label: "食品", children: [{ label: "休闲零食", children: ["坚果", "饼干", "糖巧"] }, { label: "粮油调味", children: ["大米", "食用油", "调味品"] }] },
  { label: "日用百货", children: [{ label: "清洁洗护", children: ["洗衣液", "纸品", "个人护理"] }, { label: "家庭用品", children: ["收纳", "厨具", "一次性用品"] }] },
];
const BRAND_OPTIONS = ["盒马工坊", "三拳优选", "城市鲜选", "日日鲜", "云仓甄选"];
const UNIT_OPTIONS = ["件", "盒", "箱", "袋", "瓶", "公斤"];
const SUPPLIERS = ["华东生鲜供应链", "甄选食品工厂", "城配中心", "云仓统配", "零售品牌商"];

const state = { products: [], selectedIds: new Set(), drawerMode: "create", editingId: null };

const elements = {
  summaryCards: document.getElementById("summaryCards"),
  tableBody: document.getElementById("productTableBody"),
  checkAll: document.getElementById("checkAll"),
  drawer: document.getElementById("productDrawer"),
  detailModal: document.getElementById("detailModal"),
  detailContent: document.getElementById("detailContent"),
  form: document.getElementById("productForm"),
  toast: document.getElementById("toast"),
  importInput: document.getElementById("importInput"),
  conversionList: document.getElementById("conversionList"),
  skuList: document.getElementById("skuList"),
};

function byId(id) {
  return document.getElementById(id);
}

function formatTime(value = new Date()) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getSeedProducts() {
  return [
    {
      id: uid("P"),
      code: "SP-FR-0001",
      name: "云南蓝莓礼盒",
      mnemonic: "YNLM",
      brand: "三拳优选",
      category1: "生鲜",
      category2: "水果",
      category3: "浆果",
      taxRate: 9,
      isWeighted: false,
      isBatchManaged: true,
      shelfLifeDays: 7,
      isSerialManaged: false,
      defaultSupplier: "华东生鲜供应链",
      optionalSuppliers: ["华东生鲜供应链", "城配中心"],
      mainUnit: "盒",
      purchaseUnit: "箱",
      salesUnit: "盒",
      deliveryUnit: "箱",
      prices: { retailPrice: 39.9, memberPrice: 35.9, purchasePrice: 24.5, costPrice: 26.8 },
      conversions: [{ id: uid("CV"), fromUnit: "箱", toUnit: "盒", ratio: 12 }, { id: uid("CV"), fromUnit: "盒", toUnit: "盒", ratio: 1 }],
      skus: [{ id: uid("SKU"), code: "SP-FR-0001-01", name: "云南蓝莓礼盒 125g*4", spec: "125g*4", barcodes: [{ id: uid("BC"), code: "6901234567801", unit: "盒", primary: true }, { id: uid("BC"), code: "6901234567802", unit: "箱", primary: false }] }],
      status: "已启用",
      createdBy: "系统管理员",
      createdAt: formatTime(Date.now() - 86400000 * 3),
      updatedBy: "系统管理员",
      updatedAt: formatTime(Date.now() - 3600000 * 4),
      logs: ["创建商品资料", "维护SKU和条码", "校验通过后默认启用"],
    },
    {
      id: uid("P"),
      code: "FD-SN-0007",
      name: "坚果综合分享装",
      mnemonic: "JGZH",
      brand: "盒马工坊",
      category1: "食品",
      category2: "休闲零食",
      category3: "坚果",
      taxRate: 13,
      isWeighted: false,
      isBatchManaged: true,
      shelfLifeDays: 180,
      isSerialManaged: false,
      defaultSupplier: "甄选食品工厂",
      optionalSuppliers: ["甄选食品工厂"],
      mainUnit: "袋",
      purchaseUnit: "箱",
      salesUnit: "袋",
      deliveryUnit: "箱",
      prices: { retailPrice: 29.9, memberPrice: 27.5, purchasePrice: 14.2, costPrice: 16 },
      conversions: [{ id: uid("CV"), fromUnit: "箱", toUnit: "袋", ratio: 24 }, { id: uid("CV"), fromUnit: "袋", toUnit: "袋", ratio: 1 }],
      skus: [
        { id: uid("SKU"), code: "FD-SN-0007-01", name: "坚果综合分享装 500g", spec: "500g", barcodes: [{ id: uid("BC"), code: "6909876543210", unit: "袋", primary: true }] },
        { id: uid("SKU"), code: "FD-SN-0007-02", name: "坚果综合分享装 1000g", spec: "1000g", barcodes: [{ id: uid("BC"), code: "", unit: "袋", primary: true }] },
      ],
      status: "已停用",
      createdBy: "商品专员",
      createdAt: formatTime(Date.now() - 86400000 * 8),
      updatedBy: "商品专员",
      updatedAt: formatTime(Date.now() - 86400000),
      logs: ["创建商品资料", "因促销结束执行停用"],
    },
    {
      id: uid("P"),
      code: "DY-QJ-0012",
      name: "植萃洗衣液",
      mnemonic: "ZCXYY",
      brand: "云仓甄选",
      category1: "日用百货",
      category2: "清洁洗护",
      category3: "洗衣液",
      taxRate: 13,
      isWeighted: false,
      isBatchManaged: false,
      shelfLifeDays: "",
      isSerialManaged: false,
      defaultSupplier: "零售品牌商",
      optionalSuppliers: ["零售品牌商", "云仓统配"],
      mainUnit: "瓶",
      purchaseUnit: "箱",
      salesUnit: "瓶",
      deliveryUnit: "箱",
      prices: { retailPrice: 49.9, memberPrice: 45.9, purchasePrice: 28, costPrice: 31.5 },
      conversions: [{ id: uid("CV"), fromUnit: "箱", toUnit: "瓶", ratio: 8 }, { id: uid("CV"), fromUnit: "瓶", toUnit: "瓶", ratio: 1 }],
      skus: [{ id: uid("SKU"), code: "DY-QJ-0012-01", name: "植萃洗衣液 2kg", spec: "2kg", barcodes: [{ id: uid("BC"), code: "6923456700008", unit: "瓶", primary: true }] }],
      status: "已启用",
      createdBy: "门店运营",
      createdAt: formatTime(Date.now() - 86400000 * 15),
      updatedBy: "财务",
      updatedAt: formatTime(Date.now() - 86400000 * 2),
      logs: ["创建商品资料", "更新价格策略"],
    },
  ];
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  state.products = raw ? JSON.parse(raw) : getSeedProducts();
  saveProducts();
}

function populateSelect(select, options, placeholder, allowEmpty = true) {
  select.innerHTML = "";
  if (allowEmpty) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function category2Options(category1) {
  const node = CATEGORY_TREE.find((item) => item.label === category1);
  return node ? node.children.map((item) => item.label) : [];
}

function category3Options(category1, category2) {
  const node = CATEGORY_TREE.find((item) => item.label === category1);
  const level2 = node?.children.find((item) => item.label === category2);
  return level2 ? level2.children : [];
}

function syncCategories(prefix) {
  const fieldMap = prefix === "filter"
    ? { c1: "filterCategory1", c2: "filterCategory2", c3: "filterCategory3" }
    : { c1: "category1", c2: "category2", c3: "category3" };
  const c1 = byId(fieldMap.c1).value;
  const c2 = byId(fieldMap.c2);
  const c3 = byId(fieldMap.c3);
  const current2 = c2.value;
  populateSelect(c2, category2Options(c1), prefix === "filter" ? "全部" : "请选择二级分类", prefix === "filter");
  if (category2Options(c1).includes(current2)) c2.value = current2;
  const current3 = c3.value;
  populateSelect(c3, category3Options(c1, c2.value), prefix === "filter" ? "全部" : "请选择三级分类", prefix === "filter");
  if (category3Options(c1, c2.value).includes(current3)) c3.value = current3;
}

function getAllBarcodes(product) {
  return product.skus.flatMap((sku) => sku.barcodes.filter((barcode) => barcode.code));
}

function statusClass(status) {
  return { 已启用: "status-enabled", 已停用: "status-disabled", 草稿: "status-draft", 已删除: "status-deleted" }[status] || "status-draft";
}

function initSelects() {
  populateSelect(byId("filterBrand"), BRAND_OPTIONS, "全部");
  populateSelect(byId("brand"), BRAND_OPTIONS, "请选择品牌", false);
  populateSelect(byId("filterCategory1"), CATEGORY_TREE.map((item) => item.label), "全部");
  populateSelect(byId("filterCategory2"), [], "全部");
  populateSelect(byId("filterCategory3"), [], "全部");
  populateSelect(byId("category1"), CATEGORY_TREE.map((item) => item.label), "请选择一级分类", false);
  populateSelect(byId("category2"), [], "请选择二级分类", false);
  populateSelect(byId("category3"), [], "请选择三级分类", false);
  populateSelect(byId("mainUnit"), UNIT_OPTIONS, "请选择主单位", false);
  populateSelect(byId("purchaseUnit"), UNIT_OPTIONS, "请选择采购单位", false);
  populateSelect(byId("salesUnit"), UNIT_OPTIONS, "请选择销售单位", false);
  populateSelect(byId("deliveryUnit"), UNIT_OPTIONS, "请选择配送单位", false);
  populateSelect(byId("defaultSupplier"), SUPPLIERS, "请选择默认供应商");
  populateSelect(byId("optionalSuppliers"), SUPPLIERS, "", false);
}

function filteredProducts() {
  const filters = {
    code: byId("filterCode").value.trim(),
    name: byId("filterName").value.trim(),
    mnemonic: byId("filterMnemonic").value.trim().toUpperCase(),
    barcode: byId("filterBarcode").value.trim(),
    brand: byId("filterBrand").value,
    category1: byId("filterCategory1").value,
    category2: byId("filterCategory2").value,
    category3: byId("filterCategory3").value,
    status: byId("filterStatus").value,
    creator: byId("filterCreator").value.trim(),
    batch: byId("filterBatch").value,
    serial: byId("filterSerial").value,
  };

  return state.products
    .filter((item) => {
      if (filters.code && !item.code.includes(filters.code)) return false;
      if (filters.name && !item.name.includes(filters.name)) return false;
      if (filters.mnemonic && !item.mnemonic.includes(filters.mnemonic)) return false;
      if (filters.barcode && !getAllBarcodes(item).some((barcode) => barcode.code.includes(filters.barcode))) return false;
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.category1 && item.category1 !== filters.category1) return false;
      if (filters.category2 && item.category2 !== filters.category2) return false;
      if (filters.category3 && item.category3 !== filters.category3) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.creator && !item.createdBy.includes(filters.creator)) return false;
      if (filters.batch && String(item.isBatchManaged) !== filters.batch) return false;
      if (filters.serial && String(item.isSerialManaged) !== filters.serial) return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderSummary() {
  const activeProducts = state.products.filter((item) => item.status !== "已删除");
  const cards = [
    { title: "商品总数", value: activeProducts.length, meta: `启用 ${activeProducts.filter((item) => item.status === "已启用").length} 个` },
    { title: "停用商品", value: activeProducts.filter((item) => item.status === "已停用").length, meta: "停用后禁止新业务引用" },
    { title: "SKU总数", value: activeProducts.reduce((sum, item) => sum + item.skus.length, 0), meta: "导入导出颗粒度为SKU" },
    { title: "有效条码", value: activeProducts.reduce((sum, item) => sum + getAllBarcodes(item).length, 0), meta: "条码全局唯一" },
    { title: "批次管理商品", value: activeProducts.filter((item) => item.isBatchManaged).length, meta: "支持保质期场景" },
  ];
  elements.summaryCards.innerHTML = cards.map((card) => `<article class="summary-item"><h3>${card.title}</h3><div class="summary-value">${card.value}</div><div class="summary-meta">${card.meta}</div></article>`).join("");
}

function renderTable() {
  const rows = filteredProducts();
  elements.tableBody.innerHTML = "";
  if (!rows.length) {
    elements.tableBody.innerHTML = '<tr><td colspan="12" class="empty">暂无符合条件的数据</td></tr>';
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" data-id="${item.id}" ${state.selectedIds.has(item.id) ? "checked" : ""}></td>
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${item.brand}</td>
      <td>${item.category3}</td>
      <td>${item.mainUnit}</td>
      <td>${item.skus.length}</td>
      <td>${getAllBarcodes(item).length}</td>
      <td><span class="status-chip ${statusClass(item.status)}">${item.status}</span></td>
      <td>${item.createdBy}</td>
      <td>${item.updatedAt}</td>
      <td>
        <div class="table-actions">
          <button class="link-btn" data-action="view" data-id="${item.id}">查看</button>
          <button class="link-btn" data-action="edit" data-id="${item.id}">编辑</button>
          <button class="link-btn" data-action="toggle" data-id="${item.id}">${item.status === "已启用" ? "停用" : "启用"}</button>
          <button class="link-btn danger" data-action="delete" data-id="${item.id}">删除</button>
        </div>
      </td>
    `;
    elements.tableBody.appendChild(row);
  });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add("hidden"), 2200);
}

function resetForm() {
  elements.form.reset();
  byId("productId").value = "";
  byId("taxRate").value = 0;
  byId("retailPrice").value = 0;
  byId("memberPrice").value = 0;
  byId("purchasePrice").value = 0;
  byId("costPrice").value = 0;
  elements.conversionList.innerHTML = "";
  elements.skuList.innerHTML = "";
  syncCategories("");
}

function generateCode() {
  const prefixMap = { 生鲜: "SP", 食品: "FD", 日用百货: "DY" };
  const prefix = prefixMap[byId("category1").value] || "PR";
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

function addConversionRow(row = {}) {
  const card = document.createElement("div");
  card.className = "repeat-card conversion-row";
  card.innerHTML = `
    <div class="inline-grid">
      <label class="field"><span>来源单位 *</span><select class="conversion-from">${UNIT_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}</select></label>
      <label class="field"><span>目标单位 *</span><select class="conversion-to">${UNIT_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}</select></label>
      <label class="field"><span>换算系数 *</span><input class="conversion-ratio" type="number" min="0.000001" step="0.000001" value="${row.ratio || 1}"></label>
      <div class="field"><span>操作</span><button class="btn btn-light remove-conversion-btn" type="button">删除</button></div>
    </div>
  `;
  card.querySelector(".conversion-from").value = row.fromUnit || UNIT_OPTIONS[0];
  card.querySelector(".conversion-to").value = row.toUnit || UNIT_OPTIONS[0];
  card.querySelector(".remove-conversion-btn").addEventListener("click", () => card.remove());
  elements.conversionList.appendChild(card);
}

function refreshSkuTitles() {
  Array.from(elements.skuList.children).forEach((node, index) => {
    node.querySelector(".repeat-card-title").textContent = `SKU ${index + 1}`;
  });
}

function addBarcodeRow(container, barcode = {}) {
  const row = document.createElement("div");
  row.className = "sub-row barcode-row";
  row.innerHTML = `
    <input class="barcode-code" type="text" maxlength="50" placeholder="允许为空，填写则全局唯一" value="${barcode.code || ""}">
    <select class="barcode-unit">${UNIT_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}</select>
    <select class="barcode-primary"><option value="true">主条码</option><option value="false">附属条码</option></select>
    <button class="btn btn-light remove-barcode-btn" type="button">删除</button>
  `;
  row.querySelector(".barcode-unit").value = barcode.unit || byId("mainUnit").value || UNIT_OPTIONS[0];
  row.querySelector(".barcode-primary").value = String(barcode.primary ?? true);
  row.querySelector(".remove-barcode-btn").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function addSkuRow(sku = {}) {
  const card = document.createElement("div");
  card.className = "repeat-card sku-row";
  card.innerHTML = `
    <div class="repeat-card-header">
      <div class="repeat-card-title">SKU ${elements.skuList.children.length + 1}</div>
      <button class="btn btn-light remove-sku-btn" type="button">删除SKU</button>
    </div>
    <div class="inline-grid">
      <label class="field"><span>SKU编码 *</span><input class="sku-code" type="text" maxlength="50" value="${sku.code || ""}"></label>
      <label class="field"><span>SKU名称 *</span><input class="sku-name" type="text" maxlength="200" value="${sku.name || ""}"></label>
      <label class="field"><span>规格属性</span><input class="sku-spec" type="text" maxlength="200" value="${sku.spec || ""}"></label>
      <div class="field"><span>操作</span><button class="btn btn-light add-barcode-btn" type="button">新增条码</button></div>
    </div>
    <div class="sub-list">
      <div class="sub-list-header"><div class="sub-list-title">条码列表</div></div>
      <div class="barcode-list"></div>
    </div>
  `;
  card.querySelector(".remove-sku-btn").addEventListener("click", () => {
    card.remove();
    refreshSkuTitles();
  });
  card.querySelector(".add-barcode-btn").addEventListener("click", () => addBarcodeRow(card.querySelector(".barcode-list")));
  elements.skuList.appendChild(card);
  const barcodeList = card.querySelector(".barcode-list");
  const barcodes = sku.barcodes?.length ? sku.barcodes : [{ code: "", unit: byId("mainUnit").value || UNIT_OPTIONS[0], primary: true }];
  barcodes.forEach((barcode) => addBarcodeRow(barcodeList, barcode));
}

function fillForm(product) {
  byId("productId").value = product.id;
  byId("code").value = product.code;
  byId("name").value = product.name;
  byId("mnemonic").value = product.mnemonic;
  byId("brand").value = product.brand;
  byId("category1").value = product.category1;
  syncCategories("");
  byId("category2").value = product.category2;
  syncCategories("");
  byId("category3").value = product.category3;
  byId("taxRate").value = product.taxRate;
  byId("isWeighted").value = String(product.isWeighted);
  byId("isBatchManaged").value = String(product.isBatchManaged);
  byId("shelfLifeDays").value = product.shelfLifeDays;
  byId("isSerialManaged").value = String(product.isSerialManaged);
  byId("defaultSupplier").value = product.defaultSupplier || "";
  Array.from(byId("optionalSuppliers").options).forEach((option) => {
    option.selected = product.optionalSuppliers.includes(option.value);
  });
  byId("mainUnit").value = product.mainUnit;
  byId("purchaseUnit").value = product.purchaseUnit;
  byId("salesUnit").value = product.salesUnit;
  byId("deliveryUnit").value = product.deliveryUnit;
  byId("retailPrice").value = product.prices.retailPrice;
  byId("memberPrice").value = product.prices.memberPrice;
  byId("purchasePrice").value = product.prices.purchasePrice;
  byId("costPrice").value = product.prices.costPrice;
  product.conversions.forEach(addConversionRow);
  product.skus.forEach(addSkuRow);
}

function openDrawer(mode, product) {
  state.drawerMode = mode;
  state.editingId = product?.id || null;
  byId("drawerTitle").textContent = mode === "create" ? "新建商品" : "编辑商品";
  byId("drawerSubtitle").textContent = mode === "create" ? "按 PRD 规则维护商品、SKU、单位和条码信息" : `当前商品状态：${product.status}`;
  resetForm();
  if (product) {
    fillForm(product);
  } else {
    byId("code").value = generateCode();
    addConversionRow({ fromUnit: "件", toUnit: "件", ratio: 1 });
    addSkuRow({ code: `${byId("code").value}-01`, barcodes: [{ code: "", unit: "件", primary: true }] });
  }
  elements.drawer.classList.remove("hidden");
}

function closeDrawer() {
  elements.drawer.classList.add("hidden");
}

function readFormProduct() {
  const existing = state.products.find((item) => item.id === byId("productId").value);
  const now = formatTime();
  return {
    id: byId("productId").value || uid("P"),
    code: byId("code").value.trim(),
    name: byId("name").value.trim(),
    mnemonic: byId("mnemonic").value.trim().toUpperCase(),
    brand: byId("brand").value,
    category1: byId("category1").value,
    category2: byId("category2").value,
    category3: byId("category3").value,
    taxRate: Number(byId("taxRate").value || 0),
    isWeighted: byId("isWeighted").value === "true",
    isBatchManaged: byId("isBatchManaged").value === "true",
    shelfLifeDays: byId("shelfLifeDays").value.trim(),
    isSerialManaged: byId("isSerialManaged").value === "true",
    defaultSupplier: byId("defaultSupplier").value,
    optionalSuppliers: Array.from(byId("optionalSuppliers").selectedOptions).map((option) => option.value),
    mainUnit: byId("mainUnit").value,
    purchaseUnit: byId("purchaseUnit").value,
    salesUnit: byId("salesUnit").value,
    deliveryUnit: byId("deliveryUnit").value,
    prices: {
      retailPrice: Number(byId("retailPrice").value || 0),
      memberPrice: Number(byId("memberPrice").value || 0),
      purchasePrice: Number(byId("purchasePrice").value || 0),
      costPrice: Number(byId("costPrice").value || 0),
    },
    conversions: Array.from(document.querySelectorAll(".conversion-row")).map((node) => ({
      id: uid("CV"),
      fromUnit: node.querySelector(".conversion-from").value,
      toUnit: node.querySelector(".conversion-to").value,
      ratio: Number(node.querySelector(".conversion-ratio").value),
    })),
    skus: Array.from(document.querySelectorAll(".sku-row")).map((node) => ({
      id: uid("SKU"),
      code: node.querySelector(".sku-code").value.trim(),
      name: node.querySelector(".sku-name").value.trim(),
      spec: node.querySelector(".sku-spec").value.trim(),
      barcodes: Array.from(node.querySelectorAll(".barcode-row")).map((row) => ({
        id: uid("BC"),
        code: row.querySelector(".barcode-code").value.trim(),
        unit: row.querySelector(".barcode-unit").value,
        primary: row.querySelector(".barcode-primary").value === "true",
      })),
    })),
    status: existing?.status || "已启用",
    createdBy: existing?.createdBy || "当前用户",
    createdAt: existing?.createdAt || now,
    updatedBy: "当前用户",
    updatedAt: now,
    logs: [...(existing?.logs || []), existing ? "编辑商品资料" : "创建商品资料"],
  };
}

function validateProduct(product) {
  if (!product.code) return "商品编码不能为空";
  if (!product.name) return "商品名称不能为空";
  if (!product.brand) return "请选择品牌";
  if (!product.category1 || !product.category2 || !product.category3) return "请完整选择三级分类";
  if (!product.mainUnit) return "请选择主单位";
  if (product.isBatchManaged && (!product.shelfLifeDays || Number(product.shelfLifeDays) <= 0)) return "批次管理商品必须填写大于0的保质期";
  if (product.taxRate < 0 || product.taxRate > 100) return "税率必须在0到100之间";

  const duplicateCode = state.products.find((item) => item.code === product.code && item.id !== product.id);
  if (duplicateCode) return "商品编码已存在";
  if (!product.conversions.length) return "至少维护一条单位换算关系";

  const conversionSet = new Set();
  for (const item of product.conversions) {
    if (!item.fromUnit || !item.toUnit || !item.ratio || item.ratio <= 0) return "单位换算关系必须完整且换算系数大于0";
    const key = `${item.fromUnit}-${item.toUnit}`;
    if (conversionSet.has(key)) return "单位换算关系不允许重复";
    conversionSet.add(key);
  }

  if (!product.skus.length) return "至少维护一个SKU";
  const skuSet = new Set();
  const otherBarcodes = state.products.filter((item) => item.id !== product.id).flatMap((item) => getAllBarcodes(item).map((barcode) => barcode.code));
  const currentBarcodes = new Set();

  for (const sku of product.skus) {
    if (!sku.code) return "SKU编码不能为空";
    if (!sku.name) return "SKU名称不能为空";
    if (skuSet.has(sku.code)) return "SKU编码不允许重复";
    skuSet.add(sku.code);
    let primaryCount = 0;
    for (const barcode of sku.barcodes) {
      if (barcode.primary) primaryCount += 1;
      if (barcode.code) {
        if (otherBarcodes.includes(barcode.code)) return `条码 ${barcode.code} 已被其他商品占用`;
        if (currentBarcodes.has(barcode.code)) return `条码 ${barcode.code} 在当前商品内重复`;
        currentBarcodes.add(barcode.code);
      }
    }
    if (sku.barcodes.length && primaryCount === 0) return `SKU ${sku.code} 至少设置一个主条码`;
  }

  if (Object.values(product.prices).some((value) => value < 0)) return "价格不能为负数";
  return "";
}

function upsertProduct(product) {
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index > -1) state.products[index] = product;
  else state.products.unshift(product);
  saveProducts();
  renderSummary();
  renderTable();
}

function saveProduct() {
  const product = readFormProduct();
  const error = validateProduct(product);
  if (error) {
    showToast(error);
    return;
  }
  upsertProduct(product);
  closeDrawer();
  showToast("商品保存成功");
}

function openDetail(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const barcodes = getAllBarcodes(product);
  elements.detailContent.innerHTML = `
    <div class="detail-grid">
      <section class="detail-card">
        <h3>基础信息</h3>
        <dl class="detail-list">
          <dt>商品编码</dt><dd>${product.code}</dd>
          <dt>商品名称</dt><dd>${product.name}</dd>
          <dt>品牌</dt><dd>${product.brand}</dd>
          <dt>分类</dt><dd>${product.category1} / ${product.category2} / ${product.category3}</dd>
          <dt>状态</dt><dd><span class="status-chip ${statusClass(product.status)}">${product.status}</span></dd>
          <dt>供应商</dt><dd>${product.defaultSupplier || "-"}</dd>
        </dl>
      </section>
      <section class="detail-card">
        <h3>业务属性</h3>
        <dl class="detail-list">
          <dt>单位</dt><dd>${product.mainUnit} / ${product.purchaseUnit} / ${product.salesUnit} / ${product.deliveryUnit}</dd>
          <dt>税率</dt><dd>${product.taxRate}%</dd>
          <dt>称重</dt><dd>${product.isWeighted ? "是" : "否"}</dd>
          <dt>批次管理</dt><dd>${product.isBatchManaged ? "是" : "否"}</dd>
          <dt>保质期</dt><dd>${product.shelfLifeDays || "-"} 天</dd>
          <dt>序列号管理</dt><dd>${product.isSerialManaged ? "是" : "否"}</dd>
        </dl>
      </section>
      <section class="detail-card">
        <h3>单位换算</h3>
        <div class="pill-list">${product.conversions.map((item) => `<span class="pill">${item.fromUnit} = ${item.ratio} ${item.toUnit}</span>`).join("")}</div>
      </section>
      <section class="detail-card">
        <h3>SKU与条码</h3>
        <div class="pill-list">${product.skus.map((sku) => `<span class="pill">${sku.code}｜${sku.name}${sku.spec ? `｜${sku.spec}` : ""}</span>`).join("")}</div>
        <div class="pill-list" style="margin-top:12px;">${barcodes.length ? barcodes.map((item) => `<span class="pill">${item.code}｜${item.unit}${item.primary ? "｜主条码" : ""}</span>`).join("") : '<span class="pill">无码商品</span>'}</div>
      </section>
      <section class="detail-card">
        <h3>价格与审计</h3>
        <dl class="detail-list">
          <dt>门店/会员价</dt><dd>${product.prices.retailPrice} / ${product.prices.memberPrice}</dd>
          <dt>采购/成本价</dt><dd>${product.prices.purchasePrice} / ${product.prices.costPrice}</dd>
          <dt>创建人</dt><dd>${product.createdBy}</dd>
          <dt>创建时间</dt><dd>${product.createdAt}</dd>
          <dt>修改人</dt><dd>${product.updatedBy}</dd>
          <dt>修改时间</dt><dd>${product.updatedAt}</dd>
        </dl>
      </section>
      <section class="detail-card">
        <h3>操作日志</h3>
        <div class="pill-list">${product.logs.map((item) => `<span class="pill">${item}</span>`).join("")}</div>
      </section>
    </div>
  `;
  elements.detailModal.classList.remove("hidden");
}

function closeDetail() {
  elements.detailModal.classList.add("hidden");
}

function toggleProductStatus(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product || product.status === "已删除") return;
  product.status = product.status === "已启用" ? "已停用" : "已启用";
  product.updatedAt = formatTime();
  product.updatedBy = "当前用户";
  product.logs.push(product.status === "已停用" ? "执行停用，禁止新业务引用" : "执行启用，恢复业务引用");
  saveProducts();
  renderSummary();
  renderTable();
  showToast(product.status === "已停用" ? "商品已停用" : "商品已启用");
}

function deleteProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  product.status = "已删除";
  product.updatedAt = formatTime();
  product.updatedBy = "当前用户";
  product.logs.push("逻辑删除商品资料");
  saveProducts();
  renderSummary();
  renderTable();
  showToast("商品已逻辑删除");
}

function exportProducts(scope) {
  const rows = scope === "all" ? state.products : filteredProducts();
  const data = scope === "selected" ? rows.filter((item) => state.selectedIds.has(item.id)) : rows;
  if (!data.length) {
    showToast("当前没有可导出的数据");
    return;
  }
  if (data.length > 1000) {
    showToast("导出数量超限，请缩小筛选范围");
    return;
  }
  download(`商品资料导出_${Date.now()}.json`, JSON.stringify(data, null, 2));
  showToast(`已导出 ${data.length} 条数据`);
}

function downloadTemplate() {
  const template = [{
    code: "SP-000001",
    name: "示例商品",
    mnemonic: "SLSP",
    brand: "盒马工坊",
    category1: "生鲜",
    category2: "水果",
    category3: "苹果",
    taxRate: 13,
    isWeighted: false,
    isBatchManaged: true,
    shelfLifeDays: 30,
    isSerialManaged: false,
    defaultSupplier: "华东生鲜供应链",
    optionalSuppliers: ["华东生鲜供应链"],
    mainUnit: "件",
    purchaseUnit: "箱",
    salesUnit: "件",
    deliveryUnit: "箱",
    prices: { retailPrice: 10, memberPrice: 9, purchasePrice: 6, costPrice: 7 },
    conversions: [{ fromUnit: "箱", toUnit: "件", ratio: 12 }],
    skus: [{ code: "SP-000001-01", name: "示例SKU", spec: "默认规格", barcodes: [{ code: "6900000000001", unit: "件", primary: true }] }],
  }];
  download("商品导入模板.json", JSON.stringify(template, null, 2));
  showToast("模板已下载");
}

function importProducts(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const list = JSON.parse(reader.result);
      if (!Array.isArray(list)) throw new Error("导入文件必须是数组");
      let success = 0;
      const errors = [];
      list.forEach((item, index) => {
        const existing = state.products.find((product) => product.code === item.code);
        const product = {
          id: existing?.id || uid("P"),
          code: item.code || "",
          name: item.name || "",
          mnemonic: (item.mnemonic || "").toUpperCase(),
          brand: item.brand || "",
          category1: item.category1 || "",
          category2: item.category2 || "",
          category3: item.category3 || "",
          taxRate: Number(item.taxRate || 0),
          isWeighted: Boolean(item.isWeighted),
          isBatchManaged: Boolean(item.isBatchManaged),
          shelfLifeDays: item.shelfLifeDays || "",
          isSerialManaged: Boolean(item.isSerialManaged),
          defaultSupplier: item.defaultSupplier || "",
          optionalSuppliers: item.optionalSuppliers || [],
          mainUnit: item.mainUnit || "",
          purchaseUnit: item.purchaseUnit || item.mainUnit || "",
          salesUnit: item.salesUnit || item.mainUnit || "",
          deliveryUnit: item.deliveryUnit || item.mainUnit || "",
          prices: item.prices || { retailPrice: 0, memberPrice: 0, purchasePrice: 0, costPrice: 0 },
          conversions: item.conversions || [],
          skus: item.skus || [],
          status: existing?.status || "已启用",
          createdBy: existing?.createdBy || "导入用户",
          createdAt: existing?.createdAt || formatTime(),
          updatedBy: "导入用户",
          updatedAt: formatTime(),
          logs: [...(existing?.logs || []), "通过导入创建/更新商品"],
        };
        const error = validateProduct(product);
        if (error) {
          errors.push({ row: index + 1, code: product.code || "-", reason: error });
          return;
        }
        upsertProduct(product);
        success += 1;
      });
      if (errors.length) download(`导入错误报告_${Date.now()}.json`, JSON.stringify(errors, null, 2));
      renderSummary();
      renderTable();
      showToast(`导入完成，成功 ${success} 条，失败 ${errors.length} 条`);
    } catch (error) {
      showToast(`导入失败：${error.message}`);
    } finally {
      elements.importInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function bindEvents() {
  byId("createBtn").addEventListener("click", () => openDrawer("create"));
  byId("saveBtn").addEventListener("click", saveProduct);
  byId("searchBtn").addEventListener("click", renderTable);
  byId("resetFiltersBtn").addEventListener("click", () => {
    ["filterCode", "filterName", "filterMnemonic", "filterBarcode", "filterBrand", "filterCategory1", "filterCategory2", "filterCategory3", "filterStatus", "filterCreator", "filterBatch", "filterSerial"].forEach((id) => {
      byId(id).value = "";
    });
    syncCategories("filter");
    renderTable();
  });
  byId("filterCategory1").addEventListener("change", () => syncCategories("filter"));
  byId("filterCategory2").addEventListener("change", () => syncCategories("filter"));
  byId("category1").addEventListener("change", () => {
    syncCategories("");
    byId("code").value = generateCode();
  });
  byId("category2").addEventListener("change", () => syncCategories(""));
  byId("downloadTemplateBtn").addEventListener("click", downloadTemplate);
  byId("importBtn").addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importProducts(file);
  });
  byId("addConversionBtn").addEventListener("click", () => addConversionRow({ fromUnit: byId("mainUnit").value || "件", toUnit: byId("mainUnit").value || "件", ratio: 1 }));
  byId("addSkuBtn").addEventListener("click", () => addSkuRow({ code: `${byId("code").value || generateCode()}-${String(elements.skuList.children.length + 1).padStart(2, "0")}` }));
  byId("exportAllBtn").addEventListener("click", () => exportProducts("all"));
  byId("exportCurrentBtn").addEventListener("click", () => exportProducts("current"));
  byId("exportSelectedBtn").addEventListener("click", () => exportProducts("selected"));
  elements.checkAll.addEventListener("change", (event) => {
    filteredProducts().forEach((item) => {
      if (event.target.checked) state.selectedIds.add(item.id);
      else state.selectedIds.delete(item.id);
    });
    renderTable();
  });
  elements.tableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (target.type === "checkbox" && target.dataset.id) {
      if (target.checked) state.selectedIds.add(target.dataset.id);
      else state.selectedIds.delete(target.dataset.id);
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    if (action === "view") openDetail(id);
    if (action === "edit") openDrawer("edit", product);
    if (action === "toggle") toggleProductStatus(id);
    if (action === "delete") deleteProduct(id);
  });
  document.querySelectorAll("[data-close-drawer]").forEach((node) => node.addEventListener("click", closeDrawer));
  document.querySelectorAll("[data-close-detail]").forEach((node) => node.addEventListener("click", closeDetail));
}

function init() {
  initSelects();
  syncCategories("filter");
  loadProducts();
  bindEvents();
  renderSummary();
  renderTable();
}

init();
