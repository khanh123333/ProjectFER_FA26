const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

// Thiết lập Cookie cho client
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000 // 1h
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

class AuthController {
  static async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      setAuthCookies(res, accessToken, refreshToken);
      return ApiResponse.created(res, 'Đăng ký tài khoản thành công', {
        user,
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      setAuthCookies(res, accessToken, refreshToken);
      return ApiResponse.success(res, 'Đăng nhập thành công', {
        user,
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(token);
      setAuthCookies(res, accessToken, newRefreshToken);
      return ApiResponse.success(res, 'Làm mới token thành công', { accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      if (req.user) {
        await AuthService.logout(req.user._id);
      }
      clearAuthCookies(res);
      return ApiResponse.success(res, 'Đăng xuất thành công');
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      return ApiResponse.success(res, 'Lấy thông tin tài khoản thành công', req.user);
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user._id, currentPassword, newPassword);
      return ApiResponse.success(res, 'Đổi mật khẩu thành công');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
