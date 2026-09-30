# Hướng dẫn chạy dự án trên máy tính (dùng Claude Code local)

Làm một lần là xong. Sau đó mỗi lần làm việc chỉ cần mục **5**.

---

## 1. Cài phần mềm (một lần)

| Phần mềm | Tải ở đâu | Kiểm tra đã cài |
|---|---|---|
| **Git** | https://git-scm.com/downloads (Windows: bấm Next đến hết) | `git --version` |
| **Node.js 22 LTS** | https://nodejs.org → nút **LTS** | `node -v` (ra `v22...`) |
| **Claude Code** | Mở terminal, chạy `npm install -g @anthropic-ai/claude-code` | `claude --version` |

- **Terminal** trên Windows: bấm Start, gõ **PowerShell** (hoặc **Terminal**) rồi mở. Trên macOS: mở **Terminal**.
- Cài xong Git và Node thì **đóng terminal, mở lại** rồi mới chạy lệnh kiểm tra.
- Lần đầu chạy `claude`, nó mở trình duyệt để đăng nhập tài khoản Claude của bạn.

## 2. Tải source về máy (một lần)

```bash
cd Documents
git clone https://github.com/dungnguyen302007/Sosvunglu.git
cd Sosvunglu
npm install
```

- Thư mục dự án sẽ nằm ở `Documents/Sosvunglu`.
- `npm install` tải thư viện, mất 1–2 phút.
- Git có thể hỏi đăng nhập GitHub khi bạn **push** lần đầu: chọn đăng nhập bằng trình duyệt.

## 3. Tạo file cấu hình `.env.local` (một lần)

Trong thư mục `Sosvunglu`, tạo file tên **`.env.local`** (chép từ `.env.example`), điền:

```
VITE_SUPABASE_URL=https://sprwbnvnrksqtksgnvxd.supabase.co
VITE_SUPABASE_ANON_KEY=<dán publishable key Supabase: sb_publishable_...>
```

- Lấy key ở Supabase → **Project Settings → API Keys** → **Publishable key**. Không dùng `secret` hay `service_role`.
- **Để trống** `VITE_MAP_TILE_URL` và `VITE_GOOGLE_MAPS_KEY` khi chạy trên máy: hai khóa này đã khóa chỉ cho web `dungnguyen302007.github.io`, chạy ở máy sẽ báo lỗi. App tự dùng bản đồ miễn phí.
- Muốn thử **bản demo** (dữ liệu giả, không đụng Supabase thật) thì để trống cả hai dòng Supabase.
- File `.env.local` **không bao giờ** được đưa lên GitHub (đã chặn sẵn).

## 4. Chạy app trên máy

```bash
npm run dev
```

Mở trình duyệt vào **http://localhost:5173**. Sửa code thì trang tự tải lại. Tắt bằng **Ctrl + C**.

Các lệnh khác:

| Lệnh | Việc |
|---|---|
| `npm test` | Chạy test |
| `npm run lint` | Kiểm tra lỗi code |
| `npm run build` | Build bản chạy thật ra thư mục `dist/` |

**Lưu ý GPS:** trên máy tính, `localhost` vẫn cho lấy vị trí (nhưng máy tính định vị kém, lệch cả km). **Điện thoại** vào bằng địa chỉ mạng LAN (`http://192.168...`) thì **không lấy được GPS** vì trình duyệt bắt buộc HTTPS. Muốn thử GPS trên điện thoại thì dùng web thật trên GitHub Pages.

## 5. Làm việc với Claude Code (mỗi lần)

```bash
cd Documents/Sosvunglu
git pull
claude
```

Trong Claude Code:

1. Gõ **`/kickoff`**: Claude đọc `HANDOFF.md`, tóm tắt đang ở đâu, hỏi làm tiếp gì.
2. Nói việc cần làm bằng tiếng Việt như bình thường.
3. Cuối buổi gõ **`/handoff`**: Claude cập nhật `HANDOFF.md`, commit và push.

Claude tự đọc `CLAUDE.md` (mô tả dự án, lệnh, quy ước) và `HANDOFF.md` (tiến độ), nên không cần giải thích lại từ đầu.

## 6. Đưa bản mới lên web

Web vẫn tự chạy trên **GitHub Pages**, không cần máy bạn bật. Mỗi lần có code mới trên nhánh **`main`**:

```bash
git push origin main
```

GitHub tự build và cập nhật web sau 1–2 phút (xem ở tab **Actions** của repo). Trong `CLAUDE.md` đã ghi bạn cho phép Claude **luôn cập nhật `main`**, nên thường Claude tự push giúp.

Nếu muốn Claude hỏi trước mỗi lần đưa lên web, nói với Claude: "đừng tự push main, hỏi tôi trước".

## 7. Cơ sở dữ liệu Supabase

- Khi Claude sửa `supabase/schema.sql` hoặc thêm file trong `supabase/migrations/`, bạn phải **tự chạy file SQL đó** trong Supabase → **SQL Editor** → **Run**. Claude sẽ nhắc tên file.
- Cấp quyền chỉ huy cho một số điện thoại:
  ```sql
  update profiles set role = 'commander' where phone = '09xxxxxxxx';
  ```

## 8. Gặp lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `git`, `node` hoặc `claude` báo "not recognized" | Đóng terminal, mở lại. Vẫn lỗi thì cài lại phần mềm đó |
| `npm install` lỗi | Xóa thư mục `node_modules` rồi chạy lại `npm install` |
| Trang trắng hoặc đen | Nhấn F12, tab **Console**, chụp dòng đỏ gửi Claude |
| Màn đăng nhập hiện khung "Bản chạy thử" | Chưa có `.env.local` hoặc điền sai. Kiểm tra mục 3, rồi tắt `npm run dev` và chạy lại |
| `git push` bị từ chối (rejected) | Chạy `git pull` trước rồi push lại |
| Web trên mạng chưa đổi | Chờ tab Actions có dấu ✓ xanh, rồi nhấn **Ctrl + Shift + R** |
