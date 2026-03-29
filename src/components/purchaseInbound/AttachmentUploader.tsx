import type { ReactNode } from 'react';
import { Button, Select, Space, Table, Tag, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UploadOutlined } from '@ant-design/icons';
import { AttachmentItem } from '../../types/purchaseReceipt';

interface Props {
  value: AttachmentItem[];
  onChange: (value: AttachmentItem[]) => void;
  readonly?: boolean;
  uploadButton?: ReactNode;
}

interface UploadButtonProps {
  value: AttachmentItem[];
  onChange: (value: AttachmentItem[]) => void;
  readonly?: boolean;
}

const categoryOptions: AttachmentItem['category'][] = ['送货单', '签收单', '质检单', '图片', '其他'];

export function AttachmentUploadButton({ value, onChange, readonly }: UploadButtonProps) {
  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload(file) {
      const failed = file.name.toLowerCase().includes('fail');
      const next: AttachmentItem = {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        category: '送货单',
        status: failed ? 'error' : 'done',
        url: '#',
      };
      onChange([next, ...value]);
      if (failed) message.error('附件上传失败，请点击删除后重新上传。');
      return false;
    },
  };

  if (readonly) return null;

  return (
    <Upload {...uploadProps}>
      <Button icon={<UploadOutlined />}>上传附件</Button>
    </Upload>
  );
}

export default function AttachmentUploader({ value, onChange, readonly, uploadButton }: Props) {
  const columns: ColumnsType<AttachmentItem> = [
    { title: '文件名', dataIndex: 'name' },
    {
      title: '分类',
      dataIndex: 'category',
      width: 140,
      render: (category: AttachmentItem['category'], record) =>
        readonly ? (
          category
        ) : (
          <Select
            value={category}
            style={{ width: '100%' }}
            options={categoryOptions.map((item) => ({ label: item, value: item }))}
            onChange={(next) =>
              onChange(value.map((file) => (file.uid === record.uid ? { ...file, category: next } : file)))
            }
          />
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: AttachmentItem['status']) =>
        status === 'done' ? <Tag color="success">上传成功</Tag> : <Tag color="error">上传失败</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) =>
        readonly ? (
          <a href={record.url || '#'} onClick={(event) => event.preventDefault()}>
            预览
          </a>
        ) : (
          <Space size={8}>
            <a href={record.url || '#'} onClick={(event) => event.preventDefault()}>
              预览
            </a>
            <Button type="link" danger onClick={() => onChange(value.filter((file) => file.uid !== record.uid))}>
              删除
            </Button>
          </Space>
        ),
    },
  ];

  const tableNode = (
    <Table
      rowKey="uid"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={value}
      locale={{ emptyText: '暂无附件，可上传送货单、签收单、质检单或图片。' }}
    />
  );

  if (!uploadButton) {
    return tableNode;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {uploadButton}
      {tableNode}
    </Space>
  );
}
