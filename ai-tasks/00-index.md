# ai-tasks — Mục lục

**Nguồn chân lý triển khai.** Nghiệp vụ nằm ở [`../ai-docs/`](../ai-docs/00-index.md); ở đây là *làm gì, theo thứ tự nào, xong khi nào*.

## Bắt đầu một phiên làm việc

1. Đọc [09-active-work.md](09-active-work.md) → nhận đúng `Current task`. **Không tự chọn task TODO khác.**
2. Đọc [03-ai-working-rules.md](03-ai-working-rules.md) → quy tắc và Definition of Done.
3. Đọc [04-open-questions.md](04-open-questions.md) → xem giả định nào chưa chốt.
4. Đọc các file `ai-docs` mà task list chỉ định cho task đó.

> ### Nếu là task UI (`GU-*`, `ST-*`, `AD-*`)
>
> Giao diện **đã được dựng và duyệt** ở [`../prototype/`](../prototype/README.md) — 13 màn HTML tĩnh.
> **Không thiết kế lại.** Mở màn tương ứng, bấm thử, rồi dựng lại bằng React.
>
> Bắt buộc đọc [12-prototype-to-react.md](12-prototype-to-react.md) trước: ánh xạ màn ↔ route ↔ task,
> cái gì copy nguyên, cái gì tuyệt đối không port, chỗ nào prototype làm tắt mà React phải làm đủ.

| File | Nội dung |
| --- | --- |
| [01-milestones.md](01-milestones.md) | M0–M7 và điều kiện chuyển mốc |
| [02-backlog.md](02-backlog.md) | Bảng tổng tất cả mã task + trạng thái |
| [03-ai-working-rules.md](03-ai-working-rules.md) | Quy tắc làm việc, Definition of Done |
| [04-open-questions.md](04-open-questions.md) | Câu hỏi chưa chốt + giả định đang dùng tạm |
| [05-guest-task-list.md](05-guest-task-list.md) | `GU-xx` — app khách |
| [06-staff-task-list.md](06-staff-task-list.md) | `ST-xx` — app bếp/quầy |
| [07-admin-task-list.md](07-admin-task-list.md) | `AD-xx` — app chủ quán |
| [08-api-task-list.md](08-api-task-list.md) | `BE-xx` — backend · **BLOCKED tới hết M5** |
| [09-active-work.md](09-active-work.md) | Việc đang làm ngay bây giờ |
| [10-verification.md](10-verification.md) | Cách kiểm tra từng mốc |
| [11-ui-build-prompts.md](11-ui-build-prompts.md) | **Cách viết prompt dựng UI** + rubric tự chấm 20 điểm + checklist đọc HTML 30 giây |
| [12-prototype-to-react.md](12-prototype-to-react.md) | **Bắt buộc đọc trước mọi task UI từ M2.** Ánh xạ 13 màn prototype ↔ route ↔ task; cái gì copy, cái gì bỏ |
| [13-saas-expansion.md](13-saas-expansion.md) | `SA-xx` — production foundation, đa quán, đăng ký và thuê bao |

## Quy ước mã task

| Tiền tố | Phạm vi |
| --- | --- |
| `WS-xx` | Workspace, package dùng chung (`packages/*`) |
| `GU-xx` | `tableqr-guest` |
| `ST-xx` | `tableqr-staff` |
| `AD-xx` | `tableqr-admin` |
| `BE-xx` | `tableqr-api` |
| `SA-xx` | SaaS: hạ tầng production, multi-tenant, onboarding và billing |

Trạng thái: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`
