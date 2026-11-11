const TableService = require('../services/tableService');
const ApiResponse = require('../utils/apiResponse');

class TableController {
  static async getAll(req, res, next) {
    try {
      const onlyActive = req.query.all !== 'true';
      const tables = await TableService.getAll(onlyActive);
      return ApiResponse.success(res, 'Lấy danh sách bàn thành công', tables);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const table = await TableService.getById(req.params.id);
      return ApiResponse.success(res, 'Lấy thông tin bàn thành công', table);
    } catch (error) {
      next(error);
    }
  }

  static async getByNumber(req, res, next) {
    try {
      const table = await TableService.getByNumber(req.params.tableNumber);
      return ApiResponse.success(res, 'Lấy thông tin bàn thành công', table);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const table = await TableService.create(req.body);
      return ApiResponse.created(res, 'Tạo bàn mới thành công', table);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const table = await TableService.update(req.params.id, req.body);
      return ApiResponse.success(res, 'Cập nhật bàn thành công', table);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await TableService.delete(req.params.id);
      return ApiResponse.success(res, 'Xóa bàn thành công');
    } catch (error) {
      next(error);
    }
  }

  static async regenerateQR(req, res, next) {
    try {
      const table = await TableService.regenerateQR(req.params.id);
      return ApiResponse.success(res, 'Tạo lại mã QR thành công', table);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const table = await TableService.updateStatus(req.params.id, status);
      return ApiResponse.success(res, 'Cập nhật trạng thái bàn thành công', table);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TableController;
