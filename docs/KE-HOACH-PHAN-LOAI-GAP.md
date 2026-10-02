# Kế hoạch: tự nhận diện ca GẤP (phân loại mức khẩn)

> Lập 02/10/2026 theo yêu cầu chủ dự án. CHƯA làm — chờ chốt 3 câu ở cuối.
> Vấn đề: người cảm nhẹ cũng bấm "gấp", người nặng không được tới đúng lúc.

## Hiện trạng

Điểm ưu tiên (`src/lib/priority.ts`) = mức nước + "có người bị thương" (một ô có/không) + số nhóm dễ tổn thương + pin yếu + số người + thời gian chờ. Tất cả do người dân TỰ KHAI, không ai kiểm; "bị thương" không phân biệt trầy xước với bất tỉnh.

## Nguyên tắc

1. **Hỏi SỰ VIỆC nhìn thấy được, không hỏi "có gấp không".** Ai cũng thấy mình gấp; nhưng "có ai bất tỉnh / khó thở không" thì khó trả lời bừa.
2. **Ba mức, tính bằng luật cố định** (không phải cộng điểm mơ hồ): ĐỎ = nguy tính mạng trong vài giờ · VÀNG = cần tới trong ngày · XANH = không nguy hiểm, chủ yếu cần tiếp tế.
3. **Tách "cứu người" khỏi "tiếp tế"** (đồ ăn, nước, thuốc thường). Phần lớn ca "nhẹ mà bấm gấp" thật ra là cần tiếp tế — cho họ một lối riêng thì họ không chen vào hàng cứu người.
4. **Người tự khai chỉ là bước 1.** Mức cuối do máy đối chiếu + người xác minh quyết định, và luôn ghi rõ "tự khai" hay "đã xác minh".
5. **Sai về phía an toàn:** không chắc thì xếp cao hơn, không thấp hơn.

## Ba lớp nhận diện

### Lớp 1 — Câu hỏi sau khi bấm SOS (không chặn việc gửi)

SOS vẫn gửi ngay như bây giờ. Sau đó hiện tối đa 3 câu, mỗi câu một chạm:

- **Nước:** tới đâu (đã có) + "đang lên nhanh / đứng yên / đang rút".
- **Chỗ trú:** "còn chỗ cao để ở (gác, tầng 2, mái)" / "đang ở trên mái, không còn chỗ lên" / "đang ở dưới nước".
- **Người:** chọn các dòng đúng — "bất tỉnh / khó thở / chảy máu không cầm được / đang chuyển dạ / co giật" (ĐỎ) · "gãy tay chân, sốt cao, hết thuốc bệnh nền (tim, tiểu đường, chạy thận)" (VÀNG) · "cảm, mệt, trầy xước" (XANH) · "không ai bị gì".

Luật (hàm thuần, có bài kiểm): có dấu hiệu ĐỎ về người → ĐỎ. Nước tới ngực trở lên VÀ không còn chỗ lên → ĐỎ. Nước tới gối, còn chỗ cao, có người dễ tổn thương hoặc dấu hiệu VÀNG → VÀNG. Còn lại → XANH. Chưa trả lời câu nào → VÀNG (chưa biết thì không xếp thấp).

### Lớp 2 — Máy tự đối chiếu (người dân không bịa được)

- **Hàng xóm:** các SOS trong ~300 m báo mức nước khác hẳn nhau → gắn cờ "cần xác minh". Cả xóm cùng báo nước tới ngực → tin hơn.
- **Diễn biến:** chờ lâu, pin tụt, người dân cập nhật "nước đang lên" → tự nâng mức. Mỗi 30 phút hỏi lại một câu "tình hình xấu hơn không?".
- **Lịch sử:** hồ sơ khai TRƯỚC mùa lũ (người già, bệnh nền) đáng tin hơn khai lúc gửi. SĐT từng báo giả → luôn cần xác minh.

### Lớp 3 — Người xác minh

- Ca ĐỎ chưa xác minh hiện đầu danh sách chỉ huy kèm nút gọi. Gọi 30 giây theo 3 câu hỏi mẫu rồi bấm "Đúng ĐỎ" / "Hạ xuống VÀNG / XANH" / "Không nghe máy" (không nghe máy → GIỮ đỏ).
- Đội tới nơi bấm thêm một ô "thực tế: nặng hơn / đúng / nhẹ hơn". Số liệu này dùng để sửa câu hỏi cho đợt sau.
- Mọi lần đổi mức ghi vào nhật ký SOS (ai, lúc nào, lý do).

## Chia đợt

| Đợt | Nội dung | Ước lượng |
|---|---|---|
| 1 | Bộ câu hỏi mới + luật 3 mức (hàm thuần + bài kiểm) + lối "tiếp tế" riêng + chỉ huy xác minh / đổi mức + nhãn "tự khai / đã xác minh" + thông báo đẩy ưu tiên ca ĐỎ | ~1 buổi |
| 2 | Đối chiếu hàng xóm, tự nâng mức theo thời gian, hỏi lại 30 phút, ô phản hồi khi đội tới nơi | ~1 buổi |
| 3 | Ảnh mực nước (bằng chứng mạnh nhất; cần chỗ lưu ảnh + luật ai được xem), thống kê tự khai so với thực tế | sau khi chạy thật |

Đợt 1 đụng CSDL (thêm cột vào `YeuCauSos`), điều phối và màn chỉ huy → Opus + High.

## Rủi ro

- Câu hỏi dài quá thì người đang hoảng không trả lời → tối đa 3 câu, mỗi câu một chạm, bỏ qua được.
- Hạ nhầm một ca nặng là chết người → mặc định xếp cao khi thiếu thông tin; chỉ NGƯỜI mới được hạ mức ĐỎ, máy không tự hạ.
- Danh sách dấu hiệu y tế ở trên do Claude soạn, **chưa qua người có chuyên môn** → cần người làm cứu hộ / y tế (115, Chữ thập đỏ địa phương) xem lại trước khi dùng thật.

## Cần chủ dự án chốt

1. Có tách lối "tiếp tế" riêng không? (Claude đề nghị có.)
2. Ai xác minh ca ĐỎ: chỉ huy tự gọi, hay thêm vai "điều phối viên" chuyên gọi điện?
3. Có ai có chuyên môn xem lại danh sách dấu hiệu ĐỎ / VÀNG / XANH không?
