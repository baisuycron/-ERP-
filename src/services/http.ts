import axios from 'axios';
import { setupProductMock } from '../mock/productMock';
import { setupPurchaseReceiptMock } from '../mock/purchaseReceiptMock';

export const http = axios.create({
  timeout: 5000,
});

setupProductMock(http);
setupPurchaseReceiptMock(http);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || '网络异常，请稍后重试';
    return Promise.reject(new Error(message));
  },
);
