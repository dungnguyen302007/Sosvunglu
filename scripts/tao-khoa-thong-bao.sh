#!/bin/sh
# Tạo cặp khoá VAPID cho THÔNG BÁO ĐẨY và ghi vào .env (chạy MỘT LẦN trên VPS, trong thư mục dự án):
#   sh scripts/tao-khoa-thong-bao.sh
# Đã có khoá trong .env thì không làm gì (đổi khoá = mọi máy đã bật thông báo phải bật lại).
# Khoá riêng không in ra màn hình. Xong thì: docker compose up -d
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Khong thay .env trong $(pwd)"; exit 1; }
if grep -q '^VAPID_PRIVATE=.\+' .env; then
  echo "Da co khoa VAPID trong .env - khong tao lai."
  exit 0
fi
cp .env ".env.truoc-vapid.$(date +%Y%m%d-%H%M%S)"
KQ=$(docker compose --profile tools run --rm -T tools npx web-push generate-vapid-keys --json)
CONG=$(printf '%s' "$KQ" | sed -n 's/.*"publicKey":"\([^"]*\)".*/\1/p')
RIENG=$(printf '%s' "$KQ" | sed -n 's/.*"privateKey":"\([^"]*\)".*/\1/p')
[ -n "$CONG" ] && [ -n "$RIENG" ] || { echo "Khong tao duoc khoa."; exit 1; }
sed -i '/^VAPID_PUBLIC=/d;/^VAPID_PRIVATE=/d' .env
printf '\n# Khoa thong bao day (web push) - tao %s\nVAPID_PUBLIC=%s\nVAPID_PRIVATE=%s\n' "$(date +%F)" "$CONG" "$RIENG" >> .env
echo "Da ghi VAPID_PUBLIC / VAPID_PRIVATE vao .env (ban cu luu o .env.truoc-vapid.*). Chay: docker compose up -d"
