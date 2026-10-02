# HANDOFF — SOS vùng lũ

> Đường dẫn: `D:\Clau Cowork\SOS VÙNG LŨ`
> Cập nhật: 2026-10-02 (cuối buổi sáng)
> Git: `g4-viet-lai` @ `91994d0` + tệp này — đã push tới `91994d0`
> Đang chạy: **https://cuuho.websitekhoinghiep.net** (VPS ACA, Docker riêng — thư mục/IP ở `CLAUDE.local.md`). Bản trên VPS đang ở khoảng `8b252e8`–`4e278a6`; các bản sau đó CHƯA lên (xem mục 4). Bản cũ Vite + Supabase vẫn ở nhánh `main` / GitHub Pages.

## 1. Phiên này đã làm gì (02/10)
- **Mã mời đội** — `src/lib/ma-moi.ts` (+7 bài kiểm), `src/lib/may-chu/ma-moi.ts`, `/api/ma-moi` (+`/thu-hoi`, `/dung`), `/api/dang-ky` nhận `ma_moi`, bảng `MaMoi`; `InviteBox` ở `CommanderHome.tsx`; link `/?moi=MÃ`.
- **Ai thấy vị trí cứu hộ** — `mucXemViTri` / `doiDangCuu` (`quyen-sos.ts`), `/api/vi-tri` GET lọc theo luật; dân + khách thấy xuồng đội ĐÃ NHẬN; cứu hộ thấy đồng đội + đội trong 10 km.
- **Tắt ca** — `/api/ca-truc` + `doiHetNguoiTruc`: cả đội hết người trong ca thì trả việc đang dở.
- **Icon** — người cần cứu = hình người theo số người; cứu hộ = xuồng kèm tên đội (`SosMap.tsx`).
- **Màn mở đầu chỉ có nút SOS khẩn**; đăng nhập / đăng ký là dòng chữ nhỏ cuối trang (`AuthPage.tsx`).
- **Khách (SOS khẩn)** — báo thêm mức nước / bị thương / người dễ tổn thương / số người, sửa vị trí, huỷ, thấy xuồng: `/api/sos-khach/[id]` GET + PATCH, `khachDuocXem` / `khachDuocSua`, cột `YeuCauSos.deTonThuongKhach`.
- **Hạn mức SOS khẩn** 100/ngày theo IP và theo SĐT (`HAN_MUC_SOS_KHACH_NGAY` trong .env) — mức THỬ NGHIỆM; thẻ lỗi không còn ghi nhầm "chờ sóng"; bị máy chủ từ chối thì thôi tự gửi lại.
- **GPS** — cứu hộ gửi vị trí ngay khi có toạ độ đầu; hiện mã lỗi định vị; thẻ `GpsHelp` hướng dẫn mở quyền theo iPhone / Android; không lặng lẽ gửi lại vị trí cũ; giữ màn hình sáng khi trong ca (`useKeepScreenOn`).
- **Gõ địa chỉ** — `/api/tim-dia-chi` (Nominatim/OSM qua máy chủ, 1 lượt/giây, có cất) + ô tìm trong `LocationPicker`. Chỉ tới mức thôn / đường, không có gợi ý khi gõ.
- **Nút huỷ SOS** đổi thành dòng chữ xám cuối trang kèm câu nhắc (trước là nút xanh ✅ dễ nhầm).
- **Thông báo đẩy** — `src/lib/may-chu/thong-bao.ts`, `/api/thong-bao`, bảng `DangKyThongBao`, `public/sw.js` (push + click), `PushButton.tsx`, `scripts/tao-khoa-thong-bao.sh`. Báo đội khi được giao; báo chỉ huy + cứu hộ 10 km khi SOS chưa có đội.
- Script VPS: `scripts/dat-lai-mat-khau.ts`, `scripts/xem-vi-tri.ts` (soi vị trí, chỉ đọc).
- Kiểm: `npm test` 60/60, thử ngược 3 luật, `tsc` sạch, `next build` qua. Máy này không có Docker/Postgres → mọi thứ chạy thật lần đầu trên VPS.

## 2. Quyết định đã chốt
- Cứu hộ vào đội bằng mã mời (24 giờ, 30 lượt, thu hồi được); không có form tự nhận cứu hộ.
- Dân chỉ thấy đội của mình sau khi đội bấm nhận; cứu hộ chỉ thấy dân ĐANG kêu cứu; tắt ca tính theo từng người.
- Dân không cần đăng ký mới bấm được SOS; màn đầu chỉ có nút SOS.
- Hạn mức SOS khẩn 100/ngày trong giai đoạn thử.
- Làm thông báo đẩy + giữ sáng màn hình (cả hai).
- Cũ: khuôn Greencie, Docker riêng trên VPS ACA, bỏ Google Maps, giao diện chép chưa coi là xong.

## 3. Đã thử và LOẠI
- Form "tôi là cứu hộ" tự bấm / chờ duyệt từng người — kẻ xấu vào dễ, lúc bão nghẽn.
- Vẽ đường đi theo phố — cần dịch vụ trả phí, lúc ngập chỉ sai.
- Tắt ca = tắt cả đội; xét "còn tín hiệu 15 phút" khi trả việc.
- Hạn mức SOS khẩn 3/giờ theo IP — chủ dự án thử vài lần là bị chặn; cả xóm chung IP sẽ dính.
- Gọi thẳng dịch vụ tìm địa chỉ từ điện thoại — phá CSP `connect-src 'self'`, lộ IP dân; đi qua máy chủ.
- Xin quyền vị trí + thông báo cùng lúc khi bật ca — máy có app vẽ đè bị chặn hai lần.
- `docker compose build` không kèm `--profile tools` — KHÔNG dựng lại `tools`, migration và script mới không chạy (đã dính 02/10).
- (cũ) Tự cài Supabase; giữ Vite + Supabase cloud; "realtime" giữ kết nối mở.

## 4. Đang làm dở
- **Lên VPS bản mới nhất** (có migration `20261002020000_thong_bao_day` + cần tạo khoá VAPID), trong thư mục dự án trên VPS:
  `git pull --ff-only` → `docker compose --profile tools build` → `docker compose --profile tools run --rm tools` → `sh scripts/tao-khoa-thong-bao.sh` → `docker compose up -d`.
  Phiên 02/10 Claude bị chặn ssh → chủ dự án chạy tay.
- **Thông báo đẩy chưa thử trên máy thật** (Android Chrome; iPhone phải "Thêm vào MH chính").
- **Máy cứu hộ Android của chủ dự án**: Chrome đang ghi "từ chối" quyền vị trí (mã 1) → mở lại theo thẻ hướng dẫn; chưa xác nhận xuồng đã hiện trên bản đồ chỉ huy.
- Số `0702760399` là CHI_HUY; đang đặt lại mật khẩu bằng `dat-lai-mat-khau.ts` (chủ dự án tự gõ) — chưa rõ đã xong.

## 5. Câu hỏi còn treo
- **Phân loại mức khẩn Đỏ / Vàng / Xanh** — kế hoạch ở `docs/KE-HOACH-PHAN-LOAI-GAP.md`; chủ dự án 02/10: "để suy nghĩ sau". Cần chốt: tách lối tiếp tế? ai xác minh ca Đỏ? ai có chuyên môn xem lại danh sách dấu hiệu?
- **Gợi ý địa chỉ kiểu Google** — cần dịch vụ có dữ liệu VN (Claude đề nghị Goong; chủ dự án đăng ký khoá, tự gõ vào `.env`). Chưa trả lời.
- iPhone không đọc được % pin (Apple chặn) — có thêm ô tự chọn "pin còn nhiều / ít" không?
- Bán kính tự giao 3 km / hạn nhận 2 phút (bê từ bản cũ) có hợp vùng nông thôn không?
- Hạ hạn mức SOS khẩn khi hết giai đoạn thử.
- Giữ giao diện chép hay viết lại mỗi vai một trang? Chỗ cần rà chưa sửa: hồ sơ có dữ liệu sức khoẻ cất ở `localStorage` `profile_cache`; chỉ huy tải tới 20.000 hộ dân + xuất CSV không ghi nhật ký; thiếu icon PNG 192/512.
- Kho GitHub công khai hay riêng tư? Môi trường thử riêng?

## 6. Bước tiếp theo
1. Lên VPS bản mới nhất (mục 4), bật thông báo đẩy trên máy cứu hộ + chỉ huy, thử: dân bấm SOS → máy đội kêu khi tắt màn hình.
2. Thử trọn vòng 3 máy: tạo đội → mã mời → bật ca (xuồng hiện) → SOS khẩn → đội nhận → dân thấy xuồng → cứu xong; thử tắt ca khi còn việc dở; thử gõ địa chỉ thật ở vùng triển khai.
3. Chủ dự án quay lại các câu ở mục 5 (phân loại mức khẩn, Goong).
4. Treo khác: Drive mã hoá cho sao lưu, CRM-CẢNH gắn tổng quan + két, gộp `g4-viet-lai` vào `main` + tắt GitHub Pages; tốc độ lên bản (GitHub dựng sẵn) và mở lại ssh cho Claude.
