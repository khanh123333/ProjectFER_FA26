const ShiftService = require('../services/shiftService');
const ApiResponse = require('../utils/apiResponse');

class ShiftController {
  static async getCurrentShift(req, res, next) {
    try {
      const data = await ShiftService.getCurrentShift();
      return ApiResponse.success(res, 'Lấy thông tin ca hiện tại thành công', data);
    } catch (error) {
      next(error);
    }
  }

  static async openShift(req, res, next) {
    try {
      const { startingCash, note } = req.body;
      const shift = await ShiftService.openShift({
        cashierId: req.user._id,
        startingCash,
        note
      });
      return ApiResponse.created(res, 'Mở ca làm việc thành công!', shift);
    } catch (error) {
      next(error);
    }
  }

  static async closeShift(req, res, next) {
    try {
      const { shiftId, actualCash, handoverTo, note } = req.body;
      const result = await ShiftService.closeShift({
        shiftId,
        actualCash,
        handoverTo,
        note,
        closedByUserId: req.user._id
      });
      return ApiResponse.success(res, 'Kết ca và xuất báo cáo Z-Report thành công!', result);
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await ShiftService.getShiftHistory({ page, limit });
      return ApiResponse.success(res, 'Lấy lịch sử ca làm việc thành công', result);
    } catch (error) {
      next(error);
    }
  }

  static async getZReport(req, res, next) {
    try {
      const result = await ShiftService.getZReport(req.params.id);
      return ApiResponse.success(res, 'Lấy báo cáo Z-Report thành công', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ShiftController;
