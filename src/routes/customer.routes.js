const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/category.controller');
const ProductController = require('../controllers/product.controller');
const TableController = require('../controllers/table.controller');
const OrderController = require('../controllers/order.controller');
const CouponController = require('../controllers/coupon.controller');
const ReservationController = require('../controllers/reservation.controller');
const { optionalAuth, authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createOrderSchema,
  addMoreItemsSchema,
  updateOrderItemSchema
} = require('../validators/order.validator');
const { createReservationSchema, cancelReservationSchema } = require('../validators/reservation.validator');

// Danh mục & Món ăn
router.get('/categories', CategoryController.getAll);
router.get('/products', ProductController.getAll);
router.get('/products/:id', ProductController.getById);

// Bàn
router.get('/tables/:tableNumber', TableController.getByNumber);

// Kiểm tra mã giảm giá
router.post('/coupons/validate', CouponController.validate);

// Đặt đơn & quản lý đơn phía khách
router.post('/orders', optionalAuth, validate(createOrderSchema), OrderController.createOrder);
router.get('/orders/code/:code', OrderController.getOrderByCode);
router.get('/orders/my-orders', authenticate, OrderController.getMyOrders);

// Gọi thêm món
router.post('/orders/:id/items', optionalAuth, validate(addMoreItemsSchema), OrderController.addMoreItems);

// Sửa / xóa món khi pending
router.put('/orders/:id/items/:itemId', optionalAuth, validate(updateOrderItemSchema), OrderController.customerUpdateItem);
router.delete('/orders/:id/items/:itemId', optionalAuth, OrderController.customerRemoveItem);

// Hủy đơn khi pending
router.post('/orders/:id/cancel', optionalAuth, OrderController.cancelOrder);

// 4. Nghiệp vụ Đặt bàn trước (Table Reservation)
router.post('/reservations', optionalAuth, validate(createReservationSchema), ReservationController.createReservation);
router.get('/reservations/code/:code', ReservationController.getByCode);
router.get('/reservations/my-reservations', authenticate, ReservationController.getMyReservations);
router.post('/reservations/:id/cancel', optionalAuth, validate(cancelReservationSchema), ReservationController.customerCancelReservation);
router.get('/reservations/tables', ReservationController.getAvailableTables);

module.exports = router;
