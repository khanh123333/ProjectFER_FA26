const OrderService = require('../services/orderService');
const ApiResponse = require('../utils/apiResponse');

class OrderController {
  // --- Phía Khách Hàng ---
  static async createOrder(req, res, next) {
    try {
      const order = await OrderService.createOrder({
        ...req.body,
        user: req.user || null
      });
      return ApiResponse.created(res, 'Đặt đơn hàng thành công!', order);
    } catch (error) {
      next(error);
    }
  }

  static async addMoreItems(req, res, next) {
    try {
      const { items } = req.body;
      const order = await OrderService.addMoreItems(req.params.id, items, req.user || null);
      return ApiResponse.success(res, 'Đã gửi yêu cầu gọi thêm món đến quầy phục vụ!', order);
    } catch (error) {
      next(error);
    }
  }

  static async customerUpdateItem(req, res, next) {
    try {
      const { quantity, note } = req.body;
      const order = await OrderService.customerUpdateItem(
        req.params.id,
        req.params.itemId,
        { quantity, note },
        req.user || null
      );
      return ApiResponse.success(res, 'Cập nhật món thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async customerRemoveItem(req, res, next) {
    try {
      const order = await OrderService.customerRemoveItem(
        req.params.id,
        req.params.itemId,
        req.user || null
      );
      return ApiResponse.success(res, 'Đã xóa món khỏi đơn hàng', order);
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req, res, next) {
    try {
      const { reason } = req.body;
      const order = await OrderService.cancelOrder(req.params.id, reason, req.user || null);
      return ApiResponse.success(res, 'Hủy đơn hàng thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderByCode(req, res, next) {
    try {
      const order = await OrderService.getOrderByCode(req.params.code);
      return ApiResponse.success(res, 'Lấy thông tin đơn hàng thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req, res, next) {
    try {
      if (!req.user) {
        return ApiResponse.success(res, 'Lấy lịch sử đơn thành công', []);
      }
      const { orders, pagination } = await OrderService.getOrders({
        search: '',
        page: req.query.page || 1,
        limit: req.query.limit || 20
      });
      // Lọc theo customer id
      const userOrders = orders.filter((o) => o.customer && o.customer._id.toString() === req.user._id.toString());
      return ApiResponse.success(res, 'Lấy lịch sử đơn hàng thành công', userOrders, 200, pagination);
    } catch (error) {
      next(error);
    }
  }

  // --- Phía Nhân Viên & Quản Trị ---
  static async getOrders(req, res, next) {
    try {
      const { status, tableId, paymentStatus, date, startDate, endDate, search, page, limit } = req.query;
      const result = await OrderService.getOrders({
        status,
        tableId,
        paymentStatus,
        date,
        startDate,
        endDate,
        search,
        page,
        limit
      });
      return ApiResponse.success(res, 'Lấy danh sách đơn hàng thành công', result.orders, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req, res, next) {
    try {
      const result = await OrderService.getOrderById(req.params.id);
      return ApiResponse.success(res, 'Lấy chi tiết đơn hàng thành công', result);
    } catch (error) {
      next(error);
    }
  }

  static async confirmOrder(req, res, next) {
    try {
      const order = await OrderService.confirmOrder(req.params.id, req.user);
      return ApiResponse.success(res, 'Đã xác nhận đơn hàng thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async rejectOrder(req, res, next) {
    try {
      const { reason } = req.body;
      const order = await OrderService.rejectOrder(req.params.id, reason, req.user);
      return ApiResponse.success(res, 'Đã từ chối đơn hàng', order);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const order = await OrderService.updateOrderStatus(req.params.id, status, req.user, reason);
      return ApiResponse.success(res, `Đã cập nhật trạng thái đơn thành: ${status}`, order);
    } catch (error) {
      next(error);
    }
  }

  static async staffModifyItems(req, res, next) {
    try {
      const { action, itemId, itemData } = req.body;
      const order = await OrderService.staffModifyItems(
        req.params.id,
        { action, itemId, itemData },
        req.user
      );
      return ApiResponse.success(res, 'Đã chỉnh sửa món trong đơn thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async payOrder(req, res, next) {
    try {
      const { paymentMethod, couponCode } = req.body;
      const order = await OrderService.payOrder(
        req.params.id,
        { paymentMethod, couponCode },
        req.user
      );
      return ApiResponse.success(res, 'Thanh toán đơn hàng thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async approvePendingItems(req, res, next) {
    try {
      const order = await OrderService.approvePendingItems(req.params.id, req.user);
      return ApiResponse.success(res, 'Đã duyệt các món gọi thêm thành công', order);
    } catch (error) {
      next(error);
    }
  }

  static async approveSingleItem(req, res, next) {
    try {
      const order = await OrderService.approveSingleItem(req.params.id, req.params.itemId, req.user);
      return ApiResponse.success(res, 'Đã duyệt món thành công', order);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
