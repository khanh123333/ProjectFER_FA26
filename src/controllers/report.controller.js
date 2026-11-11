const ReportService = require('../services/reportService');
const ApiResponse = require('../utils/apiResponse');

class ReportController {
  static async getOverview(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await ReportService.getOverviewStats({ startDate, endDate });
      return ApiResponse.success(res, 'Lấy báo cáo tổng quan thành công', stats);
    } catch (error) {
      next(error);
    }
  }

  static async getRevenueChart(req, res, next) {
    try {
      const days = req.query.days || 7;
      const data = await ReportService.getRevenueByDate({ days });
      return ApiResponse.success(res, 'Lấy dữ liệu biểu đồ doanh thu thành công', data);
    } catch (error) {
      next(error);
    }
  }

  static async exportExcel(req, res, next) {
    try {
      const { startDate, endDate, status } = req.query;
      const workbook = await ReportService.exportOrdersToExcel({ startDate, endDate, status });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Bao-Cao-Don-Hang-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const { limit, page } = req.query;
      const result = await ReportService.getAuditLogs({ limit, page });
      return ApiResponse.success(res, 'Lấy lịch sử thao tác thành công', result.logs, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
