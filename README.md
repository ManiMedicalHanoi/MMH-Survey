# MMH Survey

Khảo sát khách hàng và bài kiểm tra đào tạo của Mani Medical Hanoi — trang tĩnh trên GitHub Pages:
https://manimedicalhanoi.github.io/MMH-Survey/

| Thư mục | Tên | Dùng cho |
|---|---|---|
| `s/` | Khảo sát khách hàng | Bác sĩ làm khảo sát: `s/?s=<mã>` (quét QR). `gui.html?s=<mã>` = QR + gửi email cho Marketing, `tao.html` = tạo / sửa từ bản soạn của Claude |
| `customer-survey/` | Customer Survey | App xem kết quả, biểu đồ từng câu, thông báo câu trả lời mới (đăng nhập email công ty, cài được như app) |
| `training-quiz/` | Training Quiz | Bài kiểm tra sau đào tạo nhân sự: `training-quiz/?q=<mã>`; `tao.html` = tạo bài từ bản soạn của Claude |
| `training-quiz/doi-tac/` | Training Quiz · Đối tác | Bài kiểm tra kiểu Kahoot cho đại lý / NPP: `?b=<mã bài>`, `&v=board` màn TV, `?v=top` xếp hạng |

Máy chủ: web app Apps Script `survey` (kho riêng tư `mmh-backend`). Kho này không chứa dữ liệu khảo sát, email hay tài liệu nội bộ.
