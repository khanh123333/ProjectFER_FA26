const http = require('http');
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const ReservationService = require('./services/reservationService');

const server = http.createServer(app);

// Khởi tạo Socket.IO
initSocket(server);

// Đặt lịch kiểm tra tự động hủy bàn trễ quá 15 phút (Mỗi 60 giây)
const startReservationTimeoutWorker = () => {
  setInterval(async () => {
    try {
      const result = await ReservationService.checkAndAutoCancelExpiredReservations();
      if (result && result.count > 0) {
        console.log(`[Auto-Cancel Reservation] Đã tự động hủy ${result.count} đơn đặt bàn trễ quá 15 phút.`);
      }
    } catch (err) {
      console.warn('[Auto-Cancel Reservation Warning] Lỗi khi quét đơn quá hạn:', err.message);
    }
  }, 60000);
};

// Kết nối CSDL và khởi động Server
const startServer = async () => {
  await connectDB();

  // Khởi động background worker kiểm tra đặt bàn trễ 15 phút
  startReservationTimeoutWorker();

  server.listen(env.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server đang chạy tại: http://localhost:${env.PORT}`);
    console.log(`📡 Socket.IO đã sẵn sàng nhận kết nối realtime`);
    console.log(`☕ Quản lý Order đồ uống/đồ ăn (Single-Store)`);
    console.log(`====================================================`);
  });
};

startServer();

module.exports = server;
