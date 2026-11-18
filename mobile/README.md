# Aloca Mobile

React Native CLI (không Expo) 0.76 + TypeScript + React Navigation, dùng chung backend với bản web.

```bash
cd mobile
npm install
npm start                 # Metro
npm run android           # emulator/thiết bị Android (cần Android Studio + JDK 17)
cd ios && bundle exec pod install && cd .. && npm run ios   # chỉ trên macOS
```

Địa chỉ backend: copy `.env.example` thành `.env` rồi sửa `API_URL` (Android emulator: `http://10.0.2.2:8080`; máy thật: IP LAN của máy chạy backend). Sau khi sửa chạy lại `npm start -- --reset-cache`.

- `src/navigation` stack + bottom tabs, `src/screens` các màn hình
- `src/api` gọi API, `src/store/session.ts` lưu phiên (AsyncStorage)

Chưa có: tạo kế hoạch bằng AI, bản đồ + thử thách, sửa hồ sơ, thông báo, push.
