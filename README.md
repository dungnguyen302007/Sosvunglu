# SOS vùng lũ

Webapp cứu hộ lũ lụt: người dân **nhấn giữ một nút SOS** → hệ thống nhận hồ sơ + GPS → trung tâm chỉ huy giao cho **đội cứu hộ gần nhất**.

- **Người dân**: đăng ký một lần, đăng nhập lưu vĩnh viễn trên máy. Mất sóng thì SOS được lưu và tự gửi lại; sau 20 giây có nút gửi SMS dự phòng.
- **Cứu hộ**: bật ca trực (gửi vị trí mỗi 60 giây), nhận SOS, cập nhật *Đang tới → Đã tới → Đã cứu*.
- **Chỉ huy**: bản đồ SOS + vị trí các đội, gợi ý đội gần nhất, thống kê, xuất CSV, tạo đội, cấp quyền.

Kế hoạch đầy đủ: [`docs/PLAN.md`](docs/PLAN.md).

## Chạy thử trên máy

```bash
npm install
npm run dev        # mở http://localhost:5173
```

Chưa cấu hình Supabase thì app chạy **bản demo** (dữ liệu lưu trong trình duyệt). Tài khoản mẫu, mật khẩu `123456`:
chỉ huy `0900000001`, cứu hộ `0900000002`, người dân `0900000003`.

## Nối Supabase (dữ liệu thật)

1. Tạo project miễn phí tại https://supabase.com.
2. **SQL Editor → New query**: dán toàn bộ `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: **tắt "Confirm email"** (app đăng nhập bằng SĐT, quy đổi thành email nội bộ `<sđt>@sosvunglu.app`).
4. **Project Settings → API**: lấy `Project URL` và `anon public key`; chép `.env.example` thành `.env.local` và điền vào.
5. Đăng ký tài khoản của bạn trong app, rồi vào SQL Editor chạy:
   ```sql
   update profiles set role = 'commander' where phone = '09xxxxxxxx';
   ```
   Từ đó chỉ huy tự cấp quyền cứu hộ cho người khác ngay trong app (tab **Đội**).

> `anon key` được phép công khai; dữ liệu được bảo vệ bằng Row Level Security trong `schema.sql`. **Không bao giờ** đưa `service_role key` vào code.

## Đưa lên GitHub Pages

1. Repo phải **public** (GitHub Free).
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables**: thêm `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (tùy chọn `VITE_SOS_SMS_NUMBER`, `VITE_RESCUE_HOTLINE`).
4. Push/merge vào `main` → workflow `.github/workflows/deploy.yml` tự build và deploy.

## Chuyển lên VPS sau này

`npm run build` → chép thư mục `dist/` lên VPS, phục vụ bằng Nginx (bắt buộc HTTPS để dùng GPS và PWA). Supabase giữ bản cloud hoặc tự cài bằng Docker.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev |
| `npm run build` | Build ra `dist/` |
| `npm test` | Chạy test (vitest) |
| `npm run lint` | Kiểm tra code (oxlint) |
| `npm run preview` | Xem bản build |
