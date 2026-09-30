---
name: kickoff
description: Bắt đầu một dự án hoặc một phiên làm việc mới trong repo này. Dùng khi người dùng gõ /kickoff, hoặc nói "bắt đầu dự án", "khởi động", "kickoff". Đọc HANDOFF.md nếu có để làm tiếp; nếu repo trống thì dựng khung dự án và tạo CLAUDE.md.
---

# Kickoff

Mục tiêu: vào phiên là nắm được ngay dự án đang ở đâu và làm tiếp, hoặc dựng dự án mới từ đầu.

## Bước 1 — Xem hiện trạng

1. Chạy `git status`, `git log --oneline -10`, liệt kê file ở thư mục gốc.
2. Nếu có `HANDOFF.md`: đọc kỹ. Đây là ghi chú bàn giao của phiên trước.
3. Nếu có `CLAUDE.md`: đọc để nắm mô tả dự án, cách chạy, quy ước.

## Bước 2a — Repo đã có code (có HANDOFF.md hoặc CLAUDE.md)

1. Tóm tắt ngắn cho người dùng (tiếng Việt):
   - Dự án là gì, đang ở giai đoạn nào.
   - Phiên trước làm được gì, còn gì dở.
   - Các bước tiếp theo trong HANDOFF.md.
2. Kiểm tra nhanh dự án còn chạy được: cài dependency, chạy build/test/lint theo CLAUDE.md. Báo kết quả thật, lỗi thì nói rõ.
3. Hỏi người dùng muốn làm tiếp việc nào (đề xuất việc ưu tiên nhất trước), rồi bắt tay vào làm.

## Bước 2b — Repo trống (dự án mới)

1. Hỏi người dùng những điều còn thiếu (gộp một lần, đưa sẵn đề xuất mặc định):
   - Ứng dụng làm gì, ai dùng.
   - Nền tảng: web / điện thoại / cả hai.
   - Công nghệ muốn dùng (nếu chưa có thì đề xuất).
   - Làm bản mẫu (MVP) hay bản chạy thật.
2. Dựng khung dự án tối thiểu chạy được (có lệnh dev, build, lint/test).
3. Tạo `CLAUDE.md` gồm:
   - Mô tả dự án (1–3 câu).
   - Công nghệ và cấu trúc thư mục chính.
   - Lệnh cài đặt, chạy dev, build, test, lint.
   - Quy ước code và quy ước commit.
   - Dòng nhắc: "Cuối phiên chạy /handoff để cập nhật HANDOFF.md."
4. Tạo `HANDOFF.md` ban đầu theo mẫu trong skill `handoff`.
5. Chạy thử build/test để chắc khung chạy được.

## Bước 3 — Commit và push

- Commit với message rõ ràng, ví dụ `chore: kickoff dự án ...`.
- Push lên nhánh làm việc của phiên (`git push -u origin <nhánh-hiện-tại>`). Không push lên nhánh khác nếu người dùng chưa cho phép.
- Báo lại cho người dùng: đã làm gì, chạy thế nào, bước tiếp theo.
