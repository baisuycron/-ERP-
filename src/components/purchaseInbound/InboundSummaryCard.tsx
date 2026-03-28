import { Card, Space, Typography } from 'antd';
import { PurchaseReceiptItem } from '../../types/purchaseReceipt';
import { formatCurrency, formatQty, summarizeReceiptItems } from '../../utils/purchaseInbound';

interface Props {
  items: PurchaseReceiptItem[];
}

export default function InboundSummaryCard({ items }: Props) {
  const summary = summarizeReceiptItems(items);

  const stats = [
    { label: '商品种数', value: summary.productCount },
    { label: '明细行数', value: summary.itemCount },
    { label: '入库总数量', value: formatQty(summary.totalQty) },
    { label: '赠品总数量', value: formatQty(summary.giftTotalQty) },
    { label: '单据总金额', value: formatCurrency(summary.totalAmount) },
  ];

  return (
    <Card size="small" title="汇总信息" className="purchase-inbound-summary-card">
      <Space size={24} wrap className="purchase-inbound-summary-row">
        {stats.map((stat) => (
          <div key={stat.label} className="purchase-inbound-summary-item">
            <Typography.Text type="secondary">{stat.label}：</Typography.Text>
            <Typography.Text strong>{stat.value}</Typography.Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}
