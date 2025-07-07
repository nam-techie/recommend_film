# 🔥 Firebase Watch Party Debug Guide

## ✅ Đã setup xong:

1. **Firebase mode enabled** 
2. **Extensive logging added**
3. **Rules configured**: `.read: true, .write: true`

---

## 🔍 Cách check lỗi:

### 1. Mở Developer Console (F12)
- Nhấn F12 hoặc Right-click → Inspect
- Vào tab **Console**
- Refresh trang

### 2. Logs sẽ hiển thị:
```
🔥 useWatchParty: Starting firebase mode for room demo
✅ Firebase database initialized, setting up room listener
🔥 Firebase room data for demo: null
⚠️ Room demo not found in Firebase
```

### 3. Tạo room mới:
- Vào movie detail page
- Click **"Xem chung"**
- Tạo room → Check console logs:
```
🎬 Creating watch party room: { movieSlug: 'lilo-stitch', ... }
🏠 Creating room in firebase mode: { ... }
✅ Creating room in Firebase: { ... }
✅ Room created successfully in Firebase
```

---

## 🔥 Check Firebase Console:

### 1. Vào Firebase Console
- https://console.firebase.google.com
- Chọn project: **moviewiser-watch-party**

### 2. Vào Realtime Database → **Data** tab
- Sẽ thấy structure:
```
/rooms
  /room_1234567890_abc123def
    /movie: { slug: "lilo-stitch", title: "Lilo & Stitch" }
    /users: { user_xxx: { name: "Host Name" } }
    /messages: { welcome_msg: "Chào mừng..." }
    /playback: { currentTime: 0, isPlaying: false }
```

### 3. Nếu không thấy data:
- Check Rules tab: đảm bảo `.read: true, .write: true`
- Check Console logs có lỗi Firebase không
- Check environment variables có đúng không

---

## 🛠️ Common Issues:

### Issue 1: "Room not found"
**Nguyên nhân:** Trying to join room chưa được tạo
**Fix:** Tạo room trước, sau đó join

### Issue 2: "Firebase database not initialized"
**Nguyên nhân:** Environment variables sai hoặc thiếu
**Fix:** Check `.env.local` file

### Issue 3: "Permission denied"
**Nguyên nhân:** Firebase rules chặn
**Fix:** Set rules: `{ "rules": { ".read": true, ".write": true } }`

---

## 🎯 Test Flow:

1. **Mở 2 browser tabs**
2. **Tab 1**: Vào movie → "Xem chung" → Tạo room
3. **Tab 2**: Copy link room → Paste vào tab 2
4. **Check console logs** cả 2 tabs
5. **Test chat**: Type message → Check real-time sync
6. **Check Firebase Data tab**: Xem data có update không

---

## 📊 Expected Console Output:

### Successful flow:
```
🔥 useWatchParty: Starting firebase mode for room room_xxx
✅ Firebase database initialized, setting up room listener
🔥 Firebase room data for room_xxx: { movie: {...}, users: {...} }
✅ Room loaded successfully from Firebase
👤 Adding user Phương Nam (user_yyy) to room room_xxx
✅ User added to Firebase room
```

### Error flow:
```
❌ Firebase database not initialized
❌ Firebase room listener error: Error: permission_denied
❌ Failed to create room in Firebase: Error: ...
``` 