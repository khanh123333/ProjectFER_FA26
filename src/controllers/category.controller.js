const CategoryService = require('../services/categoryService');
const ApiResponse = require('../utils/apiResponse');

class CategoryController {
  static async getAll(req, res, next) {
    try {
      const onlyActive = req.query.all !== 'true';
      const categories = await CategoryService.getAll(onlyActive);
      return ApiResponse.success(res, 'Lấy danh sách danh mục thành công', categories);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const category = await CategoryService.getById(req.params.id);
      return ApiResponse.success(res, 'Lấy thông tin danh mục thành công', category);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }
      const category = await CategoryService.create(data);
      return ApiResponse.created(res, 'Tạo danh mục mới thành công', category);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.image = `/uploads/${req.file.filename}`;
      }
      const category = await CategoryService.update(req.params.id, data);
      return ApiResponse.success(res, 'Cập nhật danh mục thành công', category);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await CategoryService.delete(req.params.id);
      return ApiResponse.success(res, 'Xóa danh mục thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
