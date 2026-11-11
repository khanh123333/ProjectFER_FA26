const mongoose = require('mongoose');
const env = require('../src/config/env');
const { User, Shift } = require('../src/models');
const ShiftService = require('../src/services/shiftService');

describe('Shift & Cashier Z-Report Tests', () => {
  let testUser = null;

  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
    testUser = await User.findOne({ role: 'staff' });
    if (!testUser) {
      testUser = await User.findOne({ role: 'admin' });
    }
  });

  afterAll(async () => {
    await Shift.deleteMany({ shiftCode: { $regex: '^CA-TEST-' } });
    await mongoose.connection.close();
  });

  it('1. Mở ca làm việc mới và kiểm tra trạng thái open', async () => {
    if (!testUser) return;

    // Đóng bất kỳ ca nào đang mở của test
    await Shift.updateMany({ status: 'open' }, { status: 'closed' });

    const shift = await ShiftService.openShift({
      cashierId: testUser._id,
      startingCash: 500000,
      note: 'Ca sáng test unit'
    });

    expect(shift.status).toBe('open');
    expect(shift.startingCash).toBe(500000);
    expect(shift.shiftCode).toBeDefined();

    // Dọn dẹp ca test
    await Shift.findByIdAndDelete(shift._id);
  });

  it('2. Chốt ca, tính toán chênh lệch tiền mặt và sinh Z-Report', async () => {
    if (!testUser) return;

    // Tạo ca test
    const shift = await Shift.create({
      shiftCode: `CA-TEST-${Date.now()}`,
      cashier: testUser._id,
      startTime: new Date(),
      status: 'open',
      startingCash: 1000000
    });

    // Giả sử đếm tiền thực tế trong két là 950.000đ (thiếu 50.000đ)
    const result = await ShiftService.closeShift({
      shiftId: shift._id,
      actualCash: 950000,
      handoverTo: 'Nhân viên Ca Chiều',
      note: 'Thiếu 50k do khách đổi tiền',
      closedByUserId: testUser._id
    });

    expect(result.shift.status).toBe('closed');
    expect(result.shift.actualCash).toBe(950000);
    expect(result.shift.expectedCash).toBe(1000000);
    expect(result.shift.difference).toBe(-50000);
    expect(result.shift.handoverTo).toBe('Nhân viên Ca Chiều');

    await Shift.findByIdAndDelete(shift._id);
  });
});
