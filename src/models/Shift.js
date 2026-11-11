const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    shiftCode: {
      type: String,
      unique: true,
      required: true
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    endTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    startingCash: {
      type: Number,
      default: 0,
      min: 0
    },
    systemCash: {
      type: Number,
      default: 0
    },
    systemTransfer: {
      type: Number,
      default: 0
    },
    systemCard: {
      type: Number,
      default: 0
    },
    systemTotal: {
      type: Number,
      default: 0
    },
    orderCount: {
      type: Number,
      default: 0
    },
    actualCash: {
      type: Number,
      default: 0
    },
    expectedCash: {
      type: Number,
      default: 0
    },
    difference: {
      type: Number,
      default: 0
    },
    handoverTo: {
      type: String,
      trim: true,
      default: ''
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

shiftSchema.index({ status: 1, startTime: -1 });
shiftSchema.index({ cashier: 1, status: 1 });

const Shift = mongoose.model('Shift', shiftSchema);
module.exports = Shift;
