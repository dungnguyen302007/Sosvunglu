# Sosvunglu

Webapp (PWA) SOS vùng lũ: người dân nhấn giữ nút SOS gửi hồ sơ + GPS; đội cứu hộ nhận việc, báo tiến độ; trung tâm chỉ huy xem bản đồ, điều phối. Kế hoạch: `docs/PLAN.md`. Quy trình + chia G: `QUY-TRINH.md`. Trạng thái: `HANDOFF.md`.

## Công nghệ (G4, viết lại 30/09–01/10/2026 theo khuôn CRM Greencie/An Gia)

- **Next.js 15 (App Router) + React 19 + Prisma 6 + PostgreSQL 16 + Docker Compose**, `jose` + `bcryptjs` (phiên), `zod` (kiểm dữ liệu gửi lên).
- Bản đồ: Leaflet + react-leaflet; nền Esri / OSM / Vệ tinh; nền riêng có khoá qua `BAN_DO_URL` + `BAN_DO_NGUON` (.env). Đã bỏ Google Maps.
- Cấu hình chạy (`SO_HOTLINE`, `SO_SMS_SOS`, `BAN_DO_*`) đọc LÚC CHẠY: `layout.tsx` chèn `window.__CAU_HINH__` → `src/lib/config.ts`. Đổi số không cần build lại.
- PWA: `public/sw.js` (cất trang + tệp tĩnh, KHÔNG cất `/api/*`), `public/manifest.webmanifest`.
- Bản cũ (Vite + Supabase + GitHub Pages) vẫn ở nhánh `main` tới khi bản này thay được. Schema Supabase cũ: `docs/schema-supabase-cu.sql`.

## Cấu trúc

- `src/app/page.tsx` → `khung-app.tsx` → `src/App.tsx`: cả app là MỘT trang chạy phía điện thoại, đổi màn theo vai.
- `src/man-hinh/` — `AuthPage`, `CitizenHome`, `RescuerHome`, `CommanderHome` (chép từ bản Vite; KHÔNG đặt tên `src/pages` — Next coi là Pages Router).
- `src/components/`, `src/lib/{priority,geo,dispatch,queue,device,hooks,labels,storage}.ts` — chép từ bản Vite, có bài kiểm.
- `src/lib/backend/` — giao diện `Backend` (`types.ts`) + `api.ts` gọi `/api/*`. Thêm hàm vào `Backend` thì thêm route tương ứng.
- `src/lib/quyen-sos.ts` — **luật ai thấy / sửa SOS nào + ai thấy VỊ TRÍ cứu hộ nào** (`mucXemViTri`: dân chỉ thấy đội đã nhận cứu mình, ẩn danh; cứu hộ thấy đồng đội + đội khác trong 10 km; chỉ huy thấy hết) — hàm thuần + `quyen-sos.test.ts`.
- `src/lib/ma-moi.ts` — **luật mã mời đội** (hạn 24 giờ, 30 lượt, thu hồi được; chỉ huy không dùng mã) + `ma-moi.test.ts`. Link mời: `/?moi=<MÃ>` (`src/lib/link-moi.ts`).
- `src/lib/may-chu/` — chỉ chạy máy chủ: `db`, `phien` (cookie `sos_phien`), `tra-loi` (bọc lỗi, `canNguoi`), `mau` (zod), `chuyen-doi` (CSDL ↔ kiểu giao diện + CẮT TRƯỜNG theo quyền), `dieu-phoi` (tự giao đội, khoá tư vấn, trả việc khi cả đội tắt ca), `ma-moi`, `sos`, `han-muc`.
- `src/app/api/*/route.ts` — API, đường dẫn tiếng Việt (`dang-ky`, `sos-khach`, `tac-vu/dieu-phoi`…).
- `prisma/schema.prisma` + `migrations/` (migration đầu có 2 chỉ mục riêng "mỗi người 1 SOS đang mở" viết tay).
- `docker-compose.yml` (app + Postgres + cron, tự đủ) + tệp phụ `docker-compose.npm.yml` (máy có nginx-proxy-manager) / `docker-compose.caddy.yml` (máy trống). `docker/postgres/khoi-tao.sh` tạo tài khoản quyền thấp `sos_app`.

## Lệnh chạy

```bash
npm install
npm test               # vitest: 60 bài (30 bài quyền SOS + vị trí + khách, 7 bài mã mời)
npx tsc --noEmit
npx next build
# Trên VPS (thư mục dự án): git pull --ff-only · docker compose --profile tools build · docker compose --profile tools run --rm tools · docker compose up -d
#   ⚠️ PHẢI có --profile tools ở bước build: thiếu thì ảnh `tools` không dựng lại → migration / script mới không chạy (dính 02/10/2026).
# Cấp chỉ huy đầu tiên: docker compose --profile tools run --rm tools npx tsx scripts/cap-quyen.ts <sdt> chi-huy
```

## Mô hình dữ liệu

`NguoiDung` (SĐT đăng nhập, vai DAN/CUU_HO/CHI_HUY, đội, hồ sơ hộ + `deTonThuong` = dữ liệu sức khoẻ, `dongYLuc`, `biKhoa`, `phienBan`) · `Doi` · `YeuCauSos` (người gửi hoặc khách, toạ độ + sai số, pin, mức nước, trạng thái, đội, `giaoLuc`/`nhanLuc`, `doiDaThu`, `baoGia`) · `ViTriCuuHo` (1 dòng/người) · `MaMoi` (mã mời vào đội; `NguoiDung.maMoiId` = vào bằng mã nào) · `NhatKySos` (chỉ ghi).

## Quy ước

- Tiếng Việt cho chữ giao diện, tài liệu. Mã MỚI (máy chủ, route, CSDL) tiếng Việt không dấu; mã giao diện chép từ bản Vite giữ tên cũ (`Sos`, `Profile`…) — chuyển đổi ở `chuyen-doi.ts`.
- **Quyền chặn ở máy chủ**: route nào cũng qua `canNguoi()` + `quyen-sos.ts`, trả dữ liệu qua `chuyen-doi.ts` (không trả thẳng bản ghi Prisma). Không tìm thấy = không có quyền = cùng câu (`KHONG_THAY`).
- Sửa luật quyền → thêm bài vào `quyen-sos.test.ts` và **thử ngược** (làm hỏng luật, bài phải đỏ).
- Không có chức năng xoá SOS / người dùng: huỷ, báo giả, khoá.
- **Vai cứu hộ chỉ có 2 đường vào**: chỉ huy cấp theo SĐT (`/api/quyen`) hoặc mã mời đội (`/api/dang-ky` có `ma_moi`, `/api/ma-moi/dung`). Không có đường tự nhận.
- Tắt ca gọi `/api/ca-truc` (theo từng người). Cả đội hết người trong ca mà còn việc dở → `doiHetNguoiTruc` trả việc cho đội khác / về chờ.
- Bản đồ: người cần cứu = hình người (1 người 1 hình, quá 5 thì kèm số), cứu hộ = xuồng (đội mình viền xanh lá, tắt ca xám) — `SosMap.tsx`. Tên đội chèn vào HTML icon phải qua `esc()`.
- Commit dạng `loại: nội dung`. Người dùng cho phép luôn cập nhật `main` (fast-forward, không force) — nhưng `main` còn là bản GitHub Pages cũ, xem HANDOFF trước khi gộp nhánh `g4-viet-lai`.

## Cạm bẫy

- **Nhánh mặc định trên GitHub là `claude/quirky-bardeen-55tm7h` (cũ)**. Bản mới ở `g4-viet-lai`, bản cũ ở `main`.
- Kho **công khai**: không ghi IP, đường dẫn VPS, khoá vào kho. Thông tin máy chủ ở `CLAUDE.local.md` (bị `.gitignore` chặn).
- `DATABASE_URL` phải ghi đủ `sos-vung-lu-postgres` — VPS có nhiều Postgres khác.
- Build Docker trên VPS có lúc vấp `npm ci` ECONNRESET (mạng) — chạy lại là qua.
- App sau proxy: IP người gọi lấy phần tử CUỐI của `X-Forwarded-For` (`han-muc.ts`). Thêm Cloudflare phía trước thì phải sửa.
- Tệp trong kho CRLF trên Windows; `sed -i` Git Bash đổi sang LF. Lệnh đưa chủ dự án: PowerShell 5 (không `&&`).
