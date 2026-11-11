/**
 * Chuẩn hóa cấu trúc phản hồi API
 */
class ApiResponse {
  static success(res, message = 'Thành công', data = null, statusCode = 200, pagination = null) {
    const response = {
      success: true,
      message,
      data
    };
    if (pagination) {
      response.pagination = pagination;
    }
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Tạo mới thành công', data = null) {
    return this.success(res, message, data, 201);
  }

  static error(res, message = 'Đã có lỗi xảy ra', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };
    if (errors) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  }
}

ApiResponse.sendSuccess = (res, data, message = 'Thành công', statusCode = 200) => {
  return ApiResponse.success(res, message, data, statusCode);
};
ApiResponse.sendError = (res, message = 'Đã có lỗi xảy ra', statusCode = 500) => {
  return ApiResponse.error(res, message, statusCode);
};

module.exports = ApiResponse;
module.exports.sendSuccess = ApiResponse.sendSuccess;
module.exports.sendError = ApiResponse.sendError;
