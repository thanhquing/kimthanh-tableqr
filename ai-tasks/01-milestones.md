# 01 — Mốc triển khai

**Ràng buộc số một do người dùng đặt ra: dựng xong toàn bộ UI của cả 3 app rồi mới bắt đầu backend.** M6 bị khoá cho tới khi M5 đạt.

| Mốc | Nội dung | Task | Điều kiện đạt |
| --- | --- | --- | --- |
| **M0** | Khung workspace + toàn bộ tài liệu | `WS-00` | `pnpm install` sạch; `ai-docs` và `ai-tasks` đầy đủ; `CLAUDE.md` trỏ đúng |
| **M1** | 3 package dùng chung | `WS-01`…`WS-04` | 3 package build được; fixture ≥ 4 danh mục / ≥ 20 món; **đủ 28 handler mock của M1** (`GET /staff/stream` để M7) |
| **M2** | `tableqr-guest` UI đầy đủ | `GU-00`…`GU-10` | Đi trọn A1–A4 của `ai-docs/07` trên mock |
| **M3** | `tableqr-staff` UI đầy đủ | `ST-00`…`ST-08` | Đi trọn A5, A6 |
| **M4** | `tableqr-admin` UI đầy đủ | `AD-00`…`AD-08` | Đi trọn A7, A8 |
| **M5** | Polish + test + ngân sách hiệu năng | `WS-05`…`WS-07` | Mục B, C, D của `ai-docs/07` đạt hết; `pnpm lint && test && build` sạch |
| **M6** | Backend `tableqr-api` | `BE-00`…`BE-10` | Endpoint khớp `ai-docs/04`; script verify cURL chạy hết luồng |
| **M7a** | **Lát cắt dọc**: nối *chỉ* luồng gọi món của khách vào API thật | `BE-12a` | Quét QR → xem menu → gửi đơn chạy trên API thật. Hai app kia vẫn dùng mock. |
| **M7b** | Nối nốt staff + admin, bật SSE | `BE-11`, `BE-12b`, `BE-13` | Điện thoại quét QR in thật + tablet mở màn bếp → đơn hiện < 2s, không refresh |

## Cổng chuyển mốc

Không sang mốc sau khi mốc trước chưa đạt **hết** điều kiện. Cụ thể:

- **M1 → M2:** đối chiếu xong bảng 29 dòng ở cuối `ai-docs/04-api-contract.md`: dòng 1–28 có handler, dòng 29 (`GET /staff/stream`) xác nhận để M7 đúng contract. Thiếu handler M1 nào thì làm nốt, đừng để "làm sau khi cần" — mọi màn hình sau đó sẽ xây trên nền sai.
- **M4 → M5:** đủ ba app chạy được end-to-end trên mock.
- **M5 → M6:** đây là cổng nghiêm nhất. Ngân sách bundle < 150 KB gzip và `pnpm build` sạch là **bắt buộc**. Sang M6 rồi thì sửa UI sẽ tốn hơn nhiều vì lúc đó còn phải nghĩ tới API thật.
- **M7a → M7b:** không nối cả ba app cùng lúc. Đây là chỗ rủi ro tích tụ của cách làm UI-trước-BE-sau — nếu contract lệch, nối một lượt cả ba thì ba app cùng hỏng và không biết lỗi ở đâu. Nối luồng khách trước (ngắn nhất, quan trọng nhất), sửa hết lệch, rồi mới nối phần còn lại.

## Rủi ro của trình tự UI trước — và chỗ đã chặn

Trình tự này hợp với sản phẩm này (giá trị nằm ở trải nghiệm 30 giây, không nằm ở thuật toán backend), nhưng nó dồn toàn bộ rủi ro tích hợp về cuối. Bốn chỗ đau và nơi đã xử lý:

| Rủi ro | Chặn ở đâu |
| --- | --- |
| **Mock nói dối** — dễ dãi hơn server, UI đi qua đường mà API thật sẽ chặn | `WS-03`: mock nghiêm ngặt + chaos toggle (`ai-tasks/02-backlog.md`) |
| **Contract có trường rẻ ở mock, đắt ở SQL** (`GET /staff/tables` trả `totalVnd` mọi bàn) | `ai-docs/04 §Trường rẻ ở mock nhưng đắt ở SQL` |
| **Không có đồng thời** — hai điện thoại quét cùng lúc, race tạo 2 phiên; race cấp `sequenceNo` | `BE-04` bắt buộc transaction; `BE-10` script verify chạy song song |
| **Tích hợp big-bang ở M7** | Tách **M7a / M7b** ở trên |

## Thứ tự trong M2–M4

Làm **tuần tự guest → staff → admin**, không song song. Lý do: app khách định hình `packages/ui` và các quyết định UX; hai app sau kế thừa. Làm ngược lại sẽ phải viết lại primitive.

## Sau M7 (chưa lên lịch)

Đã nằm ngoài MVP, ghi ở đây để không quên bối cảnh: thanh toán online VietQR/SePay · báo cáo doanh thu và món bán chạy · nhiều chi nhánh. Xem `ai-docs/02-product-scope.md` để biết chỗ đã chừa sẵn.
