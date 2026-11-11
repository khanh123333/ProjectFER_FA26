const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã giảm giá là bắt buộc'],
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    value: {
      type: Number,
      required: [true, 'Giá trị giảm là bắt buộc'],
      min: [0, 'Giá trị giảm không âm']
    },
    minOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    usageLimit: {
      type: Number,
      default: 0 // 0 là không giới hạn
    },
    usedCount: {
      type: Number,
      default: 0
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

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
