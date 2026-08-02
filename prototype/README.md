# prototype/ — 13 màn hình HTML tĩnh

Bản dựng giao diện **đã được người dùng duyệt**. Từ M2, mọi task UI là *dựng lại đúng màn tương ứng bằng React*, không thiết kế lại.

## Mở xem

```bash
cd prototype && python3 -m http.server 8899
# -> http://localhost:8899/index.html
```

`index.html` là bảng điều hướng cả 13 màn. Mọi màn có thanh đen trên đầu để nhảy qua lại.

## Trước khi port sang React

Đọc [`../ai-tasks/12-prototype-to-react.md`](../ai-tasks/12-prototype-to-react.md) — bảng ánh xạ màn ↔ route ↔ task, danh sách **không được port**, và chỗ prototype cố tình làm tắt.

## File

| File | Vai trò |
| --- | --- |
| `index.html` | Điều hướng prototype. Không port. |
| `guest-*.html` | App khách — mobile 375px |
| `staff-*.html` | App bếp/quầy — tablet |
| `admin-*.html` | App chủ quán — desktop |
| `_shared.css` | Token (`ai-docs/08`) + primitive + 3 shell |
| `_data.js` | Fixture rút gọn từ `packages/mock` + helper |
| `_qr.js` | ⚠️ Vẽ hình **giống** QR — **không quét được** |
| `_state-bar.js` | Nút đổi 4 trạng thái. Chỉ có ở prototype. |
| `menu-images` | Symlink → `../packages/mock/assets` (21 ảnh món thật) |

## Ba điều phải nhớ

1. **Mã QR không quét được.** `_qr.js` chưa mã hoá dữ liệu thật. Không in trang `admin-print.html` ra dán lên bàn. Mã thật ở task `AD-06`.
2. **Không có backend.** Dữ liệu không lưu thật, trừ giỏ hàng giữ tạm trong `localStorage` để nhảy giữa các file HTML.
3. **Đây là prototype dùng một lần.** Sau khi màn React tương ứng xong, file HTML chỉ còn giá trị tham chiếu — không cần giữ đồng bộ với code.
