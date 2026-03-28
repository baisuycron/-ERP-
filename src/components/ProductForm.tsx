import { Button, Cascader, Form, Input, Select, Space, Switch, Typography } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { OptionItem, ProductCreatePayload } from '../types/product';

interface Props {
  brandOptions: OptionItem[];
  categoryOptions: OptionItem[];
  unitOptions: OptionItem[];
  loading: boolean;
  onSubmit: (payload: ProductCreatePayload) => Promise<void>;
  onSaveDraft: (payload: ProductCreatePayload) => Promise<void>;
}

interface FormValues {
  name: string;
  code: string;
  category: string[];
  brand_id?: string;
  main_unit: string;
  sub_units?: string[];
  unit_conversion?: string;
  barcodes: { code: string; isPrimary: boolean }[];
}

const parseUnitConversion = (input?: string): Record<string, number> | undefined => {
  if (!input?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      throw new Error('invalid');
    }
    return parsed as Record<string, number>;
  } catch {
    return undefined;
  }
};

export default function ProductForm({ brandOptions, categoryOptions, unitOptions, loading, onSubmit, onSaveDraft }: Props) {
  const [form] = Form.useForm<FormValues>();

  const buildPayload = (values: FormValues, status: ProductCreatePayload['status']): ProductCreatePayload => ({
    name: values.name.trim(),
    code: values.code.trim(),
    category: values.category,
    brand_id: values.brand_id,
    main_unit: values.main_unit,
    sub_units: values.sub_units ?? [],
    unit_conversion: parseUnitConversion(values.unit_conversion),
    barcodes: (values.barcodes ?? []).map((item) => ({ code: item.code.trim(), isPrimary: !!item.isPrimary })),
    status,
  });

  const validateBarcodeRules = async (_: unknown, value: { code: string; isPrimary: boolean }[] = []) => {
    if (!value || value.length === 0) {
      throw new Error('至少一个条码');
    }
    const codes = value.map((item) => item.code?.trim()).filter(Boolean);
    if (codes.length !== value.length) {
      throw new Error('条码不能为空');
    }
    const unique = new Set(codes);
    if (unique.size !== codes.length) {
      throw new Error('条码不能重复');
    }
    const primaryCount = value.filter((item) => item.isPrimary).length;
    if (primaryCount !== 1) {
      throw new Error('必须有且仅有1个主条码');
    }
  };

  const validateCategory = async (_: unknown, value?: string[]) => {
    if (!value || value.length !== 3) {
      throw new Error('必须选择三级分类');
    }
  };

  const validateUnitConversion = async () => {
    const subUnits = form.getFieldValue('sub_units') as string[] | undefined;
    const conversionRaw = form.getFieldValue('unit_conversion') as string | undefined;
    if (subUnits && subUnits.length > 0) {
      if (!conversionRaw?.trim()) {
        throw new Error('存在辅助单位时必须填写单位换算');
      }
      if (!parseUnitConversion(conversionRaw)) {
        throw new Error('单位换算必须为合法JSON，例如 {"box":12}');
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        barcodes: [{ code: '', isPrimary: true }],
      }}
    >
      <Typography.Title level={5}>基础信息</Typography.Title>
      <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '商品名称必填' }]}>
        <Input maxLength={60} placeholder="请输入商品名称" />
      </Form.Item>
      <Form.Item name="code" label="商品编码" rules={[{ required: true, message: '商品编码必填' }]}>
        <Input maxLength={30} placeholder="请输入商品编码，支持手动输入" />
      </Form.Item>
      <Form.Item name="category" label="商品分类" rules={[{ validator: validateCategory }]}>
        <Cascader options={categoryOptions} placeholder="请选择三级分类" />
      </Form.Item>
      <Form.Item name="brand_id" label="品牌">
        <Select options={brandOptions} allowClear placeholder="请选择品牌" />
      </Form.Item>

      <Typography.Title level={5}>单位信息</Typography.Title>
      <Form.Item name="main_unit" label="主单位" rules={[{ required: true, message: '主单位必填' }]}>
        <Select options={unitOptions} placeholder="请选择主单位" />
      </Form.Item>
      <Form.Item name="sub_units" label="辅助单位">
        <Select options={unitOptions} mode="multiple" allowClear placeholder="可多选辅助单位" />
      </Form.Item>
      <Form.Item
        name="unit_conversion"
        label="单位换算(JSON)"
        rules={[{ validator: validateUnitConversion }]}
        extra='示例：{"box":12,"bag":6}'
      >
        <Input.TextArea placeholder='请输入JSON格式单位换算，如 {"box":12}' autoSize={{ minRows: 2, maxRows: 4 }} />
      </Form.Item>

      <Typography.Title level={5}>条码信息</Typography.Title>
      <Form.Item name="barcodes" rules={[{ validator: validateBarcodeRules }]}>
        <Form.List name="barcodes">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'code']}
                    rules={[{ required: true, message: '条码必填' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input style={{ width: 320 }} placeholder="请输入条码" />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'isPrimary']} valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch checkedChildren="主条码" unCheckedChildren="普通条码" />
                  </Form.Item>
                  {fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(field.name)} /> : null}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ code: '', isPrimary: false })} icon={<PlusOutlined />}>
                添加条码
              </Button>
            </>
          )}
        </Form.List>
      </Form.Item>

      <Space>
        <Button
          loading={loading}
          onClick={async () => {
            const values = await form.validateFields();
            await onSaveDraft(buildPayload(values, 'draft'));
          }}
        >
          保存草稿
        </Button>
        <Button
          type="primary"
          loading={loading}
          onClick={async () => {
            const values = await form.validateFields();
            await onSubmit(buildPayload(values, 'enabled'));
          }}
        >
          启用商品
        </Button>
        <Button onClick={() => form.resetFields()}>取消</Button>
      </Space>
    </Form>
  );
}
