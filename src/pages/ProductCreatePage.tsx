import { useEffect, useState } from 'react';
import { Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import { productService } from '../services/product';
import { ProductCreatePayload, ProductMeta } from '../types/product';

const emptyMeta: ProductMeta = { brands: [], categories: [], units: [] };

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<ProductMeta>(emptyMeta);
  const [loading, setLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    productService
      .getMeta()
      .then((res) => setMeta(res))
      .catch((error) => msgApi.error((error as Error).message));
  }, [msgApi]);

  const submit = async (payload: ProductCreatePayload) => {
    try {
      setLoading(true);
      await productService.create(payload);
      msgApi.success(payload.status === 'draft' ? '草稿保存成功' : '启用成功');
      navigate('/products');
    } catch (error) {
      msgApi.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="创建商品">
      {contextHolder}
      <ProductForm
        brandOptions={meta.brands}
        categoryOptions={meta.categories}
        unitOptions={meta.units}
        loading={loading}
        onSubmit={async (payload) => submit(payload)}
        onSaveDraft={async (payload) => submit(payload)}
      />
    </Card>
  );
}
