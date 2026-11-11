const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const ProductController = require('../controllers/product.controller');
const TableController = require('../controllers/table.controller');
const ShiftController = require('../controllers/shift.controller');
const ReservationController = require('../controllers/reservation.controller');
const { authenticate } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ROLES = require('../constants/roles');
const validate = require('../middlewares/validate');
const {
  updateOrderStatusSchema,
  paymentSchema
} = require('../validators/order.validator');
const {
  cancelReservationSchema,
  assignTableSchema,
  depositPaidSchema
} = require('../validators/reservation.validator');

// Tất cả route staff đều yêu cầu đăng nhập và có role staff hoặc admin
router.use(authenticate, authorize(ROLES.STAFF, ROLES.ADMIN));

// Giao ca & Kiểm quỹ (Shift & Cashier Z-Report)
router.get('/shifts/current', ShiftController.getCurrentShift);
router.post('/shifts/open', ShiftController.openShift);
router.post('/shifts/close', ShiftController.closeShift);
router.get('/shifts/history', ShiftController.getHistory);
router.get('/shifts/:id/z-report', ShiftController.getZReport);

// Quản lý đơn hàng
router.get('/orders', OrderController.getOrders);
router.get('/orders/:id', OrderController.getOrderById);
router.post('/orders/:id/confirm', OrderController.confirmOrder);
router.post('/orders/:id/reject', OrderController.rejectOrder);
router.put('/orders/:id/status', validate(updateOrderStatusSchema), OrderController.updateOrderStatus);
router.post('/orders/:id/modify-items', OrderController.staffModifyItems);
router.post('/orders/:id/approve-items', OrderController.approvePendingItems);
router.post('/orders/:id/items/:itemId/approve', OrderController.approveSingleItem);
router.post('/orders/:id/pay', validate(paymentSchema), OrderController.payOrder);

// Đánh dấu còn/hết hàng món ăn
router.put('/products/:id/availability', ProductController.toggleAvailability);

// Xem danh sách bàn
router.get('/tables', TableController.getAll);

// Quản lý Đặt bàn trước (Table Reservations)
router.get('/reservations', ReservationController.getStaffReservations);
router.put('/reservations/:id/confirm', ReservationController.confirmReservation);
router.put('/reservations/:id/deposit-paid', validate(depositPaidSchema), ReservationController.confirmDeposit);
router.put('/reservations/:id/assign-table', validate(assignTableSchema), ReservationController.assignTable);
router.put('/reservations/:id/checkin', ReservationController.checkIn);
router.put('/reservations/:id/cancel', validate(cancelReservationSchema), ReservationController.staffCancel);
router.post('/reservations/check-expired', ReservationController.triggerCheckExpired);

module.exports = router;
