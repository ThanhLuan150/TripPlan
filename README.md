# Aloca Web

Bản web của app Aloca (chuyển từ React Native) + backend dùng chung + **trang quản trị (Admin)** cho vai trò `admin`.

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
npm run seed:sample   # tài khoản demouser / demo123, 1 kế hoạch mẫu, vài người trên bảng xếp hạng + nội dung bên dưới
npm run seed:content  # chỉ nội dung của app: 8 video YouTube thật, ảnh trang chủ (ảnh Wikimedia Commons), thông báo; bộ sưu tập nào đã có dữ liệu thì không đụng tới (thêm `-- --reset` để thay thế)
```

`.env` của cả hai thư mục đã được `.gitignore` bỏ qua; chỉ `.env.example` lên git.

**Gemini (chat AI + tạo kế hoạch):** lấy key miễn phí tại https://aistudio.google.com/apikey, đặt vào `API_KEY_CHAT`.
`MODEL_NAME` là model chính; `MODEL_FALLBACKS` (cách nhau bởi dấu phẩy) được thử lần lượt khi model chính quá tải,
hết quota hoặc bị Google ngừng — chuyện thường gặp ở gói free. Lỗi AI được ghi rõ trong log với tiền tố `[ai]`.

**MongoDB Atlas:** nếu log hiện `[db] MongoDB Atlas refused the connection`, thêm IP hiện tại của máy vào Atlas → Network Access.

**Ảnh (ảnh đại diện, ảnh thử thách):** không dùng Firebase nữa (gói free Spark của Firebase không còn Cloud Storage từ 02/2026).
Web nén ảnh (tối đa 1600px, JPEG) rồi gửi `POST /upload/image`; backend kiểm tra đúng là JPEG/PNG/WEBP/GIF, lưu trong MongoDB
(GridFS, collection `images.files` / `images.chunks`) và trả về link `GET /files/:id`. Khi deploy, đặt `PUBLIC_URL` để link ảnh dùng đúng domain.

## Trang quản trị (Admin)

Tài khoản `admin` (tạo bằng `npm run seed`) đăng nhập ở trang đăng nhập thường và được đưa tới `/admin/dashboard`.
Module admin (`web/src/features/admin`) được tải riêng, sau lớp chặn theo role, nên người dùng thường không tải nó. Mọi trang đều dùng **API thật** của backend
(`/admin/*`, yêu cầu role `admin`); không còn dữ liệu mock trong mã chạy thật (dữ liệu mẫu chỉ nằm trong `web/src/__tests__/fixtures`).

| Trang | Đường dẫn | Làm được gì |
| --- | --- | --- |
| Tổng quan | `/admin/dashboard` | số liệu chính + tăng trưởng 30 ngày, người dùng mới theo tháng, điểm đến phổ biến, hoạt động gần đây |
| Người dùng | `/admin/users`, `/admin/users/:id` | xem phần dưới |
| Chuyến đi | `/admin/trips` | tìm, lọc, xem chi tiết (lịch trình từng ngày), xóa |
| Thử thách | `/admin/challenges` | sửa tên / mô tả / điểm, xóa (kèm tiến độ của người dùng) |
| Trợ lý AI | `/admin/ai` | số cuộc trò chuyện, tin nhắn, người dùng đã chat, biểu đồ 14 ngày |
| Trang chủ app | `/admin/home` | quản lý ảnh trượt đầu trang và các gợi ý điểm đến (tải ảnh lên, thứ tự, đăng / ẩn) |
| Video | `/admin/videos` | thêm / sửa / xóa; chọn video hiện ở trang chủ, đăng hoặc ẩn |
| Thông báo | `/admin/notifications` | viết, sửa, xóa thông báo; nháp, đăng, hoặc hẹn ngày đăng |
| Báo cáo | `/admin/reports` | theo kỳ 7 / 30 / 90 ngày, xuất CSV |
| Cài đặt | `/admin/settings` | tên app, email hỗ trợ, hotline |
| Nhật ký hoạt động | `/admin/activity-logs` | đăng nhập, tạo kế hoạch, dùng AI, thao tác của admin…; xuất CSV |
| Kiểm duyệt | `/admin/moderation` | duyệt / từ chối nội dung bị báo cáo |
| Vai trò & quyền | `/admin/roles` | số thành viên mỗi vai trò, ma trận quyền (chỉ xem) |

### Quản lý người dùng

- **Danh sách:** thẻ thống kê (tổng, đang hoạt động, mới 30 ngày, bị khóa); tìm theo tên / tên đăng nhập / email (không phân biệt dấu); lọc theo vai trò, trạng thái, ngày đăng ký, hoạt động gần nhất; sắp xếp; chọn số dòng mỗi trang; chọn nhiều dòng và thao tác hàng loạt (khóa, mở khóa, xuất CSV); thêm người dùng.
- **Chi tiết:** hồ sơ, 5 thống kê (chuyến đi, chuyến đã xong, thử thách, điểm, cuộc chat AI) và 4 tab: Tổng quan, Kế hoạch chuyến đi, Thử thách & thành tích, Lịch sử hoạt động.
- **Thao tác:** sửa hồ sơ (họ tên, email, số điện thoại, ảnh), đổi vai trò, khóa (bắt buộc nhập lý do), mở khóa, xóa. Không thể đổi / khóa / xóa chính mình; muốn khóa hoặc xóa một admin khác phải hạ vai trò trước.
- **Trạng thái tài khoản** (`User.isActive`): `active`, `notActive` (chưa xác minh email), `suspended` (admin khóa), `delete` (đã xóa). Tài khoản bị khóa hoặc xóa không đăng nhập được (khóa trả 403 kèm lý do), các phiên đang dùng bị đăng xuất, và biến mất khỏi bảng xếp hạng.

### Đồng bộ với app người dùng

Những gì admin quản lý được app người dùng đọc trực tiếp:

| Admin | App người dùng |
| --- | --- |
| Ảnh trượt và gợi ý điểm đến (`/admin/home`) | `GET /home` (công khai) → ảnh trượt và hàng "Có thể bạn sẽ thích?" ở Trang chủ; bấm gợi ý mở màn lên kế hoạch cho tỉnh đó; chưa có dữ liệu thì hiện dòng thông báo |
| Video (`/admin/videos`) | `GET /videos` (`?home=1`: chỉ video ở trang chủ) → màn Trang chủ và màn Video; chưa có video thì hiện dòng thông báo |
| Thông báo (`/admin/notifications`) | `GET /announcements` → màn Thông báo; số trên chuông ở Trang chủ là số thông báo chưa mở (trạng thái đã đọc lưu trên thiết bị) |
| Cài đặt (`/admin/settings`) | `GET /settings` (công khai) |
| Báo cáo nội dung (người dùng gửi `POST /reports`) | hàng chờ ở `/admin/moderation` |
| Khóa / xóa / đổi vai trò | tác dụng ngay khi gọi API tiếp theo; bảng xếp hạng chỉ có người dùng thường đang hoạt động |

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
├── helpers/mongoose.js    query Mongoose giả (select / sort / limit / lean)
├── unit/
│   ├── config/            env (giá trị mặc định, MODEL_FALLBACKS...), db (kết nối, thử lại, giải thích lỗi Atlas)
│   ├── controllers/       từng controller (cả admin và content): lấy đúng dữ liệu từ req, gọi service, trả 200 / chuyển lỗi
│   ├── middleware/        auth (token hết hạn → cấp lại, cập nhật lastActiveAt), requireRole, ownership, logActivity, errorHandler
│   ├── models/            schema: trường bắt buộc, giá trị mặc định, enum role, hook pre-save
│   ├── repositories/      câu truy vấn Mongoose (lọc kế hoạch đã xoá, chủ sở hữu, sort, aggregate xếp hạng chỉ gồm người dùng thường), GridFS, truy vấn của admin / nội dung
│   ├── seed/              seedAdmin, seedSampleData, lệnh `npm run seed`
│   ├── services/          toàn bộ nghiệp vụ (đăng ký/đăng nhập, chat AI, sinh/lưu kế hoạch, thử thách, ảnh, quản lý người dùng, số liệu admin, video / thông báo / cài đặt, nhật ký)
│   ├── utils/             JWT, Gemini + model dự phòng, nhận dạng ảnh, geocode, mailer...
│   └── server.test.js
└── integration/           gọi HTTP thật vào Express app bằng supertest (route, token, phân quyền,
                           upload ảnh, CORS, log, định dạng lỗi JSON), chỉ mock tầng repository
```

Biến môi trường dùng khi test nằm trong `vitest.config.js` (không đọc giá trị thật từ `.env`).

### Web — `web/src/__tests__/` (cùng cấu trúc với `src/`)

```
src/__tests__/
├── setup.ts               jest-dom, i18n, dọn DOM / localStorage / toast sau mỗi test; mock sẵn API admin
├── fixtures/admin/        dữ liệu mẫu của API admin (chỉ dùng trong test) + mockAdminApi()
├── utils/render.tsx       renderWithProviders (React Query + router + toast), lỗi axios giả
├── app/                   router: URL → màn hình, chặn khi chưa đăng nhập, chuyển hướng
├── components/            layout (MainLayout, AssistantLayout, BackHeader, LanguageSwitcher), UI
├── features/
│   ├── api/, hooks/       các API và hook React Query của từng tính năng (cả API admin)
│   ├── auth/              trang đăng nhập / đăng ký / OTP / quên mật khẩu, session, validation
│   ├── assistant/         trang chat, lịch sử trò chuyện, chatCache
│   ├── trips/             danh sách, tạo, sinh bằng AI, chi tiết + chụp ảnh thử thách, bản đồ, kiểm tra vị trí
│   ├── home/, profile/, ranking/, data/
│   ├── admin/             layout, trang danh sách, người dùng (lọc, chọn nhiều, dialog, CSV), các trang còn lại, dữ liệu mẫu
├── lib/                   apiClient + interceptor, upload (nén ảnh), location, date, text, config, i18n
├── locales/               vi.json / en.json cùng key; mọi key dùng trong code đều có bản dịch
└── main.test.tsx
```

Page được test như người dùng thật (Testing Library): gõ, bấm, xem thông báo, kiểm tra trang chuyển tới đâu; API được mock.

### Ngưỡng coverage

CI fail nếu coverage thấp hơn **95%** (statements, branches, functions, lines), tính trên **toàn bộ** mã nguồn.
Lần chạy gần nhất: backend 487 test, 99,7% statements / 96,7% branches / 100% functions; web 736 test, 99,2% statements / 96,5% branches / 97,7% functions.

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
services/        logic nghiệp vụ (đăng ký/đăng nhập, gọi Gemini, lưu kế hoạch, cộng điểm thử thách,
                 adminService: người dùng + số liệu, contentService: video / thông báo / cài đặt / báo cáo nội dung, activityLogService)
repositories/    toàn bộ truy vấn Mongoose
models/          schema Mongoose (User, TripPlan, TripDay, Challenge, UserChallengeProgress, ChatAi, Question, Response, Notification,
                 ActivityLog, Announcement, ContentReport, Setting, Showcase, Video)
middleware/      auth (JWT + tự cấp lại access token), requireRole, ownership (chủ sở hữu trip/chat/challenge), logActivity (ghi nhật ký), errorHandler
seed/            seedAdmin, seedSampleData, index.js (chạy bằng npm run seed / seed:sample)
utils/           jwt, mailer, gemini, geocode (HERE), HttpError, asyncHandler, ...
```

Đường dẫn API giữ nguyên như cũ. Tên model Mongoose (`Tripplan`, `UserChallengProgress`) cũng giữ nguyên để dùng đúng collection có sẵn.

### Phân quyền

Role là chuỗi trên User: `user` (mặc định) hoặc `admin`.

| Route | Quyền |
| --- | --- |
| `/auth/*` | public |
| `GET /rankings/*` | public (chỉ người dùng thường đang hoạt động) |
| `GET /home`, `GET /videos`, `GET /settings` | public |
| `GET /announcements`, `POST /reports` | user, admin |
| `/admin/*` | **admin** |
| `POST /user/profile` | user, admin |
| `POST /user/:id` (xoá tài khoản) | user: chỉ tài khoản của mình · admin: bất kỳ `:id` |
| `/chat/*` | user, admin; `/:id` phải là cuộc trò chuyện của mình |
| `/trip-plan/*` | user, admin; `/:id` phải là kế hoạch của mình |
| `/challenge/*` | user, admin; `chaId` phải thuộc kế hoạch của mình |

### API quản trị — `/admin/*` (role admin)

| Nhóm | Endpoint |
| --- | --- |
| Tổng quan | `GET /dashboard`, `GET /alerts`, `GET /reports?period=7d\|30d\|90d`, `GET /ai`, `GET /logs`, `GET /roles` |
| Người dùng | `GET /users`, `POST /users`, `GET /users/:id`, `PATCH /users/:id` (`fullname`, `email`, `phone`, `image`, `role`, `status`, `suspendReason`), `DELETE /users/:id` (xóa mềm), `POST /users/bulk-status` |
| Chuyến đi | `GET /trips`, `GET /trips/:id`, `DELETE /trips/:id` (xóa mềm) |
| Thử thách | `GET /challenges`, `PATCH /challenges/:id`, `DELETE /challenges/:id` |
| Kiểm duyệt | `GET /moderation`, `PATCH /moderation/:id` (`approved` / `rejected`) |
| Video | `GET /videos`, `POST /videos`, `PATCH /videos/:id`, `DELETE /videos/:id` |
| Trang chủ app | `GET /showcase`, `POST /showcase` (`kind`: `banner` hoặc `suggestion`, `imageUrl`, `title`, `location`, `status`, `sortOrder`), `PATCH /showcase/:id`, `DELETE /showcase/:id` |
| Thông báo | `GET /announcements`, `POST /announcements`, `PATCH /announcements/:id`, `DELETE /announcements/:id` |
| Cài đặt | `GET /settings`, `PUT /settings` (`appName`, `supportEmail`, `hotline`) |

Mỗi thao tác thay đổi dữ liệu đều được ghi vào nhật ký hoạt động (`ActivityLog`), cùng với đăng nhập, kích hoạt tài khoản, tạo kế hoạch, dùng AI, hoàn thành thử thách và cập nhật hồ sơ của người dùng.
Danh sách trả tối đa 1000 bản ghi mới nhất.

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
- Tài khoản bị admin khóa (`suspended`) không đăng nhập hay quên mật khẩu được (403); phiên cũ bị thu hồi. `lastLoginAt` / `lastActiveAt` ghi lần hoạt động gần nhất.
- Giới hạn số request theo IP (`express-rate-limit`): mọi route 600 request / 15 phút, riêng `/auth/*` (đăng nhập, mã xác thực, quên mật khẩu) 40 request / 15 phút; quá giới hạn trả 429 `{ message }` kèm header `RateLimit-*` / `Retry-After`. Chỉnh bằng `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_MAX`; đặt `TRUST_PROXY=1` khi API chạy sau nginx / load balancer để đếm đúng IP thật. Tắt khi chạy test.
- Lỗi luôn trả JSON `{ message }`.
- Khoá HERE API được chuyển từ code vào `.env` (`HERE_API_KEY`).

## Web — `web/src`

```
app/          App.tsx (providers), router.tsx, routes.ts (đường dẫn), RequireAuth.tsx (guard theo đăng nhập / role)
features/     mỗi domain một thư mục: auth, home, assistant (chat), trips, ranking, profile, videos, about, admin
              bên trong: api/  hooks/  pages/  components/  store/  data/  types.ts
              admin/ (trang quản trị): api.ts, hooks/, pages/, components/ (+ layout/), users/ (quản lý người dùng), videos/, notifications/, challenges/
components/   layout/ (MainLayout, AssistantLayout, Page, BackHeader, LanguageSwitcher)
              ui/ (Spinner, Toast, ConfirmModal, Field, SectionHeader)
hooks/        useProfile (người dùng đang đăng nhập), useClickOutside
lib/          apiClient (axios + token + tự lưu token mới), i18n, firebase, storage, date, location, config
locales/      vi.json, en.json
```

- Mở web luôn vào trang giới thiệu (landing, `/`), kể cả khi đã đăng nhập; nút "Bắt đầu" vào trang chủ nếu đã đăng nhập, ngược lại vào trang đăng nhập. Đăng xuất, hoặc phiên đăng nhập hết hạn (backend trả 401), cũng quay về landing.
- Trang quản trị nằm dưới `/admin/*`, chỉ vào được với role `admin` (người dùng thường bị đưa về trang chủ).
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
