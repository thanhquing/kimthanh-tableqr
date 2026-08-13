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

### Giả lập ba domain production trên máy local

Không cần mua domain hoặc sửa DNS. `*.localhost` luôn trỏ về máy hiện tại;
script dùng Caddy để tách đúng ba origin và reverse proxy API/ảnh theo từng
origin. Cần Docker Desktop đang chạy và Caddy (`brew install caddy`) một lần.

```bash
nvm use 22
pnpm dev:local-domains
```

Mở các URL sau (đều là HTTP local, nên **không** kiểm chứng được chứng chỉ
HTTPS):

| App | URL |
| --- | --- |
| Admin | `http://tableqr.localhost:8080` |
| Staff | `http://staff.tableqr.localhost:8080` |
| Guest/QR | `http://guest.tableqr.localhost:8080/t/qr-ban-01-a7f3k9m2xp` |

Script tự khởi động PostgreSQL/API, seed dữ liệu demo idempotent, rồi chạy ba
Vite app và proxy. Nhấn `Ctrl-C` để dừng proxy/frontend; database/API Docker
vẫn giữ để lần sau chạy nhanh. QR được API tạo trong chế độ này luôn trỏ về
hostname guest local, thay vì `localhost:5173`.

Kiểm tra nhanh việc tách dữ liệu hai quán và quyền guest sau khi stack đang chạy:

```bash
bash tableqr-api/scripts/verify-tenant-isolation.sh
```

Ba app mặc định gọi API thật qua Vite proxy. Để chạy giao diện với MSW khi
phát triển, đặt `VITE_USE_MOCK=true` trong file `.env.development` của app đó.

## Trạng thái

M0–M6 và tích hợp M7 (`BE-00`…`BE-12b`) đã xong. `BE-13` đang chờ kiểm thử vật lý: QR giấy, điện thoại 4G và tablet bếp nhận đơn qua SSE dưới 2 giây.

Sau M7, roadmap SaaS đã sẵn sàng: production HTTPS/backup → multi-tenant → chủ quán tự đăng ký và trial 2 tháng → 100.000 VND/tháng không giới hạn đơn → gói tính năng sau này. Xem [kiến trúc hiện tại](ai-docs/09-current-system-architecture.md), [thiết kế SaaS](ai-docs/10-saas-evolution.md) và [task `SA-*`](ai-tasks/13-saas-expansion.md).

## Tài liệu

Bắt đầu ở [CLAUDE.md](CLAUDE.md), rồi [ai-docs/](ai-docs/00-index.md) và [ai-tasks/](ai-tasks/00-index.md).

## Stack

Vite · React 18 · TypeScript · Tailwind v4 · TanStack Query · MSW · vitest — và NestJS + Prisma + PostgreSQL từ M6.
