# 🚀 Deploy AuthAPI để Render.com

## Bước 1: Chuẩn bị GitHub Repository

### 1.1 Init Git
```bash
cd "Sever API/my-ap"
git init
git add .
git commit -m "Initial AuthAPI deployment"
```

### 1.2 Tạo Repository trên GitHub
- Vào https://github.com/new
- Repository name: `authapi-v3` (hoặc tên khác)
- Chọn **Public** hoặc **Private**
- Click "Create repository"

### 1.3 Push lên GitHub
```bash
git remote add origin https://github.com/YOUR-USERNAME/authapi-v3.git
git branch -M main
git push -u origin main
```

---

## Bước 2: Deploy lên Render

### 2.1 Truy cập Render
- Vào https://render.com
- Click "Sign up" hoặc đăng nhập bằng GitHub

### 2.2 Tạo New Web Service
1. Click "New +" → "Web Service"
2. Kết nối với GitHub repository
3. Chọn `authapi-v3` repository
4. Click "Connect"

### 2.3 Cấu hình Deployment

**Thông số:**
- **Name**: `authapi` (hoặc tên khác)
- **Environment**: `Node`
- **Region**: `Singapore` (hoặc gần nhất)
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (hoặc Paid)

### 2.4 Thiết lập Environment Variables
Chọn **Environment**:
```
JWT_SECRET = please-change-jwt-secret-2025
HMAC_SECRET = please-change-hmac-secret-2025
ADMIN_PASSWORD = 1
PORT = 10000
```

### 2.5 Deploy
- Click "Create Web Service"
- Render sẽ tự động deploy
- Chờ 2-5 phút cho quá trình build

---

## Bước 3: Lấy URL Mới

Sau khi deploy thành công:
- URL sẽ có dạng: `https://authapi-xxx.onrender.com`
- Copy URL này

---

## Bước 4: Cập nhật CONFIG

1. Mở [CONFIG_v3.5.json](../CONFIG_v3.5.json)
2. Cập nhật `api_url`:
```json
"api_url": "https://authapi-xxx.onrender.com/api"
```

3. Cập nhật tất cả nơi dùng URL cũ:
```bash
# Tìm và thay:
# Từ: https://bucac.onrender.com
# Thành: https://authapi-xxx.onrender.com
```

---

## Bước 5: Test API

### 5.1 Kiểm tra Health Check
```bash
curl https://authapi-xxx.onrender.com/health
```

### 5.2 Lấy Config
```bash
curl https://authapi-xxx.onrender.com/api/config
```

### 5.3 Đăng Ký User
```bash
curl -X POST https://authapi-xxx.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }'
```

---

## ⚠️ Lưu Ý Quan Trọng

### Free Tier Limitations:
- ❌ Sẽ **ngủ sau 15 phút** không có request
- ❌ Dữ liệu sẽ **mất** khi redeploy
- ✅ Miễn phí 750 giờ/tháng
- ✅ Đủ cho test/demo

### Giải pháp:
1. **Nên sử dụng Paid Plan** cho production ($7-$25/tháng)
2. hoặc **VPS khác** (DigitalOcean, AWS, etc.)

---

## Câu Lệnh Hữu Ích

### Debug Logs
```bash
# Render dashboard → Logs
```

### Restart Server
```bash
# Render dashboard → Manual Deploy
```

### View Environment
```bash
# Render dashboard → Environment
```

---

## 🎉 Thành công!

API của bạn đã live tại: `https://authapi-xxx.onrender.com`

**Tiếp theo:**
- Cập nhật tất cả client code với URL mới
- Thiết lập database persistent (nếu cần)
- Thay đổi JWT_SECRET & HMAC_SECRET bảo mật
