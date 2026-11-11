const mongoose = require('mongoose');
const { LOG_ACTIONS } = require('../constants/orderStatus');

const orderLogSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorRole: {
      type: String,
      default: 'customer'
    },
    action: {
      type: String,
      enum: Object.values(LOG_ACTIONS),
      required: true
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const OrderLog = mongoose.model('OrderLog', orderLogSchema);
module.exports = OrderLog;
