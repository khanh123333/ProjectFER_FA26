const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

const ITEM_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  DONE: 'done',
  CANCELLED: 'cancelled'
};

const TABLE_STATUS = {
  EMPTY: 'empty',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved'
};

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded'
};

const PAYMENT_METHODS = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  CARD: 'card'
};

const LOG_ACTIONS = {
  CREATE: 'create',
  ADD_ITEM: 'add_item',
  UPDATE_ITEM: 'update_item',
  REMOVE_ITEM: 'remove_item',
  CONFIRM: 'confirm',
  REJECT: 'reject',
  CHANGE_STATUS: 'change_status',
  PAY: 'pay',
  CANCEL: 'cancel'
};

// Thứ tự chuyển trạng thái hợp lệ cho Staff
const ALLOWED_STATUS_FLOW = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED],
  [ORDER_STATUS.SERVED]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REJECTED]: []
};

module.exports = {
  ORDER_STATUS,
  ITEM_STATUS,
  TABLE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  LOG_ACTIONS,
  ALLOWED_STATUS_FLOW
};
