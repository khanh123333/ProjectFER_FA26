const { Reservation, Table, User } = require('../models');
const AppError = require('../utils/appError');
const {
  RESERVATION_STATUS,
  TABLE_LOCATION,
  DEPOSIT_STATUS,
  RESERVATION_CONFIG
} = require('../constants/reservationStatus');
const { TABLE_STATUS } = require('../constants/orderStatus');
const {
  isPeakHour,
  calculateDepositRequirement,
  generateReservationCode,
  combineDateTime,
  generateVietQRUrl
} = require('../utils/reservationHelper');
const ReservationSocket = require('../sockets/reservationSocket');

class ReservationService {
  /**
   * Tạo yêu cầu đặt bàn mới (Khách hàng)
   */
  static async createReservation(data, user = null) {
    const adultCount = Number(data.adultCount) || 1;
    const childrenCount = Number(data.childrenCount) || 0;
    const guestCount = adultCount + childrenCount;

    if (guestCount <= 0) {
      throw new AppError('Tổng số khách phải lớn hơn 0', 400);
    }

    // Kiểm tra tính hợp lệ của ngày giờ
    const reservationDateTime = combineDateTime(data.reservationDate, data.reservationTime);
    if (isNaN(reservationDateTime.getTime())) {
      throw new AppError('Ngày hoặc giờ đến không hợp lệ', 400);
    }

    // Không cho phép đặt thời gian trong quá khứ
    const now = new Date();
    if (reservationDateTime < now) {
      throw new AppError('Thời gian đặt hẹn phải sau thời điểm hiện tại', 400);
    }

    // 1. NGHIỆP VỤ ĐẶT CỌC GIỮ CHỖ:
    // Nếu đặt bàn trên 10 người HOẶC giờ cao điểm -> Bắt buộc chuyển khoản cọc 200.000đ
    const depositCheck = calculateDepositRequirement(guestCount, data.reservationTime);

    let depositStatus = DEPOSIT_STATUS.NOT_REQUIRED;
    if (depositCheck.depositRequired) {
      depositStatus = DEPOSIT_STATUS.PENDING;
    }

    // 2. Tìm hoặc gợi ý bàn phù hợp nếu khách chọn yêu cầu vị trí
    let assignedTableId = data.table || null;
    if (assignedTableId) {
      const table = await Table.findOne({ _id: assignedTableId, isActive: true });
      if (!table) {
        throw new AppError('Bàn được chọn không tồn tại hoặc đã ngừng hoạt động', 400);
      }
    }

    // 3. Sinh mã đặt bàn duy nhất
    let reservationCode = generateReservationCode();
    let exists = await Reservation.findOne({ reservationCode });
    while (exists) {
      reservationCode = generateReservationCode();
      exists = await Reservation.findOne({ reservationCode });
    }

    // 4. Lưu đơn đặt bàn
    const reservation = await Reservation.create({
      reservationCode,
      customer: user ? user._id : null,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || (user ? user.email : ''),
      adultCount,
      childrenCount,
      guestCount,
      reservationDate: data.reservationDate,
      reservationTime: data.reservationTime,
      reservationDateTime,
      locationPreference: data.locationPreference || TABLE_LOCATION.ANY,
      table: assignedTableId,
      notes: data.notes || '',
      depositRequired: depositCheck.depositRequired,
      depositAmount: depositCheck.depositAmount,
      depositStatus,
      depositReason: depositCheck.reason,
      status: RESERVATION_STATUS.PENDING
    });

    const populatedRes = await Reservation.findById(reservation._id).populate('table');

    // Bắn realtime cho nhân viên & admin
    ReservationSocket.notifyNewReservation(populatedRes);

    // Chuẩn bị thông tin VietQR nếu bắt buộc chuyển khoản cọc
    let vietQR = null;
    if (depositCheck.depositRequired) {
      vietQR = {
        bankId: 'MB',
        accountNo: '0901000001',
        accountName: 'COFFEE AND TEA HOUSE',
        amount: depositCheck.depositAmount,
        description: `COC ${reservationCode} ${data.phone}`.trim(),
        qrUrl: generateVietQRUrl({
          bankId: 'MB',
          accountNo: '0901000001',
          accountName: 'COFFEE AND TEA HOUSE',
          amount: depositCheck.depositAmount,
          description: `COC ${reservationCode}`
        })
      };
    }

    return {
      reservation: populatedRes,
      vietQR
    };
  }

  /**
   * TỰ ĐỘNG HỦY GIỮ BÀN NẾU TRỄ QUÁ 15 PHÚT (No-show)
   * Quá thời gian đặt hẹn 15 phút mà khách không đến -> Bàn tự động chuyển về trạng thái trống cho khách vãng lai.
   */
  static async checkAndAutoCancelExpiredReservations() {
    const now = new Date();
    // Ngưỡng quá hạn: thời gian đặt hẹn + 15 phút < hiện tại <=> thời gian đặt hẹn < hiện tại - 15 phút
    const expiryThreshold = new Date(now.getTime() - RESERVATION_CONFIG.NO_SHOW_TIMEOUT_MINUTES * 60 * 1000);

    const expiredList = await Reservation.find({
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
      reservationDateTime: { $lt: expiryThreshold }
    }).populate('table');

    if (!expiredList || expiredList.length === 0) {
      return { count: 0, cancelledReservations: [] };
    }

    const cancelledReservations = [];

    for (const res of expiredList) {
      res.status = RESERVATION_STATUS.NO_SHOW;
      res.cancellationReason = `Tự động hủy giữ bàn do quá thời gian hẹn 15 phút mà khách không đến (No-show quá giờ hẹn ${res.reservationTime})`;
      res.cancelledAt = new Date();
      await res.save();

      // Nếu đặt bàn có gán bàn, kiểm tra để giải phóng bàn về EMPTY cho khách vãng lai
      let tableInfo = null;
      if (res.table) {
        const tableId = res.table._id || res.table;
        // Kiểm tra xem bàn này còn đặt chỗ nào khác đang CONFIRMED trong hôm nay không
        const otherConfirmed = await Reservation.findOne({
          _id: { $ne: res._id },
          table: tableId,
          status: RESERVATION_STATUS.CONFIRMED
        });

        if (!otherConfirmed) {
          const updatedTable = await Table.findByIdAndUpdate(
            tableId,
            { status: TABLE_STATUS.EMPTY },
            { new: true }
          );
          if (updatedTable) {
            ReservationSocket.notifyTableStatus(updatedTable);
            tableInfo = {
              _id: updatedTable._id,
              tableNumber: updatedTable.tableNumber,
              status: updatedTable.status
            };
          }
        }
      }

      // Phát thông báo Realtime tới Staff & Admin
      ReservationSocket.notifyAutoCancelled(res, tableInfo);
      cancelledReservations.push({
        reservationCode: res.reservationCode,
        customerName: res.customerName,
        phone: res.phone,
        time: `${res.reservationDate} ${res.reservationTime}`,
        table: tableInfo ? tableInfo.tableNumber : 'Chưa xếp'
      });
    }

    return {
      count: cancelledReservations.length,
      cancelledReservations
    };
  }

  /**
   * Lấy danh sách đặt bàn (Staff / Admin)
   * Kèm tự động kiểm tra trễ 15 phút on-demand
   */
  static async getReservations(query = {}) {
    // Luôn chạy quét quá hạn 15 phút để đảm bảo danh sách tươi mới
    await this.checkAndAutoCancelExpiredReservations();

    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      filter.reservationDate = query.date;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { reservationCode: searchRegex },
        { customerName: searchRegex },
        { phone: searchRegex }
      ];
    }

    const reservations = await Reservation.find(filter)
      .populate('table', 'tableNumber capacity location status')
      .populate('customer', 'fullName email phone')
      .sort({ reservationDateTime: 1, createdAt: -1 })
      .lean();

    return reservations;
  }

  /**
   * Lấy chi tiết đặt bàn theo mã code (Cho khách hàng tra cứu)
   */
  static async getByCode(code) {
    await this.checkAndAutoCancelExpiredReservations();

    const reservation = await Reservation.findOne({ reservationCode: code })
      .populate('table', 'tableNumber capacity location status')
      .lean();

    if (!reservation) {
      throw new AppError(`Không tìm thấy thông tin đặt bàn mã '${code}'`, 404);
    }

    let vietQR = null;
    if (reservation.depositRequired && reservation.depositStatus === DEPOSIT_STATUS.PENDING) {
      vietQR = {
        bankId: 'MB',
        accountNo: '0901000001',
        accountName: 'COFFEE AND TEA HOUSE',
        amount: reservation.depositAmount,
        description: `COC ${reservation.reservationCode} ${reservation.phone}`.trim(),
        qrUrl: generateVietQRUrl({
          bankId: 'MB',
          accountNo: '0901000001',
          accountName: 'COFFEE AND TEA HOUSE',
          amount: reservation.depositAmount,
          description: `COC ${reservation.reservationCode}`
        })
      };
    }

    return {
      reservation,
      vietQR
    };
  }

  /**
   * Lấy chi tiết đặt bàn theo ID
   */
  static async getById(id) {
    const reservation = await Reservation.findById(id).populate('table');
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }
    return reservation;
  }

  /**
   * Nhân viên xác nhận đặt bàn (Confirm) & Xếp bàn
   */
  static async confirmReservation(id, { tableId = null } = {}) {
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }

    if (reservation.status === RESERVATION_STATUS.CANCELLED || reservation.status === RESERVATION_STATUS.NO_SHOW) {
      throw new AppError('Không thể xác nhận đơn đặt bàn đã bị hủy', 400);
    }

    // Nếu có chọn bàn mới
    const targetTableId = tableId || reservation.table;
    if (targetTableId) {
      const table = await Table.findById(targetTableId);
      if (!table) {
        throw new AppError('Bàn được chọn không tồn tại', 404);
      }
      reservation.table = targetTableId;

      // Cập nhật trạng thái bàn sang RESERVED (Đã đặt trước)
      table.status = TABLE_STATUS.RESERVED;
      await table.save();
      ReservationSocket.notifyTableStatus(table);
    }

    reservation.status = RESERVATION_STATUS.CONFIRMED;
    await reservation.save();

    const updated = await Reservation.findById(id).populate('table');
    ReservationSocket.notifyStatusChanged(updated);
    return updated;
  }

  /**
   * Nhân viên xác nhận khách ĐÃ CHUYỂN KHOẢN CỌC 200.000đ
   */
  static async confirmDepositPaid(id, { transactionRef = '' } = {}) {
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }

    reservation.depositStatus = DEPOSIT_STATUS.PAID;
    reservation.depositPaidAt = new Date();
    reservation.depositTransactionRef = transactionRef || 'Chuyển khoản VietQR đã nhận';

    // Tự động chuyển trạng thái sang confirmed nếu đang pending
    if (reservation.status === RESERVATION_STATUS.PENDING) {
      reservation.status = RESERVATION_STATUS.CONFIRMED;
    }

    // Nếu đã có bàn gán, đảm bảo bàn chuyển sang RESERVED
    if (reservation.table) {
      const table = await Table.findById(reservation.table);
      if (table && table.status === TABLE_STATUS.EMPTY) {
        table.status = TABLE_STATUS.RESERVED;
        await table.save();
        ReservationSocket.notifyTableStatus(table);
      }
    }

    await reservation.save();
    const updated = await Reservation.findById(id).populate('table');
    ReservationSocket.notifyStatusChanged(updated);
    return updated;
  }

  /**
   * Nhân viên gán bàn cho đặt chỗ
   */
  static async assignTable(id, tableId) {
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }

    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Bàn không tồn tại', 404);
    }

    // Nếu bàn cũ đang reserved và đổi sang bàn mới, giải phóng bàn cũ
    if (reservation.table && reservation.table.toString() !== tableId.toString()) {
      const oldTable = await Table.findById(reservation.table);
      if (oldTable && oldTable.status === TABLE_STATUS.RESERVED) {
        oldTable.status = TABLE_STATUS.EMPTY;
        await oldTable.save();
        ReservationSocket.notifyTableStatus(oldTable);
      }
    }

    reservation.table = tableId;
    if (reservation.status === RESERVATION_STATUS.CONFIRMED) {
      table.status = TABLE_STATUS.RESERVED;
      await table.save();
      ReservationSocket.notifyTableStatus(table);
    }

    await reservation.save();
    const updated = await Reservation.findById(id).populate('table');
    ReservationSocket.notifyStatusChanged(updated);
    return updated;
  }

  /**
   * Khách đã đến nhận bàn (Check-in)
   * Chuyển trạng thái đặt bàn sang ARRIVED và bàn sang OCCUPIED (Đang có khách)
   */
  static async checkInGuest(id) {
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }

    if (!reservation.table) {
      throw new AppError('Vui lòng xếp bàn cho khách trước khi check-in', 400);
    }

    reservation.status = RESERVATION_STATUS.ARRIVED;
    reservation.arrivedAt = new Date();
    await reservation.save();

    // Chuyển bàn sang OCCUPIED
    const table = await Table.findById(reservation.table);
    if (table) {
      table.status = TABLE_STATUS.OCCUPIED;
      await table.save();
      ReservationSocket.notifyTableStatus(table);
    }

    const updated = await Reservation.findById(id).populate('table');
    ReservationSocket.notifyStatusChanged(updated);
    return updated;
  }

  /**
   * Hủy đặt bàn (Bởi khách hàng hoặc nhân viên)
   * Nếu có bàn đang giữ -> Giải phóng về EMPTY
   */
  static async cancelReservation(id, reason = 'Khách yêu cầu hủy') {
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new AppError('Không tìm thấy đơn đặt bàn', 404);
    }

    if (reservation.status === RESERVATION_STATUS.ARRIVED) {
      throw new AppError('Khách đã check-in, không thể hủy đặt bàn', 400);
    }

    reservation.status = RESERVATION_STATUS.CANCELLED;
    reservation.cancellationReason = reason;
    reservation.cancelledAt = new Date();
    await reservation.save();

    // Giải phóng bàn nếu đang RESERVED
    if (reservation.table) {
      const table = await Table.findById(reservation.table);
      if (table && table.status === TABLE_STATUS.RESERVED) {
        table.status = TABLE_STATUS.EMPTY;
        await table.save();
        ReservationSocket.notifyTableStatus(table);
      }
    }

    const updated = await Reservation.findById(id).populate('table');
    ReservationSocket.notifyStatusChanged(updated);
    return updated;
  }

  /**
   * Tìm danh sách bàn trống khả dụng theo vị trí & sức chứa
   */
  static async getAvailableTables({ location = 'any', guestCount = 1 } = {}) {
    const filter = { isActive: true };
    if (location && location !== 'any') {
      filter.location = location;
    }
    if (guestCount > 0) {
      filter.capacity = { $gte: Number(guestCount) };
    }

    const tables = await Table.find(filter).sort({ capacity: 1, tableNumber: 1 }).lean();
    return tables;
  }
}

module.exports = ReservationService;

