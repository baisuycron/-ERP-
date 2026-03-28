import dayjs from 'dayjs';
import {
  AttachmentItem,
  AuditNode,
  OperationLog,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseReceiptItem,
  ReceiptMeta,
  ReceiptProduct,
  ReceiptStatus,
  Supplier,
  Warehouse,
} from '../types/purchaseReceipt';
import { buildAttachment, buildReceiptNo, calculateReceiptItem, summarizeReceiptItems } from '../utils/purchaseInbound';

const now = dayjs();

export const suppliersDb: Supplier[] = [
  { id: 'sup-001', code: 'V1001', name: '华东优选供应链有限公司', contact: '周静', phone: '13800138001' },
  { id: 'sup-002', code: 'V1002', name: '上海鲜选食品贸易有限公司', contact: '李强', phone: '13800138002' },
  { id: 'sup-003', code: 'V1003', name: '苏州安心日化有限公司', contact: '王敏', phone: '13800138003' },
  { id: 'sup-004', code: 'V1004', name: '浙江优享乳品有限公司', contact: '陈凯', phone: '13800138004' },
];

export const warehousesDb: Warehouse[] = [
  { id: 'wh-001', code: 'WH01', name: '华东成品仓', manager: '张磊' },
  { id: 'wh-002', code: 'WH02', name: '冷链仓', manager: '孙悦' },
  { id: 'wh-003', code: 'WH03', name: '日化仓', manager: '顾晨' },
];

export const productsDb: ReceiptProduct[] = [
  { id: 'prod-001', barcode: '6901001001001', code: 'SKU1001', name: '每日坚果礼盒 750g', spec: '750g/盒', unit: '盒', purchasePrice: 56, retailPrice: 88, deliveryPrice: 72, currentStock: 124, taxRate: 0.13, batchManaged: true },
  { id: 'prod-002', barcode: '6901001001002', code: 'SKU1002', name: '原味苏打气泡水 480ml', spec: '480ml/瓶', unit: '瓶', purchasePrice: 3.2, retailPrice: 5.5, deliveryPrice: 4.4, currentStock: 980, taxRate: 0.13, batchManaged: true },
  { id: 'prod-003', barcode: '6901001001003', code: 'SKU1003', name: '薄荷清爽洗发露 500ml', spec: '500ml/瓶', unit: '瓶', purchasePrice: 21.5, retailPrice: 39, deliveryPrice: 31, currentStock: 65, taxRate: 0.13, batchManaged: false },
  { id: 'prod-004', barcode: '6901001001004', code: 'SKU1004', name: '高钙纯牛奶 250ml*24', spec: '24盒/箱', unit: '箱', purchasePrice: 58, retailPrice: 79, deliveryPrice: 66, currentStock: 43, taxRate: 0.09, batchManaged: true },
  { id: 'prod-005', barcode: '6901001001005', code: 'SKU1005', name: '鲜卤鸭脖 200g', spec: '200g/袋', unit: '袋', purchasePrice: 9.8, retailPrice: 15.9, deliveryPrice: 12.6, currentStock: 210, taxRate: 0.13, batchManaged: true },
  { id: 'prod-006', barcode: '6901001001006', code: 'SKU1006', name: '柔韧抽纸 3层100抽', spec: '6包/提', unit: '提', purchasePrice: 12.4, retailPrice: 18.9, deliveryPrice: 15, currentStock: 156, taxRate: 0.13, batchManaged: false },
];

const makeOrderItem = (id: string, productId: string, orderedQty: number, receivedQty: number): PurchaseOrder['items'][number] => {
  const product = productsDb.find((item) => item.id === productId)!;
  const taxExcludedPrice = Number((product.purchasePrice / (1 + product.taxRate)).toFixed(4));
  return {
    id,
    productId,
    barcode: product.barcode,
    productCode: product.code,
    productName: product.name,
    spec: product.spec,
    unit: product.unit,
    orderedQty,
    receivedQty,
    purchasePrice: product.purchasePrice,
    taxIncludedPrice: product.purchasePrice,
    taxExcludedPrice,
    taxRate: product.taxRate,
    retailPrice: product.retailPrice,
    deliveryPrice: product.deliveryPrice,
    currentStock: product.currentStock,
    batchManaged: product.batchManaged,
  };
};

export const purchaseOrdersDb: PurchaseOrder[] = [
  { id: 'po-001', orderNo: 'CGDH20260320001', supplierId: 'sup-001', supplierCode: 'V1001', supplierName: '华东优选供应链有限公司', warehouseId: 'wh-001', warehouseName: '华东成品仓', orderDate: now.subtract(8, 'day').format('YYYY-MM-DD'), purchaser: '赵峰', status: 'partial', items: [makeOrderItem('poi-001', 'prod-001', 50, 28), makeOrderItem('poi-002', 'prod-005', 90, 0)] },
  { id: 'po-002', orderNo: 'CGDH20260321002', supplierId: 'sup-002', supplierCode: 'V1002', supplierName: '上海鲜选食品贸易有限公司', warehouseId: 'wh-002', warehouseName: '冷链仓', orderDate: now.subtract(7, 'day').format('YYYY-MM-DD'), purchaser: '钱琳', status: 'ordered', items: [makeOrderItem('poi-003', 'prod-002', 300, 0), makeOrderItem('poi-004', 'prod-004', 36, 0)] },
  { id: 'po-003', orderNo: 'CGDH20260322003', supplierId: 'sup-003', supplierCode: 'V1003', supplierName: '苏州安心日化有限公司', warehouseId: 'wh-003', warehouseName: '日化仓', orderDate: now.subtract(5, 'day').format('YYYY-MM-DD'), purchaser: '王勇', status: 'ordered', items: [makeOrderItem('poi-005', 'prod-003', 80, 0), makeOrderItem('poi-006', 'prod-006', 40, 0)] },
];

const makeReceiptItem = (productId: string, options: Partial<PurchaseReceiptItem> & { actualQty: number; giftQty?: number; orderQty?: number; fromOrder?: boolean; sourceOrderNo?: string }): PurchaseReceiptItem => {
  const product = productsDb.find((item) => item.id === productId)!;
  return calculateReceiptItem({
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    barcode: product.barcode,
    productCode: product.code,
    productName: product.name,
    spec: product.spec,
    unit: product.unit,
    purchasePrice: options.purchasePrice ?? product.purchasePrice,
    taxExcludedPrice: options.taxExcludedPrice ?? Number((product.purchasePrice / (1 + product.taxRate)).toFixed(4)),
    taxIncludedPrice: options.taxIncludedPrice ?? product.purchasePrice,
    taxRate: options.taxRate ?? product.taxRate,
    taxAmount: 0,
    taxExcludedAmount: 0,
    taxIncludedAmount: 0,
    retailPrice: product.retailPrice,
    deliveryPrice: product.deliveryPrice,
    currentStock: product.currentStock,
    orderQty: options.orderQty,
    actualQty: options.actualQty,
    giftQty: options.giftQty ?? 0,
    diffQty: undefined,
    batchNo: options.batchNo,
    productionDate: options.productionDate,
    expiryDate: options.expiryDate,
    diffReason: options.diffReason ?? '',
    batchManaged: options.batchManaged ?? product.batchManaged,
    fromOrder: options.fromOrder ?? false,
    sourceOrderNo: options.sourceOrderNo,
  });
};

const createAuditNodes = (status: ReceiptStatus, rejectedRemark?: string): AuditNode[] => [
  { id: 'node-1', nodeName: '一级审核', auditor: '仓储主管', result: status === 'audited' ? 'approved' : rejectedRemark ? 'rejected' : 'approved', auditTime: now.subtract(2, 'day').toISOString(), remark: rejectedRemark || '收货数量与附件已确认' },
  { id: 'node-2', nodeName: '二级审核', auditor: '采购经理', result: status === 'audited' ? 'approved' : 'pending', auditTime: status === 'audited' ? now.subtract(1, 'day').toISOString() : undefined, remark: status === 'audited' ? '允许入库并同步财务结算' : undefined },
];

const createLogs = (status: ReceiptStatus, createdBy: string, rejectedRemark?: string): OperationLog[] => {
  const logs: OperationLog[] = [
    { id: `log-${Math.random().toString(36).slice(2, 8)}`, type: 'create', operator: createdBy, time: now.subtract(3, 'day').toISOString(), content: '创建采购入库单' },
    { id: `log-${Math.random().toString(36).slice(2, 8)}`, type: 'submit', operator: createdBy, time: now.subtract(2, 'day').toISOString(), content: '提交审核，进入多级审核流程' },
  ];
  if (rejectedRemark) {
    logs.push({ id: `log-${Math.random().toString(36).slice(2, 8)}`, type: 'reject', operator: '仓储主管', time: now.subtract(36, 'hour').toISOString(), content: `审核驳回：${rejectedRemark}` });
  }
  if (status === 'audited') {
    logs.push({ id: `log-${Math.random().toString(36).slice(2, 8)}`, type: 'approve', operator: '采购经理', time: now.subtract(1, 'day').toISOString(), content: '审核通过，已增加可用库存并同步统计口径' });
    logs.push({ id: `log-${Math.random().toString(36).slice(2, 8)}`, type: 'system', operator: '系统', time: now.subtract(1, 'day').add(2, 'minute').toISOString(), content: '财务接口推送失败，已记录失败状态并进入补偿重试队列' });
  }
  return logs;
};

const buildReceipt = (input: { id: string; status: ReceiptStatus; supplierId: string; warehouseId: string; purchaseOrderId?: string; items: PurchaseReceiptItem[]; remark?: string; createdBy: string; rejectedRemark?: string; attachments?: AttachmentItem[]; receiptDate: string; }): PurchaseReceipt => {
  const supplier = suppliersDb.find((item) => item.id === input.supplierId)!;
  const warehouse = warehousesDb.find((item) => item.id === input.warehouseId)!;
  const order = purchaseOrdersDb.find((item) => item.id === input.purchaseOrderId);
  const summary = summarizeReceiptItems(input.items);
  const createdAt = now.subtract(3, 'day').toISOString();
  return {
    id: input.id,
    receiptNo: buildReceiptNo(),
    status: input.status,
    receiptDate: input.receiptDate,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    supplierId: supplier.id,
    supplierCode: supplier.code,
    supplierName: supplier.name,
    purchaseOrderId: order?.id,
    purchaseOrderNo: order?.orderNo,
    remark: input.remark,
    attachments: input.attachments ?? [],
    items: input.items,
    totalQty: summary.totalQty,
    totalAmount: summary.totalAmount,
    productCount: summary.productCount,
    createdBy: input.createdBy,
    createdAt,
    updatedAt: now.toISOString(),
    version: 1,
    lastRejectedRemark: input.rejectedRemark,
    currentAuditNode: input.status === 'audited' ? 2 : input.rejectedRemark ? 1 : 2,
    auditNodes: createAuditNodes(input.status, input.rejectedRemark),
    logs: createLogs(input.status, input.createdBy, input.rejectedRemark),
    auditedBy: input.status === 'audited' ? '采购经理' : undefined,
    auditedAt: input.status === 'audited' ? now.subtract(1, 'day').toISOString() : undefined,
    integrationFlags: { inventorySyncStatus: input.status === 'audited' ? 'success' : 'pending', financeSyncStatus: input.status === 'audited' ? 'failed' : 'pending', messageSyncStatus: input.status === 'audited' ? 'success' : 'pending' },
  };
};

export let purchaseReceiptsDb: PurchaseReceipt[] = [
  buildReceipt({ id: 'receipt-001', status: 'saved', supplierId: 'sup-001', warehouseId: 'wh-001', purchaseOrderId: 'po-001', receiptDate: now.subtract(2, 'day').format('YYYY-MM-DD'), createdBy: '赵峰', rejectedRemark: '第2行批次信息不完整，请补充到期日期后重新提审', attachments: [buildAttachment('送货单-华东优选.pdf', '送货单')], items: [makeReceiptItem('prod-001', { orderQty: 50, actualQty: 48, batchNo: 'JG20260320A', productionDate: now.subtract(20, 'day').format('YYYY-MM-DD'), expiryDate: now.add(220, 'day').format('YYYY-MM-DD'), fromOrder: true, sourceOrderNo: 'CGDH20260320001' }), makeReceiptItem('prod-005', { orderQty: 90, actualQty: 92, giftQty: 2, batchNo: 'YB20260325K', productionDate: now.subtract(10, 'day').format('YYYY-MM-DD'), fromOrder: true, sourceOrderNo: 'CGDH20260320001', diffReason: '供应商超送 2 袋并赠送 2 袋' })], remark: '首批到货，包含超原单数量场景' }),
  buildReceipt({ id: 'receipt-002', status: 'audited', supplierId: 'sup-002', warehouseId: 'wh-002', purchaseOrderId: 'po-002', receiptDate: now.subtract(1, 'day').format('YYYY-MM-DD'), createdBy: '钱琳', attachments: [buildAttachment('签收单-气泡水.jpg', '签收单'), buildAttachment('质检单-牛奶.pdf', '质检单')], items: [makeReceiptItem('prod-002', { orderQty: 300, actualQty: 300, giftQty: 10, batchNo: 'QP20260321C', productionDate: now.subtract(4, 'day').format('YYYY-MM-DD'), expiryDate: now.add(180, 'day').format('YYYY-MM-DD'), fromOrder: true, sourceOrderNo: 'CGDH20260321002' }), makeReceiptItem('prod-004', { orderQty: 36, actualQty: 36, batchNo: 'NN20260323E', productionDate: now.subtract(10, 'day').format('YYYY-MM-DD'), expiryDate: now.add(40, 'day').format('YYYY-MM-DD'), fromOrder: true, sourceOrderNo: 'CGDH20260321002' })], remark: '审核通过后已增加可用库存' }),
  buildReceipt({ id: 'receipt-003', status: 'saved', supplierId: 'sup-003', warehouseId: 'wh-003', receiptDate: now.format('YYYY-MM-DD'), createdBy: '王勇', attachments: [buildAttachment('门店直采单.png', '图片')], items: [makeReceiptItem('prod-003', { actualQty: 40, giftQty: 0, fromOrder: false }), makeReceiptItem('prod-006', { actualQty: 12, giftQty: 1, fromOrder: false })], remark: '无原单直采直入场景' }),
];

export const purchaseInboundMeta: ReceiptMeta = {
  suppliers: suppliersDb,
  warehouses: warehousesDb,
  products: productsDb,
  purchaseOrders: purchaseOrdersDb,
  statusOptions: [
    { label: '已保存', value: 'saved' },
    { label: '已审核', value: 'audited' },
  ],
};

export const replaceReceipt = (id: string, updater: (current: PurchaseReceipt) => PurchaseReceipt) => {
  const index = purchaseReceiptsDb.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const next = updater(purchaseReceiptsDb[index]);
  purchaseReceiptsDb[index] = next;
  return next;
};

export const insertReceipt = (receipt: PurchaseReceipt) => {
  purchaseReceiptsDb = [receipt, ...purchaseReceiptsDb];
};

export const removeReceipt = (id: string) => {
  purchaseReceiptsDb = purchaseReceiptsDb.filter((item) => item.id !== id);
};
