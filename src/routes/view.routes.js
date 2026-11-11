const express = require('express');
const router = express.Router();
const { Category, Product, Table, Order, User, Coupon, OrderLog, Shift, Reservation } = require('../models');
const ShiftService = require('../services/shiftService');
const ReservationService = require('../services/reservationService');
const { optionalAuth, authenticate } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ROLES = require('../constants/roles');
const { ORDER_STATUS } = require('../constants/orderStatus');
const { RESERVATION_CONFIG, TABLE_LOCATION_LABELS } = require('../constants/reservationStatus');

// 1. Khách Hàng
router.get('/', optionalAuth, async (req, res) => {
  const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 }).lean();
  res.render('customer/home', {
    title: 'Chào mừng đến với Coffee & Tea House',
    tables,
    currentUser: req.user || null
  });
});

router.get('/menu', optionalAuth, async (req, res) => {
  const { table } = req.query;
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  const products = await Product.find({ isActive: true }).populate('category', 'name slug').sort({ soldCount: -1 }).lean();
  const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 }).lean();

  let activeOrder = null;
  if (table) {
    const tableDoc = tables.find((t) => t.tableNumber === table);
    if (tableDoc) {
      activeOrder = await Order.findOne({
        table: tableDoc._id,
        status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] }
      }).sort({ createdAt: -1 }).lean();
    }
  }

  res.render('customer/menu', {
    title: 'Thực Đơn Đặt Món',
    currentTable: table || '',
    activeOrder,
    categories,
    products,
    tables,
    currentUser: req.user || null
  });
});

router.get('/order-status/:code', optionalAuth, async (req, res) => {
  const order = await Order.findOne({ orderCode: req.params.code })
    .populate('table', 'tableNumber')
    .populate('coupon', 'code type value minOrder maxDiscount')
    .populate('items.product', 'name images category');

  if (!order) {
    return res.status(404).render('error', {
      title: 'Không tìm thấy đơn hàng',
      message: `Đơn hàng mã '${req.params.code}' không tồn tại.`,
      currentUser: req.user || null
    });
  }

  const categories = await Category.find({ isActive: true }).lean();
  const products = await Product.find({ isActive: true, isAvailable: true }).lean();

  res.render('customer/order-status', {
    title: `Đơn hàng ${order.orderCode}`,
    order,
    categories,
    products,
    currentUser: req.user || null
  });
});

router.get('/my-orders', authenticate, async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('table', 'tableNumber')
    .sort({ createdAt: -1 })
    .lean();

  res.render('customer/my-orders', {
    title: 'Lịch sử đơn hàng của tôi',
    orders,
    currentUser: req.user
  });
});

// 1b. Nghiệp vụ Đặt bàn trước (Table Reservation Views)
router.get('/reservation', optionalAuth, async (req, res) => {
  const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 }).lean();
  res.render('customer/reservation', {
    title: 'Đặt Bàn Trước (Table Reservation)',
    tables,
    config: RESERVATION_CONFIG,
    locationLabels: TABLE_LOCATION_LABELS,
    currentUser: req.user || null
  });
});

router.get('/reservation/:code', optionalAuth, async (req, res) => {
  try {
    const { reservation, vietQR } = await ReservationService.getByCode(req.params.code);
    res.render('customer/reservation-detail', {
      title: `Thông Tin Đặt Bàn #${reservation.reservationCode}`,
      reservation,
      vietQR,
      locationLabels: TABLE_LOCATION_LABELS,
      currentUser: req.user || null
    });
  } catch (err) {
    res.status(404).render('error', {
      title: 'Không tìm thấy đặt bàn',
      message: err.message,
      currentUser: req.user || null
    });
  }
});

router.get('/my-reservations', authenticate, async (req, res) => {
  const reservations = await Reservation.find({ customer: req.user._id })
    .populate('table', 'tableNumber capacity location status')
    .sort({ reservationDateTime: -1 })
    .lean();

  res.render('customer/my-reservations', {
    title: 'Danh Sách Bàn Đã Đặt Của Tôi',
    reservations,
    locationLabels: TABLE_LOCATION_LABELS,
    currentUser: req.user
  });
});

// 2. Xác thực (Auth)
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) {
    if (req.user.role === ROLES.ADMIN) return res.redirect('/admin/dashboard');
    if (req.user.role === ROLES.STAFF) return res.redirect('/staff/dashboard');
    return res.redirect('/menu');
  }
  res.render('auth/login', {
    title: 'Đăng Nhập Hệ Thống',
    redirectUrl: req.query.redirect || '',
    currentUser: null
  });
});

router.get('/register', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/menu');
  res.render('auth/register', {
    title: 'Đăng Ký Tài Khoản Khách Hàng',
    currentUser: null
  });
});

// 3. Nhân Viên (Staff)
router.get('/staff/dashboard', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 }).lean();
  res.render('staff/dashboard', {
    title: 'Bảng Điều Khiển Nhân Viên',
    tables,
    currentUser: req.user
  });
});

router.get('/staff/shifts', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  const currentShiftData = await ShiftService.getCurrentShift();
  const historyData = await ShiftService.getShiftHistory({ page: 1, limit: 10 });
  const allStaff = await User.find({ role: { $in: [ROLES.STAFF, ROLES.ADMIN] }, isActive: true }).select('fullName').lean();

  res.render('staff/shifts', {
    title: 'Giao Ca & Báo Cáo Kiểm Quỹ (Z-Report)',
    currentShiftData,
    historyData,
    allStaff,
    currentUser: req.user
  });
});

// 4. Quản Trị Viên (Admin)
router.get('/admin/dashboard', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const totalProducts = await Product.countDocuments({ isActive: true });
  const totalTables = await Table.countDocuments({ isActive: true });
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: ORDER_STATUS.PENDING });

  res.render('admin/dashboard', {
    title: 'Quản Trị Hệ Thống - Tổng Quan',
    totalProducts,
    totalTables,
    totalOrders,
    pendingOrders,
    currentUser: req.user
  });
});

router.get('/admin/products', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 }).lean();
  res.render('admin/products', {
    title: 'Quản Lý Món Ăn',
    categories,
    products,
    currentUser: req.user
  });
});

router.get('/admin/categories', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  res.render('admin/categories', {
    title: 'Quản Lý Danh Mục',
    categories,
    currentUser: req.user
  });
});

router.get('/admin/tables', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const tables = await Table.find().sort({ tableNumber: 1 }).lean();
  res.render('admin/tables', {
    title: 'Quản Lý Bàn & Mã QR',
    tables,
    currentUser: req.user
  });
});

router.get('/admin/staff', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const staffList = await User.find({ role: { $in: [ROLES.STAFF, ROLES.ADMIN] } }).sort({ createdAt: -1 }).lean();
  res.render('admin/staff', {
    title: 'Quản Lý Nhân Viên',
    staffList,
    currentUser: req.user
  });
});

router.get('/admin/coupons', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/admin/logs', authenticate, authorize(ROLES.ADMIN), async (req, res) => {
  const logs = await OrderLog.find()
    .populate('order', 'orderCode table')
    .populate('actor', 'fullName email role')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.render('admin/logs', {
    title: 'Nhật Ký Thao Tác Hệ Thống',
    logs,
    currentUser: req.user
  });
});

module.exports = router;
