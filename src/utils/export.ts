import dayjs from 'dayjs';
import { Product } from '../types/product';

const headers = ['商品编码', '商品名称', '分类', '品牌', '主单位', '状态', '更新时间'];

export const exportCsv = (rows: Product[], fileName: string) => {
  const content = [
    headers.join(','),
    ...rows.map((item) =>
      [
        item.code,
        item.name,
        item.category_name,
        item.brand_name ?? '',
        item.main_unit,
        item.status,
        dayjs(item.updated_at).format('YYYY-MM-DD HH:mm:ss'),
      ].join(','),
    ),
  ].join('\n');

  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};
