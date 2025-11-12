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
      // Check if this is a Google OAuth callback - don't clear token if it is
      const hash = window.location.hash;
      const isGoogleCallback = hash.includes('success=google_login') && hash.includes('token=');
      
      if (isGoogleCallback) {
        // Don't clear token here, let the handleGoogleCallback function handle it
        return Promise.reject(error);
      }
      
      // For normal 401 errors, clear token and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Chỉ redirect nếu KHÔNG phải đang ở trang login/signup
      const currentPath = window.location.hash.replace('#', '');
      if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
