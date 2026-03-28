import dayjs from 'dayjs';
import { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { insertProduct, mutateProduct, productsDb, productMeta, resolveMetaLabel } from './db';
import { BarcodeItem, Product, ProductCreatePayload, ProductFilters, ProductImportResultRow, ProductStatus } from '../types/product';

const stateMachine: Record<ProductStatus, ProductStatus[]> = {
  draft: ['enabled'],
  enabled: ['disabled'],
  disabled: ['enabled'],
};

const parseParams = (url?: string): ProductFilters => {
  if (!url || !url.includes('?')) {
    return {};
  }
  const query = new URLSearchParams(url.split('?')[1]);
  const category = query.getAll('category');
  const createdStart = query.get('created_start') ?? undefined;
  const createdEnd = query.get('created_end') ?? undefined;
  return {
    name: query.get('name') ?? undefined,
    code: query.get('code') ?? undefined,
    brand: query.get('brand') ?? undefined,
    status: (query.get('status') as ProductStatus | null) ?? undefined,
    category: category.length ? category : undefined,
    created_at: createdStart && createdEnd ? [createdStart, createdEnd] : undefined,
  };
};

const containsFilter = (target: string, key?: string): boolean => {
  if (!key) {
    return true;
  }
  return target.toLowerCase().includes(key.toLowerCase());
};

const validateForEnable = (payload: ProductCreatePayload) => {
  if (!payload.name.trim()) {
    return '商品名称不能为空';
  }
  if (!payload.category || payload.category.length !== 3) {
    return '商品分类必须选择至第三级';
  }
  if (!payload.barcodes || payload.barcodes.length === 0) {
    return '至少需要一个条码';
  }
  if (!payload.main_unit) {
    return '主单位必填';
  }
  if (payload.sub_units && payload.sub_units.length > 0 && !payload.unit_conversion) {
    return '存在辅助单位时必须填写换算关系';
  }
  return '';
};

const hasExactlyOnePrimary = (barcodes: BarcodeItem[]): boolean =>
  barcodes.filter((item) => item.isPrimary).length === 1;

const normalizeProductInput = (payload: ProductCreatePayload): Product => {
  const now = dayjs().toISOString();
  return {
    id: `product-${Date.now()}`,
    code: payload.code.trim(),
    name: payload.name.trim(),
    category_id: payload.category[2],
    category_path: payload.category,
    category_name: resolveMetaLabel.categoryName(payload.category),
    brand_id: payload.brand_id,
    brand_name: resolveMetaLabel.brandName(payload.brand_id),
    main_unit: payload.main_unit,
    sub_units: payload.sub_units ?? [],
    unit_conversion: payload.unit_conversion,
    barcodes: payload.barcodes,
    status: payload.status,
    created_at: now,
    updated_at: now,
    in_use: false,
    unfinished_order_count: 0,
  };
};

const getAllBarcodes = (excludeProductId?: string): string[] =>
  productsDb
    .filter((product) => product.id !== excludeProductId)
    .flatMap((product) => product.barcodes.map((barcode) => barcode.code));

const barcodesUniqueInPayload = (barcodes: BarcodeItem[]): boolean => {
  const set = new Set(barcodes.map((item) => item.code.trim()));
  return set.size === barcodes.length;
};

export const setupProductMock = (adapter: AxiosInstance | MockAdapter) => {
  const mock = adapter instanceof MockAdapter ? adapter : new MockAdapter(adapter, { delayResponse: 400 });

  mock.onGet('/api/meta').reply(200, productMeta);

  mock.onGet(/\/api\/products.*/).reply((config) => {
    const params = parseParams(config.url);
    const filtered = productsDb.filter((item) => {
      const categoryMatched =
        !params.category || params.category.length === 0
          ? true
          : params.category.every((segment, index) => item.category_path[index] === segment);
      const createdMatched = params.created_at
        ? dayjs(item.created_at).isAfter(dayjs(params.created_at[0]).subtract(1, 'day')) &&
          dayjs(item.created_at).isBefore(dayjs(params.created_at[1]).add(1, 'day'))
        : true;
      return (
        containsFilter(item.name, params.name) &&
        containsFilter(item.code, params.code) &&
        (!params.brand || item.brand_id === params.brand) &&
        (!params.status || item.status === params.status) &&
        categoryMatched &&
        createdMatched
      );
    });
    return [200, { list: filtered, total: filtered.length }];
  });

  mock.onPost('/api/products').reply((config) => {
    const payload = JSON.parse(config.data) as ProductCreatePayload;
    if (!payload.code?.trim()) {
      return [400, { message: '商品编码不能为空' }];
    }
    if (!payload.name?.trim()) {
      return [400, { message: '商品名称不能为空' }];
    }
    if (!payload.category || payload.category.length !== 3) {
      return [400, { message: '分类必须选择至三级' }];
    }
    if (!payload.main_unit) {
      return [400, { message: '主单位必填' }];
    }
    if (!payload.barcodes || payload.barcodes.length === 0) {
      return [400, { message: '至少存在1个条码' }];
    }
    if (!hasExactlyOnePrimary(payload.barcodes)) {
      return [400, { message: '必须有且仅有1个主条码' }];
    }
    if (!barcodesUniqueInPayload(payload.barcodes)) {
      return [400, { message: '条码列表中存在重复值' }];
    }
    if (payload.sub_units && payload.sub_units.length > 0 && !payload.unit_conversion) {
      return [400, { message: '存在辅助单位时必须填写单位换算' }];
    }
    const sameCode = productsDb.find((item) => item.code === payload.code.trim());
    if (sameCode) {
      return [409, { message: '商品编码已存在' }];
    }
    const usedBarcodeSet = new Set(getAllBarcodes());
    const conflictBarcode = payload.barcodes.find((item) => usedBarcodeSet.has(item.code.trim()));
    if (conflictBarcode) {
      return [409, { message: `条码已存在：${conflictBarcode.code}` }];
    }
    if (payload.status === 'enabled') {
      const err = validateForEnable(payload);
      if (err) {
        return [400, { message: err }];
      }
    }
    const product = normalizeProductInput(payload);
    insertProduct(product);
    return [200, product];
  });

  mock.onPost(/\/api\/products\/[^/]+\/enable/).reply((config) => {
    const id = config.url?.split('/')[3] ?? '';
    const current = productsDb.find((item) => item.id === id);
    if (!current) {
      return [404, { message: '商品不存在' }];
    }
    if (!stateMachine[current.status].includes('enabled')) {
      return [409, { message: `状态${current.status}不可流转到enabled` }];
    }
    const enableCheck = validateForEnable({
      name: current.name,
      code: current.code,
      category: current.category_path,
      brand_id: current.brand_id,
      main_unit: current.main_unit,
      sub_units: current.sub_units,
      unit_conversion: current.unit_conversion,
      barcodes: current.barcodes,
      status: 'enabled',
    });
    if (enableCheck) {
      return [400, { message: enableCheck }];
    }
    const updated = mutateProduct(id, (item) => ({ ...item, status: 'enabled', updated_at: dayjs().toISOString() }));
    return [200, updated];
  });

  mock.onPost(/\/api\/products\/[^/]+\/disable/).reply((config) => {
    const id = config.url?.split('/')[3] ?? '';
    const current = productsDb.find((item) => item.id === id);
    if (!current) {
      return [404, { message: '商品不存在' }];
    }
    if (current.unfinished_order_count && current.unfinished_order_count > 0) {
      return [400, { message: '存在未完成订单，禁止停用' }];
    }
    if (!stateMachine[current.status].includes('disabled')) {
      return [409, { message: `状态${current.status}不可流转到disabled` }];
    }
    const updated = mutateProduct(id, (item) => ({ ...item, status: 'disabled', updated_at: dayjs().toISOString() }));
    return [200, updated];
  });

  mock.onPost('/api/products/import').reply(() => {
    const rows: ProductImportResultRow[] = [
      { row: 2, code: 'P20001', name: '导入商品A', success: true, message: '导入成功，状态=草稿' },
      { row: 3, code: 'P10001', name: '导入商品B', success: false, message: '商品编码重复' },
      { row: 4, code: 'P20003', name: '导入商品C', success: false, message: '条码已存在：6901111111111' },
      { row: 5, code: 'P20004', name: '导入商品D', success: true, message: '导入成功，状态=草稿' },
    ];
    const successCount = rows.filter((item) => item.success).length;
    return [
      200,
      {
        success_count: successCount,
        failed_count: rows.length - successCount,
        details: rows,
      },
    ];
  });
};
