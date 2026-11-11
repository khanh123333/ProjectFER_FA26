const mongoose = require('mongoose');
const { TABLE_STATUS } = require('../constants/orderStatus');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: [true, 'Số bàn là bắt buộc'],
      unique: true,
      trim: true
    },
    capacity: {
      type: Number,
      default: 4,
      min: 1
    },
    location: {
      type: String,
      enum: ['window', 'outdoor', 'indoor'],
      default: 'indoor'
    },
    qrCode: {
      type: String
    },
    status: {
      type: String,
      enum: Object.values(TABLE_STATUS),
      default: TABLE_STATUS.EMPTY
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Table = mongoose.model('Table', tableSchema);
module.exports = Table;
