const mongoose = require('mongoose');
const {
  RESERVATION_STATUS,
  TABLE_LOCATION,
  DEPOSIT_STATUS
} = require('../constants/reservationStatus');

const reservationSchema = new mongoose.Schema(
  {
    reservationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerName: {
      type: String,
      required: [true, 'Họ tên khách hàng là bắt buộc'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    adultCount: {
      type: Number,
      required: [true, 'Số lượng người lớn là bắt buộc'],
      min: [1, 'Tối thiểu 1 người lớn'],
      default: 1
    },
    childrenCount: {
      type: Number,
      min: [0, 'Số lượng trẻ em không hợp lệ'],
      default: 0
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1
    },
    reservationDate: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Ngày đặt bàn là bắt buộc']
    },
    reservationTime: {
      type: String, // 'HH:mm'
      required: [true, 'Giờ đến là bắt buộc']
    },
    reservationDateTime: {
      type: Date,
      required: true,
      index: true
    },
    locationPreference: {
      type: String,
      enum: Object.values(TABLE_LOCATION),
      default: TABLE_LOCATION.ANY
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },

    // Nghiệp vụ đặt cọc (Bắt buộc cọc 200.000đ nếu > 10 người hoặc giờ cao điểm)
    depositRequired: {
      type: Boolean,
      default: false
    },
    depositAmount: {
      type: Number,
      default: 0
    },
    depositStatus: {
      type: String,
      enum: Object.values(DEPOSIT_STATUS),
      default: DEPOSIT_STATUS.NOT_REQUIRED
    },
    depositReason: {
      type: String,
      default: ''
    },
    depositPaidAt: {
      type: Date,
      default: null
    },
    depositTransactionRef: {
      type: String,
      default: ''
    },

    // Vòng đời đặt bàn
    status: {
      type: String,
      enum: Object.values(RESERVATION_STATUS),
      default: RESERVATION_STATUS.PENDING
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    arrivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;

