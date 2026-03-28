import dayjs from 'dayjs';
import { Product, ProductMeta, ProductStatus } from '../types/product';

const now = dayjs();

export const productMeta: ProductMeta = {
  brands: [
    { label: '华润', value: 'brand-cr' },
    { label: '三只松鼠', value: 'brand-szss' },
    { label: '元气森林', value: 'brand-yqsl' },
    { label: '农夫山泉', value: 'brand-nfsq' },
  ],
  categories: [
    {
      label: '食品',
      value: 'cat-food',
      children: [
        {
          label: '休闲零食',
          value: 'cat-snack',
          children: [
            { label: '坚果', value: 'cat-nut' },
            { label: '饼干', value: 'cat-biscuit' },
          ],
        },
      ],
    },
    {
      label: '饮料',
      value: 'cat-drink',
      children: [
        {
          label: '无糖饮料',
          value: 'cat-nosugar',
          children: [{ label: '气泡水', value: 'cat-sparkling' }],
        },
      ],
    },
    {
      label: '日化',
      value: 'cat-daily',
      children: [
        {
          label: '洗护',
          value: 'cat-care',
          children: [{ label: '洗发水', value: 'cat-shampoo' }],
        },
      ],
    },
  ],
  units: [
    { label: '件', value: 'piece' },
    { label: '箱', value: 'box' },
    { label: '瓶', value: 'bottle' },
    { label: '袋', value: 'bag' },
  ],
};

const resolveCategoryName = (path: string[]): string => {
  const labels: string[] = [];
  let current = productMeta.categories;
  path.forEach((id) => {
    const found = current.find((item) => item.value === id);
    if (found) {
      labels.push(found.label);
      current = found.children ?? [];
    }
  });
  return labels.join(' / ');
};

const resolveBrandName = (brandId?: string): string => {
  if (!brandId) {
    return '';
  }
  return productMeta.brands.find((item) => item.value === brandId)?.label ?? '';
};

const buildProduct = (
  seed: number,
  name: string,
  code: string,
  category_path: string[],
  brand_id: string | undefined,
  status: ProductStatus,
  mainUnit: string,
  subUnits: string[],
  barcodes: string[],
  inUse = false,
  unfinishedOrderCount = 0,
): Product => ({
  id: `product-${seed}`,
  code,
  name,
  category_id: category_path[2],
  category_path,
  category_name: resolveCategoryName(category_path),
  brand_id,
  brand_name: resolveBrandName(brand_id),
  main_unit: mainUnit,
  sub_units: subUnits,
  unit_conversion: subUnits.length ? { [subUnits[0]]: 12 } : undefined,
  barcodes: barcodes.map((item, index) => ({ code: item, isPrimary: index === 0 })),
  status,
  created_at: now.subtract(20 - seed, 'day').toISOString(),
  updated_at: now.subtract(5 - (seed % 4), 'hour').toISOString(),
  in_use: inUse,
  unfinished_order_count: unfinishedOrderCount,
});

export let productsDb: Product[] = [
  buildProduct(
    1,
    '每日坚果礼盒',
    'P10001',
    ['cat-food', 'cat-snack', 'cat-nut'],
    'brand-szss',
    'enabled',
    'box',
    ['piece'],
    ['6901111111111', '6901111111112'],
    true,
    1,
  ),
  buildProduct(
    2,
    '苏打气泡水',
    'P10002',
    ['cat-drink', 'cat-nosugar', 'cat-sparkling'],
    'brand-yqsl',
    'disabled',
    'bottle',
    [],
    ['6902222222222'],
    false,
    0,
  ),
  buildProduct(
    3,
    '修护洗发露',
    'P10003',
    ['cat-daily', 'cat-care', 'cat-shampoo'],
    'brand-cr',
    'draft',
    'piece',
    [],
    ['6903333333333'],
    false,
    0,
  ),
];

export const mutateProduct = (id: string, updater: (current: Product) => Product): Product | null => {
  const index = productsDb.findIndex((item) => item.id === id);
  if (index < 0) {
    return null;
  }
  const next = updater(productsDb[index]);
  productsDb[index] = next;
  return next;
};

export const insertProduct = (product: Product) => {
  productsDb = [product, ...productsDb];
};

export const resolveMetaLabel = {
  categoryName: resolveCategoryName,
  brandName: resolveBrandName,
};
