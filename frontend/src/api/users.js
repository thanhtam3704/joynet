import axios from '@/utils/axios';

export const getUser = (id) =>
  axios.get(`/users/${id}`, { withCredentials: true });

export const getAllUsers = () =>
  axios.get('/users/', { withCredentials: true });

export const searchUsers = (query) =>
  axios.get('/users/', { 
    withCredentials: true,
    params: { search: query } 
  });

export const followUser = (id, userId) =>
  axios.put(`/users/${id}/follow`, { userId }, { withCredentials: true });

export const unfollowUser = (id, userId) =>
  axios.put(`/users/${id}/unfollow`, { userId }, { withCredentials: true });
