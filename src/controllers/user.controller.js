const { User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const ROLES = require('../constants/roles');

class UserController {
  static async getStaffList(req, res, next) {
    try {
      const users = await User.find({ role: { $in: [ROLES.STAFF, ROLES.ADMIN] } })
        .sort({ createdAt: -1 })
        .lean();
      return ApiResponse.success(res, 'Lấy danh sách nhân viên thành công', users);
    } catch (error) {
      next(error);
    }
  }

  static async createStaff(req, res, next) {
    try {
      const { fullName, email, phone, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError('Email đã được sử dụng', 400);
      }

      const user = await User.create({
        fullName,
        email,
        phone,
        password,
        role: role || ROLES.STAFF,
        isActive: true
      });

      const userObj = user.toObject();
      delete userObj.password;
      return ApiResponse.created(res, 'Tạo tài khoản nhân viên thành công', userObj);
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw new AppError('Không tìm thấy tài khoản', 404);

      if (user.role === ROLES.ADMIN && user._id.toString() === req.user._id.toString()) {
        throw new AppError('Bạn không thể tự khóa tài khoản của chính mình', 400);
      }

      user.isActive = !user.isActive;
      await user.save();
      return ApiResponse.success(res, `Đã ${user.isActive ? 'mở khóa' : 'khóa'} tài khoản`, user);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        throw new AppError('Mật khẩu mới phải có tối thiểu 6 ký tự', 400);
      }

      const user = await User.findById(req.params.id);
      if (!user) throw new AppError('Không tìm thấy tài khoản', 404);

      user.password = newPassword;
      await user.save();

      return ApiResponse.success(res, 'Đặt lại mật khẩu thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
