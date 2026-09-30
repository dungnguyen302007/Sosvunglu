# Sosvunglu

Webapp (PWA) SOS vùng lũ: người dân nhấn giữ nút SOS gửi hồ sơ + GPS; đội cứu hộ nhận việc, báo tiến độ; trung tâm chỉ huy xem bản đồ, điều phối. Kế hoạch: `docs/PLAN.md`.

## Công nghệ

- Vite + React 19 + TypeScript, `vite-plugin-pwa` (mở được khi mất mạng).
- Bản đồ: Leaflet + react-leaflet + OpenStreetMap.
- Backend: Supabase (Auth, Postgres + RLS, Realtime). Schema: `supabase/schema.sql`.
- Chưa có biến môi trường Supabase → tự chạy **bản demo** lưu localStorage (`src/lib/backend/demo.ts`).
- Hosting: GitHub Pages qua `.github/workflows/deploy.yml` (push `main`); sau này VPS.

## Cấu trúc

- `src/types.ts` — kiểu dữ liệu chung.
- `src/lib/backend/` — giao diện `Backend` (`types.ts`), bản Supabase, bản demo.
- `src/lib/` — `priority.ts` (điểm ưu tiên), `geo.ts` (khoảng cách, đội gần nhất, SĐT), `queue.ts` (hàng đợi SOS offline + SMS), `device.ts` (GPS, pin, rung), `hooks.ts`.
- `src/components/` — `SosButton` (nhấn giữ 2s), `SosTrigger`, `SosMap`, `SosCard`, `common`.
- `src/pages/` — `AuthPage` (đăng nhập / đăng ký / SOS khách), `CitizenHome`, `RescuerHome`, `CommanderHome`.

## Lệnh chạy

```bash
npm install
npm run dev      # dev server
npm run build    # tsc + vite build → dist/
npm test         # vitest
npm run lint     # oxlint
```

Kiểm tra SQL: container có Postgres 16 (`service postgresql start`); cần stub schema `auth` (bảng `users`, hàm `auth.uid()`), role `authenticated`/`anon`, publication `supabase_realtime` trước khi chạy `schema.sql`.

## Quy ước

- Trả lời, viết tài liệu, chữ trên giao diện bằng tiếng Việt.
- Quyền phải chặn ở RLS/trigger trong `schema.sql`, không chỉ ở giao diện. Sửa quyền thì sửa bản demo cho khớp.
- Thêm hàm vào `Backend` thì cài cho cả `supabase.ts` và `demo.ts`.
- Commit message ngắn gọn, dạng `loại: nội dung` (vd `feat: thêm nút SOS`, `fix: ...`, `docs: ...`).

Đầu phiên chạy `/kickoff`. Cuối phiên chạy /handoff để cập nhật HANDOFF.md.
