# 🚨 Firebase Permission Denied - Quick Fix

## Lỗi: `permission_denied at /rooms/demo`

**Nguyên nhân:** Firebase Realtime Database rules mặc định chặn tất cả truy cập.

## ⚡ Cách Fix (2 phút):

### 1. Mở Firebase Console
- Đi tới: https://console.firebase.google.com
- Chọn project của bạn
- Click **"Realtime Database"** ở sidebar trái

### 2. Chuyển sang tab "Rules"
- Trong Firebase Console → Realtime Database → **Rules** tab

### 3. Thay thế rules hiện tại:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### 4. Click "Publish"
- Đợi vài giây để rules được áp dụng
- Refresh trang web của bạn

## 🔒 Production Rules (sau này):

Khi deploy production, thay bằng rules an toàn hơn:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "users": {
          "$userId": {
            ".write": "$userId == auth.uid || auth == null"
          }
        },
        "messages": {
          ".write": true
        },
        "playback": {
          ".write": true
        }
      }
    }
  }
}
```

## 🛠️ Temporary Workaround

Nếu không muốn động đến Firebase ngay:

```typescript
// Trong components/pages/WatchPartyPage.tsx
mode: 'demo' // Thay vì 'firebase'
```

## ✅ Kiểm tra

Sau khi fix rules:
1. Mở Developer Console (F12)
2. Refresh trang
3. Không còn thấy lỗi `permission_denied`
4. Thấy "Firebase Real-time" trong header 