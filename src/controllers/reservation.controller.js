const ReservationService = require('../services/reservationService');
const ApiResponse = require('../utils/apiResponse');

class ReservationController {
  /**
   * Khách hàng đặt bàn
   */
  static async createReservation(req, res, next) {
    try {
      const result = await ReservationService.createReservation(req.body, req.user || null);
      return ApiResponse.created(res, 'Đặt bàn thành công! Hệ thống đã ghi nhận yêu cầu của bạn.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tra cứu thông tin đặt bàn bằng mã code
   */
  static async getByCode(req, res, next) {
    try {
      const result = await ReservationService.getByCode(req.params.code);
      return ApiResponse.success(res, 'Lấy thông tin đặt bàn thành công', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lịch sử đặt bàn của khách đã đăng nhập
   */
  static async getMyReservations(req, res, next) {
    try {
      const reservations = await ReservationService.getReservations({
        // Filter by user if applicable
      });
      return ApiResponse.success(res, 'Danh sách đặt bàn của bạn', reservations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Khách tự hủy đặt bàn
   */
  static async customerCancelReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reservation = await ReservationService.cancelReservation(id, reason || 'Khách chủ động hủy');
      return ApiResponse.success(res, 'Đã hủy yêu cầu đặt bàn thành công', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Nhân viên / Quản lý lấy danh sách đặt bàn
   */
  static async getStaffReservations(req, res, next) {
    try {
      const reservations = await ReservationService.getReservations(req.query);
      return ApiResponse.success(res, 'Lấy danh sách đặt bàn thành công', reservations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Nhân viên duyệt xác nhận đặt bàn
   */
  static async confirmReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { tableId } = req.body;
      const reservation = await ReservationService.confirmReservation(id, { tableId });
      return ApiResponse.success(res, 'Đã xác nhận đặt bàn thành công', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Nhân viên xác nhận khách đã chuyển cọc 200.000đ
   */
  static async confirmDeposit(req, res, next) {
    try {
      const { id } = req.params;
      const { transactionRef } = req.body;
      const reservation = await ReservationService.confirmDepositPaid(id, { transactionRef });
      return ApiResponse.success(res, 'Đã xác nhận thanh toán tiền cọc 200.000đ thành công!', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Nhân viên gán bàn cho đơn đặt chỗ
   */
  static async assignTable(req, res, next) {
    try {
      const { id } = req.params;
      const { tableId } = req.body;
      const reservation = await ReservationService.assignTable(id, tableId);
      return ApiResponse.success(res, 'Đã xếp bàn thành công cho khách', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Khách đã đến nhận bàn (Check-in)
   */
  static async checkIn(req, res, next) {
    try {
      const { id } = req.params;
      const reservation = await ReservationService.checkInGuest(id);
      return ApiResponse.success(res, 'Khách đã nhận bàn thành công! Bàn đã chuyển sang trạng thái đang phục vụ.', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Nhân viên hủy đặt bàn
   */
  static async staffCancel(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reservation = await ReservationService.cancelReservation(id, reason || 'Nhân viên hủy đơn');
      return ApiResponse.success(res, 'Đã hủy đơn đặt bàn', reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Kích hoạt quét và tự động hủy các đơn trễ quá 15 phút
   */
  static async triggerCheckExpired(req, res, next) {
    try {
      const result = await ReservationService.checkAndAutoCancelExpiredReservations();
      return ApiResponse.success(res, `Đã quét và tự động hủy ${result.count} đơn trễ quá 15 phút`, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách bàn khả dụng
   */
  static async getAvailableTables(req, res, next) {
    try {
      const tables = await ReservationService.getAvailableTables(req.query);
      return ApiResponse.success(res, 'Danh sách bàn phù hợp', tables);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReservationController;
