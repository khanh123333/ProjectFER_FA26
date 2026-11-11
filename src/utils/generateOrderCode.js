/**
 * Sinh mã đơn hàng tự động: ORD-YYYYMMDD-XXXX (4 số ngẫu nhiên hoặc tuần tự)
 */
function generateOrderCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

module.exports = generateOrderCode;
