#!/bin/sh
# Bộ hẹn giờ của SOS vùng lũ (ảnh postgres:16-alpine: có sẵn pg_dump + crond + wget).
#  - mỗi phút: gọi app quét điều phối (đội quá 2 phút chưa nhận → chuyển đội khác)
#  - 03:15 hằng đêm: pg_dump vào /sao-luu, giữ 14 ngày (đẩy lên Drive: G5, xem QUY-TRINH.md B1)
set -eu

# crond của busybox không truyền biến môi trường cho việc → ghi ra tệp (600) để mỗi việc tự nạp.
{
  echo "export KHOA_TAC_VU=\"$KHOA_TAC_VU\""
  echo "export PGPASSWORD=\"$PGPASSWORD\""
  echo "export POSTGRES_USER=\"$POSTGRES_USER\""
  echo "export POSTGRES_DB=\"$POSTGRES_DB\""
  echo "export TZ=\"${TZ:-Asia/Ho_Chi_Minh}\""
} > /etc/moi-truong-cron
chmod 600 /etc/moi-truong-cron

cat > /etc/crontabs/root <<'CRON'
* * * * * /bin/sh /goi-dieu-phoi.sh
15 3 * * * /bin/sh /sao-luu-csdl.sh >> /sao-luu/sao-luu.log 2>&1
CRON

cat > /goi-dieu-phoi.sh <<'VIEC'
. /etc/moi-truong-cron
wget -qO- --header="x-khoa-tac-vu: $KHOA_TAC_VU" --post-data="" http://sos-vung-lu-app:3000/api/tac-vu/dieu-phoi >/dev/null 2>&1
VIEC

echo "$(date '+%F %T') cron SOS vung lu chay"
exec crond -f -l 8
