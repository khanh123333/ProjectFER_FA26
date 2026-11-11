const { Shift, Order, User } = require('../models');
const { PAYMENT_STATUS, PAYMENT_METHODS } = require('../constants/orderStatus');
const AppError = require('../utils/AppError');

class ShiftService {
  /**
   * Lấy ca đang mở hiện tại
   */
  static async getCurrentShift() {
    const shift = await Shift.findOne({ status: 'open' })
      .populate('cashier', 'fullName email phone')
      .sort({ startTime: -1 });

    if (!shift) {
      return null;
    }

    const stats = await this.getShiftRevenueStats(shift);
    return {
      shift,
      stats
    };
  }

  /**
   * Tính toán doanh thu và số liệu tiền mặt hệ thống trong khoảng thời gian của ca
   */
  static async getShiftRevenueStats(shift) {
    const query = {
      paymentStatus: PAYMENT_STATUS.PAID,
      paidAt: { $gte: shift.startTime }
    };
    if (shift.endTime) {
      query.paidAt.$lte = shift.endTime;
    }

    const orders = await Order.find(query)
      .populate('table', 'tableNumber')
      .populate('paidBy', 'fullName')
      .sort({ paidAt: -1 })
      .lean();

    let systemCash = 0;
    let systemTransfer = 0;
    let systemCard = 0;

    orders.forEach((ord) => {
      const amount = ord.totalAmount || 0;
      if (ord.paymentMethod === PAYMENT_METHODS.CASH) {
        systemCash += amount;
      } else if (ord.paymentMethod === PAYMENT_METHODS.TRANSFER) {
        systemTransfer += amount;
      } else if (ord.paymentMethod === PAYMENT_METHODS.CARD) {
        systemCard += amount;
      } else {
        systemCash += amount;
      }
    });

    const systemTotal = systemCash + systemTransfer + systemCard;
    const orderCount = orders.length;
    const expectedCash = (shift.startingCash || 0) + systemCash;

    return {
      systemCash,
      systemTransfer,
      systemCard,
      systemTotal,
      orderCount,
      expectedCash,
      orders
    };
  }

  /**
   * Mở ca làm việc mới
   */
  static async openShift({ cashierId, startingCash = 0, note = '' }) {
    const existing = await Shift.findOne({ status: 'open' });
    if (existing) {
      throw new AppError(`Ca làm việc [${existing.shiftCode}] đang mở. Vui lòng kết ca hiện tại trước khi mở ca mới.`, 400);
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const shiftCode = `CA-${dateStr}-${randomSuffix}`;

    const shift = await Shift.create({
      shiftCode,
      cashier: cashierId,
      startTime: now,
      status: 'open',
      startingCash: Number(startingCash) || 0,
      note: note || ''
    });

    return await Shift.findById(shift._id).populate('cashier', 'fullName email phone');
  }

  /**
   * Chốt ca và sinh Báo Cáo Kết Ca (Z-Report)
   */
  static async closeShift({ shiftId, actualCash, handoverTo = '', note = '', closedByUserId }) {
    const shift = await Shift.findById(shiftId).populate('cashier', 'fullName email phone');
    if (!shift) {
      throw new AppError('Không tìm thấy ca làm việc', 404);
    }

    if (shift.status !== 'open') {
      throw new AppError('Ca làm việc này đã được chốt trước đó', 400);
    }

    const endTime = new Date();
    shift.endTime = endTime;

    // Tính toán doanh thu chính xác
    const stats = await this.getShiftRevenueStats(shift);

    const actualCashNum = Math.max(0, Number(actualCash) || 0);
    const expectedCash = (shift.startingCash || 0) + stats.systemCash;
    const difference = actualCashNum - expectedCash;

    shift.status = 'closed';
    shift.systemCash = stats.systemCash;
    shift.systemTransfer = stats.systemTransfer;
    shift.systemCard = stats.systemCard;
    shift.systemTotal = stats.systemTotal;
    shift.orderCount = stats.orderCount;
    shift.expectedCash = expectedCash;
    shift.actualCash = actualCashNum;
    shift.difference = difference;
    shift.handoverTo = handoverTo ? handoverTo.trim() : '';
    shift.note = note ? note.trim() : '';
    shift.closedBy = closedByUserId;

    await shift.save();

    return {
      shift,
      stats
    };
  }

  /**
   * Lấy lịch sử ca làm việc
   */
  static async getShiftHistory({ page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const [shifts, total] = await Promise.all([
      Shift.find()
        .populate('cashier', 'fullName email')
        .populate('closedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Shift.countDocuments()
    ]);

    return {
      shifts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Lấy chi tiết Z-Report của một ca
   */
  static async getZReport(shiftId) {
    const shift = await Shift.findById(shiftId)
      .populate('cashier', 'fullName email phone')
      .populate('closedBy', 'fullName email phone')
      .lean();

    if (!shift) {
      throw new AppError('Không tìm thấy ca làm việc', 404);
    }

    const stats = await this.getShiftRevenueStats(shift);
    return {
      shift,
      stats
    };
  }
}

module.exports = ShiftService;
