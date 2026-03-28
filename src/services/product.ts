import dayjs from 'dayjs';
import { client as http } from './client';
import { Product, ProductCreatePayload, ProductFilters, ProductImportResponse, ProductListResponse, ProductMeta } from '../types/product';

const toQueryString = (filters: ProductFilters): string => {
  const params = new URLSearchParams();
  if (filters.name) params.set('name', filters.name);
  if (filters.code) params.set('code', filters.code);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.status) params.set('status', filters.status);
  if (filters.category && filters.category.length) {
    filters.category.forEach((item) => params.append('category', item));
  }
  if (filters.created_at && filters.created_at.length === 2) {
    params.set('created_start', dayjs(filters.created_at[0]).format('YYYY-MM-DD'));
    params.set('created_end', dayjs(filters.created_at[1]).format('YYYY-MM-DD'));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const productService = {
  async getMeta() {
    const res = await http.get<ProductMeta>('/api/meta');
    return res.data;
  },
  async getList(filters: ProductFilters) {
    const res = await http.get<ProductListResponse>(`/api/products${toQueryString(filters)}`);
    return res.data;
  },
  async create(payload: ProductCreatePayload) {
    const res = await http.post<Product>('/api/products', payload);
    return res.data;
  },
  async enable(id: string) {
    const res = await http.post<Product>(`/api/products/${id}/enable`);
    return res.data;
  },
  async disable(id: string) {
    const res = await http.post<Product>(`/api/products/${id}/disable`);
    return res.data;
  },
  async importProducts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await http.post<ProductImportResponse>('/api/products/import', formData);
    return res.data;
  },
};
