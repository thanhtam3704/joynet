import axios from '@/utils/axios';

export const getPost = (postId) =>
  axios.get(`/posts/${postId}`, { withCredentials: true });

export const getPostComments = (postId) =>
  axios.get(`/posts/${postId}/comments`, { withCredentials: true });

export const addComment = (postId, payload) =>
  axios.put(`/posts/${postId}/comment`, payload, { withCredentials: true });

export const uploadPostFile = (formData) =>
  axios.post('/posts/upload', formData, {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const toggleLike = (postId, userId) =>
  axios.put(
    `/posts/${postId}/like`,
    { userId },
    { withCredentials: true }
  );

export const getTimeline = (userId) =>
  axios.get(`/posts/timeline/${userId}`, { withCredentials: true });

export const getUserPosts = (userId) =>
  axios.get(`/posts/${userId}/posts`, { withCredentials: true });

export const createPost = (post) =>
  axios.post('/posts/', post, { withCredentials: true });

// Likes detail endpoints
export const getLikes = (postId) =>
  axios.get(`/posts/${postId}/likes`, { withCredentials: true });

export const getLikesCount = (postId) =>
  axios.get(`/posts/${postId}/likes-count`, { withCredentials: true });

export const getLikeStatus = (postId, userId) =>
  axios.get(`/posts/${postId}/like-status/${userId}`, { withCredentials: true });
