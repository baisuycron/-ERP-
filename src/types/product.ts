export type ProductStatus = 'draft' | 'enabled' | 'disabled';

export interface BarcodeItem {
  code: string;
  isPrimary: boolean;
}

export interface UnitConversionMap {
  [key: string]: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category_path: string[];
  category_name: string;
  brand_id?: string;
  brand_name?: string;
  main_unit: string;
  sub_units: string[];
  unit_conversion?: UnitConversionMap;
  barcodes: BarcodeItem[];
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  in_use?: boolean;
  unfinished_order_count?: number;
}

export interface ProductFilters {
  name?: string;
  code?: string;
  category?: string[];
  brand?: string;
  status?: ProductStatus;
  created_at?: [string, string];
}

export interface ProductListResponse {
  list: Product[];
  total: number;
}

export interface ProductCreatePayload {
  name: string;
  code: string;
  category: string[];
  brand_id?: string;
  main_unit: string;
  sub_units?: string[];
  unit_conversion?: UnitConversionMap;
  barcodes: BarcodeItem[];
  status: ProductStatus;
}

export interface ProductImportResultRow {
  row: number;
  code: string;
  name: string;
  success: boolean;
  message: string;
}

export interface ProductImportResponse {
  success_count: number;
  failed_count: number;
  details: ProductImportResultRow[];
}

export interface OptionItem {
  label: string;
  value: string;
  children?: OptionItem[];
}

export interface ProductMeta {
  brands: OptionItem[];
  categories: OptionItem[];
  units: OptionItem[];
}
