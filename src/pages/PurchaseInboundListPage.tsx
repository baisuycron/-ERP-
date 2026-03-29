import { useEffect, useMemo, useState } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, HolderOutlined, SettingOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { purchaseInboundService } from '../services/purchaseInbound';
import { ReceiptListFilters, ReceiptListItem, ReceiptMeta } from '../types/purchaseReceipt';
import { formatCurrency, formatQty, receiptStatusColorMap, receiptStatusLabelMap } from '../utils/purchaseInbound';

const getDefaultDateRangeValues = () => [dayjs().subtract(6, 'day'), dayjs()] as const;

const getInitialFilters = (): ReceiptListFilters => {
  const [start, end] = getDefaultDateRangeValues();
  return {
    page: 1,
    pageSize: 10,
    dateRange: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
  };
};

type ColumnSettingKey =
  | 'receiptNo'
  | 'receiptDate'
  | 'supplierName'
  | 'purchaseOrderNo'
  | 'warehouseName'
  | 'status'
  | 'createdBy'
  | 'auditedBy'
  | 'auditedAt'
  | 'productCount'
  | 'totalQty'
  | 'totalAmount';

interface ColumnSettingItem {
  key: ColumnSettingKey;
  title: string;
  visible: boolean;
}

const defaultColumnSettings: ColumnSettingItem[] = [
  { key: 'receiptNo', title: '采购入库单号', visible: true },
  { key: 'receiptDate', title: '单据日期', visible: true },
  { key: 'supplierName', title: '供应商', visible: true },
  { key: 'purchaseOrderNo', title: '关联采购订货单号', visible: true },
  { key: 'warehouseName', title: '入库仓库', visible: true },
  { key: 'status', title: '单据状态', visible: true },
  { key: 'createdBy', title: '创建人', visible: true },
  { key: 'auditedBy', title: '审核人', visible: true },
  { key: 'auditedAt', title: '审核时间', visible: true },
  { key: 'productCount', title: '商品种数', visible: true },
  { key: 'totalQty', title: '入库总数量', visible: true },
  { key: 'totalAmount', title: '单据总金额', visible: true },
];

export default function PurchaseInboundListPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [meta, setMeta] = useState<ReceiptMeta>({
    suppliers: [],
    warehouses: [],
    products: [],
    purchaseOrders: [],
    statusOptions: [],
  });
  const [filters, setFilters] = useState<ReceiptListFilters>(getInitialFilters);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<ReceiptListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({ all: 0, saved: 0, audited: 0 });
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [columnSettings, setColumnSettings] = useState<ColumnSettingItem[]>(defaultColumnSettings);
  const [draftColumnSettings, setDraftColumnSettings] = useState<ColumnSettingItem[]>(defaultColumnSettings);
  const [draggingColumnKey, setDraggingColumnKey] = useState<ColumnSettingKey | null>(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState<ColumnSettingKey | null>(null);

  const fetchList = async (nextFilters: ReceiptListFilters = filters) => {
    try {
      setLoading(true);
      const countFilters = { ...nextFilters, status: undefined, page: 1, pageSize: 1 };
      const [metaRes, listRes, allRes, savedRes, auditedRes] = await Promise.all([
        meta.statusOptions.length ? Promise.resolve(meta) : purchaseInboundService.getMeta(),
        purchaseInboundService.getList(nextFilters),
        purchaseInboundService.getList(countFilters),
        purchaseInboundService.getList({ ...countFilters, status: 'saved' }),
        purchaseInboundService.getList({ ...countFilters, status: 'audited' }),
      ]);
      setMeta(metaRes);
      setTableData(listRes.list);
      setTotal(listRes.total);
      setTabCounts({ all: allRes.total, saved: savedRes.total, audited: auditedRes.total });
    } catch (error) {
      messageApi.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFilters = getInitialFilters();
    form.setFieldsValue({ dateRange: getDefaultDateRangeValues() });
    setFilters(initialFilters);
    fetchList(initialFilters);
  }, []);

  const buildFiltersFromForm = (status?: ReceiptListFilters['status']): ReceiptListFilters => {
    const values = form.getFieldsValue();
    return {
      purchaseOrderNo: values.purchaseOrderNo,
      receiptNo: values.receiptNo,
      supplierName: values.supplierName,
      productKeyword: values.productKeyword,
      dateRange:
        values.dateRange?.length === 2
          ? [values.dateRange[0].format('YYYY-MM-DD'), values.dateRange[1].format('YYYY-MM-DD')]
          : undefined,
      status: status === undefined ? undefined : status,
      warehouseId: values.warehouseId,
      page: 1,
      pageSize: filters.pageSize ?? 10,
    };
  };

  const handleSearch = async () => {
    await form.validateFields();
    const nextFilters = buildFiltersFromForm(filters.status);
    setFilters(nextFilters);
    fetchList(nextFilters);
  };

  const handleReset = () => {
    const defaultDateRange = getDefaultDateRangeValues();
    const initialFilters = getInitialFilters();
    form.resetFields();
    form.setFieldsValue({ dateRange: defaultDateRange });
    setFilters(initialFilters);
    fetchList(initialFilters);
  };

  const handleStatusTabChange = (status?: ReceiptListFilters['status']) => {
    const nextFilters = buildFiltersFromForm(status);
    setFilters(nextFilters);
    fetchList(nextFilters);
  };

  const exportRows = () => {
    const headers = ['采购入库单号', '单据日期', '供应商', '关联采购订货单号', '入库仓库', '单据状态', '创建人', '审核人', '审核时间', '商品种数', '入库总数量', '单据总金额'];
    const lines = tableData.map((item) =>
      [
        item.receiptNo,
        item.receiptDate,
        item.supplierName,
        item.purchaseOrderNo ?? '',
        item.warehouseName,
        receiptStatusLabelMap[item.status],
        item.createdBy,
        item.auditedBy ?? '',
        item.auditedAt ? dayjs(item.auditedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        item.productCount,
        item.totalQty,
        item.totalAmount,
      ].join(','),
    );
    const blob = new Blob([`\uFEFF${[headers.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `采购入库单-${dayjs().format('YYYYMMDDHHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    messageApi.success('已按当前筛选条件导出命中记录。');
  };

  const activeStatus = filters.status;
  const visibleDraftCount = draftColumnSettings.filter((item) => item.visible).length;
  const allDraftChecked = visibleDraftCount === draftColumnSettings.length;
  const selectedDraftItems = draftColumnSettings.filter((item) => item.visible);

  const baseColumns = useMemo<Record<ColumnSettingKey, ColumnsType<ReceiptListItem>[number]>>(
    () => ({
      receiptNo: { title: '采购入库单号', dataIndex: 'receiptNo', width: 180, fixed: 'left' },
      receiptDate: {
        title: '单据日期',
        dataIndex: 'receiptDate',
        width: 120,
        sorter: (a, b) => dayjs(a.receiptDate || '').valueOf() - dayjs(b.receiptDate || '').valueOf(),
      },
      supplierName: { title: '供应商', dataIndex: 'supplierName', width: 220 },
      purchaseOrderNo: {
        title: '关联采购订货单号',
        dataIndex: 'purchaseOrderNo',
        width: 180,
        render: (value?: string) => value || '-',
      },
      warehouseName: { title: '入库仓库', dataIndex: 'warehouseName', width: 140 },
      status: {
        title: '单据状态',
        dataIndex: 'status',
        width: 110,
        render: (value: ReceiptListItem['status']) => <Tag color={receiptStatusColorMap[value]}>{receiptStatusLabelMap[value]}</Tag>,
      },
      createdBy: { title: '创建人', dataIndex: 'createdBy', width: 100 },
      auditedBy: { title: '审核人', dataIndex: 'auditedBy', width: 100, render: (value?: string) => value || '-' },
      auditedAt: {
        title: '审核时间',
        dataIndex: 'auditedAt',
        width: 170,
        sorter: (a, b) => dayjs(a.auditedAt || '').valueOf() - dayjs(b.auditedAt || '').valueOf(),
        render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      productCount: { title: '商品种数', dataIndex: 'productCount', width: 100 },
      totalQty: { title: '入库总数量', dataIndex: 'totalQty', width: 120, render: (value: number) => formatQty(value) },
      totalAmount: { title: '单据总金额', dataIndex: 'totalAmount', width: 120, render: (value: number) => formatCurrency(value) },
    }),
    [],
  );

  const columns = useMemo<ColumnsType<ReceiptListItem>>(
    () => [
      ...columnSettings
        .filter((item) => item.visible)
        .map((item, index) => {
          const column = { ...baseColumns[item.key] };
          if (index === 0) {
            column.fixed = 'left';
          } else if ('fixed' in column) {
            delete column.fixed;
          }
          return column;
        }),
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 220,
        render: (_, record) => (
          <Space size={4} wrap>
            <Button type="link" size="small" onClick={() => navigate(`/purchase/inbounds/${record.id}/view`)}>
              查看
            </Button>
            {record.status === 'saved' ? (
              <Button type="link" size="small" onClick={() => navigate(`/purchase/inbounds/${record.id}/edit`)}>
                编辑
              </Button>
            ) : null}
            {record.status === 'saved' ? (
              <Button
                type="link"
                size="small"
                onClick={() =>
                  Modal.confirm({
                    title: '确认审核当前采购入库单吗？',
                    content: `单号：${record.receiptNo}`,
                    cancelText: '返回',
                    okText: '确认',
                    onOk: async () => {
                      try {
                        const detail = await purchaseInboundService.getDetail(record.id);
                        await purchaseInboundService.audit(record.id, { action: 'approve', version: detail.version });
                        messageApi.success('审核通过。');
                        fetchList(filters);
                      } catch (error) {
                        messageApi.error((error as Error).message);
                      }
                    },
                  })
                }
              >
                审核
              </Button>
            ) : null}
            {record.status === 'saved' ? (
              <Button
                type="link"
                danger
                size="small"
                onClick={() =>
                  Modal.confirm({
                    title: '确认删除当前采购入库单吗？',
                    content: `单号：${record.receiptNo}`,
                    cancelText: '返回',
                    okText: '确认',
                    onOk: async () => {
                      try {
                        await purchaseInboundService.remove(record.id);
                        messageApi.success('删除成功。');
                        fetchList(filters);
                      } catch (error) {
                        messageApi.error((error as Error).message);
                      }
                    },
                  })
                }
              >
                删除
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [baseColumns, columnSettings, filters, navigate],
  );

  const moveColumnSetting = (index: number, direction: 'up' | 'down') => {
    setDraftColumnSettings((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const moveColumnSettingByKeys = (sourceKey: ColumnSettingKey, targetKey: ColumnSettingKey) => {
    if (sourceKey === targetKey) return;
    setDraftColumnSettings((current) => {
      const sourceIndex = current.findIndex((item) => item.key === sourceKey);
      const targetIndex = current.findIndex((item) => item.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved);
      return next;
    });
  };

  const handleColumnVisibleChange = (key: ColumnSettingKey, visible: boolean) => {
    setDraftColumnSettings((current) => {
      if (!visible && current.filter((item) => item.visible).length === 1) {
        messageApi.warning('至少保留 1 个列表字段。');
        return current;
      }
      return current.map((item) => (item.key === key ? { ...item, visible } : item));
    });
  };

  const handleOpenColumnSettings = () => {
    setDraftColumnSettings(columnSettings);
    setColumnSettingsOpen(true);
  };

  const handleResetColumnSettings = () => {
    setDraftColumnSettings(defaultColumnSettings);
  };

  const handleApplyColumnSettings = () => {
    setColumnSettings(draftColumnSettings);
    setColumnSettingsOpen(false);
  };

  return (
    <div className="erp-list-page">
      {contextHolder}
      <div className="erp-list-hero">
        <div>
          <Typography.Title level={2} className="erp-list-title">
            采购入库单列表
          </Typography.Title>
          <Typography.Paragraph className="erp-list-subtitle">
            高频查询、列表查看、审核处理与导出统一在当前页面完成。
          </Typography.Paragraph>
        </div>
        <Space size={12} wrap>
          <Button className="erp-list-hero-button" type="primary" onClick={() => navigate('/purchase/inbounds/create')}>
            新增采购入库单
          </Button>
          <Button className="erp-list-hero-button" onClick={exportRows}>
            导出
          </Button>
        </Space>
      </div>

      <Card className="erp-filter-card" bordered={false}>
        <Form form={form} layout="vertical">
          <Row gutter={[20, 0]}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="采购订货单号" name="purchaseOrderNo">
                <Input allowClear placeholder="请输入采购订货单号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="采购入库单号" name="receiptNo">
                <Input allowClear placeholder="请输入采购入库单号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="供应商名称" name="supplierName">
                <Input allowClear placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="商品信息" name="productKeyword">
                <Input allowClear placeholder="请输入商品条码、编码或名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="单据日期" name="dateRange">
                <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['', '']} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="入库仓库" name="warehouseId">
                <Select
                  allowClear
                  placeholder="请选择入库仓库"
                  options={meta.warehouses.map((item) => ({ label: `${item.code} / ${item.name}`, value: item.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={12} className="erp-filter-actions-col">
              <div className="erp-filter-actions-label-spacer" />
              <div className="erp-filter-actions">
                <Space size={12}>
                  <Button onClick={handleReset}>重置</Button>
                  <Button type="primary" onClick={handleSearch}>
                    查询
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="erp-data-card" bordered={false}>
        <div className="erp-data-card-head">
          <div className="erp-data-tabs">
            <button
              type="button"
              className={`erp-data-tab ${!activeStatus ? 'is-active' : ''}`}
              onClick={() => handleStatusTabChange(undefined)}
            >
              全部（{tabCounts.all}）
            </button>
            <button
              type="button"
              className={`erp-data-tab ${activeStatus === 'saved' ? 'is-active' : ''}`}
              onClick={() => handleStatusTabChange('saved')}
            >
              已保存（{tabCounts.saved}）
            </button>
            <button
              type="button"
              className={`erp-data-tab ${activeStatus === 'audited' ? 'is-active' : ''}`}
              onClick={() => handleStatusTabChange('audited')}
            >
              已审核（{tabCounts.audited}）
            </button>
          </div>
          <Button icon={<SettingOutlined />} onClick={handleOpenColumnSettings}>
            列设置
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={tableData}
          scroll={{ x: 1800 }}
          locale={{ emptyText: '暂无采购入库单数据，请调整筛选条件或新增单据。' }}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total,
            showSizeChanger: { showSearch: false },
            locale: { items_per_page: '条 / 页' },
            showTotal: (value) => `共 ${value} 条采购入库单记录`,
            onChange: (page, pageSize) => {
              const next = { ...filters, page, pageSize };
              setFilters(next);
              fetchList(next);
            },
          }}
        />
      </Card>

      <Modal
        title="采购入库单列设置"
        open={columnSettingsOpen}
        width={980}
        onCancel={() => setColumnSettingsOpen(false)}
        footer={
          <div className="erp-column-settings-footer">
            <Button onClick={handleResetColumnSettings}>恢复默认</Button>
            <Space>
              <Button onClick={() => setColumnSettingsOpen(false)}>取消</Button>
              <Button type="primary" onClick={handleApplyColumnSettings}>
                保存并应用
              </Button>
            </Space>
          </div>
        }
      >
        <div className="erp-column-settings-shell">
          <div className="erp-column-settings-left">
            <div className="erp-column-settings-toolbar">
              <Checkbox
                checked={allDraftChecked}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDraftColumnSettings((current) => current.map((item) => ({ ...item, visible: checked })));
                }}
              >
                全选
              </Checkbox>
              <Typography.Text type="secondary">已显示{visibleDraftCount}项</Typography.Text>
            </div>
            <div className="erp-column-settings-grid">
              {draftColumnSettings.map((item) => (
                <label key={item.key} className={`erp-column-settings-card ${item.visible ? 'is-active' : ''}`}>
                  <Checkbox checked={item.visible} onChange={(event) => handleColumnVisibleChange(item.key, event.target.checked)}>
                    {item.title}
                  </Checkbox>
                </label>
              ))}
            </div>
          </div>
          <div className="erp-column-settings-right">
            <div className="erp-column-settings-right-head">
              <Typography.Title level={4}>已选({selectedDraftItems.length})</Typography.Title>
              <Typography.Text type="secondary">可调整字段显示顺序</Typography.Text>
            </div>
            <div className="erp-column-settings-selected-list">
              {selectedDraftItems.map((item) => {
                const index = draftColumnSettings.findIndex((current) => current.key === item.key);
                return (
                  <div
                    key={item.key}
                    draggable
                    className={`erp-column-settings-selected-item ${draggingColumnKey === item.key ? 'is-dragging' : ''} ${dragOverColumnKey === item.key ? 'is-drag-over' : ''}`}
                    onDragStart={() => {
                      setDraggingColumnKey(item.key);
                      setDragOverColumnKey(item.key);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverColumnKey !== item.key) {
                        setDragOverColumnKey(item.key);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingColumnKey) {
                        moveColumnSettingByKeys(draggingColumnKey, item.key);
                      }
                      setDraggingColumnKey(null);
                      setDragOverColumnKey(null);
                    }}
                    onDragEnd={() => {
                      setDraggingColumnKey(null);
                      setDragOverColumnKey(null);
                    }}
                  >
                    <div className="erp-column-settings-selected-main">
                      <span className="erp-column-settings-drag-handle">
                        <HolderOutlined />
                      </span>
                      <span className="erp-column-settings-selected-index">{selectedDraftItems.indexOf(item) + 1}</span>
                      <span>{item.title}</span>
                    </div>
                    <Space size={8}>
                      <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveColumnSetting(index, 'up')} />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={index === draftColumnSettings.length - 1}
                        onClick={() => moveColumnSetting(index, 'down')}
                      />
                    </Space>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

