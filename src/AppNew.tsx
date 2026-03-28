import {
  AppstoreOutlined,
  BellOutlined,
  CloseOutlined,
  HomeOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Input, Layout, Menu, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ProductCreatePage from './pages/ProductCreatePage';
import ProductImportPage from './pages/ProductImportPage';
import ProductListPage from './pages/ProductListPage';
import PurchaseInboundFormPage from './pages/PurchaseInboundFormPage';
import PurchaseInboundListPage from './pages/PurchaseInboundListPage';

const { Sider, Content } = Layout;

const menuItems = [
  {
    key: 'purchase',
    icon: <InboxOutlined />,
    label: '采购管理',
    children: [{ key: '/purchase/inbounds', label: <Link to="/purchase/inbounds">采购入库单</Link> }],
  },
  {
    key: 'product',
    icon: <ShoppingOutlined />,
    label: '商品中心',
    children: [
      { key: '/products', label: <Link to="/products">商品列表</Link> },
      { key: '/products/create', label: <Link to="/products/create">创建商品</Link> },
      { key: '/products/import', label: <Link to="/products/import">商品导入</Link> },
    ],
  },
];

const buildTabFromPath = (pathname: string) => {
  if (pathname.startsWith('/purchase')) {
    return { key: 'purchase', label: '采购入库', path: '/purchase/inbounds' };
  }
  if (pathname.startsWith('/products')) {
    return { key: 'product', label: '商品', path: '/products' };
  }
  return null;
};

export default function AppNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey =
    ['/purchase/inbounds', '/products', '/products/create', '/products/import'].find((item) =>
      location.pathname.startsWith(item),
    ) ?? '/purchase/inbounds';
  const [openTabs, setOpenTabs] = useState<Array<{ key: string; label: string; path: string }>>([]);
  const [topbarElevated, setTopbarElevated] = useState(false);
  const isPurchaseInboundFormRoute =
    location.pathname === '/purchase/inbounds/create' || /^\/purchase\/inbounds\/[^/]+\/[^/]+$/.test(location.pathname);

  const activeTabKey = useMemo(() => buildTabFromPath(location.pathname)?.key, [location.pathname]);

  useEffect(() => {
    const nextTab = buildTabFromPath(location.pathname);
    if (!nextTab) return;
    setOpenTabs((current) => (current.some((item) => item.key === nextTab.key) ? current : [...current, nextTab]));
  }, [location.pathname]);

  const handleCloseTab = (tabKey: string) => {
    setOpenTabs((current) => {
      const nextTabs = current.filter((item) => item.key !== tabKey);
      if (activeTabKey === tabKey) {
        if (nextTabs.length > 0) {
          navigate(nextTabs[nextTabs.length - 1].path);
        } else {
          navigate('/');
        }
      }
      return nextTabs;
    });
  };

  return (
    <Layout className="erp-shell">
      <Sider width={236} theme="dark" className="erp-sider">
        <div className="erp-brand">
          <AppstoreOutlined />
          <div>
            <Typography.Text className="erp-brand-title">新零售 ERP</Typography.Text>
            <Typography.Text className="erp-brand-subtitle">采购与商品后台</Typography.Text>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['purchase', 'product']}
          items={menuItems}
        />
      </Sider>
      <Content
        className={`erp-content${isPurchaseInboundFormRoute ? ' is-detail-mode' : ''}`}
        onScroll={(event) => {
          if (isPurchaseInboundFormRoute) return;
          const nextElevated = event.currentTarget.scrollTop > 6;
          setTopbarElevated((current) => (current === nextElevated ? current : nextElevated));
        }}
      >
        <div className={`erp-topbar${topbarElevated ? ' is-elevated' : ''}`}>
          <div className="erp-topbar-left">
            <div className="erp-home-entry">
              <HomeOutlined />
              <span>首页</span>
            </div>
            <div className="erp-route-tabs">
              {openTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`erp-route-tab${tab.key === activeTabKey ? ' is-active' : ''}`}
                  onClick={() => navigate(tab.path)}
                >
                  <span>{tab.label}</span>
                  <span
                    className="erp-route-tab-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCloseTab(tab.key);
                    }}
                  >
                    <CloseOutlined />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="erp-topbar-right">
            <Input className="erp-global-search" placeholder="菜单搜索，快捷键 /" prefix={<SearchOutlined />} />
            <Badge count={2} size="small">
              <button type="button" className="erp-topbar-icon" aria-label="提醒">
                <BellOutlined />
              </button>
            </Badge>
            <button type="button" className="erp-topbar-icon" aria-label="帮助">
              <QuestionCircleOutlined />
            </button>
            <span className="erp-user-avatar" aria-label="用户头像">
              <UserOutlined />
            </span>
          </div>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/purchase/inbounds" replace />} />
          <Route path="/purchase/inbounds" element={<PurchaseInboundListPage />} />
          <Route path="/purchase/inbounds/create" element={<PurchaseInboundFormPage />} />
          <Route path="/purchase/inbounds/:id/:mode" element={<PurchaseInboundFormPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/create" element={<ProductCreatePage />} />
          <Route path="/products/import" element={<ProductImportPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}
