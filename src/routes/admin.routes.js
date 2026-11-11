const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/category.controller');
const ProductController = require('../controllers/product.controller');
const TableController = require('../controllers/table.controller');
const UserController = require('../controllers/user.controller');
const CouponController = require('../controllers/coupon.controller');
const ReportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ROLES = require('../constants/roles');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const { categorySchema } = require('../validators/category.validator');
const { productSchema } = require('../validators/product.validator');
const { tableSchema } = require('../validators/table.validator');
const { createStaffSchema, updateUserSchema } = require('../validators/user.validator');
const { couponSchema } = require('../validators/coupon.validator');

// Tất cả route admin đều yêu cầu đăng nhập và có role admin
router.use(authenticate, authorize(ROLES.ADMIN));

// 1. Quản lý Danh mục
router.get('/categories', CategoryController.getAll);
router.post('/categories', upload.single('image'), validate(categorySchema), CategoryController.create);
router.put('/categories/:id', upload.single('image'), CategoryController.update);
router.delete('/categories/:id', CategoryController.delete);

// 2. Quản lý Món ăn
router.get('/products', ProductController.getAll);
router.post('/products', upload.single('image'), validate(productSchema), ProductController.create);
router.put('/products/:id', upload.single('image'), ProductController.update);
router.delete('/products/:id', ProductController.delete);
router.put('/products/:id/availability', ProductController.toggleAvailability);

// 3. Quản lý Bàn & Sinh mã QR
router.get('/tables', TableController.getAll);
router.post('/tables', validate(tableSchema), TableController.create);
router.put('/tables/:id', TableController.update);
router.delete('/tables/:id', TableController.delete);
router.post('/tables/:id/regenerate-qr', TableController.regenerateQR);

// 4. Quản lý Nhân viên
router.get('/staff', UserController.getStaffList);
router.post('/staff', validate(createStaffSchema), UserController.createStaff);
router.put('/staff/:id/toggle-status', UserController.toggleStatus);
router.put('/staff/:id/reset-password', UserController.resetPassword);

// 5. Quản lý Coupon
router.get('/coupons', CouponController.getAll);
router.post('/coupons', validate(couponSchema), CouponController.create);
router.put('/coupons/:id', CouponController.update);
router.delete('/coupons/:id', CouponController.delete);

// 6. Báo cáo & Thống kê & Xuất Excel
router.get('/reports/overview', ReportController.getOverview);
router.get('/reports/revenue-chart', ReportController.getRevenueChart);
router.get('/reports/export-excel', ReportController.exportExcel);
router.get('/reports/audit-logs', ReportController.getAuditLogs);

module.exports = router;
