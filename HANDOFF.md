# HANDOFF

_Cập nhật: 2026-09-30 — nhánh `claude/keen-dirac-iwgfz9`_

## Trạng thái hiện tại
Đã xong code GĐ1 (MVP): webapp PWA có đủ 3 vai trò: người dân, cứu hộ, chỉ huy. Không có Supabase thì chạy ở chế độ demo (lưu localStorage). Chưa nối Supabase thật và chưa bật GitHub Pages; hai việc này người dùng phải tự làm theo `README.md`.

## Phiên này đã làm
- Chốt kế hoạch: `docs/PLAN.md` (nghiên cứu app thế giới, góc nhìn khí tượng, phương án khi mất sóng hoặc hết pin, các giai đoạn).
- Dựng khung Vite + React + TS + PWA + Leaflet + Supabase.
- `supabase/schema.sql`: bảng profiles/teams/sos_requests/rescuer_locations/sos_events, RLS, trigger chặn leo quyền, RPC cho SOS khách và cấp quyền. Đã chạy thử trên Postgres 16 local (stub auth), các tình huống phân quyền đều đúng.
- Người dân: đăng ký đầy đủ, đăng nhập lưu vĩnh viễn, nút SOS nhấn giữ 2 giây, gửi GPS và % pin, hàng đợi khi mất sóng, SMS dự phòng sau 20 giây, cập nhật nhanh (mức nước, bị thương, số người, vị trí), hủy SOS, hướng dẫn chuẩn bị.
- SOS khẩn không cần tài khoản.
- Cứu hộ: bật ca trực (gửi vị trí mỗi 60 giây), việc của đội, SOS chờ cứu trong bán kính 5 km, bản đồ, chuyển trạng thái, bíp/rung/thông báo khi có SOS mới, đổi trạng thái đội.
- Chỉ huy: thống kê, bản đồ SOS và vị trí đội, gợi ý đội gần nhất, giao và đổi trạng thái, tạo đội, cấp quyền theo SĐT, xuất CSV.
- Test (vitest, 25 test), workflow deploy GitHub Pages, README hướng dẫn cài.

## Còn dở / chưa xong
- Chưa thử với Supabase thật (auth bằng email nội bộ `<sđt>@sosvunglu.app`, cần tắt "Confirm email").
- Chưa có icon PNG cho PWA (đang dùng SVG, iOS có thể hiện icon xấu).

## Lỗi / vấn đề đã biết
- Lint còn 3 cảnh báo `set-state-in-effect` (không phải lỗi, do gọi hàm tải dữ liệu async trong effect).
- Cứu hộ không xem được hồ sơ (người già, trẻ nhỏ...) của SOS chưa giao cho đội mình. Đây là chủ ý bảo mật, nhưng điểm ưu tiên của SOS "gần tôi" vì thế có thể thấp hơn thực tế.
- Trên iOS, thông báo chỉ hiện khi đang mở app; web push làm ở GĐ2.

## Quyết định quan trọng
- Webapp PWA (Vite, không dùng Next.js) để chạy được trên GitHub Pages, sau này chép `dist/` lên VPS.
- Supabase + RLS. Quyền bị chặn ở tầng DB. Anon key được công khai.
- Đăng nhập bằng SĐT + mật khẩu (quy đổi thành email) để không tốn tiền SMS OTP.
- Nhấn giữ 2 giây để chống bấm nhầm. Không thu CCCD.
- Có bản demo localStorage để chạy thử và test khi chưa có Supabase.

## Bước tiếp theo (theo thứ tự ưu tiên)
1. Người dùng: tạo project Supabase, chạy `schema.sql`, tắt Confirm email, điền biến cấu hình, bật GitHub Pages (xem `README.md`). Merge nhánh vào `main` để deploy.
2. Thử toàn bộ luồng với Supabase thật trên 2–3 điện thoại.
3. GĐ2: tự động giao SOS cho đội gần nhất (Edge Function + PostGIS), chuyển tiếp nếu 2 phút không nhận, gộp SOS trùng, Web Push, báo cáo hiện trường kèm ảnh, lớp radar mưa.
4. Icon PNG 192/512 cho PWA.

## Kiểm tra lúc bàn giao
- Build: `npm run build` OK
- Test: `npm test`: 25/25 pass
- Lint: `npm run lint`: 0 lỗi, 3 cảnh báo
- E2E thủ công (Playwright, demo): dân gửi SOS → chỉ huy giao đội gợi ý → cứu hộ thấy việc: OK

## Lịch sử phiên trước
- 2026-09-30: chốt kế hoạch, làm GĐ1 MVP.
- 2026-09-30: khởi tạo skill kickoff/handoff.
