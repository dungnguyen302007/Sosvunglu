# KẾ HOẠCH — Webapp SOS vùng lũ

_Bản nháp 2026-09-30, chờ người dùng duyệt._

## 1. Mục tiêu

- **Người dân**: đã đăng ký thì mở app chỉ thấy **một nút SOS tròn màu đỏ, nhấp nháy**. Nhấn nút này là gửi thông tin cá nhân và vị trí GPS về hệ thống cứu hộ.
- **Đội cứu hộ**: nhận ngay yêu cầu ở gần mình, có đủ thông tin để cứu (có mấy người, có người già hay trẻ nhỏ không, nước ngập tới đâu, pin còn bao nhiêu), rồi báo cáo tiến độ.
- **Trung tâm chỉ huy**: xem trên bản đồ tất cả SOS và vị trí của từng đội, có thống kê, và có thể điều phối lại khi cần.

## 2. Ba loại người dùng (một app, giao diện đổi theo vai trò)

| Vai trò | Thấy gì | Làm gì |
|---|---|---|
| **Người dân** | Nút SOS, trạng thái yêu cầu của mình | Đăng ký, nhấn SOS, cập nhật nhanh ("nước đang lên", "có người bị thương"), hủy khi đã an toàn |
| **Cứu hộ** (thành viên hoặc trưởng nhóm) | SOS được giao và SOS gần mình, bản đồ | Bật/tắt ca trực (chia sẻ vị trí), nhận việc, chỉ đường, báo "đã cứu N người" hoặc "không tiếp cận được", gửi báo cáo hiện trường kèm ảnh |
| **Chỉ huy** | Toàn bộ bản đồ: SOS, vị trí và lộ trình các đội, thống kê | Tạo đội, cấp quyền cứu hộ, giao hoặc chuyển việc, xuất báo cáo |

Tài khoản cứu hộ và chỉ huy **không tự đăng ký được**. Người dân đăng ký như bình thường, sau đó chỉ huy nâng quyền. Làm vậy để chặn người lạ giả làm cứu hộ và xem được dữ liệu của dân.

## 3. Luồng người dân: ít thao tác nhất

**Trước mùa lũ, làm một lần**: đăng ký tài khoản, rồi "Thêm vào màn hình chính" để app chạy như app thật.

- **Đăng nhập** bằng số điện thoại và mật khẩu. Đăng nhập xong **lưu luôn trên máy**: phiên đăng nhập tự gia hạn, không bao giờ bắt đăng nhập lại (trừ khi người dùng tự đăng xuất hoặc xóa dữ liệu trình duyệt).
- **Thông tin khi đăng ký**, gọn trong một trang:
  - Bắt buộc: họ tên, số điện thoại, mật khẩu, địa chỉ (tỉnh → xã/phường → thôn/tổ, số nhà; theo địa giới hai cấp mới), số người trong nhà.
  - Nên có (bấm chọn, không phải gõ): có người già, trẻ nhỏ, người khuyết tật, người bệnh nền, phụ nữ mang thai; SĐT người thân; ghi chú (vd "nhà 1 tầng, không có gác").
  - **Không thu** CCCD hay những thông tin không cần cho việc cứu người (xem mục 6).

**Khi gặp nạn**:
1. Mở app → thấy ngay **nút SOS tròn đỏ, nhấp nháy** (giống ảnh mẫu, thay dấu X bằng chữ **SOS**, có vòng sóng lan ra).
2. **Nhấn giữ 2 giây**: có vòng chạy quanh nút và điện thoại rung. Nhấn giữ thay vì chạm một lần để tránh lỡ tay gửi nhầm khi điện thoại nằm trong túi, mà vẫn chỉ là một thao tác.
3. App tự lấy GPS và gửi kèm hồ sơ đã đăng ký. Màn hình báo: **"Đã gửi — Đội Cứu hộ 3 đang tới, cách 1,2 km"**.
4. *(Không bắt buộc)* Vài nút bấm nhanh bổ sung: nước ngập tới *mắt cá / đầu gối / ngực / mái nhà*, *có người bị thương*, *số người hiện có*. Mỗi lần bấm là cập nhật cho đội cứu hộ.

**Người chưa đăng ký** vẫn có nút **"SOS khẩn không cần tài khoản"**: chỉ nhập tên và SĐT. Lúc lũ về, bắt ai đó đăng ký đầy đủ mới cho kêu cứu thì không ổn.

## 4. Mất sóng, mạng yếu, hết pin: làm gì?

Đây là phần khó nhất. Cần nói thẳng giới hạn trước: **webapp chạy trên trình duyệt không tự gửi SMS được, không tạo được mạng Bluetooth giữa các máy, và không liên lạc được qua vệ tinh.** Vì vậy mình đề xuất nhiều lớp dự phòng, lớp sau đỡ cho lớp trước:

| Lớp | Giải pháp | Làm ở giai đoạn |
|---|---|---|
| 1 | **App mở được khi không có mạng**: giao diện được lưu sẵn trong máy (PWA/Service Worker) | GĐ1 |
| 2 | **Gói tin SOS rất nhỏ** (~300 byte, không ảnh), gửi được cả trên 2G hoặc khi chỉ còn 1 vạch sóng | GĐ1 |
| 3 | **Hàng đợi, tự gửi lại**: mất mạng thì SOS lưu trong máy, có sóng lại là tự gửi. Màn hình báo rõ "Chưa gửi được — đang chờ sóng" | GĐ1 |
| 4 | **Dự phòng bằng SMS**: sau 20 giây vẫn chưa gửi được, app mở sẵn tin nhắn `SOS <mã> <tọa độ> <số người>` tới tổng đài của trung tâm, người dân chỉ cần bấm Gửi. SMS đi được ở nơi sóng yếu hơn so với 3G/4G. Trung tâm dùng một điện thoại Android chạy app "SMS gateway" để chuyển tin nhắn vào hệ thống | GĐ1: mở tin nhắn soạn sẵn; GĐ3: tự nhập vào hệ thống |
| 5 | **Nút gọi nhanh** 112 và số tổng đài cứu hộ địa phương | GĐ1 |
| 6 | **Nhớ vị trí cuối cùng**: mỗi lần mở app đều lưu vị trí mới nhất. Nếu máy tắt, đội cứu hộ vẫn biết điểm cuối cùng và thời điểm ghi nhận | GĐ1 |
| 7 | **Mạng LoRa Meshtastic** cho đội cứu hộ và thôn, xóm hay bị cô lập: thiết bị rẻ (~500k–1 triệu đồng), nhắn tin và gửi GPS xa vài km không cần sóng điện thoại. App kết nối qua Bluetooth (Chrome Android) | GĐ3 |
| 8 | **SOS vệ tinh** có sẵn trên một số điện thoại mới. Hiện Apple chưa hỗ trợ ở Việt Nam, không phụ thuộc vào app của mình được. Chỉ ghi chú, theo dõi thêm | — |

**Để tiết kiệm pin**:
- Người dân: **không** theo dõi GPS liên tục. Chỉ lấy vị trí một lần khi nhấn SOS và mỗi khi mở app. Giao diện nền đen (màn OLED đỡ tốn pin), không có hiệu ứng nặng ngoài nút SOS.
- SOS gửi kèm **% pin** (có trên Android Chrome). Máy sắp hết pin thì được **ưu tiên** và gắn cờ "sắp mất liên lạc".
- Cứu hộ: khi đang trong ca, gửi vị trí **1–2 phút một lần**, không liên tục. Gửi dày hơn khi đang di chuyển tới SOS.
- Trong app có mục **"Chuẩn bị trước lũ"**: sạc đầy máy và pin dự phòng, bọc điện thoại trong túi nilon, bật chế độ tiết kiệm pin, tắt các app không cần. Sau khi gửi SOS thì để máy yên, chỉ mở lại mỗi 15–30 phút.

## 5. Góc nhìn chuyên gia khí tượng: mỗi loại thiên tai cần cứu khác nhau

| Hình thái (VN) | Đặc điểm | Hệ quả cho việc cứu hộ |
|---|---|---|
| **Lũ quét, sạt lở** (miền núi phía Bắc, Tây Nguyên; vd Làng Nủ khi bão Yagi 2024) | Xảy ra trong vài phút đến vài giờ, sau mưa lớn cục bộ | Cần cảnh báo sơ tán **trước**. Có sạt lở thì cần máy xúc và người đào bới, không phải xuồng |
| **Lũ sông lớn** (miền Trung tháng 10–11: không khí lạnh kết hợp nhiễu động gió Đông; đồng bằng Bắc Bộ, ĐBSCL) | Nước lên trong vài giờ đến vài ngày, ngập sâu, kéo dài | Người dân lên gác hoặc mái nhà. Cần xuồng, ca nô, **nước uống, lương thực**. Ưu tiên theo mức nước và tốc độ nước lên |
| **Bão, áp thấp nhiệt đới** và hoàn lưu gây mưa | Gió mạnh cấp 10 trở lên, sau đó mưa lớn | **Không cứu được lúc gió mạnh nhất**, phải chờ gió yếu. App cần hiện "đang tạm dừng cứu hộ vì gió mạnh, dự kiến tiếp tục lúc …" để người dân không hoảng |
| **Nước dâng do bão, triều cường** (ven biển) | Nước lên nhanh ven biển và cửa sông | Sơ tán trước, ưu tiên nhà gần biển |
| **Xả lũ thủy điện** | Nước hạ du lên nhanh, có báo trước | Đưa lịch xả lũ lên thành lớp cảnh báo |

**Ưu tiên cứu** (tính tự động, chỉ huy có thể sửa): nước ngập tới *mái nhà* hoặc *ngực* > có người bị thương, người già, trẻ nhỏ, bệnh nền > pin yếu > số người đông > đã chờ lâu.

**Đội cứu hộ cần thấy trong mỗi SOS**: vị trí và sai số GPS (±m), thời điểm gửi, số người, nhóm dễ tổn thương, mức nước và nước đang lên hay xuống, có người bị thương không, % pin, SĐT và SĐT người thân, địa chỉ đăng ký (để đối chiếu khi GPS lệch), ghi chú nhà cửa.

**Lớp thời tiết trên bản đồ** (GĐ2): radar mưa (RainViewer) và dự báo mưa (Open-Meteo), đều miễn phí. Bản tin cảnh báo thì dẫn link tới Trung tâm Dự báo KTTV quốc gia (nchmf.gov.vn).

## 6. Bảo mật dữ liệu

- **Phân quyền ngay trong cơ sở dữ liệu** (Supabase Row Level Security), không chỉ chặn trên giao diện:
  - Người dân chỉ đọc và sửa hồ sơ và SOS của chính mình.
  - Cứu hộ chỉ đọc SOS được giao hoặc ở gần mình. Không xem được toàn bộ danh sách dân.
  - Chỉ huy đọc được tất cả. Vai trò chỉ do chỉ huy hoặc admin cấp.
- Toàn bộ kết nối qua HTTPS. Mật khẩu được băm (Supabase Auth lo phần này).
- **Thu ít dữ liệu nhất có thể**: không thu CCCD. Vị trí liên tục của cứu hộ tự xóa sau khi đợt lũ kết thúc (ví dụ 30 ngày).
- **Chống spam và báo giả**: mỗi người chỉ có một SOS đang mở. Giới hạn số lần gửi. Cứu hộ có thể gọi lại để xác minh. Tài khoản phá hoại bị khóa.
- Ghi nhật ký ai xem hoặc sửa SOS nào.
- *Lưu ý*: GitHub Pages bản miễn phí yêu cầu **repo public**. Code bị lộ cũng không sao, vì dữ liệu được bảo vệ bằng phân quyền trong cơ sở dữ liệu. Tuyệt đối không đưa khóa bí mật (service key) vào code.

## 7. Điều phối nhiều đội và tự động giao việc

- **Đội**: tên, trưởng nhóm, thành viên, phương tiện (xuồng, ca nô, xe tải, bộ), sức chở, trạng thái (*sẵn sàng / đang làm nhiệm vụ / nghỉ / hết nhiên liệu*).
- **Bản đồ chỉ huy**: điểm SOS tô màu theo mức ưu tiên; vị trí và lộ trình từng đội; bảng thống kê gồm tổng SOS, đang chờ, đang cứu, đã an toàn, số người đã cứu, số đội đang hoạt động; danh sách báo cáo hiện trường theo thời gian; xuất Excel.
- **Tự động giao việc cho đội gần nhất** (điều bạn muốn ở ví dụ cuối):
  1. Có SOS mới → hệ thống tìm đội **đang trong ca, đang rảnh hoặc còn chỗ trên xuồng, trong bán kính ~3 km** (dùng PostGIS để tính khoảng cách).
  2. Giao ngay cho đội gần nhất, **báo động trên máy đội đó** (thông báo đẩy, có âm thanh).
  3. Đội phải bấm "Nhận" trong vòng 2 phút. Không bấm thì chuyển sang đội kế tiếp, hết đội thì đẩy lên chỉ huy.
  4. Chỉ huy luôn thấy và **có thể chuyển việc** sang đội khác.
  5. **Gộp SOS trùng**: nhiều SOS trong bán kính ~50 m thì gom thành một điểm, để không phải cử nhiều đội tới cùng một nhà.
- **Báo cáo của đội**: các nút nhanh *Đã nhận → Đang tới → Đã tới → Đã cứu N người / Không tiếp cận được (lý do)*, kèm ảnh và ghi chú khi cần.

## 8. Công nghệ

- **Frontend**: Vite + React + TypeScript, chạy dạng **PWA** (cài được lên màn hình chính, mở được khi không có mạng). Bản đồ dùng **Leaflet + OpenStreetMap**, miễn phí.
- **Backend**: **Supabase**, gồm Auth (đăng nhập), Postgres + PostGIS (dữ liệu và tính khoảng cách), Realtime (cập nhật tức thì), Storage (ảnh), Edge Functions (giao việc tự động, nhận SMS).
- **Hosting**: trước mắt dùng **GitHub Pages**, tự deploy khi push lên `main`. Sau này chuyển lên VPS: web chỉ là file tĩnh chạy bằng Nginx; Supabase có thể tự cài trên VPS bằng Docker, hoặc giữ bản cloud.
- **Thông báo đẩy**: Web Push. Android chạy tốt. iPhone cần iOS 16.4 trở lên và phải "Thêm vào màn hình chính".

## 9. Các giai đoạn

**GĐ1 — MVP chạy được**
- Đăng ký, đăng nhập bằng SĐT và mật khẩu, lưu đăng nhập vĩnh viễn trên máy.
- Nút SOS tròn đỏ nhấp nháy, nhấn giữ 2 giây, gửi GPS và hồ sơ.
- Mở được khi không có mạng, hàng đợi tự gửi lại, SMS soạn sẵn, nút gọi 112.
- Vai trò người dân, cứu hộ, chỉ huy và phân quyền (RLS).
- Cứu hộ: bật ca, chia sẻ vị trí, xem và nhận SOS, cập nhật trạng thái.
- Chỉ huy: bản đồ SOS và vị trí các đội, giao việc thủ công, thống kê cơ bản.
- Deploy lên GitHub Pages.

**GĐ2 — Điều phối thông minh**
- Tự động giao cho đội gần nhất, chuyển tiếp khi đội không nhận, gộp SOS trùng, tính điểm ưu tiên.
- Thông báo đẩy, báo cáo hiện trường có ảnh, xuất Excel.
- Lớp radar và dự báo mưa, thông báo "tạm dừng cứu hộ vì gió mạnh".

**GĐ3 — Khi hạ tầng sập**
- Tổng đài SMS hai chiều (điện thoại Android làm gateway, hoặc dịch vụ SMS của nhà mạng).
- Tích hợp Meshtastic (LoRa) cho đội cứu hộ và điểm cô lập.
- Chuyển lên VPS, quản lý theo từng đợt lũ (mỗi đợt là một "sự kiện" riêng).

## 10. Học hỏi từ các app trên thế giới và ở Việt Nam

- **Zello** (Mỹ, bão Harvey 2017): biến điện thoại thành bộ đàm. Nhóm Cajun Navy chia kênh theo khu vực; điều phối viên ghi yêu cầu kèm vị trí và mã sự cố vào cơ sở dữ liệu, điều xuồng tới, rồi xác nhận khi đã cứu xong. → Mình học mô hình **điều phối viên + mã sự cố + xác nhận đã cứu**, và có thể thêm tính năng tin nhắn thoại ngắn cho đội cứu hộ ở GĐ3.
- **Bridgefy**: nhắn tin qua mạng Bluetooth giữa các máy, không cần internet. Phải cài app native, webapp không làm được. → Cân nhắc nếu sau này làm app Android.
- **Meshtastic**: mạng LoRa mã nguồn mở, mã hóa AES256, phủ vài km mà không cần sóng. → Hướng GĐ3.
- **SOS vệ tinh trên điện thoại** (iPhone, Pixel): hiện chưa dùng được ở Việt Nam.
- **Việt Nam**: thongtincuuho.org (lũ Thái Nguyên), hotronguoicuutro.inhandao.vn (Hội Chữ thập đỏ, lũ miền Trung), "La Bàn Cứu Hộ". Các trang này chủ yếu **gom thông tin từ mạng xã hội rồi vẽ lên bản đồ**, người dân không tự gửi GPS được và chưa có điều phối đội. → Điểm khác biệt của mình: **một nút gửi GPS ngay, đăng ký trước nên hồ sơ đầy đủ, tự động giao cho đội gần nhất**.

## 11. Cần bạn chốt

1. Ai đóng vai **chỉ huy** trong thực tế (xã, tỉnh, đội tình nguyện)? Dùng ở vùng nào trước?
2. **Số tổng đài** nhận SMS và cuộc gọi dự phòng là số nào?
3. Đồng ý để **repo public** (để dùng GitHub Pages miễn phí) không?
4. Có đồng ý **nhấn giữ 2 giây** (chống bấm nhầm) thay vì chạm một lần không?
