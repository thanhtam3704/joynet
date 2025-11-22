# 🌐 JoyNet - Mạng Xã Hội Hiện Đại

**Nền tảng mạng xã hội đầy đủ tính năng được xây dựng bằng Vue.js và Node.js**

## ✨ Tính năng

### 🎭 Mạng Xã Hội
- **Xác Thực Người Dùng** - Đăng ký/đăng nhập an toàn với JWT và Google OAuth 2.0
- **Quản Lý Hồ Sơ** - Tùy chỉnh trang cá nhân với tải ảnh đại diện lên Cloudinary
- **Tạo Bài Đăng** - Chia sẻ suy nghĩ, hình ảnh và tệp tin với mạng lưới của bạn
- **Nguồn Cấp Thời Gian Thực** - Dòng thời gian động với bài đăng từ người bạn theo dõi
- **Tương Tác** - Thích, bình luận và thả cảm xúc vào bài đăng

### 💬 Hệ Thống Nhắn Tin
- **Chat Thời Gian Thực** - Nhắn tin tức thì được hỗ trợ bởi Socket.IO
- **Cửa Sổ Chat** - Giao diện chat nhiều cửa sổ cho cuộc trò chuyện liền mạch
- **Nhóm Chat** - Tạo và quản lý cuộc trò chuyện nhóm
- **Cảm Xúc Tin Nhắn** - Thả cảm xúc vào tin nhắn với emoji
- **Chia Sẻ File** - Gửi hình ảnh và tệp tin trong cuộc trò chuyện
- **Xác Nhận Đã Đọc** - Xem khi tin nhắn được đọc
- **Đang Nhập** - Trạng thái đang nhập thời gian thực

### 📹 Gọi Video
- **Gọi Video 1-1** - Cuộc gọi video peer-to-peer chất lượng cao sử dụng WebRTC
- **Gọi Video Nhóm** - Hội nghị video nhiều người tham gia
- **TURN/STUN Servers** - Kết nối đáng tin cậy sử dụng relay servers của Metered.ca
- **Lịch Sử Cuộc Gọi** - Theo dõi thời lượng và người tham gia cuộc gọi
- **Chia Sẻ Màn Hình** - Chia sẻ màn hình trong cuộc gọi
- **Điều Khiển Media** - Bật/tắt camera và microphone trong cuộc gọi

### 🔔 Thông Báo
- **Thông Báo Thời Gian Thực** - Cảnh báo tức thì cho lượt thích, bình luận, theo dõi và tin nhắn
- **Hệ Thống Theo Dõi** - Gửi và quản lý yêu cầu theo dõi
- **Kiểm Soát Quyền Riêng Tư** - Quản lý ai có thể xem nội dung của bạn

### 🎨 Trải Nghiệm Người Dùng
- **Thiết Kế Responsive** - Thiết kế mobile-first hoạt động trên mọi thiết bị
- **Chế Độ Tối/Sáng** - (Sắp ra mắt)
- **Cuộn Vô Hạn** - Tải nội dung mượt mà
- **Chọn Emoji** - Hỗ trợ emoji phong phú cho bài đăng và tin nhắn
- **Xem Trước Hình Ảnh** - Trình xem ảnh kích thước đầy đủ

---

## 🛠️ Công Nghệ

### Frontend
![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Vuex](https://img.shields.io/badge/Vuex-4.x-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Vue Router](https://img.shields.io/badge/Vue%20Router-4.x-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=flat-square&logo=axios&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-010101?style=flat-square&logo=socket.io&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-ODM-880000?style=flat-square&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Server-010101?style=flat-square&logo=socket.io&logoColor=white)

### Truyền Thông Thời Gian Thực
![WebRTC](https://img.shields.io/badge/WebRTC-Video-333333?style=flat-square&logo=webrtc&logoColor=white)
![STUN/TURN](https://img.shields.io/badge/Metered.ca-TURN%20Servers-FF6B6B?style=flat-square)

### Dịch Vụ Đám Mây
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Render](https://img.shields.io/badge/Render-Hosting-46E3B7?style=flat-square&logo=render&logoColor=white)

### Xác Thực
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=json-web-tokens&logoColor=white)
![Google OAuth](https://img.shields.io/badge/Google-OAuth%202.0-4285F4?style=flat-square&logo=google&logoColor=white)
![Passport.js](https://img.shields.io/badge/Passport.js-Auth-34E27A?style=flat-square&logo=passport&logoColor=white)

---

## 🚀 Bắt Đầu

### Yêu Cầu

- Node.js (phiên bản 14 trở lên)
- MongoDB (local hoặc Atlas)
- Tài khoản Cloudinary
- Thông tin xác thực Google OAuth
- Thông tin xác thực Metered.ca TURN (cho gọi video)

### Cài Đặt

1. **Sao chép repository**
```bash
git clone https://github.com/thanhtam3704/joynet.git
cd joynet
```

2. **Thiết Lập Backend**
```bash
cd backend
npm install
```

Tạo tệp `.env` trong thư mục `backend/`:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URL=mongodb+srv://your-username:password@cluster.mongodb.net/joynet

# JWT
ACCESS_TOKEN_SECRET=your-super-secret-jwt-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

3. **Thiết Lập Frontend**
```bash
cd frontend
npm install
```

Tạo tệp `.env.development` trong thư mục `frontend/`:
```env
VUE_APP_API_URL=http://localhost:3000/api
VUE_APP_SOCKET_URL=http://localhost:3000
```

4. **Chạy Các Server Phát Triển**

Backend:
```bash
cd backend
node index.js
```

Frontend:
```bash
cd frontend
npm run serve
```

Mở trình duyệt và truy cập `http://localhost:8080`

## 🌐 Triển Khai

### Triển Khai Production (Render)

**URL Live:**
- Frontend: https://joynet-frontend.onrender.com
- Backend API: https://social-backend-tfha.onrender.com

### Triển Khai Bản Sao Của Bạn

Hướng dẫn triển khai chi tiết trong [RENDER_NETLIFY_GUIDE.md](RENDER_NETLIFY_GUIDE.md)

**Các Bước Nhanh:**

1. **Triển Khai Backend lên Render**
   - Kết nối repository GitHub
   - Đặt thư mục gốc là `backend`
   - Thêm biến môi trường
   - Triển khai!

2. **Triển Khai Frontend lên Render**
   - Kết nối repository GitHub
   - Đặt thư mục gốc là `frontend`
   - Thêm biến môi trường
   - Triển khai!

3. **Cấu Hình Dịch Vụ**
   - MongoDB Atlas (Gói miễn phí)
   - Cloudinary (Gói miễn phí)
   - Google OAuth Console
   - Metered.ca TURN servers

---

## 🎯 API Endpoints

### Xác Thực
```
POST   /api/auth/signup              - Tạo tài khoản mới
POST   /api/auth/login               - Đăng nhập với thông tin xác thực
GET    /api/auth/google              - Đăng nhập Google OAuth
POST   /api/auth/logout              - Đăng xuất người dùng
POST   /api/auth/forgot-password     - Yêu cầu đặt lại mật khẩu
POST   /api/auth/reset-password      - Đặt lại mật khẩu với token
GET    /api/auth/confirm-email       - Xác nhận địa chỉ email
```

### Người Dùng
```
GET    /api/users/profile            - Lấy hồ sơ người dùng hiện tại
PUT    /api/users/profile            - Cập nhật hồ sơ
GET    /api/users/:userId            - Lấy người dùng theo ID
POST   /api/users/avatar             - Tải lên ảnh đại diện
GET    /api/users/search             - Tìm kiếm người dùng
GET    /api/users/suggestions        - Lấy gợi ý theo dõi
```

### Bài Đăng
```
GET    /api/posts                    - Lấy bài đăng timeline
GET    /api/posts/:postId            - Lấy bài đăng theo ID
POST   /api/posts                    - Tạo bài đăng mới
PUT    /api/posts/:postId            - Cập nhật bài đăng
DELETE /api/posts/:postId            - Xóa bài đăng
POST   /api/posts/:postId/like       - Thích/bỏ thích bài đăng
POST   /api/posts/:postId/comment    - Thêm bình luận
POST   /api/posts/:postId/react      - Thả cảm xúc vào bài đăng
```

### Tin Nhắn
```
GET    /api/messages/conversations   - Lấy cuộc trò chuyện của người dùng
GET    /api/messages/:conversationId - Lấy tin nhắn trong cuộc trò chuyện
POST   /api/messages                 - Gửi tin nhắn mới
POST   /api/messages/group           - Tạo cuộc trò chuyện nhóm
PUT    /api/messages/:messageId      - Chỉnh sửa tin nhắn
DELETE /api/messages/:messageId      - Xóa tin nhắn
POST   /api/messages/:messageId/react - Thả cảm xúc vào tin nhắn
```

### Thông Báo
```
GET    /api/notifications            - Lấy thông báo người dùng
PUT    /api/notifications/read       - Đánh dấu thông báo đã đọc
DELETE /api/notifications/:id        - Xóa thông báo
```

### Hệ Thống Theo Dõi
```
GET    /api/follow-requests          - Lấy yêu cầu theo dõi
POST   /api/follow-requests/:userId  - Gửi yêu cầu theo dõi
PUT    /api/follow-requests/:id      - Chấp nhận yêu cầu theo dõi
DELETE /api/follow-requests/:id      - Từ chối yêu cầu theo dõi
```

---

## 🔌 Sự Kiện Socket.IO

### Kết Nối
```javascript
socket.on('connect')                    // Người dùng kết nối
socket.on('disconnect')                 // Người dùng ngắt kết nối
socket.on('user:online')                // Người dùng trực tuyến
socket.on('user:offline')               // Người dùng ngoại tuyến
```

### Nhắn Tin
```javascript
socket.on('newMessage')                 // Nhận tin nhắn mới
socket.on('messagesRead')               // Tin nhắn được đánh dấu đã đọc
socket.on('user:typing')                // Người dùng đang nhập
socket.on('user:stopTyping')            // Người dùng dừng nhập
socket.on('messageReactionUpdated')     // Cập nhật cảm xúc tin nhắn
```

### Gọi Video
```javascript
socket.on('video-call:incoming')        // Cuộc gọi video đến
socket.on('video-call:accepted')        // Cuộc gọi được chấp nhận
socket.on('video-call:rejected')        // Cuộc gọi bị từ chối
socket.on('video-call:cancelled')       // Cuộc gọi bị hủy
socket.on('video-call:ended')           // Cuộc gọi kết thúc
socket.on('video-call:user-joined')     // Người dùng tham gia cuộc gọi
socket.on('video-call:user-left')       // Người dùng rời cuộc gọi
socket.on('video-call:offer')           // WebRTC offer
socket.on('video-call:answer')          // WebRTC answer
socket.on('video-call:ice-candidate')   // ICE candidate
```

### Thông Báo
```javascript
socket.on('newNotification')            // Nhận thông báo mới
socket.on('postReactionUpdated')        // Cập nhật cảm xúc bài đăng
```

---

## 🎨 Ảnh Chụp Màn Hình

### Trang Chủ
<img width="1907" height="915" alt="image" src="https://github.com/user-attachments/assets/142f5193-d291-47fc-83dd-283ec0131dc2" />

### Trang Cá Nhân
*Hồ sơ người dùng có thể tùy chỉnh với thư viện bài đăng*

### Nhắn Tin
*Chat thời gian thực với cảm xúc emoji và chia sẻ tệp tin*

### Gọi Video
*Cuộc gọi video chất lượng cao với nhiều người tham gia*

### Thông Báo
*Luôn cập nhật với thông báo thời gian thực*

---

## 🔐 Tính Năng Bảo Mật

- **Xác Thực JWT** - Xác thực dựa trên token an toàn
- **Mã Hóa Mật Khẩu** - Mã hóa mật khẩu Bcrypt
- **Kiểm Tra Đầu Vào** - Kiểm tra phía server cho tất cả đầu vào
- **Bảo Vệ CORS** - Các chính sách CORS được cấu hình
- **Giới Hạn Tốc Độ** - Giới hạn tốc độ API (khuyến nghị cho production)
- **Bảo Vệ XSS** - Làm sạch đầu vào người dùng
- **Cookies An Toàn** - Cookies HTTP-only cho dữ liệu nhạy cảm

---

## 🚧 Lộ Trình Phát Triển

### Các Tính Năng Sắp Tới
- [ ] Chế độ tối
- [ ] Tính năng Story (bài đăng 24h)
- [ ] Bộ lọc tìm kiếm nâng cao
- [ ] Lưu bài đăng
- [ ] Chia sẻ bài đăng
- [ ] Hỗ trợ nhiều ngôn ngữ
- [ ] Thông báo đẩy
- [ ] Progressive Web App (PWA)
- [ ] Tin nhắn thoại
- [ ] Trực tiếp
- [ ] Kiểm soát quyền riêng tư nâng cao

### Cải Thiện Hiệu Suất
- [ ] Tải ảnh lazy loading
- [ ] Tách code
- [ ] Cache service worker
- [ ] Tối ưu hóa index database
- [ ] Tích hợp CDN

---







