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
Lần chạy gần nhất: backend 537 test, 99,7% statements / 96,7% branches / 100% functions; web 736 test, 99,2% statements / 96,5% branches / 97,7% functions.

## Kiểm thử tự động (automation test) — `automation/`

Khác unit test (nằm trong từng project), automation test chạy sản phẩm hoàn chỉnh từ bên ngoài. Mỗi thư mục con là một project riêng, có `package.json` và công cụ riêng, nên app không phải cài thêm thư viện test.

| Thư mục | Kiểm thử | Công cụ | Trạng thái |
|---|---|---|---|
| [`automation/web`](automation/web/README.md) | web app trong trình duyệt, backend được mock | Cypress | xong: mọi màn hình, mọi feature |
| `automation/backend` | REST API | chưa chọn | chưa làm |
| `automation/mobile` | app React Native | chưa chọn (Maestro / Detox) | chưa làm |

```powershell
cd automation\web
npm install        # một lần (và npm install trong web\ — app được test)
npm run cypress:run   # build app, chạy server, chạy toàn bộ spec (không hiện cửa sổ)
```

Chi tiết lệnh, cách tổ chức và cách viết test mới: [`automation/web/README.md`](automation/web/README.md).

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
                 ActivityLog, Announcement, ContentReport, Setting, Showcase, Video, FavoriteTrip, TripNote, TripAiProposal)
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
| `POST /destinations/recommend`, `GET|PATCH|DELETE /destinations/history[/:id]` | user, admin; chỉ đọc / sửa / xóa gợi ý của chính mình (người khác 404) |
| `POST /trip-plan/:id/places` | user, admin; `:id` phải là kế hoạch của mình (thêm một địa điểm vào một ngày) |
| `GET /public-trip`, `GET /public-trip/:id`, `GET /shared/:token` | public, chỉ đọc |
| `POST /public-trip/:id/copy` | user, admin |
| `/challenge/*` | user, admin; `chaId` phải thuộc kế hoạch của mình |

### Sao chép chuyến đi (Duplicate Trip)

`POST /trip-plan/:id/duplicate` (user, admin; `:id` phải là kế hoạch của mình) tạo bản sao của một kế hoạch.

- Trả 201 `{ message, tripId, nameTrip }`. Kế hoạch không tồn tại, của người khác hoặc `:id` không hợp lệ trả 404; không có token trả 401.
- Sao chép thông tin cơ bản (địa điểm, ngày đi/về, chi phí), các ngày và thử thách (địa điểm, toạ độ, điểm). Mọi bản ghi đều có ID mới, người gọi là chủ sở hữu, tiến độ thử thách bắt đầu lại (chưa hoàn thành, không chép ảnh check-in).
- Kế hoạch gốc chỉ được đọc, không bị thay đổi.
- Tên bản sao là `<tên> (bản sao)`, nếu trùng thì `(bản sao 2)`, `(bản sao 3)`... Nếu lỗi giữa chừng, bản sao dở dang bị xoá mềm và lỗi được trả về.
- Ghi nhật ký hoạt động với action `createTrip`.
- Web (`TripListPage`) và mobile (tab "Kế hoạch") có nút sao chép cạnh nút xoá, kèm thông báo thành công / thất bại.

### Chuyến đi yêu thích (Favorite Trip)

Quan hệ yêu thích lưu ở collection riêng `favoritetrips` (`userId`, `tripId`, `createdAt`) với unique index `(userId, tripId)`, nên không có dữ liệu trùng và danh sách thuộc về từng tài khoản.

| Endpoint | Mô tả |
|---|---|
| `GET /trip-plan/favorites` | Danh sách yêu thích của tài khoản đang đăng nhập (mới nhất trước). Chuyến đi đã xoá bị loại khỏi danh sách |
| `POST /trip-plan/:id/favorite` | Thêm yêu thích (idempotent, gọi lại không tạo bản ghi mới). `:id` phải là kế hoạch của mình, nếu không trả 404 |
| `DELETE /trip-plan/:id/favorite` | Bỏ yêu thích. Chỉ xoá bản ghi của chính người gọi; vẫn dùng được khi chuyến đi đã bị xoá |

- Không có token trả 401; `:id` không hợp lệ trả 404.
- Web (`TripListPage`: tab "Yêu thích", nút trái tim; `TripDetailPage`: nút trái tim) và mobile (tab "Kế hoạch": tab "Yêu thích", nút trái tim) cập nhật ngay khi thao tác, hoàn tác nếu lỗi, và có trạng thái loading / rỗng / lỗi.
- Không bao gồm Favorite Destination.

### Xuất lịch trình PDF (Export Trip to PDF)

`GET /trip-plan/:id/export-pdf?lang=vi|en` (user, admin; `:id` phải là kế hoạch của mình) trả file PDF của kế hoạch.

- Trả 200 `application/pdf`, `Content-Disposition: attachment` với tên file `<tên chuyến đi>.pdf` (ký tự không hợp lệ bị thay bằng khoảng trắng). Kế hoạch không tồn tại, của người khác, đã xoá hoặc `:id` không hợp lệ trả 404 (cùng middleware `ownTrip`); không có token trả 401.
- Nội dung: tên, địa điểm, ngày đi/về, tổng chi phí; từng ngày (tiêu đề, thứ/ngày, chi phí) với các hoạt động đánh số theo thứ tự lưu và địa điểm. Chuyến đi chưa có lịch trình hoặc ngày chưa có hoạt động vẫn xuất được, kèm dòng thông báo. Có số trang, khổ A4 để in.
- Dùng lại `getTripDetail`, chỉ đọc, không ghi gì vào database. PDF tạo bằng `pdfkit`, font DejaVu Sans (gói `dejavu-fonts-ttf`) để hiển thị tiếng Việt.
- Web: nút "Xuất PDF" ở trang chi tiết chuyến đi (tải file theo ngôn ngữ đang chọn). Mobile: nút "Xuất PDF" ở màn chi tiết, tải file kèm token bằng `react-native-blob-util` rồi mở bằng trình xem PDF của hệ thống (cần build lại app; iOS cần `pod install`). Chưa làm chia sẻ PDF hay đồng bộ file.

### Chia sẻ chuyến đi (Trip Sharing)

| Endpoint | Mô tả |
| --- | --- |
| `GET /trip-plan/:id/share` | Trạng thái chia sẻ (`isShared`, `permission`, `shareToken`, `sharedAt`). Chỉ chủ sở hữu (`ownTrip`, người khác 404, không token 401) |
| `POST /trip-plan/:id/share` | Bật chia sẻ, tạo link. Idempotent: đang bật thì trả lại cùng link |
| `DELETE /trip-plan/:id/share` | Tắt chia sẻ: xoá token, link cũ vô hiệu vĩnh viễn (bật lại sẽ ra link mới) |
| `GET /shared/:token` | **Công khai** (không cần đăng nhập, có rate limit), chỉ đọc. Token sai, không tồn tại, đã thu hồi hoặc chuyến đi đã xoá đều trả cùng một 404 |

- Token là 32 byte ngẫu nhiên (`crypto.randomBytes`, base64url 43 ký tự), không đoán được; sai định dạng bị từ chối trước khi chạm database. Phản hồi công khai `Cache-Control: no-store`.
- Quyền hiện có: `view` (chỉ xem). Link không có route ghi nào; sửa/xoá vẫn đòi đăng nhập + `ownTrip`. Không có cộng tác chỉnh sửa.
- Người xem link chỉ thấy kế hoạch (tên, địa điểm, ngày, chi phí, hoạt động) qua whitelist trường. Không lộ `userId`/thông tin chủ, tiến độ hoàn thành, ảnh check-in hay cấu hình chia sẻ.
- Web: nút "Chia sẻ" ở trang chi tiết (bật/tắt, trạng thái, sao chép link) và trang công khai `/shared/:token`.
- Mobile: nút chia sẻ ở màn chi tiết chuyến đi (bật/tắt, trạng thái, gửi/sao chép link qua share sheet của hệ thống). Link mở trang web, nên đặt `WEB_URL` (địa chỉ web) ở backend để API trả sẵn `shareUrl` đầy đủ; nếu để trống, mobile dùng tạm địa chỉ API.

### Chế độ hiển thị và khám phá (Trip Visibility)

Mỗi kế hoạch có `visibility`: `private` (mặc định, chỉ chủ sở hữu) hoặc `public` (ai cũng đọc được, chỉ đọc).

| Endpoint | Mô tả |
| --- | --- |
| `GET /trip-plan/:id/visibility` | Trạng thái hiện tại. Chỉ chủ sở hữu (`ownTrip`) |
| `PUT /trip-plan/:id/visibility` | `{ visibility: "public" \| "private" }`. Chỉ chủ sở hữu |
| `GET /public-trip?page&limit` | **Công khai**, danh sách thẻ kế hoạch công khai (tối đa 50 mỗi trang) |
| `GET /public-trip/:id` | **Công khai**, chỉ đọc. Kế hoạch riêng tư / đã xoá / không tồn tại đều trả 404 |
| `POST /public-trip/:id/copy` | user, admin: lưu bản sao riêng của một kế hoạch công khai (ghi nhật ký `createTrip`) |

- Người xem chỉ thấy kế hoạch (qua whitelist trường): không thấy chủ sở hữu, tiến độ, ảnh check-in hay ghi chú.
- Web: nút đổi chế độ ở trang chi tiết, tab "Khám phá" (`/assistant/explore`) và trang `/trip/:id`. Mobile: nút ở màn chi tiết, màn "Kế hoạch công khai" mở từ tab "Kế hoạch".

### Ghi chú cá nhân (Trip Notes)

Collection `tripnotes` (`tripId`, `userId`, `content` tối đa 2000 ký tự, tối đa 50 ghi chú mỗi chuyến đi).

| Endpoint | Mô tả |
| --- | --- |
| `GET /trip-plan/:id/notes` | Ghi chú của chính người gọi (mới nhất trước) |
| `POST /trip-plan/:id/notes` | `{ content }` |
| `PUT /trip-plan/:id/notes/:noteId` | `{ content }`, chỉ ghi chú của mình |
| `DELETE /trip-plan/:id/notes/:noteId` | Chỉ ghi chú của mình |

- Cần là chủ sở hữu kế hoạch (`ownTrip`) và chủ sở hữu ghi chú (`ownNote`). Ghi chú không bị sao chép theo kế hoạch và không bao giờ có trong chế độ xem chia sẻ / công khai.

### Chỉnh sửa lịch trình bằng AI (AI Itinerary Editing)

Người dùng mô tả thay đổi bằng lời, AI **đề xuất** lịch trình mới, người dùng xem trước rồi mới Chấp nhận hoặc Từ chối.

| Endpoint | Mô tả |
| --- | --- |
| `POST /trip-plan/:id/ai-edit` | `{ instruction }` (tối đa 500 ký tự). Trả `{ proposal: { id, days } }`, **không ghi gì** vào lịch trình |
| `POST /trip-plan/:id/ai-edit/apply` | `{ proposalId }`. Lưu đề xuất **do server giữ**, không bao giờ lưu dữ liệu client gửi lên |
| `DELETE /trip-plan/:id/ai-edit/:proposalId` | Từ chối: server quên đề xuất |

- Đề xuất được kiểm tra chặt (đúng số ngày, mỗi ngày 1-10 hoạt động, chi phí >= 0); AI trả sai trả 502 `AI_INVALID_RESPONSE`, AI ngừng hoạt động trả 503. Lịch trình cũ luôn giữ nguyên khi có lỗi.
- Đề xuất lưu ở `TripAiProposal` và tự xoá sau 1 giờ (TTL). Địa điểm đã hoàn thành (đã có ảnh, điểm) không bao giờ bị AI bỏ: được đặt lại và đánh dấu `kept`.
- Chấp nhận giữ nguyên thử thách của địa điểm còn lại (giữ tiến độ), tạo thử thách mới cho địa điểm mới, xoá địa điểm bị bỏ và cập nhật tổng chi phí.

### Gợi ý địa điểm bằng AI (AI Destination Recommendation, AI-002)

`POST /destinations/recommend` (user, admin, có rate limit, ghi nhật ký `useAi`). Không đụng tới chuyến đi nào; thứ duy nhất được ghi là **một bản lưu của câu trả lời** trong lịch sử gợi ý (mục dưới).

- Body: `{ query?, interests?, region?, budget? }`. Cần ít nhất một trường. `query` tối đa 500 ký tự, `interests` tối đa 10 mục (mảng hoặc chuỗi cách nhau bằng dấu phẩy), `region` tối đa 100, `budget` là chuỗi tối đa 50 hoặc số >= 0. Sai trả 400 trước khi gọi AI.
- Trả `{ recommendations: [{ name, province, description, reason, inApp, place? }], historyId, message }`, tối đa 5 mục, mỗi mục bắt buộc có tên, mô tả và lý do (mục thiếu hoặc trùng bị loại, không tự bịa).
- **Kết hợp dữ liệu nội bộ:** không có model Destination; dữ liệu địa điểm có sẵn là `Showcase` (kind `suggestion`, điểm đến ở trang chủ do admin quản lý) và `Video`. Gợi ý khớp tên (không phân biệt dấu) với một điểm đến nội bộ thì `inApp: true` kèm `place` (ảnh, tỉnh, tối đa 3 video cùng tỉnh). Còn lại là gợi ý **chưa xác minh** của AI (`inApp: false`, không có `place`) và UI phải ghi rõ.
- Prompt yêu cầu chỉ gợi ý địa điểm có thật, không bịa số liệu (giá vé, giờ mở cửa); danh sách rỗng khi không có gì phù hợp.
- Không có kết quả phù hợp: 200 với `recommendations: []`. AI trả câu không đọc được hoặc rỗng: 502 `AI_INVALID_RESPONSE`. AI ngừng hoạt động: 503.
- Web: tab "Gợi ý" trong Trợ lý (`/assistant/recommend`): ô nhu cầu, sở thích (chip), khu vực (`ProvinceField`), ngân sách (`BudgetField`, 3 mức cho 1 người, bấm lại để bỏ chọn). Mobile: màn "Gợi ý điểm đến bằng AI" mở từ tab "Kế hoạch" (`DropdownInput` cho khu vực và ngân sách).
- "Xem chi tiết" chỉ hiện cho mục `inApp` (ảnh, video YouTube).
- **Tạo kế hoạch từ gợi ý:** mọi gợi ý (kể cả của AI) có nút "Tạo kế hoạch từ gợi ý này" (cùng tên với nút của chat), mở form tạo kế hoạch với tỉnh điền sẵn (chỉ khi tỉnh nằm trong danh sách 63 tỉnh) và `<tên> (<tỉnh>): <mô tả>` trong ô Ghi chú (tối đa 1500 ký tự). AI tạo kế hoạch ưu tiên các địa điểm trong ghi chú, giống nút của chat; form hiện dòng "Đã điền sẵn từ gợi ý điểm đến của AI". Ngược lại, form tạo kế hoạch có dòng "Chưa biết đi đâu? Nhờ AI gợi ý điểm đến" dẫn sang trang gợi ý, nên hai màn hình nối liền nhau.
- **Chat và Gợi ý có vai trò riêng, nối với nhau:** Chat là "hỏi đáp và trò chuyện về du lịch", Gợi ý là "tìm điểm đến theo tiêu chí". Đầu trang chat có dòng "Muốn danh sách có sẵn để chọn? Dùng Gợi ý điểm đến" (`assistant.roleHint`, `toRecommend`), đầu trang gợi ý có "Muốn hỏi thêm? Mở Chat" (`destinations.toChat` / `recommend.toChat`). Khi thêm tính năng gợi ý mới, giữ hai dòng này để người dùng không bị lẫn. Không ghi gì vào chuyến đi có sẵn. Không làm tạo cả lịch trình bằng AI trong ticket này.

#### Lịch sử gợi ý (Suggestion history)

Mỗi câu trả lời có ít nhất một địa điểm được lưu ở collection `destinationsearches` (`userId`, `query`, `interests`, `region`, `budget`, `recommendations`, `status`, `tripId?`). Câu trả lời rỗng không được lưu. Mỗi người giữ tối đa **30** lần gần nhất (cũ hơn tự bị xóa).

| Endpoint | Mô tả |
| --- | --- |
| `GET /destinations/history?status=draft|created` | Danh sách tóm tắt (yêu cầu, số địa điểm, 3 tên đầu, trạng thái), mới nhất trước. `status` sai trả 400 |
| `GET /destinations/history/:id` | Mở lại một gợi ý cùng toàn bộ địa điểm |
| `PATCH /destinations/history/:id` | `{ status: "draft" | "created", tripId? }` |
| `DELETE /destinations/history/:id` | Xóa gợi ý (không ảnh hưởng kế hoạch đã tạo) |

- Hai nhóm: **Bản nháp** (`draft`: chưa dùng để tạo kế hoạch) và **Đã tạo** (`created`). Client chuyển sang `created` khi người dùng bấm "Tạo kế hoạch từ gợi ý này" hoặc thêm một địa điểm của gợi ý vào chuyến đi có sẵn (kèm `tripId`).
- Mọi truy vấn đều lọc theo `userId`: id không phải của mình hoặc sai định dạng đều trả 404.
- UI (web `SearchHistory`, mobile `SearchHistory`): dưới form gợi ý có "Lịch sử gợi ý" chia hai nhóm. **Xem lại** nạp yêu cầu cũ vào form và hiện lại các địa điểm (sửa yêu cầu rồi hỏi lại được); **Xóa** luôn hỏi xác nhận bằng `ConfirmModal`.

#### Tự lưu bản nháp (Drafts)

Form **tạo kế hoạch** và form **gợi ý AI** tự lưu khi người dùng nhập (sau 0,4 giây ngừng gõ) để tải lại trang, mất mạng hay thoát ra không mất công nhập lại. Lưu ở trình duyệt (web: `localStorage`, mobile: `AsyncStorage`), không qua server.

- Khóa `draft:<tên form>:<username>`: mỗi tài khoản một bản nháp, người khác dùng chung máy không thấy. Form trống không được lưu (và xóa bản nháp khi người dùng xóa hết).
- Quay lại hoặc tải lại: hiện "Bạn có một bản nháp chưa hoàn thành. Tiếp tục chỉnh sửa?" với **Tiếp tục** / **Tạo mới**. Trong lúc chờ chọn, form trống không ghi đè bản nháp. Bản nháp cũ có ngày bắt đầu đã qua thì dời về hôm nay, giữ nguyên số ngày.
- Form tạo kế hoạch mở sẵn từ một gợi ý (chat, trang chủ, gợi ý AI) không hỏi bản nháp. Bản nháp tạo kế hoạch được xóa khi kế hoạch đã lưu; bản nháp gợi ý được xóa khi AI đã trả lời (vì lịch sử đã giữ).
- Code: `lib/drafts` + `hooks/useDraft` + `DraftBanner` (web `components/ui`, mobile `components`).

#### Thêm địa điểm gợi ý vào chuyến đi có sẵn

`POST /trip-plan/:id/places` (user, admin; `:id` phải là kế hoạch của mình) thêm **một** địa điểm vào một ngày của chuyến đi.

- Body: `{ name, dayId, province?, summary? }`. `name` tối đa 200 ký tự, `summary` tối đa 1000 (mặc định là tên), `dayId` phải là một ngày của chính chuyến đi đó.
- Trả 201 `{ message, challengeId, day: { id, title }, located }`. Địa điểm trở thành thử thách thường của ngày đó (10 điểm) kèm tiến độ mới. Server tra tọa độ (HERE rồi OpenStreetMap); không tìm thấy thì vẫn thêm dạng chữ và trả `located: false`.
- Lỗi: 400 (thiếu tên / ngày), 404 (không phải chuyến đi của mình hoặc ngày thuộc chuyến khác), 409 `PLACE_ALREADY_IN_TRIP` (chuyến đi đã có địa điểm cùng tên, không phân biệt hoa thường), 409 `DAY_FULL` (mỗi ngày tối đa 10 địa điểm). Không có lỗi nào ghi dữ liệu dở dang.
- Không dùng AI và không đổi các địa điểm khác của chuyến đi.
- **UX (web `AddToTripDialog`, mobile `AddToTripModal`):** nút "Thêm vào chuyến đi có sẵn" trên mỗi gợi ý mở hộp thoại từng bước: 1) chọn chuyến đi (chuyến cùng tỉnh lên đầu, có nhãn "Cùng tỉnh"; chưa có chuyến đi thì gợi ý tạo mới), 2) chọn ngày (hiện số địa điểm; ngày đã đầy bị khóa), rồi một câu tóm tắt "Thêm X vào Ngày N của chuyến Y" (kèm cảnh báo nếu là gợi ý AI chưa xác minh). Chỉ khi bấm "Thêm vào chuyến đi" mới ghi. Thành công thì hiện màn kết quả với nút "Xem chuyến đi"; lỗi hiển thị ngay trong hộp thoại và giữ nguyên lựa chọn.

### Tạo lại lịch trình một ngày (AI Itinerary Regeneration, AI-005)

AI viết lại **một ngày** của chuyến đi; các ngày còn lại không bị đụng tới. Không phải chỉnh sửa cả chuyến đi (việc đó là `ai-edit`).

- `POST /trip-plan/:id/day-regeneration` body `{ dayId, instruction? }` (chủ chuyến đi; `instruction` tùy chọn, tối đa 500 ký tự): chỉ gửi **ngày được chọn** cho AI. Trả `{ proposal: { id, dayId, day }, current }` (ngày đề xuất và ngày hiện tại). **Không ghi lịch trình**, chỉ lưu đề xuất trên server (tự xóa sau 1 giờ).
- `POST /trip-plan/:id/day-regeneration/apply` body `{ proposalId }` = **Chấp nhận**: server ghi đúng đề xuất đã lưu (không tin dữ liệu client gửi lên) vào đúng ngày đó: tiêu đề, chi phí và các địa điểm của ngày, rồi tính lại tổng chi phí chuyến đi từ ngày mới + các ngày khác giữ nguyên. Địa điểm còn lại giữ thử thách (tiến độ, ảnh); địa điểm mới có thử thách và tiến độ mới; địa điểm bị bỏ bị xóa, **trừ địa điểm đã hoàn thành** (luôn được giữ lại và đánh dấu `kept` trong bản xem trước).
- `DELETE /trip-plan/:id/day-regeneration/:proposalId` = **Từ chối**: server bỏ đề xuất, lịch trình giữ nguyên.
- Lỗi (lịch trình luôn giữ nguyên): 404 `DAY_NOT_FOUND` (ngày không thuộc chuyến đi), 400 (yêu cầu quá dài), 502 `AI_INVALID_RESPONSE` (AI trả về không đọc được / thiếu tiêu đề, chi phí âm, quá 10 hoạt động), 502 `AI_EMPTY_DAY` (AI trả về ngày không có hoạt động), 503 (AI không khả dụng), 404 `AI_PROPOSAL_NOT_FOUND` khi chấp nhận (đề xuất không có / hết hạn / của người khác), 409 `DAY_CHANGED` (ngày đã thêm/bớt địa điểm kể từ lúc đề xuất).
- Quyền: chỉ chủ chuyến đi (middleware `ownTrip`), đề xuất gắn với chuyến đi và người dùng đã tạo.
- Dữ liệu: model `TripDayProposal` (`tripId`, `userId`, `dayId`, `baseIds`, `day`, TTL 1 giờ).
- **UX (web `DayRegeneratePanel`, mobile `DayRegeneratePanel`):** thẻ "Tạo lại một ngày" trong chi tiết chuyến đi: chọn ngày, nhập yêu cầu (tùy chọn), xem ngày hiện tại và ngày đề xuất cạnh nhau (địa điểm mới / đã hoàn thành được đánh dấu), rồi **Chấp nhận** hoặc **Từ chối**.

### Tối ưu tuyến đường (AI Route Optimization, AI-004)

Sắp xếp lại thứ tự tham quan của **một ngày**. Không gợi ý địa điểm mới, không thêm hay bớt địa điểm nào, chỉ đổi thứ tự.

- `POST /trip-plan/:id/route-optimization` body `{ dayId }` (chủ chuyến đi): trả thứ tự hiện tại (`currentOrder`) và thứ tự đề xuất (`proposedOrder`), tổng quãng đường / thời gian của từng thứ tự (`current`, `proposed`, kèm `legs`), `improved`, `proposalId`, `source`, `missingCoordinates`. **Không ghi lịch trình**, chỉ lưu đề xuất trên server (tự xóa sau 1 giờ).
- `POST /trip-plan/:id/route-optimization/apply` body `{ proposalId }` = **Chấp nhận**: server áp dụng đúng đề xuất đã lưu (không tin dữ liệu client gửi lên), chỉ ghi vị trí `order` của từng địa điểm. Trả 409 `ROUTE_DAY_CHANGED` nếu ngày đã thêm/bớt địa điểm kể từ lúc đề xuất (không bao giờ làm mất địa điểm), 404 `ROUTE_PROPOSAL_NOT_FOUND` nếu đề xuất không có / hết hạn.
- `DELETE /trip-plan/:id/route-optimization/:proposalId` = **Từ chối**: server bỏ đề xuất, lịch trình giữ nguyên.
- **Thuật toán, không dùng LLM** (để không bịa số): lấy tọa độ lưu trên từng địa điểm, hỏi OSRM (`/table`, cùng dịch vụ đang dùng cho bản đồ) ma trận quãng đường và thời gian đi xe thật, rồi tìm đường đi ngắn nhất theo **thời gian** (chính xác với ≤ 12 địa điểm, ngược lại gần nhất + 2-opt). Địa điểm đầu tiên có tọa độ giữ làm điểm xuất phát. Chỉ khi có thứ tự **ngắn hơn hẳn** mới tạo đề xuất; nếu không, `improved: false`, `proposalId: null` và không có gì để chấp nhận.
- Nếu OSRM lỗi: `source: "straight-line"`, khoảng cách là đường chim bay tính từ tọa độ và **không hiển thị thời gian** (`duration: null`); giao diện ghi rõ điều này.
- Địa điểm thiếu hoặc sai tọa độ (rỗng, không phải số, ngoài miền, hoặc 0,0) không được sắp xếp: giữ nguyên vị trí trong danh sách và được liệt kê ở `missingCoordinates`. Cần ít nhất 3 địa điểm có tọa độ, nếu không trả 400 `ROUTE_NOT_ENOUGH_COORDINATES`. Tối đa 25 địa điểm mỗi ngày (400 `ROUTE_TOO_MANY_PLACES`).
- Dữ liệu: thêm `Challenge.order` (số, tùy chọn). Địa điểm có `order` xếp trước theo `order`, địa điểm chưa có xếp sau theo thời điểm tạo, nên chuyến đi cũ và địa điểm thêm sau vẫn đúng thứ tự.
- **UX (web `RouteOptimizePanel`, mobile `RouteOptimizePanel`):** thẻ "Tối ưu tuyến đường" trong chi tiết chuyến đi: chọn ngày, bấm "Tối ưu tuyến đường", xem hai danh sách (hiện tại / đề xuất) với tổng quãng đường và thời gian, rồi **Chấp nhận** hoặc **Từ chối**.

### Quy ước khi triển khai một ticket mới

Mỗi tính năng (ticket) làm đủ các lớp trong **cùng một lượt**, theo đúng các tính năng ở trên:

1. **Backend** (`routes` ghi rõ quyền ở từng dòng -> `controllers` mỏng -> `services` -> `repositories`; lỗi dùng `HttpError`, AI qua `utils/gemini.js`). Dữ liệu AI trả về luôn được kiểm tra, không tin; AI lỗi thì không ghi gì.
2. **Web** (`web/src/features/<tên>`: `api`, `types`, `validation`, `pages` / `components`) và **mobile** (`mobile/src`: `api/index.ts`, `lib`, `screens` / `components`, đăng ký trong `RootNavigator`). Dùng lại component sẵn có (`ProvinceField`, `BudgetField`, `DropdownInput`, `ConfirmModal`...), không dùng `<select>` mặc định hay `window.confirm`.
3. **Chuỗi giao diện** thêm vào cả `vi.json` và `en.json` (web và mobile); `usedKeys.test` kiểm tra thiếu key.
4. **Test** (đủ mọi lớp): backend `__tests__/unit` + `integration` (vitest), web `src/__tests__` (vitest), mobile `__tests__` (jest), `automation/backend` (Cypress API) và `automation/web` (Cypress UI). Luôn có test cho request hợp lệ, input sai và lỗi (400 / 401 / 404 / 502 / 503).
5. **Trước khi báo xong:** chạy `npx vitest run` (backend và web, web thêm `npx tsc -b` và `npx eslint src`), `npx jest` (mobile). Lỗi `tsc` / eslint có sẵn ở mobile `RootNavigator.tsx` và `TripDetail.tsx` không thuộc ticket.
6. **Cập nhật README này:** thêm mục mô tả tính năng (endpoint, quyền, giới hạn, hành vi khi lỗi, nơi hiển thị trên web / mobile) và cập nhật danh sách model / bảng phân quyền.

Các tính năng đã làm: Duplicate Trip, Favorite Trip, Export PDF, Trip Sharing, Trip Visibility, Trip Notes, AI Itinerary Editing, AI Destination Recommendation (AI-002, gồm tạo kế hoạch từ gợi ý, thêm gợi ý vào chuyến đi có sẵn, lịch sử gợi ý và tự lưu bản nháp).

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
