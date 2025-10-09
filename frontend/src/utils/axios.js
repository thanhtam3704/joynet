import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để tự động thêm token vào headers
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.token = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để handle lỗi authentication
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired hoặc invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Có thể redirect về login page ở đây
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
