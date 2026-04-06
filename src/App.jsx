import { useEffect, useMemo, useState } from "react";

const menuItems = [
  { label: "首页", icon: "home" },
  { label: "商品", icon: "goods" },
  { label: "交易", icon: "trade" },
  { label: "买家", icon: "buyer" },
  { label: "店铺", icon: "shop", badge: "2" },
  { label: "系统", icon: "system" },
  { label: "统计", icon: "stats" },
  { label: "营销", icon: "marketing", children: ["限时购1", "限时购"] },
  { label: "小程序", icon: "miniapp" },
  { label: "客服", icon: "service" }
];

const statuses = ["全部", "未开始", "进行中", "已结束"];
const activityCategories = ["常规活动", "节日活动", "品牌活动"];
const productCategories = ["饮料酒水", "休闲食品", "日化用品"];

const marketingPageNames = ["限时购1", "限时购"];
const seedActivitiesByPage = {
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
const initialCreateForm = { activityName: "", category: "", startTime: "", endTime: "", productKeyword: "", productId: "", onlyUnpricedProducts: false };
const initialPickerFilters = { category: "", productName: "", productId: "" };
const cloneProducts = (products) => JSON.parse(JSON.stringify(products));
const getActiveSpecs = (product) => product.specs.filter((spec) => spec.status === "active");
const hasUnifiedFlashPrice = (product) => String(product.flashPrice || "").trim() !== "";
const hasUnifiedTotalLimit = (product) => String(product.totalLimit || "").trim() !== "";
const hasUnifiedActivityStock = (product) => String(product.activityStock || "").trim() !== "";
const getNumericStockValue = (value) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};
const getProductActivityStockDisplay = (product) => {
  if (hasUnifiedActivityStock(product)) return product.activityStock;
  const total = getActiveSpecs(product).reduce((sum, spec) => sum + getNumericStockValue(spec.activityStock), 0);
  return total > 0 ? String(total) : "";
};
const syncProductActivityStock = (product, nextTotalValue) => {
  return {
    ...product,
    activityStock: nextTotalValue
  };
};

function createInitialProducts() {
  return [
    {
      id: "123456",
      name: "百岁山天然矿泉水570m",
      marketPrice: "￥30~50",
      flashPrice: "￥20~40",
      totalLimit: "",
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
      totalLimit: "",
      activityStock: "",
      stock: 100,
      image: "景",
      specs: [
        { id: "562101", name: "默认规格", stock: 100, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "100", status: "active" }
      ]
    }
  ];
}

function createEditProducts(activity) {
  const products = cloneProducts(createInitialProducts());
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
  return {
    filters: { ...emptyFilters },
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
    category: config?.category || (pageName === "限时购" ? "店铺专属" : "常规活动"),
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
function Header({ currentMarketingPage }) {
  return (
    <header className="workspace-topbar">
      <div className="page-tabs">
        <div className="page-tab">首页-控制台 <span>×</span></div>
        <div className="page-tab is-current">{currentMarketingPage} <span>×</span></div>
      </div>
      <div className="top-actions">
        <a href="#">在线客服</a>
        <a href="#">我的待办</a>
        <a href="#">导出记录</a>
        <a href="#">退出登录</a>
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

function ListPage({ filters, setFilters, page, setPage, pageSize, setPageSize, onCreate, onAction, activities }) {
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
        <div className="table-toolbar"><button className="btn btn-create" type="button" onClick={onCreate}>新增限时购</button></div>
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
                            <td>{useUnifiedFlashPrice ? <span className="spec-unified-label">按商品统一限时价</span> : <input className="spec-inline-input" value={row.flashPrice} onChange={(e) => onUpdateSpecField(product.id, row.id, "flashPrice", e.target.value)} />}</td>
                            <td>{row.stock}</td>
                            <td>{useUnifiedTotalLimit ? <span className="spec-unified-label">按商品统一总限购数量</span> : <input className="spec-inline-input" value={row.limitCount} onChange={(e) => onUpdateSpecField(product.id, row.id, "limitCount", e.target.value.replace(/[^\d]/g, ""))} />}</td>
                            <td>{useUnifiedActivityStock ? <span className="spec-unified-label">按商品统一活动库存</span> : <input className="spec-inline-input" value={row.activityStock} onChange={(e) => onUpdateSpecField(product.id, row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} />}</td>
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

function SpecPickerModal({ product, selectedSpecIds, onToggleSpecSelection, onToggleAllSpecs, onBatchToggleSpecs, onClose, onUpdateSpecField, onToggleSpecStatus, onShowToast }) {
  if (!product) return null;

  const useUnifiedFlashPrice = hasUnifiedFlashPrice(product);
  const useUnifiedTotalLimit = hasUnifiedTotalLimit(product);
  const useUnifiedActivityStock = hasUnifiedActivityStock(product);
  const [batchFields, setBatchFields] = useState({ flashPrice: "", limitCount: "", activityStock: "" });
  const selectableSpecs = product.specs.filter((spec) => spec.status !== "merged");
  const sortedSpecs = [...product.specs].sort((left, right) => {
    const getSpecOrder = (spec) => {
      if (spec.status === "active") return 0;
      if (spec.status === "merged") return 1;
      return 2;
    };

    return getSpecOrder(left) - getSpecOrder(right);
  });
  const allSelectableSelected = selectableSpecs.length > 0 && selectableSpecs.every((spec) => selectedSpecIds.includes(spec.id));
  const hasAnySelected = selectedSpecIds.length > 0;

  const handleBatchFieldChange = (field, value) => {
    setBatchFields((current) => ({
      ...current,
      [field]: field === "flashPrice" ? value : value.replace(/[^\d]/g, "")
    }));
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

    setBatchFields({ flashPrice: "", limitCount: "", activityStock: "" });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="spec-modal">
        <div className="picker-header"><h3>规格选择</h3><button type="button" className="picker-close" onClick={onClose}>×</button></div>

        <div className="spec-product-head">
          <div className="product-image spec-head-image">{product.image}</div>
          <div className="product-meta">
            <div className="spec-head-title">{product.name}</div>
            <div className="product-id">商品ID: {product.id}</div>
          </div>
        </div>

        <div className="spec-batch-bar">
          <div className="spec-batch-left">
            <span>批量设置:</span>
            <input placeholder="限时价" value={batchFields.flashPrice} onChange={(e) => handleBatchFieldChange("flashPrice", e.target.value)} disabled={useUnifiedFlashPrice} className={useUnifiedFlashPrice ? "is-disabled" : ""} />
            <input placeholder="限购数量" value={batchFields.limitCount} onChange={(e) => handleBatchFieldChange("limitCount", e.target.value)} disabled={useUnifiedTotalLimit} className={useUnifiedTotalLimit ? "is-disabled" : ""} />
            <input placeholder="活动库存" value={batchFields.activityStock} onChange={(e) => handleBatchFieldChange("activityStock", e.target.value)} disabled={useUnifiedActivityStock} className={useUnifiedActivityStock ? "is-disabled" : ""} />
            <button className="btn btn-search" type="button" onClick={handleApplyBatchFields}>确定</button>
          </div>
        </div>

        <div className="spec-table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allSelectableSelected} disabled={selectableSpecs.length === 0} onChange={() => onToggleAllSpecs(product.id)} /></th>
                <th>规格信息</th>
                <th>库存</th>
                <th>商城价</th>
                <th>限时价</th>
                <th>限购数量</th>
                <th>活动库存</th>
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
                      <td colSpan="6" className="spec-merged-cell">{row.mergedText}</td>
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
                      <td colSpan="5"></td>
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
                    <td>{row.stock}</td>
                    <td>{row.marketPrice}</td>
                    <td>{useUnifiedFlashPrice ? <span className="spec-unified-label">按商品统一限时价</span> : <input className="spec-inline-input" value={row.flashPrice} onChange={(e) => onUpdateSpecField(product.id, row.id, "flashPrice", e.target.value)} />}</td>
                    <td>
                      {useUnifiedTotalLimit ? <span className="spec-unified-label">按商品统一总限购数量</span> : <input className="spec-inline-input" value={row.limitCount} onChange={(e) => onUpdateSpecField(product.id, row.id, "limitCount", e.target.value.replace(/[^\d]/g, ""))} />}
                    </td>
                    <td>{useUnifiedActivityStock ? <span className="spec-unified-label">按商品统一活动库存</span> : <input className="spec-inline-input" value={row.activityStock} onChange={(e) => onUpdateSpecField(product.id, row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} />}</td>
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
          <button className="btn btn-create" type="button" onClick={onClose}>保存</button>
        </div>
      </div>
    </div>
  );
}

function CreatePage({ pageName, form, isEditMode, onFormChange, onResetFilters, selectedProducts, selectedGoodsIds, onToggleGoodsSelection, onRemoveProduct, onBatchRemoveProducts, onBack, onOpenPicker, onOpenSpecPicker, onUpdateProductFlashPrice, onUpdateProductLimit, onUpdateProductActivityStock, onSave, modalOpen }) {
  const showUnpricedFilter = pageName === "限时购1" || pageName === "限时购";

  const getTotalLimitDisplay = (product) => {
    if (hasUnifiedTotalLimit(product)) return product.totalLimit;
    const total = product.specs.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.limitCount || 0), 0);
    return total ? String(total) : "";
  };

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
        <div className="goods-panel">
          <div className="goods-panel-head">已选商品列表 <span>({selectedProducts.length})</span></div>
          {hasSelectedProducts ? (
            <>
              <div className="goods-filter-bar"><label className="mini-field"><span>商品名称:</span><input value={form.productKeyword} onChange={(e) => onFormChange("productKeyword", e.target.value)} /></label><label className="mini-field"><span>商品ID:</span><input value={form.productId} onChange={(e) => onFormChange("productId", e.target.value)} /></label>{showUnpricedFilter ? <label className="check-item goods-filter-check"><input type="checkbox" checked={form.onlyUnpricedProducts} onChange={(e) => onFormChange("onlyUnpricedProducts", e.target.checked)} /><span>筛选未配限时价商品</span></label> : null}<button className="btn btn-reset" type="button" onClick={onResetFilters}>重置</button><button className="btn btn-search" type="button">搜索</button></div>
              {showSelectionControls ? <div className="goods-toolbar"><button className="btn btn-reset" type="button" onClick={onBatchRemoveProducts}>批量删除</button></div> : null}
              <div className="goods-table-shell"><table className={`goods-table activity-goods-table ${showSelectionControls ? "has-selection" : "no-selection"}`}><thead><tr>{showSelectionControls ? <th><input type="checkbox" checked={allFilteredSelected} onChange={(e) => onToggleGoodsSelection(e.target.checked ? filteredProducts.map((item) => item.id) : [])} /></th> : null}<th>商品</th><th>商城价</th><th>限时价</th><th>总限购数量</th><th>总活动库存</th><th>规格数量</th><th>操作</th></tr></thead><tbody>{filteredProducts.map((item) => <tr key={item.id}>{showSelectionControls ? <td><input type="checkbox" checked={selectedGoodsIds.includes(item.id)} onChange={() => onToggleGoodsSelection(item.id)} /></td> : null}<td><div className="product-cell"><div className="product-image">{item.image}</div><div className="product-meta"><div className="product-name">{item.name}</div><div className="product-id">商品ID： {item.id}</div></div>{showSelectionControls ? <button className="delete-link" type="button" onClick={() => onRemoveProduct(item.id)}>删除商品</button> : null}</div></td><td>{item.marketPrice}</td><td><input className="limit-input" value={item.flashPrice} onChange={(e) => onUpdateProductFlashPrice(item.id, e.target.value)} placeholder="请输入" /></td><td><input className="limit-input" value={getTotalLimitDisplay(item)} onChange={(e) => onUpdateProductLimit(item.id, e.target.value.replace(/[^\d]/g, ""))} /></td><td><input className="limit-input" value={getProductActivityStockDisplay(item)} onChange={(e) => onUpdateProductActivityStock(item.id, e.target.value.replace(/[^\d]/g, ""))} /></td><td>共 {item.specs.length} 个 规格</td><td><div className="spec-action"><button type="button" className="spec-open-btn" onClick={() => onOpenSpecPicker(item.id)}>已选 {item.specs.filter((spec) => spec.status === "active").length} 个 规格 <span>编辑</span></button></div></td></tr>)}</tbody></table></div>
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
        </div>
        <div className="create-footer"><button className="btn btn-create" type="button" onClick={onSave}>保存</button></div>
      </div>
    </section>
  );
}

export default function App() {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMarketingPage, setCurrentMarketingPage] = useState("限时购1");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isBatchSpecOpen, setIsBatchSpecOpen] = useState(false);
  const [detailSpecProduct, setDetailSpecProduct] = useState(null);
  const [activeSpecProductId, setActiveSpecProductId] = useState("");
  const [batchSpecDraftProducts, setBatchSpecDraftProducts] = useState([]);
  const [batchSpecSelectedIdsByProduct, setBatchSpecSelectedIdsByProduct] = useState({});
  const [marketingStates, setMarketingStates] = useState(createInitialMarketingStates);
  const [toastMessage, setToastMessage] = useState("");

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
    detailActivity,
    activities
  } = currentPageState;

  const activeSpecProduct = selectedProducts.find((item) => item.id === activeSpecProductId) || selectedProducts[0];
  const activeSpecSelectedIds = selectedSpecIdsByProduct[activeSpecProductId] || [];

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
      selectedSpecIdsByProduct: {}
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
    const catalogProducts = createInitialProducts();
    const catalogMap = new Map(catalogProducts.map((item) => [item.id, item]));
    const selectedMap = new Map(selectedProducts.map((item) => [item.id, item]));

    return selectedPickerProductIds.map((productId) => {
      const source = selectedMap.get(productId) || catalogMap.get(productId);
      return source ? JSON.parse(JSON.stringify(source)) : null;
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

  const handleUpdateProductLimit = (productId, value) => {
    updateSelectedProduct(productId, (product) => ({ ...product, totalLimit: value }));
  };

  const handleUpdateProductFlashPrice = (productId, value) => {
    updateSelectedProduct(productId, (product) => ({ ...product, flashPrice: value }));
  };

  const handleUpdateProductActivityStock = (productId, value) => {
    updateSelectedProduct(productId, (product) => syncProductActivityStock(product, value));
  };

  const handleUpdateSpecField = (productId, specId, field, value) => {
    updateSelectedProduct(productId, (product) => ({
      ...product,
      flashPrice: field === "flashPrice" ? "" : product.flashPrice,
      totalLimit: field === "limitCount" ? "" : product.totalLimit,
      activityStock: field === "activityStock" ? "" : product.activityStock,
      specs: product.specs.map((spec) => (spec.id === specId ? { ...spec, [field]: value } : spec))
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

    const catalogProducts = createInitialProducts();
    const selectedCatalogProducts = catalogProducts.filter((item) => selectedPickerProductIds.includes(item.id));

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
      selectedSpecIdsByProduct: Object.fromEntries(Object.entries(current.selectedSpecIdsByProduct).filter(([key]) => key !== productId))
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
    const hasEmptyFlashPrice = selectedProducts.some((product) => !hasUnifiedFlashPrice(product) && product.specs.some((spec) => spec.status === "active" && !String(spec.flashPrice || "").trim()));

    if (hasEmptyFlashPrice) {
      setToastMessage("部分规格未配限时价，请先完善");
      return;
    }
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
        selectedProducts: createEditProducts(activity),
        selectedGoodsIds: [],
        selectedPickerProductIds: [],
        selectedSpecIdsByProduct: {}
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

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-card"><div className="logo-thumb" /><div className="logo-meta"><div className="logo-title">闪电帮帮</div><div className="logo-tag">供应商后台</div></div></div>
        <nav className="sidebar-nav">{menuItems.map((item) => item.children ? <div className="sidebar-group is-active" key={item.label}><a className="sidebar-link is-active" href="#"><span className="sidebar-icon"><SidebarIcon type={item.icon} /></span><span className="sidebar-text">{item.label}</span></a><div className="sidebar-subnav">{item.children.map((child) => <button className={`sidebar-sublink ${currentMarketingPage === child ? "is-active" : ""}`} key={child} type="button" onClick={() => handleSwitchMarketingPage(child)}>{child}</button>)}</div></div> : <a className="sidebar-link" href="#" key={item.label}><span className="sidebar-icon"><SidebarIcon type={item.icon} /></span><span className="sidebar-text">{item.label}</span>{item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}</a>)}</nav>
      </aside>

      <section className="workspace">
        <Header currentMarketingPage={currentMarketingPage} />
        <main className="workspace-main">
          <TabSection creating={isCreating} detailing={!isCreating && !!detailActivity} currentMarketingPage={currentMarketingPage} onSwitchToList={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); updateCurrentField("detailActivity", null); }} />
          {isCreating ? <CreatePage pageName={currentMarketingPage} form={createForm} isEditMode={isEditMode} onFormChange={handleFormChange} onResetFilters={handleResetCreateFilters} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); setIsEditMode(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductFlashPrice={handleUpdateProductFlashPrice} onUpdateProductLimit={handleUpdateProductLimit} onUpdateProductActivityStock={handleUpdateProductActivityStock} onSave={handleCreateSave} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : detailActivity ? <DetailPage detailActivity={detailActivity} page={detailPage} setPage={(value) => updateCurrentField("detailPage", typeof value === "function" ? value(detailPage) : value)} pageSize={detailPageSize} setPageSize={(value) => updateCurrentField("detailPageSize", value)} onShowSpecDetail={setDetailSpecProduct} /> : <ListPage filters={filters} setFilters={(value) => updateCurrentField("filters", value)} page={page} setPage={(value) => updateCurrentField("page", typeof value === "function" ? value(page) : value)} pageSize={pageSize} setPageSize={(value) => updateCurrentField("pageSize", value)} onCreate={() => { resetCreateState(); setIsCreating(true); updateCurrentField("detailActivity", null); }} onAction={handleActivityAction} activities={activities} />}
        </main>
      </section>

      {isCreating && isPickerOpen ? <ProductPickerModal filters={pickerFilters} setFilters={(value) => updateCurrentField("pickerFilters", value)} selectedProductIds={selectedPickerProductIds} onToggleProduct={handleTogglePickerProduct} onSave={handleSavePicker} onClose={() => setIsPickerOpen(false)} confirmText={currentMarketingPage === "限时购" ? "下一步" : "保存"} /> : null}
      {isCreating && isSpecOpen ? <SpecPickerModal product={activeSpecProduct} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} onShowToast={setToastMessage} /> : null}
      {isCreating && isBatchSpecOpen && currentMarketingPage === "限时购" ? <BatchSpecStepModal products={batchSpecDraftProducts} selectedSpecIdsByProduct={batchSpecSelectedIdsByProduct} onToggleSpecSelection={handleBatchDraftToggleSpecSelection} onToggleAllSpecs={handleBatchDraftToggleAllSpecs} onBatchToggleSpecs={handleBatchDraftToggleSpecs} onClose={handleCloseBatchSpec} onSave={handleBatchSpecSave} onUpdateProductLimit={handleBatchDraftProductLimit} onUpdateProductActivityStock={handleBatchDraftProductActivityStock} onUpdateSpecField={handleBatchDraftSpecField} onToggleSpecStatus={handleBatchDraftToggleSpecStatus} onShowToast={setToastMessage} /> : null}
      {!isCreating && detailSpecProduct ? <DetailSpecModal product={detailSpecProduct} onClose={() => setDetailSpecProduct(null)} /> : null}
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}

















