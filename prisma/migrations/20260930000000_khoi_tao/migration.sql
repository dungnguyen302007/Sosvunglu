-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VaiTro" AS ENUM ('DAN', 'CUU_HO', 'CHI_HUY');

-- CreateEnum
CREATE TYPE "NhomDeTonThuong" AS ENUM ('NGUOI_GIA', 'TRE_NHO', 'KHUYET_TAT', 'BENH_NEN', 'MANG_THAI');

-- CreateEnum
CREATE TYPE "TrangThaiSos" AS ENUM ('CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI', 'DA_AN_TOAN', 'KHONG_TIEP_CAN', 'DA_HUY');

-- CreateEnum
CREATE TYPE "MucNuoc" AS ENUM ('MAT_CA', 'DAU_GOI', 'NGUC', 'MAI_NHA');

-- CreateEnum
CREATE TYPE "TrangThaiDoi" AS ENUM ('SAN_SANG', 'DANG_LAM', 'NGHI', 'HET_NHIEN_LIEU');

-- CreateTable
CREATE TABLE "NguoiDung" (
    "id" TEXT NOT NULL,
    "hoTen" TEXT NOT NULL,
    "sdt" TEXT NOT NULL,
    "matKhauBam" TEXT NOT NULL,
    "vaiTro" "VaiTro" NOT NULL DEFAULT 'DAN',
    "doiId" TEXT,
    "tinh" TEXT,
    "xa" TEXT,
    "thon" TEXT,
    "diaChi" TEXT,
    "soNguoi" INTEGER NOT NULL DEFAULT 1,
    "deTonThuong" "NhomDeTonThuong"[],
    "sdtNguoiThan" TEXT,
    "ghiChu" TEXT,
    "nhaLat" DOUBLE PRECISION,
    "nhaLng" DOUBLE PRECISION,
    "dongYLuc" TIMESTAMP(3),
    "biKhoa" BOOLEAN NOT NULL DEFAULT false,
    "phienBan" INTEGER NOT NULL DEFAULT 1,
    "taoLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NguoiDung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doi" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "phuongTien" TEXT NOT NULL DEFAULT 'xuồng',
    "sucCho" INTEGER NOT NULL DEFAULT 6,
    "trangThai" "TrangThaiDoi" NOT NULL DEFAULT 'SAN_SANG',
    "taoLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YeuCauSos" (
    "id" TEXT NOT NULL,
    "nguoiGuiId" TEXT,
    "tenKhach" TEXT,
    "sdtKhach" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "saiSo" DOUBLE PRECISION,
    "pin" INTEGER,
    "soNguoi" INTEGER NOT NULL DEFAULT 1,
    "mucNuoc" "MucNuoc",
    "biThuong" BOOLEAN NOT NULL DEFAULT false,
    "ghiChu" TEXT,
    "trangThai" "TrangThaiSos" NOT NULL DEFAULT 'CHO_CUU',
    "doiId" TEXT,
    "giaoLuc" TIMESTAMP(3),
    "nhanLuc" TIMESTAMP(3),
    "doiDaThu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baoGia" BOOLEAN NOT NULL DEFAULT false,
    "ipGui" TEXT,
    "taoLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capNhatLuc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YeuCauSos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViTriCuuHo" (
    "nguoiDungId" TEXT NOT NULL,
    "doiId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "trongCa" BOOLEAN NOT NULL DEFAULT false,
    "capNhatLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViTriCuuHo_pkey" PRIMARY KEY ("nguoiDungId")
);

-- CreateTable
CREATE TABLE "NhatKySos" (
    "id" TEXT NOT NULL,
    "sosId" TEXT NOT NULL,
    "nguoiLamId" TEXT,
    "hanhDong" TEXT NOT NULL,
    "chiTiet" JSONB,
    "luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NhatKySos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NguoiDung_sdt_key" ON "NguoiDung"("sdt");

-- CreateIndex
CREATE INDEX "NguoiDung_vaiTro_idx" ON "NguoiDung"("vaiTro");

-- CreateIndex
CREATE INDEX "YeuCauSos_trangThai_idx" ON "YeuCauSos"("trangThai");

-- CreateIndex
CREATE INDEX "YeuCauSos_doiId_idx" ON "YeuCauSos"("doiId");

-- CreateIndex
CREATE INDEX "YeuCauSos_nguoiGuiId_idx" ON "YeuCauSos"("nguoiGuiId");

-- CreateIndex
CREATE INDEX "YeuCauSos_sdtKhach_idx" ON "YeuCauSos"("sdtKhach");

-- CreateIndex
CREATE INDEX "NhatKySos_sosId_idx" ON "NhatKySos"("sosId");

-- AddForeignKey
ALTER TABLE "NguoiDung" ADD CONSTRAINT "NguoiDung_doiId_fkey" FOREIGN KEY ("doiId") REFERENCES "Doi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YeuCauSos" ADD CONSTRAINT "YeuCauSos_nguoiGuiId_fkey" FOREIGN KEY ("nguoiGuiId") REFERENCES "NguoiDung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YeuCauSos" ADD CONSTRAINT "YeuCauSos_doiId_fkey" FOREIGN KEY ("doiId") REFERENCES "Doi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViTriCuuHo" ADD CONSTRAINT "ViTriCuuHo_nguoiDungId_fkey" FOREIGN KEY ("nguoiDungId") REFERENCES "NguoiDung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViTriCuuHo" ADD CONSTRAINT "ViTriCuuHo_doiId_fkey" FOREIGN KEY ("doiId") REFERENCES "Doi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhatKySos" ADD CONSTRAINT "NhatKySos_sosId_fkey" FOREIGN KEY ("sosId") REFERENCES "YeuCauSos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NhatKySos" ADD CONSTRAINT "NhatKySos_nguoiLamId_fkey" FOREIGN KEY ("nguoiLamId") REFERENCES "NguoiDung"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Mỗi người / mỗi SĐT khách chỉ có MỘT SOS đang cần cứu (chặn ở CSDL, không chỉ ở app —
-- hàng đợi mất mạng có thể gửi lại cùng lúc). Prisma chưa khai được chỉ mục có điều kiện.
CREATE UNIQUE INDEX "sos_mot_dang_mo_moi_nguoi" ON "YeuCauSos" ("nguoiGuiId")
  WHERE "trangThai" IN ('CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI', 'KHONG_TIEP_CAN') AND "nguoiGuiId" IS NOT NULL;
CREATE UNIQUE INDEX "sos_mot_dang_mo_moi_khach" ON "YeuCauSos" ("sdtKhach")
  WHERE "trangThai" IN ('CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI', 'KHONG_TIEP_CAN') AND "nguoiGuiId" IS NULL AND "sdtKhach" IS NOT NULL;
