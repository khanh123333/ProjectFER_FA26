const { getIO } = require('../config/socket');

class OrderSocket {
  /**
   * Bắn sự kiện có đơn hàng mới cho nhân viên và admin
   */
  static notifyNewOrder(order) {
    try {
      const io = getIO();
      io.to('room_staff').to('room_admin').emit('order:new', {
        orderId: order._id,
        orderCode: order.orderCode,
        tableNumber: order.table ? (order.table.tableNumber || order.table) : '',
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        itemsCount: order.items ? order.items.length : 0
      });
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit order:new:', e.message);
    }
  }

  /**
   * Báo trạng thái đơn hàng thay đổi
   */
  static notifyStatusChanged(order, reason = '') {
    try {
      const io = getIO();
      const payload = {
        orderId: order._id,
        orderCode: order.orderCode,
        status: order.status,
        reason,
        updatedAt: order.updatedAt,
        isLocked: order.isLocked
      };

      // Gửi cho nhân viên
      io.to('room_staff').to('room_admin').emit('order:status-changed', payload);
      // Gửi cho khách theo dõi đơn này
      io.to(`order:${order._id}`).emit('order:status-changed', payload);
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit order:status-changed:', e.message);
    }
  }

  /**
   * Báo đơn hàng có cập nhật món ăn hoặc thông tin
   */
  static notifyOrderUpdated(order) {
    try {
      const io = getIO();
      const payload = {
        orderId: order._id,
        orderCode: order.orderCode,
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        totalAmount: order.totalAmount,
        items: order.items
      };

      io.to('room_staff').to('room_admin').emit('order:updated', payload);
      io.to(`order:${order._id}`).emit('order:updated', payload);
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit order:updated:', e.message);
    }
  }

  /**
   * Báo thay đổi trạng thái còn/hết hàng của món
   */
  static notifyProductAvailability(product) {
    try {
      const io = getIO();
      io.emit('product:availability-changed', {
        productId: product._id,
        name: product.name,
        isAvailable: product.isAvailable
      });
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit product:availability-changed:', e.message);
    }
  }
}

module.exports = OrderSocket;
