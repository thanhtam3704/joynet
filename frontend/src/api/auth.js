import axios from '@/utils/axios';

export const getCurrentUser = () =>
  axios.get('/auth/user', {
    headers: { token: localStorage.getItem('token') },
    withCredentials: true,
  });

export const login = (credentials) =>
  axios.post('/auth/login', credentials, { withCredentials: true });

export const signup = (payload) =>
  axios.post('/auth/register', payload, { withCredentials: true });

export const uploadAuthFile = (formData) =>
  axios.post('/auth/upload', formData, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const refreshToken = () =>
  axios.get('/auth/token', { withCredentials: true });
