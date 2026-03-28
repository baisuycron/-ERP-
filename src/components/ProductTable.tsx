import { Button, Space, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Product } from '../types/product';

interface Props {
  loading: boolean;
  dataSource: Product[];
  onEnable: (record: Product) => void;
  onDisable: (record: Product) => void;
  onExport: (record: Product) => void;
}

const statusColorMap = {
  draft: 'default',
  enabled: 'green',
  disabled: 'red',
} as const;

export default function ProductTable({ loading, dataSource, onEnable, onDisable, onExport }: Props) {
  return (
    <Table
      loading={loading}
      rowKey="id"
      dataSource={dataSource}
      pagination={{ pageSize: 10 }}
      columns={[
        { title: '商品编码', dataIndex: 'code' },
        { title: '商品名称', dataIndex: 'name' },
        { title: '分类', dataIndex: 'category_name' },
        { title: '品牌', dataIndex: 'brand_name' },
        { title: '主单位', dataIndex: 'main_unit' },
        {
          title: '状态',
          dataIndex: 'status',
          render: (status: Product['status']) => <Tag color={statusColorMap[status]}>{status}</Tag>,
        },
        {
          title: '更新时间',
          dataIndex: 'updated_at',
          render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
        },
        {
          title: '操作',
          key: 'actions',
          render: (_: unknown, record: Product) => {
            const canEnable = ['draft', 'disabled'].includes(record.status);
            const canDisable = record.status === 'enabled';
            return (
              <Space>
                <Button size="small" onClick={() => window.alert(`查看商品：${record.name}`)}>
                  查看
                </Button>
                <Tooltip title={record.in_use ? '商品已被库存/订单引用，关键字段不可改' : ''}>
                  <Button size="small" disabled={!!record.in_use}>
                    编辑
                  </Button>
                </Tooltip>
                <Button size="small" disabled={!canEnable} onClick={() => onEnable(record)}>
                  启用
                </Button>
                <Button size="small" disabled={!canDisable} danger onClick={() => onDisable(record)}>
                  停用
                </Button>
                <Button size="small" onClick={() => onExport(record)}>
                  导出
                </Button>
              </Space>
            );
          },
        },
      ]}
    />
  );
}
