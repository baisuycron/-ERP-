import { useMemo, useRef, useState } from "react";

const STORAGE_KEY = "erp-product-master-react-v4";
const brands = ["盒马工坊", "三拳优选", "城市鲜选", "日日鲜", "云仓甄选"];
const units = ["件", "盒", "箱", "袋", "瓶", "公斤"];
const categoryTree = [
  { label: "生鲜", children: [{ label: "水果", children: ["苹果", "柑橘", "浆果"] }, { label: "蔬菜", children: ["叶菜", "根茎", "菌菇"] }] },
  { label: "食品", children: [{ label: "休闲零食", children: ["坚果", "饼干", "糖巧"] }, { label: "粮油调味", children: ["大米", "食用油", "调味品"] }] },
  { label: "日用百货", children: [{ label: "清洁洗护", children: ["洗衣液", "纸品", "个人护理"] }, { label: "家庭用品", children: ["收纳", "厨具", "一次性用品"] }] }
];

const uid = (prefix) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
const fmt = (v = new Date()) => {
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const getCat2 = (c1) => categoryTree.find((i) => i.label === c1)?.children.map((i) => i.label) || [];
const getCat3 = (c1, c2) => categoryTree.find((i) => i.label === c1)?.children.find((i) => i.label === c2)?.children || [];
const getBarcodes = (product) => product.skus.flatMap((sku) => sku.barcodes.filter((item) => item.code));
const statusClass = (status) => ({ 已启用: "status-enabled", 已停用: "status-disabled", 已删除: "status-deleted" }[status] || "status-draft");

const initialBoundaries = [
  ["A", "阿"], ["B", "芭"], ["C", "擦"], ["D", "搭"], ["E", "蛾"], ["F", "发"], ["G", "噶"], ["H", "哈"], ["J", "击"], ["K", "喀"],
  ["L", "垃"], ["M", "妈"], ["N", "拿"], ["O", "哦"], ["P", "啪"], ["Q", "期"], ["R", "然"], ["S", "撒"], ["T", "塌"], ["W", "挖"],
  ["X", "昔"], ["Y", "压"], ["Z", "匝"]
];

function getChineseInitial(char) {
  for (let i = initialBoundaries.length - 1; i >= 0; i -= 1) {
    if (char.localeCompare(initialBoundaries[i][1], "zh-CN") >= 0) return initialBoundaries[i][0];
  }
  return "";
}

function getMnemonicFromName(name = "") {
  return [...name.trim()].reduce((result, char) => {
    if (/[A-Za-z]/.test(char)) return result + char.toUpperCase();
    if (/[0-9]/.test(char)) return result + char;
    if (/[一-龥]/.test(char)) return result + getChineseInitial(char);
    return result;
  }, "");
}

const createEmptyProduct = () => ({
  id: "",
  code: "",
  name: "",
  mnemonic: "",
  brand: "",
  category1: "",
  category2: "",
  category3: "",
  mainUnit: "",
  purchaseUnit: "",
  salesUnit: "",
  deliveryUnit: "",
  taxRate: 0,
  prices: { retailPrice: 0, memberPrice: 0, purchasePrice: 0, costPrice: 0 },
  skus: [{ id: uid("SKU"), code: "", name: "", spec: "", barcodes: [{ id: uid("BC"), code: "", unit: "件", primary: true }] }],
  status: "已启用",
  updatedAt: fmt(),
  updatedBy: "当前用户"
});

const seed = () => [
  {
    ...createEmptyProduct(),
    id: uid("P"),
    code: "SP-FR-0001",
    name: "云南蓝莓礼盒",
    mnemonic: "YNLM",
    brand: "三拳优选",
    category1: "生鲜",
    category2: "水果",
    category3: "浆果",
    mainUnit: "盒",
    purchaseUnit: "箱",
    salesUnit: "盒",
    deliveryUnit: "箱",
    taxRate: 9,
    prices: { retailPrice: 39.9, memberPrice: 35.9, purchasePrice: 24.5, costPrice: 26.8 },
    skus: [{ id: uid("SKU"), code: "SP-FR-0001-01", name: "云南蓝莓礼盒 125g*4", spec: "125g*4", barcodes: [{ id: uid("BC"), code: "6901234567801", unit: "盒", primary: true }] }],
    createdBy: "系统管理员",
    createdAt: fmt()
  },
  {
    ...createEmptyProduct(),
    id: uid("P"),
    code: "FD-SN-0007",
    name: "坚果综合分享装",
    mnemonic: "JGZH",
    brand: "盒马工坊",
    category1: "食品",
    category2: "休闲零食",
    category3: "坚果",
    mainUnit: "袋",
    purchaseUnit: "箱",
    salesUnit: "袋",
    deliveryUnit: "箱",
    taxRate: 13,
    prices: { retailPrice: 29.9, memberPrice: 27.5, purchasePrice: 14.2, costPrice: 16 },
    skus: [{ id: uid("SKU"), code: "FD-SN-0007-01", name: "坚果综合分享装 500g", spec: "500g", barcodes: [{ id: uid("BC"), code: "6909876543210", unit: "袋", primary: true }] }],
    status: "已停用",
    createdBy: "商品专员",
    createdAt: fmt()
  }
];

function readProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seed();
  } catch {
    return seed();
  }
}

function saveProducts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [products, setProducts] = useState(readProducts);
  const [filters, setFilters] = useState({ code: "", name: "", brand: "", category1: "", category2: "", category3: "", status: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createEmptyProduct);
  const [mnemonicDirty, setMnemonicDirty] = useState(false);
  const [toast, setToast] = useState("");
  const importRef = useRef(null);

  const filtered = useMemo(() => products.filter((item) => {
    if (filters.code && !item.code.includes(filters.code)) return false;
    if (filters.name && !item.name.includes(filters.name)) return false;
    if (filters.brand && item.brand !== filters.brand) return false;
    if (filters.category1 && item.category1 !== filters.category1) return false;
    if (filters.category2 && item.category2 !== filters.category2) return false;
    if (filters.category3 && item.category3 !== filters.category3) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  }), [filters, products]);

  const summary = useMemo(() => {
    const active = products.filter((item) => item.status !== "已删除");
    return [
      { title: "商品总数", value: active.length, meta: `启用 ${active.filter((item) => item.status === "已启用").length} 个` },
      { title: "停用商品", value: active.filter((item) => item.status === "已停用").length, meta: "停用后禁止新业务引用" },
      { title: "SKU总数", value: active.reduce((sum, item) => sum + item.skus.length, 0), meta: "导入导出颗粒度为 SKU" },
      { title: "有效条码", value: active.reduce((sum, item) => sum + getBarcodes(item).length, 0), meta: "条码全局唯一" }
    ];
  }, [products]);

  const flash = (message) => {
    setToast(message);
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => setToast(""), 2200);
  };

  const persist = (next) => {
    setProducts(next);
    saveProducts(next);
  };

  const openCreate = () => {
    setEditingId("");
    setForm(createEmptyProduct());
    setMnemonicDirty(false);
    setDrawerOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm(JSON.parse(JSON.stringify(product)));
    setMnemonicDirty(Boolean(product.mnemonic) && product.mnemonic.toUpperCase() !== getMnemonicFromName(product.name));
    setDrawerOpen(true);
  };

  const handleNameChange = (name) => {
    setForm((current) => {
      const next = { ...current, name };
      if (!mnemonicDirty) next.mnemonic = getMnemonicFromName(name);
      return next;
    });
  };

  const handleMnemonicChange = (mnemonic) => {
    setMnemonicDirty(true);
    setForm((current) => ({ ...current, mnemonic: mnemonic.toUpperCase() }));
  };

  const save = () => {
    if (!form.code.trim()) return flash("商品编码不能为空");
    if (!form.name.trim()) return flash("商品名称不能为空");
    if (!form.brand) return flash("请选择品牌");
    if (!form.category1 || !form.category2 || !form.category3) return flash("请完整选择三级分类");
    if (!form.mainUnit) return flash("请选择主单位");
    if (!form.skus.length) return flash("至少维护一个 SKU");
    const duplicate = products.find((item) => item.code === form.code && item.id !== editingId);
    if (duplicate) return flash("商品编码已存在");
    const payload = { ...form, mnemonic: form.mnemonic.toUpperCase(), updatedAt: fmt(), updatedBy: "当前用户" };
    const next = editingId ? products.map((item) => (item.id === editingId ? payload : item)) : [{ ...payload, id: uid("P"), createdBy: "当前用户", createdAt: fmt() }, ...products];
    persist(next);
    setDrawerOpen(false);
    setEditingId("");
    setForm(createEmptyProduct());
    flash("商品保存成功");
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const list = JSON.parse(String(reader.result));
        if (!Array.isArray(list)) throw new Error("导入文件必须是数组");
        persist([...list, ...products]);
        flash(`导入完成，共 ${list.length} 条`);
      } catch (error) {
        flash(`导入失败：${error.message}`);
      }
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  };

  const cat2List = getCat2(form.category1);
  const cat3List = getCat3(form.category1, form.category2);
  const filterCat2 = getCat2(filters.category1);
  const filterCat3 = getCat3(filters.category1, filters.category2);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">ERP</div><div><div className="brand-title">新零售ERP</div><div className="brand-subtitle">商品资料中心</div></div></div>
        <nav className="nav"><a className="nav-item" href="#">首页</a><a className="nav-item active" href="#">商品资料管理</a><a className="nav-item" href="#">库存中心</a><a className="nav-item" href="#">采购管理</a><a className="nav-item" href="#">系统设置</a></nav>
      </aside>
      <main className="main">
        <header className="topbar"><div><h1>商品资料管理</h1><p>支持商品、SKU、单位换算、条码、品牌分类等主数据的增删改查</p></div><div className="header-actions"><button className="btn btn-secondary" onClick={() => exportJson("商品导入模板.json", seed())}>下载导入模板</button><button className="btn btn-secondary" onClick={() => importRef.current?.click()}>导入商品</button><button className="btn btn-primary" onClick={openCreate}>新建商品</button><input ref={importRef} type="file" accept=".json" hidden onChange={handleImport} /></div></header>

        <section className="card summary-grid">{summary.map((item) => <article className="summary-item" key={item.title}><h3>{item.title}</h3><div className="summary-value">{item.value}</div><div className="summary-meta">{item.meta}</div></article>)}</section>

        <section className="card">
          <div className="section-title-row"><h2>查询条件</h2><div className="toolbar-actions"><button className="btn btn-light" onClick={() => setFilters({ code: "", name: "", brand: "", category1: "", category2: "", category3: "", status: "" })}>重置</button></div></div>
          <div className="filter-grid">
            <label className="field"><span>商品编码</span><input value={filters.code} onChange={(e) => setFilters({ ...filters, code: e.target.value })} /></label>
            <label className="field"><span>商品名称</span><input value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} /></label>
            <label className="field"><span>品牌</span><select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}><option value="">全部</option>{brands.map((i) => <option key={i}>{i}</option>)}</select></label>
            <label className="field"><span>状态</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">全部</option><option value="已启用">已启用</option><option value="已停用">已停用</option><option value="已删除">已删除</option></select></label>
            <label className="field"><span>一级分类</span><select value={filters.category1} onChange={(e) => setFilters({ ...filters, category1: e.target.value, category2: "", category3: "" })}><option value="">全部</option>{categoryTree.map((i) => <option key={i.label}>{i.label}</option>)}</select></label>
            <label className="field"><span>二级分类</span><select value={filters.category2} onChange={(e) => setFilters({ ...filters, category2: e.target.value, category3: "" })}><option value="">全部</option>{filterCat2.map((i) => <option key={i}>{i}</option>)}</select></label>
            <label className="field"><span>三级分类</span><select value={filters.category3} onChange={(e) => setFilters({ ...filters, category3: e.target.value })}><option value="">全部</option>{filterCat3.map((i) => <option key={i}>{i}</option>)}</select></label>
          </div>
        </section>

        <section className="card">
          <div className="section-title-row"><h2>商品列表</h2><div className="toolbar-actions"><button className="btn btn-light" onClick={() => exportJson(`商品资料导出_${Date.now()}.json`, filtered)}>导出当前结果</button><button className="btn btn-light" onClick={() => exportJson(`商品资料导出_${Date.now()}.json`, products.filter((item) => selectedIds.includes(item.id)))}>导出勾选项</button></div></div>
          <div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))} onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((item) => item.id) : [])} /></th><th>商品编码</th><th>商品名称</th><th>品牌</th><th>三级分类</th><th>主单位</th><th>SKU数</th><th>条码数</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{filtered.length === 0 ? <tr><td className="empty" colSpan="11">暂无符合条件的数据</td></tr> : filtered.map((product) => <tr key={product.id}><td><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, product.id])] : selectedIds.filter((id) => id !== product.id))} /></td><td>{product.code}</td><td>{product.name}</td><td>{product.brand}</td><td>{product.category3}</td><td>{product.mainUnit}</td><td>{product.skus.length}</td><td>{getBarcodes(product).length}</td><td><span className={`status-chip ${statusClass(product.status)}`}>{product.status}</span></td><td>{product.updatedAt}</td><td><div className="table-actions"><button className="link-btn" onClick={() => setDetail(product)}>查看</button><button className="link-btn" onClick={() => openEdit(product)}>编辑</button><button className="link-btn" onClick={() => persist(products.map((item) => item.id === product.id ? { ...item, status: product.status === "已启用" ? "已停用" : "已启用", updatedAt: fmt(), updatedBy: "当前用户" } : item))}>{product.status === "已启用" ? "停用" : "启用"}</button><button className="link-btn danger" onClick={() => persist(products.map((item) => item.id === product.id ? { ...item, status: "已删除", updatedAt: fmt(), updatedBy: "当前用户" } : item))}>删除</button></div></td></tr>)}</tbody></table></div>
        </section>
      </main>

      {drawerOpen ? <div className="overlay"><div className="drawer-mask" onClick={() => setDrawerOpen(false)} /><div className="drawer-panel"><div className="drawer-header"><div><h2>{editingId ? "编辑商品" : "新建商品"}</h2><p>React 版商品资料管理页</p></div><button className="icon-btn" onClick={() => setDrawerOpen(false)}>×</button></div><div className="drawer-body"><section className="form-section"><div className="section-headline"><h3>基础信息</h3><span>SPU 主档</span></div><div className="form-grid"><label className="field"><span>商品编码 *</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><label className="field"><span>商品名称 *</span><input value={form.name} onChange={(e) => handleNameChange(e.target.value)} onBlur={(e) => handleNameChange(e.target.value)} /></label><label className="field"><span>助记码</span><input value={form.mnemonic} onChange={(e) => handleMnemonicChange(e.target.value)} /></label><label className="field"><span>品牌 *</span><select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}><option value="">请选择品牌</option>{brands.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>一级分类 *</span><select value={form.category1} onChange={(e) => setForm({ ...form, category1: e.target.value, category2: "", category3: "" })}><option value="">请选择一级分类</option>{categoryTree.map((i) => <option key={i.label}>{i.label}</option>)}</select></label><label className="field"><span>二级分类 *</span><select value={form.category2} onChange={(e) => setForm({ ...form, category2: e.target.value, category3: "" })}><option value="">请选择二级分类</option>{cat2List.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>三级分类 *</span><select value={form.category3} onChange={(e) => setForm({ ...form, category3: e.target.value })}><option value="">请选择三级分类</option>{cat3List.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>税率(%)</span><input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></label></div></section><section className="form-section"><div className="section-headline"><h3>单位与价格</h3><span>多单位管理</span></div><div className="form-grid"><label className="field"><span>主单位 *</span><select value={form.mainUnit} onChange={(e) => setForm({ ...form, mainUnit: e.target.value })}><option value="">请选择主单位</option>{units.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>采购单位</span><select value={form.purchaseUnit} onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value })}><option value="">请选择采购单位</option>{units.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>销售单位</span><select value={form.salesUnit} onChange={(e) => setForm({ ...form, salesUnit: e.target.value })}><option value="">请选择销售单位</option>{units.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>配送单位</span><select value={form.deliveryUnit} onChange={(e) => setForm({ ...form, deliveryUnit: e.target.value })}><option value="">请选择配送单位</option>{units.map((i) => <option key={i}>{i}</option>)}</select></label><label className="field"><span>门店售价</span><input type="number" value={form.prices.retailPrice} onChange={(e) => setForm({ ...form, prices: { ...form.prices, retailPrice: Number(e.target.value) } })} /></label><label className="field"><span>会员价</span><input type="number" value={form.prices.memberPrice} onChange={(e) => setForm({ ...form, prices: { ...form.prices, memberPrice: Number(e.target.value) } })} /></label><label className="field"><span>采购价</span><input type="number" value={form.prices.purchasePrice} onChange={(e) => setForm({ ...form, prices: { ...form.prices, purchasePrice: Number(e.target.value) } })} /></label><label className="field"><span>成本价</span><input type="number" value={form.prices.costPrice} onChange={(e) => setForm({ ...form, prices: { ...form.prices, costPrice: Number(e.target.value) } })} /></label></div></section><section className="form-section"><div className="section-headline"><h3>SKU 与条码</h3><span>导入导出颗粒度 = SKU</span></div><div className="inline-toolbar"><h4>SKU 列表</h4><button className="btn btn-light" onClick={() => setForm({ ...form, skus: [...form.skus, { id: uid("SKU"), code: "", name: "", spec: "", barcodes: [{ id: uid("BC"), code: "", unit: form.mainUnit || "件", primary: true }] }] })}>新增 SKU</button></div><div className="repeat-list">{form.skus.map((sku, skuIndex) => <div className="repeat-card" key={sku.id}><div className="repeat-card-header"><div className="repeat-card-title">SKU {skuIndex + 1}</div><button className="btn btn-light" onClick={() => setForm({ ...form, skus: form.skus.filter((_, i) => i !== skuIndex) })}>删除 SKU</button></div><div className="inline-grid"><label className="field"><span>SKU 编码 *</span><input value={sku.code} onChange={(e) => { const next=[...form.skus]; next[skuIndex]={...sku, code:e.target.value}; setForm({ ...form, skus: next }); }} /></label><label className="field"><span>SKU 名称 *</span><input value={sku.name} onChange={(e) => { const next=[...form.skus]; next[skuIndex]={...sku, name:e.target.value}; setForm({ ...form, skus: next }); }} /></label><label className="field"><span>规格属性</span><input value={sku.spec} onChange={(e) => { const next=[...form.skus]; next[skuIndex]={...sku, spec:e.target.value}; setForm({ ...form, skus: next }); }} /></label><div className="field"><span>操作</span><button className="btn btn-light" onClick={() => { const next=[...form.skus]; next[skuIndex]={...sku, barcodes:[...sku.barcodes,{ id: uid("BC"), code:"", unit: form.mainUnit || "件", primary:false }]}; setForm({ ...form, skus: next }); }}>新增条码</button></div></div><div className="sub-list"><div className="sub-list-title">条码列表</div>{sku.barcodes.map((barcode, barcodeIndex) => <div className="sub-row" key={barcode.id}><input value={barcode.code} onChange={(e) => { const next=[...form.skus]; const codes=[...sku.barcodes]; codes[barcodeIndex]={...barcode, code:e.target.value}; next[skuIndex]={...sku, barcodes:codes}; setForm({ ...form, skus: next }); }} /><select value={barcode.unit} onChange={(e) => { const next=[...form.skus]; const codes=[...sku.barcodes]; codes[barcodeIndex]={...barcode, unit:e.target.value}; next[skuIndex]={...sku, barcodes:codes}; setForm({ ...form, skus: next }); }}>{units.map((i) => <option key={i}>{i}</option>)}</select><select value={String(barcode.primary)} onChange={(e) => { const next=[...form.skus]; const codes=[...sku.barcodes]; codes[barcodeIndex]={...barcode, primary:e.target.value === "true"}; next[skuIndex]={...sku, barcodes:codes}; setForm({ ...form, skus: next }); }}><option value="true">主条码</option><option value="false">附属条码</option></select><button className="btn btn-light" onClick={() => { const next=[...form.skus]; next[skuIndex]={...sku, barcodes:sku.barcodes.filter((_, i) => i !== barcodeIndex)}; setForm({ ...form, skus: next }); }}>删除</button></div>)}</div></div>)}</div></section></div><div className="drawer-footer"><button className="btn btn-light" onClick={() => setDrawerOpen(false)}>取消</button><button className="btn btn-primary" onClick={save}>保存商品</button></div></div></div> : null}
      {detail ? <div className="overlay"><div className="drawer-mask" onClick={() => setDetail(null)} /><div className="modal-panel"><div className="modal-header"><h2>商品详情</h2><button className="icon-btn" onClick={() => setDetail(null)}>×</button></div><div className="modal-body"><div className="detail-grid"><section className="detail-card"><h3>基础信息</h3><dl className="detail-list"><dt>商品编码</dt><dd>{detail.code}</dd><dt>商品名称</dt><dd>{detail.name}</dd><dt>品牌</dt><dd>{detail.brand}</dd><dt>分类</dt><dd>{detail.category1} / {detail.category2} / {detail.category3}</dd><dt>状态</dt><dd><span className={`status-chip ${statusClass(detail.status)}`}>{detail.status}</span></dd></dl></section><section className="detail-card"><h3>SKU 与条码</h3><div className="pill-list">{detail.skus.map((sku) => <span className="pill" key={sku.id}>{sku.code} | {sku.name}</span>)}</div><div className="pill-list detail-gap">{getBarcodes(detail).map((barcode) => <span className="pill" key={barcode.id}>{barcode.code} | {barcode.unit}</span>)}</div></section></div></div></div></div> : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
