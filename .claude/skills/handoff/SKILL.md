---
name: handoff
description: Bàn giao cuối phiên — ghi lại đã làm gì, còn gì dở, bước tiếp theo vào HANDOFF.md rồi commit và push. Dùng khi người dùng gõ /handoff, hoặc nói "bàn giao", "kết thúc phiên", "lưu tiến độ", "handoff".
---

# Handoff

Mục tiêu: phiên sau (trên cloud hay máy người dùng) đọc `HANDOFF.md` là làm tiếp được ngay. Container cloud bị xóa khi phiên kết thúc, nên mọi thứ chưa commit và push sẽ mất.

## Bước 1 — Thu thập thông tin

1. `git status` và `git diff` để xem thay đổi chưa commit.
2. `git log --oneline` từ lần handoff trước (hoặc 20 commit gần nhất).
3. Nhớ lại trong cuộc trò chuyện: người dùng yêu cầu gì, đã quyết định gì, vướng ở đâu.
4. Chạy build/test/lint theo `CLAUDE.md` để ghi đúng tình trạng hiện tại. Không đoán, không ghi "chạy tốt" nếu chưa chạy.

## Bước 2 — Viết HANDOFF.md

Ghi đè `HANDOFF.md` ở thư mục gốc theo mẫu dưới. Viết tiếng Việt, ngắn gọn, cụ thể (đường dẫn file, tên lệnh). Chuyển các mục cũ đã xong sang phần lịch sử ở cuối, chỉ giữ 5 phiên gần nhất.

```markdown
# HANDOFF

_Cập nhật: <YYYY-MM-DD> — nhánh `<nhánh>` — commit `<hash ngắn>`_

## Trạng thái hiện tại
<1–3 câu: dự án đang ở đâu, chạy được đến mức nào.>

## Phiên này đã làm
- ...

## Còn dở / chưa xong
- ... (ghi rõ file nào, dừng ở bước nào)

## Lỗi / vấn đề đã biết
- ... (kèm thông báo lỗi nếu có; ghi "Không có" nếu không có)

## Quyết định quan trọng
- ... (đã chọn gì và vì sao, để phiên sau không bàn lại)

## Bước tiếp theo (theo thứ tự ưu tiên)
1. ...

## Kiểm tra lúc bàn giao
- Build: <kết quả thật>
- Test: <kết quả thật>
- Lint: <kết quả thật>

## Lịch sử phiên trước
- <ngày>: <tóm tắt 1 dòng>
```

Nếu `CLAUDE.md` có thông tin đã cũ (lệnh chạy, cấu trúc thư mục), cập nhật luôn.

## Bước 3 — Commit và push

1. Commit tất cả thay đổi đang dở kèm `HANDOFF.md`, message dạng `docs: handoff <ngày> — <tóm tắt ngắn>`.
2. Push lên nhánh làm việc của phiên (`git push -u origin <nhánh-hiện-tại>`). Lỗi mạng thì thử lại tối đa 4 lần (chờ 2s, 4s, 8s, 16s).
3. Báo lại người dùng: đã push lên nhánh nào, tóm tắt 3–5 dòng nội dung bàn giao.
