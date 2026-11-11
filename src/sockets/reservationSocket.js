const { getIO } = require('../config/socket');

class ReservationSocket {
  /**
   * Báo có đặt bàn mới cho Staff & Admin
   */
  static notifyNewReservation(reservation) {
    try {
      const io = getIO();
      const payload = {
        reservationId: reservation._id,
        reservationCode: reservation.reservationCode,
        customerName: reservation.customerName,
        phone: reservation.phone,
        guestCount: reservation.guestCount,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        locationPreference: reservation.locationPreference,
        depositRequired: reservation.depositRequired,
        depositAmount: reservation.depositAmount,
        depositStatus: reservation.depositStatus,
        status: reservation.status,
        createdAt: reservation.createdAt
      };

      io.to('room_staff').to('room_admin').emit('reservation:new', payload);
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit reservation:new:', e.message);
    }
  }

  /**
   * Báo cập nhật trạng thái đặt bàn
   */
  static notifyStatusChanged(reservation, extra = {}) {
    try {
      const io = getIO();
      const payload = {
        reservationId: reservation._id,
        reservationCode: reservation.reservationCode,
        status: reservation.status,
        depositStatus: reservation.depositStatus,
        table: reservation.table,
        cancellationReason: reservation.cancellationReason,
        updatedAt: reservation.updatedAt,
        ...extra
      };

      io.to('room_staff').to('room_admin').emit('reservation:status-changed', payload);
      io.to(`reservation:${reservation._id}`).emit('reservation:status-changed', payload);
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit reservation:status-changed:', e.message);
    }
  }

  /**
   * Báo tự động hủy bàn do trễ quá 15 phút (No-show)
   */
  static notifyAutoCancelled(reservation, tableInfo = null) {
    try {
      const io = getIO();
      const payload = {
        reservationId: reservation._id,
        reservationCode: reservation.reservationCode,
        customerName: reservation.customerName,
        phone: reservation.phone,
        guestCount: reservation.guestCount,
        reservationTime: `${reservation.reservationDate} ${reservation.reservationTime}`,
        table: tableInfo,
        reason: reservation.cancellationReason,
        cancelledAt: reservation.cancelledAt
      };

      io.to('room_staff').to('room_admin').emit('reservation:auto-cancelled', payload);
      io.to(`reservation:${reservation._id}`).emit('reservation:status-changed', {
        reservationId: reservation._id,
        status: reservation.status,
        reason: reservation.cancellationReason
      });
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit reservation:auto-cancelled:', e.message);
    }
  }

  /**
   * Báo cập nhật trạng thái bàn (empty, reserved, occupied)
   */
  static notifyTableStatus(table) {
    try {
      const io = getIO();
      const payload = {
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: table.status,
        capacity: table.capacity,
        location: table.location
      };
      io.emit('table:status-changed', payload);
    } catch (e) {
      console.warn('[Socket Warning] Không thể emit table:status-changed:', e.message);
    }
  }
}

module.exports = ReservationSocket;

