# Aloca Web

Bản web của app Aloca (chuyển từ React Native) + backend dùng chung.

```
Aloca-Web/
├── backend/   Express + MongoDB (Mongoose)
├── web/       React 18 + TypeScript + Vite + Tailwind CSS v4 + i18next (vi, en)
└── _backup/   code trước khi tái cấu trúc (không đưa lên git, xoá khi không cần)
```

## Chạy

```bash
cd backend
yarn install          # cài vào node_modules (nodeLinker: node-modules)
cp .env.example .env  # rồi điền giá trị
npm run dev           # http://localhost:8080
```

```bash
cd web
npm install
npm run dev           # http://localhost:5173 (gọi backend theo VITE_API_URL trong web/.env)
```

Dữ liệu mẫu (tuỳ chọn):

```bash
npm run seed          # tài khoản admin từ ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:sample   # tài khoản demouser / demo123, 1 kế hoạch mẫu, vài người trên bảng xếp hạng
```

`.env` của cả hai thư mục đã được `.gitignore` bỏ qua; chỉ `.env.example` lên git.

**Gemini (chat AI + tạo kế hoạch):** lấy key miễn phí tại https://aistudio.google.com/apikey, đặt vào `API_KEY_CHAT`.
`MODEL_NAME` là model chính; `MODEL_FALLBACKS` (cách nhau bởi dấu phẩy) được thử lần lượt khi model chính quá tải,
hết quota hoặc bị Google ngừng — chuyện thường gặp ở gói free. Lỗi AI được ghi rõ trong log với tiền tố `[ai]`.

**MongoDB Atlas:** nếu log hiện `[db] MongoDB Atlas refused the connection`, thêm IP hiện tại của máy vào Atlas → Network Access.

**Ảnh (ảnh đại diện, ảnh thử thách):** không dùng Firebase nữa (gói free Spark của Firebase không còn Cloud Storage từ 02/2026).
Web nén ảnh (tối đa 1600px, JPEG) rồi gửi `POST /upload/image`; backend kiểm tra đúng là JPEG/PNG/WEBP/GIF, lưu trong MongoDB
(GridFS, collection `images.files` / `images.chunks`) và trả về link `GET /files/:id`. Khi deploy, đặt `PUBLIC_URL` để link ảnh dùng đúng domain.

## Backend — `backend/src`

```
server.js        khởi động: kết nối DB + listen
app.js           express app: json, cors, morgan, routes, errorHandler
config/          env.js (đọc .env một chỗ), db.js (kết nối MongoDB)
routes/          Express router — mỗi route ghi rõ quyền cần có ngay tại dòng đó
controllers/     lớp HTTP mỏng: lấy req -> gọi service -> trả JSON
services/        logic nghiệp vụ (đăng ký/đăng nhập, gọi Gemini, lưu kế hoạch, cộng điểm thử thách)
repositories/    toàn bộ truy vấn Mongoose
models/          schema Mongoose (User, TripPlan, TripDay, Challenge, UserChallengeProgress, ChatAi, Question, Response, Notification)
middleware/      auth (JWT + tự cấp lại access token), requireRole, ownership (chủ sở hữu trip/chat/challenge), errorHandler
seed/            seedAdmin, seedSampleData, index.js (chạy bằng npm run seed / seed:sample)
utils/           jwt, mailer, gemini, geocode (HERE), HttpError, asyncHandler, ...
```

Đường dẫn API giữ nguyên như cũ. Tên model Mongoose (`Tripplan`, `UserChallengProgress`) cũng giữ nguyên để dùng đúng collection có sẵn.

### Phân quyền

Role là chuỗi trên User: `user` (mặc định) hoặc `admin`.

| Route | Quyền |
| --- | --- |
| `/auth/*` | public |
| `GET /rankings/*` | public |
| `POST /user/profile` | user, admin |
| `POST /user/:id` (xoá tài khoản) | user: chỉ tài khoản của mình · admin: bất kỳ `:id` |
| `/chat/*` | user, admin; `/:id` phải là cuộc trò chuyện của mình |
| `/trip-plan/*` | user, admin; `/:id` phải là kế hoạch của mình |
| `/challenge/*` | user, admin; `chaId` phải thuộc kế hoạch của mình |

### Thay đổi hành vi so với code cũ

- `POST /trip-plan/` (sinh kế hoạch) và `/challenge/*` giờ **bắt buộc đăng nhập**. Web luôn gửi token nên không ảnh hưởng.
- Đặt lại mật khẩu: `POST /auth/reset-password/` chỉ được chấp nhận trong 15 phút sau khi nhập đúng mã. Trước đây ai biết email cũng đổi được mật khẩu.
- Thử thách chỉ cộng điểm **một lần**, kể cả khi chụp lại ảnh.
- Xem / xoá kế hoạch hoặc cuộc chat của người khác giờ trả 404 (trước đây xem được).
- Kiểm tra trùng ngày khi sinh kế hoạch chỉ so với kế hoạch của chính người dùng.
- Sửa lỗi:
  - Xoá chat không xoá tin nhắn.
  - Gửi lại mã xác thực cập nhật nhầm người dùng.
  - Token hết hạn làm server lỗi 500.
  - `POST /auth/refresh-token` không chạy.
  - Không tìm được toạ độ địa điểm thì lưu kế hoạch bị lỗi.
- Lỗi luôn trả JSON `{ message }`.
- Khoá HERE API được chuyển từ code vào `.env` (`HERE_API_KEY`).

## Web — `web/src`

```
app/          App.tsx (providers), router.tsx, routes.ts (đường dẫn), RequireAuth.tsx (guard theo đăng nhập / role)
features/     mỗi domain một thư mục: auth, home, assistant (chat), trips, ranking, profile, videos, about
              bên trong: api/  hooks/  pages/  components/  store/  data/  types.ts
components/   layout/ (MainLayout, AssistantLayout, Page, BackHeader, LanguageSwitcher)
              ui/ (Spinner, Toast, ConfirmModal, Field, SectionHeader)
hooks/        useProfile (người dùng đang đăng nhập), useClickOutside
lib/          apiClient (axios + token + tự lưu token mới), i18n, firebase, storage, date, location, config
locales/      vi.json, en.json
```

- Dữ liệu từ API dùng React Query, không dùng Redux. Phiên đăng nhập lưu trong localStorage (`features/auth/store/session.ts`).
- Import dùng alias `@/` (ví dụ `@/features/trips/hooks/useTrips`).
- **Ngôn ngữ:** mặc định tiếng Việt. Người dùng đổi VI/EN ở header (desktop), trang Tài khoản, trang đăng nhập; lựa chọn được lưu lại.
  Thêm ngôn ngữ: tạo `locales/<mã>.json` cùng các key với `vi.json`, rồi khai báo trong `lib/i18n.ts`.
- Nếu deploy web lên HTTPS thì backend cũng phải có HTTPS (trình duyệt chặn mixed content).

## Bảng chuyển đổi từ mobile

| Mobile | Web |
| --- | --- |
| @react-navigation (stack, bottom tabs, tab-view) | react-router-dom; tab dưới trên điện thoại, thanh menu trên ở màn hình rộng |
| AsyncStorage | localStorage (giữ nguyên các key) |
| react-native-toast-message | `components/ui/Toast.tsx` |
| react-native-maps | Leaflet + OpenStreetMap |
| react-native-video / swiper / date-picker / image-picker | `<video>` / slider tự viết / `<input type="date">` / `<input type="file">` |
| @react-native-community/geolocation | `navigator.geolocation` |
| Push notification (FCM) | không có trên web |
