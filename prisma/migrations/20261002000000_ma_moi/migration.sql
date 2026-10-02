-- Mã mời vào đội: chỉ huy tạo mã cho đội, cứu hộ đăng ký / nhập mã là vào đúng đội (src/lib/ma-moi.ts).
-- Chỉ THÊM bảng + cột, không đụng dữ liệu cũ. Hoàn tác: DROP COLUMN "maMoiId"; DROP TABLE "MaMoi".

-- AlterTable
ALTER TABLE "NguoiDung" ADD COLUMN "maMoiId" TEXT;

-- CreateTable
CREATE TABLE "MaMoi" (
    "id" TEXT NOT NULL,
    "ma" TEXT NOT NULL,
    "doiId" TEXT NOT NULL,
    "taoBoiId" TEXT,
    "hetHanLuc" TIMESTAMP(3) NOT NULL,
    "luotToiDa" INTEGER NOT NULL DEFAULT 30,
    "luotDaDung" INTEGER NOT NULL DEFAULT 0,
    "thuHoiLuc" TIMESTAMP(3),
    "taoLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaMoi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaMoi_ma_key" ON "MaMoi"("ma");

-- CreateIndex
CREATE INDEX "MaMoi_doiId_idx" ON "MaMoi"("doiId");

-- AddForeignKey
ALTER TABLE "NguoiDung" ADD CONSTRAINT "NguoiDung_maMoiId_fkey" FOREIGN KEY ("maMoiId") REFERENCES "MaMoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaMoi" ADD CONSTRAINT "MaMoi_doiId_fkey" FOREIGN KEY ("doiId") REFERENCES "Doi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
