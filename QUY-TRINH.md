# QUY TRÌNH — SOS VÙNG LŨ

> Chốt lúc `/kickoff` ngày 30/09/2026, theo skill `quy-trinh-chung`. Mục bị bỏ thì ghi `ĐÃ LOẠI — lý do — ngày`, không xoá dòng.
> ⚠️ Kho GitHub đang **CÔNG KHAI**: KHÔNG ghi IP, tên máy chủ, đường dẫn trên VPS, tên container… vào tệp này.
> Những thứ đó để ở `CLAUDE.local.md` (chỉ nằm trên máy chủ dự án, đã chặn bằng `.gitignore`).

Dự án **nội bộ của chủ dự án** (không phải khách). Ba vai: **người dân** (gửi SOS) · **cứu hộ** (đi ngoài hiện trường) ·
**chỉ huy** (điều hành chung, điều phối tất cả).

## Quyết định lớn (30/09/2026)

| Việc | Chốt | Ghi chú |
|---|---|---|
| Công nghệ | **Viết lại theo khuôn Greencie** — Next.js 15 App Router + Prisma + PostgreSQL 16 + Docker Compose | Bản Vite + Supabase hiện tại (GĐ1–2) vẫn chạy trên GitHub Pages tới khi bản mới thay được. Chép sang các phần tính thuần: `priority.ts`, `geo.ts`, `dispatch.ts`, `queue.ts` + bài kiểm của chúng |
| Máy chủ | **Chạy hết trên VPS ACA, một bộ Docker RIÊNG** (thư mục riêng, compose riêng, Postgres riêng, mạng riêng) | Rủi ro đã nói rõ với chủ dự án: lũ vọt tải có thể kéo sập ACA/Greencie/An Gia, và ngược lại. Giảm nhẹ: **giới hạn RAM/CPU** cho mọi container SOS (`mem_limit`, `cpus`), Postgres riêng không dùng chung, thử chịu tải trước mùa lũ |
| Kho GitHub | Tạm để công khai (chủ dự án chưa chọn) | Bàn lại ở G5: lên VPS rồi thì không cần GitHub Pages → nên chuyển riêng tư |

## A. Chia việc thành các G (giữ nguyên số kể cả khi loại)

| G | Nội dung | Trạng thái |
|---|---|---|
| G0 | Khung bản Vite + Supabase, GitHub Pages | ✅ 30/09 |
| G1 | MVP: đăng ký SĐT, nút SOS giữ 2 giây, hàng đợi mất sóng + SMS, 3 vai, RLS | ✅ 30/09 |
| G2 | Tự giao đội gần nhất (3 km), nhận/từ chối 2 phút, gộp SOS trùng, toàn cảnh chỉ huy | ✅ 30/09 |
| G3 | **Diễn tập bằng bản hiện tại** — 2–3 điện thoại ngoài trời, sóng yếu: sai số GPS, SMS dự phòng, trọn luồng tạo đội → SOS → cứu xong | Tiếp theo |
| G4 | **Viết lại khung Greencie** (đăng nhập SĐT, mô hình dữ liệu Prisma, phân quyền ở tầng truy vấn, cập nhật tức thì, PWA mất mạng) + **chống phá**: giới hạn SOS khách, khoá tài khoản/cờ báo giả, cứu hộ chỉ thấy SOS được giao/gần mình, ô đồng ý thu dữ liệu sức khoẻ, cân nhắc xác minh SĐT | Chưa |
| G5 | **Lên VPS ACA** (Docker riêng, giới hạn tài nguyên, tên miền + SSL) · sao lưu đêm · gắn bảng tổng quan · thử chịu tải | Chưa |
| G6 | GĐ2 còn lại: báo động đẩy tới máy đội, ảnh hiện trường, radar mưa, "tạm dừng cứu hộ vì gió mạnh" | Chưa |
| G7 | **Đăng ký hộ**: trưởng thôn / cán bộ xã đăng ký giùm người già không có smartphone; mã QR dán nhà văn hoá | Chưa |
| G8 | **Theo đợt lũ + địa bàn**: mỗi đợt một sự kiện; chỉ huy/cứu hộ chỉ thấy địa bàn mình (dời lên sớm nếu ≥ 2 tỉnh dùng) | Chưa |
| G9 | GĐ3: tổng đài SMS hai chiều, Meshtastic/LoRa | Chưa |
| G10 | **Sau lũ**: báo cáo tổng kết, tự xoá vị trí cứu hộ sau 30 ngày, nhu yếu phẩm | Chưa |

Mỗi G xong thì dừng cho chủ dự án bấm thử rồi mới đi tiếp.

## B. Năm khối bắt buộc

### B1. Sao lưu và khôi phục — ✅ LÀM (chốt 30/09/2026), dựng ở G5
- CSDL dump mỗi đêm → Google Drive **mã hoá** (rclone crypt), thư mục riêng `SOS_VUNG_LU/` (`csdl/`, `ma-nguon/`, `KHOI-PHUC.md`).
- Script đẩy lên Drive phải tự dọn bản cũ dưới máy (giữ 14 ngày), đối chiếu tên + kích thước trước khi xoá.
- **Cùng phiên dựng sao lưu phải gắn dòng theo dõi lên bảng tổng quan** (quy trình chung C7) — phiên này không sửa được bảng thì đăng bảng tin cho CRM-CẢNH.
- Thêm SOS vào **két khôi phục chung** (script gom của CRM-CẢNH) — đăng bảng tin cho CRM-CẢNH khi lên VPS.
- Diễn tập khôi phục ít nhất một lần trước mùa lũ.
- ⚠️ Bản Supabase miễn phí hiện tại **không có bản sao lưu tải về** và **tự ngủ sau ~7 ngày không dùng** — chỉ dùng để thử, không dùng lúc lũ thật.

### B2. Bảo mật và phân quyền
- Chặn ở tầng truy vấn, nhánh mặc định trả rỗng; không tìm thấy và không có quyền trả cùng một phản hồi.
- Vai cứu hộ/chỉ huy **không tự đăng ký được**, chỉ huy nâng quyền (giữ như bản hiện tại).
- Dữ liệu sức khoẻ (bệnh nền, khuyết tật, mang thai) là dữ liệu cá nhân nhạy cảm → cần ô đồng ý khi thu, thu ít nhất có thể, không thu CCCD.
- Phần **công khai** (trang người dân gửi SOS) được lên Google; phần **nội bộ** (cứu hộ, chỉ huy, API) gắn `X-Robots-Tag: noindex` cho mọi phản hồi.
- Mỗi đường dữ liệu mới (xuất Excel, API, SMS gateway, trợ lý AI) đi qua đúng lớp phân quyền.

### B3. Kiểm thử và tester
- **Bộ kiểm phân quyền tự động — CÒN TREO** (quy trình chung ghi là bắt buộc trước khi bàn giao; chủ dự án chưa chọn 30/09). Hỏi lại khi bắt đầu G4.
- **Môi trường thử riêng — CHƯA LÀM** (chủ dự án chưa chọn 30/09). Bàn lại ở G5. Robot kiểm thử không bao giờ chạy vào bản chính.
- Trang mới dựng xong phải tự mở bằng tài khoản thật ở khổ điện thoại 375px mới coi là xong.

### B4. Trợ lý AI (MCP) — CHƯA LÀM (30/09/2026), để G cuối nếu muốn
- Nếu làm: trợ lý **không có đường đi** tới hồ sơ sức khoẻ và SĐT của dân.

### B5. Kickoff và Handoff
- Cuối mỗi buổi: `/handoff`. Đầu phiên: "đọc HANDOFF.md rồi làm tiếp".
- `CLAUDE.md` = sự thật cố định · `HANDOFF.md` = trạng thái · `QUY-TRINH.md` = tệp này · `CLAUDE.local.md` = thông tin máy chủ (không lên git).
