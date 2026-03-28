import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { setupProductMock } from '../mock/productMock';
import { setupPurchaseInboundMock } from '../mock/purchaseInboundMock';

export const client = axios.create({
  timeout: 5000,
});

const mock = new MockAdapter(client, { delayResponse: 400 });

setupProductMock(mock);
setupPurchaseInboundMock(mock);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || '网络异常，请稍后重试';
    return Promise.reject(new Error(message));
  },
);
