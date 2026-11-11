const CouponService = require('../services/couponService');
const ApiResponse = require('../utils/apiResponse');

class CouponController {
  static async getAll(req, res, next) {
    try {
      const onlyActive = req.query.all !== 'true';
      const coupons = await CouponService.getAll(onlyActive);
      return ApiResponse.success(res, 'Lấy danh sách mã giảm giá thành công', coupons);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const coupon = await CouponService.getById(req.params.id);
      return ApiResponse.success(res, 'Lấy chi tiết mã giảm giá thành công', coupon);
    } catch (error) {
      next(error);
    }
  }

  static async validate(req, res, next) {
    try {
      const { code, subtotal } = req.body;
      const coupon = await CouponService.validateCoupon(code, Number(subtotal) || 0);
      return ApiResponse.success(res, 'Mã giảm giá hợp lệ', coupon);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const coupon = await CouponService.create(req.body);
      return ApiResponse.created(res, 'Tạo mã giảm giá mới thành công', coupon);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const coupon = await CouponService.update(req.params.id, req.body);
      return ApiResponse.success(res, 'Cập nhật mã giảm giá thành công', coupon);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await CouponService.delete(req.params.id);
      return ApiResponse.success(res, 'Xóa mã giảm giá thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CouponController;
