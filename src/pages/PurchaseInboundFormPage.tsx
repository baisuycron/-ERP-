import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, List, Modal, Row, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AttachmentUploader from '../components/purchaseInbound/AttachmentUploader';
import AuditTimeline from '../components/purchaseInbound/AuditTimeline';
import InboundHeaderForm from '../components/purchaseInbound/InboundHeaderFormV2';
import InboundItemsTable from '../components/purchaseInbound/InboundItemsTable';
import InboundSummaryCard from '../components/purchaseInbound/InboundSummaryCard';
import { purchaseInboundService } from '../services/purchaseInbound';
import {
  AttachmentItem,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseReceiptItem,
  ReceiptMeta,
  ReceiptMode,
  ReceiptProduct,
  ReceiptSavePayload,
} from '../types/purchaseReceipt';
import {
  buildEmptyReceiptItem,
  buildItemFromProduct,
  buildReceiptNo,
  calculateReceiptItem,
  receiptStatusColorMap,
  receiptStatusLabelMap,
} from '../utils/purchaseInbound';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null) {
    const maybeErrorFields = 'errorFields' in error ? (error as { errorFields?: Array<{ errors?: string[] }> }).errorFields : undefined;
    const firstFieldError = maybeErrorFields?.find((field) => field.errors?.length)?.errors?.[0];
    if (firstFieldError) return firstFieldError;

    const maybeMessage = 'message' in error ? (error as { message?: string }).message : undefined;
    if (maybeMessage) return maybeMessage;
  }

  return '操作失败，请稍后重试。';
};

const emptyMeta: ReceiptMeta = {
  suppliers: [],
  warehouses: [],
  products: [],
  purchaseOrders: [],
  statusOptions: [],
};

const mapOrderItemToReceiptItem = (
  order: PurchaseOrder,
  item: PurchaseOrder['items'][number],
): PurchaseReceiptItem =>
  calculateReceiptItem({
    id: `order-${Date.now()}-${item.id}`,
    productId: item.productId,
    barcode: item.barcode,
    productCode: item.productCode,
    productName: item.productName,
    spec: item.spec,
    unit: item.unit,
    purchasePrice: item.purchasePrice,
    taxExcludedPrice: item.taxExcludedPrice,
    taxIncludedPrice: item.taxIncludedPrice,
    taxRate: item.taxRate,
    taxAmount: 0,
    taxExcludedAmount: 0,
    taxIncludedAmount: 0,
    retailPrice: item.retailPrice,
    deliveryPrice: item.deliveryPrice,
    currentStock: item.currentStock,
    orderQty: item.orderedQty,
    actualQty: item.orderedQty,
    giftQty: 0,
    diffQty: undefined,
    batchNo: '',
    productionDate: undefined,
    expiryDate: undefined,
    diffReason: '',
    batchManaged: item.batchManaged,
    fromOrder: true,
    sourceOrderNo: order.orderNo,
  });

const isPlaceholderItem = (item: PurchaseReceiptItem) => !item.productId && !item.productCode && !item.productName;

const ensureEditableItems = (items: PurchaseReceiptItem[]) => {
  const placeholder = items.find(isPlaceholderItem) ?? buildEmptyReceiptItem();
  const filledItems = items.filter((item) => !isPlaceholderItem(item));
  return [...filledItems, placeholder];
};

const stripPlaceholderItems = (items: PurchaseReceiptItem[]) => items.filter((item) => !isPlaceholderItem(item));

export default function PurchaseInboundFormPage() {
  const navigate = useNavigate();
  const { id, mode } = useParams<{ id?: string; mode?: ReceiptMode }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [meta, setMeta] = useState<ReceiptMeta>(emptyMeta);
  const [detail, setDetail] = useState<PurchaseReceipt | null>(null);
  const [items, setItems] = useState<PurchaseReceiptItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [orderOptions, setOrderOptions] = useState<PurchaseOrder[]>([]);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productKeyword, setProductKeyword] = useState('');
  const [selectedItemRowKeys, setSelectedItemRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditRemark, setAuditRemark] = useState('');

  const copyId = searchParams.get('copyId');
  const pageMode: ReceiptMode = mode ?? (id ? 'view' : 'create');
  const readonly = pageMode === 'view' || pageMode === 'audit' || detail?.status === 'audited';
  const canEdit = pageMode === 'create' || (pageMode === 'edit' && detail?.status !== 'audited');

  const title = useMemo(() => {
    if (pageMode === 'create') return '采购入库单新增';
    if (pageMode === 'edit') return '采购入库单编辑';
    if (pageMode === 'audit') return '采购入库单审核';
    return '采购入库单详情';
  }, [pageMode]);

  const addItems = (nextItems: PurchaseReceiptItem[]) => {
    const existingKeys = new Set(items.map((item) => `${item.productCode}-${item.batchNo || ''}-${item.taxIncludedPrice}`));
    const merged = items.filter((item) => !isPlaceholderItem(item));
    const duplicated: string[] = [];

    nextItems.forEach((item) => {
      const key = `${item.productCode}-${item.batchNo || ''}-${item.taxIncludedPrice}`;
      if (existingKeys.has(key)) {
        duplicated.push(item.productName);
        return;
      }
      merged.push(item);
      existingKeys.add(key);
    });

    if (duplicated.length) {
      messageApi.warning(`检测到重复明细，已跳过：${duplicated.join('、')}`);
    }

    setItems(ensureEditableItems(merged));
  };

  const handleItemsChange = (nextItems: PurchaseReceiptItem[]) => {
    const normalizedItems = ensureEditableItems(nextItems);
    setItems(normalizedItems);
    setSelectedItemRowKeys((current) =>
      current.filter((key) => normalizedItems.some((item) => item.id === key && !isPlaceholderItem(item))),
    );
  };

  const handleBatchDelete = () => {
    if (!selectedItemRowKeys.length) {
      messageApi.warning('请先选择商品');
      return;
    }

    const selectedKeySet = new Set(selectedItemRowKeys);
    setItems((current) => ensureEditableItems(current.filter((item) => !selectedKeySet.has(item.id))));
    setSelectedItemRowKeys([]);
    messageApi.success('批量删除成功。');
  };

  const filteredProducts = useMemo(() => {
    const keyword = productKeyword.trim().toLowerCase();
    if (!keyword) return meta.products;

    return meta.products.filter(
      (item) =>
        item.barcode.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword),
    );
  }, [meta.products, productKeyword]);

  const fillForm = (receipt: PurchaseReceipt, isCopy = false) => {
    form.setFieldsValue({
      receiptNo: isCopy ? buildReceiptNo() : receipt.receiptNo,
      receiptDate: dayjs(isCopy ? dayjs() : receipt.receiptDate),
      warehouseId: receipt.warehouseId,
      supplierId: receipt.supplierId,
      purchaseOrderId: receipt.purchaseOrderId,
      remark: receipt.remark,
    });
    const nextItems = receipt.items.map((item) => ({ ...item, id: isCopy ? `copy-${Date.now()}-${item.id}` : item.id }));
    setItems(isCopy || (pageMode === 'edit' && receipt.status !== 'audited') ? ensureEditableItems(nextItems) : nextItems);
    setAttachments(receipt.attachments);
  };

  const fetchOrders = async (supplierId?: string, keyword?: string) => {
    const rows = await purchaseInboundService.searchOrders({ supplierId, keyword });
    setOrderOptions(rows);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const metaRes = await purchaseInboundService.getMeta();
        setMeta(metaRes);

        if (pageMode === 'create') {
          form.setFieldsValue({
            receiptNo: buildReceiptNo(),
            receiptDate: dayjs(),
            warehouseId: undefined,
            supplierId: undefined,
            purchaseOrderId: undefined,
            remark: '',
          });
          setItems(ensureEditableItems([]));
          setSelectedItemRowKeys([]);

          if (copyId) {
            const copied = await purchaseInboundService.getDetail(copyId);
            fillForm(copied, true);
          }
          return;
        }

        if (id) {
          const detailRes = await purchaseInboundService.getDetail(id);
          setDetail(detailRes);
          fillForm(detailRes);
          await fetchOrders(detailRes.supplierId);
        }
      } catch (error) {
        messageApi.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [copyId, form, id, messageApi, pageMode]);

  const buildPayload = async (sourceItems: PurchaseReceiptItem[] = items): Promise<ReceiptSavePayload> => {
    const values = await form.validateFields();
    return {
      receiptDate: values.receiptDate.format('YYYY-MM-DD'),
      warehouseId: values.warehouseId,
      supplierId: values.supplierId,
      purchaseOrderId: values.purchaseOrderId,
      remark: values.remark,
      attachments,
      version: detail?.version,
      items: stripPlaceholderItems(sourceItems),
    };
  };

  const handleSave = async (submit: boolean) => {
    try {
      const submitItems = stripPlaceholderItems(items);
      setItems(submitItems.length ? submitItems : ensureEditableItems([]));
      const payload = await buildPayload(submitItems);
      setSaving(true);
      const result =
        pageMode === 'create'
          ? await purchaseInboundService.create(payload, submit)
          : await purchaseInboundService.update(id!, payload, submit);
      messageApi.success(submit ? '提交审核成功。' : '保存成功。');
      navigate(`/purchase/inbounds/${result.id}/view`);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleAudit = async (action: 'approve' | 'reject') => {
    try {
      if (!id || !detail) return;
      setSaving(true);
      await purchaseInboundService.audit(id, { action, remark: auditRemark, version: detail.version });
      messageApi.success(action === 'approve' ? '审核通过。' : '已驳回并退回修改。');
      navigate(`/purchase/inbounds/${id}/view`);
    } catch (error) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ display: 'flex' }} className="purchase-inbound-form-page">
      {contextHolder}
      <Card
        className="purchase-inbound-form-shell"
        loading={loading}
        title={
          <Space size={8} wrap>
            <span>{title}</span>
            <Tag color={detail?.status ? receiptStatusColorMap[detail.status] : 'default'} style={{ marginInlineEnd: 0 }}>
              {detail?.status ? receiptStatusLabelMap[detail.status] : '未保存'}
            </Tag>
          </Space>
        }
        extra={
          <Space wrap>
            {canEdit ? (
              <>
                <Button type="primary" loading={saving} onClick={() => handleSave(false)}>
                  保存
                </Button>
                <Button loading={saving} onClick={() => handleSave(true)}>
                  提交审核
                </Button>
              </>
            ) : null}
            {pageMode === 'audit' && detail?.status === 'saved' ? (
              <>
                <Button type="primary" loading={saving} onClick={() => handleAudit('approve')}>
                  审核通过
                </Button>
                <Button danger loading={saving} onClick={() => handleAudit('reject')}>
                  驳回
                </Button>
              </>
            ) : null}
            {pageMode === 'view' && detail?.status === 'saved' ? (
              <>
                <Button onClick={() => navigate(`/purchase/inbounds/${detail.id}/edit`)}>编辑</Button>
                <Button onClick={() => navigate(`/purchase/inbounds/${detail.id}/audit`)}>审核</Button>
              </>
            ) : null}
            <Button onClick={() => navigate('/purchase/inbounds')}>返回列表</Button>
          </Space>
        }
      >
        {detail?.status === 'audited' && pageMode === 'edit' ? (
          <Alert
            type="info"
            showIcon
            message="当前单据已审核"
            description="按业务规则已审核单据不可再次编辑，页面仅以只读方式展示。"
            style={{ marginBottom: 12 }}
          />
        ) : null}

        <Form form={form} layout="vertical">
          <InboundHeaderForm
            meta={meta}
            mode={pageMode}
            statusLabel={detail?.status ? receiptStatusLabelMap[detail.status] : '未保存'}
            rejectedRemark={detail?.lastRejectedRemark}
            currentVersion={detail?.version}
            orderOptions={orderOptions}
            readonly={readonly}
            onSupplierSearch={async (keyword) => {
              const result = await purchaseInboundService.searchSuppliers(keyword);
              setMeta((prev) => ({ ...prev, suppliers: result }));
            }}
            onSupplierChange={async (supplierId) => {
              form.setFieldValue('purchaseOrderId', undefined);
              if (supplierId) {
                await fetchOrders(supplierId);
              } else {
                setOrderOptions([]);
              }
            }}
            onOrderSearch={(keyword) => fetchOrders(form.getFieldValue('supplierId'), keyword)}
          />

          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={24}>
              <Card
                size="small"
                title={
                  <Space size={12} wrap>
                    <span>商品明细</span>
                    {!readonly ? (
                      <Button danger disabled={!selectedItemRowKeys.length} onClick={handleBatchDelete}>
                        批量删除
                      </Button>
                    ) : null}
                  </Space>
                }
                extra={
                  !readonly ? (
                    <Space wrap>
                      <Button icon={<PlusOutlined />} onClick={() => setProductPickerOpen(true)}>
                        选择商品
                      </Button>
                    </Space>
                  ) : null
                }
              >
                <InboundItemsTable
                  items={items}
                  products={meta.products}
                  readonly={readonly}
                  onChange={handleItemsChange}
                  selectedRowKeys={selectedItemRowKeys}
                  onSelectedRowKeysChange={setSelectedItemRowKeys}
                />
              </Card>
            </Col>
          </Row>

          <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
            <InboundSummaryCard items={items} />
            <Card size="small" title="附件信息">
              <AttachmentUploader value={attachments} onChange={setAttachments} readonly={readonly} />
            </Card>
            {detail ? <AuditTimeline nodes={detail.auditNodes} flags={detail.integrationFlags} /> : null}
          </Space>

          {pageMode === 'audit' ? (
            <Card size="small" title="审核意见" style={{ marginTop: 12 }}>
              <Input.TextArea
                rows={4}
                value={auditRemark}
                onChange={(event) => setAuditRemark(event.target.value)}
                placeholder="驳回时必须填写意见；通过时可补充说明。"
              />
            </Card>
          ) : null}

          {detail ? (
            <Card size="small" title="操作日志" style={{ marginTop: 12 }}>
              <List
                dataSource={detail.logs}
                renderItem={(log) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{log.content}</Typography.Text>
                      <Typography.Text type="secondary">
                        {log.operator} · {dayjs(log.time).format('YYYY-MM-DD HH:mm:ss')}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          ) : null}
        </Form>
      </Card>

      <Modal
        title="选择采购订货单"
        open={orderPickerOpen}
        width={980}
        onCancel={() => setOrderPickerOpen(false)}
        onOk={() => {
          const order = orderOptions.find((item) => item.id === selectedOrderId);
          if (!order) {
            messageApi.warning('请选择一张采购订货单。');
            return;
          }
          form.setFieldValue('purchaseOrderId', order.id);
          form.setFieldValue('supplierId', order.supplierId);
          form.setFieldValue('warehouseId', order.warehouseId);
          addItems(order.items.map((item) => mapOrderItemToReceiptItem(order, item)));
          setOrderPickerOpen(false);
        }}
      >
        <Alert
          type="info"
          showIcon
          message="支持不关联采购订货单"
          description="如果不选择原单，可直接返回页面后手工录入供应商和商品，系统按无原单入库口径处理。"
          style={{ marginBottom: 12 }}
        />
        <Table
          rowKey="id"
          pagination={false}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedOrderId ? [selectedOrderId] : [],
            onChange: (keys) => setSelectedOrderId(keys[0] as string),
          }}
          columns={[
            { title: '采购订货单号', dataIndex: 'orderNo', width: 180 },
            { title: '供应商', dataIndex: 'supplierName', width: 220 },
            { title: '入库仓库', dataIndex: 'warehouseName', width: 140 },
            { title: '订货日期', dataIndex: 'orderDate', width: 120 },
            { title: '采购员', dataIndex: 'purchaser', width: 100 },
            { title: '状态', dataIndex: 'status', width: 100 },
          ]}
          dataSource={orderOptions}
        />
      </Modal>

      <Modal
        title="选择商品"
        open={productPickerOpen}
        width={980}
        onCancel={() => {
          setProductPickerOpen(false);
          setProductKeyword('');
        }}
        onOk={() => {
          const rows = meta.products.filter((item) => selectedProductIds.includes(item.id)).map((item: ReceiptProduct) => buildItemFromProduct(item));
          if (!rows.length) {
            messageApi.warning('请至少选择 1 个商品。');
            return;
          }
          addItems(rows);
          setProductKeyword('');
          setProductPickerOpen(false);
        }}
      >
        <Input.Search
          allowClear
          value={productKeyword}
          placeholder="请输入商品条码、商品编码、商品名称"
          style={{ width: 320, marginBottom: 12 }}
          onChange={(event) => setProductKeyword(event.target.value)}
        />
        <Table
          rowKey="id"
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedProductIds,
            onChange: (keys) => setSelectedProductIds(keys as string[]),
          }}
          columns={[
            { title: '商品条码', dataIndex: 'barcode', width: 150 },
            { title: '商品编码', dataIndex: 'code', width: 120 },
            { title: '商品名称', dataIndex: 'name', width: 220 },
            { title: '规格', dataIndex: 'spec', width: 120 },
            { title: '单位', dataIndex: 'unit', width: 80 },
            { title: '当前库存', dataIndex: 'currentStock', width: 100 },
            {
              title: '批次管理',
              dataIndex: 'batchManaged',
              width: 100,
              render: (value: boolean) => (value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
            },
          ]}
          dataSource={filteredProducts}
        />
      </Modal>
    </Space>
  );
}

