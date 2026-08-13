# Stack production tham chiếu

Đây là cấu hình triển khai tối thiểu trên một VM Linux có Docker Compose. Caddy
phục vụ ba SPA đúng hostname production, tự xin/gia hạn HTTPS và reverse proxy
`/api/v1`, `/uploads`, `/menu-images` tới API. Vì vậy browser luôn gọi API cùng
origin, không cần CORS và QR in ra giữ cố định `https://guest.tableqr.vn/t/...`.

## Điều kiện trước khi chạy

1. Có một VM công khai, mở inbound TCP 80 và 443; chỉ Docker/Caddy được mở
   port này. PostgreSQL và API không expose port ra Internet.
2. DNS `A` (và chỉ thêm `AAAA` khi VM có IPv6 hoạt động) cho `tableqr.vn`,
   `staff.tableqr.vn`, `guest.tableqr.vn` trỏ về VM. Chờ DNS resolve trước khi
   khởi động để Caddy lấy chứng chỉ Let's Encrypt.
3. Sao chép `.env.production.example` thành `.env.production`, thay toàn bộ
   giá trị mẫu bằng secrets thật. `POSTGRES_PASSWORD` nên chỉ dùng ký tự URL-safe
   (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `~`) vì compose tạo `DATABASE_URL` từ
   giá trị này. File này không được commit hoặc gửi qua chat.

## Triển khai

```bash
docker compose --env-file .env.production -f infra/production/docker-compose.yml up -d --build
docker compose --env-file .env.production -f infra/production/docker-compose.yml ps
```

Sau khi tất cả service healthy, kiểm tra từ mạng ngoài VM:

```bash
bash infra/production/verify-deployment.sh
```

Script bắt buộc HTTPS/TLS 1.2+, health/ready qua **cả ba origin** và header
HSTS. Có thể thay hostname qua biến `ADMIN_HOST`, `STAFF_HOST`, `GUEST_HOST`;
hãy chạy lại sau mỗi lần đổi DNS, Caddy hoặc routing.

Không chạy `down -v`: cờ `-v` sẽ xoá database, ảnh upload và chứng chỉ Caddy.
`upload_data` là Docker volume bền qua redeploy container/image; đây là bước
chuyển tiếp an toàn hơn ổ container ephemeral. `SA-02` phải chuyển nó sang
object storage managed trước khi chạy nhiều replica hoặc đưa quán thật vào vận
hành, đồng thời thực hiện backup/restore drill cho PostgreSQL.

## Rollback

Giữ lại image digest hoặc Git revision đã triển khai. Khi rollback application,
chạy lại revision cũ **chỉ khi** migration mới tương thích ngược; Prisma
migration đã apply không tự rollback. Nếu migration không tương thích, dùng
forward fix từ revision mới và restore bản backup đã thử nghiệm thay vì xoá
volume production.
