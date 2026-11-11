const ExcelJS = require('exceljs');
const { Order, OrderLog, Product } = require('../models');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../constants/orderStatus');

class ReportService {
  /**
   * Thống kê tổng quan (doanh thu, đơn hàng, khách hàng, top món)
   */
  static async getOverviewStats({ startDate, endDate }) {
    const filter = {
      paymentStatus: PAYMENT_STATUS.PAID,
      status: ORDER_STATUS.COMPLETED
    };

    if (startDate || endDate) {
      filter.paidAt = {};
      if (startDate) filter.paidAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.paidAt.$lte = end;
      }
    }

    // 1. Tổng doanh thu & số đơn hoàn thành
    const revenueStats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // 2. Thống kê theo phương thức thanh toán
    const paymentMethodStats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Đơn hàng theo trạng thái
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Top 10 món bán chạy nhất
    const topProducts = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort({ soldCount: -1 })
      .limit(10)
      .lean();

    return {
      summary: revenueStats[0] || {
        totalRevenue: 0,
        totalDiscount: 0,
        totalOrders: 0,
        avgOrderValue: 0
      },
      paymentMethods: paymentMethodStats,
      orderStatuses: statusStats,
      topProducts
    };
  }

  /**
   * Thống kê doanh thu theo từng ngày trong khoảng thời gian
   */
  static async getRevenueByDate({ days = 7 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(days, 10) - 1));
    startDate.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' }
          },
          revenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats;
  }

  /**
   * Xuất danh sách hóa đơn đơn hàng ra file Excel
   */
  static async exportOrdersToExcel({ startDate, endDate, status }) {
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate('table', 'tableNumber')
      .populate('confirmedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh Sách Đơn Hàng');

    worksheet.columns = [
      { header: 'Mã Đơn', key: 'orderCode', width: 22 },
      { header: 'Số Bàn', key: 'tableNumber', width: 14 },
      { header: 'Khách Hàng', key: 'customerName', width: 20 },
      { header: 'Số Món', key: 'itemCount', width: 10 },
      { header: 'Tạm Tính (đ)', key: 'subtotal', width: 15 },
      { header: 'Giảm Giá (đ)', key: 'discount', width: 15 },
      { header: 'Tổng Tiền (đ)', key: 'totalAmount', width: 16 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
      { header: 'Thanh Toán', key: 'paymentStatus', width: 14 },
      { header: 'Phương Thức', key: 'paymentMethod', width: 14 },
      { header: 'Thời Gian Đặt', key: 'createdAt', width: 22 }
    ];

    // Tạo kiểu cho Header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Thêm các dòng dữ liệu
    orders.forEach((o) => {
      worksheet.addRow({
        orderCode: o.orderCode,
        tableNumber: o.table ? o.table.tableNumber : 'N/A',
        customerName: o.customerName || 'Khách vãng lai',
        itemCount: o.items ? o.items.length : 0,
        subtotal: o.subtotal,
        discount: o.discount,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: new Date(o.createdAt).toLocaleString('vi-VN')
      });
    });

    return workbook;
  }

  /**
   * Lấy lịch sử thao tác hệ thống (Audit Logs)
   */
  static async getAuditLogs({ limit = 50, page = 1 }) {
    const currentPage = Math.max(1, parseInt(page, 10));
    const itemsPerPage = Math.max(1, parseInt(limit, 10));
    const skip = (currentPage - 1) * itemsPerPage;

    const [logs, totalItems] = await Promise.all([
      OrderLog.find()
        .populate('order', 'orderCode table')
        .populate('actor', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),
      OrderLog.countDocuments()
    ]);

    return {
      logs,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage)
      }
    };
  }
}

module.exports = ReportService;
