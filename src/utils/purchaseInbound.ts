import dayjs from 'dayjs';
import { AttachmentItem, PurchaseReceiptItem, ReceiptProduct, ReceiptStatus } from '../types/purchaseReceipt';

export const receiptStatusLabelMap: Record<ReceiptStatus, string> = {
  saved: '已保存',
  audited: '已审核',
};

export const receiptStatusColorMap: Record<ReceiptStatus, string> = {
  saved: 'gold',
  audited: 'success',
};

export const formatCurrency = (value: number) => `¥ ${value.toFixed(2)}`;

export const formatQty = (value: number) => `${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`;

export const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

const receiptSequenceByDate: Record<string, number> = {};

export const buildReceiptNo = (receiptDate?: string) => {
  const dateKey = dayjs(receiptDate || dayjs()).format('YYYYMMDD');
  receiptSequenceByDate[dateKey] = (receiptSequenceByDate[dateKey] ?? 0) + 1;
  return `CGRK${dateKey}${String(receiptSequenceByDate[dateKey]).padStart(5, '0')}`;
};

export const buildAttachment = (name: string, category: AttachmentItem['category']): AttachmentItem => ({
  uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  status: 'done',
  category,
  url: '#',
});

export const calculateReceiptItem = (item: PurchaseReceiptItem): PurchaseReceiptItem => {
  const actualQty = Number(item.actualQty || 0);
  const giftQty = Number(item.giftQty || 0);
  const taxExcludedPrice = Number(item.taxExcludedPrice || 0);
  const taxRate = Number(item.taxRate || 0);
  const taxIncludedPrice =
    item.taxIncludedPrice || item.taxIncludedPrice === 0
      ? Number(item.taxIncludedPrice)
      : roundTo(taxExcludedPrice * (1 + taxRate), 4);
  const taxExcludedAmount = roundTo((actualQty + giftQty) * taxExcludedPrice, 2);
  const taxAmount = roundTo(taxExcludedAmount * taxRate, 2);
  const taxIncludedAmount = roundTo(taxExcludedAmount + taxAmount, 2);
  const diffQty =
    item.orderQty || item.orderQty === 0 ? roundTo(actualQty - Number(item.orderQty || 0), 4) : undefined;

  return {
    ...item,
    actualQty,
    giftQty,
    taxExcludedPrice: roundTo(taxExcludedPrice, 4),
    taxIncludedPrice: roundTo(taxIncludedPrice, 4),
    taxRate: roundTo(taxRate, 4),
    purchasePrice: roundTo(Number(item.purchasePrice || taxIncludedPrice), 4),
    taxExcludedAmount,
    taxAmount,
    taxIncludedAmount,
    diffQty,
  };
};

export const summarizeReceiptItems = (items: PurchaseReceiptItem[]) => {
  const normalized = items
    .map(calculateReceiptItem)
    .filter((item) => item.productId || item.productCode || item.productName);
  const totalQty = roundTo(
    normalized.reduce((sum, item) => sum + Number(item.actualQty || 0) + Number(item.giftQty || 0), 0),
    2,
  );
  const totalAmount = roundTo(normalized.reduce((sum, item) => sum + Number(item.taxIncludedAmount || 0), 0), 2);
  const productCount = new Set(normalized.map((item) => item.productCode)).size;
  const giftTotalQty = roundTo(normalized.reduce((sum, item) => sum + Number(item.giftQty || 0), 0), 2);

  return {
    totalQty,
    totalAmount,
    productCount,
    giftTotalQty,
    itemCount: normalized.length,
  };
};

export const buildEmptyReceiptItem = (): PurchaseReceiptItem =>
  calculateReceiptItem({
    id: `item-${Date.now()}-empty`,
    productId: '',
    barcode: '',
    productCode: '',
    productName: '',
    spec: '',
    unit: '',
    purchasePrice: 0,
    taxExcludedPrice: 0,
    taxIncludedPrice: 0,
    taxRate: 0,
    taxAmount: 0,
    taxExcludedAmount: 0,
    taxIncludedAmount: 0,
    retailPrice: 0,
    deliveryPrice: 0,
    currentStock: 0,
    orderQty: undefined,
    actualQty: 0,
    giftQty: 0,
    diffQty: undefined,
    batchNo: '',
    productionDate: undefined,
    expiryDate: undefined,
    diffReason: '',
    batchManaged: false,
    fromOrder: false,
    sourceOrderNo: undefined,
  });

export const buildItemFromProduct = (product: ReceiptProduct): PurchaseReceiptItem =>
  calculateReceiptItem({
    id: `item-${Date.now()}-${product.id}`,
    productId: product.id,
    barcode: product.barcode,
    productCode: product.code,
    productName: product.name,
    spec: product.spec,
    unit: product.unit,
    purchasePrice: product.purchasePrice,
    taxExcludedPrice: roundTo(product.purchasePrice / (1 + product.taxRate), 4),
    taxIncludedPrice: product.purchasePrice,
    taxRate: product.taxRate,
    taxAmount: 0,
    taxExcludedAmount: 0,
    taxIncludedAmount: 0,
    retailPrice: product.retailPrice,
    deliveryPrice: product.deliveryPrice,
    currentStock: product.currentStock,
    orderQty: undefined,
    actualQty: 1,
    giftQty: 0,
    diffQty: undefined,
    batchNo: '',
    productionDate: undefined,
    expiryDate: undefined,
    diffReason: '',
    batchManaged: product.batchManaged,
    fromOrder: false,
    sourceOrderNo: undefined,
  });

export const isBatchInfoMissing = (_item: PurchaseReceiptItem) => false;
