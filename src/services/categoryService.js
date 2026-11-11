const { Category, Product } = require('../models');
const AppError = require('../utils/appError');

class CategoryService {
  static async getAll(onlyActive = true) {
    const filter = onlyActive ? { isActive: true } : {};
    return await Category.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
  }

  static async getById(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Không tìm thấy danh mục', 404);
    }
    return category;
  }

  static async create(data) {
    const existing = await Category.findOne({ name: data.name });
    if (existing) {
      throw new AppError('Tên danh mục đã tồn tại', 400);
    }
    return await Category.create(data);
  }

  static async update(id, data) {
    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Không tìm thấy danh mục', 404);
    }

    if (data.name && data.name !== category.name) {
      const existing = await Category.findOne({ name: data.name, _id: { $ne: id } });
      if (existing) {
        throw new AppError('Tên danh mục đã được sử dụng', 400);
      }
    }

    Object.assign(category, data);
    return await category.save();
  }

  static async delete(id) {
    const hasProducts = await Product.exists({ category: id, isActive: true });
    if (hasProducts) {
      throw new AppError('Không thể xóa danh mục đang có chứa món ăn đang kinh doanh. Vui lòng chuyển hoặc ẩn các món trước.', 400);
    }
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new AppError('Không tìm thấy danh mục để xóa', 404);
    }
    return category;
  }
}

module.exports = CategoryService;
