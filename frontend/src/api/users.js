import axios from '@/utils/axios';

export const getUser = (id) =>
  axios.get(`/users/${id}`, { withCredentials: true });

export const getAllUsers = () =>
  axios.get('/users/', { withCredentials: true });

export const getSuggestedContacts = (limit = 5, offset = 0) =>
  axios.get('/users/suggested/contacts', { 
    withCredentials: true,
    headers: { token: localStorage.getItem('token') },
    params: { limit, offset }
  });

export const searchUsers = (query) =>
  axios.get('/users/', { 
    withCredentials: true,
    params: { search: query } 
  });

export const followUser = (id, userId) =>
  axios.put(`/users/${id}/follow`, { userId }, { withCredentials: true });

export const unfollowUser = (id, userId) =>
  axios.put(`/users/${id}/unfollow`, { userId }, { withCredentials: true });

export const changePassword = (id, currentPassword, newPassword) =>
  axios.put(`/users/${id}/change-password`, 
    { currentPassword, newPassword }, 
    { withCredentials: true }
  );

export const updateProfile = (id, data) =>
  axios.put(`/users/${id}/edit`, data, { withCredentials: true });
