# HANDOFF — SOS vùng lũ

> Đường dẫn: `D:\Clau Cowork\SOS VÙNG LŨ`
> Cập nhật: 2026-10-02 08:30
> Git: `g4-viet-lai` — đợt 02/10 đã commit trên máy, **CHƯA push, CHƯA lên VPS**
> Đang chạy: **https://cuuho.websitekhoinghiep.net** = bản 01/10 (`c7d9054`), chưa có các thay đổi dưới. Thư mục/IP ở `CLAUDE.local.md`. Bản cũ Vite + Supabase vẫn ở nhánh `main` / GitHub Pages.

## 1. Phiên này đã làm gì (02/10)
- **Mã mời đội** — `src/lib/ma-moi.ts` (luật, 7 bài kiểm), `src/lib/may-chu/ma-moi.ts`, `/api/ma-moi` (+`/thu-hoi`, `/dung`), `/api/dang-ky` nhận `ma_moi`; bảng `MaMoi` + cột `NguoiDung.maMoiId` (migration `20261002000000_ma_moi`, chỉ thêm). Chỉ huy: thẻ đội có ô tạo mã / gửi link / QR / thu hồi (`CommanderHome.tsx` `InviteBox`). Link `/?moi=MÃ` mở thẳng form đăng ký cứu hộ ngắn (`AuthPage.tsx`); người đã có tài khoản: Menu → "Tôi là cứu hộ" (`JoinTeam.tsx`).
- **Ai thấy vị trí cứu hộ nào** — `mucXemViTri` + `doiDangCuu` trong `src/lib/quyen-sos.ts` (10 bài kiểm mới), `/api/vi-tri` GET lọc theo luật. Dân: bản đồ trong thẻ trạng thái SOS, thấy xuồng đội ĐÃ NHẬN + "cách khoảng X km". Cứu hộ: thấy đồng đội + đội khác trong 10 km, bấm xuồng ra tên/SĐT.
- **Tắt ca** — `/api/ca-truc` + `doiHetNguoiTruc` (`dieu-phoi.ts`): theo từng người; cả đội hết người trong ca mà còn việc dở → trả việc cho đội khác / về chờ. Đang "đang tới" thì gửi vị trí 20 giây/lần (thường 60 giây).
- **Icon bản đồ** — người cần cứu = hình người (1 người 1 hình, quá 5 thì 5 hình + số), cứu hộ = xuồng to kèm tên đội (`SosMap.tsx`, `globals.css`).
- **Màn mở đầu = SOS khẩn** (không cần đăng ký), tab Đăng nhập / Đăng ký xếp sau.
- Thêm thư viện `qrcode`. Kiểm: `npm test` 58/58, thử ngược 2 luật (đỏ đúng chỗ), `tsc` sạch, `next build` qua. **Chưa chạy thử với CSDL thật** (máy này không có Docker/Postgres).

## 2. Quyết định đã chốt
- Cứu hộ vào đội bằng **mã mời** (hạn 24 giờ, 30 lượt, thu hồi được); không có form tự nhận cứu hộ — chủ dự án 02/10.
- Dân chỉ thấy đội của mình và chỉ sau khi đội bấm nhận; cứu hộ chỉ thấy dân ĐANG kêu cứu (không thấy mọi nhà dân); tắt ca tính theo từng người — chủ dự án gật 02/10.
- Dân không bắt buộc đăng ký mới bấm SOS (chủ dự án 02/10) → SOS khẩn làm màn đầu.
- Các quyết định 30/09–01/10 giữ nguyên: khuôn Greencie, Docker riêng trên VPS ACA, không chuyển dữ liệu Supabase cũ, bỏ Google Maps, giao diện chép chưa coi là xong.

## 3. Đã thử và LOẠI
- Form "tôi là cứu hộ" ai cũng bấm được / chờ chỉ huy duyệt từng người — kẻ xấu vào dễ, lúc bão vẫn nghẽn.
- Vẽ đường đi theo phố cho dân — cần dịch vụ chỉ đường trả phí, lúc ngập chỉ sai; thay bằng xuồng nhích dần + khoảng cách.
- Tắt ca = tắt cả đội — một người mệt làm cả đội biến mất.
- Xét "còn tín hiệu 15 phút" khi quyết định trả việc — đồng đội lái xuồng, máy tắt màn hình sẽ bị coi là nghỉ.
- (cũ) Tự cài Supabase lên VPS; giữ Vite + Supabase cloud; "realtime" giữ kết nối mở.

## 4. Đang làm dở
- **Đưa đợt 02/10 lên VPS**: push `g4-viet-lai` → trên VPS (thư mục dự án): `git pull --ff-only` → `docker compose build` → `docker compose --profile tools run --rm tools` (chạy migration mã mời) → `docker compose up -d`. Phiên 02/10 Claude bị chặn ssh vào VPS → chủ dự án chạy.
- **Số `0702760399` đã đăng ký, chưa rõ đã cấp chỉ huy chưa**: `docker compose --profile tools run --rm tools npx tsx scripts/cap-quyen.ts 0702760399 chi-huy`.
- Chưa ai thử các màn sau đăng nhập trên bản thật (cả bản 01/10 lẫn đợt 02/10).

## 5. Câu hỏi còn treo
- **Khách (SOS khẩn, không tài khoản) có được bổ sung sức khoẻ / số người / mức nước và xem xuồng đội tới không?** Hiện khách chỉ thấy trạng thái + tên đội. Làm được bằng mã SOS máy khách đang giữ; Claude đề nghị làm.
- Cứu hộ khoá màn hình điện thoại thì trình duyệt ngừng gửi vị trí (giới hạn của web app) — cần dặn đội để màn hình sáng, hoặc tính cách khác.
- Giữ giao diện chép hay viết lại mỗi vai một trang (`/dan`, `/cuu-ho`, `/chi-huy`)? Claude nghiêng giữ + sửa dần. Chỗ đã thấy cần rà, chưa sửa: hồ sơ có dữ liệu sức khoẻ cất ở `localStorage` `profile_cache`; chỉ huy tải tới 20.000 hộ dân + xuất CSV không ghi nhật ký; thiếu icon PNG 192/512; `SosCard` rút gọn hiện tên "Ẩn — hiện khi đội nhận".
- Kho GitHub công khai hay riêng tư (khi gộp vào `main`)? Môi trường thử riêng có làm không?

## 6. Bước tiếp theo
1. Chủ dự án gật → push + lên VPS (mục 4) + cấp chỉ huy cho `0702760399`.
2. Thử trọn vòng bằng 3 số: chỉ huy tạo đội → tạo mã mời → số 2 đăng ký bằng link → bật ca → số 3 bấm SOS → đội nhận → dân thấy xuồng → cứu xong; thử tắt ca khi còn việc dở. Xem ở khổ 375px.
3. Quyết câu "khách bổ sung thông tin + xem xuồng" (mục 5).
4. Treo khác: Drive mã hoá cho sao lưu (cần chủ dự án tạo remote rclone), chờ CRM-CẢNH gắn tổng quan + két, gộp `g4-viet-lai` vào `main` + tắt GitHub Pages.
