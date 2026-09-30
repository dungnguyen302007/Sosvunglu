# HANDOFF

_Cập nhật: 2026-09-30 tối — `/kickoff` trên máy chủ dự án (`D:\Clau Cowork\SOS VÙNG LŨ`, nhánh `main` @ `60e1519`)_

> **Kickoff 30/09 tối đã chốt hướng mới — đọc `QUY-TRINH.md` trước.** Viết lại theo khuôn Greencie (Next.js + Prisma +
> Postgres), chạy trên VPS ACA trong Docker riêng; chia lại G0–G10 (G3 diễn tập → G4 viết lại + chống phá → G5 lên VPS +
> sao lưu). Mục "Bước tiếp theo" cuối tệp đã thay theo hướng này. Còn treo: bộ kiểm phân quyền (bắt buộc, hỏi lại ở G4),
> môi trường thử riêng, kho GitHub công khai hay riêng tư.

## Trạng thái hiện tại
Webapp PWA SOS vùng lũ đã **deploy lên GitHub Pages** (`https://dungnguyen302007.github.io/Sosvunglu/`), nối Supabase thật (project `sosvunglu`, đã chạy `supabase/schema.sql`). Có đủ 3 vai trò (người dân, cứu hộ, chỉ huy), tự giao SOS cho đội gần nhất, bản đồ có lớp Bản đồ/OSM/Vệ tinh. **Đang dở: nền bản đồ MapTiler báo "Invalid key"** và chưa xác nhận web đã dùng Supabase thật hay còn ở chế độ demo.

## Phiên này đã làm
- Toàn cảnh chỉ huy: lưu vị trí nhà khi đăng ký/hồ sơ (`src/components/HomeLocation.tsx`), lớp nhà dân trên bản đồ chỉ huy, cứu hộ tắt ca/mất tín hiệu hiện xám, chú thích; tab Đội liệt kê từng thành viên (đang trực / tắt ca / chưa bật ca), cảnh báo đội chưa có người, cứu hộ chưa có đội (`listStaff`, `listHouseholds`).
- Chốt kế hoạch `docs/PLAN.md` (nghiên cứu Zello/Meshtastic/Bridgefy, góc nhìn khí tượng, phương án mất sóng/hết pin).
- GĐ1 MVP: đăng ký/đăng nhập bằng SĐT (quy đổi email `<sđt>@sosvunglu.app`), nút SOS nhấn giữ 2 giây, hàng đợi offline + SMS dự phòng, SOS khách, màn cứu hộ, màn chỉ huy, RLS, PWA, CSV.
- GĐ2 một phần: tự giao đội gần nhất (3 km), nhận/từ chối trong 2 phút, gộp SOS trùng trong 100 m (SQL `pick_team`, `reassign_sos`, `decline_sos`, `run_dispatch`; bản TS `src/lib/dispatch.ts`; bản demo khớp).
- Sửa lỗi màn hình đen sau đăng ký: trùng tên kênh realtime Supabase (`supabase.ts`, kênh `sos-live-N`).
- Bản đồ: nền sáng, lớp Vệ tinh, ghim hiện số người, nút vị trí của tôi, vòng sai số GPS.
- Định vị: chờ GPS tốt nhất (≤30 m, tối đa 12 s), cảnh báo sai số >150 m, "Chỉnh vị trí trên bản đồ" cho người dân.
- Hạ tầng: workflow `.github/workflows/deploy.yml` (đọc biến từ Variables hoặc Secrets), `main` được tạo từ nhánh làm việc, đã cho phép **luôn cập nhật `main`** (ghi trong `CLAUDE.md`).

## Còn dở / chưa xong
- **Cần chạy `supabase/migrations/002_vi_tri_nha.sql` trong Supabase SQL Editor** (thêm `profiles.home_lat/home_lng` + cập nhật `handle_new_user`). Chưa chạy thì màn chỉ huy báo lỗi ở phần nhà dân/danh sách cứu hộ.
- **Google Maps đã tích hợp nhưng chưa thử với khóa thật** (máy chủ cloud bị chặn). Cần người dùng tạo khóa Google, đặt hạn mức ngày, thêm Secret `VITE_GOOGLE_MAPS_KEY` (xem README). Đã thử bằng trình duyệt: không khóa / Google bị chặn / Google báo lỗi khóa đều tự về nền miễn phí, app không sập.
- **MapTiler "Invalid key"**: người dùng đã dán địa chỉ `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=...` vào Secret `VITE_MAP_TILE_URL` (và `VITE_MAP_ATTRIBUTION`) và đã chạy lại deploy; **chưa nhận kết quả**. Nếu vẫn Invalid key: nghi khóa gõ sai (nhầm `l`/`I`, `0`/`O`) hoặc ô Allowed HTTP Origins (`dungnguyen302007.github.io`). Đã thử ghi khóa vào `.env.production` nhưng bị chặn (lộ khóa vào repo công khai) và đã hoàn tác; không làm lại cách này.
- **Chưa xác nhận Supabase thật**: Secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` nằm ở mục Secrets (không phải Variables); workflow đã sửa để đọc cả hai. Kiểm tra: màn đăng nhập còn khung xanh "Bản chạy thử" thì đang demo. Nếu chuyển sang thật, tài khoản demo cũ mất, phải đăng ký lại `0702760399`.
- **Chưa cấp quyền chỉ huy** cho `0702760399`: chạy trong Supabase SQL Editor `update profiles set role = 'commander' where phone = '0702760399';` rồi đăng nhập lại.
- Người dùng chưa thử luồng đầy đủ (chỉ huy tạo đội, cấp quyền cứu hộ, cứu hộ bắt đầu ca, SOS tự giao) với Supabase thật.
- Người dùng phàn nàn bản đồ cũ, không thấy đường nhà; vị trí SOS từng lệch ~2,3 km (nghi gửi từ máy tính, định vị theo mạng).

## Lỗi / vấn đề đã biết
- Lint: 4 cảnh báo `react(set-state-in-effect)` (`src/App.tsx:31`, `src/pages/RescuerHome.tsx:26`, `src/pages/CitizenHome.tsx:42`, `src/lib/hooks.ts`), không phải lỗi.
- Máy chủ cloud bị chặn `supabase.co`, nhà cung cấp bản đồ: không tự kiểm tra kết nối thật được, chỉ giả lập (Playwright route mock).
- `pg_cron` chưa chắc bật trên Supabase; app tự gọi `run_dispatch` mỗi phút (chỉ khi có chỉ huy hoặc cứu hộ trong ca đang mở app).
- Cứu hộ chỉ thấy hồ sơ dân (người già, trẻ nhỏ…) sau khi đội đã nhận SOS (chủ ý bảo mật).
- CARTO đã bắt buộc khóa API; đã bỏ. Esri/OSM miễn phí có giới hạn khi đông người dùng.
- Repo phải public để dùng GitHub Pages miễn phí; không đưa khóa bí mật vào code.

## Quyết định quan trọng
- Vite + React PWA (không Next.js) để chạy trên GitHub Pages, sau này chép `dist/` lên VPS.
- Supabase + RLS; đăng nhập bằng SĐT + mật khẩu, tắt "Confirm email".
- Nhấn giữ 2 giây để gửi SOS. Không thu CCCD.
- Có bản demo localStorage khi không có biến Supabase.
- Nền bản đồ: mặc định Esri, có OSM và Vệ tinh; khóa riêng đặt qua `VITE_MAP_TILE_URL` + `VITE_MAP_ATTRIBUTION` (Secrets/Variables GitHub). Không dùng Google Maps thật (cần thẻ thanh toán); người dùng đã chọn thử MapTiler/Vietmap.
- Người dùng cho phép luôn `git push origin HEAD:main` (fast-forward) sau mỗi lần sửa.
- Không commit khóa API vào repo (bị hệ thống chặn, giữ nguyên).

## Bước tiếp theo (theo thứ tự ưu tiên)
_(Thay 30/09 tối theo `QUY-TRINH.md` mục A.)_
1. **G3 — diễn tập bằng bản hiện tại:** chạy migration 002, cấp quyền chỉ huy `0702760399`, xác nhận hết khung "Bản chạy thử" (Supabase thật), rồi 2–3 điện thoại ngoài trời đi trọn luồng (tạo đội, cấp quyền cứu hộ, bật ca, SOS, nhận/từ chối, cứu xong). Ghi lại sai số GPS và SMS dự phòng — bài học đưa vào bản viết lại.
2. **G4 — viết lại khung Greencie** + chống phá (giới hạn SOS khách, khoá/cờ báo giả, cứu hộ chỉ thấy SOS được giao/gần mình, ô đồng ý dữ liệu sức khoẻ). Hỏi lại chủ dự án về bộ kiểm phân quyền trước khi bắt đầu.
3. **G5 — lên VPS ACA, Docker riêng** + sao lưu đêm + bảng tổng quan (đăng bảng tin CRM-CẢNH) + thử chịu tải.
4. G6–G10 theo `QUY-TRINH.md`. Chuyện bản đồ MapTiler/Google (mục "Còn dở") xử lý khi làm giao diện bản mới.

## Kiểm tra lúc bàn giao
- Build: `npm run build` OK (`✓ built`)
- Test: `npm test`: 31/31 pass
- Lint: `npm run lint`: 0 lỗi, 4 cảnh báo (`set-state-in-effect`)
- Typecheck: `npx tsc -b` không lỗi
- Deploy: 2 lần chạy gần nhất trên `main` thành công (lần đầu lỗi do quy tắc môi trường `github-pages`, đã đặt No restriction)

## Lịch sử phiên trước
- 2026-09-30: khởi tạo skill kickoff/handoff.
