# Aloca Web

Bản web của app Aloca (chuyển từ React Native) + backend dùng chung.

```
Aloca-Web/
├── backend/   Express + MongoDB (Mongoose)
├── web/       React 18 + TypeScript + Vite + Tailwind CSS v4 + i18next (vi, en)
├── deploy/    deploy.sh chạy trên server (CD)
├── .github/   CI/CD (GitHub Actions), Dependabot
├── docker-compose.yml
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

## Kiểm thử (unit test)

Cả hai thư mục dùng [Vitest](https://vitest.dev). Không cần MongoDB, Gemini, HERE hay Gmail: database và dịch vụ ngoài đều được mock.
**Mọi file nguồn đều có test**, và toàn bộ test nằm trong thư mục `__tests__`.

```bash
cd backend
yarn test              # chạy một lần
yarn test:watch        # chạy lại khi sửa code
yarn test:coverage     # kèm báo cáo coverage (backend/coverage/index.html)
yarn lint
```

```bash
cd web
npm test
npm run test:watch
npm run test:coverage  # web/coverage/index.html
npm run lint
npm run typecheck
```

### Backend — `backend/__tests__/`

```
__tests__/
├── helpers/http.js        req / res giả, chạy middleware & controller
├── unit/
│   ├── config/            env (giá trị mặc định, MODEL_FALLBACKS...), db (kết nối, thử lại, giải thích lỗi Atlas)
│   ├── controllers/       từng controller: lấy đúng dữ liệu từ req, gọi service, trả 200 / chuyển lỗi
│   ├── middleware/        auth (token hết hạn → cấp lại), requireRole, ownership, errorHandler
│   ├── models/            schema: trường bắt buộc, giá trị mặc định, enum role, hook pre-save
│   ├── repositories/      câu truy vấn Mongoose (lọc kế hoạch đã xoá, chủ sở hữu, sort, aggregate xếp hạng), GridFS
│   ├── seed/              seedAdmin, seedSampleData, lệnh `npm run seed`
│   ├── services/          toàn bộ nghiệp vụ (đăng ký/đăng nhập, chat AI, sinh/lưu kế hoạch, thử thách, ảnh)
│   ├── utils/             JWT, Gemini + model dự phòng, nhận dạng ảnh, geocode, mailer...
│   └── server.test.js
└── integration/           gọi HTTP thật vào Express app bằng supertest (route, token, phân quyền,
                           upload ảnh, CORS, log, định dạng lỗi JSON), chỉ mock tầng repository
```

Biến môi trường dùng khi test nằm trong `vitest.config.js` (không đọc giá trị thật từ `.env`).

### Web — `web/src/__tests__/` (cùng cấu trúc với `src/`)

```
src/__tests__/
├── setup.ts               jest-dom, i18n, dọn DOM / localStorage / toast sau mỗi test
├── utils/render.tsx       renderWithProviders (React Query + router + toast), lỗi axios giả
├── app/                   router: URL → màn hình, chặn khi chưa đăng nhập, chuyển hướng
├── components/            layout (MainLayout, AssistantLayout, BackHeader, LanguageSwitcher), UI
├── features/
│   ├── api/, hooks/       các API và hook React Query của từng tính năng
│   ├── auth/              trang đăng nhập / đăng ký / OTP / quên mật khẩu, session, validation
│   ├── assistant/         trang chat, lịch sử trò chuyện, chatCache
│   ├── trips/             danh sách, tạo, sinh bằng AI, chi tiết + chụp ảnh thử thách, bản đồ, kiểm tra vị trí
│   ├── home/, profile/, ranking/, data/
├── lib/                   apiClient + interceptor, upload (nén ảnh), location, date, text, config, i18n
├── locales/               vi.json / en.json cùng key; mọi key dùng trong code đều có bản dịch
└── main.test.tsx
```

Page được test như người dùng thật (Testing Library): gõ, bấm, xem thông báo, kiểm tra trang chuyển tới đâu; API được mock.

### Ngưỡng coverage

CI fail nếu coverage thấp hơn **95%** (statements, branches, functions, lines), tính trên **toàn bộ** mã nguồn.
Hiện tại: backend 100%, web ~99,9% statements / ~98,6% branches.

## CI/CD (GitHub Actions)

```
PR / push dev ──► CI ─┬─ backend: lint → test + coverage gate
                      ├─ web: lint → typecheck → test + coverage gate → build
                      ├─ docker: build thử 2 image
                      └─ npm audit (chỉ báo cáo)
push main / tag v* ─► CD: CI ─► build & push image lên GHCR ─► deploy server (SSH) ─► health check / rollback
```

| Workflow | Khi nào | Làm gì |
| --- | --- | --- |
| `ci.yml` | PR vào `main`/`dev`, push `dev` | lint, typecheck, test (coverage gate), build web, build thử Docker, audit |
| `cd.yml` | push `main`, tag `v*.*.*`, chạy tay | chạy lại CI → image `ghcr.io/<owner>/tripplan-backend` và `-web` (tag `sha-xxxxxxx`, `latest`, version) kèm SBOM/provenance → deploy |
| `codeql.yml` | PR, push, mỗi thứ Hai | quét bảo mật mã nguồn (Security → Code scanning) |
| `dependency-review.yml` | PR | chặn PR thêm thư viện có lỗ hổng high/critical |
| `dependabot.yml` | hằng tuần | PR cập nhật thư viện npm, GitHub Actions, Docker base image (vào `dev`) |

**Nên bật trên GitHub:** Settings → Branches → bảo vệ `main` (và `dev`): bắt buộc PR, bắt buộc các check `Backend · lint & test`, `Web · lint, typecheck, test & build`, `Docker · backend`, `Docker · web`.

### Docker

```bash
docker compose up --build   # backend :8080, web :80 — cần backend/.env
```

- `backend/Dockerfile`: Node 22, chỉ cài dependency runtime (`yarn workspaces focus --production`), chạy bằng user `node`, healthcheck `GET /health`.
- `web/Dockerfile`: build Vite rồi phục vụ bằng nginx (không chạy root, cổng 8080 trong container), SPA fallback, cache `/assets/` 1 năm, header bảo mật. `VITE_API_URL` được gắn lúc build.

### Bật deploy tự động

Job deploy chỉ chạy khi có biến `DEPLOY_HOST`. Trên server (vd. EC2 Ubuntu): cài Docker + compose plugin, tạo `~/tripplan/backend/.env` (từ `backend/.env.example`). Rồi trong GitHub → Settings → Secrets and variables → Actions:

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Variable | `DEPLOY_HOST` | IP / domain của server |
| Variable | `DEPLOY_USER` | user SSH (mặc định `ubuntu`) |
| Variable | `DEPLOY_PATH` | thư mục trên server (mặc định `tripplan`, tính từ home) |
| Variable | `VITE_API_URL` | URL backend mà web gọi, vd. `https://api.example.com` |
| Variable | `PUBLIC_API_URL` / `PUBLIC_WEB_URL` | (tuỳ chọn) để smoke test `/health` và hiện link trên GitHub |
| Secret | `DEPLOY_SSH_KEY` | private key SSH dành riêng cho deploy |
| Secret | `DEPLOY_KNOWN_HOSTS` | kết quả `ssh-keyscan <DEPLOY_HOST>` (chống giả mạo server) |
| Secret | `GHCR_READ_TOKEN` | (nếu package GHCR để private) PAT quyền `read:packages` |

Có thể thêm *required reviewers* cho environment `production` để mỗi lần deploy phải duyệt tay.
`deploy/deploy.sh` pull image theo commit, đợi cả 2 container `healthy`, nếu không thì tự quay về bản trước.
Muốn rollback tay: mở lần chạy CD cũ trên tab Actions → *Re-run all jobs*.

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
  - Access token hết hạn luôn bị trả 401 "session expired" dù refresh token còn hạn (payload JWT có `exp` dạng số bị hiểu là "đã hết hạn"), nên tính năng tự cấp lại token không bao giờ chạy.
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

- Mở web luôn vào trang giới thiệu (landing, `/`), kể cả khi đã đăng nhập; nút "Bắt đầu" vào trang chủ nếu đã đăng nhập, ngược lại vào trang đăng nhập. Đăng xuất, hoặc phiên đăng nhập hết hạn (backend trả 401), cũng quay về landing.
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
