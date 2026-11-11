const { Table, Order } = require('../models');
const AppError = require('../utils/appError');
const QRService = require('./qrService');
const { TABLE_STATUS, ORDER_STATUS } = require('../constants/orderStatus');

class TableService {
  static async getAll(onlyActive = true) {
    const filter = onlyActive ? { isActive: true } : {};
    return await Table.find(filter).sort({ tableNumber: 1 }).lean();
  }

  static async getById(id) {
    const table = await Table.findById(id);
    if (!table) {
      throw new AppError('Không tìm thấy bàn', 404);
    }
    return table;
  }

  static async getByNumber(tableNumber) {
    const table = await Table.findOne({ tableNumber, isActive: true });
    if (!table) {
      throw new AppError(`Không tìm thấy '${tableNumber}' trong hệ thống`, 404);
    }
    return table;
  }

  static async create(data) {
    const existing = await Table.findOne({ tableNumber: data.tableNumber });
    if (existing) {
      throw new AppError('Số bàn này đã tồn tại', 400);
    }

    const qrCode = await QRService.generateTableQR(data.tableNumber);
    return await Table.create({
      ...data,
      qrCode
    });
  }

  static async update(id, data) {
    const table = await Table.findById(id);
    if (!table) {
      throw new AppError('Không tìm thấy bàn', 404);
    }

    if (data.tableNumber && data.tableNumber !== table.tableNumber) {
      const existing = await Table.findOne({ tableNumber: data.tableNumber, _id: { $ne: id } });
      if (existing) {
        throw new AppError('Số bàn này đã được sử dụng', 400);
      }
      data.qrCode = await QRService.generateTableQR(data.tableNumber);
    }

    Object.assign(table, data);
    return await table.save();
  }

  static async regenerateQR(id) {
    const table = await Table.findById(id);
    if (!table) {
      throw new AppError('Không tìm thấy bàn', 404);
    }

    table.qrCode = await QRService.generateTableQR(table.tableNumber);
    return await table.save();
  }

  static async delete(id) {
    const activeOrder = await Order.findOne({
      table: id,
      status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] }
    });

    if (activeOrder) {
      throw new AppError('Không thể xóa bàn đang có đơn hàng chưa hoàn tất', 400);
    }

    const table = await Table.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!table) {
      throw new AppError('Không tìm thấy bàn', 404);
    }
    return table;
  }

  static async updateStatus(id, status) {
    const table = await Table.findByIdAndUpdate(id, { status }, { new: true });
    if (!table) {
      throw new AppError('Không tìm thấy bàn', 404);
    }
    return table;
  }
}

module.exports = TableService;
