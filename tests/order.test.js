const mongoose = require('mongoose');
const env = require('../src/config/env');
const { calcOrderTotal } = require('../src/utils/calcTotal');
const generateOrderCode = require('../src/utils/generateOrderCode');
const { Table, Product, Order } = require('../src/models');
const OrderService = require('../src/services/orderService');

describe('Order & Calculation Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
  });

  afterAll(async () => {
    await Order.deleteMany({ orderCode: { $regex: '^ORD-TEST-' } });
    await mongoose.connection.close();
  });

  it('1. Kiểm tra hàm sinh mã đơn hàng generateOrderCode', () => {
    const code = generateOrderCode();
    expect(code).toMatch(/^ORD-\d{8}-\d{4}$/);
  });

  it('2. Kiểm tra tính tiền món kèm options và coupon giảm 10%', () => {
    const items = [
      {
        priceSnapshot: 30000,
        quantity: 2,
        selectedOptions: [{ extraPrice: 5000 }, { extraPrice: 5000 }], // 40.000đ/món * 2 = 80.000đ
        itemStatus: 'pending'
      },
      {
        priceSnapshot: 20000,
        quantity: 1,
        selectedOptions: [], // 20.000đ
        itemStatus: 'pending'
      }
    ];

    const coupon = {
      isActive: true,
      type: 'percent',
      value: 10,
      minOrder: 50000,
      maxDiscount: 20000
    };

    const result = calcOrderTotal(items, coupon);
    expect(result.subtotal).toBe(100000);
    expect(result.discount).toBe(10000); // 10% của 100.000đ
    expect(result.totalAmount).toBe(90000);
  });

  it('3. Kiểm tra tính tiền với coupon cố định 20.000đ', () => {
    const items = [
      {
        priceSnapshot: 50000,
        quantity: 2,
        selectedOptions: [],
        itemStatus: 'pending'
      }
    ];

    const coupon = {
      isActive: true,
      type: 'fixed',
      value: 20000,
      minOrder: 50000
    };

    const result = calcOrderTotal(items, coupon);
    expect(result.subtotal).toBe(100000);
    expect(result.discount).toBe(20000);
    expect(result.totalAmount).toBe(80000);
  });

  it('4. Khách tạo đơn hàng mới và kiểm tra trạng thái ban đầu là pending', async () => {
    const table = await Table.findOne({ isActive: true });
    const product = await Product.findOne({ isActive: true, isAvailable: true });

    if (table && product) {
      const order = await OrderService.createOrder({
        tableNumber: table.tableNumber,
        customerName: 'Khách Test Unit',
        customerPhone: '0909999999',
        items: [
          {
            product: product._id,
            quantity: 1,
            selectedOptions: [],
            note: 'Ít đường'
          }
        ]
      });

      expect(order.status).toBe('pending');
      expect(order.isLocked).toBe(false);
      expect(order.totalAmount).toBeGreaterThan(0);

      // Dọn dẹp đơn test
      await Order.findByIdAndDelete(order._id);
    }
  });

  it('5. Khách có thể hủy đơn khi trạng thái là pending', async () => {
    const table = await Table.findOne({ isActive: true });
    const product = await Product.findOne({ isActive: true, isAvailable: true });

    if (table && product) {
      const order = await OrderService.createOrder({
        tableNumber: table.tableNumber,
        customerName: 'Khách Test Cancel',
        customerPhone: '0909999999',
        items: [{ product: product._id, quantity: 1, selectedOptions: [] }]
      });

      const cancelledOrder = await OrderService.cancelOrder(order._id, 'Khách đổi ý', { role: 'customer' });
      expect(cancelledOrder.status).toBe('cancelled');
      expect(cancelledOrder.cancelReason).toBe('Khách đổi ý');

      await Order.findByIdAndDelete(order._id);
    }
  });

  it('6. Khách không thể hủy đơn khi đơn đã chuyển sang bước xác nhận (confirmed hoặc isLocked)', async () => {
    const table = await Table.findOne({ isActive: true });
    const product = await Product.findOne({ isActive: true, isAvailable: true });

    if (table && product) {
      const order = await OrderService.createOrder({
        tableNumber: table.tableNumber,
        customerName: 'Khách Test Reject Cancel',
        customerPhone: '0909999999',
        items: [{ product: product._id, quantity: 1, selectedOptions: [] }]
      });

      // Chuyển đơn sang bước xác nhận
      order.status = 'confirmed';
      order.isLocked = true;
      await order.save();

      await expect(
        OrderService.cancelOrder(order._id, 'Khách cố tình hủy', { role: 'customer' })
      ).rejects.toThrow('không thể hủy');

      await Order.findByIdAndDelete(order._id);
    }
  });
});

