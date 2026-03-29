import { Badge, Card, List, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { AuditNode, ReceiptVersionFlags } from '../../types/purchaseReceipt';

interface Props {
  nodes: AuditNode[];
  flags: ReceiptVersionFlags;
}

const resultMap = {
  pending: { color: 'processing', text: '待处理' },
  approved: { color: 'success', text: '已通过' },
  rejected: { color: 'error', text: '已驳回' },
};

export default function AuditTimeline({ nodes, flags }: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card size="small" title="审核流程">
        <List
          dataSource={nodes}
          renderItem={(node) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <Badge status={node.result === 'approved' ? 'success' : node.result === 'rejected' ? 'error' : 'processing'} />
                  <Typography.Text strong>{node.nodeName}</Typography.Text>
                  <Tag color={resultMap[node.result].color}>{resultMap[node.result].text}</Tag>
                </Space>
                <Typography.Text type="secondary">审核人：{node.auditor}</Typography.Text>
                <Typography.Text type="secondary">
                  审核日期：{node.auditTime ? dayjs(node.auditTime).format('YYYY-MM-DD HH:mm:ss') : '待审核'}
                </Typography.Text>
                <Typography.Text>{node.remark || '暂无审核意见'}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
      <Card size="small" title="联动状态">
        <Space wrap size={[8, 8]}>
          <Tag color={flags.inventorySyncStatus === 'success' ? 'success' : flags.inventorySyncStatus === 'failed' ? 'error' : 'default'}>库存联动：{flags.inventorySyncStatus}</Tag>
          <Tag color={flags.financeSyncStatus === 'success' ? 'success' : flags.financeSyncStatus === 'failed' ? 'error' : 'default'}>财务推送：{flags.financeSyncStatus}</Tag>
          <Tag color={flags.messageSyncStatus === 'success' ? 'success' : flags.messageSyncStatus === 'failed' ? 'error' : 'default'}>消息通知：{flags.messageSyncStatus}</Tag>
        </Space>
      </Card>
    </Space>
  );
}
