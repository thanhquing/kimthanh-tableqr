# ai-docs — Mục lục

Đây là **nguồn chân lý nghiệp vụ** của Kim Thanh TableQR. Khi code khác doc: sửa cho khớp rồi cập nhật doc.

Thứ tự ưu tiên khi có mâu thuẫn: **code đang chạy → `ai-docs` → `ai-tasks` → `CLAUDE.md`**.

| File | Nội dung | Đọc khi |
| --- | --- | --- |
| [01-business-flow.md](01-business-flow.md) | Luồng khách 5 bước, luồng quán, vòng đời phiên bàn | Trước mọi task nghiệp vụ |
| [02-product-scope.md](02-product-scope.md) | Cái gì có / không có trong MVP | Trước khi định thêm tính năng |
| [03-domain-model.md](03-domain-model.md) | Entity, enum, quan hệ, quy tắc bất biến | Task chạm dữ liệu |
| [04-api-contract.md](04-api-contract.md) | REST contract — MSW mock và API thật đều phải khớp file này | Task FE gọi dữ liệu, mọi task BE |
| [05-ui-ux-spec.md](05-ui-ux-spec.md) | Màn hình, state, copy tiếng Việt, quy tắc responsive | Mọi task UI |
| [06-architecture-and-tech-stack.md](06-architecture-and-tech-stack.md) | Cấu trúc monorepo, stack, quy ước code | Trước task kỹ thuật đầu tiên |
| [07-acceptance-criteria.md](07-acceptance-criteria.md) | Điều kiện nghiệm thu + ngưỡng hiệu năng | Trước khi đánh dấu task DONE |
| [08-design-system.md](08-design-system.md) | **Giá trị token thật** (hex đã kiểm tương phản), thang chữ, quy cách ảnh, danh sách cấm | Mọi task UI — dán vào prompt |
| [09-current-system-architecture.md](09-current-system-architecture.md) | **Sơ đồ FE/BE/infra, runtime flow và ERD database đang chạy** | Onboard AI/dev, task kiến trúc hoặc deploy |
| [10-saas-evolution.md](10-saas-evolution.md) | Thiết kế đích đa quán, trial 2 tháng, subscription/billing và migration | Trước mọi `SA-*` |
| [11-billing-operations.md](11-billing-operations.md) | **Runbook hỗ trợ**: ops CLI, đối soát thủ công, replay webhook, backup drill, bảng giám sát | Khi có sự cố thanh toán hoặc trực vận hành |

Backlog và mã task nằm ở [`../ai-tasks/`](../ai-tasks/00-index.md).

---

## Tóm tắt sản phẩm trong 5 dòng

Khách vào quán, tự tìm bàn, quét mã QR dán trên bàn bằng camera điện thoại. Trình duyệt mở menu của quán — **không cài app, không đăng nhập, không đăng ký**. Khách chọn món, ghi chú riêng ("ít đá", "không rau"), bấm Gửi đơn. Đơn hiện ngay trên màn hình bếp/quầy kèm số bàn. Nhân viên mang món ra đúng bàn; ăn xong, nhân viên bấm "Reset bàn" để đón khách mới.

Toàn bộ từ lúc quét đến lúc gửi đơn: **mục tiêu 25–30 giây**.
