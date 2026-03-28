import { Alert, Card, Col, DatePicker, Form, Input, Row, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { PurchaseOrder, ReceiptMeta, ReceiptMode } from '../../types/purchaseReceipt';

interface Props {
  meta: ReceiptMeta;
  mode: ReceiptMode;
  statusLabel?: string;
  rejectedRemark?: string;
  currentVersion?: number;
  orderOptions: PurchaseOrder[];
  readonly: boolean;
  onSupplierSearch: (keyword: string) => void;
  onSupplierChange: (supplierId?: string) => void;
  onOrderSearch: (keyword: string) => void;
}

export default function InboundHeaderFormV2({
  meta,
  mode,
  statusLabel,
  rejectedRemark,
  orderOptions,
  readonly,
  onSupplierSearch,
  onSupplierChange,
  onOrderSearch,
}: Props) {
  return (
    <Card size="small" title={mode === 'view' ? undefined : '表头信息'}>
      <Row gutter={16}>
        {rejectedRemark ? (
          <Col span={24}>
            <Alert type="warning" showIcon message="最近一次驳回意见" description={rejectedRemark} style={{ marginBottom: 16 }} />
          </Col>
        ) : null}
        <Col span={6}>
          <Form.Item label="采购入库单号" name="receiptNo">
            <Input disabled />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="单据状态">
            <Input disabled value={statusLabel} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="单据日期" name="receiptDate" rules={[{ required: true, message: '请选择单据日期' }]}>
            <DatePicker
              disabled={readonly}
              placeholder="请选择单据日期"
              style={{ width: '100%' }}
              disabledDate={(date) => !!date && date.isAfter(dayjs(), 'day')}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="关联采购订货单" name="purchaseOrderId">
            <Select
              showSearch
              allowClear
              disabled={readonly}
              placeholder="可不关联原单，支持直采直入"
              filterOption={false}
              options={orderOptions.map((item) => ({ label: item.orderNo, value: item.id }))}
              onSearch={onOrderSearch}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="入库仓库" name="warehouseId" rules={[{ required: true, message: '请选择入库仓库' }]}>
            <Select
              disabled={readonly}
              placeholder="请选择入库仓库"
              options={meta.warehouses.map((item) => ({ label: `${item.code} / ${item.name}`, value: item.id }))}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="供应商" name="supplierId" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              showSearch
              allowClear
              disabled={readonly}
              placeholder="支持按供应商编号或名称搜索"
              filterOption={false}
              options={meta.suppliers.map((item) => ({ label: `${item.code} / ${item.name}`, value: item.id }))}
              onSearch={onSupplierSearch}
              onChange={onSupplierChange}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="备注" name="remark">
            <Input maxLength={200} disabled={readonly} placeholder="请输入备注说明、差异处理背景或补充信息" />
          </Form.Item>
        </Col>
        {mode === 'audit' ? (
          <Col span={24}>
            <Typography.Text type="secondary">审核页仅展示业务主数据与审核操作，业务状态仍只保留“已保存 / 已审核”两种。</Typography.Text>
          </Col>
        ) : null}
      </Row>
    </Card>
  );
}
