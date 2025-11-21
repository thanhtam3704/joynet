/**
 * Mixin để xử lý URL file/ảnh
 * Tự động detect Cloudinary hoặc local storage
 */
export default {
  methods: {
    getFileUrl(filePath) {
      if (!filePath) return '';
      
      // Nếu đã là URL đầy đủ (Cloudinary hoặc external)
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      
      // Nếu là local file, thêm backend URL
      const apiUrl = process.env.VUE_APP_API_URL?.replace('/api', '') || 'https://social-backend-tfha.onrender.com';
      return `${apiUrl}/uploads/${filePath}`;
    },
    
    getAvatarUrl(avatarPath) {
      if (!avatarPath) return '';
      
      // Nếu đã là URL đầy đủ
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
      }
      
      // Nếu là local file
      const apiUrl = process.env.VUE_APP_API_URL?.replace('/api', '') || 'https://social-backend-tfha.onrender.com';
      return `${apiUrl}/uploads/user/${avatarPath}`;
    },
    
    getPostImageUrl(imagePath) {
      if (!imagePath) return '';
      
      // Nếu đã là URL đầy đủ
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      // Nếu là local file
      const apiUrl = process.env.VUE_APP_API_URL?.replace('/api', '') || 'https://social-backend-tfha.onrender.com';
      return `${apiUrl}/uploads/${imagePath}`;
    }
  }
};
