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
      
      // Nếu là local file, thêm localhost prefix
      return `http://localhost:3000/uploads/${filePath}`;
    },
    
    getAvatarUrl(avatarPath) {
      if (!avatarPath) return '';
      
      // Nếu đã là URL đầy đủ
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
      }
      
      // Nếu là local file
      return `http://localhost:3000/uploads/user/${avatarPath}`;
    },
    
    getPostImageUrl(imagePath) {
      if (!imagePath) return '';
      
      // Nếu đã là URL đầy đủ
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      // Nếu là local file
      return `http://localhost:3000/uploads/${imagePath}`;
    }
  }
};
