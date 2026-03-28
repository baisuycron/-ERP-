import { Table, Tag } from 'antd';
import { ProductImportResultRow } from '../types/product';

interface Props {
  dataSource: ProductImportResultRow[];
}

export default function ImportResultTable({ dataSource }: Props) {
  return (
    <Table
      rowKey={(record) => `${record.row}-${record.code}`}
      dataSource={dataSource}
      pagination={false}
      columns={[
        { title: '行号', dataIndex: 'row', width: 80 },
        { title: '商品编码', dataIndex: 'code' },
        { title: '商品名称', dataIndex: 'name' },
        {
          title: '结果',
          dataIndex: 'success',
          render: (success: boolean) => (success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>),
        },
        { title: '反馈信息', dataIndex: 'message' },
      ]}
    />
  );
}
