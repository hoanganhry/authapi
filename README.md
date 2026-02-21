# 🔐 AuthAPI v3.3 ULTIMATE

Unlimited Key Management System - Free for everyone!

## ✨ Features

- ✅ Multi-user authentication
- ✅ UNLIMITED key creation - No limits!
- ✅ Same email for multiple accounts
- ✅ Custom key naming (alias)
- ✅ Bulk key creation (1-100 keys/request)
- ✅ Key verification & device tracking
- 💾 Auto backup every 6 hours
- 📊 Activity logging system
- 🏷️ Key alias/naming support
- 🔐 HMAC signature verification
- 🛡️ Anti-crash error handling

## 🚀 Quick Start

### Local Development

```bash
npm install
npm start
```

Server runs at: `http://localhost:10000`

### DeploymentRender

See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) for full instructions.

Quick deploy:
1. Push to GitHub
2. Connect to Render
3. Deploy!

## 📚 API Endpoints

### Auth
- `POST /api/register` - Register user
- `POST /api/login` - Login user
- `POST /api/admin-login` - Admin login

### Keys
- `POST /api/create-key` - Create single key
- `POST /api/bulk-create-keys` - Create multiple keys
- `GET /api/my-keys` - Get user keys
- `POST /api/verify-key` - Verify key (public)
- `POST /api/key-info` - Get key info

### Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/ban-user` - Ban user
- `GET /api/admin/logs` - Activity logs

## 🔧 Configuration

Copy `.env.example` to `.env` and update:

```bash
JWT_SECRET=your-secret
HMAC_SECRET=your-secret
ADMIN_PASSWORD=change-me
```

## 📊 Default Admin

- Username: `admin`
- Password: `1` (from ADMIN_PASSWORD env var)

**Change this immediately in production!**

## 🗄️ Data Files

- `keys.json` - Created keys data
- `users.json` - User accounts
- `devices.json` - Device tracking
- `activity_logs.json` - Activity logs (1000 latest)
- `packages.json` - Key packages
- `config.json` - System configuration

## 📁 Backup

Automatic backups created every 6 hours in `backups/` folder.
Old backups (>7 days) are automatically deleted.

## ⚙️ Environment Variables

```
PORT=10000
JWT_SECRET=your-jwt-secret
HMAC_SECRET=your-hmac-secret
ADMIN_PASSWORD=your-admin-password
API_URL=https://your-domain.com/api
```

## 📝 License

MIT

## 👨‍💻 Author

Created for unlimited key management needs.
