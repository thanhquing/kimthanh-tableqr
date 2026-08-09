# Kim Thanh TableQR

Hệ thống gọi món bằng mã QR tại bàn cho quán ăn nhỏ.

Khách vào quán, tự tìm bàn, quét mã QR dán sẵn trên bàn. Trình duyệt mở menu — **không cài app, không đăng nhập**. Chọn món, ghi chú "ít đá / không rau / thêm ớt", bấm Gửi đơn. Đơn hiện ngay trên màn hình bếp kèm số bàn. Ăn xong, nhân viên bấm "Reset bàn".

Mục tiêu: từ lúc quét đến lúc gửi đơn **25–30 giây**.

## Vì sao

| Cho khách | Cho chủ quán |
| --- | --- |
| Không chờ nhân viên tới lấy order | Không cần nhiều người đứng chờ ghi order |
| Menu có ảnh, giá rõ ràng — không sợ gọi nhầm | Không sót món, không sai món (đơn vào thẳng hệ thống) |
| Quán đông vẫn order được ngay | Thứ tự đơn hệ thống tự sắp, không phải nhớ |
| Chủ động, không bị hối | Một cái điện thoại ở quầy là đủ |

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `tableqr-guest` | App khách — quét QR, xem menu, gọi món *(M2)* |
| `tableqr-staff` | Màn hình bếp/quầy — nhận đơn, sơ đồ bàn, reset bàn *(M3)* |
| `tableqr-admin` | Chủ quán — quản lý menu, bàn, in mã QR *(M4)* |
| `tableqr-api` | Backend NestJS + PostgreSQL *(M6)* |
| `packages/contracts` | Type, DTO, logic tính tiền dùng chung |
| `packages/mock` | Fixture + MSW — chạy toàn bộ UI trước khi có backend |
| `packages/ui` | Design token + component dùng chung |
| `ai-docs` | Tài liệu nghiệp vụ, kiến trúc, nghiệm thu |
| `ai-tasks` | Mốc, backlog, task |

## Chạy

```bash
nvm use 22          # bat buoc, pnpm can Node >= 18.12
pnpm install

pnpm dev:guest      # http://localhost:5173
pnpm dev:staff      # http://localhost:5174
pnpm dev:admin      # http://localhost:5175
```

Để chạy lát cắt khách trên API thật, khởi động backend trước rồi mở app khách:

```bash
docker compose -f tableqr-api/docker-compose.yml up --build
pnpm dev:guest      # http://localhost:5173/t/qr-ban-01-a7f3k9m2xp
```

Ba app mặc định gọi API thật qua Vite proxy. Để chạy giao diện với MSW khi
phát triển, đặt `VITE_USE_MOCK=true` trong file `.env.development` của app đó.

## Trạng thái

**M0 xong** — khung workspace và toàn bộ tài liệu. Đang làm **M1**: các package dùng chung.

Lộ trình: M0 khung → M1 packages → M2 app khách → M3 app bếp → M4 app admin → M5 polish → M6 backend → M7 nối FE↔BE.

Backend cố ý làm **sau khi UI xong hết**.

## Tài liệu

Bắt đầu ở [CLAUDE.md](CLAUDE.md), rồi [ai-docs/](ai-docs/00-index.md) và [ai-tasks/](ai-tasks/00-index.md).

## Stack

Vite · React 18 · TypeScript · Tailwind v4 · TanStack Query · MSW · vitest — và NestJS + Prisma + PostgreSQL từ M6.
