const RESERVATION_STATUS = {
  PENDING: 'pending',     // Chờ xác nhận / chờ chuyển cọc
  CONFIRMED: 'confirmed', // Đã duyệt / Đã giữ bàn
  ARRIVED: 'arrived',     // Khách đã đến nhận bàn
  CANCELLED: 'cancelled', // Khách hoặc nhân viên hủy
  NO_SHOW: 'no_show'      // Tự động hủy nếu trễ quá 15 phút
};

const TABLE_LOCATION = {
  WINDOW: 'window',   // Gần cửa sổ
  OUTDOOR: 'outdoor', // Ngoài trời
  INDOOR: 'indoor',   // Phòng lạnh
  ANY: 'any'          // Tùy ý
};

const TABLE_LOCATION_LABELS = {
  window: 'Gần cửa sổ',
  outdoor: 'Ngoài trời',
  indoor: 'Phòng lạnh',
  any: 'Tùy ý / Không yêu cầu'
};

const DEPOSIT_STATUS = {
  NOT_REQUIRED: 'not_required', // Không cần cọc
  PENDING: 'pending',           // Chờ chuyển khoản cọc
  PAID: 'paid',                 // Đã chuyển cọc thành công
  REFUNDED: 'refunded'          // Đã hoàn cọc
};

const RESERVATION_CONFIG = {
  DEPOSIT_GUEST_THRESHOLD: 10,  // Trên 10 người (>10)
  DEPOSIT_AMOUNT: 200000,       // 200.000 VNĐ
  NO_SHOW_TIMEOUT_MINUTES: 15,  // Quá 15 phút không đến
  // Giờ cao điểm: Buổi trưa 11:30 - 13:30, Buổi tối 18:00 - 20:30
  PEAK_HOURS: [
    { start: '11:30', end: '13:30' },
    { start: '18:00', end: '20:30' }
  ]
};

module.exports = {
  RESERVATION_STATUS,
  TABLE_LOCATION,
  TABLE_LOCATION_LABELS,
  DEPOSIT_STATUS,
  RESERVATION_CONFIG
};

