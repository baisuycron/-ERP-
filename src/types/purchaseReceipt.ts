export type ReceiptStatus = 'saved' | 'audited';

export type ReceiptMode = 'create' | 'edit' | 'view' | 'audit';

export type AuditAction = 'approve' | 'reject';

export interface SelectOption {
  label: string;
  value: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  manager: string;
}

export interface ReceiptProduct {
  id: string;
  barcode: string;
  code: string;
  name: string;
  spec: string;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  deliveryPrice: number;
  currentStock: number;
  taxRate: number;
  batchManaged: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  barcode: string;
  productCode: string;
  productName: string;
  spec: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  purchasePrice: number;
  taxIncludedPrice: number;
  taxExcludedPrice: number;
  taxRate: number;
  retailPrice: number;
  deliveryPrice: number;
  currentStock: number;
  batchManaged: boolean;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  orderDate: string;
  purchaser: string;
  status: 'ordered' | 'partial' | 'completed' | 'closed';
  items: PurchaseOrderItem[];
}

export interface AttachmentItem {
  uid: string;
  name: string;
  url?: string;
  status: 'done' | 'error';
  category: '送货单' | '签收单' | '质检单' | '图片' | '其他';
}

export interface PurchaseReceiptItem {
  id: string;
  productId: string;
  barcode: string;
  productCode: string;
  productName: string;
  spec: string;
  unit: string;
  purchasePrice: number;
  taxExcludedPrice: number;
  taxIncludedPrice: number;
  taxRate: number;
  taxAmount: number;
  taxExcludedAmount: number;
  taxIncludedAmount: number;
  retailPrice: number;
  deliveryPrice: number;
  currentStock: number;
  orderQty?: number;
  actualQty: number;
  giftQty: number;
  diffQty?: number;
  batchNo?: string;
  productionDate?: string;
  expiryDate?: string;
  diffReason?: string;
  batchManaged: boolean;
  fromOrder: boolean;
  sourceOrderNo?: string;
}

export interface AuditNode {
  id: string;
  nodeName: string;
  auditor: string;
  result: 'pending' | 'approved' | 'rejected';
  auditTime?: string;
  remark?: string;
}

export interface OperationLog {
  id: string;
  type: 'create' | 'save' | 'submit' | 'approve' | 'reject' | 'delete' | 'system';
  operator: string;
  time: string;
  content: string;
}

export interface ReceiptVersionFlags {
  inventorySyncStatus: 'pending' | 'success' | 'failed';
  financeSyncStatus: 'pending' | 'success' | 'failed';
  messageSyncStatus: 'pending' | 'success' | 'failed';
}

export interface PurchaseReceipt {
  id: string;
  receiptNo: string;
  status: ReceiptStatus;
  receiptDate: string;
  warehouseId: string;
  warehouseName: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderId?: string;
  purchaseOrderNo?: string;
  remark?: string;
  attachments: AttachmentItem[];
  items: PurchaseReceiptItem[];
  totalQty: number;
  totalAmount: number;
  productCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  lastRejectedRemark?: string;
  currentAuditNode: number;
  auditNodes: AuditNode[];
  logs: OperationLog[];
  auditedBy?: string;
  auditedAt?: string;
  integrationFlags: ReceiptVersionFlags;
}

export interface ReceiptListItem {
  id: string;
  receiptNo: string;
  receiptDate: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderNo?: string;
  warehouseName: string;
  status: ReceiptStatus;
  createdBy: string;
  auditedBy?: string;
  auditedAt?: string;
  productCount: number;
  totalQty: number;
  totalAmount: number;
}

export interface ReceiptListFilters {
  purchaseOrderNo?: string;
  receiptNo?: string;
  supplierCode?: string;
  supplierName?: string;
  productKeyword?: string;
  barcode?: string;
  productCode?: string;
  productName?: string;
  dateRange?: [string, string];
  status?: ReceiptStatus;
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReceiptListResponse {
  list: ReceiptListItem[];
  total: number;
}

export interface ReceiptMeta {
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: ReceiptProduct[];
  purchaseOrders: PurchaseOrder[];
  statusOptions: SelectOption[];
}

export interface ReceiptSavePayload {
  receiptDate: string;
  warehouseId: string;
  supplierId: string;
  purchaseOrderId?: string;
  remark?: string;
  attachments: AttachmentItem[];
  version?: number;
  items: PurchaseReceiptItem[];
}

export interface ReceiptAuditPayload {
  action: AuditAction;
  remark?: string;
  version: number;
}
