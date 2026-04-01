import { useEffect, useMemo, useState } from "react";

const menuItems = [
  { label: "首页", icon: "⌂" },
  { label: "商品", icon: "◫" },
  { label: "交易", icon: "▣" },
  { label: "买家", icon: "◌" },
  { label: "店铺", icon: "◍", badge: "2" },
  { label: "系统", icon: "⚙" },
  { label: "统计", icon: "▥" },
  { label: "营销", icon: "✦", active: true },
  { label: "小程序", icon: "◎" },
  { label: "客服", icon: "⌕" }
];

const statuses = ["全部", "未开始", "进行中", "已结束"];
const activityCategories = ["常规活动", "节日活动", "品牌活动"];
const limitRules = ["按商品统一限购", "按每个规格独立限购"];
const productCategories = ["饮料酒水", "休闲食品", "日化用品"];

const seedActivities = [
  { id: "1111", name: "双11限时购活动", goodsCount: 12, startTime: "2026-11-01 00:00:00", endTime: "2026-11-11 23:59:59", status: "未开始", actions: ["查看", "编辑", "提前结束"] },
  { id: "0001", name: "国庆节限时购活动", goodsCount: 2, startTime: "2026-10-01 00:00:00", endTime: "2026-10-08 23:59:59", status: "未开始", actions: ["查看", "编辑", "提前结束"] },
  { id: "0011", name: "普通限时购活动", goodsCount: 30, startTime: "2026-03-01 00:00:00", endTime: "2026-04-20 23:59:59", status: "进行中", actions: ["查看", "编辑", "提前结束", "复制链接"] },
  { id: "0012", name: "元旦节限时购活动", goodsCount: 6, startTime: "2026-01-01 00:00:00", endTime: "2026-01-01 23:59:59", status: "已结束", actions: ["查看"] }
];

const pickerRows = [
  { id: "123456", name: "百岁山天然矿泉水570m", stock: 319, marketPrice: "￥30~50", specCount: 6, image: "百" },
  { id: "162101", name: "景田饮用纯净水560ml", stock: 1633, marketPrice: "￥100", specCount: 1, image: "景" }
];

const emptyFilters = { status: "全部", dateRange: "", activityName: "", activityId: "", productId: "", specId: "", productName: "" };
const initialCreateForm = { activityName: "", category: "", startTime: "", endTime: "", rule: limitRules[0], productKeyword: "", productId: "", specId: "", invalidSpecOnly: false };
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
        { id: "455009", name: "深灰色,160/80(XS),版本3", stock: 88, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "available" },
        { id: "455010", name: "深灰色,160/80(XS),版本4", stock: 76, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "available" },
        { id: "455011", name: "深灰色,160/80(XS),版本5", stock: 91, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "available" },
        { id: "455012", name: "深灰色,160/80(XS),版本6", stock: 64, marketPrice: "￥30", flashPrice: "", limitCount: "", activityStock: "", status: "available" }
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

function Header() {
  return (
    <header className="workspace-topbar">
      <div className="page-tabs">
        <div className="page-tab">首页-控制台 <span>×</span></div>
        <div className="page-tab is-current">限时购 <span>×</span></div>
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

function TabSection({ creating, onSwitchToList }) {
  const tabs = creating ? ["新增限时购"] : ["限时购管理", "参数配置", "限时购详情"];
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

function ListPage({ filters, setFilters, page, setPage, pageSize, setPageSize, onCreate }) {
  const filteredActivities = useMemo(() => seedActivities.filter((item) => {
    if (filters.status !== "全部" && item.status !== filters.status) return false;
    if (filters.activityId && !item.id.includes(filters.activityId.trim())) return false;
    if (filters.activityName && !item.name.includes(filters.activityName.trim())) return false;
    return true;
  }), [filters]);

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

function ProductPickerModal({ filters, setFilters, selectedProductIds, onToggleProduct, onSave, onClose }) {
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
        <div className="picker-footer"><button className="btn btn-create" type="button" onClick={onSave}>保存</button></div>
      </div>
    </div>
  );
}

function SpecPickerModal({ product, rule, onClose, onUpdateSpecField, onToggleSpecStatus }) {
  if (!product) return null;

  const isUnified = rule === limitRules[0];

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
          <div className="spec-batch-right">
            <button type="button">批量加入活动</button>
            <button type="button">批量撤出活动</button>
          </div>
        </div>

        <div className="spec-table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
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
                      <td><input type="checkbox" /></td>
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
                    <td><input type="checkbox" /></td>
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

        <div className="spec-footer"><button className="btn btn-create" type="button" onClick={onClose}>保存</button></div>
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

  const hasSelectedProducts = selectedProducts.length > 0;

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
              <div className="goods-filter-bar"><label className="mini-field"><span>商品名称:</span><input value={form.productKeyword} onChange={(e) => onFormChange("productKeyword", e.target.value)} /></label><label className="mini-field"><span>商品ID:</span><input value={form.productId} onChange={(e) => onFormChange("productId", e.target.value)} /></label><label className="mini-field mini-field-spec"><span>规格ID:</span><input value={form.specId} onChange={(e) => onFormChange("specId", e.target.value)} /></label><label className="check-item"><input type="checkbox" checked={form.invalidSpecOnly} onChange={(e) => onFormChange("invalidSpecOnly", e.target.checked)} /><span>筛选失效规格</span></label><button className="btn btn-reset" type="button">重置</button><button className="btn btn-search" type="button">搜索</button></div>
              <div className="goods-toolbar"><button className="btn btn-reset" type="button" onClick={onBatchRemoveProducts}>批量删除</button><button className="btn btn-reset export-btn" type="button">导出搜索结果</button></div>
              <div className="goods-table-shell"><table className="goods-table"><thead><tr><th><input type="checkbox" checked={selectedProducts.length > 0 && selectedGoodsIds.length === selectedProducts.length} onChange={(e) => onToggleGoodsSelection(e.target.checked ? selectedProducts.map((item) => item.id) : [])} /></th><th>商品</th><th>商城价</th><th>限时价</th><th>总限购数量</th><th>库存</th><th>规格数量</th><th>操作</th></tr></thead><tbody>{selectedProducts.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selectedGoodsIds.includes(item.id)} onChange={() => onToggleGoodsSelection(item.id)} /></td><td><div className="product-cell"><div className="product-image">{item.image}</div><div className="product-meta"><div className="product-name">{item.name}</div><div className="product-id">商品ID： {item.id}</div></div><button className="delete-link" type="button" onClick={() => onRemoveProduct(item.id)}>删除商品</button></div></td><td>{item.marketPrice}</td><td>{item.flashPrice || "-"}</td><td><input className={`limit-input ${!isUnified ? "is-disabled" : ""}`} value={getTotalLimitDisplay(item)} readOnly={!isUnified} disabled={!isUnified} onChange={(e) => onUpdateProductLimit(item.id, e.target.value.replace(/[^\d]/g, ""))} /></td><td>{item.stock}</td><td>共 {item.specs.length} 个 规格</td><td><div className="spec-action"><button type="button" className="spec-open-btn" onClick={() => onOpenSpecPicker(item.id)}>已选 {item.specs.filter((spec) => spec.status === "active").length} 个 规格 <span>+</span></button></div></td></tr>)}</tbody></table></div>
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [activeSpecProductId, setActiveSpecProductId] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [pickerFilters, setPickerFilters] = useState(initialPickerFilters);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedGoodsIds, setSelectedGoodsIds] = useState([]);
  const [selectedPickerProductIds, setSelectedPickerProductIds] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  const activeSpecProduct = selectedProducts.find((item) => item.id === activeSpecProductId) || selectedProducts[0];

  const closeAllCreateOverlays = () => {
    setIsPickerOpen(false);
    setIsSpecOpen(false);
    setActiveSpecProductId("");
  };

  const updateSelectedProduct = (productId, updater) => {
    setSelectedProducts((current) => current.map((item) => (item.id === productId ? updater(item) : item)));
  };

  const handleFormChange = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
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
      setSelectedPickerProductIds(value);
      return;
    }

    setSelectedPickerProductIds((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const handleSavePicker = () => {
    if (selectedPickerProductIds.length === 0) {
      setToastMessage("请先选择商品");
      return;
    }

    const catalogProducts = createInitialProducts();
    const selectedCatalogProducts = catalogProducts.filter((item) => selectedPickerProductIds.includes(item.id));

    setSelectedProducts((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const newProducts = selectedCatalogProducts.filter((item) => !existingIds.has(item.id));
      return [...current, ...newProducts];
    });

    setIsPickerOpen(false);
  };

  const handleToggleGoodsSelection = (value) => {
    if (Array.isArray(value)) {
      setSelectedGoodsIds(value);
      return;
    }

    setSelectedGoodsIds((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((current) => current.filter((item) => item.id !== productId));
    setSelectedGoodsIds((current) => current.filter((item) => item !== productId));
    setSelectedPickerProductIds((current) => current.filter((item) => item !== productId));

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
    setSelectedProducts((current) => current.filter((item) => !selectedIdSet.has(item.id)));
    setSelectedPickerProductIds((current) => current.filter((item) => !selectedIdSet.has(item)));

    if (activeSpecProductId && selectedIdSet.has(activeSpecProductId)) {
      setIsSpecOpen(false);
      setActiveSpecProductId("");
    }

    setSelectedGoodsIds([]);
  };

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleToggleSpecStatus = (productId, specId, nextStatus) => {
    const product = selectedProducts.find((item) => item.id === productId);
    if (!product) return;

    const activeSpecCount = product.specs.filter((spec) => spec.status === "active").length;
    const currentSpec = product.specs.find((spec) => spec.id === specId);
    const isLastActiveSpec = currentSpec?.status === "active" && nextStatus === "available" && activeSpecCount <= 1;

    if (isLastActiveSpec) {
      setToastMessage("请至少保留一个规格参与活动");
      return;
    }

    updateSelectedProduct(productId, (currentProduct) => ({
      ...currentProduct,
      specs: currentProduct.specs.map((spec) => {
        if (spec.id !== specId) return spec;

        const canJoin = spec.status === "available" && nextStatus === "active";
        const canRemove = spec.status === "active" && nextStatus === "available";
        if (!canJoin && !canRemove) {
          return spec;
        }

        return {
          ...spec,
          status: nextStatus,
          flashPrice: nextStatus === "available" ? "" : spec.flashPrice,
          limitCount: nextStatus === "available" ? "" : spec.limitCount,
          activityStock: nextStatus === "available" ? "" : spec.activityStock
        };
      })
    }));
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo-card"><div className="logo-thumb" /><div><div className="logo-title">闪电帮帮</div><div className="logo-tag">供应商后台</div></div></div>
        <nav className="sidebar-nav">{menuItems.map((item) => <a className={`sidebar-link ${item.active ? "is-active" : ""}`} href="#" key={item.label}><span className="sidebar-icon">{item.icon}</span><span>{item.label}</span>{item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}</a>)}</nav>
      </aside>

      <section className="workspace">
        <Header />
        <main className="workspace-main">
          <TabSection creating={isCreating} onSwitchToList={() => { setIsCreating(false); closeAllCreateOverlays(); }} />
          {isCreating ? <CreatePage form={createForm} onFormChange={handleFormChange} selectedProducts={selectedProducts} selectedGoodsIds={selectedGoodsIds} onToggleGoodsSelection={handleToggleGoodsSelection} onRemoveProduct={handleRemoveProduct} onBatchRemoveProducts={handleBatchRemoveProducts} onBack={() => { setIsCreating(false); closeAllCreateOverlays(); }} onOpenPicker={() => { setIsSpecOpen(false); setSelectedPickerProductIds(selectedProducts.map((item) => item.id)); setIsPickerOpen(true); }} onOpenSpecPicker={(productId) => { setIsPickerOpen(false); setActiveSpecProductId(productId); setIsSpecOpen(true); }} onUpdateProductLimit={handleUpdateProductLimit} modalOpen={isPickerOpen || isSpecOpen} /> : <ListPage filters={filters} setFilters={setFilters} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} onCreate={() => setIsCreating(true)} />}
        </main>
      </section>

      {isCreating && isPickerOpen ? <ProductPickerModal filters={pickerFilters} setFilters={setPickerFilters} selectedProductIds={selectedPickerProductIds} onToggleProduct={handleTogglePickerProduct} onSave={handleSavePicker} onClose={() => setIsPickerOpen(false)} /> : null}
      {isCreating && isSpecOpen ? <SpecPickerModal product={activeSpecProduct} rule={createForm.rule} onClose={() => setIsSpecOpen(false)} onUpdateSpecField={handleUpdateSpecField} onToggleSpecStatus={handleToggleSpecStatus} /> : null}
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}
















