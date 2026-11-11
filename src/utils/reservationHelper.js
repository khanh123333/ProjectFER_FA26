const { RESERVATION_CONFIG } = require('../constants/reservationStatus');

/**
 * Kiểm tra giờ có rơi vào khung giờ cao điểm hay không
 * Giờ cao điểm: 11:30 - 13:30 và 18:00 - 20:30
 * @param {string} timeStr - Định dạng HH:mm (VD: '12:00', '18:30')
 * @returns {boolean}
 */
function isPeakHour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const cleanTime = timeStr.trim();
  const [hours, minutes] = cleanTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return false;

  const currentMinutes = hours * 60 + minutes;

  return RESERVATION_CONFIG.PEAK_HOURS.some((range) => {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
}

/**
 * Tính toán yêu cầu đặt cọc giữ chỗ:
 * - Nếu đặt bàn trên 10 người HOẶC giờ cao điểm -> Bắt buộc chuyển khoản cọc 200.000đ.
 * @param {number} guestCount - Tổng số khách (người lớn + trẻ em)
 * @param {string} timeStr - Giờ hẹn (HH:mm)
 * @returns {{ depositRequired: boolean, depositAmount: number, reason: string }}
 */
function calculateDepositRequirement(guestCount, timeStr) {
  const isOverTen = Number(guestCount) > RESERVATION_CONFIG.DEPOSIT_GUEST_THRESHOLD;
  const isPeak = isPeakHour(timeStr);

  if (isOverTen || isPeak) {
    let reason = '';
    if (isOverTen && isPeak) {
      reason = `Đặt bàn trên ${RESERVATION_CONFIG.DEPOSIT_GUEST_THRESHOLD} người (${guestCount} khách) và vào khung giờ cao điểm (${timeStr})`;
    } else if (isOverTen) {
      reason = `Đặt bàn trên ${RESERVATION_CONFIG.DEPOSIT_GUEST_THRESHOLD} người (${guestCount} khách)`;
    } else {
      reason = `Đặt bàn vào khung giờ cao điểm (${timeStr}) - Khung giờ: 11:30-13:30 hoặc 18:00-20:30`;
    }

    return {
      depositRequired: true,
      depositAmount: RESERVATION_CONFIG.DEPOSIT_AMOUNT,
      reason
    };
  }

  return {
    depositRequired: false,
    depositAmount: 0,
    reason: 'Không thuộc diện bắt buộc đặt cọc'
  };
}

/**
 * Tạo mã đặt bàn ngẫu nhiên duy nhất
 * Định dạng: RES-YYMMDD-XXXX (VD: RES-261103-A8F2)
 */
function generateReservationCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RES-${yy}${mm}${dd}-${randomHex}`;
}

/**
 * Ghép chuỗi ngày YYYY-MM-DD và giờ HH:mm thành Date object
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:mm'
 * @returns {Date}
 */
function combineDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Kiểm tra xem đặt bàn đã bị trễ quá 15 phút (No-show) hay chưa
 * @param {Date} reservationDateTime 
 * @param {Date} [currentTime=new Date()] 
 * @param {number} [timeoutMinutes=15] 
 * @returns {boolean}
 */
function isNoShow(reservationDateTime, currentTime = new Date(), timeoutMinutes = RESERVATION_CONFIG.NO_SHOW_TIMEOUT_MINUTES) {
  const resTime = new Date(reservationDateTime).getTime();
  const nowTime = new Date(currentTime).getTime();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  return nowTime > (resTime + timeoutMs);
}

/**
 * Sinh URL mã VietQR chuyển khoản đặt cọc
 */
function generateVietQRUrl({ bankId = 'MB', accountNo = '0901000001', accountName = 'COFFEE AND TEA HOUSE', amount = 200000, description = 'COC BAN' } = {}) {
  const encodedName = encodeURIComponent(accountName);
  const encodedInfo = encodeURIComponent(description);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedInfo}&accountName=${encodedName}`;
}

module.exports = {
  isPeakHour,
  calculateDepositRequirement,
  generateReservationCode,
  combineDateTime,
  isNoShow,
  generateVietQRUrl
};

