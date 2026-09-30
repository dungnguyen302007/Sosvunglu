#!/bin/sh
# Chạy MỘT LẦN khi Postgres khởi tạo thư mục dữ liệu trống (docker-entrypoint-initdb.d).
# Tạo tài khoản QUYỀN THẤP `sos_app` cho ứng dụng: chỉ đọc/ghi dữ liệu, không tạo/xoá bảng.
# Tài khoản chủ ($POSTGRES_USER) chỉ dùng cho migrate (service tools) và pg_dump (cron).
# Vì sao (bài học An Gia 16/09/2026): mọi lớp quyền nằm trong app; app bị chạy mã tuỳ ý mà nối
# bằng tài khoản chủ/superuser là đọc hết + chạy được lệnh shell trong container CSDL.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE sos_app LOGIN PASSWORD '${MAT_KHAU_CSDL_APP}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO sos_app;
GRANT USAGE ON SCHEMA public TO sos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sos_app;
SQL
