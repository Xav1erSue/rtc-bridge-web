import axios from 'axios';
import { Message } from '@arco-design/web-react';

export const request = axios.create({
  baseURL: 'https://api.xav1er.com',
  timeout: 1000 * 60,
});

request.interceptors.response.use((response) => {
  const { code, data, msg } = response.data;

  if (code !== 2000) {
    Message.error(msg || '请求失败');
  }

  return data;
});
