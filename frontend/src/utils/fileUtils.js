/**
 * Utility để xử lý URL của file/ảnh
 * Hỗ trợ cả Cloudinary và local storage
 */

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  
  // Nếu đã là URL đầy đủ (Cloudinary hoặc external)
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Nếu là local file, thêm localhost prefix
  return `http://localhost:3000/uploads/${filePath}`;
};

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return '';
  
  // Nếu đã là URL đầy đủ
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // Nếu là local file
  return `http://localhost:3000/uploads/user/${avatarPath}`;
};

export const getPostImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // Nếu đã là URL đầy đủ
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Nếu là local file
  return `http://localhost:3000/uploads/${imagePath}`;
};

// Upload file lên Cloudinary qua backend
export const uploadFile = async (file, endpoint = '/posts/upload') => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`http://localhost:3000/api${endpoint}`, {
    method: 'POST',
    headers: {
      'token': localStorage.getItem('token')
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return await response.json();
};

