#!/bin/sh
. /etc/moi-truong-cron
set -eu
LUC=$(date +%Y%m%d_%H%M)
TEP="/sao-luu/sos_vung_lu_${LUC}.dump"
pg_dump -h sos-vung-lu-postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$TEP.tmp"
mv "$TEP.tmp" "$TEP"
chmod 600 "$TEP"
# Dọn bản dưới máy cũ hơn 14 ngày — CHỈ tệp đúng khuôn tên, không đụng gì khác.
find /sao-luu -maxdepth 1 -name 'sos_vung_lu_*.dump' -mtime +14 -print -delete
echo "$(date '+%F %T') Xong: $(basename "$TEP") $(wc -c < "$TEP") byte"
