const ProductService = require('../services/productService');
const ApiResponse = require('../utils/apiResponse');

class ProductController {
  static async getAll(req, res, next) {
    try {
      const { category, search, type, isAvailable, all, page, limit, sortBy, sortOrder } = req.query;
      const isActive = all === 'true' ? null : true;
      const available = isAvailable !== undefined ? isAvailable === 'true' : null;

      const result = await ProductService.getAll({
        category,
        search,
        type,
        isAvailable: available,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder
      });

      return ApiResponse.success(res, 'Lấy danh sách món ăn thành công', result.products, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const product = await ProductService.getById(req.params.id);
      return ApiResponse.success(res, 'Lấy chi tiết món ăn thành công', product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.images = [`/uploads/${req.file.filename}`];
      }
      if (typeof data.options === 'string') {
        try {
          data.options = JSON.parse(data.options);
        } catch (e) {
          data.options = [];
        }
      }
      if (typeof data.tags === 'string') {
        data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const product = await ProductService.create(data);
      return ApiResponse.created(res, 'Thêm món ăn mới thành công', product);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.images = [`/uploads/${req.file.filename}`];
      }
      if (typeof data.options === 'string') {
        try {
          data.options = JSON.parse(data.options);
        } catch (e) {
          // keep existing if invalid
        }
      }
      if (typeof data.tags === 'string') {
        data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const product = await ProductService.update(req.params.id, data);
      return ApiResponse.success(res, 'Cập nhật món ăn thành công', product);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await ProductService.delete(req.params.id);
      return ApiResponse.success(res, 'Đã ẩn món ăn khỏi thực đơn');
    } catch (error) {
      next(error);
    }
  }

  static async toggleAvailability(req, res, next) {
    try {
      const { isAvailable } = req.body;
      const product = await ProductService.toggleAvailability(req.params.id, isAvailable);
      return ApiResponse.success(res, `Đã cập nhật trạng thái món: ${product.isAvailable ? 'Còn hàng' : 'Hết hàng'}`, product);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
