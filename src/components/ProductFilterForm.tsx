import { Button, Cascader, DatePicker, Form, Input, Select, Space } from 'antd';
import { Dayjs } from 'dayjs';
import { OptionItem, ProductFilters, ProductStatus } from '../types/product';

interface Props {
  brandOptions: OptionItem[];
  categoryOptions: OptionItem[];
  onSearch: (filters: ProductFilters) => void;
}

interface FormValues {
  name?: string;
  code?: string;
  category?: string[];
  brand?: string;
  status?: ProductStatus;
  created_at?: [Dayjs, Dayjs];
}

export default function ProductFilterForm({ brandOptions, categoryOptions, onSearch }: Props) {
  const [form] = Form.useForm<FormValues>();

  const handleSearch = () => {
    const values = form.getFieldsValue();
    onSearch({
      ...values,
      created_at: values.created_at
        ? [values.created_at[0].toISOString(), values.created_at[1].toISOString()]
        : undefined,
    });
  };

  return (
    <Form form={form} layout="inline">
      <Form.Item name="name" label="商品名称">
        <Input placeholder="请输入商品名称" allowClear />
      </Form.Item>
      <Form.Item name="code" label="商品编码">
        <Input placeholder="请输入商品编码" allowClear />
      </Form.Item>
      <Form.Item name="category" label="分类">
        <Cascader options={categoryOptions} placeholder="请选择分类" allowClear />
      </Form.Item>
      <Form.Item name="brand" label="品牌">
        <Select options={brandOptions} style={{ width: 180 }} placeholder="请选择品牌" allowClear />
      </Form.Item>
      <Form.Item name="status" label="状态">
        <Select
          style={{ width: 140 }}
          allowClear
          options={[
            { label: 'draft', value: 'draft' },
            { label: 'enabled', value: 'enabled' },
            { label: 'disabled', value: 'disabled' },
          ]}
        />
      </Form.Item>
      <Form.Item name="created_at" label="创建时间">
        <DatePicker.RangePicker />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          <Button
            onClick={() => {
              form.resetFields();
              onSearch({});
            }}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
