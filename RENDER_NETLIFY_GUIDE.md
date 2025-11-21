# 🚀 Hướng dẫn Deploy Social Web - Render + Netlify

> **Phương án đơn giản nhất:** Backend Render + Frontend Netlify

## 📋 Chuẩn bị

### 1. Tài khoản cần có:
- [ ] Tài khoản **Render**: https://render.com/ (Signup với GitHub)
- [ ] Tài khoản **Netlify**: https://app.netlify.com/signup (Signup với GitHub)
- [ ] Tài khoản **GitHub**: https://github.com/signup
- [ ] Tài khoản **MongoDB Atlas** (miễn phí): https://www.mongodb.com/cloud/atlas/register
- [ ] Tài khoản **Cloudinary**: https://cloudinary.com/users/register/free
- [ ] **Google OAuth Credentials**: https://console.cloud.google.com/

### 2. Không cần cài gì cả! 
✅ Mọi thứ làm trên web browser

---

## 🗄️ BƯỚC 1: Setup MongoDB Atlas

### 1.1 Tạo Database trên MongoDB Atlas

1. Đăng nhập vào https://cloud.mongodb.com/
2. Tạo **New Project** → đặt tên "Social-Web"
3. Click **Build a Database** → chọn **FREE** (M0)
4. Chọn region gần Việt Nam (Singapore hoặc Hong Kong)
5. Đặt tên cluster: `social-cluster`
6. Click **Create**

### 1.2 Cấu hình Database Access

1. Vào **Database Access** (menu bên trái)
2. Click **Add New Database User**
3. Tạo user:
   - Username: `socialadmin`
   - Password: Tạo mật khẩu mạnh (save lại)
   - Database User Privileges: **Read and write to any database**
4. Click **Add User**

### 1.3 Cấu hình Network Access

1. Vào **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access From Anywhere** (cho 0.0.0.0/0)
4. Click **Confirm**

### 1.4 Lấy Connection String

1. Vào **Database** → Click **Connect** trên cluster của bạn
2. Chọn **Drivers** → Node.js
3. Copy connection string, ví dụ:
   ```
   mongodb+srv://socialadmin:<password>@social-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Thay `<password>` bằng mật khẩu thật của bạn
5. **✍️ LƯU LẠI CONNECTION STRING NÀY!**

---

## ☁️ BƯỚC 2: Setup Cloudinary

### 2.1 Tạo tài khoản Cloudinary

1. Đăng ký tại: https://cloudinary.com/users/register/free
2. Xác nhận email
3. Đăng nhập vào Dashboard

### 2.2 Lấy API credentials

1. Vào **Dashboard** → https://cloudinary.com/console
2. Copy thông tin:
   - **Cloud Name**: `dxxxxxxxxxxxx`
   - **API Key**: `123456789012345`
   - **API Secret**: `abcdefghijklmnopqrstuvwxyz123`
3. **✍️ LƯU LẠI 3 THÔNG TIN NÀY!**

---

## 🔑 BƯỚC 3: Setup Google OAuth

### 3.1 Tạo Google Cloud Project

1. Vào https://console.cloud.google.com/
2. Tạo **New Project** → đặt tên "Social-Web"
3. Chọn project vừa tạo

### 3.2 Enable Google+ API

1. Vào **APIs & Services** → **Library**
2. Tìm "Google+ API"
3. Click **Enable**

### 3.3 Tạo OAuth Credentials

1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Nếu chưa có, tạo **OAuth consent screen**:
   - User Type: **External**
   - App name: `Social Web`
   - User support email: email của bạn
   - Developer contact: email của bạn
   - Click **Save and Continue**
   - Scopes: Bỏ qua, click **Save and Continue**
   - Test users: Thêm email test (nếu cần)
   - Click **Save and Continue**

4. Tạo OAuth Client ID:
   - Application type: **Web application**
   - Name: `Social Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:8080
     https://your-social-app.netlify.app
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/google/callback
     https://your-backend-app.onrender.com/api/auth/google/callback
     ```
   - Click **Create**

5. Copy **Client ID** và **Client Secret**
6. **✍️ LƯU LẠI 2 THÔNG TIN NÀY!**

---

## 📤 BƯỚC 4: Push Code lên GitHub

### 4.1 Tạo Repository trên GitHub

1. Vào https://github.com/new
2. Đặt tên repository: `social-web`
3. Chọn **Public** hoặc **Private** (tùy bạn)
4. **KHÔNG** check "Add a README file"
5. Click **Create repository**

### 4.2 Push code lên GitHub

```powershell
# Mở PowerShell tại thư mục dự án
cd "d:\Project trên trường\Social-web - Copy"

# Khởi tạo git (nếu chưa có)
git init

# Tạo .gitignore (nếu chưa có)
# File .gitignore đã có sẵn trong backend và frontend

# Add tất cả files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Thêm remote (thay YOUR-USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR-USERNAME/social-web.git

# Đổi branch thành main (nếu đang là master)
git branch -M main

# Push lên GitHub
git push -u origin main
```

**Lưu ý:** Nếu GitHub yêu cầu login, có thể cần tạo Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → Chọn `repo` scope
3. Copy token và dùng làm password khi git push

---

## 🚀 BƯỚC 5: Deploy Backend lên Render

### 5.1 Đăng nhập Render

1. Vào https://render.com/
2. Click **Get Started for Free**
3. **Sign up with GitHub** (recommended)
4. Authorize Render để truy cập GitHub

### 5.2 Tạo Web Service cho Backend

1. Vào Dashboard → Click **New +** → **Web Service**
2. Chọn repository **social-web** (nếu không thấy, click "Configure account" để authorize)
3. Cấu hình:
   - **Name**: `social-backend` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần VN nhất)
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **QUAN TRỌNG!**
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free` ✅

4. Click **Advanced** để thêm Environment Variables

### 5.3 Thêm Environment Variables

Click **Add Environment Variable** và thêm từng cái sau:

| Key | Value | Ghi chú |
|-----|-------|---------|
| `MONGO_URL` | `mongodb+srv://socialadmin:yourpassword@...` | Connection string từ MongoDB Atlas |
| `ACCESS_TOKEN_SECRET` | `your-super-secret-key-random-string-123456` | Tạo chuỗi random dài |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Từ Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | `your_api_key` | Từ Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | `your_api_secret` | Từ Cloudinary Dashboard |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Từ Google Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Từ Google Console |
| `GOOGLE_CALLBACK_URL` | `https://social-backend.onrender.com/api/auth/google/callback` | Thay `social-backend` bằng tên service của bạn |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `FRONTEND_URL` | `http://localhost:8080` | Sẽ update sau khi deploy frontend |

**Lưu ý:** 
- Thay `social-backend` trong `GOOGLE_CALLBACK_URL` bằng tên service thực tế
- `FRONTEND_URL` sẽ update sau

### 5.4 Deploy Backend

1. Click **Create Web Service**
2. Render sẽ bắt đầu build và deploy (mất 2-5 phút)
3. Đợi status chuyển thành **Live** (màu xanh)
4. Copy URL: `https://your-backend.onrender.com`

### 5.5 Kiểm tra Backend

1. Click vào URL để mở: `https://your-backend.onrender.com`
2. Hoặc test API: `https://your-backend.onrender.com/api/users`
3. Nếu thấy response (có thể 401 - OK) là backend hoạt động!

### 5.6 Xem Logs (nếu có lỗi)

1. Vào Dashboard → Chọn service
2. Tab **Logs** → xem real-time logs
3. Tab **Events** → xem deploy history

---

## 🎨 BƯỚC 6: Deploy Frontend lên Netlify

### 6.1 Update .env.production

1. Mở file `frontend/.env.production`
2. Update với URL backend từ Render:

```env
VUE_APP_API_URL=https://your-backend.onrender.com/api
VUE_APP_SOCKET_URL=https://your-backend.onrender.com
```

3. **Lưu file**
4. Commit và push lên GitHub:

```powershell
git add frontend/.env.production
git commit -m "Update backend URL for production"
git push origin main
```

### 6.2 Đăng nhập Netlify

1. Vào https://app.netlify.com/
2. Click **Sign up** → **Sign up with GitHub**
3. Authorize Netlify

### 6.3 Deploy Frontend từ GitHub

1. Click **Add new site** → **Import an existing project**
2. Click **Deploy with GitHub**
3. Authorize Netlify (nếu cần)
4. Chọn reposihttps://lambent-eclair-0dcc06.netlify.app/tory **social-web**
5. Cấu hình build settings:
   - **Branch to deploy**: `main`
   - **Base directory**: `frontend` ⚠️ **QUAN TRỌNG!**
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist` ⚠️ **QUAN TRỌNG!**

6. Click **Show advanced** → **New variable**
   - Add Environment Variables:
     - `VUE_APP_API_URL`: `https://your-backend.onrender.com/api`
     - `VUE_APP_SOCKET_URL`: `https://your-backend.onrender.com`

7. Click **Deploy site**

### 6.4 Đợi Deploy

1. Netlify sẽ build (mất 1-3 phút)
2. Status chuyển thành **Published** (màu xanh)
3. Copy URL: `https://joynet.netlify.app/`

### 6.5 Đổi tên Site (Optional)

1. Click **Site settings**
2. Click **Change site name**
3. Đặt tên: `your-social-app` (phải unique)
4. URL mới: `https://joynet.netlify.app/`

---

## 🔗 BƯỚC 7: Kết nối Frontend - Backend

### 7.1 Update Backend FRONTEND_URL trên Render

1. Vào Render Dashboard → Chọn backend service
2. Tab **Environment** → Click **Add Environment Variable**
3. Hoặc edit biến `FRONTEND_URL`:
   - Key: `FRONTEND_URL`
   - Value: `https://your-social-app.netlify.app`
4. Click **Save Changes**
5. Service sẽ tự động redeploy

### 7.2 Update Google OAuth Redirect URIs

1. Vào https://console.cloud.google.com/
2. Vào **APIs & Services** → **Credentials**
3. Click vào OAuth Client ID đã tạo
4. Update **Authorized JavaScript origins**:
   ```
   https://your-social-app.netlify.app
   ```
5. Update **Authorized redirect URIs**:
   ```
   https://your-backend.onrender.com/api/auth/google/callback
   ```
6. Click **Save**

### 7.3 Update Backend GOOGLE_CALLBACK_URL

1. Vào Render Dashboard → Backend service
2. Tab **Environment**
3. Edit biến `GOOGLE_CALLBACK_URL`:
   ```
   https://your-backend.onrender.com/api/auth/google/callback
   ```
4. Save → Service sẽ redeploy

---

## ✅ BƯỚC 8: Test Ứng Dụng

### 8.1 Mở Frontend

```
https://your-social-app.netlify.app
```

### 8.2 Test các chức năng:

- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập
- [ ] Đăng nhập bằng Google
- [ ] Tạo post (với hình ảnh - test Cloudinary)
- [ ] Like, comment
- [ ] Gửi tin nhắn (test Socket.IO)
- [ ] Video call 1-1
- [ ] Video call nhóm
- [ ] Notification real-time

---

## 🐛 Troubleshooting

### Backend không start trên Render

**Kiểm tra:**
1. Vào **Logs** tab xem lỗi gì
2. Kiểm tra **Root Directory** = `backend`
3. Kiểm tra **Start Command** = `node index.js`
4. Kiểm tra MongoDB connection string có đúng không

**Lỗi thường gặp:**
```
Error: Cannot find module 'express'
```
→ Build command chưa chạy `npm install`

```
MongooseServerSelectionError
```
→ MongoDB connection string sai hoặc Network Access chưa cho phép 0.0.0.0/0

### Frontend build lỗi trên Netlify

**Kiểm tra:**
1. Vào **Deploys** → Click vào deploy failed → Xem logs
2. Kiểm tra **Base directory** = `frontend`
3. Kiểm tra **Publish directory** = `frontend/dist`

**Lỗi thường gặp:**
```
Command failed: npm run build
```
→ Có lỗi trong code Vue, check logs chi tiết

```
Error: ENOENT: no such file or directory
```
→ Base directory hoặc Publish directory sai

### CORS Error

**Lỗi trong Console:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Giải pháp:**
1. Kiểm tra `FRONTEND_URL` trong Render Environment Variables
2. Đảm bảo URL khớp chính xác (có/không có trailing slash)
3. Redeploy backend service

### Socket.IO không kết nối

**Lỗi:**
```
WebSocket connection to 'wss://...' failed
```

**Giải pháp:**
1. Kiểm tra `VUE_APP_SOCKET_URL` trong Netlify
2. Kiểm tra backend logs có nhận WebSocket connection không
3. Kiểm tra `FRONTEND_URL` trong backend có đúng không

### Google OAuth không hoạt động

**Lỗi:**
```
redirect_uri_mismatch
```

**Giải pháp:**
1. Kiểm tra lại Google Console OAuth Redirect URIs
2. Đảm bảo có cả 2 URIs:
   - `https://your-backend.onrender.com/api/auth/google/callback`
   - Frontend origin: `https://your-social-app.netlify.app`

### Cloudinary upload lỗi

**Giải pháp:**
1. Kiểm tra 3 biến trong Render Environment:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. Kiểm tra backend logs khi upload

### Render Free Instance "Spins Down"

**Vấn đề:** Render free tier tắt service sau 15 phút không hoạt động

**Triệu chứng:** 
- Request đầu tiên sau khi không dùng lâu bị chậm (30s - 50s)
- "Service is starting up..."

**Giải pháp:**
1. Đợi 30-50s cho lần request đầu
2. Hoặc upgrade lên Paid plan ($7/tháng)
3. Hoặc dùng cron job để ping service 10 phút/lần (search "render keep alive")

---

## 🔄 Update Code sau Deploy

### Update Backend

**Method 1: Từ GitHub (Recommended - Auto deploy)**
```powershell
cd backend
# Sửa code...
git add .
git commit -m "Update backend feature"
git push origin main
```
→ Render tự động detect và redeploy!

**Method 2: Manual Redeploy**
1. Vào Render Dashboard
2. Click **Manual Deploy** → **Deploy latest commit**

### Update Frontend

**Từ GitHub (Auto deploy):**
```powershell
cd frontend
# Sửa code...
git add .
git commit -m "Update frontend feature"
git push origin main
```
→ Netlify tự động detect và redeploy!

---

## 📊 Monitoring

### Backend (Render)

1. **Logs**: Dashboard → Service → **Logs** tab
2. **Metrics**: Dashboard → Service → **Metrics** tab
3. **Events**: Dashboard → Service → **Events** tab

### Frontend (Netlify)

1. **Deploy logs**: Site → **Deploys** tab → Click vào deploy
2. **Function logs**: Site → **Functions** tab (nếu có)
3. **Analytics**: Site → **Analytics** tab (nếu enable)

---

## 💰 Chi phí

| Service | Free Tier | Giới hạn | Paid Plan |
|---------|-----------|----------|-----------|
| **Render** | ✅ Free | 750 hours/month, Service tắt sau 15 phút idle | $7/tháng (không tắt) |
| **Netlify** | ✅ Free | 100GB bandwidth/tháng | $19/tháng |
| **MongoDB Atlas** | ✅ Free | 512MB storage | $9/tháng (2GB) |
| **Cloudinary** | ✅ Free | 25 credits/tháng (~25GB storage + bandwidth) | $89/tháng (Plus) |
| **Google OAuth** | ✅ Free | Unlimited | Free |

**Tổng chi phí: $0/tháng** với Free tier! 🎉

**Lưu ý về Render Free:** 
- Service sẽ "spin down" (tắt) sau 15 phút không dùng
- Request đầu tiên sẽ chậm 30-50s (cold start)
- 750 hours/tháng = ~31 ngày, đủ cho 1 service chạy 24/7

---

## 🎯 URLs quan trọng

| Service | URL | Ghi chú |
|---------|-----|---------|
| Backend (Render) | `https://your-backend.onrender.com` | Thay tên service |
| Frontend (Netlify) | `https://your-social-app.netlify.app` | Thay tên site |
| MongoDB Atlas | https://cloud.mongodb.com/ | Database |
| Cloudinary | https://cloudinary.com/console | Media storage |
| Google Console | https://console.cloud.google.com/ | OAuth |
| Render Dashboard | https://dashboard.render.com/ | Backend management |
| Netlify Dashboard | https://app.netlify.com/ | Frontend management |
| GitHub Repo | `https://github.com/YOUR-USERNAME/social-web` | Source code |

---

## 📝 Checklist Deploy

### Pre-deployment
- [x] Đã cấu hình dynamic PORT, CORS, Socket.IO
- [x] Đã tạo `.env.production` cho frontend
- [x] Đã update axios và socket URL

### MongoDB Atlas
- [ ] Đã tạo cluster
- [ ] Đã tạo database user
- [ ] Đã cấu hình Network Access (0.0.0.0/0)
- [ ] ✍️ Đã lưu connection string

### Cloudinary
- [ ] Đã đăng ký tài khoản
- [ ] ✍️ Đã lưu Cloud Name, API Key, API Secret

### Google OAuth
- [ ] Đã tạo project
- [ ] Đã enable Google+ API
- [ ] Đã tạo OAuth credentials
- [ ] ✍️ Đã lưu Client ID và Client Secret

### GitHub
- [ ] Đã tạo repository
- [ ] Đã push code lên GitHub

### Backend (Render)
- [ ] Đã tạo Web Service
- [ ] Đã set Root Directory = `backend`
- [ ] Đã thêm tất cả Environment Variables
- [ ] Backend status = **Live** (màu xanh)
- [ ] ✍️ Đã lưu backend URL

### Frontend (Netlify)
- [ ] Đã update `.env.production` với backend URL
- [ ] Đã push changes lên GitHub
- [ ] Đã tạo site từ GitHub
- [ ] Đã set Base directory = `frontend`
- [ ] Đã set Publish directory = `frontend/dist`
- [ ] Frontend status = **Published** (màu xanh)
- [ ] ✍️ Đã lưu frontend URL

### Integration
- [ ] Đã update `FRONTEND_URL` trên Render
- [ ] Đã update Google OAuth redirect URIs
- [ ] Đã update `GOOGLE_CALLBACK_URL` trên Render

### Testing
- [ ] Mở frontend trên browser
- [ ] Đăng ký/Đăng nhập hoạt động
- [ ] Google OAuth hoạt động
- [ ] Upload ảnh hoạt động (Cloudinary)
- [ ] Post, Like, Comment hoạt động
- [ ] Tin nhắn real-time hoạt động
- [ ] Video call hoạt động
- [ ] Notifications hoạt động

---

## 🚀 Ưu điểm của Render + Netlify

### ✅ So với Heroku:

1. **Đơn giản hơn nhiều:**
   - Không cần cài CLI
   - Không cần nhớ git commands phức tạp
   - UI trực quan, dễ dùng

2. **Auto-deploy:**
   - Push code lên GitHub là tự động deploy
   - Không cần chạy lệnh deploy

3. **Free tier tốt hơn:**
   - Render: 750h/tháng (Heroku chỉ 550h)
   - Netlify: 100GB bandwidth (Heroku không có)

4. **Logs dễ xem:**
   - Xem trực tiếp trên Dashboard
   - Không cần CLI

5. **Environment Variables:**
   - Quản lý trên web, trực quan
   - Không cần nhớ lệnh CLI

### ✅ So với VPS:

1. **Không cần setup server:**
   - Không cần SSH, Nginx, PM2
   - Không cần quản lý SSL certificate

2. **Tự động scale:**
   - Backend tự restart khi crash
   - Không cần lo maintenance

3. **HTTPS miễn phí:**
   - Tự động có SSL
   - Không cần Let's Encrypt

---

## 🎓 Tips & Tricks

### 1. Xem logs real-time

**Backend (Render):**
- Dashboard → Service → Logs tab
- Tự động scroll theo real-time

**Frontend (Netlify):**
- Site → Deploys → Click deploy → Xem logs

### 2. Rollback nếu deploy lỗi

**Render:**
- Dashboard → Events → Click "Redeploy" trên version cũ

**Netlify:**
- Deploys → Click vào deploy cũ → "Publish deploy"

### 3. Custom Domain (nâng cao)

**Render:**
1. Settings → Custom Domains → Add domain
2. Update DNS records theo hướng dẫn

**Netlify:**
1. Domain settings → Add custom domain
2. Update DNS hoặc dùng Netlify DNS

### 4. Enable HTTPS cho Custom Domain

- Render: Tự động sau khi setup domain
- Netlify: Tự động sau khi setup domain

### 5. Database Backup (MongoDB Atlas)

1. Atlas → Clusters → ... → Backup
2. Free tier không có auto backup
3. Export manually: Database → Connect → Compass → Export

---

## 🆘 Support & Resources

### Documentation
- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com/
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/

### Community
- **Render Community**: https://community.render.com/
- **Netlify Forums**: https://answers.netlify.com/

### Video Tutorials
- Search YouTube: "Deploy Node.js to Render"
- Search YouTube: "Deploy Vue.js to Netlify"

---

## 🎉 Hoàn tất!

Chúc mừng bạn đã deploy thành công với **Render + Netlify**!

### Next Steps:
1. ✅ Share link với bạn bè để test
2. 📊 Monitor logs để phát hiện lỗi
3. 🔄 Setup auto-deploy workflow
4. 🌐 Thêm custom domain (optional)
5. 📈 Add analytics (optional)

**Enjoy your deployed app!** 🚀🎊
