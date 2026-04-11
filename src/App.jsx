import { useEffect, useMemo, useState } from "react";

import { useRef } from "react";
import * as XLSX from "xlsx";

const buyerPageNames = ["买家列表"];
const shopPageNames = ["发票管理"];
const shopInvoiceStatusTabs = ["全部", "待开票", "已驳回", "已撤销", "已开票"];
const initialShopInvoiceFilters = {
  orderNo: "",
  invoiceType: "全部",
  invoiceStatus: "全部",
  orderStatus: "全部",
  afterSaleStatus: "全部",
  paidAtRange: { startDate: "", endDate: "" },
  appliedAtRange: { startDate: "", endDate: "" },
  invoicedAtRange: { startDate: "", endDate: "" },
  invoiceTitle: "",
  taxpayerId: "",
  buyerAccount: "",
  store: ""
};

const shopInvoiceAfterSaleStatusOptions = [
  "待供应商审核",
  "待买家寄货",
  "待供应商收货",
  "供应商拒绝",
  "待平台确认",
  "退款成功",
  "平台驳回",
  "退款中",
  "买家取消"
];

function parseMoneyValue(value) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoneyDisplay(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
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
const buyerPcMallOrderTabs = ["待申请开票(20)", "已申请开票(13)", "已开具发票"];
const buyerPcMallSidebarGroups = [
  { title: "商家中心" },
  { title: "订单中心", items: ["我的订单", "咨询管理", "评价管理", "采购统计"] },
  { title: "资产中心", items: ["我的优惠券"] },
  { title: "我的关注", items: ["商品关注", "店铺关注", "常购清单"] },
  { title: "售后服务", items: ["退款退货", "投诉维权", "平台客服"] },
  { title: "账户管理", items: ["收货地址管理", "发票管理", "个人信息", "账户安全管理", "身份认证"], activeItem: "发票管理" }
];
const buyerPcMallInvoiceRows = [
  { orderNo: "20260212022895768", product: "小米13 Pro 5G手机", spec: "12GB+256GB 陶瓷黑", price: "¥5,299.00", time: "2023-05-28 14:30", shop: "胖子炒货", store: "闪购一店", storeId: "ID:121301", status: "待申请", productTone: "phone" },
  { orderNo: "20260212022895769", product: "索尼 WH-1000XM5 耳机", spec: "黑色 降噪版", price: "¥2,499.00", time: "2023-06-15 09:45", shop: "老百姓大药房", store: "闪购二店", storeId: "ID:121302", status: "待申请", productTone: "earphone" },
  { orderNo: "20260212022895770", product: "美的破壁料理机", spec: "MJ-BL1543A 1.75L", price: "¥899.00", time: "2023-07-02 16:20", shop: "天猫超市", store: "-", storeId: "", status: "已驳回", extraStatus: "查看原因", productTone: "appliance" },
  { orderNo: "20260212022895771", product: "海信 75E3F 75英寸电视", spec: "4K超高清 智能语音", price: "¥4,999.00", time: "2023-07-18 11:15", shop: "苏宁易购", store: "-", storeId: "", status: "已驳回", extraStatus: "查看原因", productTone: "tv" },
  { orderNo: "20260212022895772", product: "米家空气净化器Pro H", spec: "AC-M7-SC 除甲醛", price: "¥1,699.00", time: "2023-08-05 13:50", shop: "小米有品", store: "-", storeId: "", status: "已撤销", productTone: "purifier" }
];
const buyerPcMallAppliedInvoiceRows = [
  { orderNo: "202306150010002", invoiceTitle: "北京科技有限公司", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥12,568.00", appliedAt: "2023-06-15 14:30", shop: "北京科技有限公司", store: "北京朝阳门店", storeId: "(102325)", status: "已申请" },
  { orderNo: "202306100020003", invoiceTitle: "上海浦东门店", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥8,420.00", appliedAt: "2023-06-10 10:15", shop: "上海贸易有限公司", store: "北京朝阳门店", storeId: "(102325)", status: "已申请" },
  { orderNo: "202306050030001", invoiceTitle: "广州天河门店", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥3,150.00", appliedAt: "2023-06-05 16:45", shop: "广州科技股份有限公司", store: "北京朝阳门店", storeId: "(102325)", status: "已申请" },
  { orderNo: "202305280040005", invoiceTitle: "深圳南山门店", invoiceType: "电子增值税专用发票", invoiceTypeTone: "blue", amount: "¥6,780.00", appliedAt: "2023-05-28 09:20", shop: "深圳电子有限公司", store: "北京朝阳门店", storeId: "(102325)", status: "已申请" },
  { orderNo: "202305200050006", invoiceTitle: "杭州西湖门店", invoiceType: "电子普通发票", invoiceTypeTone: "purple", amount: "¥4,250.00", appliedAt: "2023-05-20 13:10", shop: "杭州服饰有限公司", store: "北京朝阳门店", storeId: "(102325)", status: "已申请" }
];
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
    store: "闪电帮帮门店\n(ID:2232453)",
    paidAt: "2026-04-01 19:27:31",
    appliedAt: "2026-04-01 19:35:18",
    modifiedAt: "2026-04-02 15:25:19",
    applicationStatus: "已完成",
    invoicedAt: "2026-04-06 15:11:00",
    invoiceNo: "13216486611",
    invoiceRemark: "4月9日我提交了一批开票申请，请帮我合并开票；【是否需要单开：否】",
    invoiceMethod: "手动",
    invoiceStatus: "已开票",
    invoiceStatusTone: "success",
    afterSaleStatusDetail: "退款成功",
    afterSaleExpired: "否",
    actions: ["发票详情", "修改发票"]
  },
  {
    orderNo: "2026040315224679",
    invoiceType: "电子增值税专用发票",
    invoiceTitle: "深圳广联科技有限公司",
    taxpayerId: "91440300111222333P",
    orderStatus: "已完成",
    orderAmount: "¥4599.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥4599.00",
    shouldInvoiceAmount: "¥4599.00",
    invoiceAmountWithTax: "¥4599.00",
    buyerAccount: "techmall (ID:20773)",
    store: "南山闪购店\n(ID:2232512)",
    paidAt: "2026-04-03 15:22:46",
    appliedAt: "2026-04-03 16:05:11",
    modifiedAt: "2026-04-04 09:18:45",
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
    invoiceTitle: "杭州优选商贸有限公司",
    taxpayerId: "91330100666777888L",
    orderStatus: "售后中",
    orderAmount: "¥699.00",
    afterSaleStatus: "退款中",
    afterSaleAmount: "¥699.00",
    amount: "¥699.00",
    shouldInvoiceAmount: "¥699.00",
    invoiceAmountWithTax: "¥699.00",
    buyerAccount: "hz-select (ID:19824)",
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
    rejectReason: "订单存在退款处理中记录，请待售后完成后重新申请开票。",
    afterSaleStatusDetail: "售后审核中",
    afterSaleExpired: "否",
    actions: ["发票详情", "查看原因"]
  },
  {
    orderNo: "2026040517461208",
    invoiceType: "电子普通发票",
    invoiceTitle: "苏州工业设备有限公司",
    taxpayerId: "91320500777888999M",
    orderStatus: "已完成",
    orderAmount: "¥980.00",
    afterSaleStatus: "-",
    afterSaleAmount: "¥0.00",
    amount: "¥980.00",
    shouldInvoiceAmount: "¥980.00",
    invoiceAmountWithTax: "¥980.00",
    buyerAccount: "szfactory (ID:20164)",
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
    afterSaleStatusDetail: "-",
    afterSaleExpired: "否",
    actions: ["发票详情", "查看记录"]
  }
];
const shopInvoiceColumnDefinitions = [
  { key: "select", label: "", width: 44, alwaysVisible: true, frozen: true, renderHeader: () => <input type="checkbox" />, renderCell: () => <input type="checkbox" /> },
  { key: "orderNo", label: "订单号", width: 180, visible: true, frozen: true, renderCell: (item) => <button className="buyer-link-btn" type="button">{item.orderNo}</button> },
  { key: "invoiceType", label: "发票类型", width: 160, visible: true, renderCell: (item) => item.invoiceType },
  { key: "invoiceTitle", label: "发票抬头", width: 200, visible: true, renderCell: (item) => item.invoiceTitle },
  { key: "taxpayerId", label: "纳税人识别号", width: 180, visible: true, renderCell: (item) => item.taxpayerId },
  { key: "orderStatus", label: "订单状态", width: 110, visible: true, renderCell: (item) => item.orderStatus },
  { key: "orderAmount", label: "订单总额", width: 120, visible: true, renderCell: (item) => item.orderAmount },
  { key: "afterSaleStatus", label: "售后状态", width: 110, visible: true, renderCell: (item) => item.afterSaleStatus },
  { key: "afterSaleAmount", label: "售后金额总计", width: 130, visible: true, renderCell: (item) => item.afterSaleAmount },
  { key: "amount", label: "申请开票金额", width: 140, visible: true, renderCell: (item) => <div className="shop-invoice-amount">{item.amount}</div> },
  { key: "shouldInvoiceAmount", label: "发票应开金额", width: 140, visible: true, renderCell: (item) => item.shouldInvoiceAmount },
  { key: "invoiceAmountWithTax", label: "发票金额（含税）", width: 156, visible: true, headerClassName: "shop-invoice-col-amount-tax", cellClassName: "shop-invoice-col-amount-tax", renderCell: (item) => item.invoiceAmountWithTax },
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
  { key: "modifiedAt", label: "修改时间", width: 180, visible: true, renderCell: (item) => item.modifiedAt },
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
const buyerPcMallBatchInvoiceForm = {
  invoiceType: "电子普通发票",
  titleType: "个人",
  titleName: "",
  taxpayerId: "",
  storeName: "",
  invoiceContent: "商品类别",
  receiverPhone: "",
  receiverEmail: "",
  remark: ""
};
const initialBatchInvoiceFieldErrors = {
  titleName: false,
  taxpayerId: false,
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

const shopInvoiceOrderDetailSeed = {
  "2026040119104267": {
    orderStatusText: "待收货",
    afterSaleStatusText: "待买家寄货",
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
        quantity: "3",
        subtotal: "3600",
        afterSaleStatus: "退款成功",
        afterSaleCount: "1",
        actualAfterSaleCount: "1",
        afterSaleAmount: "1200.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 3 件，商品，总商品金额：",
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
        spec: "SZ-4599",
        unitPrice: "4599",
        quantity: "1",
        subtotal: "4599",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 1 件，商品，总商品金额：",
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
    orderStatusText: "售后中",
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
        spec: "HZ-699",
        unitPrice: "699",
        quantity: "1",
        subtotal: "699",
        afterSaleStatus: "退款中",
        afterSaleCount: "1",
        actualAfterSaleCount: "0",
        afterSaleAmount: "699.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 1 件，商品，总商品金额：",
      goodsAmount: "¥699",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥699",
      afterSaleAmount: "¥699",
      applyInvoiceAmount: "¥699",
      shouldInvoiceAmount: "¥699"
    }
  },
  "2026040517461208": {
    orderStatusText: "已完成",
    afterSaleStatusText: "-",
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
        spec: "SU-980",
        unitPrice: "980",
        quantity: "1",
        subtotal: "980",
        afterSaleStatus: "-",
        afterSaleCount: "0",
        actualAfterSaleCount: "0",
        afterSaleAmount: "0.00",
        shippedCount: "1"
      }
    ],
    summary: {
      itemCount: "共 1 件，商品，总商品金额：",
      goodsAmount: "¥980",
      shippingFee: "¥0",
      taxFee: "¥0",
      orderAmount: "¥980",
      afterSaleAmount: "¥0",
      applyInvoiceAmount: "¥980",
      shouldInvoiceAmount: "¥980"
    }
  }
};

function createShopInvoiceOrderDetail(row) {
  if (!row) return null;
  const seed = shopInvoiceOrderDetailSeed[row.orderNo];
  if (seed) {
    return {
      orderNo: row.orderNo,
      orderStatusText: seed.orderStatusText,
      afterSaleStatusText: seed.afterSaleStatusText,
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
  if (!row || row.invoiceStatus !== "已开票") return null;
  const orderDetail = createShopInvoiceOrderDetail(row);
  return {
    invoiceInfo: {
      applicationStatus: row.applicationStatus,
      invoiceStatus: row.invoiceStatus,
      invoiceType: row.invoiceType,
      appliedAt: row.appliedAt,
      invoicePlatform: "闪电帮帮",
      invoiceNo: row.invoiceNo,
      invoiceAmountWithTax: row.invoiceAmountWithTax,
      invoiceAmountWithoutTax: formatMoneyDisplay(Math.max(parseMoneyValue(row.invoiceAmountWithTax) - 0.04, 0)),
      invoicedAt: row.invoicedAt
    },
    titleInfo: {
      invoiceTitle: row.invoiceTitle,
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

function TopActionIcon({ type }) {
  const commonProps = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };

  switch (type) {
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

function BuyerPcMallPage({ onPortalActionClick }) {
  const [activeTab, setActiveTab] = useState(buyerPcMallOrderTabs[0]);
  const [invoicePageView, setInvoicePageView] = useState("list");
  const [selectedInvoiceOrderNos, setSelectedInvoiceOrderNos] = useState([buyerPcMallInvoiceRows[0].orderNo]);
  const [selectedAppliedInvoiceOrderNos, setSelectedAppliedInvoiceOrderNos] = useState([]);
  const [selectedPendingAccounts, setSelectedPendingAccounts] = useState(["wujing146(总部)"]);
  const [selectedPendingStatuses, setSelectedPendingStatuses] = useState(["待申请", "已驳回", "已撤销"]);
  const [selectedAppliedAccounts, setSelectedAppliedAccounts] = useState([]);
  const [batchInvoiceNotice, setBatchInvoiceNotice] = useState("");
  const [batchInvoiceForm, setBatchInvoiceForm] = useState(buyerPcMallBatchInvoiceForm);
  const [batchInvoiceOrderItems, setBatchInvoiceOrderItems] = useState([]);
  const [batchInvoiceFieldErrors, setBatchInvoiceFieldErrors] = useState(initialBatchInvoiceFieldErrors);
  const allInvoiceRowsSelected = buyerPcMallInvoiceRows.length > 0 && selectedInvoiceOrderNos.length === buyerPcMallInvoiceRows.length;
  const allAppliedInvoiceRowsSelected = buyerPcMallAppliedInvoiceRows.length > 0 && selectedAppliedInvoiceOrderNos.length === buyerPcMallAppliedInvoiceRows.length;
  const selectedInvoiceSummary = useMemo(() => {
    const selectedOrderSet = new Set(selectedInvoiceOrderNos);
    const selectedRows = buyerPcMallInvoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const totalAmount = selectedRows.reduce((sum, item) => sum + (getPriceNumber(item.price) || 0), 0);

    return {
      count: selectedRows.length,
      totalAmount
    };
  }, [selectedInvoiceOrderNos]);
  const selectedAppliedInvoiceSummary = useMemo(() => {
    const selectedOrderSet = new Set(selectedAppliedInvoiceOrderNos);
    const selectedRows = buyerPcMallAppliedInvoiceRows.filter((item) => selectedOrderSet.has(item.orderNo));
    const totalAmount = selectedRows.reduce((sum, item) => sum + (getPriceNumber(item.amount) || 0), 0);

    return {
      count: selectedRows.length,
      totalAmount
    };
  }, [selectedAppliedInvoiceOrderNos]);
  const batchInvoiceSummary = useMemo(() => {
    const enabledRows = batchInvoiceOrderItems.filter((item) => item.needInvoice);
    const totalAmount = enabledRows.reduce((sum, item) => sum + (getPriceNumber(item.price) || 0), 0);

    return {
      count: batchInvoiceOrderItems.length,
      enabledCount: enabledRows.length,
      totalAmount
    };
  }, [batchInvoiceOrderItems]);

  useEffect(() => {
    if (!batchInvoiceNotice) return undefined;
    const timerId = window.setTimeout(() => setBatchInvoiceNotice(""), 2200);
    return () => window.clearTimeout(timerId);
  }, [batchInvoiceNotice]);

  const handleToggleAllInvoiceRows = (checked) => {
    setSelectedInvoiceOrderNos(checked ? buyerPcMallInvoiceRows.map((item) => item.orderNo) : []);
  };

  const handleToggleInvoiceRow = (orderNo) => {
    setSelectedInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleToggleAllAppliedInvoiceRows = (checked) => {
    setSelectedAppliedInvoiceOrderNos(checked ? buyerPcMallAppliedInvoiceRows.map((item) => item.orderNo) : []);
  };

  const handleToggleAppliedInvoiceRow = (orderNo) => {
    setSelectedAppliedInvoiceOrderNos((current) => (
      current.includes(orderNo)
        ? current.filter((item) => item !== orderNo)
        : [...current, orderNo]
    ));
  };

  const handleOpenBatchInvoicePage = () => {
    if (selectedInvoiceOrderNos.length === 0) {
      setBatchInvoiceNotice("请先勾选订单，再进行批量申请开票。");
      return;
    }

    const selectedOrderSet = new Set(selectedInvoiceOrderNos);
    const selectedRows = buyerPcMallInvoiceRows
      .filter((item) => selectedOrderSet.has(item.orderNo))
      .map((item) => ({
        ...item,
        needInvoice: true,
        buyerAccount: "zhuda123"
      }));

    setBatchInvoiceOrderItems(selectedRows);
    setBatchInvoiceFieldErrors(initialBatchInvoiceFieldErrors);
    setInvoicePageView("batch");
  };

  const handleBatchInvoiceFieldChange = (field, value) => {
    setBatchInvoiceForm((current) => ({
      ...current,
      [field]: value
    }));
    if (batchInvoiceFieldErrors[field]) {
      setBatchInvoiceFieldErrors((current) => ({
        ...current,
        [field]: false
      }));
    }
  };

  const handleBatchInvoiceBack = () => {
    setInvoicePageView("list");
  };

  const handleBatchInvoiceSubmit = () => {
    const titleName = batchInvoiceForm.titleName.trim();
    const taxpayerId = batchInvoiceForm.taxpayerId.trim();
    const receiverPhone = batchInvoiceForm.receiverPhone.trim();
    const receiverEmail = batchInvoiceForm.receiverEmail.trim();
    const receiverMissing = !receiverPhone && !receiverEmail;
    const nextErrors = {
      titleName: !titleName,
      taxpayerId: !taxpayerId,
      receiverPhone: receiverMissing,
      receiverEmail: receiverMissing
    };

    if (nextErrors.titleName || nextErrors.taxpayerId || nextErrors.receiverPhone || nextErrors.receiverEmail) {
      setBatchInvoiceFieldErrors(nextErrors);

      if (nextErrors.titleName) {
        setBatchInvoiceNotice("抬头名称为空，请检查");
        return;
      }

      if (nextErrors.taxpayerId) {
        setBatchInvoiceNotice("纳税人识别号为空，请检查");
        return;
      }

      if (receiverMissing) {
        setBatchInvoiceNotice("收票人手机为空，请检查");
        return;
      }

      return;
    }

    setBatchInvoiceFieldErrors(initialBatchInvoiceFieldErrors);
    setBatchInvoiceNotice("提交申请成功");
  };

  const handleToggleBatchInvoiceOrder = (orderNo) => {
    setBatchInvoiceOrderItems((current) => current.map((item) => (
      item.orderNo === orderNo
        ? { ...item, needInvoice: !item.needInvoice }
        : item
    )));
  };

  const handleRemoveBatchInvoiceOrder = (orderNo) => {
    setBatchInvoiceOrderItems((current) => current.filter((item) => item.orderNo !== orderNo));
  };

  const isPendingTab = activeTab === buyerPcMallOrderTabs[0];
  const isAppliedTab = activeTab === buyerPcMallOrderTabs[1];
  const isBatchInvoiceView = invoicePageView === "batch";

  if (isBatchInvoiceView) {
    return (
      <div className="pc-mall-shell pc-mall-shell-batch">
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

        <div className="pc-mall-main pc-mall-main-batch">
          <aside className="pc-mall-sidebar pc-mall-sidebar-batch">
            {buyerPcMallSidebarGroups.map((group) => (
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

          <section className="pc-mall-content pc-mall-content-batch">
            <div className="pc-mall-breadcrumb">商家中心 <span>››</span> 发票管理 <span>››</span> 批量申请开票</div>
            <div className="pc-mall-panel">
              <div className="pc-mall-panel-header pc-mall-panel-header-batch">
                <h1>批量申请开票</h1>
                <button className="pc-mall-back-link" type="button" onClick={handleBatchInvoiceBack}>← 返回</button>
              </div>

              <section className="pc-mall-batch-card">
                <h2>发票抬头信息</h2>
                <div className="pc-mall-batch-form-grid">
                  <div className="pc-mall-batch-field">
                    <span>发票类型 <em>*</em></span>
                    <div className="pc-mall-chip-row">
                      {["电子普通发票", "电子增值税专用发票"].map((option) => (
                        <button className={`pc-mall-chip ${batchInvoiceForm.invoiceType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleBatchInvoiceFieldChange("invoiceType", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pc-mall-batch-field pc-mall-batch-field-title-type">
                    <span>抬头类型 <em>*</em></span>
                    <div className="pc-mall-chip-row">
                      {["个人", "单位"].map((option) => (
                        <button className={`pc-mall-chip ${batchInvoiceForm.titleType === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleBatchInvoiceFieldChange("titleType", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>抬头名称 <em>*</em></span>
                    <div className="pc-mall-input-action-row">
                      <input className={batchInvoiceFieldErrors.titleName ? "is-error" : ""} placeholder="请输入发票抬头名称" value={batchInvoiceForm.titleName} onChange={(e) => handleBatchInvoiceFieldChange("titleName", e.target.value)} />
                      <button className="pc-mall-text-btn" type="button">选择抬头</button>
                    </div>
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>纳税人识别号 <em>*</em></span>
                    <input className={batchInvoiceFieldErrors.taxpayerId ? "is-error" : ""} placeholder="请输入纳税人识别号" value={batchInvoiceForm.taxpayerId} onChange={(e) => handleBatchInvoiceFieldChange("taxpayerId", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>闪购门店</span>
                    <input placeholder="请输入闪购门店名称（选填）" value={batchInvoiceForm.storeName} onChange={(e) => handleBatchInvoiceFieldChange("storeName", e.target.value)} />
                  </label>
                  <div className="pc-mall-batch-field">
                    <span>发票内容 <em>*</em></span>
                    <div className="pc-mall-chip-row">
                      {["商品类别", "商品明细"].map((option) => (
                        <button className={`pc-mall-chip ${batchInvoiceForm.invoiceContent === option ? "is-active" : ""}`} key={option} type="button" onClick={() => handleBatchInvoiceFieldChange("invoiceContent", option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="pc-mall-batch-card">
                <div className="pc-mall-batch-section-head">
                  <h2>收票信息</h2>
                  <span>收票人手机和邮箱至少填一项</span>
                </div>
                <div className="pc-mall-batch-form-grid pc-mall-batch-form-grid-receiver">
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>收票人手机</span>
                    <input className={batchInvoiceFieldErrors.receiverPhone ? "is-error" : ""} placeholder="请输入收票人手机号（选填）" value={batchInvoiceForm.receiverPhone} onChange={(e) => handleBatchInvoiceFieldChange("receiverPhone", e.target.value)} />
                  </label>
                  <label className="pc-mall-batch-field pc-mall-batch-field-full">
                    <span>收票人邮箱</span>
                    <input className={batchInvoiceFieldErrors.receiverEmail ? "is-error" : ""} placeholder="请输入收票人邮箱（选填）" value={batchInvoiceForm.receiverEmail} onChange={(e) => handleBatchInvoiceFieldChange("receiverEmail", e.target.value)} />
                  </label>
                </div>
              </section>

              <section className="pc-mall-batch-card">
                <div className="pc-mall-batch-summary-head">
                  <h2>{`本次批量申请开票共 ${batchInvoiceSummary.count} 笔订单，合计金额：￥${batchInvoiceSummary.totalAmount.toFixed(2)}`}</h2>
                  <span>{`需开票订单 ${batchInvoiceSummary.enabledCount} 笔`}</span>
                </div>
                <div className="pc-mall-table-wrap pc-mall-batch-table-wrap">
                  <table className="pc-mall-table pc-mall-batch-table">
                    <thead>
                      <tr>
                        <th>订单号</th>
                        <th>订单状态</th>
                        <th>订单实付金额</th>
                        <th>支付时间</th>
                        <th>买家账号</th>
                        <th>闪购门店</th>
                        <th>需要单开</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchInvoiceOrderItems.map((item) => (
                        <tr key={item.orderNo}>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>{item.status}</td>
                          <td>{item.price}</td>
                          <td>{item.time}</td>
                          <td>{item.buyerAccount}</td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              {item.storeId ? <div>{item.storeId}</div> : null}
                            </div>
                          </td>
                          <td>
                            <button className={`pc-mall-switch ${item.needInvoice ? "is-on" : ""}`} type="button" onClick={() => handleToggleBatchInvoiceOrder(item.orderNo)}>
                              <span />
                            </button>
                          </td>
                          <td><button className="pc-mall-inline-remove" type="button" onClick={() => handleRemoveBatchInvoiceOrder(item.orderNo)}>移除</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="pc-mall-batch-card">
                <h2>备注信息</h2>
                <label className="pc-mall-batch-field pc-mall-batch-field-full">
                  <textarea placeholder="请尽量详细填写备注信息，告知卖家需要如何开票。" value={batchInvoiceForm.remark} onChange={(e) => handleBatchInvoiceFieldChange("remark", e.target.value)} />
                </label>
              </section>

              <div className="pc-mall-batch-footer">
                <button className="pc-mall-btn pc-mall-batch-footer-btn" type="button" onClick={handleBatchInvoiceBack}>取消</button>
                <button className="pc-mall-batch-submit-btn" type="button" onClick={handleBatchInvoiceSubmit}>提交申请</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-mall-shell">
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
          {buyerPcMallSidebarGroups.map((group) => (
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
          {batchInvoiceNotice ? <div className="page-toast">{batchInvoiceNotice}</div> : null}
          <div className="pc-mall-breadcrumb">商家中心 <span>››</span> 发票管理</div>
          <div className="pc-mall-panel">
            <div className="pc-mall-panel-header">
              <h1>发票管理</h1>
            </div>

            <div className="pc-mall-tabbar">
              <div className="pc-mall-tabs">
                {buyerPcMallOrderTabs.map((tab) => (
                  <button className={`pc-mall-tab ${activeTab === tab ? "is-active" : ""}`} key={tab} type="button" onClick={() => {
                    setActiveTab(tab);
                    setInvoicePageView("list");
                  }}>
                    {tab}
                  </button>
                ))}
              </div>
              <button className="pc-mall-invoice-type-btn" type="button">发票抬头管理</button>
            </div>

            {isPendingTab ? (
              <>
                <section className="pc-mall-filter-card">
                  <div className="pc-mall-filter-grid">
                    <label className="pc-mall-filter-field">
                      <span>订单关键词</span>
                      <input defaultValue="支持订单号/商品名称/店铺名称/快递单号/商品ID" />
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
                      <input placeholder="请输入闪购门店名称/闪购门店ID，支持全模糊查询" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>申请状态</span>
                      <PcMallMultiSelect options={buyerPcMallStatusOptions} values={selectedPendingStatuses} onChange={setSelectedPendingStatuses} placeholder="请选择申请状态" />
                    </label>
                    <div className="pc-mall-filter-actions pc-mall-filter-actions-inline">
                      <button className="pc-mall-btn pc-mall-btn-primary" type="button">查询</button>
                      <button className="pc-mall-btn" type="button">重置</button>
                    </div>
                  </div>
                </section>

                <div className="pc-mall-table-toolbar">
                  <div className="pc-mall-toolbar-left">
                    <button className="pc-mall-batch-btn" type="button" onClick={handleOpenBatchInvoicePage}>批量申请开票</button>
                    <div className="pc-mall-toolbar-summary">已选中 {selectedInvoiceSummary.count} 笔订单，合计金额： <strong>{`￥${selectedInvoiceSummary.totalAmount.toFixed(2)}`}</strong></div>
                  </div>
                  <button className="pc-mall-btn pc-mall-export-btn" type="button">导出数据</button>
                </div>

                <div className="pc-mall-table-wrap">
                  <table className="pc-mall-table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allInvoiceRowsSelected} onChange={(e) => handleToggleAllInvoiceRows(e.target.checked)} /></th>
                        <th>订单号</th>
                        <th>商品信息</th>
                        <th>订单实付金额</th>
                        <th>支付时间</th>
                        <th>店铺名称</th>
                        <th>闪购门店</th>
                        <th>申请状态</th>
                        <th>发票操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerPcMallInvoiceRows.map((item) => (
                        <tr key={item.orderNo}>
                          <td><input type="checkbox" checked={selectedInvoiceOrderNos.includes(item.orderNo)} onChange={() => handleToggleInvoiceRow(item.orderNo)} /></td>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>
                            <div className="pc-mall-product-cell">
                              <div className={`pc-mall-product-thumb is-${item.productTone}`} />
                              <div className="pc-mall-product-meta">
                                <div className="pc-mall-product-name">{item.product}</div>
                                <div className="pc-mall-product-spec">{item.spec}</div>
                              </div>
                              <button className="pc-mall-more-link" type="button">更多</button>
                            </div>
                          </td>
                          <td>{item.price}</td>
                          <td>{item.time}</td>
                          <td>{item.shop}</td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              {item.storeId ? <div>{item.storeId}</div> : null}
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-status-cell">
                              <span>{item.status}</span>
                              {item.extraStatus ? <button className="pc-mall-inline-link" type="button">{item.extraStatus}</button> : null}
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-action-cell">
                              <button className="pc-mall-contact-btn" type="button">联系卖家</button>
                              <button className="pc-mall-apply-btn" type="button">申请开票</button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                      <span>订单关键字</span>
                      <div className="pc-mall-input-with-icon">
                        <input placeholder="输入订单号/商品名称" />
                        <i>⌕</i>
                      </div>
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>下单账号</span>
                      <PcMallMultiSelect options={buyerPcMallAccountOptions} values={selectedAppliedAccounts} onChange={setSelectedAppliedAccounts} placeholder="请选择下单账号" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>闪购门店</span>
                      <input placeholder="输入闪购门店名称/闪购门店ID，支持全模糊查询" />
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
                      <span>支付时间</span>
                      <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" />
                    </label>
                    <label className="pc-mall-filter-field">
                      <span>申请时间</span>
                      <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" />
                    </label>
                    <div className="pc-mall-filter-actions pc-mall-filter-actions-inline pc-mall-filter-actions-applied">
                      <button className="pc-mall-btn pc-mall-btn-primary" type="button">查询</button>
                      <button className="pc-mall-btn" type="button">重置</button>
                    </div>
                  </div>
                </section>

                <div className="pc-mall-table-toolbar">
                  <div className="pc-mall-toolbar-left">
                    <button className="pc-mall-btn pc-mall-toolbar-btn" type="button">批量修改</button>
                    <button className="pc-mall-btn pc-mall-toolbar-btn" type="button">批量撤销</button>
                    <div className="pc-mall-toolbar-summary">已选中 {selectedAppliedInvoiceSummary.count} 笔订单，申请开票金额合计： <strong>{`￥${selectedAppliedInvoiceSummary.totalAmount.toFixed(2)}`}</strong></div>
                  </div>
                  <button className="pc-mall-btn pc-mall-export-btn" type="button">导出数据</button>
                </div>

                <div className="pc-mall-table-wrap">
                  <table className="pc-mall-table pc-mall-table-applied">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allAppliedInvoiceRowsSelected} onChange={(e) => handleToggleAllAppliedInvoiceRows(e.target.checked)} /></th>
                        <th>订单号</th>
                        <th>发票抬头</th>
                        <th>发票类型</th>
                        <th>申请开票金额</th>
                        <th>申请时间</th>
                        <th>店铺名称</th>
                        <th>闪购门店</th>
                        <th>开票状态</th>
                        <th>发票操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerPcMallAppliedInvoiceRows.map((item) => (
                        <tr key={item.orderNo}>
                          <td><input type="checkbox" checked={selectedAppliedInvoiceOrderNos.includes(item.orderNo)} onChange={() => handleToggleAppliedInvoiceRow(item.orderNo)} /></td>
                          <td><button className="pc-mall-order-link" type="button">{item.orderNo}</button></td>
                          <td>{item.invoiceTitle}</td>
                          <td><span className={`pc-mall-invoice-tag is-${item.invoiceTypeTone}`}>{item.invoiceType}</span></td>
                          <td className="pc-mall-amount-cell">{item.amount}</td>
                          <td>{item.appliedAt}</td>
                          <td>{item.shop}</td>
                          <td>
                            <div className="pc-mall-store-cell">
                              <div>{item.store}</div>
                              <div>{item.storeId}</div>
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-status-cell pc-mall-status-dot-cell">
                              <span className="pc-mall-status-dot" />
                              <span>{item.status}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pc-mall-action-cell">
                              <button className="pc-mall-contact-btn" type="button">联系卖家</button>
                              <button className="pc-mall-apply-btn" type="button">查看</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            <div className="pc-mall-pagination-wrap">
              <div className="pc-mall-pagination">
                <span className="pc-mall-pagination-total">共计 4170 条</span>
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
        </section>
      </div>
    </div>
  );
}

function Header({ currentMarketingPage, specialCreateTab, onTopActionClick }) {
  const pendingCount = 24;
  const topActionItems = [
    { key: "pc-mall", label: "买家PC商城", icon: "pc-mall" },
    { key: "miniapp-mall", label: "买家小程序商城", icon: "miniapp-mall" },
    { key: "service", label: "在线客服", icon: "service" },
    { key: "todo", label: "我的待办", icon: "todo", badge: pendingCount },
    { key: "export", label: "导出记录", icon: "export" },
    { key: "logout", label: "退出登录", icon: "logout" }
  ];

  return (
    <header className="workspace-topbar">
      <div className="page-tabs">
        <div className="page-tab">首页-控制台 <span>×</span></div>
        <div className="page-tab is-current">{currentMarketingPage} <span>×</span></div>
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

function ShopInvoicePage() {
  const [activeInvoiceStatusTab, setActiveInvoiceStatusTab] = useState("全部");
  const [isColumnSettingOpen, setIsColumnSettingOpen] = useState(false);
  const [activeOrderDetailNo, setActiveOrderDetailNo] = useState("");
  const [activeInvoiceDetailNo, setActiveInvoiceDetailNo] = useState("");
  const [draftFilters, setDraftFilters] = useState(initialShopInvoiceFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialShopInvoiceFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [shopInvoiceRows, setShopInvoiceRows] = useState(shopInvoiceManagementRows);
  const [selectedShopInvoiceOrderNos, setSelectedShopInvoiceOrderNos] = useState([]);
  const [shopInvoiceNotice, setShopInvoiceNotice] = useState("");
  const [isConfirmInvoiceModalOpen, setIsConfirmInvoiceModalOpen] = useState(false);
  const [confirmInvoiceForm, setConfirmInvoiceForm] = useState(initialShopInvoiceConfirmForm);
  const [confirmInvoiceErrors, setConfirmInvoiceErrors] = useState(initialShopInvoiceConfirmErrors);
  const [isRejectInvoiceModalOpen, setIsRejectInvoiceModalOpen] = useState(false);
  const [rejectInvoiceModalMode, setRejectInvoiceModalMode] = useState("batch");
  const [rejectInvoiceForm, setRejectInvoiceForm] = useState(initialShopInvoiceRejectForm);
  const [rejectInvoiceErrors, setRejectInvoiceErrors] = useState(initialShopInvoiceRejectErrors);
  const [isModifyInvoiceModalOpen, setIsModifyInvoiceModalOpen] = useState(false);
  const [selectedModifyInvoiceOrderNos, setSelectedModifyInvoiceOrderNos] = useState([]);
  const [modifyInvoiceForm, setModifyInvoiceForm] = useState(initialShopInvoiceModifyForm);
  const [modifyInvoiceErrors, setModifyInvoiceErrors] = useState(initialShopInvoiceModifyErrors);
  const [shopInvoiceColumnPrefs, setShopInvoiceColumnPrefs] = useState(initialShopInvoiceColumnPrefs);
  const [shopInvoiceColumnOrder, setShopInvoiceColumnOrder] = useState(initialShopInvoiceColumnOrder);
  const [draggingColumnKey, setDraggingColumnKey] = useState("");
  const [columnPopoverPosition, setColumnPopoverPosition] = useState({ top: 0, right: 0, maxHeight: 0, zoneMaxHeight: 0 });
  const columnTriggerRef = useRef(null);
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
    if (activeInvoiceStatusTab !== "全部" && item.invoiceStatus !== activeInvoiceStatusTab) return false;
    if (appliedFilters.orderStatus !== "全部" && item.orderStatus !== appliedFilters.orderStatus) return false;
    if (appliedFilters.afterSaleStatus !== "全部" && item.afterSaleStatusDetail !== appliedFilters.afterSaleStatus) return false;

    const invoiceTitleKeyword = appliedFilters.invoiceTitle.trim().toLowerCase();
    if (invoiceTitleKeyword && !item.invoiceTitle.toLowerCase().includes(invoiceTitleKeyword)) return false;

    const taxpayerKeyword = appliedFilters.taxpayerId.trim();
    if (taxpayerKeyword && !item.taxpayerId.includes(taxpayerKeyword)) return false;

    const buyerAccountKeyword = appliedFilters.buyerAccount.trim().toLowerCase();
    if (buyerAccountKeyword && !item.buyerAccount.toLowerCase().includes(buyerAccountKeyword)) return false;

    const storeKeyword = appliedFilters.store.trim().toLowerCase();
    if (storeKeyword && !item.store.toLowerCase().includes(storeKeyword)) return false;

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
  }), [activeInvoiceStatusTab, appliedFilters, shopInvoiceRows]);
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
  const showConfirmBatchToolbar = activeInvoiceStatusTab === "全部" || activeInvoiceStatusTab === "待开票";
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
  const selectedModifyRows = useMemo(() => {
    const selectedSet = new Set(selectedModifyInvoiceOrderNos);
    return shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
  }, [selectedModifyInvoiceOrderNos, shopInvoiceRows]);
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
  const activeOrderDetail = useMemo(() => (
    createShopInvoiceOrderDetail(shopInvoiceRows.find((item) => item.orderNo === activeOrderDetailNo))
  ), [activeOrderDetailNo, shopInvoiceRows]);
  const activeInvoiceDetail = useMemo(() => (
    createShopInvoiceIssuedDetail(shopInvoiceRows.find((item) => item.orderNo === activeInvoiceDetailNo))
  ), [activeInvoiceDetailNo, shopInvoiceRows]);

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
  };

  const handleCloseOrderDetail = () => {
    setActiveOrderDetailNo("");
  };

  const handleOpenInvoiceDetail = (orderNo) => {
    setActiveOrderDetailNo("");
    setActiveInvoiceDetailNo(orderNo);
  };

  const handleCloseInvoiceDetail = () => {
    setActiveInvoiceDetailNo("");
  };

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

  const handleOpenConfirmInvoiceModal = (orderNos = selectedShopInvoiceOrderNos) => {
    const selectedSet = new Set(orderNos);
    const selectedRows = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo));
    const rowsToConfirm = shopInvoiceRows.filter((item) => selectedSet.has(item.orderNo) && item.invoiceStatus === "待开票");

    if (selectedRows.length === 0) {
      setShopInvoiceNotice("请先勾选待开票订单，再进行批量确认开票。");
      return;
    }

    if (selectedRows.some((item) => item.invoiceStatus !== "待开票")) {
      setShopInvoiceNotice("部分订单开票状态非待开票，无法批量确认开票，请检查");
      return;
    }

    const defaultWithTax = formatMoneyDisplay(rowsToConfirm.reduce((sum, item) => sum + parseMoneyValue(item.shouldInvoiceAmount), 0));
    setSelectedShopInvoiceOrderNos(rowsToConfirm.map((item) => item.orderNo));
    setConfirmInvoiceForm({
      ...initialShopInvoiceConfirmForm,
      invoiceAmountWithTax: defaultWithTax
    });
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

  const handleOpenModifyInvoiceModal = (orderNos) => {
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
    setModifyInvoiceErrors(initialShopInvoiceModifyErrors);
    setIsModifyInvoiceModalOpen(true);
  };

  const handleRejectInvoice = (orderNo) => {
    handleOpenRejectInvoiceModal([orderNo], "single");
  };

  const handleCloseConfirmInvoiceModal = () => {
    setIsConfirmInvoiceModalOpen(false);
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
    setSelectedModifyInvoiceOrderNos([]);
    setModifyInvoiceForm(initialShopInvoiceModifyForm);
    setModifyInvoiceErrors(initialShopInvoiceModifyErrors);
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
      invoiceAmountWithoutTax: !confirmInvoiceForm.invoiceAmountWithoutTax.trim(),
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
          applicationStatus: "已完成"
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

    const selectedSet = new Set(selectedShopInvoiceOrderNos);
    setShopInvoiceRows((current) => current.map((item) => (
      selectedSet.has(item.orderNo)
        ? {
          ...item,
          applicationStatus: "已驳回",
          invoiceStatus: "已驳回",
          invoiceStatusTone: "danger",
          rejectReason,
          actions: ["发票详情", "查看原因"]
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
      invoiceAmountWithoutTax: !modifyInvoiceForm.invoiceAmountWithoutTax.trim(),
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
          applicationStatus: "已完成"
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

  return (
    <div className="shop-invoice-page">
      {shopInvoiceNotice ? <div className="page-toast">{shopInvoiceNotice}</div> : null}
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
                {!["全部", "已开票"].includes(status) ? <em className="shop-invoice-tab-badge">{invoiceStatusTabCounts[status] || 0}</em> : null}
              </button>
            ))}
          </div>
          <button className="shop-invoice-settings-btn" type="button">发票设置</button>
        </div>
      </section>

      {activeInvoiceDetail ? (
        <>
          <section className="content-card shop-invoice-detail-card">
            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title">
                <span>发票信息</span>
                <button className="shop-invoice-detail-return" type="button" onClick={handleCloseInvoiceDetail}>← 返回</button>
              </div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>开票状态</span><strong><span className="shop-invoice-mini-tag is-success">{activeInvoiceDetail.invoiceInfo.invoiceStatus}</span></strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票类型</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceType}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>申请时间</span><strong>{activeInvoiceDetail.invoiceInfo.appliedAt}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票平台</span><strong>{activeInvoiceDetail.invoiceInfo.invoicePlatform}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>发票号码</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceNo}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票金额(含税)</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceAmountWithTax}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票金额(不含税)</span><strong>{activeInvoiceDetail.invoiceInfo.invoiceAmountWithoutTax}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开票时间</span><strong>{activeInvoiceDetail.invoiceInfo.invoicedAt}</strong></div>
              </div>
            </div>

            <div className="shop-invoice-detail-section">
              <div className="shop-invoice-detail-title"><span>抬头信息</span></div>
              <div className="shop-invoice-detail-info-grid">
                <div className="shop-invoice-detail-info-row"><span>发票抬头</span><strong>{activeInvoiceDetail.titleInfo.invoiceTitle}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>纳税人识别号</span><strong>{activeInvoiceDetail.titleInfo.taxpayerId}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>注册地址</span><strong>{activeInvoiceDetail.titleInfo.registerAddress}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>注册电话</span><strong>{activeInvoiceDetail.titleInfo.registerPhone}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>开户银行名称</span><strong>{activeInvoiceDetail.titleInfo.bankName}</strong></div>
                <div className="shop-invoice-detail-info-row"><span>银行账户</span><strong>{activeInvoiceDetail.titleInfo.bankAccount}</strong></div>
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
                <div className="shop-invoice-detail-info-row"><span>申请开票金额</span><strong>{activeInvoiceDetail.orderInfo.applyAmount}</strong></div>
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
                      <th>售后金额</th>
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
                <div className="shop-invoice-detail-summary-row"><span>发票应开金额：</span><strong className="is-accent">{activeInvoiceDetail.summary.shouldInvoiceAmount}</strong></div>
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
              <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal([activeInvoiceDetail.orderInfo.orderNo])}>修改发票</button>
            </div>
          </div>
        </>
      ) : activeOrderDetail ? (
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
      ) : (
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
            <span>订单状态</span>
            <div className="shop-invoice-select-wrap">
              <select value={draftFilters.orderStatus} onChange={(e) => handleDraftFilterChange("orderStatus", e.target.value)}>
                <option>全部</option>
                <option>已完成</option>
                <option>售后中</option>
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
          <label className="shop-invoice-field">
            <span>申请时间</span>
            <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" value={draftFilters.appliedAtRange} onChange={(value) => handleDraftFilterChange("appliedAtRange", value)} />
          </label>
          <label className="shop-invoice-field">
            <span>开票时间</span>
            <PcMallDateRangeField placeholder="开始日期 ～ 结束日期" value={draftFilters.invoicedAtRange} onChange={(value) => handleDraftFilterChange("invoicedAtRange", value)} />
          </label>
          <label className="shop-invoice-field">
            <span>发票抬头</span>
            <div className="shop-invoice-input-wrap">
              <input placeholder="请输入发票抬头" value={draftFilters.invoiceTitle} onChange={(e) => handleDraftFilterChange("invoiceTitle", e.target.value)} />
            </div>
          </label>
          <label className="shop-invoice-field">
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
                <button className="btn btn-dark" type="button" onClick={() => handleOpenConfirmInvoiceModal()}>批量确认开票</button>
                <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal(selectedShopInvoiceOrderNos)}>批量修改开票</button>
                {showBatchRejectAction ? <button className="btn btn-dark" type="button" onClick={() => handleOpenRejectInvoiceModal()}>批量驳回</button> : null}
                <div className="shop-invoice-toolbar-summary">
                  已选中 {selectedConfirmRows.length} 笔待开票订单，发票应开金额合计：<strong>{formatMoneyDisplay(confirmInvoiceSummary.shouldInvoiceAmount)}</strong>
                </div>
              </>
            ) : null}
            {showModifyBatchToolbar ? (
              <>
                <button className="btn btn-dark" type="button" onClick={() => handleOpenModifyInvoiceModal(selectedModifyInvoiceOrderNos)}>批量修改开票</button>
                <div className="shop-invoice-toolbar-summary">
                  已选中 {selectedModifyRows.length} 笔已开票订单，发票应开金额合计：<strong>{formatMoneyDisplay(modifyInvoiceSummary.shouldInvoiceAmount)}</strong>
                </div>
              </>
            ) : null}
          </div>
          <div className="shop-invoice-toolbar-right">
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
          <table className="shop-invoice-table" style={{ minWidth: `${Math.max(tableMinWidth, 1320)}px` }}>
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th className={getColumnClassName(column, "header")} key={column.key} style={getColumnStyle(column)}>
                    {column.key === "select"
                      ? showSelectableCheckboxes
                        ? <input type="checkbox" checked={allSelectableInvoiceRowsSelected} onChange={(e) => handleToggleAllSelectableRows(e.target.checked)} />
                        : null
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
                      {column.key === "select"
                        ? showSelectableCheckboxes
                          ? (
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
                          )
                          : null
                        : column.key === "orderNo"
                          ? (
                            <button className="buyer-link-btn" type="button" onClick={() => handleOpenOrderDetail(item.orderNo)}>
                              {item.orderNo}
                            </button>
                          )
                        : column.key === "actions"
                          ? (
                            <div className="shop-invoice-actions">
                              {item.actions.map((action) => (
                                <button
                                  className="buyer-link-btn"
                                  key={action}
                                  type="button"
                                  onClick={() => {
                                    if (action === "发票详情" && item.invoiceStatus === "已开票") {
                                      handleOpenInvoiceDetail(item.orderNo);
                                    }
                                    if (action === "确认开票") {
                                      handleOpenConfirmInvoiceModal([item.orderNo]);
                                    }
                                    if (action === "查看原因") {
                                      setShopInvoiceNotice(`驳回原因：${item.rejectReason || "平台审核未通过，请核对开票信息后重试。"}`);
                                    }
                                    if (action === "修改发票") {
                                      handleOpenModifyInvoiceModal([item.orderNo]);
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
                          )
                          : column.renderCell(item)}
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
      )}

      {isConfirmInvoiceModalOpen ? (
        <div className="shop-invoice-modal-mask" onClick={handleCloseConfirmInvoiceModal}>
          <div className="shop-invoice-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shop-invoice-confirm-head">
              <h3>确认开票</h3>
            </div>
            <div className="shop-invoice-confirm-body">
              <section className="shop-invoice-confirm-summary">
                <div className="shop-invoice-confirm-summary-grid">
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票类型:</span>
                    <strong>{confirmInvoiceSummary.invoiceType}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票抬头:</span>
                    <strong>{confirmInvoiceSummary.invoiceTitle}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>订单总额:</span>
                    <strong>{formatMoneyDisplay(confirmInvoiceSummary.orderAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>售后金额总计:</span>
                    <span className="shop-invoice-summary-value">
                      <strong>{formatMoneyDisplay(confirmInvoiceSummary.afterSaleAmount)}</strong>
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">售后金额总计 = 售后中金额 + 已退款金额</span>
                      </span>
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>申请开票金额:</span>
                    <strong>{formatMoneyDisplay(confirmInvoiceSummary.applyAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票应开金额:</span>
                    <span className="shop-invoice-summary-value">
                      <strong className="is-highlight">{formatMoneyDisplay(confirmInvoiceSummary.shouldInvoiceAmount)}</strong>
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">发票应开金额 = 订单总额 - 售后金额总计</span>
                      </span>
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
                    <span><i>*</i>开票金额(不含税):</span>
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
              <h3>修改发票</h3>
            </div>
            <div className="shop-invoice-confirm-body">
              <section className="shop-invoice-confirm-summary">
                <div className="shop-invoice-confirm-summary-grid">
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票类型:</span>
                    <strong>{modifyInvoiceSummary.invoiceType}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票抬头:</span>
                    <strong>{modifyInvoiceSummary.invoiceTitle}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>订单总额:</span>
                    <strong>{formatMoneyDisplay(modifyInvoiceSummary.orderAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>售后金额总计:</span>
                    <span className="shop-invoice-summary-value">
                      <strong>{formatMoneyDisplay(modifyInvoiceSummary.afterSaleAmount)}</strong>
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">售后金额总计 = 售后中金额 + 已退款金额</span>
                      </span>
                    </span>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>申请开票金额:</span>
                    <strong>{formatMoneyDisplay(modifyInvoiceSummary.applyAmount)}</strong>
                  </div>
                  <div className="shop-invoice-confirm-summary-row">
                    <span>发票应开金额:</span>
                    <span className="shop-invoice-summary-value">
                      <strong className="is-highlight">{formatMoneyDisplay(modifyInvoiceSummary.shouldInvoiceAmount)}</strong>
                      <span className="shop-invoice-summary-tip">
                        <img className="shop-invoice-summary-tip-icon" src={questionHeaderIcon} alt="" aria-hidden="true" />
                        <span className="shop-invoice-summary-tooltip">发票应开金额 = 订单总额 - 售后金额总计</span>
                      </span>
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
                    <span><i>*</i>开票金额(不含税):</span>
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

export default function App() {
  const [activePortalPage, setActivePortalPage] = useState("admin");
  const [activeSection, setActiveSection] = useState("marketing");
  const [activeBuyerPage, setActiveBuyerPage] = useState("买家列表");
  const [activeShopPage, setActiveShopPage] = useState("发票管理");
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
  const isShopSection = activeSection === "shop";
  const isMarketingSection = activeSection === "marketing";
  const currentPageTitle = isBuyerSection ? activeBuyerPage : isShopSection ? activeShopPage : currentMarketingPage;
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

  const handleSwitchBuyerPage = (pageName) => {
    setActivePortalPage("admin");
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

  const handleSwitchShopPage = (pageName) => {
    setActivePortalPage("admin");
    setActiveSection("shop");
    setActiveShopPage(pageName);
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
    if (actionKey === "pc-mall") {
      setActivePortalPage("buyer-pc-mall");
      setToastMessage("");
      return;
    }

    if (actionKey === "operations-admin") {
      setActivePortalPage("admin");
      setActiveSection("marketing");
      setToastMessage("");
      return;
    }

    if (actionKey === "supplier-admin") {
      setActivePortalPage("admin");
      setActiveSection("buyer");
      setActiveBuyerPage("买家列表");
      setBuyerPage(1);
      setToastMessage("");
      return;
    }

    if (actionKey === "miniapp-mall") {
      setToastMessage("买家小程序商城页面入口已预留，后续可继续按截图补齐。");
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
        <Header currentMarketingPage={currentPageTitle} specialCreateTab={isMarketingSection && isCreating && (isPrimarySpecialPricePage(currentMarketingPage) || isSecondarySpecialPricePage(currentMarketingPage)) ? "新增专享价" : ""} onTopActionClick={handleTopActionClick} />
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
          ) : isShopSection ? (
            <ShopInvoicePage />
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
      {toastMessage ? <div className="page-toast">{toastMessage}</div> : null}
    </div>
  );
}

















