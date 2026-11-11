const { Product, Category } = require('../models');
const AppError = require('../utils/appError');
const OrderSocket = require('../sockets/orderSocket');

class ProductService {
  /**
   * Lấy danh sách món ăn kèm bộ lọc, tìm kiếm, phân trang
   */
  static async getAll({
    category = null,
    search = '',
    type = null,
    isAvailable = null,
    isActive = true,
    page = 1,
    limit = 20,
    sortBy = 'soldCount',
    sortOrder = 'desc'
  }) {
    const filter = {};
    if (isActive !== null && isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (isAvailable !== null && isAvailable !== undefined) {
      filter.isAvailable = isAvailable;
    }
    if (category) {
      filter.category = category;
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    const currentPage = Math.max(1, parseInt(page, 10));
    const itemsPerPage = Math.max(1, parseInt(limit, 10));
    const skip = (currentPage - 1) * itemsPerPage;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [products, totalItems] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug type')
        .sort(sortOption)
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      products,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  }

  static async getById(id) {
    const product = await Product.findById(id).populate('category', 'name slug type');
    if (!product) {
      throw new AppError('Không tìm thấy món ăn', 404);
    }
    return product;
  }

  static async create(data) {
    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) {
      throw new AppError('Danh mục đã chọn không hợp lệ', 400);
    }
    return await Product.create(data);
  }

  static async update(id, data) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy món ăn', 404);
    }

    if (data.category && data.category !== product.category.toString()) {
      const categoryExists = await Category.findById(data.category);
      if (!categoryExists) {
        throw new AppError('Danh mục đã chọn không hợp lệ', 400);
      }
    }

    Object.assign(product, data);
    return await product.save();
  }

  static async delete(id) {
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) {
      throw new AppError('Không tìm thấy món ăn', 404);
    }
    return product;
  }

  /**
   * Đánh dấu món còn hàng / hết hàng tạm thời và phát socket
   */
  static async toggleAvailability(id, isAvailable) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy món ăn', 404);
    }

    product.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !product.isAvailable;
    await product.save();

    // Bắn realtime cho toàn hệ thống
    OrderSocket.notifyProductAvailability(product);
    return product;
  }
}

module.exports = ProductService;
