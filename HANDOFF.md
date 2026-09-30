# HANDOFF — SOS vùng lũ

> Đường dẫn: `D:\Clau Cowork\SOS VÙNG LŨ`
> Cập nhật: 2026-10-01 06:20
> Git: `g4-viet-lai` @ `c845382` — 0 file chưa commit (tệp này sửa sau commit đó)
> Đang chạy: **https://cuuho.websitekhoinghiep.net** (VPS ACA, Docker riêng — thư mục/IP ở `CLAUDE.local.md`). Bản cũ Vite + Supabase vẫn ở nhánh `main` / GitHub Pages.

## 1. Phiên này đã làm gì (30/09 tối – 01/10 sáng)
- `/kickoff` — `QUY-TRINH.md` (G0–G10), `.gitignore` chặn `.env`/khoá/QR, `CLAUDE.local.md`, bảng tin chung nhóm `crm`.
- G4 viết lại theo khuôn Greencie (`ac995ba`): Next.js 15 + Prisma + Postgres. **Máy chủ viết mới**: `src/lib/may-chu/*`, `src/app/api/*` (23 route), `prisma/`, luật quyền `src/lib/quyen-sos.ts` + 18 bài kiểm (41/41 đạt, đã thử ngược).
- **Giao diện CHÉP từ bản Vite** (`src/man-hinh/*`, `src/components/*`, `src/lib/{priority,geo,dispatch,queue,device,hooks}.ts`), chỉ sửa đủ để nối máy chủ mới (`src/lib/backend/api.ts`) + thêm ô đồng ý (AuthPage), nút Báo giả + form Khoá tài khoản (CommanderHome), bỏ Google Maps (SosMap).
- G5 phần đầu: Docker tự đủ (`docker-compose.yml` + tệp phụ `.npm.yml`/`.caddy.yml`), bí mật sinh trên VPS, tài khoản CSDL app quyền thấp `sos_app`, cron điều phối mỗi phút + `pg_dump` 03:15.
- Chủ dự án gắn proxy host NPM + SSL. Đã kiểm 01/10: 200, HSTS, http→https, `/api/sos` 401, tác vụ không khoá 404, `sos_app` không xoá được bảng, sao lưu chạy, SSL tới 29/12/2026.
- Đã đăng bảng tin cho CRM-CẢNH (01/10 06:00): gắn bảng tổng quan + thêm vào két chung.

## 2. Quyết định đã chốt
- Viết lại khuôn Greencie, chạy trên VPS ACA **Docker riêng, dễ bê sang VPS khách** — chủ dự án 30/09.
- Tên miền `cuuho.websitekhoinghiep.net`. Không chuyển dữ liệu Supabase cũ (chỉ có tài khoản thử).
- Làm sao lưu đêm. Bỏ Google Maps (cần thẻ thanh toán).
- ⚠️ **Giao diện chép từ bản cũ CHƯA coi là xong** (chủ dự án 01/10): sẽ rà soát + cải thiện, không giữ nguyên chỉ vì "bản cũ có sẵn".

## 3. Đã thử và LOẠI
- Tự cài Supabase lên VPS — nặng ~10 container; thay bằng Postgres thường.
- Giữ Vite + Supabase cloud (Claude đề xuất) — chủ dự án chọn viết lại để chạy trên VPS của mình.
- "Realtime" giữ kết nối mở — thay bằng hỏi `/api/thay-doi` mỗi 10 giây (bền hơn trên mạng yếu vùng lũ).

## 4. Đang làm dở
- **Chưa ai đăng nhập vào bản mới.** Mới kiểm bằng lệnh + mở màn đăng nhập/đăng ký (khổ 375px, không lỗi console). Các màn sau đăng nhập (dân / cứu hộ / chỉ huy) chạy lần đầu khi chủ dự án thử.
- Chờ chủ dự án đăng ký `0702760399` → Claude chạy trên VPS (thư mục dự án):
  `docker compose --profile tools run --rm tools npx tsx scripts/cap-quyen.ts 0702760399 chi-huy`

## 5. Câu hỏi còn treo
- **Giao diện muốn cải thiện chỗ nào?** Chủ dự án xem bản thật rồi nói. Những chỗ Claude đã thấy cần rà (chưa sửa):
  - `SosCard` với SOS rút gọn (cứu hộ xem SOS chưa có đội) hiện tên "Ẩn — hiện khi đội nhận (khách)" — vụng, nên có thẻ riêng.
  - `App.tsx` cất cả hồ sơ (có dữ liệu sức khoẻ) vào `localStorage` `profile_cache` — máy dùng chung / bị mượn là lộ; cân nhắc chỉ cất tên + vai.
  - Chỉ huy tải tới 20.000 hộ dân kèm SĐT về trình duyệt (`/api/ho-dan`) và xuất CSV có dữ liệu sức khoẻ — cần giới hạn theo vùng đang xem / ghi nhật ký xuất.
  - Chưa có icon PNG 192/512 → Android có thể không cho "Cài app"; iPhone cần hướng dẫn "Thêm vào màn hình chính".
  - Chỉ có 1 trang (SPA) — chưa có trang công khai riêng (hướng dẫn, SOS khẩn) cho Google.
  - Form cấp quyền / tạo đội của chỉ huy nằm cuối tab Đội, trên điện thoại phải cuộn xa.
- **Giữ giao diện chép hay viết lại theo khuôn CRM?** (bàn 01/10, chủ dự án chưa chọn — thử bản hiện tại rồi quyết)
  1. Giữ + sửa dần theo danh sách trên (Claude nghiêng về hướng này nếu sắp mùa lũ).
  2. Viết lại giao diện: mỗi vai một trang (`/dan`, `/cuu-ho`, `/chi-huy`) có kiểm quyền phía máy chủ, tiếng Việt toàn bộ,
     bỏ lớp đổi tên `chuyen-doi.ts`, máy chủ lọc/sắp sẵn, chỉ cất tên + vai trên máy, bản đồ chỉ tải ở màn cần. Máy chủ giữ nguyên.
     Vẫn giữ phần phải chạy phía điện thoại: nút SOS, GPS, hàng đợi mất sóng, SMS, service worker. Ước 1–2 buổi → làm thành một G riêng.
  Lý do đã chép: lên VPS được trong một buổi, giữ cách dùng quen; cái giá là mã lẫn Anh–Việt + lớp đổi tên (nợ kỹ thuật).
- Kho GitHub để công khai hay chuyển riêng tư (khi gộp vào `main`)?
- Môi trường thử riêng (bản mẫu) — có làm không? (QUY-TRINH.md B3)

## 6. Bước tiếp theo
1. Chủ dự án đăng ký `0702760399` trên https://cuuho.websitekhoinghiep.net → Claude cấp chỉ huy (lệnh mục 4).
2. Thử trọn vòng bằng 3 số (chỉ huy tạo đội → cấp cứu hộ → bật ca → số thứ ba gửi SOS → nhận → cứu xong); Claude tự mở từng màn ở khổ 375px, chụp, sửa lỗi gặp.
3. Rà + cải thiện giao diện theo mục 5 và ý chủ dự án — sửa trên máy → commit `g4-viet-lai` → trên VPS `git pull --ff-only && docker compose build app && docker compose up -d app`.
4. Còn treo khác: Drive mã hoá cho sao lưu (cần chủ dự án tạo remote rclone), chờ CRM-CẢNH gắn tổng quan + két, gộp `g4-viet-lai` vào `main` + tắt GitHub Pages.
