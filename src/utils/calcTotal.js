/**
 * Tính toán tổng tiền cho các món trong đơn hàng
 * @param {Array} items - Danh sách món kèm snapshot giá và options
 * @param {Object} coupon - Đối tượng coupon (nếu có)
 */
function calcOrderTotal(items = [], coupon = null) {
  let subtotal = 0;

  for (const item of items) {
    if (item.itemStatus === 'cancelled') continue;

    let itemExtra = 0;
    if (Array.isArray(item.selectedOptions)) {
      itemExtra = item.selectedOptions.reduce((acc, opt) => acc + (Number(opt.extraPrice) || 0), 0);
    }
    const unitPrice = (Number(item.priceSnapshot) || 0) + itemExtra;
    const qty = Number(item.quantity) || 1;
    subtotal += unitPrice * qty;
  }

  let discount = 0;
  if (coupon && coupon.isActive) {
    const now = new Date();
    const isValidDate = (!coupon.startDate || now >= new Date(coupon.startDate)) &&
                        (!coupon.endDate || now <= new Date(coupon.endDate));
    const isMinMet = !coupon.minOrder || subtotal >= coupon.minOrder;

    if (isValidDate && isMinMet) {
      if (coupon.type === 'percent') {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else if (coupon.type === 'fixed') {
        discount = coupon.value;
      }
    }
  }

  discount = Math.min(discount, subtotal);
  const totalAmount = Math.max(0, subtotal - discount);

  return {
    subtotal: Math.round(subtotal),
    discount: Math.round(discount),
    totalAmount: Math.round(totalAmount)
  };
}

module.exports = {
  calcOrderTotal
};
