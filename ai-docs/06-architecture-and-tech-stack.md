# 06 — Kiến trúc & tech stack

## Cấu trúc monorepo

pnpm workspace. Node ≥ 20.19 (dùng 22, xem `.nvmrc`), `packageManager: pnpm@10.13.1`.

| Thư mục | Vai trò | Stack | Trạng thái |
| --- | --- | --- | --- |
| `packages/contracts` | Type, enum, DTO, hàm tính tổng tiền, `formatVnd()`. **Zero dependency.** | TypeScript thuần | M1 |
| `packages/mock` | Fixture + in-memory store + MSW handlers khớp `04-api-contract.md` | TS + MSW 2 | M1 |
| `packages/ui` | `theme.css` (Tailwind v4 `@theme`) + primitive dùng chung | TS + React | M1 |
| `tableqr-guest` | App khách, mobile-first, không đăng nhập | Vite + React SPA | M2 |
| `tableqr-staff` | Màn hình bếp/quầy, tablet-first | Vite + React SPA | M3 |
| `tableqr-admin` | Quản trị menu, bàn, mã QR | Vite + React SPA | M4 |
| `tableqr-api` | Backend | NestJS + Prisma + PostgreSQL | **M6 và integration M7 (`BE-00`…`BE-12b`) DONE; `BE-13` chờ thiết bị thật** |

## Stack

| Hạng mục | Chọn | Lý do |
| --- | --- | --- |
| Build | Vite 5 | Đồng bộ `tutor-app` / `tutor-admin` |
| UI | React 18 | — |
| Routing | react-router-dom 6 | — |
| Server state | TanStack Query 5 | Cache, retry, polling màn hình bếp |
| Style | Tailwind CSS v4 | Token qua `@theme` trong CSS ⇒ chia sẻ giữa 3 app bằng một file `theme.css`, không cần package config |
| Icon | lucide-react | — |
| QR | qrcode.react | Render client, không cần API sinh ảnh |
| Mock API | MSW 2 | Chặn ở tầng network ⇒ component không biết mình đang chạy mock |
| Test | vitest + @testing-library | — |

### Tại sao SPA mà không SSR cho app khách

Người dùng đã chọn "tất cả Vite + React SPA" để đồng bộ một cách build duy nhất. Đánh đổi: menu khách phải tải JS xong mới hiện món. Bù lại bằng ngân sách hiệu năng **bắt buộc** (xem `07-acceptance-criteria.md`):

- Code splitting theo route; `/cart`, `/orders` tải lười
- Không webfont
- Ảnh `loading="lazy"` + kích thước cố định
- Bundle initial của `tableqr-guest` **< 150 KB gzip** — kiểm tra ở M5

## Cấu trúc thư mục một app FE

```
tableqr-guest/
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── public/
└── src/
    ├── main.tsx            # bootstrap; bật MSW trước khi render (xem dưới)
    ├── app/                # App.tsx, AppShell, router, error boundary
    ├── pages/              # 1 file = 1 route
    ├── features/           # logic theo nghiệp vụ: cart/, menu/, orders/
    ├── components/         # component tái dùng trong app này
    ├── lib/                # apiClient, config, hook dùng chung
    └── styles/
```

Quy tắc: cái gì **2 app trở lên** dùng → `packages/ui`. Cái gì chỉ một app dùng → `src/components` của app đó. Không đẩy sớm lên package chung.

## Tầng dữ liệu — chuyển từ mock sang thật

Mọi lệnh gọi mạng đi qua **một** `apiClient` trong `src/lib/api/client.ts`:

```ts
// baseUrl doc tu env, khong hardcode
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
```

`src/main.tsx`:

```ts
if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { startMockWorker } = await import('@kimthanh-tableqr/mock/browser')
  await startMockWorker()          // phai await TRUOC khi render
}
```

Chuyển sang BE thật ở M7 = đổi `VITE_USE_MOCK=false` + trỏ `VITE_API_BASE_URL`. **Không sửa một dòng component nào.** Nếu đến M7 mà phải sửa component thì tầng mock đã làm sai ở M1.

Store của mock lưu trong `localStorage` để reload không mất dữ liệu, có nút "Xoá dữ liệu mock" ở góc dev.

## Realtime

Client chỉ biết một hook: `useOrderStream()` trong `tableqr-staff/src/lib/realtime.ts`.

| Giai đoạn | Cách chạy |
| --- | --- |
| M2–M5 | Polling `GET /staff/orders?since=<serverTime lần trước>` mỗi 3s vào MSW. Kèm nút dev "Giả lập đơn mới". |
| M7 | `EventSource` tới `GET /api/v1/staff/stream` (SSE), tự reconnect, fallback về polling nếu SSE lỗi 3 lần liên tiếp. |

Chọn SSE thay WebSocket: luồng chỉ một chiều server→client, đi qua nginx đơn giản, trình duyệt tự reconnect sẵn.

**Giới hạn giai đoạn mock:** 3 app chạy 3 port khác nhau ⇒ khác origin ⇒ `localStorage` của MSW không dùng chung. Demo "khách gửi đơn ở app guest, bếp thấy ngay ở app staff" **chỉ chạy được từ M7**. Trước đó mỗi app có store riêng đã seed sẵn. Nếu cần demo sớm: task tuỳ chọn `ST-08` proxy staff/admin về cùng origin với guest trong `vite.config.ts`.

## Quy ước code

- Tài liệu, comment, chuỗi hiển thị: **tiếng Việt**. Định danh code: **tiếng Anh**.
- TypeScript `strict` + `noUncheckedIndexedAccess` (xem `tsconfig.base.json`). Không `any`; không biết kiểu thì dùng `unknown` rồi thu hẹp.
- Không `export default` cho component — named export để đổi tên là grep ra ngay.
- Tiền: `number` nguyên VND. Hiển thị **chỉ** qua `formatVnd()`.
- Thời gian: truyền chuỗi ISO, chỉ đổi sang `Date` ở chỗ hiển thị.
- Không gọi `fetch` trực tiếp trong component — luôn qua `src/lib/api/*` + TanStack Query hook.

## Cổng dev

| App | Cổng |
| --- | --- |
| `tableqr-guest` | 5173 |
| `tableqr-staff` | 5174 |
| `tableqr-admin` | 5175 |
| `tableqr-api` (M6) | 3000 |

## Biến môi trường

Mỗi app FE có `.env.example`:

```
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=true
```

`tableqr-admin` thêm:
```
VITE_GUEST_BASE_URL=http://localhost:5173   # dung de dung qrUrl khi in ma QR
```

Production dùng ba hostname tách app nhưng vẫn proxy API cùng origin: `tableqr.vn` (admin), `staff.tableqr.vn` (staff), `guest.tableqr.vn` (guest). Vì vậy cả ba build giữ `VITE_API_BASE_URL=/api/v1`; riêng build admin đặt `VITE_GUEST_BASE_URL=https://guest.tableqr.vn` để URL QR không bao giờ trỏ về hostname admin.
