import { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import dayjs from 'dayjs';
import {
  insertReceipt,
  purchaseInboundMeta,
  purchaseOrdersDb,
  purchaseReceiptsDb,
  removeReceipt,
  replaceReceipt,
  suppliersDb,
  warehousesDb,
} from './purchaseInboundDb';
import {
  PurchaseReceipt,
  ReceiptAuditPayload,
  ReceiptListFilters,
  ReceiptListResponse,
  ReceiptSavePayload,
} from '../types/purchaseReceipt';
import { buildReceiptNo, calculateReceiptItem, summarizeReceiptItems } from '../utils/purchaseInbound';

const containsText = (value: string | undefined, keyword?: string) => {
  if (!keyword) return true;
  return (value ?? '').toLowerCase().includes(keyword.toLowerCase());
};

const parseListFilters = (url?: string): ReceiptListFilters => {
  if (!url || !url.includes('?')) return { page: 1, pageSize: 10 };
  const query = new URLSearchParams(url.split('?')[1]);
  const start = query.get('dateStart') ?? undefined;
  const end = query.get('dateEnd') ?? undefined;

  return {
    purchaseOrderNo: query.get('purchaseOrderNo') ?? undefined,
    receiptNo: query.get('receiptNo') ?? undefined,
    supplierCode: query.get('supplierCode') ?? undefined,
    supplierName: query.get('supplierName') ?? undefined,
    productKeyword: query.get('productKeyword') ?? undefined,
    barcode: query.get('barcode') ?? undefined,
    productCode: query.get('productCode') ?? undefined,
    productName: query.get('productName') ?? undefined,
    dateRange: start && end ? [start, end] : undefined,
    status: (query.get('status') as ReceiptListFilters['status']) ?? undefined,
    warehouseId: query.get('warehouseId') ?? undefined,
    page: Number(query.get('page') ?? 1),
    pageSize: Number(query.get('pageSize') ?? 10),
  };
};

const validatePayload = (payload: ReceiptSavePayload, fullCheck: boolean) => {
  if (!payload.receiptDate) return '请选择单据日期。';
  if (dayjs(payload.receiptDate).isAfter(dayjs(), 'day')) return '单据日期不能晚于当前日期。';
  if (!payload.warehouseId) return '请选择入库仓库后再继续操作。';
  if (!payload.supplierId) return '请选择供应商后再继续操作。';
  if (!payload.items.length) return '空单不可提交，请至少保留 1 条有效明细。';

  for (const [index, item] of payload.items.entries()) {
    const row = calculateReceiptItem(item);
    const line = index + 1;
    if (!row.productCode || !row.productName) return `第 ${line} 行商品信息不完整。`;
    if (row.purchasePrice < 0 || row.taxExcludedPrice < 0 || row.taxIncludedPrice < 0) return `第 ${line} 行价格不得为负数。`;
    if (row.actualQty < 0 || row.giftQty < 0) return `第 ${line} 行数量不得为负数。`;
    if (fullCheck && row.actualQty === 0 && row.giftQty === 0) return `第 ${line} 行实收数量和赠品数量不能同时为 0。`;
    if (row.expiryDate && row.productionDate && dayjs(row.expiryDate).isBefore(dayjs(row.productionDate), 'day')) {
      return `第 ${line} 行到期日期不得早于生产日期。`;
    }
  }

  return '';
};

const mapListItem = (item: PurchaseReceipt): ReceiptListResponse['list'][number] => ({
  id: item.id,
  receiptNo: item.receiptNo,
  receiptDate: item.receiptDate,
  supplierCode: item.supplierCode,
  supplierName: item.supplierName,
  purchaseOrderNo: item.purchaseOrderNo,
  warehouseName: item.warehouseName,
  status: item.status,
  createdBy: item.createdBy,
  auditedBy: item.auditedBy,
  auditedAt: item.auditedAt,
  productCount: item.productCount,
  totalQty: item.totalQty,
  totalAmount: item.totalAmount,
});

const rebuildReceipt = (
  current: PurchaseReceipt | undefined,
  payload: ReceiptSavePayload,
  options?: { submitted?: boolean; rejectedRemark?: string },
): PurchaseReceipt => {
  const supplier = suppliersDb.find((item) => item.id === payload.supplierId)!;
  const warehouse = warehousesDb.find((item) => item.id === payload.warehouseId)!;
  const order = purchaseOrdersDb.find((item) => item.id === payload.purchaseOrderId);
  const items = payload.items.map(calculateReceiptItem);
  const summary = summarizeReceiptItems(items);
  const version = (current?.version ?? 0) + 1;
  const nowTime = dayjs().toISOString();

  return {
    id: current?.id ?? `receipt-${Date.now()}`,
    receiptNo: current?.receiptNo ?? buildReceiptNo(),
    status: current?.status ?? 'saved',
    receiptDate: payload.receiptDate,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    supplierId: supplier.id,
    supplierCode: supplier.code,
    supplierName: supplier.name,
    purchaseOrderId: order?.id,
    purchaseOrderNo: order?.orderNo,
    remark: payload.remark,
    attachments: payload.attachments,
    items,
    totalQty: summary.totalQty,
    totalAmount: summary.totalAmount,
    productCount: summary.productCount,
    createdBy: current?.createdBy ?? '当前用户',
    createdAt: current?.createdAt ?? nowTime,
    updatedAt: nowTime,
    version,
    lastRejectedRemark: options?.rejectedRemark ?? current?.lastRejectedRemark,
    currentAuditNode: current?.currentAuditNode ?? 1,
    auditNodes: current?.auditNodes ?? [
      { id: 'node-1', nodeName: '一级审核', auditor: '仓储主管', result: 'pending' },
      { id: 'node-2', nodeName: '二级审核', auditor: '采购经理', result: 'pending' },
    ],
    logs: [
      ...(current?.logs ?? [
        { id: `log-${Date.now()}`, type: 'create', operator: '当前用户', time: nowTime, content: '创建采购入库单' },
      ]),
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: options?.submitted ? 'submit' : 'save',
        operator: '当前用户',
        time: nowTime,
        content: options?.submitted ? '提交审核，等待审核节点处理' : '保存采购入库单',
      },
    ],
    auditedBy: current?.auditedBy,
    auditedAt: current?.auditedAt,
    integrationFlags:
      current?.integrationFlags ?? {
        inventorySyncStatus: 'pending',
        financeSyncStatus: 'pending',
        messageSyncStatus: 'pending',
      },
  };
};

export const setupPurchaseInboundMock = (adapter: AxiosInstance | MockAdapter) => {
  const mock = adapter instanceof MockAdapter ? adapter : new MockAdapter(adapter, { delayResponse: 350 });

  mock.onGet('/api/purchase-inbounds/meta').reply(200, purchaseInboundMeta);

  mock.onGet(/\/api\/purchase-inbounds\/lookup\/suppliers.*/).reply((config) => {
    const query = new URLSearchParams(config.url?.split('?')[1] ?? '');
    const keyword = query.get('keyword') ?? '';
    return [200, suppliersDb.filter((item) => containsText(item.code, keyword) || containsText(item.name, keyword))];
  });

  mock.onGet(/\/api\/purchase-inbounds\/lookup\/orders.*/).reply((config) => {
    const query = new URLSearchParams(config.url?.split('?')[1] ?? '');
    const supplierId = query.get('supplierId') ?? '';
    const keyword = query.get('keyword') ?? '';
    return [
      200,
      purchaseOrdersDb.filter(
        (item) => (!supplierId || item.supplierId === supplierId) && containsText(item.orderNo, keyword),
      ),
    ];
  });

  mock.onGet(/\/api\/purchase-inbounds\/lookup\/product-by-barcode.*/).reply((config) => {
    const query = new URLSearchParams(config.url?.split('?')[1] ?? '');
    const barcode = query.get('barcode') ?? '';
    const product = purchaseInboundMeta.products.find((item) => item.barcode === barcode);
    if (!product) return [404, { message: '扫码失败，未找到对应商品，可改用手工检索录入。' }];
    return [200, product];
  });

  mock.onGet(/\/api\/purchase-inbounds\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop() ?? '';
    const target = purchaseReceiptsDb.find((item) => item.id === id);
    if (!target) return [404, { message: '采购入库单不存在或已被删除。' }];
    return [200, target];
  });

  mock.onGet(/\/api\/purchase-inbounds.*/).reply((config) => {
    const filters = parseListFilters(config.url);
    const rows = purchaseReceiptsDb
      .filter((item) => {
        const dateMatched = filters.dateRange
          ? dayjs(item.receiptDate).isAfter(dayjs(filters.dateRange[0]).subtract(1, 'day')) &&
            dayjs(item.receiptDate).isBefore(dayjs(filters.dateRange[1]).add(1, 'day'))
          : true;
        const detailMatched = filters.productKeyword
          ? item.items.some(
              (detail) =>
                containsText(detail.barcode, filters.productKeyword) ||
                containsText(detail.productCode, filters.productKeyword) ||
                containsText(detail.productName, filters.productKeyword),
            )
          : !filters.barcode && !filters.productCode && !filters.productName
            ? true
            : item.items.some(
                (detail) =>
                  containsText(detail.barcode, filters.barcode) &&
                  containsText(detail.productCode, filters.productCode) &&
                  containsText(detail.productName, filters.productName),
              );

        return (
          containsText(item.purchaseOrderNo, filters.purchaseOrderNo) &&
          containsText(item.receiptNo, filters.receiptNo) &&
          containsText(item.supplierCode, filters.supplierCode) &&
          containsText(item.supplierName, filters.supplierName) &&
          dateMatched &&
          detailMatched &&
          (!filters.status || item.status === filters.status) &&
          (!filters.warehouseId || item.warehouseId === filters.warehouseId)
        );
      })
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return [200, { list: rows.slice(start, start + pageSize).map(mapListItem), total: rows.length }];
  });

  mock.onPost('/api/purchase-inbounds').reply((config) => {
    const { payload, submit } = JSON.parse(config.data) as { payload: ReceiptSavePayload; submit: boolean };
    const errorMessage = validatePayload(payload, submit);
    if (errorMessage) return [400, { message: errorMessage }];
    const receipt = rebuildReceipt(undefined, payload, { submitted: submit });
    insertReceipt(receipt);
    return [200, receipt];
  });

  mock.onPut(/\/api\/purchase-inbounds\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop() ?? '';
    const target = purchaseReceiptsDb.find((item) => item.id === id);
    if (!target) return [404, { message: '采购入库单不存在或已被删除。' }];
    if (target.status === 'audited') return [409, { message: '已审核单据不可编辑。' }];

    const { payload, submit } = JSON.parse(config.data) as { payload: ReceiptSavePayload; submit: boolean };
    if (payload.version !== target.version) return [409, { message: '单据已发生变更，请刷新后重试。' }];

    const errorMessage = validatePayload(payload, submit);
    if (errorMessage) return [400, { message: errorMessage }];

    if (payload.purchaseOrderId) {
      const order = purchaseOrdersDb.find((item) => item.id === payload.purchaseOrderId);
      if (!order || order.status === 'closed') {
        return [409, { message: '关联采购订货单状态已变化，请刷新后重新选择。' }];
      }
    }

    const updated = replaceReceipt(id, (current) => rebuildReceipt(current, payload, { submitted: submit }));
    return [200, updated];
  });

  mock.onDelete(/\/api\/purchase-inbounds\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop() ?? '';
    const target = purchaseReceiptsDb.find((item) => item.id === id);
    if (!target) return [404, { message: '采购入库单不存在或已被删除。' }];
    if (target.status !== 'saved') return [409, { message: '仅允许删除已保存单据。' }];
    removeReceipt(id);
    return [200, { success: true }];
  });

  mock.onPost(/\/api\/purchase-inbounds\/[^/]+\/audit$/).reply((config) => {
    const parts = config.url?.split('/') ?? [];
    const id = parts[3] ?? '';
    const payload = JSON.parse(config.data || '{}') as ReceiptAuditPayload;
    const target = purchaseReceiptsDb.find((item) => item.id === id);

    if (!target) return [404, { message: '采购入库单不存在或已被删除。' }];
    if (target.status === 'audited') return [409, { message: '单据已审核，不可重复操作。' }];
    if (payload.version !== target.version) return [409, { message: '单据已发生变更，请刷新后重试。' }];
    if (payload.action === 'reject' && !payload.remark?.trim()) return [400, { message: '驳回时必须填写审核意见。' }];

    const updated = replaceReceipt(id, (current) => {
      const time = dayjs().toISOString();
      if (payload.action === 'reject') {
        return {
          ...current,
          version: current.version + 1,
          updatedAt: time,
          lastRejectedRemark: payload.remark,
          currentAuditNode: 1,
          auditNodes: current.auditNodes.map((node, index) =>
            index === 0
              ? { ...node, result: 'rejected', auditTime: time, remark: payload.remark }
              : { ...node, result: 'pending', auditTime: undefined, remark: undefined },
          ),
          logs: [
            ...current.logs,
            { id: `log-${Date.now()}`, type: 'reject', operator: '仓储主管', time, content: `审核驳回：${payload.remark}` },
          ],
        };
      }

      return {
        ...current,
        status: 'audited',
        version: current.version + 1,
        updatedAt: time,
        auditedBy: '采购经理',
        auditedAt: time,
        currentAuditNode: 2,
        auditNodes: current.auditNodes.map((node, index) => ({
          ...node,
          result: 'approved',
          auditTime: index === 0 ? current.auditNodes[0].auditTime || time : time,
          remark: index === 0 ? current.auditNodes[0].remark || '数量、价格、附件校验通过' : payload.remark || '审核通过',
        })),
        logs: [
          ...current.logs,
          { id: `log-${Date.now()}`, type: 'approve', operator: '采购经理', time, content: '审核通过，生成库存流水并增加可用库存' },
          {
            id: `log-${Date.now()}-finance`,
            type: 'system',
            operator: '系统',
            time: dayjs(time).add(1, 'minute').toISOString(),
            content: '财务推送失败，不影响主事务，已写入失败日志并等待补偿重试',
          },
        ],
        integrationFlags: { inventorySyncStatus: 'success', financeSyncStatus: 'failed', messageSyncStatus: 'success' },
      };
    });

    return [200, updated];
  });
};
