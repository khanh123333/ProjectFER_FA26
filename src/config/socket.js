const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Tham gia phòng Staff hoặc Admin
    socket.on('join:staff', () => {
      socket.join('room_staff');
    });

    socket.on('join:admin', () => {
      socket.join('room_admin');
    });

    // Khách tham gia phòng theo dõi đơn hàng
    socket.on('join:order', (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    // Tham gia phòng theo bàn
    socket.on('join:table', (tableNumber) => {
      if (tableNumber) {
        socket.join(`table:${tableNumber}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO chưa được khởi tạo!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};
