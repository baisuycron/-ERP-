import dayjs from 'dayjs';
import { client as http } from './client';
import { PurchaseOrder, PurchaseReceipt, ReceiptAuditPayload, ReceiptListFilters, ReceiptListResponse, ReceiptMeta, ReceiptProduct, ReceiptSavePayload, Supplier } from '../types/purchaseReceipt';

const buildQuery = (filters: ReceiptListFilters) => {
  const params = new URLSearchParams();
  if (filters.purchaseOrderNo) params.set('purchaseOrderNo', filters.purchaseOrderNo);
  if (filters.receiptNo) params.set('receiptNo', filters.receiptNo);
  if (filters.supplierCode) params.set('supplierCode', filters.supplierCode);
  if (filters.supplierName) params.set('supplierName', filters.supplierName);
  if (filters.productKeyword) params.set('productKeyword', filters.productKeyword);
  if (filters.barcode) params.set('barcode', filters.barcode);
  if (filters.productCode) params.set('productCode', filters.productCode);
  if (filters.productName) params.set('productName', filters.productName);
  if (filters.dateRange?.length === 2) {
    params.set('dateStart', dayjs(filters.dateRange[0]).format('YYYY-MM-DD'));
    params.set('dateEnd', dayjs(filters.dateRange[1]).format('YYYY-MM-DD'));
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 10));
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const purchaseInboundService = {
  async getMeta() {
    const res = await http.get<ReceiptMeta>('/api/purchase-inbounds/meta');
    return res.data;
  },
  async getList(filters: ReceiptListFilters) {
    const res = await http.get<ReceiptListResponse>(`/api/purchase-inbounds${buildQuery(filters)}`);
    return res.data;
  },
  async getDetail(id: string) {
    const res = await http.get<PurchaseReceipt>(`/api/purchase-inbounds/${id}`);
    return res.data;
  },
  async create(payload: ReceiptSavePayload, submit: boolean) {
    const res = await http.post<PurchaseReceipt>('/api/purchase-inbounds', { payload, submit });
    return res.data;
  },
  async update(id: string, payload: ReceiptSavePayload, submit: boolean) {
    const res = await http.put<PurchaseReceipt>(`/api/purchase-inbounds/${id}`, { payload, submit });
    return res.data;
  },
  async remove(id: string) {
    await http.delete(`/api/purchase-inbounds/${id}`);
  },
  async audit(id: string, payload: ReceiptAuditPayload) {
    const res = await http.post<PurchaseReceipt>(`/api/purchase-inbounds/${id}/audit`, payload);
    return res.data;
  },
  async searchSuppliers(keyword: string) {
    const res = await http.get<Supplier[]>(`/api/purchase-inbounds/lookup/suppliers?keyword=${encodeURIComponent(keyword)}`);
    return res.data;
  },
  async searchOrders(params: { supplierId?: string; keyword?: string }) {
    const res = await http.get<PurchaseOrder[]>(`/api/purchase-inbounds/lookup/orders?supplierId=${encodeURIComponent(params.supplierId ?? '')}&keyword=${encodeURIComponent(params.keyword ?? '')}`);
    return res.data;
  },
  async getProductByBarcode(barcode: string) {
    const res = await http.get<ReceiptProduct>(`/api/purchase-inbounds/lookup/product-by-barcode?barcode=${encodeURIComponent(barcode)}`);
    return res.data;
  },
};
