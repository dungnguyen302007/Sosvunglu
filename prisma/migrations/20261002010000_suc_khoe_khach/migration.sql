-- Khách (SOS khẩn, không tài khoản) tự khai người dễ tổn thương sau khi gửi. Chỉ THÊM cột.
-- Hoàn tác: ALTER TABLE "YeuCauSos" DROP COLUMN "deTonThuongKhach";

-- AlterTable
ALTER TABLE "YeuCauSos" ADD COLUMN "deTonThuongKhach" "NhomDeTonThuong"[] DEFAULT ARRAY[]::"NhomDeTonThuong"[];
