# MMH Survey — quy tắc cho Claude

Kho CÔNG KHAI (GitHub Pages từ `main`, https://manimedicalhanoi.github.io/MMH-Survey/). Người dùng là nhân sự MANI Medical Hanoi — **trả lời bằng tiếng Việt**.
Tạo 19/11/2026: gom các trang trước đây ở `Training-Hub/khao-sat/`, `Training-Hub/quiz/`, `mmh-library/survey/` (chỗ cũ còn trang tự chuyển, giữ `?…` + `#…` ⇒ QR / link đã gửi vẫn mở được).

- `s/` khảo sát bác sĩ (hệ thống khảo sát MMH, không Google Form) · `customer-survey/` app kết quả (trước tên "MMH Survey") · `training-quiz/` bài kiểm tra sau đào tạo · `training-quiz/doi-tac/` quiz đối tác · `lib/qrcode-generator.js` (MIT) · `img/mani.png`.
- Máy chủ: `mmh-backend ▸ backends/survey/` (`MMH_SurveyNative.gs` + `MMH_SurveyNotify.gs` = khảo sát, `MMH_SurveyResults.gs` / `MMH_SurveyHub.gs` = app kết quả, `MMH_SurveyQuiz.gs` = bài kiểm tra, `MMH_PartnerQuiz.gs` = quiz đối tác).
  Các hằng `NS.PAGE / SEND / APP`, `RS.APP`, `SV.PAGE`, `PQ.PAGE` trỏ về kho này — đổi đường dẫn thư mục ⇒ sửa cả backend + để trang tự chuyển ở chỗ cũ. Gộp backend trước, đợi Deploy xanh, rồi mới gộp trang.
- Đăng nhập nhân sự: phiên Training Hub `localStorage.mmh_tk` (cùng origin github.io ⇒ dùng chung Report Hub / CRM). Không đưa email nhân sự, số liệu nội bộ, tài liệu `Confidential/` vào kho này.
- Bác sĩ dùng điện thoại là chính: trang `s/` phải gọn, quét QR là vào, nút to, tự cuộn tới câu chưa trả lời. Phong cách MANI (Aptos, navy `#2C4A5E`, viền `#BCD4E6`), không emoji.
- `customer-survey/`: đổi file ⇒ tăng `KS_VER` + `?v=` trong `index.html` và `SHELL` của `sw.js`; đổi quy tắc lưu đệm ⇒ tăng `V` trong `sw.js`. Khoá công khai Web Push trong `app.js` (khoá riêng ở `mmh-backend ▸ tools/push/vapid.json`).
- Skill tạo khảo sát / bài kiểm tra: `mmh-library ▸ skills/mmh-survey-quiz/` (`tools/survey.py` GIỐNG HỆT `scripts/survey.py`).
- Thử: `python3 -m http.server` ở gốc kho, Playwright + `page.route(/script\.google\.com/)` (máy Claude không gọi được Apps Script); `s/?demo=dental|ophthalmic` xem giao diện không cần máy chủ.
