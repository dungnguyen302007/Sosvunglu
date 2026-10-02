-- Thông báo đẩy (web push): lưu đăng ký của từng trình duyệt cứu hộ / chỉ huy. Chỉ THÊM bảng.
-- Hoàn tác: DROP TABLE "DangKyThongBao";

-- CreateTable
CREATE TABLE "DangKyThongBao" (
    "id" TEXT NOT NULL,
    "nguoiDungId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "taoLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DangKyThongBao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DangKyThongBao_endpoint_key" ON "DangKyThongBao"("endpoint");

-- CreateIndex
CREATE INDEX "DangKyThongBao_nguoiDungId_idx" ON "DangKyThongBao"("nguoiDungId");

-- AddForeignKey
ALTER TABLE "DangKyThongBao" ADD CONSTRAINT "DangKyThongBao_nguoiDungId_fkey" FOREIGN KEY ("nguoiDungId") REFERENCES "NguoiDung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
