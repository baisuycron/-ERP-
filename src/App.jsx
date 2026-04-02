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
const limitRules = ["按商品统一限购", "按每个规格独立限购"];
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
const initialCreateForm = { activityName: "", category: "", startTime: "", endTime: "", rule: limitRules[0], productKeyword: "", productId: "" };
const initialPickerFilters = { category: "", productName: "", productId: "" };

function createInitialProducts() {
  return [
    {
      id: "123456",
      name: "百岁山天然矿泉水570m",
      marketPrice: "￥30~50",
      flashPrice: "￥20~40",
      totalLimit: "",
      stock: 100,
      image: "百",
      specs: [
        { id: "455008", name: "深灰色,160/80(XS),版本1", stock: 100, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" },
        { id: "455009a", name: "深灰色,160/80(XS),版本2", status: "merged", mergedText: "该规格已参与【XXX】限时购" },
        { id: "455009", name: "深灰色,160/80(XS),版本3", stock: 88, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" },
        { id: "455010", name: "深灰色,160/80(XS),版本4", stock: 76, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" },
        { id: "455011", name: "深灰色,160/80(XS),版本5", stock: 91, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" },
        { id: "455012", name: "深灰色,160/80(XS),版本6", stock: 64, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" }
      ]
    },
    {
      id: "162101",
      name: "景田饮用纯净水560ml",
      marketPrice: "￥30",
      flashPrice: "",
      totalLimit: "",
      stock: 100,
      image: "景",
      specs: [
        { id: "562101", name: "默认规格", stock: 100, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "active" }
      ]
    }
  ];
}

function createInitialMarketingPageState(pageName) {
  return {
    filters: { ...emptyFilters },
    page: 1,
    pageSize: 20,
    createForm: { ...initialCreateForm },
    pickerFilters: { ...initialPickerFilters },
    selectedProducts: [],
    selectedGoodsIds: [],
    selectedPickerProductIds: [],
    selectedSpecIdsByProduct: {},
    activities: [...(seedActivitiesByPage[pageName] || [])]
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

function TabSection({ creating, onSwitchToList, currentMarketingPage }) {
  const tabs = creating ? [`新增${currentMarketingPage}`] : [`${currentMarketingPage}管理`, "参数配置", `${currentMarketingPage}详情`];
  return (
    <section className="content-card tab-card">
      <div className="tab-strip">
        {tabs.map((tab, index) => (
          <button className={`tab-button ${index === 0 ? "is-active" : ""}`} key={tab} type="button" onClick={!creating && index === 0 ? undefined : creating ? onSwitchToList : undefined}>
            {tab}
          </button>
        ))}
      </div>
    </section>
  );
}

function ListPage({ filters, setFilters, page, setPage, pageSize, setPageSize, onCreate, activities }) {
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
            <tbody>{rows.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.goodsCount}</td><td>{item.startTime}</td><td>{item.endTime}</td><td className={`status-cell status-${item.status}`}>{item.status}</td><td><div className="action-links">{item.actions.map((action) => <button key={action} type="button">{action}</button>)}</div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="pagination-bar"><span>共 {filteredActivities.length} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={20}>20 条/页</option><option value={50}>50 条/页</option><option value={100}>100 条/页</option></select><button className="page-btn" type="button" disabled>‹</button><button className="page-btn is-current" type="button">{currentPage}</button><button className="page-btn" type="button" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>›</button><span>到第</span><input className="page-input" placeholder="请输入" /><span>页</span><button className="btn btn-jump" type="button">跳转</button></div>
      </section>
    </>
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

function BatchSpecStepModal({ products, rule, selectedSpecIdsByProduct, onToggleSpecSelection, onToggleAllSpecs, onBatchToggleSpecs, onClose, onSave, onUpdateProductLimit, onUpdateSpecField, onToggleSpecStatus }) {
  const [hideConfigured, setHideConfigured] = useState(false);
  const isUnified = rule === limitRules[0];

  const getTotalLimitDisplay = (product) => {
    if (isUnified) return product.totalLimit;
    const total = product.specs.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.limitCount || 0), 0);
    return total ? String(total) : "";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-mask" onClick={onClose} />
      <div className="batch-spec-modal">
        <div className="picker-header"><h3>规格选择</h3><button type="button" className="picker-close" onClick={onClose}>×</button></div>
        <div className="batch-spec-body">
          {products.map((product) => {
            const selectedSpecIds = selectedSpecIdsByProduct[product.id] || [];
            const visibleSpecs = product.specs.filter((spec) => {
              if (!hideConfigured) return true;
              if (spec.status === "merged") return false;
              if (spec.flashPrice) return false;
              if (spec.activityStock) return false;
              return true;
            });
            const selectableSpecs = visibleSpecs.filter((spec) => spec.status !== "merged");
            const allSelectableSelected = selectableSpecs.length > 0 && selectableSpecs.every((spec) => selectedSpecIds.includes(spec.id));
            const hasAnySelected = selectedSpecIds.length > 0;

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
                    <div className="batch-spec-summary-item"><span>活动总库存</span><strong>{product.stock}</strong></div>
                    <label className="batch-spec-summary-item batch-spec-summary-input"><span>总限购数量</span><input value={getTotalLimitDisplay(product)} readOnly={!isUnified} disabled={!isUnified} onChange={(e) => onUpdateProductLimit(product.id, e.target.value.replace(/[^\d]/g, ""))} /></label>
                  </div>
                </div>
                <div className="batch-spec-toolbar">
                  <div className="spec-batch-left"><span>批量操作:</span></div>
                  <div className="spec-batch-right">
                    <button type="button" className={hasAnySelected ? "is-active" : ""} disabled={!hasAnySelected} onClick={() => onBatchToggleSpecs(product.id, "active")}>批量加入活动</button>
                    <button type="button" className={hasAnySelected ? "is-active" : ""} disabled={!hasAnySelected} onClick={() => onBatchToggleSpecs(product.id, "available")}>批量撤出活动</button>
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
                            <td><input className="spec-inline-input" value={row.flashPrice} onChange={(e) => onUpdateSpecField(product.id, row.id, "flashPrice", e.target.value)} /></td>
                            <td>{row.stock}</td>
                            <td><input className="spec-inline-input" value={row.activityStock} onChange={(e) => onUpdateSpecField(product.id, row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} /></td>
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

function SpecPickerModal({ product, rule, selectedSpecIds, onToggleSpecSelection, onToggleAllSpecs, onBatchToggleSpecs, onClose, onUpdateSpecField, onToggleSpecStatus }) {
  if (!product) return null;

  const isUnified = rule === limitRules[0];
  const selectableSpecs = product.specs.filter((spec) => spec.status !== "merged");
  const allSelectableSelected = selectableSpecs.length > 0 && selectableSpecs.every((spec) => selectedSpecIds.includes(spec.id));
  const hasAnySelected = selectedSpecIds.length > 0;

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
            <input placeholder="限时价" />
            <input placeholder="限购数量" disabled={isUnified} className={isUnified ? "is-disabled" : ""} />
            <input placeholder="活动库存" />
            <button className="btn btn-search" type="button">确定</button>
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
              {product.specs.map((row) => {
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
                    <td><input className="spec-inline-input" value={row.flashPrice} onChange={(e) => onUpdateSpecField(product.id, row.id, "flashPrice", e.target.value)} /></td>
                    <td>
                      {isUnified ? <span className="spec-unified-label">按商品统一限购</span> : <input className="spec-inline-input" value={row.limitCount} onChange={(e) => onUpdateSpecField(product.id, row.id, "limitCount", e.target.value.replace(/[^\d]/g, ""))} />}
                    </td>
                    <td><input className="spec-inline-input" value={row.activityStock} onChange={(e) => onUpdateSpecField(product.id, row.id, "activityStock", e.target.value.replace(/[^\d]/g, ""))} /></td>
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

function CreatePage({ form, onFormChange, selectedProducts, selectedGoodsIds, onToggleGoodsSelection, onRemoveProduct, onBatchRemoveProducts, onBack, onOpenPicker, onOpenSpecPicker, onUpdateProductLimit, modalOpen }) {
  const isUnified = form.rule === limitRules[0];

  const getTotalLimitDisplay = (product) => {
    if (isUnified) return product.totalLimit;
    const total = product.specs.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.limitCount || 0), 0);
    return total ? String(total) : "";
  };

  const filteredProducts = useMemo(() => selectedProducts.filter((product) => {
    const productKeyword = form.productKeyword.trim();
    const productId = form.productId.trim();

    if (productKeyword && !product.name.includes(productKeyword)) return false;
    if (productId && !product.id.includes(productId)) return false;
    return true;
  }), [form.productId, form.productKeyword, selectedProducts]);

  const hasSelectedProducts = selectedProducts.length > 0;
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((item) => selectedGoodsIds.includes(item.id));

  return (
    <section className={`content-card create-card ${modalOpen ? "is-dimmed" : ""}`}>
      <div className="create-layout">
        <div className="form-panel">
          <label className="create-field"><span><em>*</em> 活动名称:</span><div className="create-input-wrap has-counter"><input placeholder="请输入活动名称" maxLength={10} value={form.activityName} onChange={(e) => onFormChange("activityName", e.target.value)} /><strong>{form.activityName.length}/10</strong></div></label>
          <label className="create-field"><span><em>*</em> 活动分类:</span><div className="create-input-wrap"><select value={form.category} onChange={(e) => onFormChange("category", e.target.value)}><option value="">请选择活动分类</option>{activityCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></label>
          <label className="create-field"><span><em>*</em> 开始时间:</span><div className="create-input-wrap with-icon"><input placeholder="请选择开始时间" value={form.startTime} onChange={(e) => onFormChange("startTime", e.target.value)} /><i>◴</i></div></label>
          <label className="create-field"><span><em>*</em> 结束时间:</span><div className="create-input-wrap with-icon"><input placeholder="请选择结束时间" value={form.endTime} onChange={(e) => onFormChange("endTime", e.target.value)} /><i>◴</i></div></label>
          <div className="create-field create-field-rule"><span>限购数量规则:</span><div className="radio-group">{limitRules.map((rule) => <label key={rule} className="radio-item"><input type="radio" name="rule" checked={form.rule === rule} onChange={() => onFormChange("rule", rule)} /><span>{rule}</span></label>)}</div></div>
          <div className="create-field"><span><em>*</em> 活动商品:</span><div className="create-actions-row"><button className="btn btn-create picker-btn" type="button" onClick={onOpenPicker}>+ 选择商品</button></div></div>
        </div>

        <div className="goods-detail-title">商品详情:</div>
        <div className="goods-panel">
          <div className="goods-panel-head">已选规格列表 <span>({selectedProducts.length})</span></div>
          {hasSelectedProducts ? (
            <>
              <div className="goods-filter-bar"><label className="mini-field"><span>商品名称:</span><input value={form.productKeyword} onChange={(e) => onFormChange("productKeyword", e.target.value)} /></label><label className="mini-field"><span>商品ID:</span><input value={form.productId} onChange={(e) => onFormChange("productId", e.target.value)} /></label><button className="btn btn-reset" type="button">重置</button><button className="btn btn-search" type="button">搜索</button></div>
              <div className="goods-toolbar"><button className="btn btn-reset" type="button" onClick={onBatchRemoveProducts}>批量删除</button></div>
              <div className="goods-table-shell"><table className="goods-table"><thead><tr><th><input type="checkbox" checked={allFilteredSelected} onChange={(e) => onToggleGoodsSelection(e.target.checked ? filteredProducts.map((item) => item.id) : [])} /></th><th>商品</th><th>商城价</th><th>限时价</th><th>总限购数量</th><th>库存</th><th>规格数量</th><th>操作</th></tr></thead><tbody>{filteredProducts.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selectedGoodsIds.includes(item.id)} onChange={() => onToggleGoodsSelection(item.id)} /></td><td><div className="product-cell"><div className="product-image">{item.image}</div><div className="product-meta"><div className="product-name">{item.name}</div><div className="product-id">商品ID： {item.id}</div></div><button className="delete-link" type="button" onClick={() => onRemoveProduct(item.id)}>删除商品</button></div></td><td>{item.marketPrice}</td><td>{item.flashPrice || "-"}</td><td><input className={`limit-input ${!isUnified ? "is-disabled" : ""}`} value={getTotalLimitDisplay(item)} readOnly={!isUnified} disabled={!isUnified} onChange={(e) => onUpdateProductLimit(item.id, e.target.value.replace(/[^\d]/g, ""))} /></td><td>{item.stock}</td><td>共 {item.specs.length} 个 规格</td><td><div className="spec-action"><button type="button" className="spec-open-btn" onClick={() => onOpenSpecPicker(item.id)}>已选 {item.specs.filter((spec) => spec.status === "active").length} 个 规格 <span>修改</span></button></div></td></tr>)}</tbody></table></div>
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
        <div className="create-footer"><button className="btn btn-create" type="button">保存</button><button className="btn btn-reset" type="button" onClick={onBack}>返回列表</button></div>
      </div>
    </section>
  );
}

export default function App() {
  const [isCreating, setIsCreating] = useState(false);
  const [currentMarketingPage, setCurrentMarketingPage] = useState("限时购1");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isBatchSpecOpen, setIsBatchSpecOpen] = useState(false);
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
    createForm,
    pickerFilters,
    selectedProducts,
    selectedGoodsIds,
    selectedPickerProductIds,
    selectedSpecIdsByProduct,
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
    setActiveSpecProductId("");
    setBatchSpecDraftProducts([]);
    setBatchSpecSelectedIdsByProduct({});
    updateCurrentField("selectedSpecIdsByProduct", {});
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

  const handleUpdateProductLimit = (productId, value) => {
    updateSelectedProduct(productId, (product) => ({ ...product, totalLimit: value }));
  };

  const handleUpdateSpecField = (productId, specId, field, value) => {
    updateSelectedProduct(productId, (product) => ({
      ...product,
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

  const handleBatchDraftSpecField = (productId, specId, field, value) => {
    updateBatchDraftProduct(productId, (product) => ({
      ...product,
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
          activityStock: nextStatus === "available" ? "" : spec.activityStock
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
          activityStock: nextStatus === "available" ? "" : spec.activityStock
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

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-card"><div className="logo-thumb" /><div className="logo-meta"><div className="logo-title">闪电帮帮</div><div className="logo-tag">供应商后台</div></div></div>
        <nav className="sidebar-nav">{menuItems.map((item) => item.children ? <div className="sidebar-group is-active" key={item.label}><a className="sidebar-link is-active" href="#"><span className="sidebar-icon"><SidebarIcon type={item.icon} /></span><span className="sidebar-text">{item.label}</span></a><div className="sidebar-subnav">{item.children.map((child) => <button className={`sidebar-sublink ${currentMarketingPage === child ? "is-active" : ""}`} key={child} type="button" onClick={() => { setCurrentMarketingPage(child); setIsCreating(false); closeAllCreateOverlays(); }}>{child}</button>)}</div></div> : <a className="sidebar-link" href="#" key={item.label}><span className="sidebar-icon"><SidebarIcon type={item.icon} /></span><span className="sidebar-text">{item.label}</span>{item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}</a>)}</nav>
      </aside>

      <section className="workspace">
        <Header currentMarketingPage={currentMarketingPage} />
        <main className="workspace-main">
          <TabSection creating={isCreating} currentMarketingPage={currentMarketingPage} onSwitchToList={() => { setIsCreating(false); closeAllCreateOverlays(); }} />
          {isCreating ? <CreatePage form={createForm} onFormChange={handleFormChange} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); closeAllCreateOverlays(); }} onOpenPicker={handleOpenPicker} onOpenSpecPicker={handleOpenSpecPicker} onUpdateProductLimit={handleUpdateProductLimit} modalOpen={isPickerOpen || isSpecOpen || isBatchSpecOpen} /> : <ListPage filters={filters} setFilters={(value) => updateCurrentField("filters", value)} page={page} setPage={(value) => updateCurrentField("page", typeof value === "function" ? value(page) : value)} pageSize={pageSize} setPageSize={(value) => updateCurrentField("pageSize", value)} onCreate={() => setIsCreating(true)} activities={activities} />}
        </main>
      </section>

      {isCreating && isPickerOpen ? <ProductPickerModal filters={pickerFilters} setFilters={(value) => updateCurrentField("pickerFilters", value)} selectedProductIds={selectedPickerProductIds} onToggleProduct={handleTogglePickerProduct} onSave={handleSavePicker} onClose={() => setIsPickerOpen(false)} confirmText={currentMarketingPage === "限时购" ? "下一步" : "保存"} /> : null}
      {isCreating && isSpecOpen ? <SpecPickerModal product={activeSpecProduct} rule={createForm.rule} selectedSpecIds={activeSpecSelectedIds} onToggleSpecSelection={handleToggleSpecSelection} onToggleAllSpecs={handleToggleAllSpecSelections} onBatchToggleSpecs={handleBatchToggleSpecs} onClose={() => { setIsSpecOpen(false); setActiveSpecProductId(""); }} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} /> : null}
      {isCreating && isBatchSpecOpen && currentMarketingPage === "限时购" ? <BatchSpecStepModal products={batchSpecDraftProducts} rule={createForm.rule} selectedSpecIdsByProduct={batchSpecSelectedIdsByProduct} onToggleSpecSelection={handleBatchDraftToggleSpecSelection} onToggleAllSpecs={handleBatchDraftToggleAllSpecs} onBatchToggleSpecs={handleBatchDraftToggleSpecs} onClose={handleCloseBatchSpec} onSave={handleBatchSpecSave} onUpdateProductLimit={handleBatchDraftProductLimit} onUpdateSpecField={handleBatchDraftSpecField} onToggleSpecStatus={handleBatchDraftToggleSpecStatus} /> : null}
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}

















