const mongoose = require('mongoose');
const {
  ORDER_STATUS,
  ITEM_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS
} = require('../constants/orderStatus');

const selectedOptionSchema = new mongoose.Schema(
  {
    optionName: { type: String, required: true },
    choiceLabel: { type: String, required: true },
    extraPrice: { type: Number, default: 0 }
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    nameSnapshot: {
      type: String,
      required: true
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    selectedOptions: [selectedOptionSchema],
    note: {
      type: String,
      trim: true
    },
    itemStatus: {
      type: String,
      enum: Object.values(ITEM_STATUS),
      default: ITEM_STATUS.PENDING
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    addedRound: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Bàn đặt là bắt buộc']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerName: {
      type: String,
      trim: true
    },
    customerPhone: {
      type: String,
      trim: true
    },
    items: [orderItemSchema],
    note: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING
    },
    rejectReason: {
      type: String,
      trim: true
    },
    cancelReason: {
      type: String,
      trim: true
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    confirmedAt: {
      type: Date
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.CASH
    },
    paidAt: {
      type: Date
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ table: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
