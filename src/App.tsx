import { Layout, Menu, Typography } from 'antd';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProductListPage from './pages/ProductListPage';
import ProductCreatePage from './pages/ProductCreatePage';
import ProductImportPage from './pages/ProductImportPage';

const { Header, Content } = Layout;

const menuItems = [
  { key: '/products', label: <Link to="/products">商品列表</Link> },
  { key: '/products/create', label: <Link to="/products/create">创建商品</Link> },
  { key: '/products/import', label: <Link to="/products/import">商品导入</Link> },
];

export default function App() {
  const location = useLocation();
  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ?? '/products';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          New Retail ERP / Product Management
        </Typography.Title>
        <Menu theme="dark" mode="horizontal" selectedKeys={[selectedKey]} items={menuItems} />
      </Header>
      <Content style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/create" element={<ProductCreatePage />} />
          <Route path="/products/import" element={<ProductImportPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}
