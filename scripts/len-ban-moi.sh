#!/bin/sh
# LÊN BẢN MỚI bằng MỘT lệnh (chạy trên VPS, trong thư mục dự án):
#   sh scripts/len-ban-moi.sh
# Từ máy chủ dự án (PowerShell):
#   ssh root@<ip-vps> "cd <thu-muc-du-an>; sh scripts/len-ban-moi.sh"
#
# Làm lần lượt, hỏng bước nào DỪNG ngay ở bước đó (app cũ vẫn chạy cho tới bước khởi động):
#   1. git pull --ff-only
#   2. dựng lại CẢ app lẫn tools (phải có --profile tools — thiếu thì migration / script mới không chạy,
#      đã dính 02/10/2026); vấp lỗi mạng npm thì tự thử lại tối đa 3 lần
#   3. có migration mới → sao lưu CSDL trước, rồi mới cập nhật cấu trúc bảng
#   4. tạo khoá thông báo đẩy nếu .env chưa có
#   5. khởi động bản mới, chờ app báo khoẻ
# Không có gì mới thì thoát luôn. Muốn dựng lại dù không có mã mới: sh scripts/len-ban-moi.sh --lai
set -eu
cd "$(dirname "$0")/.."

buoc() { printf '\n=== %s ===\n' "$1"; }
hong() { printf '\n!!! HONG o buoc: %s\n    App dang chay van la ban cu (%s). Dan doan loi phia tren cho Claude.\n' "$1" "$CU"; exit 1; }

CU=$(git rev-parse --short HEAD)
buoc "1/5 Lay ma moi"
git pull --ff-only || hong "git pull"
MOI=$(git rev-parse --short HEAD)
if [ "$CU" = "$MOI" ] && [ "${1:-}" != "--lai" ]; then
  echo "Khong co ma moi (dang o $CU). Muon dung lai: sh scripts/len-ban-moi.sh --lai"
  exit 0
fi
echo "Tu $CU len $MOI:"
git log --oneline "$CU..$MOI" | head -20

buoc "2/5 Dung app + tools"
LAN=1
until docker compose --profile tools build; do
  [ "$LAN" -ge 3 ] && hong "dung anh Docker (da thu 3 lan)"
  LAN=$((LAN + 1))
  echo "Dung loi (thuong do mang) - thu lai lan $LAN sau 10 giay..."
  sleep 10
done

buoc "3/5 Cau truc CSDL"
if [ "$CU" != "$MOI" ] && git diff --quiet "$CU" "$MOI" -- prisma/migrations; then
  echo "Khong co migration moi - bo qua."
else
  echo "Sao luu CSDL truoc khi doi cau truc..."
  docker compose exec -T cron sh /sao-luu-csdl.sh || hong "sao luu CSDL truoc migration"
  docker compose --profile tools run --rm tools || hong "cap nhat cau truc CSDL (migration)"
fi

buoc "4/5 Khoa thong bao day"
sh scripts/tao-khoa-thong-bao.sh || echo "(bo qua - chua tao duoc khoa, app van chay, chi thieu thong bao day)"

buoc "5/5 Khoi dong ban moi"
docker compose up -d || hong "khoi dong"
N=0
while [ "$N" -lt 30 ]; do
  TT=$(docker inspect --format '{{.State.Health.Status}}' sos-vung-lu-app 2>/dev/null || echo "khong-ro")
  [ "$TT" = healthy ] && break
  N=$((N + 1))
  sleep 3
done
if [ "$TT" = healthy ]; then
  printf '\n>>> XONG. Dang chay ban %s (truoc do %s). App bao khoe.\n' "$MOI" "$CU"
else
  printf '\n!!! App CHUA bao khoe sau 90 giay (trang thai: %s). Xem: docker compose logs --tail 50 app\n' "$TT"
  exit 1
fi
