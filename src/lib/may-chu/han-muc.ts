import 'server-only';

/**
 * Hạn mức gọi đơn giản, đếm trong bộ nhớ tiến trình.
 *
 * Cùng cách làm với bộ đếm chặn dò mật khẩu trong auth.ts và cùng giới hạn:
 * App chạy MỘT container duy nhất nên bộ đếm dùng chung cho mọi lượt gọi;
 * khởi động lại thì về 0, chấp nhận được vì kẻ lạm dụng không điều khiển được
 * lúc nào máy chủ khởi động lại. Đổi sang nhiều container thì phải chuyển bộ
 * đếm ra chỗ dùng chung (Redis hoặc một bảng trong CSDL).
 *
 * Cửa sổ trượt theo từng mốc: đủ cho mục đích chặn lạm dụng thô, không nhằm
 * chống tấn công từ chối dịch vụ phân tán — việc đó là của tầng proxy.
 */

type Dem = { dem: number; mocDau: number };

const bang = new Map<string, Dem>();

/** Dọn định kỳ để bảng không phình theo số khoá đã từng thấy. */
function don(bayGio: number) {
  if (bang.size < 5000) return;
  for (const [k, v] of bang) {
    if (bayGio - v.mocDau > 3600_000) bang.delete(k);
  }
}

/**
 * Ghi nhận một lượt gọi cho `khoa`. Trả về `true` nếu ĐÃ VƯỢT hạn mức
 * (nghĩa là nên từ chối), `false` nếu còn trong hạn.
 *
 * @param soLan  số lượt tối đa trong một cửa sổ
 * @param giay   độ dài cửa sổ tính bằng giây
 */
export function quaHanMuc(khoa: string, soLan: number, giay: number): boolean {
  const bayGio = Date.now();
  don(bayGio);

  const v = bang.get(khoa);
  if (!v || bayGio - v.mocDau > giay * 1000) {
    bang.set(khoa, { dem: 1, mocDau: bayGio });
    return false;
  }

  v.dem++;
  return v.dem > soLan;
}

/**
 * Lấy IP thật của người gọi để làm khoá hạn mức.
 *
 * PHẢI LẤY PHẦN TỬ CUỐI, KHÔNG PHẢI PHẦN TỬ ĐẦU. nginx-proxy-manager đặt
 * `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`, mà chỉ thị
 * đó NỐI THÊM ip thật vào CUỐI chuỗi client gửi lên chứ không ghi đè. Nên khi
 * người gọi tự đính kèm `X-Forwarded-For: 9.9.9.9`, app nhận được
 * "9.9.9.9, <ip thật>" — lấy phần tử đầu là lấy đúng thứ kẻ gọi tự đặt, đổi
 * header mỗi lượt là hạn mức coi như không tồn tại. Phần tử cuối do nginx ghi
 * vào, client không chèn được vào sau nó.
 *
 * Điều này chỉ đúng khi có ĐÚNG MỘT proxy tin cậy đứng trước app. Ngày nào
 * thêm một tầng nữa (Cloudflare chẳng hạn) thì phải lùi thêm một bậc, vì lúc
 * đó phần tử cuối là ip của Cloudflare chứ không phải của người gọi.
 */
export function ipNguoiGoi(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return 'khong-ro';
  const phan = xff.split(',');
  return phan[phan.length - 1]?.trim() || 'khong-ro';
}
