import { AutoComplete, Button, DatePicker, Input, InputNumber, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PurchaseReceiptItem, ReceiptProduct } from '../../types/purchaseReceipt';
import { calculateReceiptItem, formatCurrency, formatQty } from '../../utils/purchaseInbound';

interface Props {
  items: PurchaseReceiptItem[];
  products: ReceiptProduct[];
  readonly: boolean;
  onChange: (items: PurchaseReceiptItem[]) => void;
  onBatchDelete: () => void;
  selectedRowKeys: React.Key[];
  onSelectedRowKeysChange: (keys: React.Key[]) => void;
}

export default function InboundItemsTable({
  items,
  products,
  readonly,
  onChange,
  onBatchDelete,
  selectedRowKeys,
  onSelectedRowKeysChange,
}: Props) {
  const isPlaceholderItem = (item: PurchaseReceiptItem) => !item.productId && !item.productCode && !item.productName;

  const updateItem = (id: string, patch: Partial<PurchaseReceiptItem>) => {
    onChange(items.map((item) => (item.id === id ? calculateReceiptItem({ ...item, ...patch }) : item)));
  };

  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  const applyProductToItem = (id: string, product: ReceiptProduct) => {
    updateItem(id, {
      productId: product.id,
      barcode: product.barcode,
      productCode: product.code,
      productName: product.name,
      spec: product.spec,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      taxExcludedPrice: Number((product.purchasePrice / (1 + product.taxRate)).toFixed(4)),
      taxIncludedPrice: product.purchasePrice,
      taxRate: product.taxRate,
      retailPrice: product.retailPrice,
      deliveryPrice: product.deliveryPrice,
      currentStock: product.currentStock,
      batchManaged: product.batchManaged,
    });
  };

  const getBarcodeOptions = (keyword: string) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return [];

    return products
      .filter(
        (product) =>
          product.barcode.toLowerCase().includes(normalizedKeyword) ||
          product.code.toLowerCase().includes(normalizedKeyword) ||
          product.name.toLowerCase().includes(normalizedKeyword),
      )
      .slice(0, 10)
      .map((product) => ({
        value: product.barcode,
        label: (
          <div className="purchase-inbound-autocomplete-option">
            <span className="purchase-inbound-autocomplete-cell is-barcode">{product.barcode}</span>
            <span className="purchase-inbound-autocomplete-cell is-code">{product.code}</span>
            <span className="purchase-inbound-autocomplete-cell is-name">{product.name}</span>
            <span className="purchase-inbound-autocomplete-cell is-spec">{product.spec}</span>
            <span className="purchase-inbound-autocomplete-cell is-unit">{product.unit}</span>
          </div>
        ),
      }));
  };

  const rowSelection: TableRowSelection<PurchaseReceiptItem> = {
    fixed: true,
    selectedRowKeys,
    onChange: (keys) => onSelectedRowKeysChange(keys),
        columnWidth: 48,
    columnTitle: (
      <Tooltip title="批量删除">
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={!selectedRowKeys.length}
          onClick={(event) => {
            event.stopPropagation();
            onBatchDelete();
          }}
        />
      </Tooltip>
    ),
    getCheckboxProps: (record) => ({
      disabled: !readonly && isPlaceholderItem(record),
    }),
  };

  const columns: ColumnsType<PurchaseReceiptItem> = [
    {
      title: '商品条码',
      dataIndex: 'barcode',
      width: 180,
      fixed: 'left',
      render: (value, record) =>
        readonly ? (
          value || '-'
        ) : (
          <AutoComplete
            value={value}
            style={{ width: '100%' }}
            placeholder="输入商品信息查询"
            popupClassName="purchase-inbound-autocomplete-popup"
            popupMatchSelectWidth={860}
            options={getBarcodeOptions(value ?? '')}
            onChange={(nextValue) => updateItem(record.id, { barcode: nextValue })}
            onSelect={(selectedBarcode) => {
              const matchedProduct = products.find((product) => product.barcode === selectedBarcode);
              if (matchedProduct) applyProductToItem(record.id, matchedProduct);
            }}
          />
        ),
    },
    { title: '商品编码', dataIndex: 'productCode', width: 120 },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '规格', dataIndex: 'spec', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '订货数量', dataIndex: 'orderQty', width: 100, render: (value?: number) => (value || value === 0 ? formatQty(value) : '-') },
    {
      title: '入库数量',
      dataIndex: 'actualQty',
      width: 110,
      render: (value, record) =>
        readonly ? (
          formatQty(value)
        ) : (
          <InputNumber
            min={0}
            precision={2}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { actualQty: Number(next ?? 0) })}
          />
        ),
    },
    {
      title: '赠品数量',
      dataIndex: 'giftQty',
      width: 110,
      render: (value, record) =>
        readonly ? (
          formatQty(value)
        ) : (
          <InputNumber
            min={0}
            precision={2}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { giftQty: Number(next ?? 0) })}
          />
        ),
    },
    {
      title: '差异数量',
      dataIndex: 'diffQty',
      width: 110,
      render: (value?: number) =>
        value || value === 0 ? <Tag color={value === 0 ? 'default' : value > 0 ? 'warning' : 'error'}>{formatQty(value)}</Tag> : '-',
    },
    {
      title: '进货价',
      dataIndex: 'purchasePrice',
      width: 110,
      render: (value, record) =>
        readonly ? (
          value.toFixed(4)
        ) : (
          <InputNumber
            min={0}
            precision={4}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { purchasePrice: Number(next ?? 0), taxIncludedPrice: Number(next ?? 0) })}
          />
        ),
    },
    {
      title: '未税价',
      dataIndex: 'taxExcludedPrice',
      width: 110,
      render: (value, record) =>
        readonly ? (
          value.toFixed(4)
        ) : (
          <InputNumber
            min={0}
            precision={4}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { taxExcludedPrice: Number(next ?? 0) })}
          />
        ),
    },
    {
      title: '含税价',
      dataIndex: 'taxIncludedPrice',
      width: 110,
      render: (value, record) =>
        readonly ? (
          value.toFixed(4)
        ) : (
          <InputNumber
            min={0}
            precision={4}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { taxIncludedPrice: Number(next ?? 0), purchasePrice: Number(next ?? 0) })}
          />
        ),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      width: 100,
      render: (value, record) =>
        readonly ? (
          `${(value * 100).toFixed(2)}%`
        ) : (
          <InputNumber
            min={0}
            max={1}
            precision={4}
            value={value}
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { taxRate: Number(next ?? 0) })}
          />
        ),
    },
    { title: '税额', dataIndex: 'taxAmount', width: 100, render: (value: number) => formatCurrency(value) },
    { title: '零售价', dataIndex: 'retailPrice', width: 100, render: (value: number) => formatCurrency(value) },
    { title: '配送价', dataIndex: 'deliveryPrice', width: 100, render: (value: number) => formatCurrency(value) },
    { title: '当前库存', dataIndex: 'currentStock', width: 100, render: (value: number) => formatQty(value) },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      width: 140,
      render: (value, record) =>
        readonly ? (
          value || '-'
        ) : (
          <Input
            value={value}
            disabled={!record.batchManaged}
            placeholder={record.batchManaged ? '请输入批次号' : '非批次商品'}
            onChange={(event) => updateItem(record.id, { batchNo: event.target.value })}
          />
        ),
    },
    {
      title: '生产日期',
      dataIndex: 'productionDate',
      width: 140,
      render: (value, record) =>
        readonly ? (
          value || '-'
        ) : (
          <DatePicker
            disabled={!record.batchManaged}
            value={value ? dayjs(value) : undefined}
            placeholder=""
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { productionDate: next ? next.format('YYYY-MM-DD') : undefined })}
          />
        ),
    },
    {
      title: '到期日期',
      dataIndex: 'expiryDate',
      width: 140,
      render: (value, record) =>
        readonly ? (
          value || '-'
        ) : (
          <DatePicker
            disabled={!record.batchManaged}
            value={value ? dayjs(value) : undefined}
            placeholder=""
            style={{ width: '100%' }}
            onChange={(next) => updateItem(record.id, { expiryDate: next ? next.format('YYYY-MM-DD') : undefined })}
          />
        ),
    },
    {
      title: '差异原因',
      dataIndex: 'diffReason',
      width: 180,
      render: (value, record) =>
        readonly ? value || '-' : <Input value={value} placeholder="可选填写" onChange={(event) => updateItem(record.id, { diffReason: event.target.value })} />,
    },
    {
      title: '来源',
      dataIndex: 'fromOrder',
      width: 120,
      render: (_, record) =>
        record.fromOrder ? (
          <Tooltip title={record.sourceOrderNo ? `来源原单：${record.sourceOrderNo}` : '来源原单'}>
            <Tag color="blue">原单带入</Tag>
          </Tooltip>
        ) : (
          <Tag>手工新增</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        readonly || isPlaceholderItem(record) ? null : <Button type="link" danger onClick={() => removeItem(record.id)}>删除</Button>,
    },
  ];

  return (
    <Table
      rowKey="id"
      rowSelection={readonly ? undefined : rowSelection}
      columns={columns}
      dataSource={items}
      pagination={false}
      scroll={{ x: 2590 }}
      locale={{ emptyText: '暂无商品明细，请扫码带入或选择商品' }}
    />
  );
}




