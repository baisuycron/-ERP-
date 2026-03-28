import { Button, Card, Cascader, Col, DatePicker, Form, Input, Row, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/product';
import { OptionItem, Product, ProductFilters, ProductMeta, ProductStatus } from '../types/product';
import { exportCsv } from '../utils/export';

const emptyMeta: ProductMeta = { brands: [], categories: [], units: [] };

const statusColorMap: Record<ProductStatus, string> = {
  draft: 'default',
  enabled: 'green',
  disabled: 'red',
};

const statusLabelMap: Record<ProductStatus, string> = {
  draft: '草稿',
  enabled: '已启用',
  disabled: '已停用',
};

interface FormValues {
  name?: string;
  code?: string;
  category?: string[];
  brand?: string;
  status?: ProductStatus;
  created_at?: [Dayjs, Dayjs];
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ProductMeta>(emptyMeta);
  const [msgApi, contextHolder] = message.useMessage();

  const fetchData = async (nextFilters: ProductFilters = filters) => {
    try {
      setLoading(true);
      const [metaRes, listRes] = await Promise.all([productService.getMeta(), productService.getList(nextFilters)]);
      setMeta(metaRes);
      setProducts(listRes.list);
    } catch (error) {
      msgApi.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = products.length;
  const draftCount = products.filter((item) => item.status === 'draft').length;
  const enabledCount = products.filter((item) => item.status === 'enabled').length;
  const disabledCount = products.filter((item) => item.status === 'disabled').length;

  const handleSearch = () => {
    const values = form.getFieldsValue();
    const nextFilters: ProductFilters = {
      ...values,
      created_at: values.created_at ? [values.created_at[0].toISOString(), values.created_at[1].toISOString()] : undefined,
    };
    setFilters(nextFilters);
    fetchData(nextFilters);
  };

  const handleReset = () => {
    form.resetFields();
    setFilters({});
    fetchData({});
  };

  const handleExportAll = () => {
    exportCsv(products, 'products-all');
  };

  const columns = useMemo<ColumnsType<Product>>(
    () => [
      { title: '商品编码', dataIndex: 'code', width: 140 },
      { title: '商品名称', dataIndex: 'name', width: 160 },
      { title: '分类', dataIndex: 'category_name', width: 260 },
      { title: '品牌', dataIndex: 'brand_name', width: 120, render: (value?: string) => value || '-' },
      { title: '主单位', dataIndex: 'main_unit', width: 110 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (status: ProductStatus) => <Tag color={statusColorMap[status]}>{statusLabelMap[status]}</Tag>,
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 180,
        render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 280,
        render: (_: unknown, record) => {
          const canEnable = ['draft', 'disabled'].includes(record.status);
          const canDisable = record.status === 'enabled';
          return (
            <Space size={4} wrap>
              <Button type="link" size="small" onClick={() => window.alert(`查看商品：${record.name}`)}>
                查看
              </Button>
              <Tooltip title={record.in_use ? '商品已被库存/订单引用，关键字段不可修改' : ''}>
                <Button type="link" size="small" disabled={!!record.in_use}>
                  编辑
                </Button>
              </Tooltip>
              <Button type="link" size="small" disabled={!canEnable} onClick={() => productService.enable(record.id).then(() => {
                msgApi.success('启用成功');
                fetchData();
              }).catch((error: Error) => msgApi.error(error.message))}>
                启用
              </Button>
              <Button type="link" size="small" danger disabled={!canDisable} onClick={() => productService.disable(record.id).then(() => {
                msgApi.success('停用成功');
                fetchData();
              }).catch((error: Error) => msgApi.error(error.message))}>
                停用
              </Button>
              <Button type="link" size="small" onClick={() => exportCsv([record], `product-${record.code}`)}>
                导出
              </Button>
            </Space>
          );
        },
      },
    ],
    [msgApi],
  );

  return (
    <div className="erp-list-page">
      {contextHolder}
      <div className="erp-list-hero">
        <div>
          <Typography.Title level={2} className="erp-list-title">
            商品列表
          </Typography.Title>
          <Typography.Paragraph className="erp-list-subtitle">
            商品筛选、状态管理、导出与查看统一在当前页面完成。
          </Typography.Paragraph>
        </div>
        <Space size={12} wrap>
          <Button className="erp-list-hero-button" type="primary" onClick={() => navigate('/products/create')}>
            创建商品
          </Button>
          <Button className="erp-list-hero-button" onClick={handleExportAll}>
            按筛选导出
          </Button>
        </Space>
      </div>

      <Card className="erp-filter-card" bordered={false}>
        <Form form={form} layout="vertical">
          <Row gutter={[20, 0]}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="商品名称" name="name">
                <Input allowClear placeholder="请输入商品名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="商品编码" name="code">
                <Input allowClear placeholder="请输入商品编码" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="分类" name="category">
                <Cascader options={meta.categories as OptionItem[]} placeholder="请选择分类" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="品牌" name="brand">
                <Select options={meta.brands} placeholder="请选择品牌" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="状态" name="status">
                <Select
                  allowClear
                  placeholder="请选择状态"
                  options={[
                    { label: '草稿', value: 'draft' },
                    { label: '已启用', value: 'enabled' },
                    { label: '已停用', value: 'disabled' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="创建时间" name="created_at">
                <DatePicker.RangePicker style={{ width: '100%' }} />
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
            <span className="erp-data-tab is-active">全部（{total}）</span>
            <span className="erp-data-tab">草稿（{draftCount}）</span>
            <span className="erp-data-tab">已启用（{enabledCount}）</span>
            <span className="erp-data-tab">已停用（{disabledCount}）</span>
          </div>
          <Typography.Text type="secondary">共 {total} 条商品记录</Typography.Text>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={products}
          scroll={{ x: 1500 }}
          pagination={{ current: 1, pageSize: 10, total, showSizeChanger: false, showTotal: (value) => `共 ${value} 条` }}
        />
      </Card>
    </div>
  );
}
