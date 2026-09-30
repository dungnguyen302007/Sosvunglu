# HANDOFF — SOS vùng lũ

_Cập nhật: 2026-10-01 sáng — nhánh `g4-viet-lai` (bản mới). Bản cũ Vite + Supabase vẫn ở `main` / GitHub Pages._

## Trạng thái hiện tại
**Bản mới (Next.js + Prisma + Postgres) ĐÃ CHẠY trên VPS ACA** trong bộ Docker riêng (`sos-vung-lu-app` / `-postgres` / `-cron`,
thư mục + IP ở `CLAUDE.local.md`). Kiểm 01/10 05:32: sức khoẻ OK, NPM gọi tới app 200, chưa đăng nhập → 401, tác vụ không khoá
→ 404, tài khoản app `sos_app` không xoá được bảng, sao lưu `pg_dump` chạy (tệp 600, thư mục 700), cron điều phối mỗi phút không lỗi.
**Tên miền `https://cuuho.websitekhoinghiep.net` CHẠY** (01/10 06:00: 200, HSTS, http→https 301, `/api/sos` 401, SSL tới 29/12/2026 — NPM tự gia hạn). Trang đăng nhập/đăng ký hiện đúng ở khổ 375px, không lỗi console.

## Đã làm (30/09 tối – 01/10 sáng)
- `/kickoff`: `QUY-TRINH.md` (G0–G10), `.gitignore` chặn `.env`/khoá/QR, bảng tin chung (nhóm `crm`), mục lục HANDOFF.
- G4 viết lại theo khuôn Greencie (commit `ac995ba` + tài liệu): 23 route API, điều phối tự động server, chống phá (giới hạn SOS
  khách theo IP/SĐT, SĐT báo giả bị chặn, khoá tài khoản, báo giả), cứu hộ chỉ thấy tên/SĐT/hồ sơ khi SOS giao cho đội mình
  (SOS chờ trong 10 km: bản rút gọn), ô đồng ý dữ liệu sức khoẻ, phiên 365 ngày kiểm CSDL mỗi lượt. 41/41 bài kiểm (18 bài quyền, đã thử ngược).
- G5 phần đầu: Docker tự đủ (tệp phụ npm/caddy để bê sang VPS khác), bí mật sinh ngay trên VPS (`.env` 600, không qua máy tính).

## Đã chốt
- Viết lại khuôn Greencie; chạy trên VPS ACA, Docker RIÊNG, dễ bê đi (chủ dự án 30/09). Tên miền `cuuho.websitekhoinghiep.net`.
- Không chuyển dữ liệu Supabase cũ — chủ dự án đăng ký lại `0702760399` rồi nâng chỉ huy.
- Làm sao lưu đêm (B1). Bỏ Google Maps.

## Đã loại
- Chạy Supabase tự cài (nặng ~10 container) — thay bằng Postgres thường.

## Đang dở — VIỆC ĐẦU TIÊN phiên sau
1. ✅ Proxy host NPM + SSL (chủ dự án làm 01/10).
2. Chủ dự án mở web, đăng ký `0702760399` → Claude chạy trên VPS:
   `docker compose --profile tools run --rm tools npx tsx scripts/cap-quyen.ts 0702760399 chi-huy`.
3. Tự mở trang bằng tài khoản thật ở khổ điện thoại 375px (3 vai), thử trọn luồng: tạo đội → cấp quyền cứu hộ → bật ca → SOS → nhận → cứu xong.

## Còn treo
- **Bảng tổng quan + két**: ĐÃ đăng bảng tin cho CRM-CẢNH 01/10 06:00 — chờ bên đó làm; đổi tên nhật ký/container/chữ `Xong:` thì phải báo lại.
- Sao lưu đêm mới ở dưới máy (giữ 14 ngày) — **chưa đẩy lên Drive mã hoá** (cần chủ dự án tạo remote rclone crypt, thư mục `SOS_VUNG_LU/`).
- Gộp `g4-viet-lai` vào `main` + tắt GitHub Pages bản cũ khi bản mới chạy ổn; khi đó cân nhắc chuyển kho sang riêng tư.
- Môi trường thử riêng, trợ lý AI: chưa làm (QUY-TRINH.md).
- Giao diện chưa ai bấm thử trên bản mới (chỉ build + kiểm API bằng lệnh).

## Bước tiếp theo
Mục "Đang dở" 1 → 2 → 3, rồi đăng bảng tin CRM-CẢNH, rồi G3 diễn tập ngoài trời bằng bản mới.
