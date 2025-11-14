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

// React to post with emoji
export const reactToPost = (postId, userId, reactionType) =>
  axios.put(
    `/posts/${postId}/react`,
    { userId, reactionType },
    { withCredentials: true }
  );

export const getReactionStatus = (postId, userId) =>
  axios.get(`/posts/${postId}/reaction-status/${userId}`, { withCredentials: true });

// Get list of users who reacted to a post
export const getReactors = (postId, reactionType = null) => {
  const url = reactionType 
    ? `/posts/${postId}/reactors/${reactionType}`
    : `/posts/${postId}/reactors`;
  return axios.get(url, { withCredentials: true });
};

// Get list of users who commented on a post
export const getCommenters = (postId) =>
  axios.get(`/posts/${postId}/commenters`, { withCredentials: true });

export const getTimeline = (userId, page = 1, limit = 6) =>
  axios.get(`/posts/timeline/${userId}?page=${page}&limit=${limit}`, { withCredentials: true });

export const getUserPosts = (userId, page = 1, limit = 6, requestingUserId = null) => {
  const url = `/posts/${userId}/posts?page=${page}&limit=${limit}${requestingUserId ? `&requestingUserId=${requestingUserId}` : ''}`;
  return axios.get(url, { withCredentials: true });
};

export const createPost = (post) =>
  axios.post('/posts/', post, { withCredentials: true });

// Likes detail endpoints
export const getLikes = (postId) =>
  axios.get(`/posts/${postId}/likes`, { withCredentials: true });

export const getLikesCount = (postId) =>
  axios.get(`/posts/${postId}/likes-count`, { withCredentials: true });

export const getLikeStatus = (postId, userId) =>
  axios.get(`/posts/${postId}/like-status/${userId}`, { withCredentials: true });

// Edit and Delete post endpoints
export const editPost = (postId, updatedPost) =>
  axios.put(`/posts/${postId}`, updatedPost, { withCredentials: true });

export const deletePost = (postId, userId) =>
  axios.delete(`/posts/${postId}`, { 
    data: { userId }, 
    withCredentials: true 
  });

// Edit and Delete comment endpoints
export const editComment = (postId, commentId, comment, userId) =>
  axios.put(`/posts/${postId}/comment/${commentId}`, { comment, userId }, { withCredentials: true });

export const deleteComment = (postId, commentId, userId) =>
  axios.delete(`/posts/${postId}/comment/${commentId}`, {
    data: { userId },
    withCredentials: true
  });
