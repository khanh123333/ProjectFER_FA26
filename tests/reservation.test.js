const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const { Table, Reservation } = require('../src/models');
const { TABLE_STATUS } = require('../src/constants/orderStatus');
const { RESERVATION_STATUS, TABLE_LOCATION, DEPOSIT_STATUS } = require('../src/constants/reservationStatus');
const {
  isPeakHour,
  calculateDepositRequirement,
  generateReservationCode,
  isNoShow
} = require('../src/utils/reservationHelper');
const ReservationService = require('../src/services/reservationService');

describe('4. Nghiệp vụ Đặt bàn trước (Table Reservation) Tests', () => {
  let testTable = null;

  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);

    // Tạo bàn kiểm thử
    await Table.deleteOne({ tableNumber: 'Bàn Test Res' });
    testTable = await Table.create({
      tableNumber: 'Bàn Test Res',
      capacity: 6,
      location: 'window',
      status: TABLE_STATUS.EMPTY,
      isActive: true
    });
  });

  afterAll(async () => {
    if (testTable) {
      await Table.findByIdAndDelete(testTable._id);
    }
    await Reservation.deleteMany({ reservationCode: { $regex: '^RES-TEST-' } });
    await Reservation.deleteMany({ customerName: { $regex: 'Khách Test' } });
    await mongoose.connection.close();
  });

  // -------------------------------------------------------------
  // Test 1: Kiểm tra nhận diện khung giờ cao điểm
  // -------------------------------------------------------------
  describe('4.1. Nhận diện giờ cao điểm (Peak Hours)', () => {
    it('Nhận diện chính xác giờ thường (không cao điểm)', () => {
      expect(isPeakHour('08:00')).toBe(false);
      expect(isPeakHour('10:00')).toBe(false);
      expect(isPeakHour('14:30')).toBe(false);
      expect(isPeakHour('16:00')).toBe(false);
      expect(isPeakHour('21:00')).toBe(false);
    });

    it('Nhận diện chính xác giờ cao điểm trưa (11:30 - 13:30)', () => {
      expect(isPeakHour('11:30')).toBe(true);
      expect(isPeakHour('12:00')).toBe(true);
      expect(isPeakHour('13:00')).toBe(true);
      expect(isPeakHour('13:30')).toBe(true);
    });

    it('Nhận diện chính xác giờ cao điểm tối (18:00 - 20:30)', () => {
      expect(isPeakHour('18:00')).toBe(true);
      expect(isPeakHour('19:00')).toBe(true);
      expect(isPeakHour('19:30')).toBe(true);
      expect(isPeakHour('20:30')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Test 2: Nghiệp vụ đặt cọc giữ chỗ (Bắt buộc cọc 200.000đ)
  // -------------------------------------------------------------
  describe('4.2. Quy tắc đặt cọc giữ chỗ 200.000đ', () => {
    it('Không cần cọc nếu đặt dưới 10 người và vào giờ thường', () => {
      const res = calculateDepositRequirement(4, '09:00');
      expect(res.depositRequired).toBe(false);
      expect(res.depositAmount).toBe(0);
    });

    it('Không cần cọc nếu đặt đúng 10 người và vào giờ thường', () => {
      const res = calculateDepositRequirement(10, '15:00');
      expect(res.depositRequired).toBe(false);
      expect(res.depositAmount).toBe(0);
    });

    it('Bắt buộc chuyển khoản cọc 200.000đ nếu đặt trên 10 người (>10 khách)', () => {
      const res = calculateDepositRequirement(12, '15:00');
      expect(res.depositRequired).toBe(true);
      expect(res.depositAmount).toBe(200000);
      expect(res.reason).toContain('trên 10 người');
    });

    it('Bắt buộc chuyển khoản cọc 200.000đ nếu đặt vào giờ cao điểm (dù chỉ 2 người)', () => {
      const res = calculateDepositRequirement(2, '12:00');
      expect(res.depositRequired).toBe(true);
      expect(res.depositAmount).toBe(200000);
      expect(res.reason).toContain('cao điểm');
    });

    it('Bắt buộc cọc 200.000đ nếu vừa trên 10 người vừa vào giờ cao điểm', () => {
      const res = calculateDepositRequirement(15, '19:00');
      expect(res.depositRequired).toBe(true);
      expect(res.depositAmount).toBe(200000);
    });
  });

  // -------------------------------------------------------------
  // Test 3: Đặt chỗ trước theo giờ và chọn vị trí
  // -------------------------------------------------------------
  describe('4.3. Tạo yêu cầu đặt bàn và vị trí', () => {
    it('Tạo đặt bàn hợp lệ với ngày, giờ, số người lớn/trẻ em và yêu cầu vị trí', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const { reservation, vietQR } = await ReservationService.createReservation({
        customerName: 'Khách Test Nguyễn Văn A',
        phone: '0901234567',
        email: 'test@example.com',
        adultCount: 3,
        childrenCount: 1,
        reservationDate: dateStr,
        reservationTime: '15:00', // Giờ thường -> không cọc
        locationPreference: 'window', // Gần cửa sổ
        notes: 'Cần ghế trẻ em cạnh cửa sổ'
      });

      expect(reservation).toBeDefined();
      expect(reservation.guestCount).toBe(4);
      expect(reservation.locationPreference).toBe('window');
      expect(reservation.depositRequired).toBe(false);
      expect(reservation.depositStatus).toBe('not_required');
      expect(reservation.status).toBe(RESERVATION_STATUS.PENDING);
      expect(vietQR).toBeNull();
    });

    it('Tạo đặt bàn giờ cao điểm tự động sinh mã VietQR cọc 200.000đ', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const { reservation, vietQR } = await ReservationService.createReservation({
        customerName: 'Khách Test Đoàn Đông',
        phone: '0909999888',
        adultCount: 12, // Trên 10 người
        childrenCount: 2,
        reservationDate: dateStr,
        reservationTime: '19:00', // Giờ cao điểm
        locationPreference: 'outdoor', // Ngoài trời
        notes: 'Tiệc sinh nhật ngoài trời'
      });

      expect(reservation.guestCount).toBe(14);
      expect(reservation.depositRequired).toBe(true);
      expect(reservation.depositAmount).toBe(200000);
      expect(reservation.depositStatus).toBe(DEPOSIT_STATUS.PENDING);
      expect(vietQR).toBeDefined();
      expect(vietQR.amount).toBe(200000);
      expect(vietQR.description).toContain(reservation.reservationCode);
    });

    it('Gửi POST /api/customer/reservations thành công và trả về 201 Created', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/customer/reservations')
        .send({
          customerName: 'Khách Test Gọi API',
          phone: '0901234567',
          email: 'customer@gmail.com',
          adultCount: 2,
          childrenCount: 1,
          reservationDate: dateStr,
          reservationTime: '07:00',
          locationPreference: 'outdoor',
          notes: 'ok'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reservation).toBeDefined();
      expect(res.body.data.reservation.reservationCode).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Test 4: Xác nhận đặt cọc và xếp bàn giữ chỗ
  // -------------------------------------------------------------
  describe('4.4. Xác nhận cọc 200.000đ và giữ chỗ bàn', () => {
    it('Xếp bàn và xác nhận cọc làm bàn chuyển sang trạng thái RESERVED', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const { reservation } = await ReservationService.createReservation({
        customerName: 'Khách Test Cọc',
        phone: '0912345678',
        adultCount: 4,
        childrenCount: 0,
        reservationDate: dateStr,
        reservationTime: '12:00', // Cần cọc
        locationPreference: 'window',
        table: testTable._id
      });

      // Nhân viên xác nhận khách đã chuyển cọc 200k
      const updated = await ReservationService.confirmDepositPaid(reservation._id, {
        transactionRef: 'MB-TEST-REF-999'
      });

      expect(updated.depositStatus).toBe(DEPOSIT_STATUS.PAID);
      expect(updated.status).toBe(RESERVATION_STATUS.CONFIRMED);

      // Bàn kiểm tra xem đã chuyển sang RESERVED chưa
      const tableCheck = await Table.findById(testTable._id);
      expect(tableCheck.status).toBe(TABLE_STATUS.RESERVED);
    });

    it('Khách đến nhận bàn (Check-in) chuyển bàn sang OCCUPIED', async () => {
      const reservations = await Reservation.find({ table: testTable._id, status: RESERVATION_STATUS.CONFIRMED });
      const targetRes = reservations[0];

      const checkedIn = await ReservationService.checkInGuest(targetRes._id);
      expect(checkedIn.status).toBe(RESERVATION_STATUS.ARRIVED);
      expect(checkedIn.arrivedAt).toBeDefined();

      const tableCheck = await Table.findById(testTable._id);
      expect(tableCheck.status).toBe(TABLE_STATUS.OCCUPIED);
    });
  });

  // -------------------------------------------------------------
  // Test 5: TỰ ĐỘNG HỦY GIỮ BÀN NẾU TRỄ QUÁ 15 PHÚT
  // -------------------------------------------------------------
  describe('4.5. Tự động hủy giữ bàn nếu trễ quá 15 phút (No-show)', () => {
    it('Hàm isNoShow nhận diện chính xác khi quá 15 phút', () => {
      const now = new Date('2026-11-03T12:00:00Z');
      const timeNotLate = new Date('2026-11-03T11:50:00Z'); // 10 phút trước -> chưa quá 15p
      const timeOver15Mins = new Date('2026-11-03T11:40:00Z'); // 20 phút trước -> đã quá 15p

      expect(isNoShow(timeNotLate, now, 15)).toBe(false);
      expect(isNoShow(timeOver15Mins, now, 15)).toBe(true);
    });

    it('Quá thời gian đặt hẹn 15 phút -> Bàn tự động chuyển về trạng thái trống (EMPTY) cho khách vãng lai', async () => {
      // 1. Chuẩn bị bàn test đang RESERVED
      await Table.findByIdAndUpdate(testTable._id, { status: TABLE_STATUS.RESERVED });

      // 2. Tạo một đơn đặt bàn có thời gian hẹn trễ hơn 20 phút so với hiện tại
      const pastTime = new Date(Date.now() - 20 * 60 * 1000); // 20 phút trước
      const pastDateStr = pastTime.toISOString().split('T')[0];
      const hours = String(pastTime.getHours()).padStart(2, '0');
      const mins = String(pastTime.getMinutes()).padStart(2, '0');
      const pastTimeStr = `${hours}:${mins}`;

      const expiredRes = await Reservation.create({
        reservationCode: 'RES-TEST-EXPIRED-01',
        customerName: 'Khách Test Trễ Giờ',
        phone: '0988887777',
        adultCount: 4,
        guestCount: 4,
        reservationDate: pastDateStr,
        reservationTime: pastTimeStr,
        reservationDateTime: pastTime,
        locationPreference: 'window',
        table: testTable._id,
        status: RESERVATION_STATUS.CONFIRMED,
        depositRequired: false
      });

      // Đảm bảo trước khi quét, bàn test đang là RESERVED
      let tableBefore = await Table.findById(testTable._id);
      expect(tableBefore.status).toBe(TABLE_STATUS.RESERVED);

      // 3. Thực thi nghiệp vụ tự động quét và hủy đơn trễ quá 15 phút
      const result = await ReservationService.checkAndAutoCancelExpiredReservations();

      expect(result.count).toBeGreaterThanOrEqual(1);

      // 4. Kiểm tra trạng thái đơn đặt bàn đã chuyển sang NO_SHOW
      const updatedRes = await Reservation.findById(expiredRes._id);
      expect(updatedRes.status).toBe(RESERVATION_STATUS.NO_SHOW);
      expect(updatedRes.cancellationReason).toContain('15 phút');

      // 5. QUAN TRỌNG: Bàn đã tự động chuyển về trạng thái EMPTY (Trống) cho khách vãng lai!
      const tableAfter = await Table.findById(testTable._id);
      expect(tableAfter.status).toBe(TABLE_STATUS.EMPTY);
    });
  });
});

