import axios from 'axios';
import { navigate } from '../utils/navigation';

const api = axios.create();

const getStoredToken = (): string | null =>
  localStorage.getItem('token') ||
  localStorage.getItem('accessToken') ||
  localStorage.getItem('access_token');

const isVerificationRequest = (url?: string): boolean => {
  if (!url) return false;
  return url.includes('verify-payment') || /\/verify\//.test(url);
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl: string | undefined = error.config?.url;

    if (status === 401 && !isVerificationRequest(requestUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
