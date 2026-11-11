const { Coupon } = require('../models');
const AppError = require('../utils/appError');

class CouponService {
  static async getAll(onlyActive = false) {
    const filter = onlyActive ? { isActive: true } : {};
    return await Coupon.find(filter).sort({ createdAt: -1 }).lean();
  }

  static async getById(id) {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá', 404);
    }
    return coupon;
  }

  static async validateCoupon(code, subtotal = 0) {
    if (!code) return null;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      throw new AppError('Mã giảm giá không hợp lệ hoặc đã bị khóa', 400);
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw new AppError('Mã giảm giá chưa đến ngày áp dụng', 400);
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw new AppError('Mã giảm giá đã hết hạn sử dụng', 400);
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
    }

    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
      throw new AppError(`Đơn hàng phải tối thiểu ${coupon.minOrder.toLocaleString('vi-VN')}đ để áp dụng mã này`, 400);
    }

    return coupon;
  }

  static async create(data) {
    data.code = data.code.toUpperCase();
    const existing = await Coupon.findOne({ code: data.code });
    if (existing) {
      throw new AppError('Mã giảm giá này đã tồn tại', 400);
    }
    return await Coupon.create(data);
  }

  static async update(id, data) {
    if (data.code) data.code = data.code.toUpperCase();
    const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true });
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá', 404);
    }
    return coupon;
  }

  static async delete(id) {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá', 404);
    }
    return coupon;
  }
}

module.exports = CouponService;
