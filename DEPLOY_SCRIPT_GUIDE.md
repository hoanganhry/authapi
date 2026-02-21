# 🚀 Deploy Scripts - Hướng dẫn sử dụng

## Yêu cầu trước khi deploy

### 1. Tạo GitHub Personal Token
1. Vào: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Tên: `AuthAPI Deploy`
4. Chọn scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy token và giữ kỹ** (chỉ hiển thị 1 lần!)

### 2. Tạo GitHub Repository
1. Vào: https://github.com/new
2. Repository name: `authapi-v3` (hoặc tên khác)
3. Description: `AuthAPI - Unlimited Key Management`
4. Chọn **Public** hoặc **Private**
5. **Không** check "Add README" (sẽ conflict)
6. Click "Create repository"

---

## Chạy Deploy Script

### **Trên Windows (CMD hoặc PowerShell):**

```bash
cd "FF/Sever API/my-ap"
deploy.bat
```

Rồi nhập:
- GitHub username
- Repository name (từ bước trên)
- GitHub Personal Token

### **Trên Linux/Mac (Terminal hoặc WSL):**

```bash
cd "Sever API/my-ap"
chmod +x deploy.sh
./deploy.sh
```

Rồi nhập info giống như trên.

---

## Sau khi Script Chạy Xong

Script sẽ:
✅ Initialize git repo
✅ Configure git
✅ Add tất cả files
✅ Commit với message
✅ Push lên GitHub

**Kết quả:** Repository của bạn lên GitHub với code đầy đủ!

---

## Tiếp theo: Deploy lên Render

1. **Vào https://render.com**
   - Đăng nhập/Đăng ký bằng GitHub

2. **New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub
   - Chọn `authapi-v3` repository

3. **Configure:**
   - Name: `authapi`
   - Branch: `main` (hoặc `master`)
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**

4. **Environment Variables:**
   ```
   JWT_SECRET=please-change-jwt-secret-2025
   HMAC_SECRET=please-change-hmac-secret-2025
   ADMIN_PASSWORD=1
   PORT=10000
   ```

5. **Deploy!**
   - Click "Create Web Service"
   - Chờ 3-5 phút

6. **Copy URL mới:**
   - Khi xong: `https://authapi-xxx.onrender.com`
   - Cập nhật CONFIG_v3.5.json
   - Cập nhật tất cả client code

---

## 🆘 Troubleshooting

### "Permission denied" trên Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh
```

### "git: command not found"
Cài git trước:
- Windows: https://git-scm.com/download/win
- Mac: `brew install git`
- Linux: `apt install git`

### "GitHub Personal Token expired"
Tạo token mới tại: https://github.com/settings/tokens

### Script bị lỗi 
Thử chạy lệnh manual:
```bash
git init
git config user.email "deploy@authapi.local"
git config user.name "AuthAPI Deploy"
git remote add origin https://YOUR-USER:YOUR-TOKEN@github.com/YOUR-USER/authapi-v3.git
git add .
git commit -m "AuthAPI deployment"
git push -u origin main
```

---

## ✅ Xong!

Bây giờ bạn có:
- ✅ Code trên GitHub
- ✅ Deploy tự động trên Render
- ✅ Live API endpoint
- ✅ Backup tự động

**Tiếp theo:** Cập nhật tất cả client code với URL mới! 🎉
