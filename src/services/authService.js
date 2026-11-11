const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const AppError = require('../utils/appError');
const ROLES = require('../constants/roles');

class AuthService {
  /**
   * Tạo Access Token & Refresh Token
   */
  static generateTokens(user) {
    const payload = {
      id: user._id,
      role: user.role,
      email: user.email
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(payload, env.REFRESH_SECRET, {
      expiresIn: env.REFRESH_EXPIRES_IN
    });

    return { accessToken, refreshToken };
  }

  /**
   * Đăng ký tài khoản khách hàng mới
   */
  static async register({ fullName, email, phone, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email này đã được sử dụng, vui lòng chọn email khác', 400);
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        throw new AppError('Số điện thoại này đã được sử dụng', 400);
      }
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: ROLES.CUSTOMER
    });

    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return { user: userObj, accessToken, refreshToken };
  }

  /**
   * Đăng nhập tài khoản
   */
  static async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị tạm khóa, vui lòng liên hệ quản trị viên', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return { user: userObj, accessToken, refreshToken };
  }

  /**
   * Làm mới access token từ refresh token
   */
  static async refreshToken(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw new AppError('Không tìm thấy refresh token', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, env.REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== oldRefreshToken || !user.isActive) {
      throw new AppError('Phiên đăng nhập không hợp lệ', 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  }

  /**
   * Đăng xuất thu hồi refresh token
   */
  static async logout(userId) {
    if (userId) {
      await User.findByIdAndUpdate(userId, { refreshToken: null });
    }
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    user.password = newPassword;
    await user.save();
    return true;
  }
}

module.exports = AuthService;
